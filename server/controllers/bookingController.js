// import { inngest } from "../inngest/index.js";
// import Booking from "../models/Booking.js";
// import Show from "../models/Show.js";
// import stripe from "stripe";

// const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);

// // Function to check availability of selected seats for a movie
// const checkSeatsAvailability = async (showId, selectedSeats) => {
//   try {
//     const showData = await Show.findById(showId);
//     if (!showData) return false;

//     const occupiedSeats = showData.occupiedSeats;
//     const isAnySeatTaken = selectedSeats.some((seat) => occupiedSeats[seat]);

//     return !isAnySeatTaken;
//   } catch (error) {
//     console.log(error.message);
//     return false;
//   }
// };

// export const createBooking = async (req, res) => {
//   try {
//     const { userId } = req.auth();
//     const { showId, selectedSeats } = req.body;
//     const { origin } = req.headers;

//     const isAvailable = await checkSeatsAvailability(showId, selectedSeats);
//     if (!isAvailable) {
//       return res.json({ success: false, message: "Selected seat not available" });
//     }

//     const showData = await Show.findById(showId).populate("movie");
//     const amount = showData.showPrice * selectedSeats.length;

//     const booking = await Booking.create({
//       user: userId,
//       show: showId,
//       amount,
//       bookedSeats: selectedSeats,
//     });

//     // Mark seats as occupied
//     selectedSeats.forEach((seat) => {
//       showData.occupiedSeats[seat] = userId;
//     });

//     showData.markModified("occupiedSeats");
//     await showData.save();

//     const line_items = [
//       {
//         price_data: {
//           currency: "usd",
//           product_data: {
//             name: showData.movie.title,
//           },
//           unit_amount: Math.floor(amount * 100),
//         },
//         quantity: 1,
//       },
//     ];

//     const session = await stripeInstance.checkout.sessions.create({
//       success_url: `${origin}/loading/my-bookings`,
//       cancel_url: `${origin}/my-bookings`,
//       line_items,
//       mode: "payment",
//       metadata: {
//         bookingId: booking._id.toString(),
//       },
//       expires_at: Math.floor(Date.now() / 1000) + 30 * 60,//Expires in 30 minutes
//     });

//     booking.paymentLink = session.url;
//     await booking.save();

//     // Run inngest scheduler function to check payment status after 10 minutes
//     await inngest.send({
//       name: "app/checkpayment",
//       data: { bookingId: booking._id.toString()}
//     })


//     res.json({ success: true, url: session.url });
//   } catch (error) {
//     console.log(error.message);
//     res.json({ success: false, message: error.message });
//   }
// };

// export const getOccupiedSeats = async (req, res) => {
//   try {
//     const { showId } = req.params;
//     const showData = await Show.findById(showId);
//     const occupiedSeats = Object.keys(showData.occupiedSeats || {});

//     res.json({ success: true, occupiedSeats });
//   } catch (error) {
//     console.log(error.message);
//     res.json({ success: false, message: error.message });
//   }
// };


// import { inngest } from "../inngest/index.js";
// import Booking from "../models/Booking.js";
// import Show from "../models/Show.js";
// import stripe from "stripe";

// const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);

// // Function to check availability of selected seats for a movie
// const checkSeatsAvailability = async (showId, selectedSeats) => {
//   try {
//     const showData = await Show.findById(showId);
//     if (!showData) return false;

//     const occupiedSeats = showData.occupiedSeats;
//     const isAnySeatTaken = selectedSeats.some((seat) => occupiedSeats[seat]);

//     return !isAnySeatTaken;
//   } catch (error) {
//     console.log(error.message);
//     return false;
//   }
// };

// export const createBooking = async (req, res) => {
//   try {
//     const { userId } = req.auth();
//     const { showId, selectedSeats } = req.body;
//     const { origin } = req.headers;

//     const isAvailable = await checkSeatsAvailability(showId, selectedSeats);
//     if (!isAvailable) {
//       return res.json({ success: false, message: "Selected seat not available" });
//     }

//     const showData = await Show.findById(showId).populate("movie");
//     const amount = showData.showPrice * selectedSeats.length;

//     const booking = await Booking.create({
//       user: userId,
//       show: showId,
//       amount,
//       bookedSeats: selectedSeats,
//     });

