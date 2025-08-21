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
import Movie from "../models/Movie.js";
import Show from "../models/Show.js";
import Booking from "../models/Booking.js";

const router = express.Router();

const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

// AI Chat Query
router.post("/ask", async (req, res) => {
  const { question } = req.body;

  try {
    const movies = await Movie.find();
    const shows = await Show.find().populate("movie", "title");

    const dbInfo = {
      movies: movies.map(m => ({
        id: m._id,
        title: m.title,
        overview: m.overview,
        poster: m.poster_path,
        releaseDate: m.release_date,
        rating: m.vote_average,
        runtime: m.runtime,
        genres: m.genres,
      })),
      shows: shows.map(s => ({
        id: s._id,
        movie: s.movie?.title,
        showDateTime: s.showDateTime,
        price: s.showPrice,
        availableSeats: 100 - Object.keys(s.occupiedSeats || {}).length,
        occupiedSeats: s.occupiedSeats,
      }))
    };

    const prompt = `
You are a helpful assistant for a movie ticket booking website. Use ONLY the JSON data below to answer.
User question: "${question}"
Database JSON:
${JSON.stringify(dbInfo, null, 2)}
If no information is found, respond: "I don't have information on that."
`;

    const aiRes = await openrouter.chat.completions.create({
      model: "anthropic/claude-3.5-sonnet",
      messages: [
        { role: "system", content: "You are a helpful assistant for a movie booking service." },
        { role: "user", content: prompt }
      ],
      max_tokens: 300,
    });

    const answer = aiRes.choices[0].message.content.trim();
    res.json({ answer, rawData: dbInfo });

  } catch (err) {
    console.error(err);
    res.status(500).json({ answer: "Error fetching data or AI response." });
  }
});

// Seat Booking
router.post("/book", async (req, res) => {
  const { showId, seats, userName, userEmail, user } = req.body;
  try {
    const show = await Show.findById(showId);
    if (!show) return res.status(404).json({ success: false, message: "Show not found" });

    // Check availability
    const occupied = show.occupiedSeats || {};
    for (let s of seats) if (occupied[s]) return res.status(400).json({ success: false, message: `Seat ${s} already booked` });

    // Mark seats as occupied
    seats.forEach(s => occupied[s] = true);
    show.occupiedSeats = occupied;
    await show.save();

    const booking = new Booking({
      user: user || "guest",
      userName,
      userEmail,
      show: showId,
      amount: show.showPrice * seats.length,
      bookedSeats: seats,
      isPaid: true // can integrate real payment
    });
    await booking.save();

    res.json({ success: true, message: `Seats booked successfully: ${seats.join(", ")}`, show });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Booking failed" });
  }
});

export default router;
