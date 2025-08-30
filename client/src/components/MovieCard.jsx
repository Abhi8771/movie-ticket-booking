import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star as StarIcon } from 'lucide-react';
import timeFormat from '../lib/timeFormat';


const MovieCard = ({ movie }) => {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const cardRef = useRef(null);

  const handleNavigate = () => {
    if (movie?._id) {
      navigate(`/movies/${movie._id}`);
      scrollTo(0, 0);
    }
  };

  const handleMouseMove = (e) => {
    const bounds = cardRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - bounds.left, y: e.clientY - bounds.top });
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
    ? timeFormat(Number(movie.runtime))
    : movie?.Runtime || "N/A";

  const rating =
    movie?.vote_average?.toFixed(1) ||
    parseFloat(movie?.imdbRating)?.toFixed(1) ||
    "0.0";

  const votes = movie?.vote_count || movie?.imdbVotes || 0;

  return (
  <div
    ref={cardRef}
    onMouseMove={handleMouseMove}
    onMouseEnter={() => setVisible(true)}
    onMouseLeave={() => setVisible(false)}
    className="relative w-96 rounded-xl p-px bg-gray-900 backdrop-blur-md text-white overflow-hidden shadow-lg cursor-pointer transition-transform hover:-translate-y-1"
  >
    {/* Hover glow */}
    <div
      className={`pointer-events-none blur-3xl rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-300 size-60 absolute z-0 transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}
      style={{ top: position.y - 120, left: position.x - 120 }}
    />

    {/* Horizontal layout */}
    <div className="relative z-10 bg-gray-900/80 p-3 rounded-[11px] flex items-center gap-3">
      {/* Poster on the left */}
      <div className="w-32 h-48 overflow-hidden rounded-lg shrink-0">
        <img
          onClick={handleNavigate}
          src={poster}
          alt={title}
          className="w-full h-full object-cover object-center transition hover:scale-105"
        />
      </div>

      {/* Info on the right */}
      <div className="flex flex-col flex-1 text-left">
        <h2 className="text-base font-bold text-white mb-1 truncate">{title}</h2>
        <p className="text-sm text-indigo-400 mb-1">{year} • {genres}</p>
        <p className="text-xs text-slate-400 mb-2">{runtime}</p>

        <button
          onClick={handleNavigate}
          className="w-fit px-4 py-2 text-sm bg-primary hover:bg-primary-dull transition rounded-full font-medium mb-2 cursor-pointer"
        >
          Buy Tickets
        </button>

        <div className="flex items-center gap-1 text-sm text-gray-400">
          <StarIcon className="w-4 h-4 text-primary fill-primary" />
          {rating} ({votes})
        </div>
      </div>
    </div>
  </div>
);
}


export default MovieCard;
