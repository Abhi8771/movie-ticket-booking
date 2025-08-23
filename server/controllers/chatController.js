import OpenAI from "openai";
import Show from "../models/Show.js";

// Initialize OpenRouter AI
const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

export const askQuestion = async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || typeof question !== "string") {
      return res.status(400).json({ type: "error", answer: "Please ask a valid question." });
    }

    const lower = question.toLowerCase();
    const now = new Date();

    // List current shows
    if (lower.includes("currently showing") || lower.includes("movies")) {
      const upcomingShows = await Show.find({ showDateTime: { $gte: now } })
        .populate("movie", "title poster_path overview vote_average runtime")
        .limit(10);

      const movies = upcomingShows.map(show => ({
        id: show._id,
        title: show.movie.title,
        poster: show.movie.poster_path,
        overview: show.movie.overview || "No description available",
        rating: show.movie.vote_average || "N/A",
        runtime: show.movie.runtime || "N/A",
        showDateTime: show.showDateTime,
      }));

      return res.json({
        type: "movies",
        answer: "Here are the currently showing movies with showtimes:",
        movies,
      });
    }

    //Movie info by name ---
    if (lower.includes("info about") || lower.includes("details about")) {
      const movieName = question.split("about")[1]?.trim();
      if (!movieName) {
        return res.json({ type: "text", answer: "Please mention the movie name." });
      }

      const show = await Show.findOne({ showDateTime: { $gte: now } })
        .populate({
          path: "movie",
          match: { title: { $regex: movieName, $options: "i" } },
        });

      if (show && show.movie) {
        return res.json({
          type: "movieInfo",
          answer: `Here is the information for "${show.movie.title}":`,
          movie: {
            title: show.movie.title,
            poster: show.movie.poster_path,
            overview: show.movie.overview || "No description available",
            rating: show.movie.vote_average || "N/A",
            runtime: show.movie.runtime || "N/A",
            showDateTime: show.showDateTime,
          },
          guide: `To book tickets: 
1. Click on the "Buy Ticket" button below the desired movie. 
2. Select the show date and time, then pick your desired seats (if available). 
3. Click "Proceed to Checkout". 
4. Complete your payment on the Stripe page.`,
        });
      }
    }

    //Fallback to AI ---
    const aiResponse = await openrouter.chat.completions.create({
      model: "anthropic/claude-3.5-sonnet",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant for a movie booking service. Give brief answers about currently showing movies, showtimes, reviews, and guide users for booking tickets.",
        },
        { role: "user", content: question },
      ],
      max_tokens: 250,
    });

    const aiAnswer = aiResponse?.choices?.[0]?.message?.content?.trim() || 
                     "I don't have information on that.";

    return res.json({ type: "text", answer: aiAnswer });

  } catch (err) {
    console.error("askQuestion error:", err);
    return res.status(500).json({ type: "error", answer: "Server error while processing question." });
  }
};

