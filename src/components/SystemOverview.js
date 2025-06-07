import React from 'react';
import { FaServer, FaMicrochip, FaMemory, FaThermometerHalf } from 'react-icons/fa';

const SystemOverview = ({ systemInfo, powerStatus }) => {
  const { cpu, memory, gpus } = systemInfo;
  
  // Calculate average GPU temperature and utilization
  const avgGpuTemp = gpus.length > 0
    ? (gpus.reduce((sum, gpu) => sum + parseFloat(gpu.temperature || 0), 0) / gpus.length).toFixed(1)
    : 'N/A';
    
  const avgGpuUtil = gpus.length > 0
    ? (gpus.reduce((sum, gpu) => sum + parseFloat(gpu.utilization || 0), 0) / gpus.length).toFixed(1)
    : 'N/A';
  
  // Determine status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'offline':
        return 'bg-red-500';
      case 'starting':
        return 'bg-yellow-500 animate-pulse';
      default:
        return 'bg-gray-500';
    }
  };
  
  return (
    <div className="card mb-6">
      <div className="card-header">
        <span className="flex items-center">
          <FaServer className="mr-2" />
          System Overview
        </span>
        <div className="flex items-center">
          <span className="text-sm mr-2">Status:</span>
          <span className="flex items-center">
            <span className={`h-3 w-3 rounded-full ${getStatusColor(powerStatus)} mr-2`}></span>
            <span className="capitalize">{powerStatus}</span>
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        {/* CPU Overview */}
        <div className="bg-dark-600 rounded-lg p-4 flex items-center">
          <div className="rounded-full bg-primary-900 p-3 mr-4">
            <FaMicrochip className="text-primary-400 text-xl" />
          </div>
          <div>
            <h3 className="text-gray-400 text-sm">CPU Usage</h3>
            <div className="flex items-baseline">
              <span className="text-2xl font-semibold">{cpu.usage}%</span>
              <span className="text-gray-400 text-sm ml-2">{cpu.temperature}°C</span>
            </div>
          </div>
        </div>
        
        {/* Memory Overview */}
        <div className="bg-dark-600 rounded-lg p-4 flex items-center">
          <div className="rounded-full bg-secondary-900 p-3 mr-4">
            <FaMemory className="text-secondary-400 text-xl" />
          </div>
          <div>
            <h3 className="text-gray-400 text-sm">Memory Usage</h3>
            <div className="flex items-baseline">
              <span className="text-2xl font-semibold">{memory.usagePercentage}%</span>
              <span className="text-gray-400 text-sm ml-2">{memory.used} / {memory.total}</span>
            </div>
          </div>
        </div>
        
        {/* GPU Overview */}
        <div className="bg-dark-600 rounded-lg p-4 flex items-center">
          <div className="rounded-full bg-green-900 p-3 mr-4">
            <FaMicrochip className="text-green-400 text-xl" />
          </div>
          <div>
            <h3 className="text-gray-400 text-sm">GPU Utilization</h3>
            <div className="flex items-baseline">
              <span className="text-2xl font-semibold">{avgGpuUtil}%</span>
              <span className="text-gray-400 text-sm ml-2">{gpus.length} GPUs</span>
            </div>
          </div>
        </div>
        
        {/* Temperature Overview */}
        <div className="bg-dark-600 rounded-lg p-4 flex items-center">
          <div className="rounded-full bg-red-900 p-3 mr-4">
            <FaThermometerHalf className="text-red-400 text-xl" />
          </div>
          <div>
            <h3 className="text-gray-400 text-sm">Avg. GPU Temp</h3>
            <div className="flex items-baseline">
              <span className="text-2xl font-semibold">{avgGpuTemp}°C</span>
              <span className="text-gray-400 text-sm ml-2">Max: {
                gpus.length > 0 
                  ? Math.max(...gpus.map(gpu => parseFloat(gpu.temperature || 0))).toFixed(1) 
                  : 'N/A'
              }°C</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemOverview;