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

    res.json({ success: true, movies });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};


// API to add new shows to the database
export const addShow = async (req, res) => {
  try {
    const { movieId, showsInput, showPrice } = req.body;

    let movie = await Movie.findById(movieId);

    if (!movie) {
      // fetch movie details from OMDB 
      const { data: movieData } = await axios.get('http://www.omdbapi.com/', {
        params: {
          i: movieId,
          apikey: process.env.OMDB_API_KEY
        }
      });

      if (movieData.Response !== 'True') {
         console.log("OMDB movie not found:", movieId, movieData);
        return res.json({ success: false, message: 'Movie not found in OMDB' });
        }

      const movieDetails = {
        _id: movieId,
        title: movieData.Title,
        overview: movieData.Plot,
        poster_path: movieData.Poster,
        backdrop_path: '', 
        genres: movieData.Genre?.split(', ') || [],
        casts: movieData.Actors?.split(', ') || [],
        release_date: movieData.Released,
        original_language: movieData.Language,
        tagline: '', 
        vote_average: parseFloat(movieData.imdbRating) || 0,
        runtime: parseInt(movieData.Runtime?.split(" ")[0]) || 90, 
      };

      movie = await Movie.create(movieDetails);
    }

    const showsToCreate = [];
    showsInput.forEach(show => {
      const showDate = show.date;
      show.time.forEach(time => {
        const dateTimeString = `${showDate}T${time}`;
        showsToCreate.push({
          movie: movieId,
          showDateTime: new Date(dateTimeString),
          showPrice,
          occupiedSeats: {}
        });
      });
    });

    if (showsToCreate.length > 0) {
      await Show.insertMany(showsToCreate);
    }

    res.json({ success: true, message: 'Show Added Successfully' });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to get all upcoming shows from database
export const getShows = async (req, res) => {
  try {
    const shows = await Show.find({ showDateTime: { $gte: new Date() } })
      .populate('movie')
      .sort({ showDateTime: 1 });

    // filter unique shows by movie ID
    const uniqueMovies = new Map();
    shows.forEach(show => {
      if (!uniqueMovies.has(show.movie._id.toString())) {
        uniqueMovies.set(show.movie._id.toString(), show);
      }
    });

    res.json({ success: true, shows: Array.from(uniqueMovies.values()) });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to get a single show's movie and schedule
export const getShow = async (req, res) => {
  try {
    const { movieId } = req.params;

    const shows = await Show.find({
      movie: movieId,
      showDateTime: { $gte: new Date() }
    });

    const movie = await Movie.findById(movieId);
    const dateTime = {};

    shows.forEach(show => {
      const date = show.showDateTime.toISOString().split('T')[0];
      if (!dateTime[date]) {
        dateTime[date] = [];
      }
      dateTime[date].push({ time: show.showDateTime, showId: show._id });
    });

    res.json({ success: true, movie, dateTime });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};
