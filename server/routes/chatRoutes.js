// import express from "express";
// import OpenAI from "openai";
// import Show from "../models/Show.js";    
// import Booking from "../models/Booking.js";
// import Movie from "../models/Movie.js";

// const router = express.Router();

// // Initialize OpenAI client
// const openrouter = new OpenAI({
//   apiKey: process.env.OPENROUTER_API_KEY,
//   baseURL: "https://openrouter.ai/api/v1",
// });

// router.post("/ask", async (req, res) => {
//   const { question } = req.body;

//   try {
//     let dbResponse = "";
//     const lowerQ = question.toLowerCase();

//     if (lowerQ.includes("available") && lowerQ.includes("seat")) {
//       const shows = await Show.find().populate("movie");
//       dbResponse = shows.map(show => 
//         `${show.movie.title} at ${show.time} has ${show.availableSeats} seats left`
//       ).join("\n");
//     } 
//     else if (lowerQ.includes("show") || lowerQ.includes("movie")) {
//       const movies = await Movie.find();
//       dbResponse = "Upcoming movies:\n" + movies.map(m => m.title).join(", ");
//     }
   
//     const prompt = `
//       You are an assistant for a movie ticket booking website.
//       User asked: "${question}"
//       Database info: "${dbResponse || 'No extra database info'}"
//       Respond helpfully and concisely.
//     `;

//     const aiRes = await openrouter.chat.completions.create({
//       model: "anthropic/claude-3.5-sonnet",
//       messages: [
//         { role: "system", content: "You are a helpful assistant for a movie booking service." },
//         { role: "user", content: prompt }
//       ],
//       max_tokens: 150,
//     });

//     const answer = aiRes.choices[0].message.content.trim();
//     res.json({ answer });

//   } catch (error) {
//     console.error("Chatbot error:", error);
//     res.status(500).json({ answer: "Error fetching data or AI response." });
//   }
// });

// export default router;


// import express from "express";
// import OpenAI from "openai";
// import Show from "../models/Show.js";
// import Booking from "../models/Booking.js";
// import Movie from "../models/Movie.js";

// const router = express.Router();

// // ===== Config you can tweak =====
// // If you don't store a seat map in DB, use this fallback map.
// const ALL_SEATS = ["A1", "A2", "A3", "B1", "B2"];

// // Initialize OpenAI client (OpenRouter)
// const openrouter = new OpenAI({
//   apiKey: process.env.OPENROUTER_API_KEY,
//   baseURL: "https://openrouter.ai/api/v1",
// });

// /**
//  * Helper: build available seats for a Show
//  * Uses your Show schema where `occupiedSeats` is an object: { A1: true, ... }
//  */
// function getAvailableSeatsForShow(show, allSeats = ALL_SEATS) {
//   const occupied = show.occupiedSeats || {};
//   return allSeats.filter((seat) => !occupied[seat]);
// }

// /**
//  * POST /api/chat/ask
//  * Supports:
//  *  - "available" + "seat" => returns structured seat data (per show)
//  *  - "show" or "movie"    => returns movie list
//  *  - otherwise            => AI fallback
//  */
// router.post("/ask", async (req, res) => {
//   const { question } = req.body || {};
//   if (typeof question !== "string" || !question.trim()) {
//     return res.status(400).json({ type: "error", answer: "Invalid question." });
//   }

//   try {
//     const lowerQ = question.toLowerCase();

//     // ===== CASE 1: Available seats requested =====
//     if (lowerQ.includes("available") && lowerQ.includes("seat")) {
//       const shows = await Show.find().sort({ showDateTime: 1 });

//       if (!shows.length) {
//         return res.json({
//           type: "text",
//           answer: "No shows found at the moment.",
//         });
//       }

//       // Build structured seat availability per show
//       const seatsPayload = shows.map((show) => {
//         const availableSeats = getAvailableSeatsForShow(show, ALL_SEATS);
//         return {
//           id: String(show._id),
//           movie: show.movie, // movie is a String in your schema
//           time: show.showDateTime, // Date
//           price: show.showPrice,
//           availableSeats, // array of strings
//         };
//       });

//       return res.json({
//         type: "seats",
//         answer: "Here are the available seats:",
//         seats: seatsPayload,
//       });
//     }

//     // ===== CASE 2: Movies or shows listing =====
//     if (lowerQ.includes("show") || lowerQ.includes("movie")) {
//       const movies = await Movie.find().sort({ title: 1 });
//       const titles = movies.map((m) => m.title);

//       return res.json({
//         type: "movies",
//         answer: titles.length ? "Here are the upcoming movies:" : "No movies found.",
//         movies: titles,
//       });
//     }

//     // ===== DEFAULT: AI fallback =====
//     const prompt = `
//       You are an assistant for a movie ticket booking website.
//       User asked: "${question}"
//       No direct database info matched; reply helpfully and concisely.
//     `;

//     const aiRes = await openrouter.chat.completions.create({
//       model: "anthropic/claude-3.5-sonnet",
//       messages: [
//         { role: "system", content: "You are a helpful assistant for a movie booking service." },
//         { role: "user", content: prompt },
//       ],
//       max_tokens: 180,
//     });

//     const answer = aiRes.choices?.[0]?.message?.content?.trim() || "I can help with bookings and seat availability.";
//     return res.json({ type: "text", answer });
//   } catch (error) {
//     console.error("Chat /ask error:", error);
//     return res.status(500).json({ type: "error", answer: "Error fetching data or AI response." });
//   }
// });

// /**
//  * POST /api/chat/book
//  * Body: { showId: string, seats: string[], userName?: string }
//  * - Validates seats are still free
//  * - Marks them as occupied
//  * - Creates a Booking record
//  * - Returns confirmation + updated availability for that show
//  */
// router.post("/book", async (req, res) => {
//   const { showId, seats, userName } = req.body || {};

//   if (!showId || !Array.isArray(seats) || seats.length === 0) {
//     return res.status(400).json({ success: false, message: "showId and seats[] are required." });
//   }

//   try {
//     const show = await Show.findById(showId);
//     if (!show) {
//       return res.status(404).json({ success: false, message: "Show not found." });
//     }

//     const occupied = show.occupiedSeats || {};

//     // Validate availability
//     for (const seat of seats) {
//       if (!ALL_SEATS.includes(seat)) {
//         return res.status(400).json({ success: false, message: `Seat ${seat} is not valid.` });
//       }
//       if (occupied[seat]) {
//         return res.status(400).json({ success: false, message: `Seat ${seat} is already booked.` });
//       }
//     }

//     // Mark seats as booked (store userName or boolean)
//     seats.forEach((seat) => {
//       occupied[seat] = userName || true;
//     });
//     show.occupiedSeats = occupied;
//     await show.save();

//     // Optional: persist booking record
//     try {
//       if (Booking) {
//         await Booking.create({
//           show: showId,
//           seats,
//           userName: userName || "Guest",
//           price: show.showPrice,
//           bookedAt: new Date(),
//         });
//       }
//     } catch (e) {
//       // If Booking model differs, don't crash booking flow
//       console.warn("Booking model save failed (ignored):", e?.message);
//     }

//     // Return updated availability for this show
//     const availableSeats = getAvailableSeatsForShow(show, ALL_SEATS);

//     return res.json({
//       success: true,
//       message: `Booking confirmed for ${seats.join(", ")}.`,
//       show: {
//         id: String(show._id),
//         movie: show.movie,
//         time: show.showDateTime,
//         price: show.showPrice,
//         availableSeats,
//       },
//     });
//   } catch (error) {
//     console.error("Chat /book error:", error);
//     return res.status(500).json({ success: false, message: "Server error during booking." });
//   }
// });

// export default router;

