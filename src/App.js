import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';

// Components
import Header from './components/Header';
import SystemOverview from './components/SystemOverview';
import CpuCard from './components/CpuCard';
import MemoryCard from './components/MemoryCard';
import GpuCards from './components/GpuCards';
import PowerControl from './components/PowerControl';
import Footer from './components/Footer';
import VllmControl from './components/VllmControl';

// API URLs
const API_URL = process.env.REACT_APP_API_URL || 'http://192.168.8.209:8002';
const WOL_SERVICE_URL = process.env.REACT_APP_WOL_SERVICE_URL || 'http://192.168.8.170:8002';

function App() {
  const [systemInfo, setSystemInfo] = useState({
    cpu: { usage: 0, temperature: 0, speed: 0, cores: [] },
    memory: { total: '0 GB', used: '0 GB', free: '0 GB', usagePercentage: 0 },
    gpus: []
  });
  const [powerStatus, setPowerStatus] = useState('unknown');
  const [loading, setLoading] = useState(true);
  // Using array destructuring to ignore the setter function since it's not used
  const [error] = useState(null);
  const [socket, setSocket] = useState(null);

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io(API_URL);
    setSocket(newSocket);

    // Clean up on unmount
    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Listen for system info updates
  useEffect(() => {
    if (!socket) return;

    // Handle initial connection
    socket.on('connect', () => {
      console.log('Connected to server');
    });

    // Handle system info updates
    socket.on('systemInfo', (data) => {
      setSystemInfo(data);
      setLoading(false);
    });

    // Handle errors
    socket.on('connect_error', (err) => {
      // Don't set error, just mark as not loading and set power status to offline
      setLoading(false);
      setPowerStatus('offline');
    });

    // Clean up event listeners
    return () => {
      socket.off('connect');
      socket.off('systemInfo');
      socket.off('connect_error');
    };
  }, [socket]);

  // Fetch power status
  useEffect(() => {
    const fetchPowerStatus = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/power/status`, { timeout: 3000 });
        setPowerStatus(response.data.status);
      } catch (err) {
        // Only set to offline if we're not in the starting state
        if (powerStatus !== 'starting') {
          setPowerStatus('offline');
        }
      }
    };

    fetchPowerStatus();
    
    // Poll for power status every 10 seconds
    const interval = setInterval(fetchPowerStatus, 10000);
    
    return () => clearInterval(interval);
  }, [powerStatus]); // Add powerStatus as dependency



  if (loading) {
    return (
      <div className="min-h-screen bg-dark-800 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-lg">Loading system information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-dark-800 text-white flex flex-col">
        <Header />
        
        <main className="flex-grow container mx-auto px-4 py-6">
          <div className="text-center mb-8">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold mb-2">Connection Error</h1>
            <p className="text-lg mb-4">{error}</p>
            <button
              className="btn btn-primary"
              onClick={() => window.location.reload()}
            >
              Retry Connection
            </button>
          </div>
          
          {/* Always show power control even when there's an error */}
          <div className="lg:col-span-4">
            <PowerControl
              status={powerStatus}
              onStatusChange={setPowerStatus}
            />
          </div>
        </main>
        
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-800 text-white flex flex-col">
      <Header />
        <main className="flex-grow container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">          {/* Always show Power Control when offline or starting */}
          {(powerStatus === 'offline' || powerStatus === 'starting') ? (
            <div className="lg:col-span-4">
              <PowerControl
                status={powerStatus}
                onStatusChange={setPowerStatus}
              />
            </div>
          ) : (
            <>
              {/* System Overview */}
              <div className="lg:col-span-4">
                <SystemOverview systemInfo={systemInfo} powerStatus={powerStatus} />
              </div>
              
              {/* CPU and Memory */}
              <div className="lg:col-span-2">
                <CpuCard cpu={systemInfo.cpu} />
              </div>
              <div className="lg:col-span-2">
                <MemoryCard memory={systemInfo.memory} />
              </div>
              
              {/* GPUs */}
              <div className="lg:col-span-4">
                <GpuCards gpus={systemInfo.gpus} />
              </div>

              {/* Vllm Control */}
              <div className="lg:col-span-4">
                <VllmControl />
              </div>
              
              {/* Power Control */}
              <div className="lg:col-span-4">
                <PowerControl
                  status={powerStatus}
                  onStatusChange={setPowerStatus}
                />
              </div>
            </>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}

export default App;