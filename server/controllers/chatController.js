// // controllers/chatController.js
// import OpenAI from "openai";
// import Show from "../models/Show.js";
// import Movie from "../models/Movie.js";
// import Booking from "../models/Booking.js";

// // Initialize OpenRouter AI
// const openrouter = new OpenAI({
//   apiKey: process.env.OPENROUTER_API_KEY,
//   baseURL: "https://openrouter.ai/api/v1",
// });

// // ================= 1. AI QUESTION HANDLER =================
// export const askQuestion = async (req, res) => {
//   try {
//     const { question } = req.body;
//     if (!question || typeof question !== "string") {
//       return res.status(400).json({ type: "error", answer: "Please ask a valid question." });
//     }

//     const lower = question.toLowerCase();

//     // 1. Keyword-based DB logic
//     if (lower.includes("movie") || lower.includes("show")) {
//       const now = new Date();
//       const upcomingShows = await Show.find({ showDateTime: { $gte: now } })
//         .populate("movie", "title poster_path overview vote_average runtime")
//         .limit(5);

//       const movies = upcomingShows.map(show => ({
//         id: show._id,
//         title: show.movie.title,
//         poster: show.movie.poster_path,
//         overview: show.movie.overview || "No description available",
//         rating: show.movie.vote_average || "N/A",
//         runtime: show.movie.runtime || "N/A",
//       }));

//       return res.json({
//         type: "movies",
//         answer: "Here are some movies currently showing:",
//         movies,
//       });
//     }

//     if (lower.includes("seat") || lower.includes("availability")) {
//       const shows = await Show.find().limit(3);
//       const seatData = await Promise.all(
//         shows.map(async show => {
//           const bookings = await Booking.find({ show: show._id });
//           const occupied = bookings.flatMap(b => b.bookedSeats);
//           const allSeats = Array.from({ length: 40 }, (_, i) => `S${i + 1}`);
//           const available = allSeats.filter(s => !occupied.includes(s));

//           return {
//             id: show._id,
//             movie: show.movieTitle,
//             showDateTime: show.showDateTime,
//             price: show.price,
//             availableSeats: available,
//           };
//         })
//       );

//       return res.json({
//         type: "seats",
//         answer: "Here are available seats:",
//         seats: seatData,
//       });
//     }

//     // 2. AI fallback
//     const aiResponse = await openrouter.chat.completions.create({
//       model: "anthropic/claude-3.5-sonnet",
//       messages: [
//         { role: "system", content: "You are a helpful assistant for a movie booking service." },
//         { role: "user", content: question }
//       ],
//       max_tokens: 250,
//     });

//     const aiAnswer = aiResponse?.choices?.[0]?.message?.content?.trim() || 
//                      "I don't have information on that.";

//     res.json({ type: "text", answer: aiAnswer });

//   } catch (err) {
//     console.error("askQuestion error:", err);
//     res.status(500).json({ type: "error", answer: "Server error while processing question." });
//   }
// };

// // ================= 2. BOOK SEATS HANDLER =================
// export const bookSeats = async (req, res) => {
//   try {
//     const { showId, seats, userName, userEmail, userId } = req.body;
//     if (!showId || !Array.isArray(seats) || seats.length === 0) {
//       return res.status(400).json({ success: false, message: "Invalid booking request." });
//     }

//     const show = await Show.findById(showId).populate("movie", "title");
//     if (!show) return res.status(404).json({ success: false, message: "Show not found." });

//     const existingBookings = await Booking.find({ show: showId });
//     const alreadyTaken = existingBookings.flatMap(b => b.bookedSeats);
//     const conflict = seats.filter(s => alreadyTaken.includes(s));

//     if (conflict.length > 0) {
//       return res.status(400).json({
//         success: false,
//         message: `Seats already booked: ${conflict.join(", ")}`
//       });
//     }

//     // Mark seats as occupied
//     seats.forEach(seat => show.occupiedSeats = { ...(show.occupiedSeats || {}), [seat]: true });
//     await show.save();

//     const booking = new Booking({
//       user: userId || "Guest",
//       userName: userName || "Guest",
//       userEmail: userEmail || "guest@example.com",
//       show: showId,
//       amount: seats.length * show.showPrice,
//       bookedSeats: seats,
//       isPaid: false, // integrate Stripe later
//     });
//     await booking.save();

//     const updatedAvailableSeats = Object.keys(show.occupiedSeats).filter(seat => !show.occupiedSeats[seat]);

//     res.json({
//       success: true,
//       message: `Successfully booked seats: ${seats.join(", ")}`,
//       show: {
//         id: show._id,
//         movie: show.movie.title,
//         showDateTime: show.showDateTime,
//         price: show.showPrice,
//         availableSeats: updatedAvailableSeats,
//       }
//     });

//   } catch (err) {
//     console.error("bookSeats error:", err);
//     res.status(500).json({ success: false, message: "Booking failed due to server error." });
//   }
// };

