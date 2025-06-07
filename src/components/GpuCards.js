import React, { useState } from 'react';
import { FaThermometerHalf, FaFan, FaBolt, FaMemory, FaMicrochip } from 'react-icons/fa';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const GpuCards = ({ gpus }) => {
  const [activeTab, setActiveTab] = useState('utilization');
  
  // Skip rendering if no GPUs
  if (!gpus || gpus.length === 0) {
    return (
      <div className="card">
        <div className="card-header">
          <span className="flex items-center">
            <FaMicrochip className="mr-2" />
            GPU Information
          </span>
        </div>
        <div className="p-4 text-center text-gray-400">
          No GPU information available
        </div>
      </div>
    );
  }
  
  // Prepare data for bar chart
  const chartData = {
    labels: gpus.map((_, index) => `GPU ${index}`),
    datasets: [
      {
        label: activeTab === 'utilization' ? 'Utilization (%)' : 
               activeTab === 'temperature' ? 'Temperature (°C)' : 
               activeTab === 'memory' ? 'Memory Usage (%)' : 
               'Power Usage (%)',
        data: gpus.map(gpu => {
          if (activeTab === 'utilization') {
            return parseFloat(gpu.utilization) || 0;
          } else if (activeTab === 'temperature') {
            return parseFloat(gpu.temperature) || 0;
          } else if (activeTab === 'memory') {
            const total = parseFloat(gpu.memoryTotal) || 1;
            const used = parseFloat(gpu.memoryUsed) || 0;
            return (used / total) * 100;
          } else {
            const limit = parseFloat(gpu.powerLimit) || 1;
            const draw = parseFloat(gpu.powerDraw) || 0;
            return (draw / limit) * 100;
          }
        }),
        backgroundColor: activeTab === 'utilization' ? 'rgba(14, 165, 233, 0.8)' : 
                         activeTab === 'temperature' ? 'rgba(239, 68, 68, 0.8)' : 
                         activeTab === 'memory' ? 'rgba(139, 92, 246, 0.8)' : 
                         'rgba(34, 197, 94, 0.8)',
        borderColor: activeTab === 'utilization' ? 'rgba(14, 165, 233, 1)' : 
                     activeTab === 'temperature' ? 'rgba(239, 68, 68, 1)' : 
                     activeTab === 'memory' ? 'rgba(139, 92, 246, 1)' : 
                     'rgba(34, 197, 94, 1)',
        borderWidth: 1,
      },
    ],
  };
  
  // Chart options
  const chartOptions = {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
        max: activeTab === 'temperature' ? 100 : 100,
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
      x: {
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
        },
        grid: {
          display: false,
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: 'rgba(255, 255, 255, 0.9)',
        bodyColor: 'rgba(255, 255, 255, 0.9)',
        borderColor: 'rgba(14, 165, 233, 0.5)',
        borderWidth: 1,
      },
    },
  };
  
  // Determine color based on temperature
  const getTempColor = (temp) => {
    const tempNum = parseFloat(temp);
    if (tempNum < 60) return 'text-green-500';
    if (tempNum < 80) return 'text-yellow-500';
    return 'text-red-500';
  };
  
  // Determine color based on utilization
  const getUtilColor = (util) => {
    const utilNum = parseFloat(util);
    if (utilNum < 50) return 'text-green-500';
    if (utilNum < 80) return 'text-yellow-500';
    return 'text-red-500';
  };
  
  // Determine color based on power usage
  const getPowerColor = (draw, limit) => {
    const drawNum = parseFloat(draw);
    const limitNum = parseFloat(limit);
    const percentage = (drawNum / limitNum) * 100;
    
    if (percentage < 50) return 'text-green-500';
    if (percentage < 80) return 'text-yellow-500';
    return 'text-red-500';
  };
  
  // Determine color based on memory usage
  const getMemoryColor = (used, total) => {
    const usedNum = parseFloat(used);
    const totalNum = parseFloat(total);
    const percentage = (usedNum / totalNum) * 100;
    
    if (percentage < 50) return 'text-green-500';
    if (percentage < 80) return 'text-yellow-500';
    return 'text-red-500';
  };
  
  return (
    <div className="card">
      <div className="card-header">
        <span className="flex items-center">
          <FaMicrochip className="mr-2" />
          GPU Information
        </span>
        <div className="text-sm">
          {gpus.length} {gpus.length === 1 ? 'GPU' : 'GPUs'} Detected
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-dark-600 mt-4">
        <button
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'utilization'
              ? 'text-primary-500 border-b-2 border-primary-500'
              : 'text-gray-400 hover:text-white'
          }`}
          onClick={() => setActiveTab('utilization')}
        >
          Utilization
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'temperature'
              ? 'text-red-500 border-b-2 border-red-500'
              : 'text-gray-400 hover:text-white'
          }`}
          onClick={() => setActiveTab('temperature')}
        >
          Temperature
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'memory'
              ? 'text-purple-500 border-b-2 border-purple-500'
              : 'text-gray-400 hover:text-white'
          }`}
          onClick={() => setActiveTab('memory')}
        >
          Memory
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'power'
              ? 'text-green-500 border-b-2 border-green-500'
              : 'text-gray-400 hover:text-white'
          }`}
          onClick={() => setActiveTab('power')}
        >
          Power
        </button>
      </div>
      
      {/* Chart */}
      <div className="mt-4 h-64">
        <Bar options={chartOptions} data={chartData} />
      </div>
      
      {/* GPU Cards */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {gpus.map((gpu, index) => (
          <div key={index} className="bg-dark-600 rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold">GPU {index}: {gpu.name}</h3>
              <span 
                className={`text-xs px-2 py-1 rounded-full ${
                  getUtilColor(gpu.utilization).replace('text-', 'bg-').replace('500', '900')
                } ${getUtilColor(gpu.utilization)}`}
              >
                {gpu.utilization}% Util
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center">
                <FaThermometerHalf className={`mr-2 ${getTempColor(gpu.temperature)}`} />
                <div>
                  <div className="text-xs text-gray-400">Temperature</div>
                  <div className={`font-semibold ${getTempColor(gpu.temperature)}`}>
                    {gpu.temperature}°C
                  </div>
                </div>
              </div>
              
              <div className="flex items-center">
                <FaFan className="mr-2 text-blue-500" />
                <div>
                  <div className="text-xs text-gray-400">Fan Speed</div>
                  <div className="font-semibold text-blue-500">
                    {gpu.fanSpeed}%
                  </div>
                </div>
              </div>
              
              <div className="flex items-center">
                <FaBolt className={`mr-2 ${getPowerColor(gpu.powerDraw, gpu.powerLimit)}`} />
                <div>
                  <div className="text-xs text-gray-400">Power</div>
                  <div className={`font-semibold ${getPowerColor(gpu.powerDraw, gpu.powerLimit)}`}>
                    {gpu.powerDraw}W / {gpu.powerLimit}W
                  </div>
                </div>
              </div>
              
              <div className="flex items-center">
                <FaMemory className={`mr-2 ${getMemoryColor(gpu.memoryUsed, gpu.memoryTotal)}`} />
                <div>
                  <div className="text-xs text-gray-400">Memory</div>
                  <div className={`font-semibold ${getMemoryColor(gpu.memoryUsed, gpu.memoryTotal)}`}>
                    {gpu.memoryUsed}MB / {gpu.memoryTotal}MB
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-3">
              <div className="text-xs text-gray-400 mb-1">Memory Usage</div>
              <div className="w-full bg-dark-500 rounded-full h-2.5">
                <div 
                  className={`h-2.5 rounded-full ${getMemoryColor(gpu.memoryUsed, gpu.memoryTotal).replace('text-', 'bg-')}`}
                  style={{ 
                    width: `${(parseFloat(gpu.memoryUsed) / parseFloat(gpu.memoryTotal) * 100) || 0}%` 
                  }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GpuCards;