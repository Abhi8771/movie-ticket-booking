import Show from '../models/Show.js';

// Earliest upcoming show per movie (for the "currently playing" list)
export async function listUpcomingShows(limit = 10) {
  const now = new Date();
  const shows = await Show.find(
    { showDateTime: { $gte: now } },
    { movie: 1, showDateTime: 1, showPrice: 1 } // projection
  )
    .populate({ path: 'movie', select: 'title poster_path overview vote_average runtime' })
    .sort({ showDateTime: 1 })
    .lean();

  // Deduplicate by movie (earliest show per movie)
  const seen = new Set();
  const unique = [];
  for (const s of shows) {
    if (!s.movie) continue;
    const id = String(s.movie._id || s.movie); // your Movie _id is a string
    if (!seen.has(id)) {
      seen.add(id);
      unique.push(s);
    }
    if (unique.length >= limit) break;
  }
  return unique;
}

// All upcoming shows for a given movie id (ordered)
export async function listShowtimesForMovieId(movieId) {
  const now = new Date();
  return Show.find(
    { movie: movieId, showDateTime: { $gte: now } },
    { _id: 1, showDateTime: 1, showPrice: 1 }
  )
    .sort({ showDateTime: 1 })
    .lean();
}

// Find next upcoming show for a movie title (for seat queries w/o showId)
export async function nextShowForTitle(movieId) {
  const now = new Date();
  return Show.findOne(
    { movie: movieId, showDateTime: { $gte: now } },
    { _id: 1, showDateTime: 1, occupiedSeats: 1, showPrice: 1 }
  )
    .sort({ showDateTime: 1 })
    .lean();
}

// Occupied seats for a given show
export async function getOccupiedSeats(showId) {
  const show = await Show.findById(showId, { _id: 1, occupiedSeats: 1, showDateTime: 1, movie: 1 }).lean();
  return show || null;
}
