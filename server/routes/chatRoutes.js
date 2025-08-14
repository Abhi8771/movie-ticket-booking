// import express from "express";
// import OpenAI from "openai";
// import Show from "../models/Show.js";    // Example DB model
// import Booking from "../models/Booking.js";
// import Movie from "../models/Movie.js";

// const router = express.Router();

// // Use OpenRouter instead of OpenAI directly
// const openrouter = new OpenAI({
//   apiKey: process.env.OPENROUTER_API_KEY,
//   baseURL: "https://openrouter.ai/api/v1",
// });

// router.post("/ask", async (req, res) => {
//   const { question } = req.body;

//   try {
//     // STEP 1. Basic rule-based intent detection
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
//     // You can add more database intent checks if needed

//     // STEP 2. Call Claude Sonnet 4 via OpenRouter
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

import express from "express";
import OpenAI from "openai";
import Show from "../models/Show.js";
import Booking from "../models/Booking.js";
import Movie from "../models/Movie.js";
import {  ClerkExpressRequireAuth  } from "@clerk/clerk-sdk-node";

const router = express.Router();

// OpenRouter (Claude Sonnet 4)
const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

router.post("/ask", ClerkExpressRequireAuth(), async (req, res) => {
  const { question } = req.body;
  const userId = req.ClerkExpressRequireAuth.session.userId; // Clerk user ID

  try {
    let dbResponse = "";
    const lowerQ = question.toLowerCase();

    // 1️⃣ User-specific bookings
    if (lowerQ.includes("my booking") || lowerQ.includes("my seats")) {
      const bookings = await Booking.find({ user: userId }).populate({
        path: "show",
        populate: { path: "movie" },
      });

      if (bookings.length > 0) {
        dbResponse = bookings
          .map(
            (b) =>
              `${b.show.movie.title} at ${b.show.time}, ${b.seats} seat(s) booked`
          )
          .join("\n");
      } else {
        dbResponse = "You have no bookings yet.";
      }
    } 
    // 2️⃣ Seat availability / specific movie shows
    else if (lowerQ.includes("available") && lowerQ.includes("seat")) {
      // Try to find movie mentioned in question
      const movieMatch = await Movie.findOne({
        title: { $regex: new RegExp(question, "i") },
      });

      if (movieMatch) {
        const shows = await Show.find({ movie: movieMatch._id });
        dbResponse =
          shows.length > 0
            ? shows
                .map(
                  (s) =>
                    `${s.movie.title} at ${s.time} has ${s.availableSeats} seats left`
                )
                .join("\n")
            : `No shows found for ${movieMatch.title}`;
      } else {
        // Fallback: list all shows
        const shows = await Show.find().populate("movie");
        dbResponse = shows
          .map(
            (s) =>
              `${s.movie.title} at ${s.time} has ${s.availableSeats} seats left`
          )
          .join("\n");
      }
    } 
    // 3️⃣ List upcoming movies
    else if (lowerQ.includes("show") || lowerQ.includes("movie")) {
      const movies = await Movie.find();
      dbResponse = "Upcoming movies:\n" + movies.map((m) => m.title).join(", ");
    }

    // 4️⃣ AI Prompt
    const prompt = `
      You are an assistant for a movie ticket booking website.
      User asked: "${question}"
      Database info: "${dbResponse || "No extra database info"}"
      Respond helpfully and concisely.
    `;

    const aiRes = await openrouter.chat.completions.create({
      model: "anthropic/claude-3.5-sonnet",
      messages: [
        { role: "system", content: "You are a helpful assistant for a movie booking service." },
        { role: "user", content: prompt }
      ],
      max_tokens: 150,
    });

    const answer = aiRes.choices[0].message.content.trim();
    res.json({ answer });
  } catch (error) {
    console.error("Chatbot error:", error);
    res.status(500).json({ answer: "Error fetching data or AI response." });
  }
});

export default router;
