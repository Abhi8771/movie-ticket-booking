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


import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { PassThrough } from "stream";

export const generatePdfTicket = async (booking) => {
  const { _id: bookingId, userName, movieName, showDate, showTime, bookedSeats } = booking;

  // Generate QR Code as base64 image
  const qrData = await QRCode.toDataURL(`Booking ID: ${bookingId}`);

  const doc = new PDFDocument({ size: [400, 200], margin: 0 }); // Ticket-like size
  const stream = new PassThrough();
  doc.pipe(stream);

  // --- Background and border ---
  doc.rect(0, 0, 400, 200)
    .fill("#fffaf0") // light background
    .strokeColor("#ff6600")
    .lineWidth(2)
    .stroke();

  // --- Ticket title ---
  doc.fontSize(18)
    .fillColor("#ff6600")
    .font("Helvetica-Bold")
    .text("MOVIE TICKET", 20, 15);

  // --- Ticket information section ---
  doc.fontSize(12)
    .fillColor("black")
    .font("Helvetica")
    .text(`Movie: ${movieName}`, 20, 50)
    .text(`Date: ${showDate}`, 20, 70)
    .text(`Time: ${showTime}`, 20, 90)
    .text(`Seats: ${bookedSeats.join(", ")}`, 20, 110)
    .text(`Name: ${userName}`, 20, 130);

  // --- Perforation line ---
  doc.moveTo(260, 0)
    .lineTo(260, 200)
    .dash(5, { space: 5 })
    .strokeColor("#cccccc")
    .stroke()
    .undash();

  // --- QR Code on the right ---
  doc.image(qrData, 280, 50, { fit: [100, 100] });

  // --- Footer note ---
  doc.fontSize(8)
    .fillColor("gray")
    .text("Please bring this ticket to the theater.", 20, 170, { width: 220 });

  doc.end();

  // Stream PDF back as Buffer
  const chunks = [];
  return new Promise((resolve, reject) => {
    stream.on("data", chunk => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
};
