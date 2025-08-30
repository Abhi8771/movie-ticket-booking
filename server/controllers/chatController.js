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
// import { parseIntent } from '../services/intentService.js';
// import { findMovieByTitle } from '../services/movieService.js';
// import { listUpcomingShows, listShowtimesForMovieId, nextShowForTitle, getOccupiedSeats } from '../services/showService.js';

// export async function askQuestion(req, res) {
//   try {
//     const { question } = req.body || {};
//     if (!question || typeof question !== 'string') {
//       return res.status(400).json({ type: 'error', answer: 'Please ask a valid question.' });
//     }

//     const intent = parseIntent(question);

//     switch (intent.type) {
//       case 'LIST_MOVIES': {
//         const upcoming = await listUpcomingShows(10);
//         if (!upcoming.length) {
//           return res.json({ type: 'text', answer: 'No movies are currently showing.' });
//         }
//         const movies = upcoming.map(s => ({
//           id: s._id,                         // show id (for deep link)
//           title: s.movie.title,
//           poster: s.movie.poster_path,
//           overview: s.movie.overview || 'No description available',
//           rating: s.movie.vote_average ?? 'N/A',
//           runtime: s.movie.runtime ?? 'N/A',
//           showDateTime: s.showDateTime,
//         }));
//         return res.json({ type: 'movies', answer: 'Here are the currently showing movies with showtimes:', movies });
//       }

//       case 'MOVIE_INFO': {
//         const movie = await findMovieByTitle(intent.title);
//         if (!movie) return res.json({ type: 'text', answer: `I couldn't find "${intent.title}".` });

//         const showtimes = await listShowtimesForMovieId(movie._id);
//         const nearest = showtimes[0];

//         return res.json({
//           type: 'movieInfo',
//           answer: `Here is the information for "${movie.title}":`,
//           movie: {
//             id: nearest?._id || null,        // prefer a real show id for Buy Ticket
//             title: movie.title,
//             poster: movie.poster_path,
//             overview: movie.overview || 'No description available',
//             rating: movie.vote_average ?? 'N/A',
//             runtime: movie.runtime ?? 'N/A',
//             showDateTime: nearest?.showDateTime || null,
//           },
//           guide: nearest
//             ? `To book tickets:
// 1) Click "Buy Ticket".
// 2) Pick seats for the ${new Date(nearest.showDateTime).toLocaleString()} show.
// 3) Proceed to checkout and complete payment.`
//             : `No upcoming showtimes found. Check back later.`,
//         });
//       }

//       case 'SHOWTIMES': {
//         const movie = await findMovieByTitle(intent.title);
//         if (!movie) return res.json({ type: 'text', answer: `No results for "${intent.title}".` });

//         const showtimes = await listShowtimesForMovieId(movie._id);
//         if (!showtimes.length) {
//           return res.json({ type: 'text', answer: `No upcoming showtimes for "${movie.title}".` });
//         }

//         const lines = showtimes.map(s => `• ${new Date(s.showDateTime).toLocaleString()}  (showId: ${s._id})`);
//         return res.json({
//           type: 'text',
//           answer: `Showtimes for "${movie.title}":\n${lines.join('\n')}\n\nTip: ask "seats for show <showId>" to check availability.`,
//         });
//       }

//       case 'SEATS_BY_SHOW': {
//         const show = await getOccupiedSeats(intent.showId);
//         if (!show) return res.json({ type: 'text', answer: 'Show not found.' });

//         const occupied = Object.keys(show.occupiedSeats || {});
//         const count = occupied.length;
//         const summary = count ? occupied.join(', ') : 'None';

//         return res.json({
//           type: 'seatInfo',
//           answer: `Occupied seats for show ${show._id} (${new Date(show.showDateTime).toLocaleString()}): ${summary}\nAll other seats are available.`,
//           occupiedSeats: occupied,
//           showId: show._id,
//         });
//       }

//       case 'SEATS_BY_TITLE': {
//         // Find next upcoming show for that movie
//         const movie = await findMovieByTitle(intent.title);
//         if (!movie) return res.json({ type: 'text', answer: `No results for "${intent.title}".` });

//         const show = await nextShowForTitle(movie._id);
//         if (!show) return res.json({ type: 'text', answer: `No upcoming shows for "${movie.title}".` });

//         const occupied = Object.keys(show.occupiedSeats || {});
//         const count = occupied.length;
//         const summary = count ? occupied.join(', ') : 'None';

