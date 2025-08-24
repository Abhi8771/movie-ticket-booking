// import OpenAI from "openai";
// import Show from "../models/Show.js";

// // Initialize OpenRouter AI
// const openrouter = new OpenAI({
//   apiKey: process.env.OPENROUTER_API_KEY,
//   baseURL: "https://openrouter.ai/api/v1",
// });

// export const askQuestion = async (req, res) => {
//   try {
//     const { question } = req.body;
//     if (!question || typeof question !== "string") {
//       return res.status(400).json({ type: "error", answer: "Please ask a valid question." });
//     }

//     const lower = question.toLowerCase();
//     const now = new Date();

//     // List current shows
//     if (lower.includes("currently showing") || lower.includes("movies")) {
//       const upcomingShows = await Show.find({ showDateTime: { $gte: now } })
//         .populate("movie", "title poster_path overview vote_average runtime")
//         .limit(10);

//       const movies = upcomingShows.map(show => ({
//         id: show._id,
//         title: show.movie.title,
//         poster: show.movie.poster_path,
//         overview: show.movie.overview || "No description available",
//         rating: show.movie.vote_average || "N/A",
//         runtime: show.movie.runtime || "N/A",
//         showDateTime: show.showDateTime,
//       }));

//       return res.json({
//         type: "movies",
//         answer: "Here are the currently showing movies with showtimes:",
//         movies,
//       });
//     }

//     //Movie info by name ---
//     if (lower.includes("info about") || lower.includes("details about")) {
//       const movieName = question.split("about")[1]?.trim();
//       if (!movieName) {
//         return res.json({ type: "text", answer: "Please mention the movie name." });
//       }

//       const show = await Show.findOne({ showDateTime: { $gte: now } })
//         .populate({
//           path: "movie",
//           match: { title: { $regex: movieName, $options: "i" } },
//         });

//       if (show && show.movie) {
//         return res.json({
//           type: "movieInfo",
//           answer: `Here is the information for "${show.movie.title}":`,
//           movie: {
//             title: show.movie.title,
//             poster: show.movie.poster_path,
//             overview: show.movie.overview || "No description available",
//             rating: show.movie.vote_average || "N/A",
//             runtime: show.movie.runtime || "N/A",
//             showDateTime: show.showDateTime,
//           },
//           guide: `To book tickets: 
// 1. Click on the "Buy Ticket" button below the desired movie. 
// 2. Select the show date and time, then pick your desired seats (if available). 
// 3. Click "Proceed to Checkout". 
// 4. Complete your payment on the Stripe page.`,
//         });
//       }
//     }

//     //Fallback to AI ---
//     const aiResponse = await openrouter.chat.completions.create({
//       model: "anthropic/claude-3.5-sonnet",
//       messages: [
//         {
//           role: "system",
//           content: "You are a helpful assistant for a movie booking service. Give brief answers about currently showing movies, showtimes, reviews, and guide users for booking tickets.",
//         },
//         { role: "user", content: question },
//       ],
//       max_tokens: 250,
//     });

//     const aiAnswer = aiResponse?.choices?.[0]?.message?.content?.trim() || 
//                      "I don't have information on that.";

//     return res.json({ type: "text", answer: aiAnswer });

//   } catch (err) {
//     console.error("askQuestion error:", err);
//     return res.status(500).json({ type: "error", answer: "Server error while processing question." });
//   }
// };


/**
 * Chatbot controller – returns ONLY database-backed answers.
 * No AI fallbacks. Optimized queries with lean() + projections.
 */
import { parseIntent } from '../services/intentService.js';
import { findMovieByTitle } from '../services/movieService.js';
import { listUpcomingShows, listShowtimesForMovieId, nextShowForTitle, getOccupiedSeats } from '../services/showService.js';

