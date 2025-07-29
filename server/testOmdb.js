import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const testOmdb = async () => {
  try {
    const { data } = await axios.get('http://www.omdbapi.com/', {
      params: {
        t: 'Inception',
        apikey: process.env.OMDB_API_KEY
      }
    });
    console.log("OMDB TEST RESPONSE:", data);
  } catch (err) {
    console.log("OMDB TEST ERROR:", err.message);
  }
};

testOmdb();
