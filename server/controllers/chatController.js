// import crypto from "crypto";
// import Movie from "../models/Movie.js";
// import Show from "../models/Show.js";
// import { findMovieByTitle } from "../services/movieService.js"; // Assuming findMovieByTitle exists
// import {
//   listUpcomingShows,
//   listShowtimesForMovieId,
//   nextShowForTitle,
//   getOccupiedSeats,
// } from "../services/showService.js"; // Assuming these service functions exist

// // --- Intent Parser ---
// const patterns = {
//   LIST_MOVIES: /(now\s*playing|currently\s*showing|what\s*movies|movies\b)/i,
//   MOVIE_INFO: /\b(info|details)\s+about\s+(.+)/i,
//   SHOWTIMES: /\b(show\s*times?|showtime|when\s+is)\s+(.+)/i,
//   SEATS_BY_SHOW: /\b(seats?|seat\s*availability).*(show)\s+([a-f\d]{24}|[A-Za-z0-9_-]+)/i,
//   SEATS_BY_TITLE: /\b(seats?|seat\s*availability)\b(?:.*?\s+for\s+)?(.+)/i, // Updated pattern
//   HELP: /\b(help|how|guide|book|booking)\b/i,
//   // New pattern to start the booking flow
//   BOOK_TICKET: /book(?:\s+ticket)?(?:\s+for)?\s+(.+)/i,
// };

// function parseIntent(question) {
//   const q = (question || "").trim();

//   // Booking intent must be checked first to prioritize it
//   const bookMatch = q.match(patterns.BOOK_TICKET);
//   if (bookMatch) return { type: "BOOK_TICKET", title: bookMatch[1].trim() };

//   const info = q.match(patterns.MOVIE_INFO);
//   if (info) return { type: "MOVIE_INFO", title: info[2].trim() };

//   const times = q.match(patterns.SHOWTIMES);
//   if (times) return { type: "SHOWTIMES", title: times[2].trim() };

//   const seatsShow = q.match(patterns.SEATS_BY_SHOW);
//   if (seatsShow) return { type: "SEATS_BY_SHOW", showId: seatsShow[3] };

//   const seatsTitle = q.match(patterns.SEATS_BY_TITLE);
//   if (seatsTitle) return { type: "SEATS_BY_TITLE", title: seatsTitle[2].trim() };

//   if (patterns.LIST_MOVIES.test(q)) return { type: "LIST_MOVIES" };

//   if (patterns.HELP.test(q)) return { type: "HELP" };

//   return { type: "UNKNOWN" };
// }

// // --- In-memory sessions ---
// const bookingSessions = new Map();

// function makeSessionId() {
//   if (crypto && crypto.randomUUID) return crypto.randomUUID();
//   return Math.random().toString(36).slice(2, 12);
// }

// function parseSeatList(text) {
//   if (!text) return [];
//   return text.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
// }

// // --- Main Chatbot Logic ---
// export async function askQuestion(req, res) {
//   try {
//     const { question, sessionId: incomingSessionId } = req.body || {};
//     if (!question || typeof question !== "string") {
//       return res.status(400).json({ type: "error", answer: "Please ask a valid question." });
//     }
//     const q = question.trim();

//     const sessionId = incomingSessionId || null;
//     let session = sessionId ? bookingSessions.get(sessionId) : null;

//     // --- Handle ongoing booking flow first (highest priority) ---
//     // If a session exists and expects seats
//     if (session && session.step === "awaiting_seats") {
//       const requestedSeats = parseSeatList(q);
//       if (!requestedSeats.length) {
//         return res.json({ type: "text", answer: 'Please list seats as comma-separated values, e.g. "A1,A2".', sessionId: sessionId });
//       }
//       const show = await Show.findById(session.showId).lean();
//       if (!show) {
//         bookingSessions.delete(sessionId);
//         return res.json({ type: "text", answer: "Show no longer exists. Booking aborted." });
//       }
//       const occupied = show.occupiedSeats || {};
//       const taken = requestedSeats.filter((s) => occupied[s]);
//       if (taken.length) {
//         return res.json({
//           type: "text",
//           sessionId,
//           answer: `Sorry — these seats are already taken: ${taken.join(", ")}. Please pick different seats.`,
//         });
//       }
//       const origin = req.get("origin") || process.env.FRONTEND_URL || "";
//       const seatsParam = encodeURIComponent(requestedSeats.join(","));
//       const bookingUrl = origin ? `${origin.replace(/\/$/, "")}/booking/${show._id}?seats=${seatsParam}` : `/booking/${show._id}?seats=${seatsParam}`;
//       bookingSessions.set(sessionId, { ...session, step: "awaiting_confirmation", seats: requestedSeats });
//       return res.json({
//         type: "bookingStep",
//         sessionId,
//         showId: show._id,
//         seats: requestedSeats,
//         answer: `Great — the seats ${requestedSeats.join(", ")} are available for the ${new Date(show.showDateTime).toLocaleString()} show. To complete booking & payment, open this secure booking page and finish checkout: ${bookingUrl}\n\nReply "confirm" once you've completed payment, or "cancel" to abort.`,
//         bookingUrl,
//       });
//     }

