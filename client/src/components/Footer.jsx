import React from 'react';
import { assets } from '../assets/assets';

const Footer = () => {
  return (
    <footer className="flex flex-col md:flex-row items-center justify-between text-sm rounded-2xl m-4 max-w-6xl w-full mx-auto bg-black text-white px-8 py-12">
      
      {/* Left Side - Text Content */}
      <div className="flex flex-col text-center md:text-left items-center md:items-start">
        <img className="w-28 h-auto mb-4 rounded-xl shadow-md" alt="logo" src={assets.logo} />
        
        <p className="text-sm max-w-md text-gray-300">
          Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer scrambled it to make a type specimen book.
        </p>

        <div className="flex items-center gap-3 mt-4">
          <img src={assets.googlePlay} alt="google play" className="h-10 w-auto rounded-md shadow" />
          <img src={assets.appStore} alt="app store" className="h-10 w-auto rounded-md shadow" />
        </div>

        <div className="flex flex-col md:flex-row gap-12 mt-8">
          <div>
            <h2 className="font-semibold mb-3 text-white">Company</h2>
            <ul className="text-sm space-y-2 text-gray-400">
              <li><a href="#">Home</a></li>
              <li><a href="#">About us</a></li>
              <li><a href="#">Contact us</a></li>
              <li><a href="#">Privacy policy</a></li>
            </ul>
          </div>
          <div>
            <h2 className="font-semibold mb-3 text-white">Get in touch</h2>
            <div className="text-sm space-y-2 text-gray-400">
              <p>+1-234-567-890</p>
              <p>contact@example.com</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Image */}
      <img
        className="max-w-sm w-full mt-10 md:mt-0 rounded-2xl shadow-lg"
        src="https://raw.githubusercontent.com/prebuiltui/prebuiltui/main/assets/appDownload/excitedWomenImage.png"
        alt="excitedWomenImage"
      />
    </footer>
  );
};

export default Footer;
