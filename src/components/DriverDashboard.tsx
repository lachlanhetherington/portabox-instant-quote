import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { getAssignedDeliveries, updateContainerLocation, updateContainerStatus } from '../services/driverService';

export const DriverDashboard = () => {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [manualContainerId, setManualContainerId] = useState('');
  const [scanning, setScanning] = useState(false);
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    // Replace with actual driver ID logic
    getAssignedDeliveries('driver-123').then(setDeliveries);
  }, []);

  useEffect(() => {
    let watchId: number;
    if (isTracking) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          // Update GPS periodically - need to know which container
          console.log('Tracking GPS:', position.coords);
          // In a real app, bind this to the active delivery container
        },
        (error) => console.error(error),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    }
    return () => navigator.geolocation.clearWatch(watchId);
  }, [isTracking]);

  const startScan = () => {
    setScanning(true);
    const scanner = new Html5QrcodeScanner('reader', { fps: 10, qrbox: 250 }, false);
    scanner.render((decodedText) => {
      setManualContainerId(decodedText);
      setScanning(false);
      scanner.clear();
    }, (error) => console.warn(error));
  };

  const handleCheckout = async (deliveryId: string, containerId: string) => {
    navigator.geolocation.getCurrentPosition(async (position) => {
      await updateContainerLocation(containerId, position.coords.latitude, position.coords.longitude);
      await updateContainerStatus(containerId, 'in_transit');
      setIsTracking(true);
      alert('Container checked out and tracking started!');
    });
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Driver Portal</h1>
      
      <div className="mb-4">
        <label className="block mb-1">Container ID</label>
        <div className="flex gap-2">
          <input 
            type="text" 
            value={manualContainerId} 
            onChange={(e) => setManualContainerId(e.target.value)} 
            placeholder="Enter or Scan Container ID"
            className="border p-2 flex-grow"
          />
          <button onClick={startScan} className="bg-blue-500 text-white p-2 rounded">Scan</button>
        </div>
      </div>
      
      <div id="reader"></div>
      
      <div className="mt-4">
        <h2 className="font-bold mb-2">Assigned Deliveries</h2>
        {deliveries.map(d => (
          <div key={d.id} className="border p-4 my-2 rounded">
            <p>Booking: {d.booking_id}</p>
            <p>Address: {d.customer_address}</p>
            <button 
              onClick={() => handleCheckout(d.id, manualContainerId || d.container_id)} 
              className="bg-green-500 text-white p-2 rounded mt-2"
              disabled={!manualContainerId && !d.container_id}
            >
              Checkout / Start Tracking
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
