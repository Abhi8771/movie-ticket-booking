// server/utils/generatePdfTicket.js
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { PassThrough } from "stream";

export const generatePdfTicket = async (booking) => {
  const { _id: bookingId, userName, movieName, showDate, showTime, bookedSeats } = booking;

  // Generate QR Code
  const qrData = await QRCode.toDataURL(`Booking ID: ${bookingId}`);

  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const stream = new PassThrough();
  doc.pipe(stream);

  // Title
  doc.fontSize(24).fillColor("#ff6600").text("🎟 Movie Ticket", { align: "center" }).moveDown();

  // Booking Info
  doc.fontSize(18).fillColor("black").text(`Movie: ${movieName}`);
  doc.text(`Date: ${showDate}`);
  doc.text(`Time: ${showTime}`);
  doc.text(`Seats: ${bookedSeats.join(", ")}`);
  doc.text(`Name: ${userName}`).moveDown();

  // QR Code
  doc.image(qrData, { fit: [150, 150], align: "center" }).moveDown();

  // Footer
  doc.fontSize(12).fillColor("gray").text("Please bring this ticket to the theater.", { align: "center" });

  doc.end();

  const chunks = [];
  return new Promise((resolve, reject) => {
    stream.on("data", chunk => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
};