//     // If session expects confirmation
//     if (session && session.step === "awaiting_confirmation") {
//       if (/^cancel$/i.test(q)) {
//         bookingSessions.delete(incomingSessionId);
//         return res.json({ type: "text", sessionId: incomingSessionId, answer: "Booking flow cancelled." });
//       }
//       if (/^confirm$/i.test(q) || /done|completed|paid/i.test(q)) {
//         bookingSessions.delete(incomingSessionId);
//         return res.json({ type: "text", answer: "Thanks — if payment succeeded your booking will appear in My Bookings. If not, open the booking page and retry." });
//       }
//       return res.json({ type: "text", sessionId: incomingSessionId, answer: 'Please reply "confirm" after completing payment, or "cancel" to abort.' });
//     }

//     // --- No active session, parse new intent ---
//     const intent = parseIntent(q);

//     switch (intent.type) {
//       case "BOOK_TICKET":
//         const movieToBook = await findMovieByTitle(intent.title);
//         if (!movieToBook) {
//           return res.json({ type: "text", answer: `I couldn't find a movie named "${intent.title}". Try typing the exact title.` });
//         }
//         const showtimesForBook = await listShowtimesForMovieId(movieToBook._id);
//         if (!showtimesForBook.length) {
//           return res.json({ type: "text", answer: `No upcoming shows found for "${movieToBook.title}".` });
//         }
//         const newId = makeSessionId();
//         bookingSessions.set(newId, { step: "awaiting_show", movieId: movieToBook._id.toString() });
//         const lines = showtimesForBook.map((s) => `• ${new Date(s.showDateTime).toLocaleString()} (showId: ${s._id})`);
//         return res.json({
//           type: "text",
//           sessionId: newId,
//           answer: `Booking flow started for "${movieToBook.title}". Here are upcoming shows:\n${lines.join("\n")}\n\nReply in chat with: "show <showId>" (to pick the show) or "cancel" (to abort)`,
//         });

//       case "SEATS_BY_TITLE":
//         const movieByTitle = await findMovieByTitle(intent.title);
//         if (!movieByTitle) {
//           return res.json({ type: "text", answer: `I couldn't find a movie named "${intent.title}".` });
//         }
//         const showByTitle = await nextShowForTitle(movieByTitle._id);
//         if (!showByTitle) {
//           return res.json({ type: "text", answer: `No upcoming shows for "${movieByTitle.title}".` });
//         }
//         const occupiedByTitle = Object.keys(showByTitle.occupiedSeats || {});
//         return res.json({
//           type: "seatInfo",
//           answer: `Occupied seats for "${movieByTitle.title}" (next show - showId: ${showByTitle._id}): ${occupiedByTitle.length ? occupiedByTitle.join(", ") : "None"}`,
//           occupiedSeats: occupiedByTitle,
//           showId: showByTitle._id,
//         });

//       case "SEATS_BY_SHOW":
//         const showById = await getOccupiedSeats(intent.showId);
//         if (!showById) {
//           return res.json({ type: "text", answer: "Show not found." });
//         }
//         const occupiedById = Object.keys(showById.occupiedSeats || {});
//         return res.json({
//           type: "seatInfo",
//           answer: `Occupied seats for show ${intent.showId}: ${occupiedById.length ? occupiedById.join(", ") : "None"}`,
//           occupiedSeats: occupiedById,
//           showId: intent.showId,
//         });

