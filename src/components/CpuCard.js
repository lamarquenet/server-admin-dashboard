import React from 'react';
import { FaMicrochip, FaThermometerHalf, FaTachometerAlt } from 'react-icons/fa';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
);

const CpuCard = ({ cpu }) => {
  // Generate labels for the chart (last 10 seconds)
  const labels = Array.from({ length: 10 }, (_, i) => `${i}s ago`).reverse();
  
  // Sample data for the chart (would be replaced with real-time data)
  const data = {
    labels,
    datasets: [
      {
        fill: true,
        label: 'CPU Usage',
        data: [
          parseFloat(cpu.usage) * 0.7,
          parseFloat(cpu.usage) * 0.8,
          parseFloat(cpu.usage) * 0.9,
          parseFloat(cpu.usage) * 0.85,
          parseFloat(cpu.usage) * 0.95,
          parseFloat(cpu.usage) * 1.05,
          parseFloat(cpu.usage) * 0.9,
          parseFloat(cpu.usage) * 0.85,
          parseFloat(cpu.usage) * 0.95,
          parseFloat(cpu.usage),
        ],
        borderColor: 'rgb(14, 165, 233)',
        backgroundColor: 'rgba(14, 165, 233, 0.2)',
        tension: 0.4,
      },
    ],
  };
  
  const options = {
    responsive: true,
    scales: {
      y: {
        min: 0,
        max: 100,
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
    elements: {
      point: {
        radius: 2,
        hoverRadius: 4,
      },
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
  };
  
  // Determine color based on CPU usage
  const getUsageColor = (usage) => {
    const usageNum = parseFloat(usage);
    if (usageNum < 50) return 'text-green-500';
    if (usageNum < 80) return 'text-yellow-500';
    return 'text-red-500';
  };
  
  // Determine color based on CPU temperature
  const getTempColor = (temp) => {
    const tempNum = parseFloat(temp);
    if (tempNum < 60) return 'text-green-500';
    if (tempNum < 80) return 'text-yellow-500';
    return 'text-red-500';
  };
  
  return (
    <div className="card">
      <div className="card-header">
        <span className="flex items-center">
          <FaMicrochip className="mr-2" />
          CPU Information
        </span>
      </div>
      
      <div className="mt-4">
        <div className="flex flex-wrap justify-between mb-4">
          <div className="flex items-center mb-2 md:mb-0">
            <FaTachometerAlt className={`mr-2 ${getUsageColor(cpu.usage)}`} />
            <span className="text-gray-400 mr-2">Usage:</span>
            <span className={`font-semibold ${getUsageColor(cpu.usage)}`}>{cpu.usage}%</span>
          </div>
          
          <div className="flex items-center mb-2 md:mb-0">
            <FaThermometerHalf className={`mr-2 ${getTempColor(cpu.temperature)}`} />
            <span className="text-gray-400 mr-2">Temperature:</span>
            <span className={`font-semibold ${getTempColor(cpu.temperature)}`}>{cpu.temperature}°C</span>
          </div>
          
          <div className="flex items-center">
            <FaTachometerAlt className="mr-2 text-blue-500" />
            <span className="text-gray-400 mr-2">Speed:</span>
            <span className="font-semibold text-blue-500">{cpu.speed} GHz</span>
          </div>
        </div>
        
        <div className="h-64">
          <Line options={options} data={data} />
        </div>
        
        {cpu.cores && cpu.cores.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">Core Usage</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {cpu.cores.map((core, index) => (
                <div key={index} className="bg-dark-600 rounded p-2">
                  <div className="text-xs text-gray-400 mb-1">Core {index}</div>
                  <div className="w-full bg-dark-500 rounded-full h-2.5">
                    <div 
                      className={`h-2.5 rounded-full ${getUsageColor(core.load)}`}
                      style={{ width: `${core.load}%` }}
                    ></div>
                  </div>
                  <div className="text-xs mt-1 text-right">{core.load}%</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CpuCard;