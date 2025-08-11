// import axios from 'axios';
// import Movie from '../models/Movie.js';
// import Show from '../models/Show.js';

// // API to get now playing movies (simulated with popular titles)
// export const getNowPlayingMovies = async (req, res) => {
//   try {
//     const movieTitles = [
//       'Inception',
//       'Interstellar',
//       'The Dark Knight',
//       'The Matrix',
//       'Avatar',
//       'Gladiator',
//       'Titanic',
//       'The Godfather',
//       'Avengers: Endgame',
//       'Joker'
//     ];

//     const movies = [];

//     for (let title of movieTitles) {
//       const { data } = await axios.get('http://www.omdbapi.com/', {
//         params: {
//           t: title,
//           apikey: process.env.OMDB_API_KEY
//         }
//       });

//       if (data.Response === 'True') {
//         movies.push(data);
//       } else {
//         console.warn(`OMDB lookup failed for "${title}":`, data.Error);
//       }
//     }

//     res.json({ success: true, movies });
//   } catch (error) {
//     console.log(error);
//     res.json({ success: false, message: error.message });
//   }
// };


// // API to add new shows to the database
// export const addShow = async (req, res) => {
//   try {
//     const { movieId, showsInput, showPrice } = req.body;

//     let movie = await Movie.findById(movieId);

//     if (!movie) {
//       // fetch movie details from OMDB 
//       const { data: movieData } = await axios.get('http://www.omdbapi.com/', {
//         params: {
//           i: movieId,
//           apikey: process.env.OMDB_API_KEY
//         }
//       });

//       if (movieData.Response !== 'True') {
//          console.log("OMDB movie not found:", movieId, movieData);
//         return res.json({ success: false, message: 'Movie not found in OMDB' });
//         }

//       const movieDetails = {
//         _id: movieId,
//         title: movieData.Title,
//         overview: movieData.Plot,
//         poster_path: movieData.Poster,
//         backdrop_path: '', 
//         genres: movieData.Genre?.split(', ') || [],
//         casts: movieData.Actors?.split(', ') || [],
//         release_date: movieData.Released,
//         original_language: movieData.Language,
//         tagline: '', 
//         vote_average: parseFloat(movieData.imdbRating) || 0,
//         runtime: parseInt(movieData.Runtime?.split(" ")[0]) || 90, 
//       };

//       movie = await Movie.create(movieDetails);
//     }

//     const showsToCreate = [];
//     showsInput.forEach(show => {
//       const showDate = show.date;
//       show.time.forEach(time => {
//         const dateTimeString = `${showDate}T${time}`;
//         showsToCreate.push({
//           movie: movieId,
//           showDateTime: new Date(dateTimeString),
//           showPrice,
//           occupiedSeats: {}
//         });
//       });
//     });

//     if (showsToCreate.length > 0) {
//       await Show.insertMany(showsToCreate);
//     }

//     res.json({ success: true, message: 'Show Added Successfully' });
//   } catch (error) {
//     console.log(error);
//     res.json({ success: false, message: error.message });
//   }
// };

// // API to get all upcoming shows from database
// export const getShows = async (req, res) => {
//   try {
//     const shows = await Show.find({ showDateTime: { $gte: new Date() } })
//       .populate('movie')
//       .sort({ showDateTime: 1 });

//     // filter unique shows by movie ID
//     const uniqueMovies = new Map();
//     shows.forEach(show => {
//       if (!uniqueMovies.has(show.movie._id.toString())) {
//         uniqueMovies.set(show.movie._id.toString(), show);
//       }
//     });

//     res.json({ success: true, shows: Array.from(uniqueMovies.values()) });
//   } catch (error) {
//     console.log(error);
//     res.json({ success: false, message: error.message });
//   }
// };

// // API to get a single show's movie and schedule
// export const getShow = async (req, res) => {
//   try {
//     const { movieId } = req.params;

//     const shows = await Show.find({
//       movie: movieId,
//       showDateTime: { $gte: new Date() }
//     });

//     const movie = await Movie.findById(movieId);
//     const dateTime = {};

//     shows.forEach(show => {
//       const date = show.showDateTime.toISOString().split('T')[0];
//       if (!dateTime[date]) {
//         dateTime[date] = [];
//       }
//       dateTime[date].push({ time: show.showDateTime, showId: show._id });
//     });

//     res.json({ success: true, movie, dateTime });
//   } catch (error) {
//     console.error(error);
//     res.json({ success: false, message: error.message });
//   }
// };


import axios from 'axios';
import Movie from '../models/Movie.js';
import Show from '../models/Show.js';

