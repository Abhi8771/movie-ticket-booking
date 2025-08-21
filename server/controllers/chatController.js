// controllers/chatController.js
import OpenAI from "openai";
import Show from "../models/Show.js";
import Movie from "../models/Movie.js";
import Booking from "../models/Booking.js";

// Initialize OpenRouter AI
const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

// ================= 1. AI QUESTION HANDLER =================
export const askQuestion = async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || typeof question !== "string") {
      return res.status(400).json({ type: "error", answer: "Please ask a valid question." });
    }

    const lower = question.toLowerCase();

    // 1. Keyword-based DB logic
    if (lower.includes("movie") || lower.includes("show")) {
      const now = new Date();
      const upcomingShows = await Show.find({ showDateTime: { $gte: now } })
        .populate("movie", "title poster_path overview vote_average runtime")
        .limit(5);

      const movies = upcomingShows.map(show => ({
        id: show._id,
        title: show.movie.title,
        poster: show.movie.poster_path,
        overview: show.movie.overview || "No description available",
        rating: show.movie.vote_average || "N/A",
        runtime: show.movie.runtime || "N/A",
      }));

      return res.json({
        type: "movies",
        answer: "Here are some movies currently showing:",
        movies,
      });
    }

    if (lower.includes("seat") || lower.includes("availability")) {
      const shows = await Show.find().limit(3);
      const seatData = await Promise.all(
        shows.map(async show => {
          const bookings = await Booking.find({ show: show._id });
          const occupied = bookings.flatMap(b => b.bookedSeats);
          const allSeats = Array.from({ length: 40 }, (_, i) => `S${i + 1}`);
          const available = allSeats.filter(s => !occupied.includes(s));

          return {
            id: show._id,
            movie: show.movieTitle,
            showDateTime: show.showDateTime,
            price: show.price,
            availableSeats: available,
          };
        })
      );

      return res.json({
        type: "seats",
        answer: "Here are available seats:",
        seats: seatData,
      });
    }

    // 2. AI fallback
    const aiResponse = await openrouter.chat.completions.create({
      model: "anthropic/claude-3.5-sonnet",
      messages: [
        { role: "system", content: "You are a helpful assistant for a movie booking service." },
        { role: "user", content: question }
      ],
      max_tokens: 250,
    });

    const aiAnswer = aiResponse?.choices?.[0]?.message?.content?.trim() || 
                     "I don't have information on that.";

    res.json({ type: "text", answer: aiAnswer });

  } catch (err) {
    console.error("askQuestion error:", err);
    res.status(500).json({ type: "error", answer: "Server error while processing question." });
  }
};

// ================= 2. BOOK SEATS HANDLER =================
export const bookSeats = async (req, res) => {
  try {
    const { showId, seats, userName, userEmail, userId } = req.body;
    if (!showId || !Array.isArray(seats) || seats.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid booking request." });
    }

    const show = await Show.findById(showId).populate("movie", "title");
    if (!show) return res.status(404).json({ success: false, message: "Show not found." });

    const existingBookings = await Booking.find({ show: showId });
    const alreadyTaken = existingBookings.flatMap(b => b.bookedSeats);
    const conflict = seats.filter(s => alreadyTaken.includes(s));

    if (conflict.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Seats already booked: ${conflict.join(", ")}`
      });
    }

    // Mark seats as occupied
    seats.forEach(seat => show.occupiedSeats = { ...(show.occupiedSeats || {}), [seat]: true });
    await show.save();

    const booking = new Booking({
      user: userId || "Guest",
      userName: userName || "Guest",
      userEmail: userEmail || "guest@example.com",
      show: showId,
      amount: seats.length * show.showPrice,
      bookedSeats: seats,
      isPaid: false, // integrate Stripe later
    });
    await booking.save();

    const updatedAvailableSeats = Object.keys(show.occupiedSeats).filter(seat => !show.occupiedSeats[seat]);

    res.json({
      success: true,
      message: `Successfully booked seats: ${seats.join(", ")}`,
      show: {
        id: show._id,
        movie: show.movie.title,
        showDateTime: show.showDateTime,
        price: show.showPrice,
        availableSeats: updatedAvailableSeats,
      }
    });

  } catch (err) {
    console.error("bookSeats error:", err);
    res.status(500).json({ success: false, message: "Booking failed due to server error." });
  }
};
