import mongoose, { mongo } from "mongoose";

const movieSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, 
    title: { type: String, required: true },
    overview: { type: String, required: true },
    poster_path: { type: String, required: true },
    backdrop_path: { type: String, default: "" }, 
    release_date: { type: String, required: true },
    original_language: { type: String },
    tagline: { type: String, default: "" },
    genres: { type: [String], required: true },
    casts: { type: [String], required: true },
    vote_average: { type: Number, required: true },
    runtime: { type: Number, required: true }
  },
  { timestamps: true }
);

const Movie = mongoose.model('Movie', movieSchema);

export default Movie;