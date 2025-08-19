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


// import express from "express";
// import OpenAI from "openai";
// import Show from "../models/Show.js";
// import Booking from "../models/Booking.js";
// import Movie from "../models/Movie.js";

// const router = express.Router();

// // ===== Config you can tweak =====
// // If you don't store a seat map in DB, use this fallback map.
// const ALL_SEATS = ["A1", "A2", "A3", "B1", "B2"];

// // Initialize OpenAI client (OpenRouter)
// const openrouter = new OpenAI({
//   apiKey: process.env.OPENROUTER_API_KEY,
//   baseURL: "https://openrouter.ai/api/v1",
// });

// /**
//  * Helper: build available seats for a Show
//  * Uses your Show schema where `occupiedSeats` is an object: { A1: true, ... }
//  */
// function getAvailableSeatsForShow(show, allSeats = ALL_SEATS) {
//   const occupied = show.occupiedSeats || {};
//   return allSeats.filter((seat) => !occupied[seat]);
// }

// /**
//  * POST /api/chat/ask
//  * Supports:
//  *  - "available" + "seat" => returns structured seat data (per show)
//  *  - "show" or "movie"    => returns movie list
//  *  - otherwise            => AI fallback
//  */
// router.post("/ask", async (req, res) => {
//   const { question } = req.body || {};
//   if (typeof question !== "string" || !question.trim()) {
//     return res.status(400).json({ type: "error", answer: "Invalid question." });
//   }

//   try {
//     const lowerQ = question.toLowerCase();

//     // ===== CASE 1: Available seats requested =====
//     if (lowerQ.includes("available") && lowerQ.includes("seat")) {
//       const shows = await Show.find().sort({ showDateTime: 1 });

//       if (!shows.length) {
//         return res.json({
//           type: "text",
//           answer: "No shows found at the moment.",
//         });
//       }

//       // Build structured seat availability per show
//       const seatsPayload = shows.map((show) => {
//         const availableSeats = getAvailableSeatsForShow(show, ALL_SEATS);
//         return {
//           id: String(show._id),
//           movie: show.movie, // movie is a String in your schema
//           time: show.showDateTime, // Date
//           price: show.showPrice,
//           availableSeats, // array of strings
//         };
//       });

//       return res.json({
//         type: "seats",
//         answer: "Here are the available seats:",
//         seats: seatsPayload,
//       });
//     }

//     // ===== CASE 2: Movies or shows listing =====
//     if (lowerQ.includes("show") || lowerQ.includes("movie")) {
//       const movies = await Movie.find().sort({ title: 1 });
//       const titles = movies.map((m) => m.title);

//       return res.json({
//         type: "movies",
//         answer: titles.length ? "Here are the upcoming movies:" : "No movies found.",
//         movies: titles,
//       });
//     }

//     // ===== DEFAULT: AI fallback =====
//     const prompt = `
//       You are an assistant for a movie ticket booking website.
//       User asked: "${question}"
//       No direct database info matched; reply helpfully and concisely.
//     `;

//     const aiRes = await openrouter.chat.completions.create({
//       model: "anthropic/claude-3.5-sonnet",
//       messages: [
//         { role: "system", content: "You are a helpful assistant for a movie booking service." },
//         { role: "user", content: prompt },
//       ],
//       max_tokens: 180,
//     });

//     const answer = aiRes.choices?.[0]?.message?.content?.trim() || "I can help with bookings and seat availability.";
//     return res.json({ type: "text", answer });
//   } catch (error) {
//     console.error("Chat /ask error:", error);
//     return res.status(500).json({ type: "error", answer: "Error fetching data or AI response." });
//   }
// });

// /**
//  * POST /api/chat/book
//  * Body: { showId: string, seats: string[], userName?: string }
//  * - Validates seats are still free
//  * - Marks them as occupied
//  * - Creates a Booking record
//  * - Returns confirmation + updated availability for that show
//  */
// router.post("/book", async (req, res) => {
//   const { showId, seats, userName } = req.body || {};

