import React, { useState, useEffect } from 'react';
import { Truck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getPendingInspections, stageContainerForInspection } from '../services/warehouseService';
import { InspectionAppointment } from '../types/warehouse';

export const WarehouseStagingModule: React.FC = () => {
  const [appointments, setAppointments] = useState<InspectionAppointment[]>([]);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    const data = await getPendingInspections();
    setAppointments(data);
  };

  const handleStageContainer = async (appointment: InspectionAppointment) => {
    // Assuming we have the current location, this would normally come from the order
    await stageContainerForInspection(appointment.orderId, {
      depotId: 'default-depot',
      bayId: 'staging-area',
      tier: 'ground',
      isStaged: false
    });
    fetchAppointments();
  };

  return (
    <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm">
      <h2 className="text-xl font-black text-[#15385E] mb-4 flex items-center gap-2">
        <Truck className="text-[#00c0f3]" />
        Warehouse Forklift Staging
      </h2>
      <div className="space-y-4">
        {appointments.map((apt) => (
          <div key={apt.id} className="p-4 rounded-xl border border-slate-200 flex justify-between items-center bg-slate-50">
            <div>
              <p className="font-bold text-[#15385E]">{apt.customerName}</p>
              <p className="text-xs text-slate-500">Container: {apt.containerId} · Scheduled: {new Date(apt.scheduledAt).toLocaleString()}</p>
            </div>
            <button
              onClick={() => handleStageContainer(apt)}
              className="px-4 py-2 bg-[#F7D347] text-black font-bold rounded-lg hover:bg-[#eed235] cursor-pointer"
            >
              Stage Container
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
