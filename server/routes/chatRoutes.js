import express from "express";
import OpenAI from "openai";
import Show from "../models/Show.js";    // Example DB model
import Booking from "../models/Booking.js";
import Movie from "../models/Movie.js";

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post("/ask", async (req, res) => {
  const { question } = req.body;

  try {
    // STEP 1. Do some basic intent detection manually (seat availability, showtimes, etc.)
    let dbResponse = "";
    const lowerQ = question.toLowerCase();

    if (lowerQ.includes("available") && lowerQ.includes("seat")) {
      const shows = await Show.find().limit(3).populate("movie");
      dbResponse = shows.map(show => 
        `${show.movie.title} at ${show.time} has ${show.availableSeats} seats left`
      ).join("\n");
    } 
    else if (lowerQ.includes("show") || lowerQ.includes("movie")) {
      const movies = await Movie.find().limit(3);
      dbResponse = "Upcoming movies:\n" + movies.map(m => m.title).join(", ");
    }
    // Add more rules here if needed

    // STEP 2. Call AI to generate a nice human response
    const prompt = `
      You are an assistant for a movie ticket booking website.
      User asked: "${question}"
      Database info: "${dbResponse || 'No extra database info'}"
      Respond helpfully and concisely.
    `;

    const aiRes = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: "You are a helpful assistant." }, { role: "user", content: prompt }],
      max_tokens: 150
    });

    const answer = aiRes.choices[0].message.content.trim();
    res.json({ answer });

  } catch (error) {
    console.error(error);
    res.status(500).json({ answer: "Error fetching data or AI response." });
  }
});

export default router;
