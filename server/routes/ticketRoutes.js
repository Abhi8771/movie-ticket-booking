import express from "express";
import { generatePdfTicket } from "../utils/generatePdfTicket.js";
import { sendEmail } from "../utils/sendEmail.js";
import Booking from "../models/Booking.js";

const router = express.Router();

router.post("/send-ticket/:bookingId", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    // Generate PDF
    const pdfBuffer = await generatePdfTicket(booking);

    // Send Email
    await sendEmail({
      to: booking.userEmail,
      subject: "Your Movie Ticket 🎟",
      html: `<h2>Hi ${booking.userName},</h2>
             <p>Here’s your ticket for <strong>${booking.movieName}</strong>!</p>
             <p>Show Date: ${booking.showDate}</p>
             <p>Show Time: ${booking.showTime}</p>
             <p>Seats: ${booking.bookedSeats.join(", ")}</p>`,
      attachments: [
        {
          filename: "ticket.pdf",
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    res.json({ message: "Ticket sent successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to send ticket" });
  }
});

export default router;
