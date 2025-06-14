import React from 'react';
import { FaPlay } from 'react-icons/fa';

const VllmControl = ({ onRunVllm }) => {

  // Handle run Vllm click
  const handleRunVllmClick = () => {
    onRunVllm();
  };

  return (
    <div className="card">
      <div className="card-header">
        <span className="flex items-center">
          <FaPlay className="mr-2" />
          Run Vllm
        </span>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex space-x-4">
            <button
              className="btn btn-primary"
              onClick={handleRunVllmClick}
            >
              <span className="flex items-center">
                <FaPlay className="mr-2" />
                Run Vllm
              </span>
            </button>
          </div>
        </div>

        <div className="bg-dark-600 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-2">Vllm Control Information</h3>
          <p className="text-sm text-gray-300 mb-2">
            This section allows you to start the Vllm service on your server.
          </p>
        </div>
      </div>
    </div>
  );
};

export default VllmControl;