//         return res.json({
//           type: 'seatInfo',
//           answer: `Occupied seats for "${movie.title}" (next show: ${new Date(show.showDateTime).toLocaleString()} – showId: ${show._id}): ${summary}\nAll other seats are available.`,
//           occupiedSeats: occupied,
//           showId: show._id,
//         });
//       }

//       case 'HELP': {
//         return res.json({
//           type: 'text',
//           answer:
// `I can help with:
// • "currently showing" – list movies & nearest showtimes
// • "info about <title>" – movie info + nearest show
// • "showtimes <title>" – all upcoming times
// • "seats for show <showId>" – seat availability
// • "seats for <title>" – next show's occupancy
// • Booking: open a movie card and click "Buy Ticket"`,
//         });
//       }

//       default:
//         return res.json({
//           type: 'text',
//           answer: `Try:
// • "currently showing"
// • "info about Inception"
// • "showtimes Avatar"
// • "seats for show <showId>"
// • "seats for Interstellar"`,
//         });
//     }
//   } catch (err) {
//     console.error('askQuestion error:', err);
//     return res.status(500).json({ type: 'error', answer: 'Server error while processing question.' });
//   }
// }

// import fetch from 'node-fetch';
// import { findMovieByTitle } from '../services/movieService.js';
// import { listUpcomingShows, listShowtimesForMovieId, nextShowForTitle, getOccupiedSeats } from '../services/showService.js';

// async function getIntentFromOpenRouter(question) {
//   const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
//     method: 'POST',
//     headers: {
//       'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
//       'Content-Type': 'application/json'
//     },
//     body: JSON.stringify({
//       model: 'openai/gpt-4o-mini',   // You can pick any model available
//       messages: [
//         {
//           role: 'system',
//           content: `You are an intent parser for a movie booking assistant.
// Output strictly in JSON with fields: type (LIST_MOVIES, MOVIE_INFO, SHOWTIMES, SEATS_BY_SHOW, SEATS_BY_TITLE, HELP), title (if any), showId (if any).`
//         },
//         { role: 'user', content: question }
//       ],
//       temperature: 0, // Make output deterministic
//     }),
//   });

//   const data = await response.json();
//   // Extract JSON from model output
//   let intent = {};
//   try {
//     intent = JSON.parse(data.choices[0].message.content);
//   } catch (e) {
//     console.error('OpenRouter parse error:', e.message);
//     intent = { type: 'HELP' };
//   }
//   return intent;
// }

// export async function askQuestion(req, res) {
//   try {
//     const { question } = req.body || {};
//     if (!question || typeof question !== 'string') {
//       return res.status(400).json({ type: 'error', answer: 'Please ask a valid question.' });
//     }

//     // --- New: use OpenRouter AI for intent parsing ---
//     const intent = await getIntentFromOpenRouter(question);

//     switch (intent.type) {
//       case 'LIST_MOVIES': {
//         const upcoming = await listUpcomingShows(10);
//         if (!upcoming.length) {
//           return res.json({ type: 'text', answer: 'No movies are currently showing.' });
//         }
//         const movies = upcoming.map(s => ({
//           id: s._id,
//           title: s.movie.title,
//           poster: s.movie.poster_path,
//           overview: s.movie.overview || 'No description available',
//           rating: s.movie.vote_average ?? 'N/A',
//           runtime: s.movie.runtime ?? 'N/A',
//           showDateTime: s.showDateTime,
//         }));
//         return res.json({ type: 'movies', answer: 'Here are the currently showing movies with showtimes:', movies });
//       }

//       case 'MOVIE_INFO': {
//         const movie = await findMovieByTitle(intent.title);
//         if (!movie) return res.json({ type: 'text', answer: `I couldn't find "${intent.title}".` });

//         const showtimes = await listShowtimesForMovieId(movie._id);
//         const nearest = showtimes[0];

//         return res.json({
//           type: 'movieInfo',
//           answer: `Here is the information for "${movie.title}":`,
//           movie: {
//             id: nearest?._id || null,
//             title: movie.title,
//             poster: movie.poster_path,
//             overview: movie.overview || 'No description available',
//             rating: movie.vote_average ?? 'N/A',
//             runtime: movie.runtime ?? 'N/A',
//             showDateTime: nearest?.showDateTime || null,
//           },
//           guide: nearest
//             ? `To book tickets:
// 1) Click "Buy Ticket".
// 2) Pick seats for the ${new Date(nearest.showDateTime).toLocaleString()} show.
// 3) Proceed to checkout and complete payment.`
//             : `No upcoming showtimes found. Check back later.`,
//         });
//       }