//       case "LIST_MOVIES":
//         const upcoming = await listUpcomingShows(10);
//         if (!upcoming.length) return res.json({ type: "text", answer: "No movies are currently showing." });
//         const movies = upcoming.map((s) => ({
//           id: s._id,
//           title: s.movie.title,
//           poster: s.movie.poster_path,
//           overview: s.movie.overview || "No description available",
//           rating: s.movie.vote_average ?? "N/A",
//           runtime: s.movie.runtime ?? "N/A",
//           showDateTime: s.showDateTime,
//         }));
//         return res.json({
//           type: "movies",
//           answer: `Here are the currently showing movies with showtimes. To start booking for a movie type: "book ticket for <movie title>".`,
//           movies,
//         });

//       case "MOVIE_INFO":
//         const movieInfo = await findMovieByTitle(intent.title);
//         if (!movieInfo) return res.json({ type: "text", answer: `I couldn't find "${intent.title}".` });
//         const showtimesForInfo = await listShowtimesForMovieId(movieInfo._id);
//         const nearest = showtimesForInfo[0];
//         return res.json({
//           type: "movieInfo",
//           answer: `Here is the information for "${movieInfo.title}". To book, type "book ticket for ${movieInfo.title}".`,
//           movie: {
//             id: nearest?._id || null,
//             title: movieInfo.title,
//             poster: movieInfo.poster_path,
//             overview: movieInfo.overview || "No description available",
//             rating: movieInfo.vote_average ?? "N/A",
//             runtime: movieInfo.runtime ?? "N/A",
//             showDateTime: nearest?.showDateTime || null,
//           },
//           guide: nearest
//             ? `Next show: ${new Date(nearest.showDateTime).toLocaleString()} (showId: ${nearest._id}). To pick this show reply "show ${nearest._id}".`
//             : `No upcoming showtimes found.`,
//         });

//       case "SHOWTIMES":
//         const showtimesMovie = await findMovieByTitle(intent.title);
//         if (!showtimesMovie) return res.json({ type: "text", answer: `No results for "${intent.title}".` });
//         const showtimes = await listShowtimesForMovieId(showtimesMovie._id);
//         if (!showtimes.length) return res.json({ type: "text", answer: `No upcoming showtimes for "${showtimesMovie.title}".` });
//         const timesLines = showtimes.map((s) => `• ${new Date(s.showDateTime).toLocaleString()} (showId: ${s._id})`);
//         return res.json({ type: "text", answer: `Showtimes for "${showtimesMovie.title}":\n${timesLines.join("\n")}\n\nTip: reply "show <showId>" to start booking for a specific show.` });

//       case "HELP":
//         return res.json({
//           type: "text",
//           answer: `I can help with:\n• "currently showing" – list movies & nearest showtimes\n• "info about <title>" – movie info + nearest show\n• "showtimes <title>" – all upcoming times\n• "seats for <movie title>" – seat availability for the next show\n• "seats for show <showId>" – seat availability for a specific show\n• "book ticket for <title>" – start booking flow (chat-driven)`,
//         });

//       case "UNKNOWN":
//       default:
//         // No intent matched, but check for the specific "show <showId>" command
//         const showSelectMatch = q.match(/^show\s+([a-fA-F0-9]{24}|[A-Za-z0-9_-]+)$/i);
//         if (showSelectMatch) {
//           const showId = showSelectMatch[1];
//           const show = await Show.findById(showId).lean();
//           if (!show) return res.json({ type: "text", answer: `Show ${showId} not found.` });
//           const sid = sessionId || makeSessionId();
//           bookingSessions.set(sid, { step: "awaiting_seats", movieId: show.movie?.toString(), showId: show._id.toString() });
//           const occupied = Object.keys(show.occupiedSeats || {});
//           const occStr = occupied.length ? occupied.join(", ") : "None";
//           return res.json({
//             type: "text",
//             sessionId: sid,
//             answer: `Selected show: ${new Date(show.showDateTime).toLocaleString()}. Occupied seats: ${occStr}\nPlease reply with seats you'd like (comma-separated), for example: A1,A2\n(Reply "cancel" to stop.)`,
//           });
//         }
//         return res.json({
//           type: "text",
//           answer: `I don't understand that. You can ask for help by typing "help".`,
//         });
//     }
//   } catch (err) {
//     console.error("askQuestion error:", err);
//     return res.status(500).json({ type: "error", answer: "Server error while processing question." });
//   }
// }