//   if (!showId || !Array.isArray(seats) || seats.length === 0) {
//     return res.status(400).json({ success: false, message: "showId and seats[] are required." });
//   }

//   try {
//     const show = await Show.findById(showId);
//     if (!show) {
//       return res.status(404).json({ success: false, message: "Show not found." });
//     }

//     const occupied = show.occupiedSeats || {};

//     // Validate availability
//     for (const seat of seats) {
//       if (!ALL_SEATS.includes(seat)) {
//         return res.status(400).json({ success: false, message: `Seat ${seat} is not valid.` });
//       }
//       if (occupied[seat]) {
//         return res.status(400).json({ success: false, message: `Seat ${seat} is already booked.` });
//       }
//     }

//     // Mark seats as booked (store userName or boolean)
//     seats.forEach((seat) => {
//       occupied[seat] = userName || true;
//     });
//     show.occupiedSeats = occupied;
//     await show.save();

//     // Optional: persist booking record
//     try {
//       if (Booking) {
//         await Booking.create({
//           show: showId,
//           seats,
//           userName: userName || "Guest",
//           price: show.showPrice,
//           bookedAt: new Date(),
//         });
//       }
//     } catch (e) {
//       // If Booking model differs, don't crash booking flow
//       console.warn("Booking model save failed (ignored):", e?.message);
//     }

//     // Return updated availability for this show
//     const availableSeats = getAvailableSeatsForShow(show, ALL_SEATS);

//     return res.json({
//       success: true,
//       message: `Booking confirmed for ${seats.join(", ")}.`,
//       show: {
//         id: String(show._id),
//         movie: show.movie,
//         time: show.showDateTime,
//         price: show.showPrice,
//         availableSeats,
//       },
//     });
//   } catch (error) {
//     console.error("Chat /book error:", error);
//     return res.status(500).json({ success: false, message: "Server error during booking." });
//   }
// });

// export default router;

// import express from "express";
// import Show from "../models/Show.js";
// import Movie from "../models/Movie.js";
// import Booking from "../models/Booking.js";
// import { users } from "@clerk/clerk-sdk-node";
// import Stripe from "stripe";
// import OpenAI from "openai";

// const router = express.Router();

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
//  const openrouter = new OpenAI({
//   apiKey: process.env.OPENROUTER_API_KEY,
//   baseURL: "https://openrouter.ai/api/v1",
// });

// // Helper to get available seats for a show
// const getAvailableSeats = (show) => {
//   const ALL_SEATS = ["A1", "A2", "A3", "B1", "B2"];
//   const occupied = show.occupiedSeats || {};
//   return ALL_SEATS.filter((seat) => !occupied[seat]);
// };

// // ================== ASK endpoint ==================
// router.post("/ask", async (req, res) => {
//   const { question } = req.body;
//   if (!question?.trim()) return res.status(400).json({ type: "error", answer: "Invalid question." });

//   try {
//     const lowerQ = question.toLowerCase();

//     // ---- Show available seats ----
//     if (lowerQ.includes("available") && lowerQ.includes("seat")) {
//       const shows = await Show.find().sort({ showDateTime: 1 }).populate("movie");
//       if (!shows.length) return res.json({ type: "text", answer: "No shows found." });

//       const seatsPayload = shows.map((show) => ({
//         id: String(show._id),
//         movie: show.movie.title,
//         time: show.showDateTime,
//         price: show.showPrice,
//         availableSeats: getAvailableSeats(show),
//       }));

//       return res.json({ type: "seats", answer: "Here are the available seats:", seats: seatsPayload });
//     }

//     // ---- Show currently playing movies ----
//     if (lowerQ.includes("show") || lowerQ.includes("movie")) {
//       const movies = await Movie.find().sort({ title: 1 });
//       const titles = movies.map((m) => m.title);
//       return res.json({
//         type: "movies",
//         answer: titles.length ? "Currently showing movies:" : "No movies are currently showing.",
//         movies: titles,
//       });
//     }

