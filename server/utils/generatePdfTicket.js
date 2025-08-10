// // server/utils/generatePdfTicket.js
// import PDFDocument from "pdfkit";
// import QRCode from "qrcode";
// import { PassThrough } from "stream";

// export const generatePdfTicket = async (booking) => {
//   const { _id: bookingId, userName, movieName, showDate, showTime, bookedSeats } = booking;

//   // Generate QR Code
//   const qrData = await QRCode.toDataURL(`Booking ID: ${bookingId}`);

//   const doc = new PDFDocument({ size: "A4", margin: 50 });
//   const stream = new PassThrough();
//   doc.pipe(stream);

//   // Title
//   doc.fontSize(24).fillColor("#ff6600").text("🎟 Movie Ticket", { align: "center" }).moveDown();

//   // Booking Info
//   doc.fontSize(18).fillColor("black").text(`Movie: ${movieName}`);
//   doc.text(`Date: ${showDate}`);
//   doc.text(`Time: ${showTime}`);
//   doc.text(`Seats: ${bookedSeats.join(", ")}`);
//   doc.text(`Name: ${userName}`).moveDown();

//   // QR Code
//   doc.image(qrData, { fit: [150, 150], align: "center" }).moveDown();

//   // Footer
//   doc.fontSize(12).fillColor("gray").text("Please bring this ticket to the theater.", { align: "center" });

//   doc.end();

//   const chunks = [];
//   return new Promise((resolve, reject) => {
//     stream.on("data", chunk => chunks.push(chunk));
//     stream.on("end", () => resolve(Buffer.concat(chunks)));
//     stream.on("error", reject);
//   });
// };

// server/utils/generatePdfTicket.js
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { PassThrough } from "stream";
import fs from "fs";

export const generatePdfTicket = async (booking) => {
  const { _id: bookingId, userName, movieName, showDate, showTime, bookedSeats, screenNumber, price } = booking;

  // Generate QR Code
  const qrData = await QRCode.toDataURL(`Booking ID: ${bookingId}`);

  const doc = new PDFDocument({ size: [600, 300], margin: 0 });
  const stream = new PassThrough();
  doc.pipe(stream);

  // Background
  doc.rect(0, 0, 600, 300).fill("#e60000");

  // Left panel (ticket info)
  doc.fillColor("white").fontSize(20).font("Helvetica-Bold")
     .text("★ ★ ★ ★ ★", 40, 20, { align: "left" });

  doc.fontSize(26).fillColor("white")
     .text("CINEMA TICKET", 40, 50, { align: "left" });

  doc.moveDown();
  doc.fontSize(14).fillColor("white")
     .text(`SCREEN: ${screenNumber || "N/A"}   SEAT: ${bookedSeats.join(", ")}`, 40, 90);

  doc.text(`DATE: ${showDate}`, 40, 110);
  doc.text(`TIME: ${showTime}`, 40, 130);
  doc.text(`PRICE: $${price || "N/A"}`, 40, 150);

  // QR code
  const qrImage = qrData.replace(/^data:image\/png;base64,/, "");
  const qrBuffer = Buffer.from(qrImage, "base64");
  doc.image(qrBuffer, 40, 180, { width: 120, height: 120 });

  // Right panel (movie clapper)
  try {
    const clapperPath = "./server/assets/clapper.png"; // You need to store this icon locally
    if (fs.existsSync(clapperPath)) {
      doc.image(clapperPath, 380, 80, { width: 160, height: 160 });
    }
  } catch (err) {
    console.warn("No clapper icon found, skipping image.");
  }

  doc.end();

  const chunks = [];
  return new Promise((resolve, reject) => {
    stream.on("data", chunk => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
};