// import crypto from "crypto";
// import Movie from "../models/Movie.js";
// import Show from "../models/Show.js";
// import { findMovieByTitle } from "../services/movieService.js";
// import {
//   listUpcomingShows,
//   listShowtimesForMovieId,
//   nextShowForTitle,
//   getOccupiedSeats,
// } from "../services/showService.js";

// // --- Intent Parser ---
// const patterns = {
//   LIST_MOVIES: /(now\s*playing|currently\s*showing|what\s*movies|movies\b)/i,
//   MOVIE_INFO: /\b(info|details)\s+about\s+(.+)/i,
//   SHOWTIMES: /\b(show\s*times?|showtime|when\s+is)\s+(.+)/i,
//   SEATS_BY_SHOW: /\b(seats?|seat\s*availability).*(show)\s+([a-f\d]{24}|[A-Za-z0-9_-]+)/i,
//   SEATS_BY_TITLE: /\b(seats?|seat\s*availability)\b(?:.*?\s+for\s+)?(.+)/i,
//   HELP: /\b(help|how|guide|book|booking)\b/i,
// };

// function parseIntent(question) {
//   const q = (question || "").trim();

//   const info = q.match(patterns.MOVIE_INFO);
//   if (info) return { type: "MOVIE_INFO", title: info[2].trim() };

//   const times = q.match(patterns.SHOWTIMES);
//   if (times) return { type: "SHOWTIMES", title: times[2].trim() };

//   const seatsShow = q.match(patterns.SEATS_BY_SHOW);
//   if (seatsShow) return { type: "SEATS_BY_SHOW", showId: seatsShow[3] };

//   const seatsTitle = q.match(patterns.SEATS_BY_TITLE);
//   if (seatsTitle) return { type: "SEATS_BY_TITLE", title: seatsTitle[2].trim() };

//   if (patterns.LIST_MOVIES.test(q)) return { type: "LIST_MOVIES" };

//   if (patterns.HELP.test(q)) return { type: "HELP" };

//   return { type: "UNKNOWN" };
// }

// // --- Main Chatbot Logic ---
// export async function askQuestion(req, res) {
//   try {
//     const { question } = req.body || {};
//     if (!question || typeof question !== "string") {
//       return res.status(400).json({ type: "error", answer: "Please ask a valid question." });
//     }
//     const q = question.trim();

//     // Parse the intent directly
//     const intent = parseIntent(q);

//     switch (intent.type) {
//       case "SEATS_BY_TITLE":
//         const movieByTitle = await findMovieByTitle(intent.title);
//         if (!movieByTitle) {
//           return res.json({ type: "text", answer: `I couldn't find a movie named "${intent.title}".` });
//         }
//         const showByTitle = await nextShowForTitle(movieByTitle._id);
//         if (!showByTitle) {
//           return res.json({ type: "text", answer: `No upcoming shows for "${movieByTitle.title}".` });
//         }
//         const occupiedByTitle = Object.keys(showByTitle.occupiedSeats || {});
//         return res.json({
//           type: "seatInfo",
//           answer: `Occupied seats for "${movieByTitle.title}" (next show - showId: ${showByTitle._id}): ${occupiedByTitle.length ? occupiedByTitle.join(", ") : "None"}. You can book tickets by visiting the booking page for this show.`,
//           occupiedSeats: occupiedByTitle,
//           showId: showByTitle._id,
//         });

//       case "SEATS_BY_SHOW":
//         const showById = await getOccupiedSeats(intent.showId);
//         if (!showById) {
//           return res.json({ type: "text", answer: "Show not found." });
//         }
//         const occupiedById = Object.keys(showById.occupiedSeats || {});
//         return res.json({
//           type: "seatInfo",
//           answer: `Occupied seats for show ${intent.showId}: ${occupiedById.length ? occupiedById.join(", ") : "None"}. You can book tickets by visiting the booking page for this show.`,
//           occupiedSeats: occupiedById,
//           showId: intent.showId,
//         });

