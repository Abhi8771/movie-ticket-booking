import Movie from '../models/Movie.js';

export async function findMovieByTitle(title) {
  if (!title) return null;
  return Movie.findOne(
    { title: new RegExp(title, 'i') },
    { _id: 1, title: 1, overview: 1, poster_path: 1, vote_average: 1, runtime: 1 }
  ).lean();
}
