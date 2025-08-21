import fetch from "node-fetch";
import Show from "../models/Show.js";
import Booking from "../models/Booking.js";

// ========== 1. AI QUESTION HANDLER ==========
export const askQuestion = async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || typeof question !== "string") {
      return res.status(400).json({ type: "error", answer: "Please ask a valid question." });
    }

    const lower = question.toLowerCase();

    // 1. If keywords match → use DB-based logic
    if (lower.includes("movie") || lower.includes("show")) {
      const shows = await Show.find().limit(3);
      const movies = shows.map(show => ({
        id: show._id,
        title: show.movieTitle,
        poster: show.posterUrl,
        overview: show.description || "No description available",
        rating: show.rating || "N/A",
        runtime: show.runtime || "N/A",
      }));
      return res.json({
        type: "movies",
        answer: "Here are some movies currently showing:",
        movies,
      });
    }

    if (lower.includes("seat") || lower.includes("availability")) {
      const shows = await Show.find().limit(2);
      const seatData = await Promise.all(
        shows.map(async (show) => {
          const bookings = await Booking.find({ show: show._id });
          const occupied = bookings.flatMap(b => b.seats);
          const allSeats = Array.from({ length: 40 }, (_, i) => `S${i + 1}`);
          const available = allSeats.filter(s => !occupied.includes(s));

          return {
            id: show._id,
            movie: show.movieTitle,
            price: show.price,
            showDateTime: show.dateTime,
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

    // 2. Otherwise → call AI (OpenRouter or OpenAI)
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}` // ensure this key is set
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: question }]
      })
    });

    const data = await response.json();

    if (!data?.choices?.[0]?.message?.content) {
      return res.status(500).json({ type: "error", answer: "AI did not return a valid response." });
    }

    const aiAnswer = data.choices[0].message.content;
    return res.json({ type: "text", answer: aiAnswer });

  } catch (err) {
    console.error("askQuestion error:", err);
    res.status(500).json({ type: "error", answer: "Server error while processing question." });
  }
};

// ========== 2. BOOK SEATS HANDLER ==========
export const bookSeats = async (req, res) => {
  try {
    const { showId, seats } = req.body;
    if (!showId || !Array.isArray(seats) || seats.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid booking request." });
    }

    const existingBookings = await Booking.find({ show: showId });
    const alreadyTaken = existingBookings.flatMap(b => b.seats);
    const conflict = seats.filter(s => alreadyTaken.includes(s));

    if (conflict.length > 0) {
      return res.json({
        success: false,
        message: `Seats already booked: ${conflict.join(", ")}`
      });
    }

    const booking = new Booking({ show: showId, seats });
    await booking.save();

    res.json({
      success: true,
      message: `Successfully booked seats: ${seats.join(", ")}`
    });

  } catch (err) {
    console.error("bookSeats error:", err);
    res.status(500).json({ success: false, message: "Booking failed due to server error." });
  }
};