//       case 'SHOWTIMES': {
//         const movie = await findMovieByTitle(intent.title);
//         if (!movie) return res.json({ type: 'text', answer: `No results for "${intent.title}".` });

//         const showtimes = await listShowtimesForMovieId(movie._id);
//         if (!showtimes.length) {
//           return res.json({ type: 'text', answer: `No upcoming showtimes for "${movie.title}".` });
//         }

//         const lines = showtimes.map(s => `• ${new Date(s.showDateTime).toLocaleString()}  (showId: ${s._id})`);
//         return res.json({
//           type: 'text',
//           answer: `Showtimes for "${movie.title}":\n${lines.join('\n')}\n\nTip: ask "seats for show <showId>" to check availability.`,
//         });
//       }

//       case 'SEATS_BY_SHOW': {
//         const show = await getOccupiedSeats(intent.showId);
//         if (!show) return res.json({ type: 'text', answer: 'Show not found.' });

//         const occupied = Object.keys(show.occupiedSeats || {});
//         const summary = occupied.length ? occupied.join(', ') : 'None';

//         return res.json({
//           type: 'seatInfo',
//           answer: `Occupied seats for show ${show._id} (${new Date(show.showDateTime).toLocaleString()}): ${summary}\nAll other seats are available.`,
//           occupiedSeats: occupied,
//           showId: show._id,
//         });
//       }

//       case 'SEATS_BY_TITLE': {
//         const movie = await findMovieByTitle(intent.title);
//         if (!movie) return res.json({ type: 'text', answer: `No results for "${intent.title}".` });

//         const show = await nextShowForTitle(movie._id);
//         if (!show) return res.json({ type: 'text', answer: `No upcoming shows for "${movie.title}".` });

//         const occupied = Object.keys(show.occupiedSeats || {});
//         const summary = occupied.length ? occupied.join(', ') : 'None';

//         return res.json({
//           type: 'seatInfo',
//           answer: `Occupied seats for "${movie.title}" (next show: ${new Date(show.showDateTime).toLocaleString()} – showId: ${show._id}): ${summary}\nAll other seats are available.`,
//           occupiedSeats: occupied,
//           showId: show._id,
//         });
//       }

//       case 'HELP':
//       default:
//         return res.json({
//           type: 'text',
//           answer:
// `I can help with:
// • "currently showing" – list movies & nearest showtimes
// • "info about <title>" – movie info + nearest show
// • "showtimes <title>" – all upcoming times
// • "seats for show <showId>" – seat availability
// • "seats for <title>" – next show's occupancy
// • Booking: open a movie card and click "Buy Ticket"`,
//         });
//     }
//   } catch (err) {
//     console.error('askQuestion error:', err);
//     return res.status(500).json({ type: 'error', answer: 'Server error while processing question.' });
//   }
// }


// // controllers/chatController.js  (update/replace)
// import crypto from "crypto";
// import Movie from "../models/Movie.js";
// import Show from "../models/Show.js";
// import { findMovieByTitle } from "../services/movieService.js";
// import { listUpcomingShows, listShowtimesForMovieId, nextShowForTitle, getOccupiedSeats } from "../services/showService.js";

// // In-memory sessions: key -> { step, movieId, showId, seats }
// const bookingSessions = new Map();

// function makeSessionId() {
//   if (crypto && crypto.randomUUID) return crypto.randomUUID();
//   return Math.random().toString(36).slice(2, 12);
// }

// // Helper to parse seat list like "A1,A2" or "A1, A2"
// function parseSeatList(text) {
//   if (!text) return [];
//   return text
//     .split(",")
//     .map(s => s.trim().toUpperCase())
//     .filter(Boolean);
// }

// export async function askQuestion(req, res) {
//   try {
//     const { question, sessionId: incomingSessionId } = req.body || {};
//     if (!question || typeof question !== "string") {
//       return res.status(400).json({ type: "error", answer: "Please ask a valid question." });
//     }
//     const q = question.trim();

//     // Normalize incoming sessionId (client stores it)
//     const sessionId = incomingSessionId || null;
//     let session = sessionId ? bookingSessions.get(sessionId) : null;

//     // ------------- Booking flow detection -------------
//     // 1) Start booking: "book ticket for <title>" or "book <title>"
//     const bookMatch = q.match(/book(?:\s+ticket)?(?:\s+for)?\s+(.+)/i);
//     if (bookMatch) {
//       const title = bookMatch[1].trim();
//       const movie = await findMovieByTitle(title);
//       if (!movie) {
//         return res.json({ type: "text", answer: `I couldn't find a movie named "${title}". Try typing the exact title.` });
//       }

