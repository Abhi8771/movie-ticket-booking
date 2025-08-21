import OpenAI from "openai";
import Show from "../models/Show.js";
import Movie from "../models/Movie.js";
import Booking from "../models/Booking.js";
import { users } from "@clerk/clerk-sdk-node";

const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

// Helper: get currently playing/upcoming movies
const getUpcomingMovies = async () => {
  const now = new Date();
  const shows = await Show.find({ showDateTime: { $gte: now } })
    .populate("movie")
    .sort({ showDateTime: 1 });

  const uniqueMovies = new Map();
  for (const show of shows) {
    const movieId = show.movie._id.toString();
    if (!uniqueMovies.has(movieId)) {
      uniqueMovies.set(movieId, show.movie.title);
    }
  }
  return Array.from(uniqueMovies.values());
};

// Helper: get showtimes for a movie
const getShowtimesForMovie = async (movieTitle) => {
  const movie = await Movie.findOne({ title: movieTitle });
  if (!movie) return null;

  const now = new Date();
  const shows = await Show.find({ movie: movie._id, showDateTime: { $gte: now } }).sort({ showDateTime: 1 });

  if (!shows.length) return null;

  const dateTimes = {};
  for (const show of shows) {
    const dateStr = show.showDateTime.toISOString().split("T")[0];
    if (!dateTimes[dateStr]) dateTimes[dateStr] = [];
    dateTimes[dateStr].push({
      time: show.showDateTime.toISOString(),
      price: show.showPrice,
      showId: show._id
    });
  }
  return dateTimes;
};

// Chatbot handler
export const askChatbot = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ success: false, message: "Message is required" });

    // Custom prompt for OpenRouter AI
    const prompt = `
You are a helpful movie booking assistant for a website.
Answer only with relevant, concise, user-friendly responses.
Use this data if needed:

1. Currently playing movies: ${await getUpcomingMovies()}

Message from user: "${message}"
`;

    const response = await openrouter.chat.completions.create({
      model: "gpt-5.5-mini",
      messages: [
        { role: "system", content: "You are a helpful movie booking assistant." },
        { role: "user", content: prompt }
      ],
      max_tokens: 400
    });

    const answer = response.choices[0].message.content;
    res.json({ success: true, answer });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- AI question handler ---
export const askQuestion = async (req, res) => {
  try {
    const { question } = req.body;
    const lower = question.toLowerCase();

    // --- List currently playing movies ---
    if (lower.includes("movies") || lower.includes("now playing")) {
      const movies = await Movie.find().limit(10);

      return res.json({
        type: "movies",
        answer: "Here are some currently playing movies:",
        movies: movies.map(m => ({
          id: m._id,
          title: m.title,
          poster: m.poster_path,
          overview: m.overview,
          rating: m.vote_average,
          runtime: m.runtime
        }))
      });
    }

    // --- Show available seats for a specific movie ---
    if (lower.includes("seats for") || lower.includes("showtimes")) {
      // extract movie name
      const movieName = question.split("for")[1]?.trim() || question;
      const movie = await Movie.findOne({ title: { $regex: movieName, $options: "i" } });
      if (!movie) return res.json({ type: "text", answer: "Movie not found." });

      const now = new Date();
      const shows = await Show.find({ movie: movie._id, showDateTime: { $gte: now } });

      const seatsData = shows.map(show => {
        const availableSeats = Object.keys(show.occupiedSeats || {}).length
          ? Array.from({length: 40}, (_, i) => `A${i+1}`).filter(s => !show.occupiedSeats[s])
          : Array.from({length: 40}, (_, i) => `A${i+1}`);

        return {
          id: show._id,
          movie: movie.title,
          showDateTime: show.showDateTime,
          price: show.showPrice,
          availableSeats
        };
      });

      return res.json({
        type: "seats",
        answer: `Available seats for ${movie.title}:`,
        seats: seatsData
      });
    }

    // --- Default response ---
    res.json({ type: "text", answer: "Sorry, I can only show movies, showtimes, and available seats." });

  } catch (error) {
    console.error(error);
    res.json({ type: "text", answer: "Error processing your question." });
  }
};

// --- Book seats from chat ---
export const bookSeats = async (req, res) => {
  try {
    const { showId, seats } = req.body;
    const userId = req.auth().userId;

    if (!showId || !seats || seats.length === 0)
      return res.json({ success: false, message: "Invalid input" });

    const show = await Show.findById(showId).populate("movie");
    if (!show) return res.json({ success: false, message: "Show not found" });

    // Check occupied seats
    const taken = seats.some(s => show.occupiedSeats[s]);
    if (taken) return res.json({ success: false, message: "Some seats are already booked" });

    // Get Clerk user
    const clerkUser = await users.getUser(userId);

    // Create booking
    const booking = await Booking.create({
      user: userId,
      userName: `${clerkUser.firstName} ${clerkUser.lastName}`,
      userEmail: clerkUser.emailAddresses[0].emailAddress,
      show: showId,
      amount: show.showPrice * seats.length,
      bookedSeats: seats,
      isPaid: true // for simplicity, mark as paid
    });

    // Mark seats as occupied
    seats.forEach(s => show.occupiedSeats[s] = userId);
    show.markModified("occupiedSeats");
    await show.save();

    res.json({ success: true, message: `Successfully booked ${seats.join(", ")}` });

  } catch (error) {
    console.error(error);
    res.json({ success: false, message: "Booking failed" });
  }
};