//     // ---- AI fallback for general queries ----
//     const aiRes = await openrouter.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [
//         { role: "system", content: "You are a helpful movie ticket booking assistant." },
//         { role: "user", content: question },
//       ],
//       max_tokens: 180,
//     });

//     const answer = aiRes.choices?.[0]?.message?.content?.trim() || "I can help with bookings and seat availability.";
//     return res.json({ type: "text", answer });

//   } catch (error) {
//     console.error("Chat /ask error:", error);
//     return res.status(500).json({ type: "error", answer: "Server error." });
//   }
// });

// // ================== BOOK endpoint ==================
// router.post("/book", async (req, res) => {
//   const { userId, showId, seats } = req.body;
//   if (!userId || !showId || !Array.isArray(seats) || seats.length === 0)
//     return res.status(400).json({ success: false, message: "userId, showId and seats[] are required." });

//   try {
//     const show = await Show.findById(showId).populate("movie");
//     if (!show) return res.status(404).json({ success: false, message: "Show not found." });

//     const availableSeats = getAvailableSeats(show);
//     for (const seat of seats) {
//       if (!availableSeats.includes(seat))
//         return res.status(400).json({ success: false, message: `${seat} is already booked or invalid.` });
//     }

//     // Get Clerk user details
//     const clerkUser = await users.getUser(userId);
//     const userName = `${clerkUser.firstName} ${clerkUser.lastName}`;
//     const userEmail = clerkUser.emailAddresses[0]?.emailAddress || "guest@example.com";

//     // Mark seats as occupied
//     seats.forEach((seat) => (show.occupiedSeats[seat] = userId));
//     show.markModified("occupiedSeats");
//     await show.save();

//     // Create booking in DB
//     const booking = await Booking.create({
//       user: userId,
//       userName,
//       userEmail,
//       show: showId,
//       amount: show.showPrice * seats.length,
//       bookedSeats: seats,
//       isPaid: false,
//     });

//     // Stripe Checkout session
//     const session = await stripe.checkout.sessions.create({
//       payment_method_types: ["card"],
//       line_items: [
//         {
//           price_data: {
//             currency: "usd",
//             product_data: { name: show.movie.title },
//             unit_amount: Math.floor(show.showPrice * seats.length * 100),
//           },
//           quantity: 1,
//         },
//       ],
//       mode: "payment",
//       success_url: `${process.env.FRONTEND_URL}/my-bookings`,
//       cancel_url: `${process.env.FRONTEND_URL}/my-bookings`,
//       metadata: { bookingId: booking._id.toString() },
//     });

//     booking.paymentLink = session.url;
//     await booking.save();

//     return res.json({
//       success: true,
//       message: `Booking confirmed for ${seats.join(", ")}.`,
//       show: {
//         id: show._id,
//         movie: show.movie.title,
//         time: show.showDateTime,
//         price: show.showPrice,
//         availableSeats: getAvailableSeats(show),
//       },
//       paymentLink: session.url,
//     });

//   } catch (error) {
//     console.error("Chat /book error:", error);
//     return res.status(500).json({ success: false, message: "Server error during booking." });
//   }
// });

// export default router;

import express from "express";
import Show from "../models/Show.js";
import Movie from "../models/Movie.js";
import Booking from "../models/Booking.js";
import { users } from "@clerk/clerk-sdk-node";
import Stripe from "stripe";
import OpenAI from "openai";

const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

// ================= Helper Functions =================
const getAvailableSeats = (show) => {
  // Use show-specific seats if defined, fallback to default
  const ALL_SEATS = show.seats || ["A1", "A2", "A3", "B1", "B2"];
  const occupied = show.occupiedSeats || {};
  return ALL_SEATS.filter((seat) => !occupied[seat]);
};

const formatDateTime = (date) => {
  const dt = new Date(date);
  return {
    date: dt.toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" }),
    time: dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }),
  };
};

