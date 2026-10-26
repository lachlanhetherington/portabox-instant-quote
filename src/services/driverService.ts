import { db } from './firebaseService';
import { doc, updateDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

export interface Container {
  container_id: string;
  status: string;
  last_known_lat?: number;
  last_known_lng?: number;
  geo_updated_at?: string;
}

export const updateContainerLocation = async (containerId: string, lat: number, lng: number) => {
  const containerRef = doc(db, 'containers', containerId);
  await updateDoc(containerRef, {
    last_known_lat: lat,
    last_known_lng: lng,
    geo_updated_at: new Date().toISOString()
  });
};

export const updateContainerStatus = async (containerId: string, status: string) => {
  const containerRef = doc(db, 'containers', containerId);
  await updateDoc(containerRef, { status });
};

export const getAssignedDeliveries = async (driverId: string) => {
  const q = query(collection(db, 'deliveries'), where('driver_id', '==', driverId), where('status', 'in', ['dispatched', 'en_route']));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