//       // Find showtimes
//       const showtimes = await listShowtimesForMovieId(movie._id);
//       if (!showtimes.length) {
//         return res.json({ type: "text", answer: `No upcoming shows found for "${movie.title}".` });
//       }

//       // Create new session
//       const newId = makeSessionId();
//       bookingSessions.set(newId, { step: "awaiting_show", movieId: movie._id.toString() });

//       // Build message listing showtimes and showIds
//       const lines = showtimes.map(s => `• ${new Date(s.showDateTime).toLocaleString()}  (showId: ${s._id})`);
//       return res.json({
//         type: "text",
//         sessionId: newId,
//         answer:
// `Booking flow started for "${movie.title}".
// Here are upcoming shows:
// ${lines.join("\n")}

// Reply in chat with:
// - "show <showId>"  (to pick the show)
// or
// - "cancel"  (to abort)
// `,
//       });
//     }

//     // 2) If user selects a show: "show <showId>"
//     const showSelectMatch = q.match(/^show\s+([a-fA-F0-9]{24}|[A-Za-z0-9_-]+)$/i);
//     if (showSelectMatch) {
//       // require session or allow stateless selection (so showId can be used without session)
//       const showId = showSelectMatch[1];
//       const show = await Show.findById(showId).lean();
//       if (!show) return res.json({ type: "text", answer: `Show ${showId} not found.` });

//       // Establish or update session
//       const sid = sessionId || makeSessionId();
//       bookingSessions.set(sid, { step: "awaiting_seats", movieId: show.movie?.toString(), showId: show._id.toString() });

//       const occupied = Object.keys(show.occupiedSeats || {});
//       const occStr = occupied.length ? occupied.join(", ") : "None";

//       return res.json({
//         type: "text",
//         sessionId: sid,
//         answer:
// `Selected show: ${new Date(show.showDateTime).toLocaleString()}.
// Occupied seats: ${occStr}
// Please reply with seats you'd like (comma-separated), for example: A1,A2
// (Reply "cancel" to stop.)`,
//       });
//     }

//     // 3) If session expects seats and user provides seat list (session must exist)
//     if (session && session.step === "awaiting_seats") {
//       // parse seats from message
//       const requestedSeats = parseSeatList(q);
//       if (!requestedSeats.length) {
//         return res.json({ type: "text", answer: 'Please list seats as comma-separated values, e.g. "A1,A2".', sessionId: sessionId });
//       }

//       // Load show
//       const show = await Show.findById(session.showId).lean();
//       if (!show) {
//         bookingSessions.delete(sessionId);
//         return res.json({ type: "text", answer: "Show no longer exists. Booking aborted." });
//       }

//       // Check availability
//       const occupied = show.occupiedSeats || {};
//       const taken = requestedSeats.filter(s => occupied[s]);
//       if (taken.length) {
//         return res.json({
//           type: "text",
//           sessionId,
//           answer: `Sorry — these seats are already taken: ${taken.join(", ")}. Please pick different seats.`,
//         });
//       }

//       // Seats available — prepare booking url (frontend booking page will handle payment & auth)
//       const origin = req.get("origin") || process.env.FRONTEND_URL || ""; // expected to be set in env or request
//       const seatsParam = encodeURIComponent(requestedSeats.join(","));
//       const bookingUrl = origin ? `${origin.replace(/\/$/, "")}/booking/${show._id}?seats=${seatsParam}` : `/booking/${show._id}?seats=${seatsParam}`;

//       // Update session to awaiting_confirmation
//       bookingSessions.set(sessionId, { ...session, step: "awaiting_confirmation", seats: requestedSeats });

//       return res.json({
//         type: "bookingStep",
//         sessionId,
//         showId: show._id,
//         seats: requestedSeats,
//         answer:
// `Great — the seats ${requestedSeats.join(", ")} are available for the ${new Date(show.showDateTime).toLocaleString()} show.
// To complete booking & payment, open this secure booking page and finish checkout:
// ${bookingUrl}

// If you want me to keep these seats reserved, note that the booking page will lock them at checkout. Reply "confirm" once you've completed payment, or "cancel" to abort.`,
//         bookingUrl,
//       });
//     }

//     // 4) Confirm / cancel within session
//     if (session && session.step === "awaiting_confirmation") {
//       if (/^cancel$/i.test(q)) {
//         bookingSessions.delete(incomingSessionId);
//         return res.json({ type: "text", sessionId: incomingSessionId, answer: "Booking flow cancelled." });
//       }