// ================== ASK Endpoint =================
router.post("/ask", async (req, res) => {
  const { question } = req.body;
  if (!question?.trim()) return res.status(400).json({ type: "error", answer: "Invalid question." });

  try {
    const lowerQ = question.toLowerCase();

    // ---- Show available seats ----
    if (lowerQ.includes("available") && lowerQ.includes("seat")) {
      const shows = await Show.find().sort({ showDateTime: 1 }).populate("movie");
      if (!shows.length) return res.json({ type: "text", answer: "No shows found." });

      const seatsPayload = shows.map((show) => {
        const dt = formatDateTime(show.showDateTime);
        return {
          id: show._id.toString(),
          movie: show.movie.title,
          date: dt.date,
          time: dt.time,
          price: show.showPrice,
          availableSeats: getAvailableSeats(show),
        };
      });

      return res.json({ type: "seats", answer: "Here are the available seats:", seats: seatsPayload });
    }

    // ---- Show currently playing movies ----
    if (lowerQ.includes("show") || lowerQ.includes("movie")) {
      const movies = await Movie.find().sort({ title: 1 });
      const titles = movies.map((m) => m.title);

      return res.json({
        type: "movies",
        answer: titles.length ? "Currently showing movies:" : "No movies are currently showing.",
        movies: titles,
      });
    }

    // ---- AI fallback for general queries ----
    const aiRes = await openrouter.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a helpful movie ticket booking assistant." },
        { role: "user", content: question },
      ],
      max_tokens: 180,
    });

    // OpenRouter response path may vary; check both common fields
    const answer = aiRes.choices?.[0]?.message?.content?.trim() || aiRes.choices?.[0]?.text?.trim() || "I can help with bookings and seat availability.";

    return res.json({ type: "text", answer });

  } catch (error) {
    console.error("Chat /ask error:", error);
    return res.status(500).json({ type: "error", answer: "Server error." });
  }
});

// ================== BOOK Endpoint =================
router.post("/book", async (req, res) => {
  const { userId, showId, seats } = req.body;
  if (!userId || !showId || !Array.isArray(seats) || seats.length === 0)
    return res.status(400).json({ success: false, message: "userId, showId and seats[] are required." });

  try {
    const show = await Show.findById(showId).populate("movie");
    if (!show) return res.status(404).json({ success: false, message: "Show not found." });

    const availableSeats = getAvailableSeats(show);
    for (const seat of seats) {
      if (!availableSeats.includes(seat))
        return res.status(400).json({ success: false, message: `${seat} is already booked or invalid.` });
    }

    // Get Clerk user details
    const clerkUser = await users.getUser(userId);
    const userName = `${clerkUser.firstName} ${clerkUser.lastName}`;
    const userEmail = clerkUser.emailAddresses[0]?.emailAddress || "guest@example.com";

    // Mark seats as occupied
    seats.forEach((seat) => (show.occupiedSeats[seat] = userId));
    show.markModified("occupiedSeats");
    await show.save();

    // Create booking
    const booking = await Booking.create({
      user: userId,
      userName,
      userEmail,
      show: showId,
      amount: show.showPrice * seats.length,
      bookedSeats: seats,
      isPaid: false,
    });

    // Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: show.movie.title },
            unit_amount: Math.floor(show.showPrice * seats.length * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.FRONTEND_URL}/my-bookings`,
      cancel_url: `${process.env.FRONTEND_URL}/my-bookings`,
      metadata: { bookingId: booking._id.toString() },
    });

    booking.paymentLink = session.url;
    await booking.save();

    const dt = formatDateTime(show.showDateTime);

    return res.json({
      success: true,
      message: `Booking confirmed for ${seats.join(", ")}.`,
      show: {
        id: show._id,
        movie: show.movie.title,
        date: dt.date,
        time: dt.time,
        price: show.showPrice,
        availableSeats: getAvailableSeats(show),
      },
      paymentLink: session.url,
    });

  } catch (error) {
    console.error("Chat /book error:", error);
    return res.status(500).json({ success: false, message: "Server error during booking." });
  }
});

export default router;
