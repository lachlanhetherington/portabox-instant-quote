import { db } from './firebaseService';
import { doc, updateDoc, collection, addDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { WarehouseLocation, InspectionAppointment } from '../types/warehouse';
import { ContainerOrder } from './customerPortalService';

export const updateContainerLocation = async (orderId: string, location: WarehouseLocation) => {
  const orderRef = doc(db, 'orders', orderId);
  await updateDoc(orderRef, {
    warehouseLocation: location
  });
};

export const stageContainerForInspection = async (orderId: string, location: WarehouseLocation) => {
  const stagedLocation: WarehouseLocation = { ...location, isStaged: true, tier: 'ground' };
  await updateContainerLocation(orderId, stagedLocation);
};

export const createInspectionAppointment = async (appointment: Omit<InspectionAppointment, 'id'>) => {
  const appointmentsRef = collection(db, 'inspectionAppointments');
  await addDoc(appointmentsRef, {
    ...appointment,
    scheduledAt: Timestamp.fromDate(new Date(appointment.scheduledAt)),
    status: 'pending'
  });
};

export const getPendingInspections = async (): Promise<InspectionAppointment[]> => {
  const appointmentsRef = collection(db, 'inspectionAppointments');
  const q = query(appointmentsRef, where('status', '==', 'pending'));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as InspectionAppointment));
};
