// import Stripe from 'stripe';
// import Booking from '../models/Booking.js';

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// export const stripeWebhooks = async (req, res) => {
//   const sig = req.headers['stripe-signature'];
//   let event;

//   try {
//     event = stripe.webhooks.constructEvent(
//       req.body,
//       sig,
//       process.env.STRIPE_WEBHOOK_SECRET
//     );
//   } catch (error) {
//     console.error("Webhook verification failed:", error.message);
//     return res.status(400).send(`Webhook Error: ${error.message}`);
//   }

//   try {
//     if (event.type === 'checkout.session.completed') {
//       const session = event.data.object;
//       const bookingId = session.metadata?.bookingId;

//       if (bookingId) {
//         await Booking.findByIdAndUpdate(bookingId, {
//           isPaid: true,
//           paymentLink: ''
//         });
//         console.log(`Booking ${bookingId} marked as paid`);
//       }
//     }

//     res.status(200).json({ received: true });
//   } catch (err) {
//     console.error("Webhook handling error:", err.message);
//     res.status(500).send("Internal Server Error");
//   }
// };

// import Stripe from 'stripe';
// import Booking from '../models/Booking.js';
// import { response } from 'express';



// export const stripeWebhooks = async (req, res) => {
//   const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);
//   const sig = req.headers['stripe-signature'];
//   let event;

//   try {
//     event = stripeInstance.webhooks.constructEvent(
//       req.body,
//       sig,
//       process.env.STRIPE_WEBHOOK_SECRET
//     );
//   } catch (error) {
//     console.error("Webhook verification failed:", error.message);
//     return res.status(400).send(`Webhook Error: ${error.message}`);
//   }

//  try {
//   switch (event.type) {
//     case "payment_intent.succeeded": {
//       const paymentIntent = event.data.object;
//       const sessionList = await stripeInstance.checkout.sessions.list({
//         payment_intent: paymentIntent.id
       
//       })

//       const session = sessionList.data[0];
//       const {bookingId} = session.metadata;

//       await Booking.findByIdAndUpdate(bookingId, {
//         isPaid: true,
//         paymentLink: ''
//       })
      
//       break;

//     }
      
      
  
//     default:
//       console.log("Unhandled event type:", event.type);
//   }
//   response.json({received: true})
//  } catch (err) {
//     console.log("Webhook processing error", err);
//     response.status(500).send("Internal Server Error");

//  }
// };

// import Stripe from 'stripe';
// import Booking from '../models/Booking.js';

// const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

// export const stripeWebhooks = async (req, res) => {
//   const sig = req.headers['stripe-signature'];
//   let event;

//   try {
//     event = stripeInstance.webhooks.constructEvent(
//       req.body,
//       sig,
//       process.env.STRIPE_WEBHOOK_SECRET
//     );
//   } catch (error) {
//     console.error("Webhook verification failed:", error.message);
//     return res.status(400).send(`Webhook Error: ${error.message}`);
//   }

//   try {
//     if (event.type === 'checkout.session.completed') {
//       const session = event.data.object;
//       const bookingId = session.metadata?.bookingId;

//       if (!bookingId) {
//         console.warn("No bookingId in session metadata");
//         return res.status(400).json({ error: 'Missing bookingId in metadata' });
//       }

//       const updated = await Booking.findByIdAndUpdate(bookingId, {
//         isPaid: true,
//         paymentLink: ''
//       });

//       if (!updated) {
//         console.error("Booking not found:", bookingId);
//         return res.status(404).json({ error: 'Booking not found' });
//       }

//       console.log(`Booking ${bookingId} marked as paid`);
//     } else {
//       console.log("Unhandled event type:", event.type);
//     }

//     res.status(200).json({ received: true });
//   } catch (err) {
//     console.error("Webhook processing error:", err);
//     res.status(500).send("Internal Server Error");
//   }
// };


// 
// 

import Stripe from "stripe";
import Booking from "../models/Booking.js";
import { generatePdfTicket } from "../utils/generatePdfTicket.js";
import { sendEmail } from "../utils/sendEmail.js";

const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

export const stripeWebhooks = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripeInstance.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error("Webhook verification failed:", error.message);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const bookingId = session.metadata?.bookingId;

      if (!bookingId) {
        console.warn("No bookingId in session metadata");
        return res.status(400).json({ error: "Missing bookingId in metadata" });
      }

      // Mark booking as paid
      const booking = await Booking.findByIdAndUpdate(
        bookingId,
        { isPaid: true, paymentLink: "" },
        { new: true }
      ).populate("show");

      if (!booking) {
        console.error("Booking not found:", bookingId);
        return res.status(404).json({ error: "Booking not found" });
      }

      console.log(`✅ Booking ${bookingId} marked as paid`);

      // Generate PDF ticket
      const pdfBuffer = await generatePdfTicket({
        _id: booking._id,
        userName: booking.userName,
        movieName: booking.show.movie.title,
        showDate: booking.show.showDate,
        showTime: booking.show.showTime,
        bookedSeats: booking.bookedSeats
      });

      // Send email with PDF
      await sendEmail({
        to: booking.userEmail,
        subject: `Your Ticket for ${booking.show.movie.title}`,
        html: `<h3>Hi ${booking.userName.split(" ")[0]},</h3>
               <p>Thank you for your booking! Your ticket is attached below.</p>`,
        attachments: [
          {
            filename: `ticket-${bookingId}.pdf`,
            content: pdfBuffer,
          },
        ],
      });

      console.log(`📧 Ticket email sent to ${booking.userEmail}`);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error("Webhook processing error:", err);
    res.status(500).send("Internal Server Error");
  }
};
