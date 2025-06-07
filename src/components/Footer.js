import React from 'react';
import { FaGithub, FaHeart } from 'react-icons/fa';

const Footer = () => {
  return (
    <footer className="bg-dark-900 py-4 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="text-sm text-gray-400 mb-2 md:mb-0">
            &copy; {new Date().getFullYear()} Server Admin Dashboard
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-400 flex items-center">
              Made with <FaHeart className="text-red-500 mx-1" /> for Raspberry Pi
            </span>
            
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors duration-200"
              aria-label="GitHub Repository"
            >
              <FaGithub className="text-xl" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;