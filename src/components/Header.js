import React from 'react';
import { FaServer, FaCog } from 'react-icons/fa';

const Header = () => {
  return (
    <header className="bg-dark-900 shadow-md">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <FaServer className="text-primary-500 text-2xl mr-2" />
            <h1 className="text-xl font-bold text-white">Server Admin Dashboard</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-400">
              <span>Last updated: </span>
              <span>{new Date().toLocaleTimeString()}</span>
            </div>
            
            <button 
              className="p-2 rounded-full hover:bg-dark-700 transition-colors duration-200"
              aria-label="Settings"
            >
              <FaCog className="text-gray-400 hover:text-white" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;