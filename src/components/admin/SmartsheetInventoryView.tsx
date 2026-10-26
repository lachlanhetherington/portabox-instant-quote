import React, { useState, useEffect } from 'react';
import { ContainerAsset, loadContainerAssets, saveContainerAssets, syncInventoryToSmartsheet } from '../../services/smartsheetService';

export const SmartsheetInventoryView: React.FC = () => {
  const [assets, setAssets] = useState<ContainerAsset[]>([]);

  useEffect(() => {
    setAssets(loadContainerAssets());
  }, []);

  const handleUpdate = async (asset: ContainerAsset) => {
    await syncInventoryToSmartsheet(asset);
    setAssets(loadContainerAssets());
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Smartsheet Inventory Editor</h2>
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            <th>Container ID</th>
            <th>Status</th>
            <th>Location/Bay</th>
            <th>Maintenance Date</th>
            <th>Customer</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {assets.map((asset) => (
            <tr key={asset.containerId}>
              <td>{asset.containerId}</td>
              <td>{asset.status}</td>
              <td>{asset.bayNumber}</td>
              <td>{asset.lastInspectionDate}</td>
              <td>{asset.customerName || 'N/A'}</td>
              <td>
                <button 
                    onClick={() => handleUpdate({ ...asset, status: 'Maintenance' })}
                    className="text-blue-600 hover:text-blue-800"
                >
                  Mark Maint.
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
