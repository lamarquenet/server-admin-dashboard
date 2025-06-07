import React from 'react';
import { FaMemory } from 'react-icons/fa';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend);

const MemoryCard = ({ memory }) => {
  // Parse memory usage percentage
  const usagePercentage = parseFloat(memory.usagePercentage) || 0;
  const freePercentage = 100 - usagePercentage;
  
  // Chart data
  const data = {
    labels: ['Used', 'Free'],
    datasets: [
      {
        data: [usagePercentage, freePercentage],
        backgroundColor: [
          'rgba(14, 165, 233, 0.8)',
          'rgba(30, 41, 59, 0.8)',
        ],
        borderColor: [
          'rgba(14, 165, 233, 1)',
          'rgba(30, 41, 59, 1)',
        ],
        borderWidth: 1,
        hoverOffset: 4,
      },
    ],
  };
  
  // Chart options
  const options = {
    responsive: true,
    cutout: '70%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: 'rgba(255, 255, 255, 0.7)',
          padding: 10,
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: 'rgba(255, 255, 255, 0.9)',
        bodyColor: 'rgba(255, 255, 255, 0.9)',
        borderColor: 'rgba(14, 165, 233, 0.5)',
        borderWidth: 1,
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.raw || 0;
            return `${label}: ${value.toFixed(2)}%`;
          }
        }
      },
    },
  };
  
  // Determine color based on memory usage
  const getUsageColor = (usage) => {
    if (usage < 50) return 'text-green-500';
    if (usage < 80) return 'text-yellow-500';
    return 'text-red-500';
  };
  
  return (
    <div className="card">
      <div className="card-header">
        <span className="flex items-center">
          <FaMemory className="mr-2" />
          Memory Information
        </span>
      </div>
      
      <div className="mt-4 flex flex-col md:flex-row items-center">
        <div className="w-full md:w-1/2 mb-4 md:mb-0 relative">
          <Doughnut data={data} options={options} />
          <div className="absolute inset-0 flex items-center justify-center flex-col">
            <span className={`text-3xl font-bold ${getUsageColor(usagePercentage)}`}>
              {usagePercentage}%
            </span>
            <span className="text-xs text-gray-400">Used</span>
          </div>
        </div>
        
        <div className="w-full md:w-1/2 pl-0 md:pl-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-1">Total Memory</h3>
              <p className="text-xl font-semibold">{memory.total}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-1">Used Memory</h3>
              <p className="text-xl font-semibold text-primary-500">{memory.used}</p>
              <div className="w-full bg-dark-500 rounded-full h-2.5 mt-1">
                <div 
                  className={`h-2.5 rounded-full ${getUsageColor(usagePercentage)}`}
                  style={{ width: `${usagePercentage}%` }}
                ></div>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-1">Free Memory</h3>
              <p className="text-xl font-semibold text-dark-300">{memory.free}</p>
              <div className="w-full bg-dark-500 rounded-full h-2.5 mt-1">
                <div 
                  className="h-2.5 rounded-full bg-dark-400"
                  style={{ width: `${freePercentage}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemoryCard;