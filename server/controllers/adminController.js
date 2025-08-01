
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import User from "../models/User.js";

// API to check is user is admin

export const isAdmin = async (req, res) => {
    res.json({success: true, isAdmin: true})
}

// Api to get dashboard data

export const getDashboardData = async (req, res) => {
    try {
        const bookings = await Booking.find({isPaid: true});
        const activeShows = await Show.find({showDateTime: {$gte: new Date()}}).populate('movie');
        const totalUser = await User.countDocuments();
        

        const dashboardData = {
            totalBookings: bookings.length,
            totalRevenue: bookings.reduce((acc, booking) => acc + booking.amount, 0),
            activeShows,
            totalUser
           
        };

        res.json({ success: true, dashboardData });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Server Error", error: error.message });
    }
}

// Api to get all shows

export const getAllShows = async(req, res) => {
    try {
        const shows = await Show.find({showDateTime: { $gte: new Date() }}).populate('movie').sort({showDateTime: 1});
        res.json({success:true, shows})
    } catch (error) {
        console.log(error)
        res.json({success: false, message: error.message})
    }
}

// API to get all bookings
export const getAllBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({}).populate('user').populate({
            path: "show",
            populate: {path: "movie"}
        }).sort({ createdAt: -1 })
        res.json({success:true, bookings})
    } catch (error) {
                console.log(error)
        res.json({success: false, message: error.message})

    }
}
// delete a show
export const deleteShow = async (req, res) => {
  try {
    const showId = req.params.id;

    const show = await Show.findById(showId);
    if (!show) {
      return res.status(404).json({ success: false, message: "Show not found" });
    }

    await Show.findByIdAndDelete(showId);

    await Booking.deleteMany({ show: showId });

    return res.status(200).json({ success: true, message: "Show and related bookings deleted successfully" });
  } catch (error) {
    console.error("Error deleting show:", error);
    return res.status(500).json({ success: false, message: "Server error while deleting show" });
  }
};