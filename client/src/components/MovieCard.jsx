import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Star as StarIcon } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const MovieCard = ({ movie }) => {
  const navigate = useNavigate();

  const handleNavigate = () => {
    if (movie?._id) {
      navigate(`/movies/${movie._id}`);
      scrollTo(0, 0);
    }
  };

  const placeholderImage = "https://dummyimage.com/300x450/1a1a1a/ffffff&text=No+Image";
  const poster = movie?.poster_path || placeholderImage;
  const title = movie?.title || movie?.Title || "Untitled";
  const year = movie?.release_date
    ? new Date(movie.release_date).getFullYear()
    : movie?.Year || "Unknown Year";
  const genres = Array.isArray(movie?.genres)
    ? movie.genres.slice(0, 2).join(" | ")
    : movie?.Genre || "Unknown Genres";
  const runtime = movie?.runtime
    ? `${movie.runtime} min`
    : movie?.Runtime || "N/A";
  const rating =
    movie?.vote_average?.toFixed(1) ||
    parseFloat(movie?.imdbRating)?.toFixed(1) ||
    "0.0";
  const votes = movie?.vote_count || movie?.imdbVotes || 0;

  return (
    <div className="flex flex-col justify-between p-3 bg-gray-800 rounded-2xl hover:-translate-y-1 transition duration-300 w-66">
      <img
        onClick={handleNavigate}
        src={poster}
        alt={title}
        className="rounded-lg h-52 w-full object-cover object-center cursor-pointer"
      />

      <p className="font-semibold mt-2 truncate">{title}</p>
      <p className="text-sm text-gray-400 mt-2">
        {year} • {genres} • {runtime}
      </p>

      <div className="flex items-center justify-between mt-4 pb-3">
        <button
          onClick={handleNavigate}
          className="px-4 py-2 text-xs bg-primary hover:bg-primary-dull transition rounded-full font-medium cursor-pointer"
        >
          Buy Tickets
        </button>
        <p className="flex items-center gap-1 text-sm text-gray-400 mt-1 pr-1">
          <StarIcon className="w-4 h-4 text-primary fill-primary" />
          {rating} ({votes})
        </p>
      </div>
    </div>
  );
};

export default MovieCard;