export async function askQuestion(req, res) {
  try {
    const { question } = req.body || {};
    if (!question || typeof question !== 'string') {
      return res.status(400).json({ type: 'error', answer: 'Please ask a valid question.' });
    }

    const intent = parseIntent(question);

    switch (intent.type) {
      case 'LIST_MOVIES': {
        const upcoming = await listUpcomingShows(10);
        if (!upcoming.length) {
          return res.json({ type: 'text', answer: 'No movies are currently showing.' });
        }
        const movies = upcoming.map(s => ({
          id: s._id,                         // show id (for deep link)
          title: s.movie.title,
          poster: s.movie.poster_path,
          overview: s.movie.overview || 'No description available',
          rating: s.movie.vote_average ?? 'N/A',
          runtime: s.movie.runtime ?? 'N/A',
          showDateTime: s.showDateTime,
        }));
        return res.json({ type: 'movies', answer: 'Here are the currently showing movies with showtimes:', movies });
      }

      case 'MOVIE_INFO': {
        const movie = await findMovieByTitle(intent.title);
        if (!movie) return res.json({ type: 'text', answer: `I couldn't find "${intent.title}".` });

        const showtimes = await listShowtimesForMovieId(movie._id);
        const nearest = showtimes[0];

        return res.json({
          type: 'movieInfo',
          answer: `Here is the information for "${movie.title}":`,
          movie: {
            id: nearest?._id || null,        // prefer a real show id for Buy Ticket
            title: movie.title,
            poster: movie.poster_path,
            overview: movie.overview || 'No description available',
            rating: movie.vote_average ?? 'N/A',
            runtime: movie.runtime ?? 'N/A',
            showDateTime: nearest?.showDateTime || null,
          },
          guide: nearest
            ? `To book tickets:
1) Click "Buy Ticket".
2) Pick seats for the ${new Date(nearest.showDateTime).toLocaleString()} show.
3) Proceed to checkout and complete payment.`
            : `No upcoming showtimes found. Check back later.`,
        });
      }

      case 'SHOWTIMES': {
        const movie = await findMovieByTitle(intent.title);
        if (!movie) return res.json({ type: 'text', answer: `No results for "${intent.title}".` });

        const showtimes = await listShowtimesForMovieId(movie._id);
        if (!showtimes.length) {
          return res.json({ type: 'text', answer: `No upcoming showtimes for "${movie.title}".` });
        }

        const lines = showtimes.map(s => `• ${new Date(s.showDateTime).toLocaleString()}  (showId: ${s._id})`);
        return res.json({
          type: 'text',
          answer: `Showtimes for "${movie.title}":\n${lines.join('\n')}\n\nTip: ask "seats for show <showId>" to check availability.`,
        });
      }

      case 'SEATS_BY_SHOW': {
        const show = await getOccupiedSeats(intent.showId);
        if (!show) return res.json({ type: 'text', answer: 'Show not found.' });

        const occupied = Object.keys(show.occupiedSeats || {});
        const count = occupied.length;
        const summary = count ? occupied.join(', ') : 'None';

        return res.json({
          type: 'seatInfo',
          answer: `Occupied seats for show ${show._id} (${new Date(show.showDateTime).toLocaleString()}): ${summary}\nAll other seats are available.`,
          occupiedSeats: occupied,
          showId: show._id,
        });
      }

      case 'SEATS_BY_TITLE': {
        // Find next upcoming show for that movie
        const movie = await findMovieByTitle(intent.title);
        if (!movie) return res.json({ type: 'text', answer: `No results for "${intent.title}".` });

        const show = await nextShowForTitle(movie._id);
        if (!show) return res.json({ type: 'text', answer: `No upcoming shows for "${movie.title}".` });

        const occupied = Object.keys(show.occupiedSeats || {});
        const count = occupied.length;
        const summary = count ? occupied.join(', ') : 'None';

        return res.json({
          type: 'seatInfo',
          answer: `Occupied seats for "${movie.title}" (next show: ${new Date(show.showDateTime).toLocaleString()} – showId: ${show._id}): ${summary}\nAll other seats are available.`,
          occupiedSeats: occupied,
          showId: show._id,
        });
      }

      case 'HELP': {
        return res.json({
          type: 'text',
          answer:
`I can help with:
• "currently showing" – list movies & nearest showtimes
• "info about <title>" – movie info + nearest show
• "showtimes <title>" – all upcoming times
• "seats for show <showId>" – seat availability
• "seats for <title>" – next show's occupancy
• Booking: open a movie card and click "Buy Ticket"`,
        });
      }

      default:
        return res.json({
          type: 'text',
          answer: `Try:
• "currently showing"
• "info about Inception"
• "showtimes Avatar"
• "seats for show <showId>"
• "seats for Interstellar"`,
        });
    }
  } catch (err) {
    console.error('askQuestion error:', err);
    return res.status(500).json({ type: 'error', answer: 'Server error while processing question.' });
  }
}