// controllers/chatController.js
import Show from "../models/Show.js";
import Booking from "../models/Booking.js";

// In-memory session store (for simplicity, reset on server restart)
const sessions = new Map();

// ================= 1. INTERACTIVE CHAT =================
export const chatWithBot = async (req, res) => {
  try {
    const { userId, message } = req.body;
    if (!userId || !message) {
      return res.status(400).json({ answer: "Please provide userId and message." });
    }

    // Get or create session
    let session = sessions.get(userId);
    if (!session) {
      session = { stage: "start", selectedMovie: null, selectedShow: null };
      sessions.set(userId, session);
    }

    const text = message.toLowerCase();

    // ---------- Stage 1: List movies ----------
    if (session.stage === "start") {
      const now = new Date();
      const upcomingShows = await Show.find({ showDateTime: { $gte: now } })
        .populate("movie", "title poster overview rating runtime")
        .limit(10);

      if (!upcomingShows.length) {
        return res.json({ answer: "No movies are currently showing." });
      }

      // Map unique movies
      const uniqueMovies = [];
      const titles = new Set();
      upcomingShows.forEach(show => {
        if (!titles.has(show.movie.title)) {
          titles.add(show.movie.title);
          uniqueMovies.push({
            movieId: show.movie._id,
            title: show.movie.title,
            overview: show.movie.overview || "No description available",
            rating: show.movie.rating || "N/A",
            runtime: show.movie.runtime || "N/A",
          });
        }
      });

      session.stage = "movieSelected";
      session.movies = uniqueMovies;

      const movieList = uniqueMovies.map((m, i) => `${i + 1}. ${m.title}`).join("\n");

      return res.json({
        answer: `Here are the movies currently showing:\n${movieList}\n\nReply with the number of the movie you want to see showtimes for.`,
      });
    }

    // ---------- Stage 2: Select movie ----------
    if (session.stage === "movieSelected") {
      const index = parseInt(text) - 1;
      if (isNaN(index) || !session.movies[index]) {
        return res.json({ answer: "Please reply with a valid movie number from the list." });
      }

      session.selectedMovie = session.movies[index];
      const now = new Date();
      const shows = await Show.find({ movie: session.selectedMovie.movieId, showDateTime: { $gte: now } })
        .limit(5);

      if (!shows.length) {
        return res.json({ answer: "No upcoming shows for this movie." });
      }

      session.stage = "showSelected";
      session.shows = shows;

      const showList = shows.map((s, i) => `${i + 1}. ${new Date(s.showDateTime).toLocaleString()} (Price: ₹${s.showPrice || 0})`).join("\n");

      return res.json({
        answer: `Available showtimes for "${session.selectedMovie.title}":\n${showList}\n\nReply with the number of the showtime you want to book.`,
      });
    }

    // ---------- Stage 3: Select show ----------
    if (session.stage === "showSelected") {
      const index = parseInt(text) - 1;
      if (isNaN(index) || !session.shows[index]) {
        return res.json({ answer: "Please reply with a valid showtime number." });
      }

      session.selectedShow = session.shows[index];
      session.stage = "seatsSelected";

      const existingBookings = await Booking.find({ show: session.selectedShow._id });
      const takenSeats = existingBookings.flatMap(b => b.bookedSeats);
      const allSeats = Array.from({ length: 40 }, (_, i) => `S${i + 1}`);
      const availableSeats = allSeats.filter(s => !takenSeats.includes(s));

      session.availableSeats = availableSeats;

      return res.json({
        answer: `Available seats for this show:\n${availableSeats.join(", ")}\n\nReply with the seats you want to book, separated by commas (e.g., S1,S2).`,
      });
    }

    // ---------- Stage 4: Book seats ----------
    if (session.stage === "seatsSelected") {
      const requestedSeats = text.split(",").map(s => s.trim().toUpperCase());
      const conflict = requestedSeats.filter(s => !session.availableSeats.includes(s));

      if (conflict.length > 0) {
        return res.json({ answer: `These seats are not available: ${conflict.join(", ")}. Please select from available seats.` });
      }

      // Create booking
      const booking = new Booking({
        user: userId,
        userName: `User_${userId}`,
        userEmail: `user${userId}@example.com`,
        show: session.selectedShow._id,
        bookedSeats: requestedSeats,
        amount: requestedSeats.length * (session.selectedShow.showPrice || 0),
        isPaid: false,
      });
      await booking.save();

      // Clear session
      sessions.delete(userId);

      return res.json({
        answer: `Booking confirmed for "${session.selectedMovie.title}" on ${new Date(session.selectedShow.showDateTime).toLocaleString()}.\nSeats: ${requestedSeats.join(", ")}\nTotal Price: ₹${booking.amount}\nThank you!`,
      });
    }

    // Default fallback
    return res.json({ answer: "I didn't understand that. Please start by asking about movies." });

  } catch (err) {
    console.error("chatWithBot error:", err);
    res.status(500).json({ answer: "Server error while processing your request." });
  }
};