//       case "LIST_MOVIES":
//         const upcoming = await listUpcomingShows(10);
//         if (!upcoming.length) return res.json({ type: "text", answer: "No movies are currently showing." });
//         const movies = upcoming.map((s) => ({
//           id: s._id,
//           title: s.movie.title,
//           poster: s.movie.poster_path,
//           overview: s.movie.overview || "No description available",
//           rating: s.movie.vote_average ?? "N/A",
//           runtime: s.movie.runtime ?? "N/A",
//           showDateTime: s.showDateTime,
//         }));
//         return res.json({
//           type: "movies",
//           answer: `Here are the currently showing movies with showtimes. To book tickets, please use the main booking interface.`,
//           movies,
//         });

//       case "MOVIE_INFO":
//         const movieInfo = await findMovieByTitle(intent.title);
//         if (!movieInfo) return res.json({ type: "text", answer: `I couldn't find "${intent.title}".` });
//         const showtimesForInfo = await listShowtimesForMovieId(movieInfo._id);
//         const nearest = showtimesForInfo[0];
//         return res.json({
//           type: "movieInfo",
//           answer: `Here is the information for "${movieInfo.title}". To book tickets, please use the main booking interface.`,
//           movie: {
//             id: nearest?._id || null,
//             title: movieInfo.title,
//             poster: movieInfo.poster_path,
//             overview: movieInfo.overview || "No description available",
//             rating: movieInfo.vote_average ?? "N/A",
//             runtime: movieInfo.runtime ?? "N/A",
//             showDateTime: nearest?.showDateTime || null,
//           },
//           guide: nearest ? `Next show: ${new Date(nearest.showDateTime).toLocaleString()} (showId: ${nearest._id}).` : `No upcoming showtimes found.`,
//         });

//       case "SHOWTIMES":
//         const showtimesMovie = await findMovieByTitle(intent.title);
//         if (!showtimesMovie) return res.json({ type: "text", answer: `No results for "${intent.title}".` });
//         const showtimes = await listShowtimesForMovieId(showtimesMovie._id);
//         if (!showtimes.length) return res.json({ type: "text", answer: `No upcoming showtimes for "${showtimesMovie.title}".` });
//         const timesLines = showtimes.map((s) => `• ${new Date(s.showDateTime).toLocaleString()} (showId: ${s._id})`);
//         return res.json({ type: "text", answer: `Showtimes for "${showtimesMovie.title}":\n${timesLines.join("\n")}\n\nTo book tickets, please use the main booking interface.` });

//       case "HELP":
//       case "UNKNOWN":
//       default:
//         return res.json({
//           type: "text",
//           answer: `I can help with:\n• "currently showing" – list movies & nearest showtimes\n• "info about <title>" – movie info + nearest show\n• "showtimes <title>" – all upcoming times\n• "seats for <movie title>" – seat availability for the next show\n• "seats for show <showId>" – seat availability for a specific show\n\nTo book tickets, please use the main booking interface.`,
//         });
//     }
//   } catch (err) {
//     console.error("askQuestion error:", err);
//     return res.status(500).json({ type: "error", answer: "Server error while processing question." });
//   }
// }

import Movie from "../models/Movie.js";
import Show from "../models/Show.js";
import { findMovieByTitle } from "../services/movieService.js";
import {
  listUpcomingShows,
  listShowtimesForMovieId,
  nextShowForTitle,
  getOccupiedSeats,
} from "../services/showService.js";

// --- Intent Parser ---
const patterns = {
  LIST_MOVIES: /(now\s*playing|currently\s*showing|what\s*movies|movies\b)/i,
  MOVIE_INFO: /\b(info|details)\s+about\s+(.+)/i,
  SHOWTIMES: /\b(show\s*times?|showtime|when\s+is)\s+(.+)/i,
  SEATS_BY_SHOW: /\b(seats?|seat\s*availability).*(show)\s+([a-f\d]{24}|[A-Za-z0-9_-]+)/i,
  SEATS_BY_TITLE: /\b(seats?|seat\s*availability)\b(?:.*?\s+for\s+)?(.+)/i,
  HELP: /\b(help|how|guide|book|booking)\b/i,
  // New pattern to handle the specific booking question
  HOW_TO_BOOK: /\b(how\s+can\s+i\s+book|book\s+a\s+ticket|book\s+tickets)\b/i,
};