//     // Mark seats as occupied
//     selectedSeats.forEach((seat) => {
//       showData.occupiedSeats[seat] = userId;
//     });

//     showData.markModified("occupiedSeats");
//     await showData.save();

//     const line_items = [
//       {
//         price_data: {
//           currency: "usd",
//           product_data: {
//             name: showData.movie.title,
//           },
//           unit_amount: Math.floor(amount * 100), 
//         },
//         quantity: 1,
//       },
//     ];

//     const session = await stripeInstance.checkout.sessions.create({
//       success_url: `${origin}/loading/my-bookings`,
//       cancel_url: `${origin}/my-bookings`,
//       line_items,
//       mode: "payment",
//       metadata: {
//         bookingId: booking._id.toString(), 
//       },
//     });

//     booking.paymentLink = session.url;
//     await booking.save();

//     // Schedule a fallback payment check via Inngest after 10 minutes
//     await inngest.send({
//       name: "app/checkpayment",
//       data: { bookingId: booking._id.toString() }
//     });

//     res.json({ success: true, url: session.url });
//   } catch (error) {
//     console.log(error.message);
//     res.json({ success: false, message: error.message });
//   }
// };

// export const getOccupiedSeats = async (req, res) => {
//   try {
//     const { showId } = req.params;
//     const showData = await Show.findById(showId);
//     const occupiedSeats = Object.keys(showData.occupiedSeats || {});

//     res.json({ success: true, occupiedSeats });
//   } catch (error) {
//     console.log(error.message);
//     res.json({ success: false, message: error.message });
//   }
// };

import { inngest } from "../inngest/index.js";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import stripe from "stripe";
import { users } from "@clerk/clerk-sdk-node";

const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);

// Function to check availability of selected seats for a movie
const checkSeatsAvailability = async (showId, selectedSeats) => {
  try {
    const showData = await Show.findById(showId);
    if (!showData) return false;

    const occupiedSeats = showData.occupiedSeats;
    const isAnySeatTaken = selectedSeats.some((seat) => occupiedSeats[seat]);

    return !isAnySeatTaken;
  } catch (error) {
    console.log(error.message);
    return false;
  }
};

export const createBooking = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { showId, selectedSeats } = req.body;
    const { origin } = req.headers;

    // Check seat availability
    const isAvailable = await checkSeatsAvailability(showId, selectedSeats);
    if (!isAvailable) {
      return res.json({ success: false, message: "Selected seat not available" });
    }

    // Get show details
    const showData = await Show.findById(showId).populate("movie");
    const amount = showData.showPrice * selectedSeats.length;

    //  Fetch Clerk user details
    const clerkUser = await users.getUser(userId);

    // Create booking with userName & userEmail stored
    const booking = await Booking.create({
      user: userId,
      userName: `${clerkUser.firstName} ${clerkUser.lastName}`,
      userEmail: clerkUser.emailAddresses[0].emailAddress,
      show: showId,
      amount,
      bookedSeats: selectedSeats,
      isPaid: false, // default until Stripe webhook confirms payment
    });

    // Mark seats as occupied
    selectedSeats.forEach((seat) => {
      showData.occupiedSeats[seat] = userId;
    });
    showData.markModified("occupiedSeats");
    await showData.save();

    // Create Stripe Checkout session
    const line_items = [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: showData.movie.title,
          },
          unit_amount: Math.floor(amount * 100),
        },
        quantity: 1,
      },
    ];

    const session = await stripeInstance.checkout.sessions.create({
      success_url: `${origin}/loading/my-bookings`,
      cancel_url: `${origin}/my-bookings`,
      line_items,
      mode: "payment",
      metadata: {
        bookingId: booking._id.toString(),
      },
    });

    booking.paymentLink = session.url;
    await booking.save();

    // Schedule fallback payment check via Inngest
    await inngest.send({
      name: "app/checkpayment",
      data: { bookingId: booking._id.toString() },
    });

    res.json({ success: true, url: session.url });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

export const getOccupiedSeats = async (req, res) => {
  try {
    const { showId } = req.params;
    const showData = await Show.findById(showId);
    const occupiedSeats = Object.keys(showData.occupiedSeats || {});

    res.json({ success: true, occupiedSeats });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};
