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

// utils/generatePdfTicket.js
import PDFDocument from "pdfkit";
import getStream from "get-stream";

export const generatePdfTicket = async ({
  _id,
  userName,
  movieName,
  showDate,
  showTime,
  bookedSeats,
}) => {
  const doc = new PDFDocument({ margin: 50 });
  let buffers = [];

  doc.on("data", buffers.push.bind(buffers));
  doc.on("end", () => {});

  // ===== HEADER =====
  doc
    .fontSize(24)
    .fillColor("#FF5733")
    .text("🎟 Movie Ticket", { align: "center" })
    .moveDown(0.5);

  doc
    .fontSize(10)
    .fillColor("gray")
    .text(`Booking ID: ${_id}`, { align: "center" })
    .moveDown(1);

  // ===== USER INFO =====
  doc
    .fontSize(16)
    .fillColor("#333333")
    .text(`Name: ${userName}`, { align: "left" })
    .moveDown(0.3);

  // ===== MOVIE INFO BOX =====
  doc
    .rect(50, doc.y, 500, 100)
    .fill("#f8f9fa")
    .stroke("#ccc");

  doc
    .fillColor("#000")
    .fontSize(14)
    .text(`🎬 Movie: ${movieName}`, 60, doc.y + 10)
    .moveDown(0.3);

  doc
    .text(`📅 Date: ${new Date(showDate).toDateString()}`)
    .moveDown(0.3);

  doc
    .text(`🕒 Time: ${showTime}`)
    .moveDown(0.3);

  doc
    .text(`💺 Seats: ${bookedSeats.join(", ")}`)
    .moveDown(2);

  // ===== FOOTER =====
  doc
    .moveDown(2)
    .fontSize(10)
    .fillColor("gray")
    .text(
      "Please present this ticket at the entry gate. Thank you for booking with Movie Booking!",
      { align: "center" }
    );

  doc.end();
  const pdfBuffer = await getStream.buffer(doc);
  return pdfBuffer;
};
