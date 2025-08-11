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
import path from "path";
import fs from "fs";

export const generatePdfTicket = async (booking) => {
  const { _id: bookingId, userName, movieName, showDate, showTime, bookedSeats } = booking;

  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const stream = new PassThrough();
      const chunks = [];

      stream.on("data", (chunk) => chunks.push(chunk));
      stream.on("end", () => resolve(Buffer.concat(chunks)));
      stream.on("error", (err) => reject(err));

      doc.pipe(stream);

      // HEADER
      doc.fontSize(20).text("🎬 Movie Ticket", { align: "center" });
      doc.moveDown();

      // ADD CLAPPER IMAGE
      const clapperPath = path.join(process.cwd(), "assets", "clapper.png");
      if (fs.existsSync(clapperPath)) {
        doc.image(clapperPath, doc.page.width / 2 - 50, 100, { width: 100 });
      }
      doc.moveDown(6);

      // MOVIE DETAILS
      doc.fontSize(14).text(`Booking ID: ${bookingId}`);
      doc.text(`Name: ${userName}`);
      doc.text(`Movie: ${movieName}`);
      doc.text(`Date: ${showDate}`);
      doc.text(`Time: ${showTime}`);
      doc.text(`Seats: ${bookedSeats.join(", ")}`);
      doc.moveDown();

      // QR CODE
      const qrData = await QRCode.toDataURL(`Booking ID: ${bookingId}`);
      const qrImage = qrData.replace(/^data:image\/png;base64,/, "");
      const qrBuffer = Buffer.from(qrImage, "base64");
      const qrPath = path.join(process.cwd(), "temp_qr.png");
      fs.writeFileSync(qrPath, qrBuffer);
      doc.image(qrPath, { width: 150, align: "center" });
      fs.unlinkSync(qrPath);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