import express from "express";
import OpenAI from "openai";
import Show from "../models/Show.js";
import Booking from "../models/Booking.js";
import Movie from "../models/Movie.js";

const router = express.Router();

const ALL_SEATS = ["A1", "A2", "A3", "B1", "B2"];

const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

function getAvailableSeatsForShow(show, allSeats = ALL_SEATS) {
  const occupied = show.occupiedSeats || {};
  return allSeats.filter((seat) => !occupied[seat]);
}

router.post("/ask", async (req, res) => {
  const { question } = req.body || {};
  if (!question?.trim()) return res.status(400).json({ type: "error", answer: "Invalid question." });

  try {
    const lowerQ = question.toLowerCase();

    // ==== Available seats query ====
    if (lowerQ.includes("available") && lowerQ.includes("seat")) {
      const shows = await Show.find().sort({ showDateTime: 1 });
      if (!shows.length) return res.json({ type: "text", answer: "No shows found." });

      const seatsPayload = shows.map((show) => ({
        id: String(show._id),
        movie: show.movie,
        time: show.showDateTime,
        price: show.showPrice,
        availableSeats: getAvailableSeatsForShow(show),
      }));

      return res.json({ type: "seats", answer: "Here are the available seats:", seats: seatsPayload });
    }

    // ==== Now Showing movies ====
    if (lowerQ.includes("show") || lowerQ.includes("movie")) {
      const movies = await Movie.find({ nowShowing: true }).sort({ title: 1 }); // Only now showing
      const titles = movies.map((m) => m.title);

      return res.json({
        type: "movies",
        answer: titles.length ? "Currently showing movies:" : "No movies are currently showing.",
        movies: titles,
      });
    }

    // ==== Default AI fallback ====
    const prompt = `
      You are a movie ticket booking assistant.
      User asked: "${question}"
      Available shows or movies info: Use only if relevant.
    `;

    const aiRes = await openrouter.chat.completions.create({
      model: "anthropic/claude-3.5-sonnet",
      messages: [
        { role: "system", content: "You are a helpful movie booking assistant." },
        { role: "user", content: prompt },
      ],
      max_tokens: 180,
    });

    const answer = aiRes.choices?.[0]?.message?.content?.trim() || "I can help with bookings and seat availability.";
    return res.json({ type: "text", answer });

  } catch (error) {
    console.error("Chat /ask error:", error);
    return res.status(500).json({ type: "error", answer: "Server error." });
  }
});

// ==== Booking endpoint remains the same ====
router.post("/book", async (req, res) => {
  const { showId, seats, userName } = req.body || {};
  if (!showId || !Array.isArray(seats) || seats.length === 0) 
    return res.status(400).json({ success: false, message: "showId and seats[] required." });

  try {
    const show = await Show.findById(showId);
    if (!show) return res.status(404).json({ success: false, message: "Show not found." });

    const occupied = show.occupiedSeats || {};
    for (const seat of seats) {
      if (!ALL_SEATS.includes(seat)) return res.status(400).json({ success: false, message: `${seat} invalid.` });
      if (occupied[seat]) return res.status(400).json({ success: false, message: `${seat} already booked.` });
    }

    seats.forEach((seat) => (occupied[seat] = userName || true));
    show.occupiedSeats = occupied;
    await show.save();

    if (Booking) {
      await Booking.create({
        show: showId,
        seats,
        userName: userName || "Guest",
        price: show.showPrice,
        bookedAt: new Date(),
      });
    }

    return res.json({
      success: true,
      message: `Booking confirmed for ${seats.join(", ")}.`,
      show: {
        id: String(show._id),
        movie: show.movie,
        time: show.showDateTime,
        price: show.showPrice,
        availableSeats: getAvailableSeatsForShow(show),
      },
    });

  } catch (error) {
    console.error("Chat /book error:", error);
    return res.status(500).json({ success: false, message: "Server error during booking." });
  }
});

export default router;