function parseIntent(question) {
  const q = (question || "").trim();

  // Check for the specific "how to book" intent first
  if (patterns.HOW_TO_BOOK.test(q)) return { type: "HOW_TO_BOOK" };

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

// --- Main Chatbot Logic ---
export async function askQuestion(req, res) {
  try {
    const { question } = req.body || {};
    if (!question || typeof question !== "string") {
      return res.status(400).json({ type: "error", answer: "Please ask a valid question." });
    }
    const q = question.trim();

    const intent = parseIntent(q);

    switch (intent.type) {
      case "HOW_TO_BOOK":
        return res.json({
          type: "text",
          answer: `Here is a step-by-step guide on how to book your tickets:\n\n1. Select your preferred movie from the movies page or homepage. It will direct you to the movie details page.\n2. Click the 'Buy Tickets' button. You will be asked to select a preferred date for the show. Click on the date and then 'Buy Ticket' to go to the show timing and seats layout page.\n3. Click your preferred timing and select your seats from the available ones. Then, click 'Proceed to Checkout'.\n4. You will be directed to the payment page to make the payment. Once confirmed, your booking will be complete.\n5. You will get a PDF ticket in your email, which you should bring with you to the theater.\n\n\nNote: Please make sure to complete the payment in 10 minutes after you select the seats, or the booked seats will be released.`,
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
          answer: `Occupied seats for "${movieByTitle.title}" (next show - showId: ${showByTitle._id}): ${occupiedByTitle.length ? occupiedByTitle.join(", ") : "None"}. To book tickets, please use the main booking interface.`,
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
          answer: `Occupied seats for show ${intent.showId}: ${occupiedById.length ? occupiedById.join(", ") : "None"}. To book tickets, please use the main booking interface.`,
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
          answer: `Here are the currently showing movies with showtimes. To book tickets, please use the main booking interface.`,
          movies,
        });

      case "MOVIE_INFO":
        const movieInfo = await findMovieByTitle(intent.title);
        if (!movieInfo) return res.json({ type: "text", answer: `I couldn't find "${intent.title}".` });
        const showtimesForInfo = await listShowtimesForMovieId(movieInfo._id);
        const nearest = showtimesForInfo[0];
        return res.json({
          type: "movieInfo",
          answer: `Here is the information for "${movieInfo.title}". To book tickets, please use the main booking interface.`,
          movie: {
            id: nearest?._id || null,
            title: movieInfo.title,
            poster: movieInfo.poster_path,
            overview: movieInfo.overview || "No description available",
            rating: movieInfo.vote_average ?? "N/A",
            runtime: movieInfo.runtime ?? "N/A",
            showDateTime: nearest?.showDateTime || null,
          },
          guide: nearest ? `Next show: ${new Date(nearest.showDateTime).toLocaleString()} (showId: ${nearest._id}).` : `No upcoming showtimes found.`,
        });

      case "SHOWTIMES":
        const showtimesMovie = await findMovieByTitle(intent.title);
        if (!showtimesMovie) return res.json({ type: "text", answer: `No results for "${intent.title}".` });
        const showtimes = await listShowtimesForMovieId(showtimesMovie._id);
        if (!showtimes.length) return res.json({ type: "text", answer: `No upcoming showtimes for "${showtimesMovie.title}".` });
        const timesLines = showtimes.map((s) => `• ${new Date(s.showDateTime).toLocaleString()} (showId: ${s._id})`);
        return res.json({ type: "text", answer: `Showtimes for "${showtimesMovie.title}":\n${timesLines.join("\n")}\n\nTo book tickets, please use the main booking interface.` });

      case "HELP":
      case "UNKNOWN":
      default:
        return res.json({
          type: "text",
          answer: `I can help with:\n• "currently showing" – list movies & nearest showtimes\n• "info about <title>" – movie info + nearest show\n• "showtimes <title>" – all upcoming times\n• "seats for <movie title>" – seat availability for the next show\n• "seats for show <showId>" – seat availability for a specific show\n\nTo book tickets, you can also ask "how can I book tickets".`,
        });
    }
  } catch (err) {
    console.error("askQuestion error:", err);
    return res.status(500).json({ type: "error", answer: "Server error while processing question." });
  }
}