//       if (/^confirm$/i.test(q) || /done|completed|paid/i.test(q)) {
//         // We can't verify payment in chat (Stripe/Inngest will notify server). So we simply acknowledge.
//         bookingSessions.delete(incomingSessionId);
//         return res.json({ type: "text", answer: "Thanks — if payment succeeded your booking will appear in My Bookings. If not, open the booking page and retry." });
//       }

//       // Not confirm/cancel — guide
//       return res.json({ type: "text", sessionId: incomingSessionId, answer: 'Please reply "confirm" after completing payment, or "cancel" to abort.' });
//     }

//     // 5) User asked simple seat availability without booking flow:
//     if (/seat availability|available seats|seats for show/i.test(q)) {
//       // Try to extract showId or title
//       const showIdMatch = q.match(/show\s+([a-fA-F0-9]{24}|[A-Za-z0-9_-]+)/i);
//       if (showIdMatch) {
//         const show = await Show.findById(showIdMatch[1]).lean();
//         if (!show) return res.json({ type: "text", answer: "Show not found." });
//         const occupied = Object.keys(show.occupiedSeats || {});
//         return res.json({ type: "seatInfo", answer: `Occupied seats for show ${show._id}: ${occupied.length ? occupied.join(", ") : "None"}`, occupiedSeats: occupied, showId: show._id });
//       }

//       // Try title
//       const titleMatch = q.match(/seats for\s+(.+)/i);
//       if (titleMatch) {
//         const title = titleMatch[1].trim();
//         const movie = await findMovieByTitle(title);
//         if (!movie) return res.json({ type: "text", answer: `No movie found for "${title}".` });
//         const show = await nextShowForTitle(movie._id);
//         if (!show) return res.json({ type: "text", answer: `No upcoming shows for "${movie.title}".` });
//         const occupied = Object.keys(show.occupiedSeats || {});
//         return res.json({ type: "seatInfo", answer: `Occupied seats for "${movie.title}" (next show - showId: ${show._id}): ${occupied.length ? occupied.join(", ") : "None"}`, occupiedSeats: occupied, showId: show._id });
//       }

//       return res.json({ type: "text", answer: 'To check seat availability say "seats for <movie title>" or "seats for show <showId>".' });
//     }

//     // ---------------- Existing non-booking intents ----------------
//     // Keep the rest of your existing intent logic (LIST_MOVIES, MOVIE_INFO, SHOWTIMES, HELP)
//     // For brevity, we tie into the functions you already use:
//     // (If you use OpenRouter intent parsing, you can integrate that here as well.)

//     // LIST_MOVIES
//     if (/currently showing|now playing|what movies|movies\b/i.test(q)) {
//       const upcoming = await listUpcomingShows(10);
//       if (!upcoming.length) return res.json({ type: "text", answer: "No movies are currently showing." });

//       // Build movie list — **no Buy Ticket button**
//       const movies = upcoming.map(s => ({
//         id: s._id,
//         title: s.movie.title,
//         poster: s.movie.poster_path,
//         overview: s.movie.overview || "No description available",
//         rating: s.movie.vote_average ?? "N/A",
//         runtime: s.movie.runtime ?? "N/A",
//         showDateTime: s.showDateTime,
//       }));

//       return res.json({
//         type: "movies",
//         answer: `Here are the currently showing movies with showtimes. To start booking for a movie type: "book ticket for <movie title>". To pick a show directly reply "show <showId>".`,
//         movies,
//       });
//     }

//     // MOVIE_INFO
//     const infoMatch = q.match(/\b(info|details)\s+about\s+(.+)/i);
//     if (infoMatch) {
//       const title = infoMatch[2].trim();
//       const movie = await findMovieByTitle(title);
//       if (!movie) return res.json({ type: "text", answer: `I couldn't find "${title}".` });

//       const showtimes = await listShowtimesForMovieId(movie._id);
//       const nearest = showtimes[0];

//       return res.json({
//         type: "movieInfo",
//         answer: `Here is the information for "${movie.title}". To book, type "book ticket for ${movie.title}".`,
//         movie: {
//           id: nearest?._id || null,
//           title: movie.title,
//           poster: movie.poster_path,
//           overview: movie.overview || "No description available",
//           rating: movie.vote_average ?? "N/A",
//           runtime: movie.runtime ?? "N/A",
//           showDateTime: nearest?.showDateTime || null,
//         },
//         guide: nearest
//           ? `Next show: ${new Date(nearest.showDateTime).toLocaleString()} (showId: ${nearest._id}). To pick this show reply "show ${nearest._id}".`
//           : `No upcoming showtimes found.`,
//       });
//     }

