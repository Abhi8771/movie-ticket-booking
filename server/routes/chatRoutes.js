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


import express from "express";
import OpenAI from "openai";
import Show from "../models/Show.js";
import Booking from "../models/Booking.js";
import Movie from "../models/Movie.js";

const router = express.Router();

// Initialize OpenAI client (OpenRouter with Claude 3.5 Sonnet)
const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

router.post("/ask", async (req, res) => {
  const { question } = req.body;

  try {
    // --- 1. Fetch all data you may need in structured format ---
    const moviesNowShowing = await Movie.find({ isNowShowing: true }).select("title description posterUrl duration rating");
    const allShows = await Show.find().populate("movie", "title").select("time availableSeats screenNumber");
    
    // (Optional) If you want to fetch bookings:
    // const allBookings = await Booking.find().populate("show").populate("user");

    // Prepare structured JSON for the AI
    const dbInfo = {
      moviesNowShowing: moviesNowShowing.map(m => ({
        title: m.title,
        description: m.description,
        posterUrl: m.posterUrl,
        duration: m.duration,
        rating: m.rating,
      })),
      shows: allShows.map(s => ({
        movie: s.movie.title,
        time: s.time,
        availableSeats: s.availableSeats,
        screen: s.screenNumber
      })),
      // bookings: ... if needed
    };

    // --- 2. Build prompt for AI ---
    const prompt = `
You are an assistant for a movie ticket booking website. 
You ONLY answer using the provided database JSON. 
If the user asks about something not in the database, say "I don't have information on that."

User question: "${question}"
Database JSON:
${JSON.stringify(dbInfo, null, 2)}

Instructions:
- If user asks about "currently playing movies", list movies from moviesNowShowing.
- If user asks about showtimes or seats, give details from shows.
- If no info is available, clearly say so.
- Respond concisely and clearly.
`;

    // --- 3. Call AI model ---
    const aiRes = await openrouter.chat.completions.create({
      model: "anthropic/claude-3.5-sonnet",
      messages: [
        { role: "system", content: "You are a helpful assistant for a movie booking service." },
        { role: "user", content: prompt }
      ],
      max_tokens: 250,
    });

    const answer = aiRes.choices[0].message.content.trim();

    // --- 4. Return final answer ---
    res.json({ answer, rawData: dbInfo }); // rawData helps for debugging if needed

  } catch (error) {
    console.error("Chatbot error:", error);
    res.status(500).json({ answer: "Error fetching data or AI response." });
  }
});

export default router;
