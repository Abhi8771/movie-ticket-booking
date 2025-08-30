import React from 'react';
import { assets } from '../assets/assets';
import footerpng from '../assets/footerpng.png';

const Footer = () => {
  return (
    <footer className="flex flex-col md:flex-row justify-between items-center text-sm rounded-2xl m-4 w-full mx-auto bg-black text-white px-6 py-8 gap-8">
      
      {/* Left Side - Logo and Text */}
      <div className="flex flex-col items-center md:items-start text-center md:text-left max-w-xs">
        <img className="w-14 h-auto mb-3 rounded-xl shadow-md" alt="logo" src={assets.logo} />
        <p className="text-xs text-gray-300">
          Your gateway to the best movie experience.Redefining your cinematic journey.
        </p>
        <div className="flex items-center gap-3 mt-3">
          <img src={assets.googlePlay} alt="google play" className="h-8 w-auto rounded-md shadow cursor-pointer" />
          <img src={assets.appStore} alt="app store" className="h-8 w-auto rounded-md shadow cursor-pointer" />
        </div>
      </div>

      {/* Center - Company & Contact */}
      <div className="flex flex-col md:flex-row gap-12 text-center md:text-left">
        <div>
          <h2 className="font-semibold mb-2 text-white">Company</h2>
          <ul className="text-xs space-y-1 text-gray-400">
            <li><a href="#">Home</a></li>
            <li><a href="#">About us</a></li>
            <li><a href="#">Contact us</a></li>
            <li><a href="#">Privacy policy</a></li>
          </ul>
        </div>
        <div>
          <h2 className="font-semibold mb-2 text-white">Get in touch</h2>
          <div className="text-xs space-y-1 text-gray-400">
            <p className='cursor-pointer'>+91 7012787491</p>
            <p className='cursor-pointer'>abhi8771@gmail.com</p>
          </div>
        </div>
      </div>

      {/* Right Side - Image */}
      <img
        className="w-52 md:w-64 mt-4 md:mt-0 md:self-end rounded-xl shadow-lg -mb-4"
  src={footerpng}
  alt="excitedWomenImage"
      />
    </footer>
  );
};

export default Footer;
