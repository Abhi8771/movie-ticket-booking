import React, { useEffect, useState } from 'react';
import Loading from '../../components/Loading';
import Title from '../../components/admin/Title';
import { CheckIcon, DeleteIcon, StarsIcon } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import toast from 'react-hot-toast';

const AddShows = () => {
  const { axios, getToken, user } = useAppContext();
  const currency = import.meta.env.VITE_CURRENCY;

  const [nowPlayingMovies, setNowPlayingMovies] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [dateTimeSelection, setDateTimeSelection] = useState({});
  const [dateTimeInput, setDateTimeInput] = useState('');
  const [showPrice, setShowPrice] = useState('');
  const [addingShow, setAddingShow] = useState(false);

  const fetchNowPlayingMovies = async () => {
    try {
      const { data } = await axios.get('/api/shows/now-playing', {
        headers: { Authorization: `Bearer ${await getToken()}` },
      });
      if (data.success) {
        setNowPlayingMovies(data.movies);
      }
    } catch (error) {
      console.error('Error fetching movies:', error);
    }
  };

  const handleDateTimeAdd = () => {
    if (!dateTimeInput) return;
    const [date, time] = dateTimeInput.split('T');
    if (!date || !time) return;

    setDateTimeSelection((prev) => {
      const times = prev[date] || [];
      if (!times.includes(time)) {
        return { ...prev, [date]: [...times, time] };
      }
      return prev;
    });
  };

  const handleRemoveTime = (date, time) => {
    setDateTimeSelection((prev) => {
      const filteredTimes = prev[date].filter((t) => t !== time);
      if (filteredTimes.length === 0) {
        const { [date]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [date]: filteredTimes };
    });
  };

  const handleSubmit = async () => {
    try {
      setAddingShow(true);

      if (!selectedMovie || Object.keys(dateTimeSelection).length === 0 || !showPrice) {
        toast.error('Missing required fields');
        return;
      }

      const showsInput = Object.entries(dateTimeSelection).map(([date, time]) => ({ date, time }));

      const payload = {
        movieId: selectedMovie,
        showsInput,
        showPrice: Number(showPrice),
      };

      const { data } = await axios.post('/api/shows/add', payload, {
        headers: { Authorization: `Bearer ${await getToken()}` },
      });

      if (data.success) {
        toast.success(data.message);
        setSelectedMovie(null);
        setDateTimeSelection({});
        setShowPrice('');
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setAddingShow(false);
    }
  };

  useEffect(() => {
    if (user) fetchNowPlayingMovies();
  }, [user]);

  return nowPlayingMovies.length > 0 ? (
    <>
      <Title text1="Add" text2="Shows" />

      <div className="grid lg:grid-cols-3 gap-10 mt-10">
        {/* Movie Selection*/}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold mb-3">🎬 Select a Movie</h2>
          <div className="overflow-y-auto max-h-[600px] pr-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {nowPlayingMovies.map((movie, index) => (
                <div
                  key={index}
                  className={`relative w-full cursor-pointer transition-all rounded-md border hover:border-primary ${
                    selectedMovie === movie.imdbID
                      ? 'border-primary scale-105'
                      : 'border-gray-700'
                  }`}
                  onClick={() => setSelectedMovie(movie.imdbID)}
                >
                  <img
                    src={movie.Poster}
                    alt={movie.Title}
                    className="w-full h-60 object-cover rounded-t"
                  />
                  <div className="p-2 bg-black/70 rounded-b text-sm">
                    <div className="flex justify-between text-gray-300">
                      <span className="flex items-center gap-1">
                        <StarsIcon className="w-4 h-4 text-primary fill-primary" />
                        {movie.imdbRating ? parseFloat(movie.imdbRating).toFixed(1) : 'N/A'}
                      </span>
                      <span>{movie.Year}</span>
                    </div>
                    <p className="font-semibold truncate mt-1">{movie.Title}</p>
                    <p className="text-gray-400 text-xs">{movie.Released}</p>
                  </div>
                  {selectedMovie === movie.imdbID && (
                    <div className="absolute top-2 right-2 bg-primary h-6 w-6 rounded-full flex items-center justify-center">
                      <CheckIcon className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Show Details*/}
        <div className="lg:col-span-1">
          <h2 className="text-lg font-semibold mb-3">🎟️ Add Show Details</h2>

          {/* Show Price */}
          <div className="mb-5">
            <label className="block text-sm font-medium mb-1">Show Price</label>
            <div className="flex items-center gap-2 border border-gray-600 px-3 py-2 rounded-md">
              <span className="text-gray-400 text-sm">{currency}</span>
              <input
                min={0}
                type="number"
                value={showPrice}
                onChange={(e) => setShowPrice(e.target.value)}
                placeholder="Enter price"
                className="outline-none bg-transparent text-white w-full"
              />
            </div>
          </div>

          {/* Date & Time Input */}
          <div className="mb-5">
            <label className="block text-sm font-medium mb-1">Select Date & Time</label>
            <div className="flex gap-3 items-center">
              <input
                type="datetime-local"
                value={dateTimeInput}
                onChange={(e) => setDateTimeInput(e.target.value)}
                className="rounded-md text-white bg-black border border-gray-600 px-3 py-2 w-full"
              />
              <button
                onClick={handleDateTimeAdd}
                className="bg-primary/80 text-white px-4 py-2 rounded-md hover:bg-primary"
              >
                Add Time
              </button>
            </div>
          </div>

          {/* Selected Date-Times */}
          {Object.keys(dateTimeSelection).length > 0 && (
            <div className="mt-4">
              <h3 className="font-medium mb-2">Selected Time Slots</h3>
              {Object.entries(dateTimeSelection).map(([date, times]) => (
                <div key={date} className="mb-2">
                  <p className="text-sm font-medium">{date}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {times.map((time) => (
                      <div
                        key={time}
                        className="bg-black border border-primary px-3 py-1 rounded flex items-center text-sm"
                      >
                        <span>{time}</span>
                        <DeleteIcon
                          onClick={() => handleRemoveTime(date, time)}
                          className="ml-2 text-red-500 hover:text-red-700 cursor-pointer"
                          width={15}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6">
            <button
              onClick={handleSubmit}
              disabled={addingShow}
              className="bg-primary text-white px-10 py-2 rounded-md text-base hover:bg-primary/90 disabled:opacity-50 w-full"
            >
              {addingShow ? 'Adding...' : 'Add Show'}
            </button>
          </div>
        </div>
      </div>
    </>
  ) : (
    <Loading />
  );
};

export default AddShows;
