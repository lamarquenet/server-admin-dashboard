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
      console.error('Socket connection error:', err);
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
        console.error('Error fetching power status:', err);
        // If we can't reach the server, set status to offline
        setPowerStatus('offline');
      }
    };

    fetchPowerStatus();
    
    // Poll for power status every 10 seconds
    const interval = setInterval(fetchPowerStatus, 10000);
    
    return () => clearInterval(interval);
  }, []);

  // Handle server power control
  const handlePowerControl = async (action) => {
    try {
      if (action === 'shutdown') {
        await axios.post(`${API_URL}/api/power/shutdown`, {}, { timeout: 5000 });
        setPowerStatus('offline');
      } else if (action === 'wakeup') {
        // For wakeup, we use the dedicated WoL service instead of the server endpoint
        // This solves the logical issue of trying to wake up a server by calling its own API
        try {
          console.log('Sending wake-up request to dedicated WoL service...');
          const response = await axios.post(`${WOL_SERVICE_URL}/wakeup`, {}, { timeout: 5000 });
          console.log('Wake-up request sent successfully:', response.data.message);
        } catch (wakeupErr) {
          console.error('Error sending wake-up request to WoL service:', wakeupErr.message);
          
          // Fallback to direct server API call (this will likely fail if server is offline)
          try {
            console.log('Attempting fallback to server API endpoint...');
            await axios.post(`${API_URL}/api/power/wakeup`, {}, { timeout: 5000 });
            console.log('Wake-up request sent successfully via server API');
          } catch (fallbackErr) {
            console.error('Fallback to server API failed:', fallbackErr.message);
          }
        }
        
        // Regardless of whether the API call succeeded, set status to starting
        setPowerStatus('starting');
        
        // Poll for status more frequently after wake command
        const checkStatus = async () => {
          try {
            const response = await axios.get(`${API_URL}/api/power/status`, { timeout: 3000 });
            if (response.data.status === 'online') {
              setPowerStatus('online');
              return true;
            }
            return false;
          } catch (err) {
            return false;
          }
        };
        
        // Check every 2 seconds for 30 seconds
        let attempts = 0;
        const statusInterval = setInterval(async () => {
          const isOnline = await checkStatus();
          attempts++;
          
          if (isOnline || attempts >= 15) {
            if (!isOnline && attempts >= 15) {
              // If we've tried 15 times and the server is still not online,
              // set the status back to offline
              setPowerStatus('offline');
            }
            clearInterval(statusInterval);
          }
        }, 2000);
      }
    } catch (err) {
      console.error(`Error ${action} server:`, err);
      // Don't set error state, just log it
      // This allows the UI to remain functional
      
      // If we failed to send the command, update the status accordingly
      if (action === 'shutdown') {
        // If shutdown failed, server is probably still online
        setPowerStatus('online');
      } else if (action === 'wakeup') {
        // If wakeup failed, server is probably still offline
        setPowerStatus('offline');
      }
    }
  };

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
              onPowerControl={handlePowerControl}
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
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
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
          
          {/* Power Control */}
          <div className="lg:col-span-4">
            <PowerControl 
              status={powerStatus} 
              onPowerControl={handlePowerControl} 
            />
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}

export default App;