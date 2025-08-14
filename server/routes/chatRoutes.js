import express from "express";
import OpenAI from "openai";
import Show from "../models/Show.js";    
import Booking from "../models/Booking.js";
import Movie from "../models/Movie.js";

const router = express.Router();

// Initialize OpenAI client
const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

router.post("/ask", async (req, res) => {
  const { question } = req.body;

  try {
    let dbResponse = "";
    const lowerQ = question.toLowerCase();

    if (lowerQ.includes("available") && lowerQ.includes("seat")) {
      const shows = await Show.find().populate("movie");
      dbResponse = shows.map(show => 
        `${show.movie.title} at ${show.time} has ${show.availableSeats} seats left`
      ).join("\n");
    } 
    else if (lowerQ.includes("show") || lowerQ.includes("movie")) {
      const movies = await Movie.find();
      dbResponse = "Upcoming movies:\n" + movies.map(m => m.title).join(", ");
    }
   
    const prompt = `
      You are an assistant for a movie ticket booking website.
      User asked: "${question}"
      Database info: "${dbResponse || 'No extra database info'}"
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

