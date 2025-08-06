import React from 'react';
import { assets } from '../assets/assets';

const Footer = () => {
  return (
    <footer className="flex flex-col md:flex-row justify-between items-center text-sm rounded-2xl m-4 w-full mx-auto bg-black text-white px-6 py-8 gap-8">
      
      {/* Left Side - Logo and Text */}
      <div className="flex flex-col items-center md:items-start text-center md:text-left max-w-xs">
        <img className="w-14 h-auto mb-3 rounded-xl shadow-md" alt="logo" src={assets.logo} />
        <p className="text-xs text-gray-300">
          Lorem Ipsum has been the industry's standard dummy text ever since the 1500s.
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
        className="w-40 md:w-52 mt-4 md:mt-0 rounded-xl shadow-lg"
        src="https://raw.githubusercontent.com/prebuiltui/prebuiltui/main/assets/appDownload/excitedWomenImage.png"
        alt="excitedWomenImage"
      />
    </footer>
  );
};

export default Footer;
