import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BlurCircle from '../components/BlurCircle';
import { Heart, PlayCircleIcon, StarIcon } from 'lucide-react';
import DateSelect from '../components/DateSelect';
import MovieCard from '../components/MovieCard';
import Loading from '../components/Loading';
import { useAppContext } from '../context/AppContext';
import toast from 'react-hot-toast';

const MovieDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // OMDB or internal movie ID
  const [show, setShow] = useState(null);

  const {
    shows,
    axios,
    getToken,
    user,
    fetchFavoriteMovies,
    favoriteMovies,
  } = useAppContext();

  const getShow = async () => {
    try {
      const { data } = await axios.get(`/api/shows/${id}`);
      if (data.success) {
        setShow(data);
      } else {
        toast.error('Failed to fetch movie details');
      }
    } catch (error) {
      console.log(error);
      toast.error('Error fetching movie details');
    }
  };

  const handleFavorite = async () => {
    try {
      if (!user) return toast.error('Please login to add to favorites');
      const { data } = await axios.post(
        '/api/user/update-favorite',
        { movieId: id },
        { headers: { Authorization: `Bearer ${await getToken()}` } }
      );
      if (data.success) {
        await fetchFavoriteMovies();
        toast.success(data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    getShow();
  }, [id]);

  if (!show) return <Loading />;

  const movie = show.movie || {};
  const placeholderImage = "https://dummyimage.com/300x450/1a1a1a/ffffff&text=No+Image";
  const poster = movie.poster_path || movie.Poster || placeholderImage;
  const title = movie.title || movie.Title || "Untitled Movie";
  const rating =
    movie.vote_average?.toFixed(1) ||
    parseFloat(movie.imdbRating)?.toFixed(1) ||
    "0.0";
  const genres = Array.isArray(movie.genres)
    ? movie.genres.join(", ")
    : movie.Genre || "Unknown";
  const runtime = movie.runtime
    ? `${movie.runtime} min`
    : movie.Runtime || "N/A";
  const releaseYear =
    movie.release_date?.split("-")[0] ||
    movie.Year ||
    "Unknown Year";
  const overview = movie.overview || movie.Plot || "No overview available.";
  const language = movie.original_language?.toUpperCase() || movie.Language?.toUpperCase() || 'ENGLISH';
  const actors = movie.casts || (movie.Actors?.split(',') || []);

  return (
    <div className="px-6 md:px-16 lg:px-40 pt-30 md:pt-50">
      <div className="flex flex-col md:flex-row gap-8 max-w-6xl mx-auto">
        <img
          src={poster}
          alt={title}
          className="max-md:mx-auto rounded-xl h-104 max-w-70 object-cover"
        />

        <div className="relative flex flex-col gap-3">
          <BlurCircle top="100px" left="100px" />
          <p className="text-primary">{language}</p>
          <h1 className="text-4xl font-semibold max-w-96 text-balance">{title}</h1>

          <div className="flex items-center gap-2 text-gray-300">
            <StarIcon className="w-5 h-5 text-primary fill-primary" />
            {rating} IMDb Rating
          </div>

          <p className="text-gray-400 mt-2 text-sm leading-tight max-w-xl">
            {overview}
          </p>

          <p>{runtime} · {genres} · {releaseYear}</p>

          <div className="flex items-center flex-wrap gap-4 mt-4">
            <button className="flex items-center gap-2 px-7 py-3 bg-gray-800 hover:bg-gray-900 transition rounded-md font-medium cursor-pointer text-white active:scale-95">
              <PlayCircleIcon className="w-5 h-5" />
              Watch Trailer
            </button>
            <a
              href="#dateSelect"
              className="px-10 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-md font-medium cursor-pointer active:scale-95"
            >
              Buy Tickets
            </a>
            <button
              onClick={handleFavorite}
              className="bg-gray-700 p-2.5 rounded-full transition cursor-pointer active:scale-95"
            >
              <Heart
                className={`w-5 h-5 ${
                  favoriteMovies.find((m) => m._id === id)
                    ? 'fill-primary text-primary'
                    : ''
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Casts */}
      {actors.length > 0 && (
        <>
          <p className="text-lg font-medium mt-20">Top Cast</p>
          <div className="mt-4 space-y-1">
            {actors.map((actor, index) => (
              <p key={index} className="text-sm text-gray-300">– {actor.trim()}</p>
            ))}
          </div>
        </>
      )}

      {/* Date Selection */}
      <DateSelect dateTime={show.dateTime} id={id} />

      {/* Suggestions */}
      <p className="text-lg font-medium mt-20 mb-8">You May Also Like</p>
      <div className="flex flex-wrap max-sm:justify-center gap-8">
        {shows?.slice(0, 4).map((m, index) => (
          <MovieCard key={index} movie={m.movie || m} />
        ))}
      </div>

      <div className="flex justify-center mt-20">
        <button
          onClick={() => {
            navigate('/movies');
            scrollTo(0, 0);
          }}
          className="px-10 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-md font-medium cursor-pointer"
        >
          Show More
        </button>
      </div>
    </div>
  );
};

export default MovieDetails;
