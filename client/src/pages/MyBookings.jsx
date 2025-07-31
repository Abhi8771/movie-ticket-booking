import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Loading from '../components/Loading';
import BlurCircle from '../components/BlurCircle';
import timeFormat from '../lib/timeFormat';
import { dateFormat } from '../lib/dateFormat';
import { useAppContext } from '../context/AppContext';

const MyBookings = () => {
  const currency = import.meta.env.VITE_CURRENCY;
  const { axios, getToken, user } = useAppContext();
  const location = useLocation(); 

  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Get user's bookings
  const getMyBookings = async () => {
    try {
      const { data } = await axios.get('/api/user/bookings', {
        headers: { Authorization: `Bearer ${await getToken()}` }
      });

      if (data.success) {
        setBookings(data.bookings);
      }
    } catch (error) {
      console.log('Failed to fetch bookings:', error);
    }
    setIsLoading(false);
  };

  //Initial fetch when user is available
  useEffect(() => {
    if (user) {
      getMyBookings();
    }
  }, [user]);

  //Re-fetch if Stripe redirects with ?payment=success
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    if (query.get('payment') === 'success') {
      getMyBookings();
    }
  }, [location.search]);

  return !isLoading ? (
    <div className='relative px-6 md:px-16 lg:px-40 pt-30 md:pt-40 min-h-[80vh]'>
      <BlurCircle top='100px' left='100px' />
      <div>
        <BlurCircle bottom='0px' left='600px' />
      </div>

      <h1 className='text-lg font-semibold mb-4'>My Bookings</h1>

      {bookings.length === 0 && (
        <p className='text-gray-400'>No bookings found.</p>
      )}

      {bookings.map((item, index) => (
        <div
          key={index}
          className='flex flex-col md:flex-row justify-between bg-primary/8 border border-primary/20 rounded-lg mt-4 p-2 max-w-3xl'
        >
          {/* Movie Poster + Info */}
          <div className='flex flex-col md:flex-row'>
            <img
              src={item.show.movie.poster_path}
              alt='movie poster'
              className='md:max-w-45 aspect-video h-auto object-cover object-bottom rounded'
            />
            <div className='flex flex-col p-4'>
              <p className='text-lg font-semibold'>{item.show.movie.title}</p>
              <p className='text-gray-400 text-sm'>
                {timeFormat(item.show.movie.runtime)}
              </p>
              <p className='text-gray-400 text-sm mt-auto'>
                {dateFormat(item.show.showDateTime)}
              </p>
            </div>
          </div>

          {/* Price, Pay Button, Seats Info */}
          <div className='flex flex-col md:items-end md:text-right justify-between p-4'>
            <div className='flex items-center gap-4'>
              <p className='text-2xl font-semibold mb-3'>
                {currency}
                {item.amount}
              </p>

              {!item.isPaid && item.paymentLink ? (
                <a
                  href={item.paymentLink}
                  className='bg-primary px-4 py-1.5 mb-3 text-sm rounded-full font-medium cursor-pointer'
                  target='_blank'
                  rel='noopener noreferrer'
                >
                  Pay Now
                </a>
              ) : !item.isPaid && !item.paymentLink ? (
                <p className='text-sm text-red-500'>Payment link unavailable</p>
              ) : null}
            </div>

            <div className='text-sm'>
              <p>
                <span className='text-gray-400'>Total Tickets: </span>
                {item.bookedSeats.length}
              </p>
              <p>
                <span className='text-gray-400'>Seat Numbers: </span>
                {item.bookedSeats.join(', ')}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  ) : (
    <Loading />
  );
};

export default MyBookings;
