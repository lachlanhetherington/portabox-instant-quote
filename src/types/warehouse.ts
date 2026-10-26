export interface WarehouseLocation {
  depotId: string;
  bayId: string; // e.g., C-12
  tier: 'ground' | 'tier_1' | 'tier_2' | 'tier_3';
  isStaged: boolean; // True if brought to ground level for inspection
}

export interface InspectionAppointment {
  id: string;
  orderId: string;
  containerId: string;
  customerName: string;
  scheduledAt: string; // ISO Date
  status: 'pending' | 'staged' | 'completed' | 'cancelled';
}