//     // SHOWTIMES
//     const showtimesMatch = q.match(/\b(showtimes?|showtime)\s+(.+)/i);
//     if (showtimesMatch) {
//       const title = showtimesMatch[2].trim();
//       const movie = await findMovieByTitle(title);
//       if (!movie) return res.json({ type: "text", answer: `No results for "${title}".` });

//       const showtimes = await listShowtimesForMovieId(movie._id);
//       if (!showtimes.length) return res.json({ type: "text", answer: `No upcoming showtimes for "${movie.title}".` });

//       const lines = showtimes.map(s => `• ${new Date(s.showDateTime).toLocaleString()}  (showId: ${s._id})`);
//       return res.json({ type: "text", answer: `Showtimes for "${movie.title}":\n${lines.join("\n")}\n\nTip: reply "show <showId>" to start booking for a specific show.` });
//     }

//     // HELP / fallback
//     return res.json({
//       type: "text",
//       answer:
// `I can help with:
// • "currently showing" – list movies & nearest showtimes
// • "info about <title>" – movie info + nearest show
// • "showtimes <title>" – all upcoming times
// • "seats for show <showId>" – seat availability
// • "book ticket for <title>" – start booking flow (chat-driven)
// `,
//     });

//   } catch (err) {
//     console.error("askQuestion error:", err);
//     return res.status(500).json({ type: "error", answer: "Server error while processing question." });
//   }
// }


import crypto from "crypto";
import Movie from "../models/Movie.js";
import Show from "../models/Show.js";
import { findMovieByTitle } from "../services/movieService.js"; // Assuming findMovieByTitle exists
import {
  listUpcomingShows,
  listShowtimesForMovieId,
  nextShowForTitle,
  getOccupiedSeats,
} from "../services/showService.js"; // Assuming these service functions exist

// --- Intent Parser ---
const patterns = {
  LIST_MOVIES: /(now\s*playing|currently\s*showing|what\s*movies|movies\b)/i,
  MOVIE_INFO: /\b(info|details)\s+about\s+(.+)/i,
  SHOWTIMES: /\b(show\s*times?|showtime|when\s+is)\s+(.+)/i,
  SEATS_BY_SHOW: /\b(seats?|seat\s*availability).*(show)\s+([a-f\d]{24}|[A-Za-z0-9_-]+)/i,
  SEATS_BY_TITLE: /\b(seats?|seat\s*availability)\b(?:.*?\s+for\s+)?(.+)/i, // Updated pattern
  HELP: /\b(help|how|guide|book|booking)\b/i,
  // New pattern to start the booking flow
  BOOK_TICKET: /book(?:\s+ticket)?(?:\s+for)?\s+(.+)/i,
};

function parseIntent(question) {
  const q = (question || "").trim();

  // Booking intent must be checked first to prioritize it
  const bookMatch = q.match(patterns.BOOK_TICKET);
  if (bookMatch) return { type: "BOOK_TICKET", title: bookMatch[1].trim() };

  const info = q.match(patterns.MOVIE_INFO);
  if (info) return { type: "MOVIE_INFO", title: info[2].trim() };

  const times = q.match(patterns.SHOWTIMES);
  if (times) return { type: "SHOWTIMES", title: times[2].trim() };

  const seatsShow = q.match(patterns.SEATS_BY_SHOW);
  if (seatsShow) return { type: "SEATS_BY_SHOW", showId: seatsShow[3] };

  const seatsTitle = q.match(patterns.SEATS_BY_TITLE);
  if (seatsTitle) return { type: "SEATS_BY_TITLE", title: seatsTitle[2].trim() };

  if (patterns.LIST_MOVIES.test(q)) return { type: "LIST_MOVIES" };

  if (patterns.HELP.test(q)) return { type: "HELP" };

  return { type: "UNKNOWN" };
}

// --- In-memory sessions ---
const bookingSessions = new Map();

function makeSessionId() {
  if (crypto && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2, 12);
}

function parseSeatList(text) {
  if (!text) return [];
  return text.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
}

