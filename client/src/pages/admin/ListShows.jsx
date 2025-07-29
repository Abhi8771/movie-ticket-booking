
import React, { useEffect, useState } from 'react';
import Loading from '../../components/Loading';
import Title from '../../components/admin/title';
import dateFormat from '../../lib/dateFormat';
import { useAppContext } from '../../context/AppContext';
import { TrashIcon } from 'lucide-react';

const ListShows = () => {
  const { axios, getToken, user } = useAppContext();

  const currency = import.meta.env.VITE_CURRENCY;

  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);

  // FETCH ALL SHOWS
  const getAllShows = async () => {
    try {
      const { data } = await axios.get("/api/admin/all-shows", {
        headers: { Authorization: `Bearer ${await getToken()}` },
      });
      setShows(data.shows);
    } catch (error) {
      console.error("Error fetching shows:", error);
    } finally {
      setLoading(false);
    }
  };

  // DELETE SHOW HANDLER
  const handleDeleteShow = async (showId) => {
    const confirmDelete = confirm("Are you sure you want to delete this show?");
    if (!confirmDelete) return;

    try {
      await axios.delete(`/api/admin/delete-show/${showId}`, {
        headers: { Authorization: `Bearer ${await getToken()}` },
      });
      // Refresh list after deletion
      getAllShows();
    } catch (error) {
      console.error("Failed to delete show:", error);
      alert("Error deleting show.");
    }
  };

  useEffect(() => {
    if (user) {
      getAllShows();
    }
  }, [user]);

  return !loading ? (
    <>
      <Title text1="List" text2="Shows" />
      <div className="max-w-4xl mt-6 overflow-x-auto">
        <table className="w-full border-collapse rounded-md overflow-hidden text-nowrap">
          <thead>
            <tr className="bg-primary/20 text-left text-white">
              <th className="p-2 font-medium pl-5">Movie Name</th>
              <th className="p-2 font-medium">Show Time</th>
              <th className="p-2 font-medium">Total Bookings</th>
              <th className="p-2 font-medium">Earnings</th>
              <th className="p-2 font-medium text-right pr-5">Action</th>
            </tr>
          </thead>
          <tbody className="text-sm font-light">
            {shows.map((show, index) => (
              <tr
                key={index}
                className="border-b border-primary/10 bg-primary/5 even:bg-primary/10"
              >
                <td className="p-2 min-w-45 pl-5">{show.movie.title}</td>
                <td className="p-2">{dateFormat(show.showDateTime)}</td>
                <td className="p-2">{Object.keys(show.occupiedSeats).length}</td>
                <td className="p-2">
                  {currency}
                  {Object.keys(show.occupiedSeats).length * show.showPrice}
                </td>
                <td className="p-2 text-right pr-5">
                  <button
                    onClick={() => handleDeleteShow(show._id)}
                    className="text-red-600 hover:text-red-800 cursor-pointer"
                    title="Delete Show"
                  >
                    <TrashIcon />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  ) : (
    <Loading />
  );
};

export default ListShows;
