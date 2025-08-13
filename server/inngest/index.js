import { Inngest } from "inngest";
import User from "../models/User.js";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import { sendEmail } from "../utils/sendEmail.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "movie-ticket-booking" });

//inngest function to save user data
const syncUserCreation = inngest.createFunction(
    {id: 'sync-user-from-clerk'},
    { event: "clerk/user.created" },
    async({event}) => {
        const {id, first_name, last_name, email_addresses, image_url} = event.data;
        const userData = {
            _id: id,
            email: email_addresses[0].email_address,
            name: first_name + " " + last_name,
            image: image_url
        }
        await User.create(userData);
    }
)

//Inngest function to delete user fromo database


const syncUserDeletion = inngest.createFunction(
    {id: 'delete-user-with-clerk'},
    { event: "clerk/user.deleted" },
    async({event}) => {
        const {id} = event.data;
        await User.findByIdAndDelete(id);
    }
)

//Inngest functions to Update user data in database

const syncUserUpdation = inngest.createFunction(
    {id: 'update-user-from-clerk'},
    { event: "clerk/user.updated" },
    async({event}) => {
        const {id, first_name, last_name, email_addresses, image_url} = event.data;
        const userData = {
            name: first_name + " " + last_name,
            email: email_addresses[0].email_address,
            image: image_url
        }
        await User.findByIdAndUpdate(id, userData);
    }
)
// Inngest function to cancel bookings and release seats of show after 10 minutes pf booking creation
//  if payment not done
const releaseSeatsAndDeleteBooking = inngest.createFunction(
    {id: 'release-seats-delete-booking'},
    { event: "app/checkpayment" },
    async({event, step}) => {
        const tenMinutesLater = new Date(Date.now() + 10 * 60 * 1000);
        await step.sleepUntil('wait-for-10-minutes', tenMinutesLater);

        await step.run('check-payment-status', async() => {
            const bookingId = event.data.bookingId;
      const booking = await Booking.findById(bookingId);

    //   if payment is not made release seats and delete booking

            if(!booking.isPaid){
                
                const show = await Show.findById(booking.show);
                booking.bookedSeats.forEach(seat => {
                    delete show.occupiedSeats[seat];
                
            });
            show.markModified('occupiedSeats');
            await show.save();
            await Booking.findByIdAndDelete(booking._id)
        }

        })

    }

)

// // Inngest Function to send email to user when booking is confirmed

// const sendBookingConfirmationEmail = inngest.createFunction({id: "send-booking-confirmation-email"},
//   {event: "app/show.booked"},
//   async (event, step) => {
//     const {bookingId} = event.data;
//     const booking = await Booking.findById(bookingId).populate({
//       path: 'show',
//       populate: {path: "movie", model: "Movie"}
//     }).populate('user');

//   }
// )



// inngest functions to send emails for booking confirmation, reminders, and new movie notifications



// Inngest Function to send email when booking is confirmed
const sendBookingConfirmationEmail = inngest.createFunction(
  { id: "send-booking-confirmation-email" },
  { event: "app/show.booked" },
  async (event, step) => {
    const { bookingId } = event.data;

    const booking = await Booking.findById(bookingId)
      .populate({
        path: "show",
        populate: { path: "movie", model: "Movie" },
      })
      .populate("user");

    if (!booking || !booking.user || !booking.show || !booking.show.movie) return;

    await sendEmail({
      to: booking.user.email,
      subject: `Booking Confirmed: ${booking.show.movie.title}`,
      text: `Hi ${booking.user.name},\n\nYour booking for ${booking.show.movie.title} at ${booking.show.showTime} is confirmed!\n\nEnjoy the show!\n\nMovie Ticket Booking Team`,
    });
  }
);

// Inngest Function to send reminder emails 2 hours before the show
const sendReminderEmail = inngest.createFunction(
  { id: "send-reminder-email" },
  { cron: "0 * * * *" }, // runs every hour
  async ({ step }) => {
    const now = new Date();
    const windowStart = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
    const windowEnd = new Date(windowStart.getTime() + 60 * 60 * 1000); // 1-hour window

    // Prepare reminder tasks
    const reminderTasks = await step.run("prepare-reminder-tasks", async () => {
      const shows = await Show.find({
        showTime: { $gte: windowStart, $lt: windowEnd },
      }).populate("movie");

      const tasks = [];

      for (const show of shows) {
        if (!show.movie || !show.occupiedSeats) continue;

        // Get unique user IDs
        const userIds = [...new Set(Object.values(show.occupiedSeats))];
        if (userIds.length === 0) continue;

        const users = await User.find({ _id: { $in: userIds } }).select("name email");

        for (const user of users) {
          tasks.push({
            userEmail: user.email,
            userName: user.name,
            movieTitle: show.movie.title,
            showTime: show.showTime,
          });
        }
      }

      return tasks;
    });

    if (reminderTasks.length === 0) {
      return { sent: 0, message: "No reminders to send" };
    }

    // Send reminder emails
    const results = await step.run("send-reminder-emails", async () => {
      return await Promise.allSettled(
        reminderTasks.map((task) =>
          sendEmail({
            to: task.userEmail,
            subject: `Reminder: ${task.movieTitle} Show at ${task.showTime}`,
            text: `Hi ${task.userName},\n\nThis is a reminder for the show of ${task.movieTitle} at ${task.showTime}. Don't forget to arrive on time!\n\nBest regards,\nMovie Ticket Booking Team`,
          })
        )
      );
    });

    const sent = results.filter((result) => result.status === "fulfilled").length;
    const failed = results.length - sent;
    return {
      sent,
      failed,
      message: `Sent ${sent} reminders, ${failed} failed`,
    };
  }
);

const sendNewMovieEmail = inngest.createFunction(
  { id: "send-new-movie-email" },
  { event: "app/movie.added" },
  async ({ event }) => {
    const { movieTitle, movieId } = event.data;
    const users = await User.find({});

    for (const user of users) {
      const userEmail = user.email;
      const userName = user.name;
      const subject = `New Movie Added: ${movieTitle}`;

      // HTML email content
      const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; padding: 20px; background-color: #f4f4f4; border-radius: 5px; max-width: 600px; margin: auto;">
          <h2 style="color: #2c3e50;">Hi ${userName},</h2>
          <p>We are excited to inform you that a new movie, <strong>${movieTitle}</strong>, has been added to our collection. Check it out now!</p>
          <h3 style="color: #2c3e50;">"${movieTitle}"</h3>
          <p><a href="https://yourwebsite.com/movies/${movieId}">Visit Our Website</a></p>
          <br/>
          <p>Thank you for being a valued customer!</p>
        </div>
      `;

      // Plain text fallback
      const text = `Hi ${userName},\n\nWe are excited to inform you that a new movie, "${movieTitle}", has been added to our collection. Check it out now!\n\nVisit: https://yourwebsite.com/movies/${movieId}\n\nBest regards,\nMovie Ticket Booking Team`;

      await sendEmail({ to: userEmail, subject, text, html });
    }
    return {message: "Email sent successfully to all users."};
  }
);




export const functions = [syncUserCreation, syncUserDeletion, syncUserUpdation, releaseSeatsAndDeleteBooking, sendBookingConfirmationEmail, sendReminderEmail, sendNewMovieEmail];