// --- Main Chatbot Logic ---
export async function askQuestion(req, res) {
  try {
    const { question, sessionId: incomingSessionId } = req.body || {};
    if (!question || typeof question !== "string") {
      return res.status(400).json({ type: "error", answer: "Please ask a valid question." });
    }
    const q = question.trim();

    const sessionId = incomingSessionId || null;
    let session = sessionId ? bookingSessions.get(sessionId) : null;

    // --- Handle ongoing booking flow first (highest priority) ---
    // If a session exists and expects seats
    if (session && session.step === "awaiting_seats") {
      const requestedSeats = parseSeatList(q);
      if (!requestedSeats.length) {
        return res.json({ type: "text", answer: 'Please list seats as comma-separated values, e.g. "A1,A2".', sessionId: sessionId });
      }
      const show = await Show.findById(session.showId).lean();
      if (!show) {
        bookingSessions.delete(sessionId);
        return res.json({ type: "text", answer: "Show no longer exists. Booking aborted." });
      }
      const occupied = show.occupiedSeats || {};
      const taken = requestedSeats.filter((s) => occupied[s]);
      if (taken.length) {
        return res.json({
          type: "text",
          sessionId,
          answer: `Sorry — these seats are already taken: ${taken.join(", ")}. Please pick different seats.`,
        });
      }
      const origin = req.get("origin") || process.env.FRONTEND_URL || "";
      const seatsParam = encodeURIComponent(requestedSeats.join(","));
      const bookingUrl = origin ? `${origin.replace(/\/$/, "")}/booking/${show._id}?seats=${seatsParam}` : `/booking/${show._id}?seats=${seatsParam}`;
      bookingSessions.set(sessionId, { ...session, step: "awaiting_confirmation", seats: requestedSeats });
      return res.json({
        type: "bookingStep",
        sessionId,
        showId: show._id,
        seats: requestedSeats,
        answer: `Great — the seats ${requestedSeats.join(", ")} are available for the ${new Date(show.showDateTime).toLocaleString()} show. To complete booking & payment, open this secure booking page and finish checkout: ${bookingUrl}\n\nReply "confirm" once you've completed payment, or "cancel" to abort.`,
        bookingUrl,
      });
    }

    // If session expects confirmation
    if (session && session.step === "awaiting_confirmation") {
      if (/^cancel$/i.test(q)) {
        bookingSessions.delete(incomingSessionId);
        return res.json({ type: "text", sessionId: incomingSessionId, answer: "Booking flow cancelled." });
      }
      if (/^confirm$/i.test(q) || /done|completed|paid/i.test(q)) {
        bookingSessions.delete(incomingSessionId);
        return res.json({ type: "text", answer: "Thanks — if payment succeeded your booking will appear in My Bookings. If not, open the booking page and retry." });
      }
      return res.json({ type: "text", sessionId: incomingSessionId, answer: 'Please reply "confirm" after completing payment, or "cancel" to abort.' });
    }

    // --- No active session, parse new intent ---
    const intent = parseIntent(q);

    switch (intent.type) {
      case "BOOK_TICKET":
        const movieToBook = await findMovieByTitle(intent.title);
        if (!movieToBook) {
          return res.json({ type: "text", answer: `I couldn't find a movie named "${intent.title}". Try typing the exact title.` });
        }
        const showtimesForBook = await listShowtimesForMovieId(movieToBook._id);
        if (!showtimesForBook.length) {
          return res.json({ type: "text", answer: `No upcoming shows found for "${movieToBook.title}".` });
        }
        const newId = makeSessionId();
        bookingSessions.set(newId, { step: "awaiting_show", movieId: movieToBook._id.toString() });
        const lines = showtimesForBook.map((s) => `• ${new Date(s.showDateTime).toLocaleString()} (showId: ${s._id})`);
        return res.json({
          type: "text",
          sessionId: newId,
          answer: `Booking flow started for "${movieToBook.title}". Here are upcoming shows:\n${lines.join("\n")}\n\nReply in chat with: "show <showId>" (to pick the show) or "cancel" (to abort)`,
        });

      case "SEATS_BY_TITLE":
        const movieByTitle = await findMovieByTitle(intent.title);
        if (!movieByTitle) {
          return res.json({ type: "text", answer: `I couldn't find a movie named "${intent.title}".` });
        }
        const showByTitle = await nextShowForTitle(movieByTitle._id);
        if (!showByTitle) {
          return res.json({ type: "text", answer: `No upcoming shows for "${movieByTitle.title}".` });
        }
        const occupiedByTitle = Object.keys(showByTitle.occupiedSeats || {});
        return res.json({
          type: "seatInfo",
          answer: `Occupied seats for "${movieByTitle.title}" (next show - showId: ${showByTitle._id}): ${occupiedByTitle.length ? occupiedByTitle.join(", ") : "None"}`,
          occupiedSeats: occupiedByTitle,
          showId: showByTitle._id,
        });

      case "SEATS_BY_SHOW":
        const showById = await getOccupiedSeats(intent.showId);
        if (!showById) {
          return res.json({ type: "text", answer: "Show not found." });
        }
        const occupiedById = Object.keys(showById.occupiedSeats || {});
        return res.json({
          type: "seatInfo",
          answer: `Occupied seats for show ${intent.showId}: ${occupiedById.length ? occupiedById.join(", ") : "None"}`,
          occupiedSeats: occupiedById,
          showId: intent.showId,
        });

      case "LIST_MOVIES":
        const upcoming = await listUpcomingShows(10);
        if (!upcoming.length) return res.json({ type: "text", answer: "No movies are currently showing." });
        const movies = upcoming.map((s) => ({
          id: s._id,
          title: s.movie.title,
          poster: s.movie.poster_path,
          overview: s.movie.overview || "No description available",
          rating: s.movie.vote_average ?? "N/A",
          runtime: s.movie.runtime ?? "N/A",
          showDateTime: s.showDateTime,
        }));
        return res.json({
          type: "movies",
          answer: `Here are the currently showing movies with showtimes. To start booking for a movie type: "book ticket for <movie title>".`,
          movies,
        });

      case "MOVIE_INFO":
        const movieInfo = await findMovieByTitle(intent.title);
        if (!movieInfo) return res.json({ type: "text", answer: `I couldn't find "${intent.title}".` });
        const showtimesForInfo = await listShowtimesForMovieId(movieInfo._id);
        const nearest = showtimesForInfo[0];
        return res.json({
          type: "movieInfo",
          answer: `Here is the information for "${movieInfo.title}". To book, type "book ticket for ${movieInfo.title}".`,
          movie: {
            id: nearest?._id || null,
            title: movieInfo.title,
            poster: movieInfo.poster_path,
            overview: movieInfo.overview || "No description available",
            rating: movieInfo.vote_average ?? "N/A",
            runtime: movieInfo.runtime ?? "N/A",
            showDateTime: nearest?.showDateTime || null,
          },
          guide: nearest
            ? `Next show: ${new Date(nearest.showDateTime).toLocaleString()} (showId: ${nearest._id}). To pick this show reply "show ${nearest._id}".`
            : `No upcoming showtimes found.`,
        });

      case "SHOWTIMES":
        const showtimesMovie = await findMovieByTitle(intent.title);
        if (!showtimesMovie) return res.json({ type: "text", answer: `No results for "${intent.title}".` });
        const showtimes = await listShowtimesForMovieId(showtimesMovie._id);
        if (!showtimes.length) return res.json({ type: "text", answer: `No upcoming showtimes for "${showtimesMovie.title}".` });
        const timesLines = showtimes.map((s) => `• ${new Date(s.showDateTime).toLocaleString()} (showId: ${s._id})`);
        return res.json({ type: "text", answer: `Showtimes for "${showtimesMovie.title}":\n${timesLines.join("\n")}\n\nTip: reply "show <showId>" to start booking for a specific show.` });

      case "HELP":
        return res.json({
          type: "text",
          answer: `I can help with:\n• "currently showing" – list movies & nearest showtimes\n• "info about <title>" – movie info + nearest show\n• "showtimes <title>" – all upcoming times\n• "seats for <movie title>" – seat availability for the next show\n• "seats for show <showId>" – seat availability for a specific show\n• "book ticket for <title>" – start booking flow (chat-driven)`,
        });

      case "UNKNOWN":
      default:
        // No intent matched, but check for the specific "show <showId>" command
        const showSelectMatch = q.match(/^show\s+([a-fA-F0-9]{24}|[A-Za-z0-9_-]+)$/i);
        if (showSelectMatch) {
          const showId = showSelectMatch[1];
          const show = await Show.findById(showId).lean();
          if (!show) return res.json({ type: "text", answer: `Show ${showId} not found.` });
          const sid = sessionId || makeSessionId();
          bookingSessions.set(sid, { step: "awaiting_seats", movieId: show.movie?.toString(), showId: show._id.toString() });
          const occupied = Object.keys(show.occupiedSeats || {});
          const occStr = occupied.length ? occupied.join(", ") : "None";
          return res.json({
            type: "text",
            sessionId: sid,
            answer: `Selected show: ${new Date(show.showDateTime).toLocaleString()}. Occupied seats: ${occStr}\nPlease reply with seats you'd like (comma-separated), for example: A1,A2\n(Reply "cancel" to stop.)`,
          });
        }
        return res.json({
          type: "text",
          answer: `I don't understand that. You can ask for help by typing "help".`,
        });
    }
  } catch (err) {
    console.error("askQuestion error:", err);
    return res.status(500).json({ type: "error", answer: "Server error while processing question." });
  }
}