// API to get now playing movies (simulated with popular titles)
export const getNowPlayingMovies = async (req, res) => {
  try {
    const movieTitles = [
      'Inception',
      'Interstellar',
      'The Dark Knight',
      'The Matrix',
      'Avatar',
      'Gladiator',
      'Titanic',
      'The Godfather',
      'Avengers: Endgame',
      'Joker'
    ];

    const movies = [];

    for (let title of movieTitles) {
      const { data } = await axios.get('http://www.omdbapi.com/', {
        params: {
          t: title,
          apikey: process.env.OMDB_API_KEY
        }
      });

      if (data.Response === 'True') {
        movies.push(data);
      } else {
        console.warn(`OMDB lookup failed for "${title}":`, data.Error);
      }
    }

    return res.json({ success: true, movies });
  } catch (error) {
    console.error('Error fetching now playing movies:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// API to add new shows to the database
export const addShow = async (req, res) => {
  try {
    const { movieId, showsInput, showPrice } = req.body;

    // Basic validation
    if (!movieId || !Array.isArray(showsInput) || showsInput.length === 0 || !showPrice) {
      return res.status(400).json({ success: false, message: 'Invalid input data' });
    }

    // Check if movie exists in DB
    let movie = await Movie.findById(movieId);

    if (!movie) {
      // Fetch movie details from OMDB by imdbID (movieId)
      const { data: movieData } = await axios.get('http://www.omdbapi.com/', {
        params: {
          i: movieId,
          apikey: process.env.OMDB_API_KEY
        }
      });

      if (movieData.Response !== 'True') {
        console.warn('OMDB movie not found:', movieId, movieData);
        return res.status(404).json({ success: false, message: 'Movie not found in OMDB' });
      }

      // Create movie document
      const movieDetails = {
        _id: movieId,
        title: movieData.Title,
        overview: movieData.Plot,
        poster_path: movieData.Poster,
        backdrop_path: '', // OMDB does not provide backdrop; keep empty or fetch elsewhere
        genres: movieData.Genre?.split(', ') || [],
        casts: movieData.Actors?.split(', ') || [],
        release_date: movieData.Released,
        original_language: movieData.Language,
        tagline: '', // OMDB does not provide tagline
        vote_average: parseFloat(movieData.imdbRating) || 0,
        runtime: parseInt(movieData.Runtime?.split(' ')[0]) || 90,
      };

      movie = await Movie.create(movieDetails);
    }

    // Prepare Show docs to create
    const showsToCreate = [];

    // Validate showsInput shape and create Date objects
    for (const show of showsInput) {
      if (!show.date || !Array.isArray(show.time)) {
        return res.status(400).json({ success: false, message: 'Invalid showsInput format' });
      }

      for (const time of show.time) {
        // Construct ISO datetime string; assumes time like 'HH:mm'
        const dateTimeString = `${show.date}T${time}:00`; // Adding seconds for valid ISO
        const dateTime = new Date(dateTimeString);
        if (isNaN(dateTime.getTime())) {
          return res.status(400).json({ success: false, message: `Invalid date/time: ${dateTimeString}` });
        }

        showsToCreate.push({
          movie: movieId,
          showDateTime: dateTime,
          showPrice,
          occupiedSeats: {},
        });
      }
    }

    if (showsToCreate.length > 0) {
      await Show.insertMany(showsToCreate);
    } else {
      return res.status(400).json({ success: false, message: 'No valid shows to add' });
    }

    return res.json({ success: true, message: 'Shows added successfully' });
  } catch (error) {
    console.error('Error adding show:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// API to get all upcoming shows (one per movie)
export const getShows = async (req, res) => {
  try {
    const now = new Date();

    const shows = await Show.find({ showDateTime: { $gte: now } })
      .populate('movie')
      .sort({ showDateTime: 1 });

    // Map to store unique movies with their earliest show
    const uniqueMovies = new Map();

    for (const show of shows) {
      const movieIdStr = show.movie._id.toString();
      if (!uniqueMovies.has(movieIdStr)) {
        uniqueMovies.set(movieIdStr, show);
      }
    }

    return res.json({ success: true, shows: Array.from(uniqueMovies.values()) });
  } catch (error) {
    console.error('Error fetching shows:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// API to get a single movie's upcoming show schedule
export const getShow = async (req, res) => {
  try {
    const { movieId } = req.params;

    if (!movieId) {
      return res.status(400).json({ success: false, message: 'movieId is required' });
    }

    const now = new Date();

    // Find upcoming shows for the movie
    const shows = await Show.find({
      movie: movieId,
      showDateTime: { $gte: now },
    }).sort({ showDateTime: 1 });

    const movie = await Movie.findById(movieId);

    if (!movie) {
      return res.status(404).json({ success: false, message: 'Movie not found' });
    }

    // Group show times by date (YYYY-MM-DD)
    const dateTime = {};

    for (const show of shows) {
      const dateStr = show.showDateTime.toISOString().split('T')[0];
      if (!dateTime[dateStr]) {
        dateTime[dateStr] = [];
      }
      dateTime[dateStr].push({
        time: show.showDateTime.toISOString(),
        showId: show._id,
      });
    }

    return res.json({ success: true, movie, dateTime });
  } catch (error) {
    console.error('Error fetching show:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
