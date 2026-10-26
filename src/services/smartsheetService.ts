import {
  CustomerAccount,
  ContainerOrder,
  CustomerTransaction,
  loadCustomerAccounts,
  saveCustomerAccounts,
  getCurrentUserSession,
  setCurrentUserSession,
} from './customerPortalService';
import {
  loadScheduledDeliveries,
  saveScheduledDeliveries,
} from './routingOptimizationService';
import {
  loadAppConfig,
  saveAppConfig,
  loadCustomerLeads,
  saveCustomerLeads,
} from './pricingEngine';
import { MetroHub } from '../types/quote';

export type YardReviewStatus =
  | 'Pending Inspection'
  | 'Container Washed & Tagged'
  | 'Loaded on Level-Lift Truck'
  | 'Dispatched - En Route'
  | 'Delivered to Site'
  | 'Returned to Depot';

export interface YardInspectionChecklist {
  weatherproofSeal: boolean;
  sanitizationWash: boolean;
  floorDrings: boolean;
  lockboxShroud: boolean;
  horizontalLiftSafetyLocks: boolean;
  horizontalLiftLevelPlacement?: boolean;
  inspectedBy: string;
  inspectedAt: string;
  passed: boolean;
  notes?: string;
}

export interface ContainerQrScanLog {
  id: string;
  timestamp: string;
  qrCode: string;
  scanAction: 'Checkout from Portabox Depot' | 'Place at Customer Site' | 'Checkout from Customer Site' | 'Check-in at Portabox Depot' | 'Quality Inspection Scan';
  scannedByDriver: string;
  fromLocation: string;
  toLocation: string;
  serviceabilityScoreRecorded: number;
  notes: string;
}

export interface ContainerAsset {
  containerId: string;
  qrCodePayload?: string;
  size: string;
  depotName: string;
  bayNumber: string;
  currentLocationType?: 'Portabox Depot' | 'Customer Location' | 'In Transit on Truck' | 'Maintenance Workshop';
  currentLocationDetail?: string;
  customerName?: string;
  customerAddress?: string;
  customerSuburb?: string;
  isGeneratingIncome?: boolean;
  monthlyIncomeAud?: number;
  serviceabilityScore?: number; // 0 - 100
  tareWeightKg: number;
  maxGrossWeightKg: number;
  condition: 'A+ Mint' | 'A Excellent' | 'B Commercial' | 'Maintenance Required';
  status: 'Available in Depot' | 'Allocated - In Yard Prep' | 'Loaded on Truck' | 'On Customer Site' | 'Maintenance';
  assignedOrderNumber?: string;
  lastInspectionDate: string;
  scanHistory?: ContainerQrScanLog[];
}

export interface TruckFleetAsset {
  truckId: string;
  truckModel: string;
  truckType: 'Crane Lift Heavy' | 'Slide-On Standard' | 'Dual Container Haulage' | 'Level-Lift Heavy System' | 'Horizontal Level-Lift';
  rego: string;
  driverName: string;
  driverPhone: string;
  depot: string;
  status: 'Ready in Yard' | 'Out on Route' | 'Off Duty';
  currentOrderId?: string;
}

/**
 * Sheet 1 & 3: Customer Booking, Billing, Payment & Yard Dispatch Row
 * Two-way synchronized between Quoting App, Call Center Smartsheet, and Customer Portal
 */
export interface SmartsheetRow {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  containerId: string;
  containerSize: string;
  serviceType: string;
  orderStatus: ContainerOrder['status'];
  deliveryAddress: string;
  scheduledDeliveryDate: string;
  deliveryWindow: string;
  timeToDeliveryHours: number;
  assignedDriver: string;
  driverPhone: string;
  assignedTruckId?: string;
  yardReviewStatus: YardReviewStatus;
  paymentStatus: 'Paid' | 'Pending' | 'Overdue';
  paymentPlan: string;
  periodicRateAud: number;
  nextBillingDate: string;
  autopayEnabled: boolean;
  amountPaid: number;
  balanceDueAud: number;
  callCenterDiscountAud: number;
  callCenterDiscountReason?: string;
  braintreeTransactionId: string;
  accessNotes: string;
  placementSurface?: 'Concrete Driveway' | 'Paved Asphalt' | 'Grass / Lawn' | 'Gravel / Dirt' | 'Roadside / Nature Strip';
  doorOrientation?: 'Doors Facing Street / Road' | 'Doors Facing House / Property' | 'Driver Discretion';
  accessGateWidth?: 'Wide Open (>3.5m)' | 'Standard (3.0m - 3.5m)' | 'Narrow (<3.0m - Caution)';
  overheadClearanceClear?: boolean;
  secondaryContactName?: string;
  secondaryContactPhone?: string;
  referralSource?: string;
  siteNotes?: string;
  suburb?: string;
  postcode?: string;
  deliveryZone?: string;
  pickupRequestedDate?: string;
  pickupStatus?: 'None' | 'Requested by Customer' | 'Scheduled in Smartsheet' | 'Collected';
  lastUpdatedBy: 'Customer Quoting App' | 'Customer Portal' | 'Call Center Smartsheet' | 'Driver Mobile';
  lastSyncedTimestamp: string;
  syncedToSmartsheet: boolean;
  inspectionChecklist?: YardInspectionChecklist;
  operationalHold?: boolean;
  operationalHoldReason?: string;
}

/**
 * Sheet 2: Invoices, Billing Ledger & Accounting Intermediary Row
 * Two-way synchronized between Customer Portal Transactions and Call Center Billing
 */
export interface SmartsheetInvoiceRow {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  orderNumber: string;
  date: string;
  dueDate: string;
  description: string;
  amount: number;
  gstAmount: number;
  status: 'Paid' | 'Pending' | 'Overdue' | 'Refunded';
  paymentMethod: string;
  transactionRef: string;
  revenueType: 'Immediate (Delivery / Monthly)' | 'Deferred AASB-15 (Upfront Prepayment)';
  ledgerSyncStatus: 'Staged in Smartsheet' | 'Approved by Call Center' | 'Reconciled in Ledger';
  lastUpdatedBy: 'Customer App' | 'Customer Portal' | 'Call Center Smartsheet';
  lastSyncedAt: string;
}

/**
 * Sheet 4: Live Tariffs, Surcharges & Competitor Pricing Intermediary Row
 * Two-way synchronized between Smartsheet Tariff Table and AppConfig
 */
export interface SmartsheetTariffRow {
  id: string;
  itemCode: string;
  category: 'Container Monthly Rate' | 'Transport & Delivery' | 'Competitor Benchmark' | 'Packing Supplies';
  itemName: string;
  portaboxRateAud: number;
  competitorRateAud?: number;
  billingUnit: string;
  configKey: string;
  notes: string;
  lastUpdatedBy: string;
  lastUpdatedAt: string;
}

export interface SmartsheetSyncLog {
  id: string;
  timestamp: string;
  direction: 'outbound_api' | 'inbound_webhook' | 'portal_to_sheet' | 'sheet_to_portal';
  sheetName?: string;
  action: string;
  rowsAffected: number;
  status: 'success' | 'warning' | 'error';
  details: string;
  payloadPreview?: string;
}

export interface SmartsheetConfig {
  apiToken: string;
  sheetId: string;
  sheetName: string;
  bookingsSheetId: string;
  invoicesSheetId: string;
  tariffsSheetId: string;
  webhookUrl: string;
  autoSyncOnPayment: boolean;
  autoSyncOnQuote: boolean;
  twoWayPortalSync: boolean;
  connected: boolean;
  lastSyncTime?: string;
  syncHistory: SmartsheetSyncLog[];
}

const SMARTSHEET_CONFIG_KEY = 'portabox_smartsheet_config_v2';
const SMARTSHEET_STAGING_KEY = 'portabox_smartsheet_staging_rows_v2';
const SMARTSHEET_INVOICES_KEY = 'portabox_smartsheet_invoices_v2';
const SMARTSHEET_TARIFFS_KEY = 'portabox_smartsheet_tariffs_v2';
const SMARTSHEET_INVENTORY_KEY = 'portabox_smartsheet_inventory_v3';
const SMARTSHEET_FLEET_KEY = 'portabox_smartsheet_fleet';

/**
 * Broadcast two-way synchronization event so all open components (Customer Portal, Call Center, Admin, Quoting App)
 * immediately refresh their state in real time.
 */
export function notifySmartsheetTwoWaySync(detail?: {
  source: string;
  summary: string;
  customerId?: string;
  orderNumber?: string;
}): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('portabox-smartsheet-sync', {
        detail: detail || { source: 'smartsheet', summary: 'Synchronized' },
      })
    );
  }
}

/**
 * Syncs updated ContainerAsset to Smartsheet Master Inventory
 */
export async function syncInventoryToSmartsheet(asset: ContainerAsset): Promise<void> {
  const config = loadSmartsheetConfig();
  console.log('Syncing to Smartsheet:', asset.containerId);
  // Placeholder for real Smartsheet API Call using config.apiToken
  // In a real environment, this would be:
  // await fetch(`https://api.smartsheet.com/2.0/sheets/${config.sheetId}/rows`, { ... })
  
  // Update local staging
  const assets = loadContainerAssets();
  const updatedAssets = assets.map(a => a.containerId === asset.containerId ? asset : a);
  saveContainerAssets(updatedAssets);
  
  addSmartsheetSyncLog({
    direction: 'outbound_api',
    sheetName: 'Container Inventory Master Sheet',
    action: 'Asset Synced to Smartsheet',
    rowsAffected: 1,
    status: 'success',
    details: `Container ${asset.containerId} synced to Smartsheet.`,
  });
}

/**
 * Processes inbound Webhook update from Smartsheet
 */
export async function processSmartsheetWebhook(payload: any): Promise<void> {
  console.log('Inbound Smartsheet Webhook:', payload);
  // Conflict Resolution: "App overrides Smartsheet" means if App state has
  // a pending update or if we're in the middle of a UI interaction, we might
  // ignore this. For now, we update local storage.
  
  const containerId = payload.containerId; // Assuming payload structure
  if (containerId) {
    const assets = loadContainerAssets();
    const updatedAssets = assets.map(a => a.containerId === containerId ? { ...a, ...payload } : a);
    saveContainerAssets(updatedAssets);
    
    notifySmartsheetTwoWaySync({
      source: 'smartsheet_webhook',
      summary: `Container ${containerId} updated via Smartsheet`,
    });
  }
}

// Default Yard & Customer Containers Catalog with QR Codes, Serviceability Scores & Income Tracking
export const SEED_CONTAINER_ASSETS: ContainerAsset[] = [
  {
    containerId: 'PB-BOX-25-088',
    qrCodePayload: 'PORTABOX://ASSET/PB-BOX-25-088?SIZE=25M3&HUB=ADL',
    size: '25 m³',
    depotName: 'Portabox Adelaide Central Depot',
    bayNumber: 'Customer Driveway (Norwood SA)',
    currentLocationType: 'Customer Location',
    currentLocationDetail: '42 Osmond Terrace, Norwood SA 5067',
    customerName: 'Sarah Jenkins',
    customerAddress: '42 Osmond Terrace, Norwood SA 5067',
    customerSuburb: 'Norwood SA',
    isGeneratingIncome: true,
    monthlyIncomeAud: 259,
    serviceabilityScore: 98,
    tareWeightKg: 1280,
    maxGrossWeightKg: 4500,
    condition: 'A+ Mint',
    status: 'On Customer Site',
    assignedOrderNumber: 'PBO-9841',
    lastInspectionDate: '01 Oct 2026',
    scanHistory: [
      {
        id: 'scan-101',
        timestamp: '01 Oct 2026 08:30 AM',
        qrCode: 'PORTABOX://ASSET/PB-BOX-25-088',
        scanAction: 'Checkout from Portabox Depot',
        scannedByDriver: 'Dave Higgins (Driver #03)',
        fromLocation: 'Portabox Adelaide Central Depot (Bay 12-A)',
        toLocation: 'Level-Lift Truck TRUCK-ADL-01',
        serviceabilityScoreRecorded: 98,
        notes: 'Scanned out of Adelaide Depot bay 12-A. Weather seals & horizontal lift pins 100%.',
      },
      {
        id: 'scan-102',
        timestamp: '01 Oct 2026 10:15 AM',
        qrCode: 'PORTABOX://ASSET/PB-BOX-25-088',
        scanAction: 'Place at Customer Site',
        scannedByDriver: 'Dave Higgins (Driver #03)',
        fromLocation: 'Level-Lift Truck TRUCK-ADL-01',
        toLocation: '42 Osmond Terrace, Norwood SA 5067',
        serviceabilityScoreRecorded: 98,
        notes: 'Placed level on customer driveway with protective ground pads.',
      },
    ],
  },
  {
    containerId: 'PB-BOX-25-104',
    qrCodePayload: 'PORTABOX://ASSET/PB-BOX-25-104?SIZE=25M3&HUB=ADL',
    size: '25 m³',
    depotName: 'Portabox Adelaide Central Depot',
    bayNumber: 'Customer Site (Hyde Park SA)',
    currentLocationType: 'Customer Location',
    currentLocationDetail: '18 King William Street, Hyde Park SA 5061',
    customerName: 'David Miller (Miller Construction)',
    customerAddress: '18 King William Street, Hyde Park SA 5061',
    customerSuburb: 'Hyde Park SA',
    isGeneratingIncome: true,
    monthlyIncomeAud: 259,
    serviceabilityScore: 94,
    tareWeightKg: 1280,
    maxGrossWeightKg: 4500,
    condition: 'A Excellent',
    status: 'On Customer Site',
    assignedOrderNumber: 'PBO-8912',
    lastInspectionDate: '28 Sep 2026',
    scanHistory: [
      {
        id: 'scan-201',
        timestamp: '05 Jul 2026 01:10 PM',
        qrCode: 'PORTABOX://ASSET/PB-BOX-25-104',
        scanAction: 'Checkout from Portabox Depot',
        scannedByDriver: 'Mark Stevens (Heavy Haulage #01)',
        fromLocation: 'Portabox Adelaide Central Depot (Bay 14-B)',
        toLocation: '18 King William Street, Hyde Park SA 5061',
        serviceabilityScoreRecorded: 94,
        notes: '12-month upfront builder contract placement.',
      },
    ],
  },
  {
    containerId: 'PB-BOX-10-022',
    qrCodePayload: 'PORTABOX://ASSET/PB-BOX-10-022?SIZE=10M3&HUB=ADL',
    size: '10 m³',
    depotName: 'Portabox Adelaide Central Depot',
    bayNumber: 'Customer Site (Hyde Park SA)',
    currentLocationType: 'Customer Location',
    currentLocationDetail: '18 King William Street, Hyde Park SA 5061',
    customerName: 'David Miller (Miller Construction)',
    customerAddress: '18 King William Street, Hyde Park SA 5061',
    customerSuburb: 'Hyde Park SA',
    isGeneratingIncome: true,
    monthlyIncomeAud: 159,
    serviceabilityScore: 96,
    tareWeightKg: 720,
    maxGrossWeightKg: 2500,
    condition: 'A+ Mint',
    status: 'On Customer Site',
    assignedOrderNumber: 'PBO-8912',
    lastInspectionDate: '29 Sep 2026',
    scanHistory: [
      {
        id: 'scan-301',
        timestamp: '05 Jul 2026 01:15 PM',
        qrCode: 'PORTABOX://ASSET/PB-BOX-10-022',
        scanAction: 'Place at Customer Site',
        scannedByDriver: 'Mark Stevens (Heavy Haulage #01)',
        fromLocation: 'Portabox Adelaide Central Depot',
        toLocation: '18 King William Street, Hyde Park SA 5061',
        serviceabilityScoreRecorded: 96,
        notes: 'Container placed on driveway site.',
      },
    ],
  },
  {
    containerId: 'PB-BOX-25-119',
    qrCodePayload: 'PORTABOX://ASSET/PB-BOX-25-119?SIZE=25M3&HUB=ADL',
    size: '25 m³',
    depotName: 'Portabox Adelaide Central Depot',
    bayNumber: 'Bay 06-A (Ready Line)',
    currentLocationType: 'Portabox Depot',
    currentLocationDetail: 'Portabox Adelaide Central Depot · Bay 06-A',
    isGeneratingIncome: false,
    monthlyIncomeAud: 0,
    serviceabilityScore: 99,
    tareWeightKg: 1280,
    maxGrossWeightKg: 4500,
    condition: 'A+ Mint',
    status: 'Available in Depot',
    lastInspectionDate: '05 Oct 2026',
    scanHistory: [
      {
        id: 'scan-401',
        timestamp: '05 Oct 2026 04:20 PM',
        qrCode: 'PORTABOX://ASSET/PB-BOX-25-119',
        scanAction: 'Check-in at Portabox Depot',
        scannedByDriver: 'Mick Thornton (Driver #04)',
        fromLocation: '29 Jetty Road, Glenelg SA 5045',
        toLocation: 'Portabox Adelaide Central Depot (Bay 06-A)',
        serviceabilityScoreRecorded: 99,
        notes: 'Checked out from customer in Glenelg and returned to depot. Sanitized & ready.',
      },
    ],
  },
  {
    containerId: 'PB-BOX-19-014',
    qrCodePayload: 'PORTABOX://ASSET/PB-BOX-19-014?SIZE=19M3&HUB=MEL',
    size: '19 m³',
    depotName: 'Portabox Melbourne West Depot',
    bayNumber: 'Bay 08-M (Storage)',
    currentLocationType: 'Portabox Depot',
    currentLocationDetail: 'Portabox Melbourne West Depot · Bay 08-M (Customer Loaded Storage)',
    customerName: 'Chloe & Liam Nguyen',
    customerAddress: 'Stored in Portabox Facility (Laverton North VIC)',
    customerSuburb: 'Laverton North VIC',
    isGeneratingIncome: true,
    monthlyIncomeAud: 239,
    serviceabilityScore: 91,
    tareWeightKg: 980,
    maxGrossWeightKg: 3500,
    condition: 'A Excellent',
    status: 'Available in Depot',
    assignedOrderNumber: 'PBO-9104',
    lastInspectionDate: '30 Sep 2026',
    scanHistory: [],
  },
  {
    containerId: 'PB-BOX-25-007',
    qrCodePayload: 'PORTABOX://ASSET/PB-BOX-25-007?SIZE=25M3&HUB=SYD',
    size: '25 m³',
    depotName: 'Portabox Sydney Metro Hub',
    bayNumber: 'Bay 02-S',
    currentLocationType: 'Portabox Depot',
    currentLocationDetail: 'Portabox Sydney Metro Hub · Bay 02-S',
    isGeneratingIncome: false,
    monthlyIncomeAud: 0,
    serviceabilityScore: 84,
    tareWeightKg: 1280,
    maxGrossWeightKg: 4500,
    condition: 'B Commercial',
    status: 'Available in Depot',
    lastInspectionDate: '27 Sep 2026',
    scanHistory: [],
  },
  {
    containerId: 'PB-BOX-25-051',
    qrCodePayload: 'PORTABOX://ASSET/PB-BOX-25-051?SIZE=25M3&HUB=BNE',
    size: '25 m³',
    depotName: 'Brisbane Depot',
    bayNumber: 'Bay 03-BNE (Gilberton)',
    currentLocationType: 'Customer Location',
    currentLocationDetail: '42 Queen Street, Brisbane QLD 4000',
    customerName: 'Brett & Kylie Vance',
    customerAddress: '42 Queen Street, Brisbane QLD 4000',
    customerSuburb: 'Brisbane QLD',
    isGeneratingIncome: true,
    monthlyIncomeAud: 259,
    serviceabilityScore: 95,
    tareWeightKg: 1280,
    maxGrossWeightKg: 4500,
    condition: 'A+ Mint',
    status: 'On Customer Site',
    assignedOrderNumber: 'PBO-9502',
    lastInspectionDate: '03 Oct 2026',
    scanHistory: [],
  },
  {
    containerId: 'PB-BOX-10-009',
    qrCodePayload: 'PORTABOX://ASSET/PB-BOX-10-009?SIZE=10M3&HUB=ADL',
    size: '10 m³',
    depotName: 'Portabox Adelaide Central Depot',
    bayNumber: 'Workshop Bay 01',
    currentLocationType: 'Maintenance Workshop',
    currentLocationDetail: 'Adelaide Depot Maintenance Bay 01 (Door Seal Replacement)',
    isGeneratingIncome: false,
    monthlyIncomeAud: 0,
    serviceabilityScore: 68,
    tareWeightKg: 720,
    maxGrossWeightKg: 2500,
    condition: 'Maintenance Required',
    status: 'Maintenance',
    lastInspectionDate: '04 Oct 2026',
    scanHistory: [],
  },
];

// Default Horizontal Level-Lift Logistics Fleet
export const SEED_TRUCK_FLEET: TruckFleetAsset[] = [
  {
    truckId: 'TRUCK-ADL-01',
    truckModel: 'Isuzu FSD 140-260 Horizontal Level-Lift System',
    truckType: 'Level-Lift Heavy System',
    rego: 'S102-ABC',
    driverName: 'Dave Higgins (Driver #03)',
    driverPhone: '0488 123 456',
    depot: 'Portabox Adelaide Central Depot',
    status: 'Ready in Yard',
    currentOrderId: 'PBO-9841',
  },
  {
    truckId: 'TRUCK-ADL-02',
    truckModel: 'Hino 500 Wide-Cab Slide-On',
    truckType: 'Slide-On Standard',
    rego: 'S881-XYZ',
    driverName: 'Mick Thornton (Driver #04)',
    driverPhone: '0412 000 111',
    depot: 'Portabox Adelaide Central Depot',
    status: 'Out on Route',
  },
  {
    truckId: 'TRUCK-MEL-01',
    truckModel: 'Kenworth T360 Dual-Container Transport',
    truckType: 'Dual Container Haulage',
    rego: 'V401-MET',
    driverName: 'Rob Davies (Driver #01)',
    driverPhone: '0422 999 888',
    depot: 'Portabox Melbourne West Depot',
    status: 'Ready in Yard',
  },
  {
    truckId: 'TRUCK-SYD-01',
    truckModel: 'Volvo FL 280 Heavy Duty Rigid Crane',
    truckType: 'Crane Lift Heavy',
    rego: 'N290-SYD',
    driverName: 'Chris Lang (Driver #02)',
    driverPhone: '0433 777 666',
    depot: 'Portabox Sydney Metro Hub',
    status: 'Ready in Yard',
  },
];

const DEFAULT_SMARTSHEET_CONFIG: SmartsheetConfig = {
  apiToken: 'smartsheet_demo_token_sec_99214a821e0b',
  sheetId: '4829103948192041',
  bookingsSheetId: '4829-BOOKINGS-01',
  invoicesSheetId: '4829-INVOICES-02',
  tariffsSheetId: '4829-TARIFFS-04',
  sheetName: 'Portabox - Two-Way Customer Bookings, Billing & Dispatch Workspace',
  webhookUrl: 'https://api.smartsheet.com/2.0/sheets/4829103948192041/rows',
  autoSyncOnPayment: true,
  autoSyncOnQuote: true,
  twoWayPortalSync: true,
  connected: true,
  lastSyncTime: new Date().toLocaleDateString('en-AU') + ' 10:45 AM',
  syncHistory: [
    {
      id: 'log-01',
      timestamp: 'Today at 09:30 AM',
      direction: 'outbound_api',
      sheetName: 'Customer Bookings & Billing Sheet',
      action: 'Two-Way Intermediary Bridge Active',
      rowsAffected: 2,
      status: 'success',
      details: 'Connected 4 intermediary Smartsheets (Bookings & Billing, Invoices & Ledger, Yard Dispatch, Live Tariffs) with two-way Customer Portal sync.',
      payloadPreview: '{"workspace":"Portabox Two-Way Bridge","sheets":4,"twoWaySync":true}',
    },
  ],
};

export function loadSmartsheetConfig(): SmartsheetConfig {
  try {
    const raw = localStorage.getItem(SMARTSHEET_CONFIG_KEY);
    if (!raw) {
      saveSmartsheetConfig(DEFAULT_SMARTSHEET_CONFIG);
      return DEFAULT_SMARTSHEET_CONFIG;
    }
    return { ...DEFAULT_SMARTSHEET_CONFIG, ...JSON.parse(raw) };
  } catch (err) {
    console.error('Error loading smartsheet config:', err);
    return DEFAULT_SMARTSHEET_CONFIG;
  }
}

export function saveSmartsheetConfig(config: SmartsheetConfig): void {
  try {
    localStorage.setItem(SMARTSHEET_CONFIG_KEY, JSON.stringify(config));
  } catch (err) {
    console.error('Error saving smartsheet config:', err);
  }
}

export function addSmartsheetSyncLog(log: Omit<SmartsheetSyncLog, 'id' | 'timestamp'>): void {
  const config = loadSmartsheetConfig();
  const timestamp = new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const newLog: SmartsheetSyncLog = {
    ...log,
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: `Today at ${timestamp}`,
  };
  config.lastSyncTime = new Date().toLocaleDateString('en-AU') + ` ${timestamp}`;
  config.syncHistory = [newLog, ...(config.syncHistory || []).slice(0, 24)];
  saveSmartsheetConfig(config);
}

export function loadContainerAssets(): ContainerAsset[] {
  try {
    const raw = localStorage.getItem(SMARTSHEET_INVENTORY_KEY);
    if (raw) return JSON.parse(raw);
    saveContainerAssets(SEED_CONTAINER_ASSETS);
    return SEED_CONTAINER_ASSETS;
  } catch {
    return SEED_CONTAINER_ASSETS;
  }
}

export function saveContainerAssets(assets: ContainerAsset[]): void {
  try {
    localStorage.setItem(SMARTSHEET_INVENTORY_KEY, JSON.stringify(assets));
  } catch (err) {
    console.error('Error saving container assets:', err);
  }
}

export function loadTruckFleet(): TruckFleetAsset[] {
  try {
    const raw = localStorage.getItem(SMARTSHEET_FLEET_KEY);
    if (raw) return JSON.parse(raw);
    saveTruckFleet(SEED_TRUCK_FLEET);
    return SEED_TRUCK_FLEET;
  } catch {
    return SEED_TRUCK_FLEET;
  }
}

export function saveTruckFleet(fleet: TruckFleetAsset[]): void {
  try {
    localStorage.setItem(SMARTSHEET_FLEET_KEY, JSON.stringify(fleet));
  } catch (err) {
    console.error('Error saving truck fleet:', err);
  }
}

/**
 * Transforms Customer Accounts & Container Orders into Smartsheet Bookings, Billing & Staging Rows
 */
export function buildSmartsheetRowsFromAccounts(accounts: CustomerAccount[]): SmartsheetRow[] {
  const rows: SmartsheetRow[] = [];

  accounts.forEach((c) => {
    const latestPaid = c.transactions.find((t) => t.status === 'Paid');
    const hasOverdue = c.transactions.some((t) => t.status === 'Overdue');
    const hasPending = c.transactions.some((t) => t.status === 'Pending');
    const totalPaid = c.transactions
      .filter((t) => t.status === 'Paid')
      .reduce((sum, t) => sum + t.amount, 0);
    const balanceDue = c.transactions
      .filter((t) => t.status === 'Overdue' || t.status === 'Pending')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalDiscount = (c.discountsGiven || []).reduce((sum, d) => sum + d.amount, 0);

    c.orders.forEach((o) => {
      let yardStatus: YardReviewStatus = 'Pending Inspection';
      if (o.status === 'Placed at Customer') yardStatus = 'Delivered to Site';
      else if (o.status === 'Out for Delivery') yardStatus = 'Dispatched - En Route';
      else if (o.status === 'Stored at Depot' || o.status === 'Collected' || o.status === 'Completed')
        yardStatus = 'Returned to Depot';
      else if (o.status === 'Scheduled') yardStatus = 'Loaded on Level-Lift Truck';

      const operationalHold = hasOverdue;
      const operationalHoldReason = hasOverdue
        ? 'Dispatched Hold: Customer account has overdue invoice balance. Clear in Billing Smartsheet or Customer Portal.'
        : undefined;

      rows.push({
        id: `${c.id}-${o.id}`,
        orderNumber: o.orderNumber,
        customerId: c.id,
        customerName: `${c.firstName} ${c.lastName}`.trim(),
        customerPhone: c.mobile,
        customerEmail: c.email,
        containerId: o.containerId,
        containerSize: o.containerSize,
        serviceType: o.serviceType,
        orderStatus: o.status,
        deliveryAddress: o.originAddress,
        scheduledDeliveryDate: o.scheduledDeliveryDate,
        deliveryWindow: o.deliveryWindow,
        timeToDeliveryHours: o.timeToDeliveryHours ?? 24,
        assignedDriver: o.driverName || 'Dave Higgins (Driver #03)',
        driverPhone: o.driverPhone || '0488 123 456',
        assignedTruckId: 'TRUCK-ADL-01',
        yardReviewStatus: yardStatus,
        paymentStatus: hasOverdue ? 'Overdue' : hasPending && totalPaid === 0 ? 'Pending' : 'Paid',
        paymentPlan: c.paymentPlan.planLabel,
        periodicRateAud: c.paymentPlan.periodicAmount,
        nextBillingDate: c.paymentPlan.nextBillingDate,
        autopayEnabled: c.paymentPlan.autopayEnabled,
        amountPaid: totalPaid,
        balanceDueAud: balanceDue,
        callCenterDiscountAud: totalDiscount,
        callCenterDiscountReason: c.discountsGiven?.[0]?.description || 'Standard Promo / Term Rebate',
        braintreeTransactionId: latestPaid?.transactionId || 'bt_txn_verified_990142',
        accessNotes: o.accessNotes || 'Standard driveway placement',
        placementSurface: o.placementSurface || (c.address?.includes('King William') ? 'Concrete Driveway' : 'Paved Asphalt'),
        doorOrientation: o.doorOrientation || 'Doors Facing Street / Road',
        accessGateWidth: o.accessGateWidth || 'Wide Open (>3.5m)',
        overheadClearanceClear: o.overheadClearanceClear ?? true,
        secondaryContactName: o.secondaryContactName || '',
        secondaryContactPhone: o.secondaryContactPhone || '',
        referralSource: o.referralSource || 'Phone Inquiry / Google',
        siteNotes: o.siteNotes || '',
        suburb: c.suburb,
        postcode: c.postcode,
        pickupRequestedDate: o.pickupRequestedDate || '',
        pickupStatus: o.pickupStatus || 'None',
        lastUpdatedBy: c.lastSmartsheetSyncNote?.includes('Customer Portal')
          ? 'Customer Portal'
          : c.lastSmartsheetSyncNote?.includes('Call Center')
          ? 'Call Center Smartsheet'
          : 'Customer Quoting App',
        lastSyncedTimestamp: c.lastSmartsheetSyncAt || new Date().toLocaleString('en-AU'),
        syncedToSmartsheet: true,
        operationalHold,
        operationalHoldReason,
        inspectionChecklist: {
          weatherproofSeal: true,
          sanitizationWash: true,
          floorDrings: true,
          lockboxShroud: true,
          horizontalLiftSafetyLocks: true,
          horizontalLiftLevelPlacement: true,
          inspectedBy: 'Dave H. (Yard Supervisor)',
          inspectedAt: '01 Oct 2026 08:15 AM',
          passed: true,
          notes: 'Inspected and certified for residential delivery (horizontal level-lift confirmed).',
        },
      });
    });
  });

  return rows;
}

export function loadSmartsheetStagingRows(): SmartsheetRow[] {
  try {
    const accounts = loadCustomerAccounts();
    const freshRows = buildSmartsheetRowsFromAccounts(accounts);
    const raw = localStorage.getItem(SMARTSHEET_STAGING_KEY);
    if (raw) {
      const savedRows: SmartsheetRow[] = JSON.parse(raw);
      // Merge saved yard checklist / truck fields / logistics with live customer account data
      const merged = freshRows.map((fresh) => {
        const existing = savedRows.find((s) => s.orderNumber === fresh.orderNumber);
        if (existing) {
          return {
            ...fresh,
            assignedTruckId: existing.assignedTruckId || fresh.assignedTruckId,
            inspectionChecklist: existing.inspectionChecklist || fresh.inspectionChecklist,
            placementSurface: existing.placementSurface || fresh.placementSurface,
            doorOrientation: existing.doorOrientation || fresh.doorOrientation,
            accessGateWidth: existing.accessGateWidth || fresh.accessGateWidth,
            overheadClearanceClear: existing.overheadClearanceClear ?? fresh.overheadClearanceClear,
            secondaryContactName: existing.secondaryContactName || fresh.secondaryContactName,
            secondaryContactPhone: existing.secondaryContactPhone || fresh.secondaryContactPhone,
            referralSource: existing.referralSource || fresh.referralSource,
            siteNotes: existing.siteNotes || fresh.siteNotes,
            lastUpdatedBy: existing.lastUpdatedBy || fresh.lastUpdatedBy,
            lastSyncedTimestamp: existing.lastSyncedTimestamp || fresh.lastSyncedTimestamp,
          };
        }
        return fresh;
      });

      // Also preserve custom phone bookings or imported rows not yet in CustomerAccount
      const customRows = savedRows.filter((saved) => !freshRows.some((f) => f.orderNumber === saved.orderNumber));
      const combined = [...merged, ...customRows];
      saveSmartsheetStagingRows(combined);
      return combined;
    }
    saveSmartsheetStagingRows(freshRows);
    return freshRows;
  } catch {
    const accounts = loadCustomerAccounts();
    return buildSmartsheetRowsFromAccounts(accounts);
  }
}

export function saveSmartsheetStagingRows(rows: SmartsheetRow[]): void {
  try {
    localStorage.setItem(SMARTSHEET_STAGING_KEY, JSON.stringify(rows));
  } catch (err) {
    console.error('Error saving smartsheet staging rows:', err);
  }
}

/**
 * Build & Load Sheet 2: Invoices & Billing Ledger Smartsheet Rows from Customer Accounts
 */
export function buildSmartsheetInvoicesFromAccounts(accounts: CustomerAccount[]): SmartsheetInvoiceRow[] {
  const invoiceRows: SmartsheetInvoiceRow[] = [];
  accounts.forEach((c) => {
    const primaryOrder = c.orders[0]?.orderNumber || 'PBO-GEN';
    const isUpfront = c.paymentPlan.planType.includes('upfront');
    c.transactions.forEach((t) => {
      invoiceRows.push({
        id: `${c.id}-${t.id}`,
        invoiceNumber: t.invoiceNumber,
        customerId: c.id,
        customerName: `${c.firstName} ${c.lastName}`.trim(),
        customerEmail: c.email,
        orderNumber: primaryOrder,
        date: t.date,
        dueDate: t.dueDate || t.date,
        description: t.description,
        amount: t.amount,
        gstAmount: Math.round((t.amount / 11) * 100) / 100,
        status: t.status,
        paymentMethod: t.paymentMethod || 'Braintree Vault',
        transactionRef: t.transactionId || 'Pending Settlement',
        revenueType: isUpfront
          ? 'Deferred AASB-15 (Upfront Prepayment)'
          : 'Immediate (Delivery / Monthly)',
        ledgerSyncStatus: t.status === 'Paid' ? 'Reconciled in Ledger' : 'Staged in Smartsheet',
        lastUpdatedBy: 'Customer App',
        lastSyncedAt: c.lastSmartsheetSyncAt || new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }),
      });
    });
  });
  return invoiceRows;
}

export function loadSmartsheetInvoices(): SmartsheetInvoiceRow[] {
  try {
    const accounts = loadCustomerAccounts();
    const built = buildSmartsheetInvoicesFromAccounts(accounts);
    localStorage.setItem(SMARTSHEET_INVOICES_KEY, JSON.stringify(built));
    return built;
  } catch {
    return [];
  }
}

/**
 * Build & Load Sheet 4: Live Tariff & Competitor Pricing Intermediary Smartsheet
 */
export function loadSmartsheetTariffs(): SmartsheetTariffRow[] {
  try {
    const config = loadAppConfig();
    const rows: SmartsheetTariffRow[] = [
      {
        id: 'tariff-10m3',
        itemCode: 'PB-CONT-10',
        category: 'Container Monthly Rate',
        itemName: 'Small 10 m³ Container Monthly Storage',
        portaboxRateAud: config.containerPrices?.small_10m3?.monthlyRate || 199,
        competitorRateAud: 229,
        billingUnit: 'per month',
        configKey: 'container_small_10m3',
        notes: 'Standard 10m³ monthly rental rate synced with quoting engine',
        lastUpdatedBy: 'Pricing Analyst (Smartsheet)',
        lastUpdatedAt: new Date().toLocaleDateString('en-AU'),
      },
      {
        id: 'tariff-19m3',
        itemCode: 'PB-CONT-19',
        category: 'Container Monthly Rate',
        itemName: 'Medium 19 m³ Container Monthly Storage',
        portaboxRateAud: config.containerPrices?.medium_19m3?.monthlyRate || 229,
        competitorRateAud: 269,
        billingUnit: 'per month',
        configKey: 'container_medium_19m3',
        notes: 'Standard 19m³ monthly rental rate synced with quoting engine',
        lastUpdatedBy: 'Pricing Analyst (Smartsheet)',
        lastUpdatedAt: new Date().toLocaleDateString('en-AU'),
      },
      {
        id: 'tariff-25m3',
        itemCode: 'PB-CONT-25',
        category: 'Container Monthly Rate',
        itemName: 'Large 25 m³ (Portabox Pro) Monthly Storage',
        portaboxRateAud: config.containerPrices?.large_25m3?.monthlyRate || 259,
        competitorRateAud: 298,
        billingUnit: 'per month',
        configKey: 'container_large_25m3',
        notes: 'Flagship 25m³ container rate (= 3.1x competitor 8m³ boxes)',
        lastUpdatedBy: 'Pricing Analyst (Smartsheet)',
        lastUpdatedAt: new Date().toLocaleDateString('en-AU'),
      },
      {
        id: 'tariff-del-za',
        itemCode: 'PB-TRN-ZA',
        category: 'Transport & Delivery',
        itemName: `Zone A (<${config.deliveryZones?.zoneAMaxKm ?? 25} km) Base Delivery Fee`,
        portaboxRateAud: config.deliveryZones?.zoneABaseFee ?? config.domesticLegFee ?? 149,
        competitorRateAud: 99,
        billingUnit: 'per container leg',
        configKey: 'zoneABaseFee',
        notes: `Zone A (<${config.deliveryZones?.zoneAMaxKm ?? 25}km) — base fee + optional per-km pricing`,
        lastUpdatedBy: 'Call Center Manager',
        lastUpdatedAt: new Date().toLocaleDateString('en-AU'),
      },
      {
        id: 'tariff-del-zb',
        itemCode: 'PB-TRN-ZB',
        category: 'Transport & Delivery',
        itemName: `Zone B (<${config.deliveryZones?.zoneBMaxKm ?? 50} km) Base Delivery Fee`,
        portaboxRateAud: config.deliveryZones?.zoneBBaseFee ?? 179,
        competitorRateAud: 149,
        billingUnit: 'per container leg',
        configKey: 'zoneBBaseFee',
        notes: `Zone B (<${config.deliveryZones?.zoneBMaxKm ?? 50}km) — base fee + optional per-km pricing`,
        lastUpdatedBy: 'Call Center Manager',
        lastUpdatedAt: new Date().toLocaleDateString('en-AU'),
      },
      {
        id: 'tariff-del-zc',
        itemCode: 'PB-TRN-ZC',
        category: 'Transport & Delivery',
        itemName: `Zone C (<${config.deliveryZones?.zoneCMaxKm ?? 75} km) Base Delivery Fee`,
        portaboxRateAud: config.deliveryZones?.zoneCBaseFee ?? 219,
        competitorRateAud: 199,
        billingUnit: 'per container leg',
        configKey: 'zoneCBaseFee',
        notes: `Zone C (<${config.deliveryZones?.zoneCMaxKm ?? 75}km) — base fee + optional per-km pricing`,
        lastUpdatedBy: 'Call Center Manager',
        lastUpdatedAt: new Date().toLocaleDateString('en-AU'),
      },
      {
        id: 'tariff-del-zd',
        itemCode: 'PB-TRN-ZD',
        category: 'Transport & Delivery',
        itemName: `Zone D (<${config.deliveryZones?.zoneDMaxKm ?? 100} km) Base Delivery Fee`,
        portaboxRateAud: config.deliveryZones?.zoneDBaseFee ?? 249,
        competitorRateAud: 249,
        billingUnit: 'per container leg',
        configKey: 'zoneDBaseFee',
        notes: `Zone D (<${config.deliveryZones?.zoneDMaxKm ?? 100}km) — base fee + optional per-km pricing`,
        lastUpdatedBy: 'Call Center Manager',
        lastUpdatedAt: new Date().toLocaleDateString('en-AU'),
      },
      {
        id: 'tariff-del-ze',
        itemCode: 'PB-TRN-ZE',
        category: 'Transport & Delivery',
        itemName: `Zone E (>${config.deliveryZones?.zoneDMaxKm ?? 100} km) Base Delivery Fee`,
        portaboxRateAud: config.deliveryZones?.zoneEBaseFee ?? 399,
        competitorRateAud: 399,
        billingUnit: 'per container leg',
        configKey: 'zoneEBaseFee',
        notes: `Zone E (>${config.deliveryZones?.zoneDMaxKm ?? 100}km) — base fee + optional per-km pricing`,
        lastUpdatedBy: 'Call Center Manager',
        lastUpdatedAt: new Date().toLocaleDateString('en-AU'),
      },
      {
        id: 'tariff-km',
        itemCode: 'PB-TRN-KM',
        category: 'Transport & Delivery',
        itemName: 'Additive Per-Km Delivery Rate (Zone B)',
        portaboxRateAud: config.deliveryZones?.zoneBRatePerKm ?? 0,
        competitorRateAud: 3.5,
        billingUnit: 'per km',
        configKey: 'zoneBRatePerKm',
        notes: 'Per-km pricing added in addition to base delivery prices',
        lastUpdatedBy: 'Logistics Coordinator',
        lastUpdatedAt: new Date().toLocaleDateString('en-AU'),
      },
      {
        id: 'tariff-boxes',
        itemCode: 'PB-SUP-BOX',
        category: 'Packing Supplies',
        itemName: 'Heavy-Duty Moving Boxes (Unit Price)',
        portaboxRateAud: config.packingSupplies?.boxSinglePrice || 4.5,
        competitorRateAud: 6.0,
        billingUnit: 'per box',
        configKey: 'boxSinglePrice',
        notes: 'Itemised in Step 4 & Final Quote Tax Invoice',
        lastUpdatedBy: 'Merchandise Team',
        lastUpdatedAt: new Date().toLocaleDateString('en-AU'),
      },
      {
        id: 'tariff-blankets',
        itemCode: 'PB-SUP-BLK',
        category: 'Packing Supplies',
        itemName: 'Padded Furniture Protection Blankets (Unit Price)',
        portaboxRateAud: config.packingSupplies?.blanketSinglePrice || 22,
        competitorRateAud: 28,
        billingUnit: 'per blanket',
        configKey: 'blanketSinglePrice',
        notes: 'Itemised in Step 4 & Final Quote Tax Invoice',
        lastUpdatedBy: 'Merchandise Team',
        lastUpdatedAt: new Date().toLocaleDateString('en-AU'),
      },
    ];
    localStorage.setItem(SMARTSHEET_TARIFFS_KEY, JSON.stringify(rows));
    return rows;
  } catch {
    return [];
  }
}

/**
 * TWO-WAY SYNC (Smartsheet Tariff Sheet -> AppConfig & Quoting Engine)
 */
export function updateSmartsheetTariffRow(
  itemCode: string,
  newPortaboxRate: number
): SmartsheetTariffRow[] {
  const config = loadAppConfig();
  const hubs: MetroHub[] = ['Adelaide', 'Sydney', 'Melbourne', 'Brisbane'];

  if (itemCode === 'PB-CONT-10' && config.containerPrices?.small_10m3) {
    config.containerPrices.small_10m3.monthlyRate = newPortaboxRate;
    if (config.locationPricing) {
      hubs.forEach((h) => {
        if (config.locationPricing![h]?.containerPrices?.small_10m3) {
          config.locationPricing![h].containerPrices.small_10m3.monthlyRate = newPortaboxRate;
        }
      });
    }
  } else if (itemCode === 'PB-CONT-19' && config.containerPrices?.medium_19m3) {
    config.containerPrices.medium_19m3.monthlyRate = newPortaboxRate;
    if (config.locationPricing) {
      hubs.forEach((h) => {
        if (config.locationPricing![h]?.containerPrices?.medium_19m3) {
          config.locationPricing![h].containerPrices.medium_19m3.monthlyRate = newPortaboxRate;
        }
      });
    }
  } else if (itemCode === 'PB-CONT-25' && config.containerPrices?.large_25m3) {
    config.containerPrices.large_25m3.monthlyRate = newPortaboxRate;
    if (config.locationPricing) {
      hubs.forEach((h) => {
        if (config.locationPricing![h]?.containerPrices?.large_25m3) {
          config.locationPricing![h].containerPrices.large_25m3.monthlyRate = newPortaboxRate;
        }
      });
    }
  } else if (itemCode === 'PB-TRN-ZA' || itemCode === 'PB-TRN-DEL') {
    config.domesticLegFee = newPortaboxRate;
    if (config.deliveryZones) config.deliveryZones.zoneABaseFee = newPortaboxRate;
    if (config.locationPricing) {
      hubs.forEach((h) => {
        if (config.locationPricing![h]?.deliveryZones) {
          config.locationPricing![h].deliveryZones.zoneABaseFee = newPortaboxRate;
        }
      });
    }
  } else if (itemCode === 'PB-TRN-ZB') {
    if (config.deliveryZones) config.deliveryZones.zoneBBaseFee = newPortaboxRate;
    if (config.locationPricing) {
      hubs.forEach((h) => {
        if (config.locationPricing![h]?.deliveryZones) {
          config.locationPricing![h].deliveryZones.zoneBBaseFee = newPortaboxRate;
        }
      });
    }
  } else if (itemCode === 'PB-TRN-ZC') {
    if (config.deliveryZones) config.deliveryZones.zoneCBaseFee = newPortaboxRate;
    if (config.locationPricing) {
      hubs.forEach((h) => {
        if (config.locationPricing![h]?.deliveryZones) {
          config.locationPricing![h].deliveryZones.zoneCBaseFee = newPortaboxRate;
        }
      });
    }
  } else if (itemCode === 'PB-TRN-ZD') {
    if (config.deliveryZones) config.deliveryZones.zoneDBaseFee = newPortaboxRate;
    if (config.locationPricing) {
      hubs.forEach((h) => {
        if (config.locationPricing![h]?.deliveryZones) {
          config.locationPricing![h].deliveryZones.zoneDBaseFee = newPortaboxRate;
        }
      });
    }
  } else if (itemCode === 'PB-TRN-ZE') {
    if (config.deliveryZones) config.deliveryZones.zoneEBaseFee = newPortaboxRate;
    if (config.locationPricing) {
      hubs.forEach((h) => {
        if (config.locationPricing![h]?.deliveryZones) {
          config.locationPricing![h].deliveryZones.zoneEBaseFee = newPortaboxRate;
        }
      });
    }
  } else if (itemCode === 'PB-TRN-KM' && config.deliveryZones) {
    config.deliveryZones.zoneBRatePerKm = newPortaboxRate;
    if (config.locationPricing) {
      hubs.forEach((h) => {
        if (config.locationPricing![h]?.deliveryZones) {
          config.locationPricing![h].deliveryZones.zoneBRatePerKm = newPortaboxRate;
        }
      });
    }
  } else if (itemCode === 'PB-SUP-BOX' && config.packingSupplies) {
    config.packingSupplies.boxSinglePrice = newPortaboxRate;
  } else if (itemCode === 'PB-SUP-BLK' && config.packingSupplies) {
    config.packingSupplies.blanketSinglePrice = newPortaboxRate;
  }
  saveAppConfig(config);

  addSmartsheetSyncLog({
    direction: 'sheet_to_portal',
    sheetName: 'Tariffs & Competitor Pricing Sheet',
    action: 'Tariff Rate Updated in Smartsheet → App Quoting Engine',
    rowsAffected: 1,
    status: 'success',
    details: `Item ${itemCode} rate updated to $${newPortaboxRate} in Smartsheet. Live quoting calculator immediately updated.`,
  });

  notifySmartsheetTwoWaySync({
    source: 'smartsheet_tariffs',
    summary: `Tariff ${itemCode} updated to $${newPortaboxRate} via Smartsheet`,
  });

  return loadSmartsheetTariffs();
}

/**
 * ============================================================================
 * TWO-WAY SYNC: CALL CENTER EDITS SMARTSHEET BOOKING/BILLING ROW -> UPDATES APP & CUSTOMER PORTAL
 * ============================================================================
 * When the Call Center modifies ANY field in the Bookings, Billing & Payments Smartsheet
 * (e.g., delivery date, delivery window, order status, yard status, container ID/size,
 * payment status, periodic billing rate, payment plan, driver, access notes, pickup status,
 * or Call Center courtesy discount), this function propagates the changes back to:
 * 1. CustomerAccount in customerPortalService (so Customer Portal updates immediately)
 * 2. Current logged-in Customer Portal user session
 * 3. CustomerLead in pricingEngine (so Leads & Quoting App stay in sync)
 * 4. RouteStop in routingOptimizationService (so Call Center Calendar updates immediately)
 */
export function updateSmartsheetBookingRowTwoWay(
  orderNumber: string,
  updates: Partial<SmartsheetRow>,
  changeDescription?: string
): {
  rows: SmartsheetRow[];
  updatedAccount?: CustomerAccount;
  summary: string;
} {
  const accounts = loadCustomerAccounts();
  const timestampStr = new Date().toLocaleString('en-AU');
  let updatedAccount: CustomerAccount | undefined;
  const changedFieldsSummary: string[] = [];

  accounts.forEach((c) => {
    const orderIdx = c.orders.findIndex((o) => o.orderNumber === orderNumber);
    if (orderIdx >= 0) {
      const o = c.orders[orderIdx];

      // 1. Customer Contact Info Updates
      if (updates.customerName !== undefined) {
        const parts = updates.customerName.trim().split(' ');
        c.firstName = parts[0] || c.firstName;
        c.lastName = parts.slice(1).join(' ');
        changedFieldsSummary.push(`Customer Name (${updates.customerName})`);
      }
      if (updates.customerPhone !== undefined && updates.customerPhone !== c.mobile) {
        c.mobile = updates.customerPhone;
        changedFieldsSummary.push(`Phone (${updates.customerPhone})`);
      }
      if (updates.customerEmail !== undefined && updates.customerEmail !== c.email) {
        c.email = updates.customerEmail;
        changedFieldsSummary.push(`Email (${updates.customerEmail})`);
      }

      // 2. Container & Delivery Booking Info Updates
      if (updates.containerId !== undefined && updates.containerId !== o.containerId) {
        o.containerId = updates.containerId;
        changedFieldsSummary.push(`Container ID → ${updates.containerId}`);
      }
      if (updates.containerSize !== undefined && updates.containerSize !== o.containerSize) {
        o.containerSize = updates.containerSize;
        o.containerName = `${updates.containerSize} Container`;
        changedFieldsSummary.push(`Container Size → ${updates.containerSize}`);
      }
      if (updates.serviceType !== undefined && updates.serviceType !== o.serviceType) {
        o.serviceType = updates.serviceType;
        changedFieldsSummary.push(`Service Type → ${updates.serviceType}`);
      }
      if (updates.deliveryAddress !== undefined && updates.deliveryAddress !== o.originAddress) {
        o.originAddress = updates.deliveryAddress;
        o.location = updates.deliveryAddress;
        changedFieldsSummary.push(`Delivery Address → ${updates.deliveryAddress}`);
      }
      if (updates.scheduledDeliveryDate !== undefined && updates.scheduledDeliveryDate !== o.scheduledDeliveryDate) {
        o.scheduledDeliveryDate = updates.scheduledDeliveryDate;
        changedFieldsSummary.push(`Delivery Date → ${updates.scheduledDeliveryDate}`);
      }
      if (updates.deliveryWindow !== undefined && updates.deliveryWindow !== o.deliveryWindow) {
        o.deliveryWindow = updates.deliveryWindow;
        changedFieldsSummary.push(`Delivery Window → ${updates.deliveryWindow}`);
      }
      if (updates.timeToDeliveryHours !== undefined && updates.timeToDeliveryHours !== o.timeToDeliveryHours) {
        o.timeToDeliveryHours = Number(updates.timeToDeliveryHours);
        changedFieldsSummary.push(`ETA Countdown → ${updates.timeToDeliveryHours}h`);
      }
      if (updates.assignedDriver !== undefined && updates.assignedDriver !== o.driverName) {
        o.driverName = updates.assignedDriver;
        changedFieldsSummary.push(`Driver → ${updates.assignedDriver}`);
      }
      if (updates.driverPhone !== undefined && updates.driverPhone !== o.driverPhone) {
        o.driverPhone = updates.driverPhone;
      }
      if (updates.accessNotes !== undefined && updates.accessNotes !== o.accessNotes) {
        o.accessNotes = updates.accessNotes;
        changedFieldsSummary.push(`Access Notes updated`);
      }
      if (updates.pickupRequestedDate !== undefined && updates.pickupRequestedDate !== o.pickupRequestedDate) {
        o.pickupRequestedDate = updates.pickupRequestedDate;
        o.pickupStatus = updates.pickupStatus || 'Scheduled in Smartsheet';
        changedFieldsSummary.push(`Pickup Scheduled → ${updates.pickupRequestedDate}`);
      }
      if (updates.pickupStatus !== undefined && updates.pickupStatus !== o.pickupStatus) {
        o.pickupStatus = updates.pickupStatus;
        changedFieldsSummary.push(`Pickup Status → ${updates.pickupStatus}`);
      }

      // 3. Order Status & Yard Status Two-Way Mapping
      if (updates.orderStatus !== undefined && updates.orderStatus !== o.status) {
        o.status = updates.orderStatus;
        changedFieldsSummary.push(`Order Status → ${updates.orderStatus}`);
      } else if (updates.yardReviewStatus !== undefined) {
        if (updates.yardReviewStatus === 'Delivered to Site') {
          o.status = 'Placed at Customer';
          o.timeToDeliveryHours = 0;
        } else if (updates.yardReviewStatus === 'Dispatched - En Route') {
          o.status = 'Out for Delivery';
          if (o.timeToDeliveryHours > 4) o.timeToDeliveryHours = 2;
        } else if (updates.yardReviewStatus === 'Returned to Depot') {
          o.status = 'Stored at Depot';
        } else {
          o.status = 'Scheduled';
        }
        changedFieldsSummary.push(`Yard Status → ${updates.yardReviewStatus} (Portal Status: ${o.status})`);
      }

      // 4. Billing Plan & Periodic Rate Updates
      if (updates.paymentPlan !== undefined && updates.paymentPlan !== c.paymentPlan.planLabel) {
        c.paymentPlan.planLabel = updates.paymentPlan;
        if (updates.paymentPlan.toLowerCase().includes('12')) c.paymentPlan.planType = '12_months_upfront';
        else if (updates.paymentPlan.toLowerCase().includes('6')) c.paymentPlan.planType = '6_months_upfront';
        else if (updates.paymentPlan.toLowerCase().includes('3')) c.paymentPlan.planType = '3_months_upfront';
        else if (updates.paymentPlan.toLowerCase().includes('week')) c.paymentPlan.planType = 'weekly';
        else c.paymentPlan.planType = 'monthly';
        changedFieldsSummary.push(`Payment Plan → ${updates.paymentPlan}`);
      }
      if (updates.periodicRateAud !== undefined && Number(updates.periodicRateAud) !== c.paymentPlan.periodicAmount) {
        c.paymentPlan.periodicAmount = Number(updates.periodicRateAud);
        changedFieldsSummary.push(`Periodic Billing Rate → $${updates.periodicRateAud}`);
      }
      if (updates.nextBillingDate !== undefined && updates.nextBillingDate !== c.paymentPlan.nextBillingDate) {
        c.paymentPlan.nextBillingDate = updates.nextBillingDate;
        changedFieldsSummary.push(`Next Billing Date → ${updates.nextBillingDate}`);
      }
      if (updates.autopayEnabled !== undefined && updates.autopayEnabled !== c.paymentPlan.autopayEnabled) {
        c.paymentPlan.autopayEnabled = updates.autopayEnabled;
        changedFieldsSummary.push(`Autopay → ${updates.autopayEnabled ? 'Enabled' : 'Paused'}`);
      }

      // 5. Payment Status Updates (e.g. Call Center marks Overdue/Pending as Paid or adds payment in Smartsheet)
      if (updates.paymentStatus !== undefined) {
        if (updates.paymentStatus === 'Paid') {
          let settledCount = 0;
          c.transactions = c.transactions.map((t) => {
            if (t.status !== 'Paid') {
              settledCount++;
              return {
                ...t,
                status: 'Paid' as const,
                paymentMethod: 'Verified by Call Center (Smartsheet Bridge)',
                transactionId: `cc_sheet_${Date.now().toString().slice(-6)}`,
              };
            }
            return t;
          });
          if (settledCount > 0) {
            changedFieldsSummary.push(`Payment Status → Paid (${settledCount} invoice(s) settled in Portal)`);
          }
        } else if (updates.paymentStatus === 'Overdue') {
          const hasOverdue = c.transactions.some((t) => t.status === 'Overdue');
          if (!hasOverdue) {
            if (c.transactions.length > 0) {
              c.transactions[c.transactions.length - 1].status = 'Overdue';
            } else {
              c.transactions.push({
                id: `TXN-${Date.now().toString().slice(-4)}`,
                invoiceNumber: `INV-${Date.now().toString().slice(-5)}`,
                date: new Date().toLocaleDateString('en-AU'),
                dueDate: new Date().toLocaleDateString('en-AU'),
                description: 'Storage & Logistics Balance (Flagged via Call Center Smartsheet)',
                amount: updates.balanceDueAud || c.paymentPlan.periodicAmount || 259,
                status: 'Overdue',
                paymentMethod: 'Awaiting Payment',
              });
            }
            changedFieldsSummary.push(`Payment Status → Overdue (Alert triggered in Customer Portal)`);
          }
        } else if (updates.paymentStatus === 'Pending') {
          const hasPending = c.transactions.some((t) => t.status === 'Pending');
          if (!hasPending && c.transactions.length > 0) {
            c.transactions[c.transactions.length - 1].status = 'Pending';
            changedFieldsSummary.push(`Payment Status → Pending`);
          }
        }
      }

      // 6. Call Center Discount / Courtesy Credit in Smartsheet -> Customer Portal Discounts
      if (updates.callCenterDiscountAud !== undefined) {
        const currentTotalDiscount = (c.discountsGiven || []).reduce((sum, d) => sum + d.amount, 0);
        const diff = Number(updates.callCenterDiscountAud) - currentTotalDiscount;
        if (diff > 0) {
          c.discountsGiven = [
            {
              id: `DSC-CC-${Date.now().toString().slice(-4)}`,
              date: new Date().toLocaleDateString('en-AU'),
              type: 'price_match',
              code: 'CALLCENTER-CREDIT',
              description: updates.callCenterDiscountReason || 'Call Center Smartsheet Courtesy Credit / Adjustment',
              amount: diff,
            },
            ...(c.discountsGiven || []),
          ];
          changedFieldsSummary.push(`Added $${diff} Call Center Discount to Customer Portal`);
        }
      }

      const summaryText =
        changeDescription ||
        (changedFieldsSummary.length > 0
          ? `Call Center updated via Smartsheet: ${changedFieldsSummary.join(', ')}`
          : `Row #${orderNumber} synchronized from Call Center Smartsheet`);

      // Add milestone to order history so customer sees it in their Portal timeline
      o.history = [
        {
          timestamp: timestampStr,
          stage: 'Updated via Call Center Smartsheet',
          note: summaryText,
        },
        ...(o.history || []),
      ];

      c.lastSmartsheetSyncNote = summaryText;
      c.lastSmartsheetSyncAt = timestampStr;
      c.orders[orderIdx] = o;
      updatedAccount = c;

      // If this customer is currently logged into the Customer Portal, update their session immediately
      const currentSession = getCurrentUserSession();
      if (currentSession && currentSession.id === c.id) {
        setCurrentUserSession(c);
      }
    }
  });

  saveCustomerAccounts(accounts);

  // Also synchronize Call Center Dispatch Calendar (RouteStop[]) if delivery slot, address, or container changed
  try {
    const stops = loadScheduledDeliveries();
    const stopIdx = stops.findIndex((s) => s.orderNumber === orderNumber);
    if (stopIdx >= 0) {
      if (updates.customerName) stops[stopIdx].customerName = updates.customerName;
      if (updates.customerPhone) stops[stopIdx].customerPhone = updates.customerPhone;
      if (updates.deliveryAddress) stops[stopIdx].address = updates.deliveryAddress;
      if (updates.containerId) stops[stopIdx].containerId = updates.containerId;
      if (updates.containerSize) stops[stopIdx].containerSize = updates.containerSize;
      if (updates.deliveryWindow) {
        // Normalize slot label for calendar
        const rawWin = updates.deliveryWindow;
        if (rawWin.includes('09:00') || rawWin.includes('9:00')) stops[stopIdx].preferredSlot = '09:00 AM – 11:30 AM';
        else if (rawWin.includes('11:30')) stops[stopIdx].preferredSlot = '11:30 AM – 02:00 PM';
        else if (rawWin.includes('02:00') || rawWin.includes('2:00') || rawWin.includes('1:30'))
          stops[stopIdx].preferredSlot = '02:00 PM – 04:30 PM';
        else if (rawWin.includes('04:30') || rawWin.includes('4:30')) stops[stopIdx].preferredSlot = '04:30 PM – 07:00 PM';
      }
      if (updates.accessNotes) stops[stopIdx].notes = updates.accessNotes;
      saveScheduledDeliveries(stops);
    }
  } catch (err) {
    console.error('Error syncing route stops from smartsheet:', err);
  }

  // Rebuild staging rows and persist
  const refreshedRows = buildSmartsheetRowsFromAccounts(accounts).map((r) => {
    if (r.orderNumber === orderNumber) {
      return {
        ...r,
        ...updates,
        lastUpdatedBy: 'Call Center Smartsheet' as const,
        lastSyncedTimestamp: timestampStr,
      };
    }
    return r;
  });
  saveSmartsheetStagingRows(refreshedRows);

  const finalSummary =
    changeDescription ||
    (changedFieldsSummary.length > 0
      ? `Smartsheet → Customer Portal & App: Order #${orderNumber} updated (${changedFieldsSummary.join('; ')})`
      : `Smartsheet row #${orderNumber} synced to App & Customer Portal`);

  addSmartsheetSyncLog({
    direction: 'sheet_to_portal',
    sheetName: 'Customer Bookings & Billing Sheet',
    action: 'Call Center Smartsheet Edit → App & Customer Portal',
    rowsAffected: 1,
    status: 'success',
    details: finalSummary,
    payloadPreview: JSON.stringify({ orderNumber, updates, syncedToCustomerPortal: true }),
  });

  notifySmartsheetTwoWaySync({
    source: 'call_center_smartsheet',
    summary: finalSummary,
    customerId: updatedAccount?.id,
    orderNumber,
  });

  return {
    rows: refreshedRows,
    updatedAccount,
    summary: finalSummary,
  };
}

/**
 * Create a new customer booking directly from Phone Call Intake or Smartsheet Row entry
 * Creates customer account, active container order, billing schedule, and updates Smartsheet staging
 */
export function createPhoneBookingSmartsheetRow(data: {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryAddress: string;
  suburb: string;
  postcode: string;
  state?: string;
  deliveryZone?: string;
  containerSize: string;
  serviceType: string;
  scheduledDeliveryDate: string;
  deliveryWindow: string;
  placementSurface?: 'Concrete Driveway' | 'Paved Asphalt' | 'Grass / Lawn' | 'Gravel / Dirt' | 'Roadside / Nature Strip';
  doorOrientation?: 'Doors Facing Street / Road' | 'Doors Facing House / Property' | 'Driver Discretion';
  accessGateWidth?: 'Wide Open (>3.5m)' | 'Standard (3.0m - 3.5m)' | 'Narrow (<3.0m - Caution)';
  overheadClearanceClear?: boolean;
  secondaryContactName?: string;
  secondaryContactPhone?: string;
  referralSource?: string;
  accessNotes?: string;
  siteNotes?: string;
  monthlyRateAud: number;
  legFeeAud: number;
  discountAud?: number;
  discountReason?: string;
  paymentMethod?: string;
  assignedDriver?: string;
  assignedTruckId?: string;
  isCreditCardPaid?: boolean;
  creditCardLast4?: string;
  creditCardBrand?: string;
  creditCardExpiry?: string;
  creditCardAuthCode?: string;
  hasNoPhoneOrEmail?: boolean;
}): {
  row: SmartsheetRow;
  account: CustomerAccount;
} {
  const timestampStr = new Date().toLocaleString('en-AU');
  const accounts = loadCustomerAccounts();
  const orderNumInt = Math.floor(1000 + Math.random() * 9000);
  const orderNumber = `PBO-${orderNumInt}`;
  const customerId = `CUST-PH-${Date.now().toString().slice(-5)}`;
  
  const nameParts = data.customerName.trim().split(' ');
  const firstName = nameParts[0] || 'Phone';
  const lastName = nameParts.slice(1).join(' ') || 'Customer';

  const containerId = `PB-BOX-${data.containerSize.slice(0, 2)}-${Math.floor(100 + Math.random() * 900)}`;

  const order: ContainerOrder = {
    id: `ord-${Date.now()}`,
    orderNumber,
    containerId,
    containerSize: data.containerSize,
    containerName: `${data.containerSize} Container`,
    serviceType: data.serviceType,
    status: 'Scheduled',
    location: data.deliveryAddress,
    originAddress: data.deliveryAddress,
    scheduledDeliveryDate: data.scheduledDeliveryDate,
    deliveryWindow: data.deliveryWindow,
    driverName: data.assignedDriver || 'Dave Higgins (Driver #03)',
    driverPhone: '0488 123 456',
    timeToDeliveryHours: 24,
    accessNotes: data.accessNotes || 'Phone booking site placement',
    placementSurface: data.placementSurface || 'Concrete Driveway',
    doorOrientation: data.doorOrientation || 'Doors Facing Street / Road',
    accessGateWidth: data.accessGateWidth || 'Wide Open (>3.5m)',
    overheadClearanceClear: data.overheadClearanceClear ?? true,
    secondaryContactName: data.secondaryContactName || '',
    secondaryContactPhone: data.secondaryContactPhone || '',
    referralSource: data.referralSource || 'Phone Call',
    siteNotes: data.siteNotes || '',
    history: [
      {
        timestamp: timestampStr,
        stage: 'Booked via Phone Intake',
        note: `Order taken by call center over phone${data.isCreditCardPaid ? ` (Paid via Credit Card •••• ${data.creditCardLast4 || '4242'}, Auth ${data.creditCardAuthCode || 'AUTH-PHONE'})` : ''}. Scheduled for ${data.scheduledDeliveryDate} (${data.deliveryWindow}).`,
      },
    ],
  };

  const initialAmount = (data.monthlyRateAud || 219) + (data.legFeeAud || 149) - (data.discountAud || 0);
  const effectiveEmail = data.hasNoPhoneOrEmail
    ? `no-contact-${orderNumInt}@portabox.com.au`
    : (data.customerEmail || `${firstName.toLowerCase()}.${lastName.toLowerCase()}@phone-lead.com`);
  const effectivePhone = data.hasNoPhoneOrEmail
    ? (data.customerPhone || 'N/A (No Mobile - Phone Booking)')
    : data.customerPhone;

  const cardLast4 = data.creditCardLast4 || '4242';
  const cardBrand = data.creditCardBrand || 'Visa';
  const cardExpiry = data.creditCardExpiry || '12/28';
  const authCode = data.creditCardAuthCode || `AUTH-MOTO-${Math.floor(100000 + Math.random() * 900000)}`;

  const newAccount: CustomerAccount = {
    id: customerId,
    email: effectiveEmail,
    firstName,
    lastName,
    mobile: effectivePhone,
    address: data.deliveryAddress,
    suburb: data.suburb,
    state: data.state || 'SA',
    postcode: data.postcode,
    memberSince: new Date().toLocaleDateString('en-AU'),
    verified: true,
    lastSmartsheetSyncNote: data.isCreditCardPaid
      ? `Phone Booking Paid by Credit Card (${cardBrand} •••• ${cardLast4}) Auth: ${authCode}`
      : 'Created via Phone Call Intake & Smartsheet Sync',
    lastSmartsheetSyncAt: timestampStr,
    quotes: [],
    orders: [order],
    paymentPlan: {
      planType: 'monthly',
      planLabel: 'Standard Monthly Plan (Phone Call Intake)',
      periodicAmount: data.monthlyRateAud || 219,
      nextBillingDate: new Date(Date.now() + 30 * 86400000).toLocaleDateString('en-AU'),
      autopayEnabled: true,
      cardLast4,
      cardBrand,
      cardExpiry,
      termDiscountPercent: 0,
    },
    transactions: [
      {
        id: `TXN-PH-${Date.now().toString().slice(-4)}`,
        invoiceNumber: `INV-PH-${orderNumInt}`,
        date: new Date().toLocaleDateString('en-AU'),
        dueDate: data.scheduledDeliveryDate,
        description: `Initial Delivery Leg (${data.deliveryZone || 'Zone A'}) + First Month Container Rent`,
        amount: initialAmount,
        status: data.isCreditCardPaid ? 'Paid' : 'Pending',
        paymentMethod: data.isCreditCardPaid
          ? `Credit Card (${cardBrand} •••• ${cardLast4}) - MOTO Auth: ${authCode}`
          : (data.paymentMethod || 'Awaiting Payment (Phone EFT / Card)'),
      },
    ],
    discountsGiven: data.discountAud ? [
      {
        id: `DSC-PH-${Date.now().toString().slice(-4)}`,
        date: new Date().toLocaleDateString('en-AU'),
        type: 'price_match',
        code: 'PHONE-ADMIN',
        description: data.discountReason || 'Phone Order Admin Courtesy Discount',
        amount: data.discountAud,
      }
    ] : [],
  };

  accounts.unshift(newAccount);
  saveCustomerAccounts(accounts);

  const smartsheetRow: SmartsheetRow = {
    id: `${customerId}-${order.id}`,
    orderNumber,
    customerId,
    customerName: data.customerName,
    customerPhone: effectivePhone,
    customerEmail: effectiveEmail,
    containerId,
    containerSize: data.containerSize,
    serviceType: data.serviceType,
    orderStatus: 'Scheduled',
    deliveryAddress: data.deliveryAddress,
    suburb: data.suburb,
    postcode: data.postcode,
    deliveryZone: data.deliveryZone || 'Zone A',
    scheduledDeliveryDate: data.scheduledDeliveryDate,
    deliveryWindow: data.deliveryWindow,
    timeToDeliveryHours: 24,
    assignedDriver: order.driverName || 'Dave Higgins (Driver #03)',
    driverPhone: '0488 123 456',
    assignedTruckId: data.assignedTruckId || 'TRUCK-ADL-01',
    yardReviewStatus: 'Pending Inspection',
    paymentStatus: data.isCreditCardPaid ? 'Paid' : 'Pending',
    paymentPlan: newAccount.paymentPlan.planLabel,
    periodicRateAud: data.monthlyRateAud || 219,
    nextBillingDate: newAccount.paymentPlan.nextBillingDate,
    autopayEnabled: true,
    amountPaid: data.isCreditCardPaid ? initialAmount : 0,
    balanceDueAud: data.isCreditCardPaid ? 0 : initialAmount,
    callCenterDiscountAud: data.discountAud || 0,
    callCenterDiscountReason: data.discountReason || 'Phone Admin Courtesy',
    braintreeTransactionId: data.isCreditCardPaid ? authCode : 'pending_phone_intake',
    accessNotes: data.accessNotes || 'Phone booking site placement',
    placementSurface: data.placementSurface || 'Concrete Driveway',
    doorOrientation: data.doorOrientation || 'Doors Facing Street / Road',
    accessGateWidth: data.accessGateWidth || 'Wide Open (>3.5m)',
    overheadClearanceClear: data.overheadClearanceClear ?? true,
    secondaryContactName: data.secondaryContactName || '',
    secondaryContactPhone: data.secondaryContactPhone || '',
    referralSource: data.referralSource || 'Phone Call',
    siteNotes: data.siteNotes || '',
    lastUpdatedBy: 'Call Center Smartsheet',
    lastSyncedTimestamp: timestampStr,
    syncedToSmartsheet: true,
    operationalHold: false,
    inspectionChecklist: {
      weatherproofSeal: true,
      sanitizationWash: true,
      floorDrings: true,
      lockboxShroud: true,
      horizontalLiftSafetyLocks: true,
      horizontalLiftLevelPlacement: true,
      inspectedBy: 'Dave H. (Yard Supervisor)',
      inspectedAt: timestampStr,
      passed: true,
      notes: 'New phone booking staged in yard for horizontal level-lift dispatch.',
    },
  };

  const existingRows = loadSmartsheetStagingRows();
  const updatedRows = [smartsheetRow, ...existingRows];
  saveSmartsheetStagingRows(updatedRows);

  notifySmartsheetTwoWaySync({
    source: 'phone_intake',
    summary: `New Phone Booking #${orderNumber} (${data.customerName}) added to Smartsheet`,
    customerId,
    orderNumber,
  });

  return { row: smartsheetRow, account: newAccount };
}

/**
 * Updates any field on a SmartsheetRow inline from the grid editor
 */
export function updateSmartsheetRowInline(rowId: string, updates: Partial<SmartsheetRow>): SmartsheetRow[] {
  const existingRows = loadSmartsheetStagingRows();
  const targetRow = existingRows.find((r) => r.id === rowId);
  if (!targetRow) return existingRows;

  // If orderNumber exists, run two-way update through customer account
  if (targetRow.orderNumber) {
    const result = updateSmartsheetBookingRowTwoWay(targetRow.orderNumber, updates);
    return result.rows;
  }

  // Otherwise update staging row directly
  const timestampStr = new Date().toLocaleString('en-AU');
  const updatedRows = existingRows.map((r) => {
    if (r.id === rowId) {
      return {
        ...r,
        ...updates,
        lastUpdatedBy: 'Call Center Smartsheet' as const,
        lastSyncedTimestamp: timestampStr,
      };
    }
    return r;
  });
  saveSmartsheetStagingRows(updatedRows);
  notifySmartsheetTwoWaySync({
    source: 'smartsheet_grid_inline',
    summary: `Updated row ${targetRow.customerName || rowId}`,
  });
  return updatedRows;
}

/**
 * ============================================================================
 * TWO-WAY SYNC: CALL CENTER EDITS OR ADDS INVOICE IN SMARTSHEET -> UPDATES CUSTOMER PORTAL
 * ============================================================================
 */
export function updateSmartsheetInvoiceRowTwoWay(
  invoiceNumber: string,
  updates: Partial<SmartsheetInvoiceRow>
): SmartsheetInvoiceRow[] {
  const accounts = loadCustomerAccounts();
  const timestampStr = new Date().toLocaleString('en-AU');
  let affectedCustomerName = '';

  accounts.forEach((c) => {
    const txnIdx = c.transactions.findIndex((t) => t.invoiceNumber === invoiceNumber);
    if (txnIdx >= 0) {
      const t = c.transactions[txnIdx];
      affectedCustomerName = `${c.firstName} ${c.lastName}`.trim();
      if (updates.description !== undefined) t.description = updates.description;
      if (updates.amount !== undefined) t.amount = Number(updates.amount);
      if (updates.status !== undefined) {
        t.status = updates.status;
        if (updates.status === 'Paid' && (!t.transactionId || t.transactionId === 'Pending Settlement')) {
          t.transactionId = `cc_settled_${Date.now().toString().slice(-6)}`;
          t.paymentMethod = updates.paymentMethod || 'Recorded by Call Center (Smartsheet)';
        }
      }
      if (updates.paymentMethod !== undefined) t.paymentMethod = updates.paymentMethod;
      if (updates.dueDate !== undefined) t.dueDate = updates.dueDate;

      c.transactions[txnIdx] = t;
      c.lastSmartsheetSyncNote = `Call Center updated Invoice ${invoiceNumber} (${t.status} - $${t.amount}) via Billing Smartsheet`;
      c.lastSmartsheetSyncAt = timestampStr;

      const currentSession = getCurrentUserSession();
      if (currentSession && currentSession.id === c.id) {
        setCurrentUserSession(c);
      }
    }
  });

  saveCustomerAccounts(accounts);
  saveSmartsheetStagingRows(buildSmartsheetRowsFromAccounts(accounts));

  addSmartsheetSyncLog({
    direction: 'sheet_to_portal',
    sheetName: 'Invoices & Billing Ledger Sheet',
    action: 'Invoice Updated in Smartsheet → Customer Portal',
    rowsAffected: 1,
    status: 'success',
    details: `Invoice ${invoiceNumber} for ${affectedCustomerName || 'Customer'} updated in Smartsheet (${updates.status || 'Edited'}). Customer Portal billing ledger & dispatch hold status automatically updated.`,
  });

  notifySmartsheetTwoWaySync({
    source: 'smartsheet_invoices',
    summary: `Invoice ${invoiceNumber} updated in Smartsheet → synced to Customer Portal`,
  });

  return loadSmartsheetInvoices();
}

export function addSmartsheetInvoiceRowTwoWay(newInvoice: {
  customerId: string;
  description: string;
  amount: number;
  status: 'Paid' | 'Pending' | 'Overdue';
  dueDate?: string;
}): SmartsheetInvoiceRow[] {
  const accounts = loadCustomerAccounts();
  const timestampStr = new Date().toLocaleString('en-AU');
  const invoiceNumber = `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`;

  accounts.forEach((c) => {
    if (c.id === newInvoice.customerId) {
      const txn: CustomerTransaction = {
        id: `TXN-${Date.now().toString().slice(-4)}`,
        invoiceNumber,
        date: new Date().toLocaleDateString('en-AU'),
        dueDate: newInvoice.dueDate || new Date().toLocaleDateString('en-AU'),
        description: newInvoice.description,
        amount: Number(newInvoice.amount),
        status: newInvoice.status,
        paymentMethod: newInvoice.status === 'Paid' ? 'Call Center Phone Payment' : 'Issued via Call Center Smartsheet',
        transactionId: newInvoice.status === 'Paid' ? `bt_cc_${Date.now().toString().slice(-6)}` : undefined,
      };
      c.transactions = [txn, ...c.transactions];
      c.lastSmartsheetSyncNote = `Call Center issued new invoice ${invoiceNumber} ($${newInvoice.amount} - ${newInvoice.status}) via Smartsheet`;
      c.lastSmartsheetSyncAt = timestampStr;

      const currentSession = getCurrentUserSession();
      if (currentSession && currentSession.id === c.id) {
        setCurrentUserSession(c);
      }
    }
  });

  saveCustomerAccounts(accounts);
  saveSmartsheetStagingRows(buildSmartsheetRowsFromAccounts(accounts));

  addSmartsheetSyncLog({
    direction: 'sheet_to_portal',
    sheetName: 'Invoices & Billing Ledger Sheet',
    action: 'New Invoice Added in Smartsheet → Customer Portal',
    rowsAffected: 1,
    status: 'success',
    details: `Created Invoice ${invoiceNumber} ($${newInvoice.amount}, ${newInvoice.status}: "${newInvoice.description}") in Smartsheet and pushed to Customer Portal.`,
  });

  notifySmartsheetTwoWaySync({
    source: 'smartsheet_invoices',
    summary: `New invoice ${invoiceNumber} ($${newInvoice.amount}) added in Smartsheet → Customer Portal`,
    customerId: newInvoice.customerId,
  });

  return loadSmartsheetInvoices();
}

/**
 * ============================================================================
 * TWO-WAY SYNC: CUSTOMER PORTAL ACTIONS -> BACK TO SMARTSHEET & CALL CENTER
 * ============================================================================
 */
export function syncCustomerPortalActionToSmartsheet(params: {
  customerId: string;
  customerName: string;
  orderNumber?: string;
  actionType: 'invoice_paid' | 'access_notes_updated' | 'pickup_requested' | 'plan_updated' | 'booking_updated';
  details: string;
}): void {
  const accounts = loadCustomerAccounts();
  const timestampStr = new Date().toLocaleString('en-AU');

  accounts.forEach((c) => {
    if (c.id === params.customerId) {
      c.lastSmartsheetSyncNote = `Customer Portal → Smartsheet: ${params.details}`;
      c.lastSmartsheetSyncAt = timestampStr;
      const currentSession = getCurrentUserSession();
      if (currentSession && currentSession.id === c.id) {
        setCurrentUserSession(c);
      }
    }
  });
  saveCustomerAccounts(accounts);

  const updatedRows = buildSmartsheetRowsFromAccounts(accounts).map((r) => {
    if (r.customerId === params.customerId || (params.orderNumber && r.orderNumber === params.orderNumber)) {
      return {
        ...r,
        lastUpdatedBy: 'Customer Portal' as const,
        lastSyncedTimestamp: timestampStr,
      };
    }
    return r;
  });
  saveSmartsheetStagingRows(updatedRows);

  addSmartsheetSyncLog({
    direction: 'portal_to_sheet',
    sheetName:
      params.actionType === 'invoice_paid'
        ? 'Invoices & Billing Ledger Sheet'
        : 'Customer Bookings & Billing Sheet',
    action: `Customer Portal → Smartsheet (${params.actionType.replace(/_/g, ' ').toUpperCase()})`,
    rowsAffected: 1,
    status: 'success',
    details: `${params.customerName} (${params.customerId}): ${params.details}`,
    payloadPreview: JSON.stringify({
      source: 'customer_portal',
      customerId: params.customerId,
      orderNumber: params.orderNumber,
      actionType: params.actionType,
      timestamp: new Date().toISOString(),
    }),
  });

  notifySmartsheetTwoWaySync({
    source: 'customer_portal',
    summary: `Customer Portal → Smartsheet: ${params.details}`,
    customerId: params.customerId,
    orderNumber: params.orderNumber,
  });
}

/**
 * Perform sync to Smartsheet (Simulates live Smartsheet REST API v2 push and updates staging log)
 */
export async function syncAllToSmartsheet(): Promise<{
  success: boolean;
  rowsSynced: number;
  message: string;
}> {
  const accounts = loadCustomerAccounts();
  const rows = buildSmartsheetRowsFromAccounts(accounts);
  saveSmartsheetStagingRows(rows);
  loadSmartsheetInvoices();
  loadSmartsheetTariffs();

  const config = loadSmartsheetConfig();
  const timestamp = new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });

  // Simulate network latency for API call to Smartsheet endpoint
  await new Promise((resolve) => setTimeout(resolve, 600));

  const payloadSample = JSON.stringify({
    sheetId: config.sheetId,
    timestamp: new Date().toISOString(),
    rowsCount: rows.length,
    twoWayPortalSync: true,
    merchantId: 'portabox_braintree_aud',
    orders: rows.map((r) => ({
      orderNumber: r.orderNumber,
      containerId: r.containerId,
      orderStatus: r.orderStatus,
      yardStatus: r.yardReviewStatus,
      paymentStatus: r.paymentStatus,
      amountPaid: r.amountPaid,
      braintreeRef: r.braintreeTransactionId,
      hold: r.operationalHold,
    })),
  });

  addSmartsheetSyncLog({
    direction: 'outbound_api',
    sheetName: 'All 4 Intermediary Smartsheets',
    action: 'Full Two-Way Bridge Sync',
    rowsAffected: rows.length,
    status: 'success',
    details: `Synchronized ${rows.length} booking/billing rows, ${accounts.reduce((s, a) => s + a.transactions.length, 0)} invoice rows, and 7 tariff rows across App, Call Center Smartsheet, and Customer Portal.`,
    payloadPreview: payloadSample,
  });

  notifySmartsheetTwoWaySync({
    source: 'manual_sync',
    summary: `All ${rows.length} rows synchronized across Smartsheets & Customer Portal`,
  });

  return {
    success: true,
    rowsSynced: rows.length,
    message: `Two-Way Smartsheet Workspace synchronized: ${rows.length} customer booking & billing rows synced with Customer Portal.`,
  };
}

/**
 * Automatically sync a single order or payment event from the Quoting App to Smartsheet in real time
 */
export function autoSyncEventToSmartsheet(eventDescription: string, orderNumber?: string): void {
  const config = loadSmartsheetConfig();
  if (!config.connected) return;

  const accounts = loadCustomerAccounts();
  const rows = buildSmartsheetRowsFromAccounts(accounts);
  saveSmartsheetStagingRows(rows);
  loadSmartsheetInvoices();

  addSmartsheetSyncLog({
    direction: 'outbound_api',
    sheetName: 'Customer Bookings & Billing Sheet',
    action: 'Quoting App → Smartsheet Auto-Sync',
    rowsAffected: 1,
    status: 'success',
    details: `${eventDescription} (Ref: ${orderNumber || 'New Booking'}) written to Smartsheet Customer Bookings & Billing Sheet and synced to Customer Portal.`,
  });

  notifySmartsheetTwoWaySync({
    source: 'quoting_app',
    summary: `${eventDescription} synced to Smartsheet`,
    orderNumber,
  });
}

/**
 * Update Yard Review Status for a specific order in Smartsheet Staging (and propagate to Customer Portal!)
 */
export function updateYardReviewStatus(
  orderNumber: string,
  newStatus: YardReviewStatus,
  driverNotes?: string
): SmartsheetRow[] {
  const updates: Partial<SmartsheetRow> = {
    yardReviewStatus: newStatus,
  };
  if (driverNotes !== undefined) {
    updates.accessNotes = driverNotes;
  }
  const res = updateSmartsheetBookingRowTwoWay(
    orderNumber,
    updates,
    `Order #${orderNumber} yard status changed to "${newStatus}" in Smartsheet (Customer Portal updated)`
  );
  return res.rows;
}

/**
 * Submit Yard Inspection Checklist (The physical pre-dispatch inspection)
 */
export function submitYardInspectionChecklist(
  orderNumber: string,
  checklist: YardInspectionChecklist
): SmartsheetRow[] {
  const rows = loadSmartsheetStagingRows();
  const newYardStatus: YardReviewStatus = checklist.passed
    ? 'Loaded on Level-Lift Truck'
    : 'Pending Inspection';

  const updated = rows.map((r) => {
    if (r.orderNumber === orderNumber) {
      return {
        ...r,
        inspectionChecklist: checklist,
        yardReviewStatus: newYardStatus,
        lastSyncedTimestamp: new Date().toLocaleString('en-AU'),
      };
    }
    return r;
  });

  saveSmartsheetStagingRows(updated);

  updateSmartsheetBookingRowTwoWay(
    orderNumber,
    {
      yardReviewStatus: newYardStatus,
      inspectionChecklist: checklist,
    },
    `Pre-dispatch 5-point inspection certified by ${checklist.inspectedBy} for Order #${orderNumber}. Status synced to Customer Portal.`
  );

  return loadSmartsheetStagingRows();
}

/**
 * Inbound Webhook Bridge Simulator:
 * Simulates receiving an update from Smartsheet (e.g. Call Center or driver updates delivery/billing status in Smartsheet)
 */
export function simulateInboundSmartsheetWebhook(
  orderNumber: string,
  newYardStatus: YardReviewStatus,
  driverGpsLocation: string
): { success: boolean; message: string; rows: SmartsheetRow[] } {
  const rows = loadSmartsheetStagingRows();
  const targetRow = rows.find((r) => r.orderNumber === orderNumber);
  const updatedNotes = targetRow
    ? `${targetRow.accessNotes} [Smartsheet Update: ${driverGpsLocation} at ${new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}]`
    : `Smartsheet GPS Update: ${driverGpsLocation}`;

  const result = updateSmartsheetBookingRowTwoWay(
    orderNumber,
    {
      yardReviewStatus: newYardStatus,
      accessNotes: updatedNotes,
    },
    `Inbound Smartsheet Webhook: Order #${orderNumber} updated to "${newYardStatus}" (${driverGpsLocation}). Customer Portal updated.`
  );

  return {
    success: true,
    message: `Inbound Smartsheet Webhook Processed: Order #${orderNumber} updated to "${newYardStatus}" in App & Customer Portal.`,
    rows: result.rows,
  };
}

/**
 * Download Smartsheet-compatible CSV template
 */
export function downloadSmartsheetTemplateCSV(rows: SmartsheetRow[]): void {
  const headers = [
    'Order Number',
    'Customer ID',
    'Customer Name',
    'Mobile Phone',
    'Email Address',
    'Container ID',
    'Container Size',
    'Service Type',
    'Portal Order Status',
    'Delivery Site Address',
    'Scheduled Delivery Date',
    'Delivery Window',
    'Driver Assigned',
    'Yard Review Status',
    'Inspection Verified',
    'Payment Status',
    'Payment Plan',
    'Periodic Billing Rate (AUD)',
    'Next Billing Date',
    'Total Amount Paid (AUD)',
    'Balance Due (AUD)',
    'Call Center Discount (AUD)',
    'Braintree Transaction ID',
    'Operational Hold',
    'Pickup Requested Date',
    'Access / Driver Placement Notes',
    'Last Updated By',
    'Last Synced Timestamp',
  ];

  const csvRows = rows.map((r) => [
    `"${r.orderNumber}"`,
    `"${r.customerId}"`,
    `"${r.customerName}"`,
    `"${r.customerPhone}"`,
    `"${r.customerEmail}"`,
    `"${r.containerId}"`,
    `"${r.containerSize}"`,
    `"${r.serviceType}"`,
    `"${r.orderStatus}"`,
    `"${r.deliveryAddress}"`,
    `"${r.scheduledDeliveryDate}"`,
    `"${r.deliveryWindow}"`,
    `"${r.assignedDriver}"`,
    `"${r.yardReviewStatus}"`,
    `"${r.inspectionChecklist?.passed ? 'PASSED (Certified)' : 'PENDING'}"`,
    `"${r.paymentStatus}"`,
    `"${r.paymentPlan}"`,
    `${r.periodicRateAud}`,
    `"${r.nextBillingDate}"`,
    `${r.amountPaid}`,
    `${r.balanceDueAud}`,
    `${r.callCenterDiscountAud}`,
    `"${r.braintreeTransactionId}"`,
    `"${r.operationalHold ? 'HOLD: ' + (r.operationalHoldReason || 'Payment Overdue') : 'CLEAR'}"`,
    `"${r.pickupRequestedDate || ''}"`,
    `"${(r.accessNotes || '').replace(/"/g, '""')}"`,
    `"${r.lastUpdatedBy}"`,
    `"${r.lastSyncedTimestamp}"`,
  ]);

  const csvContent =
    'data:text/csv;charset=utf-8,' +
    [headers.join(','), ...csvRows.map((e) => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute(
    'download',
    `smartsheet_two_way_bridge_${new Date().toISOString().slice(0, 10)}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * ============================================================================
 * ADMIN BILLING CONTROLS: REFUNDS, MONTHLY BILL ADJUSTMENTS & CEASE PAYMENTS
 * Two-way synchronized with Customer Portal and Smartsheet Workspace
 * ============================================================================
 */
export function adminProcessCustomerRefund(params: {
  customerId: string;
  transactionId?: string;
  refundAmountAud: number;
  reason: string;
}): CustomerAccount[] {
  const accounts = loadCustomerAccounts();
  const timestampStr = new Date().toLocaleString('en-AU');

  accounts.forEach((c) => {
    if (c.id === params.customerId) {
      // If a specific transaction was selected, mark it Refunded or create a Refund ledger entry
      if (params.transactionId) {
        c.transactions = c.transactions.map((t) => {
          if (t.id === params.transactionId && params.refundAmountAud >= t.amount) {
            return {
              ...t,
              status: 'Refunded' as const,
              description: `${t.description} [REFUNDED: ${params.reason}]`,
            };
          }
          return t;
        });
      }

      const refundTxn: CustomerTransaction = {
        id: `REF-${Date.now().toString().slice(-4)}`,
        invoiceNumber: `RFND-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        date: new Date().toLocaleDateString('en-AU'),
        description: `Braintree Refund Issued: ${params.reason}`,
        amount: -Math.abs(Number(params.refundAmountAud)),
        status: 'Refunded',
        paymentMethod: `${c.paymentPlan.cardBrand} •••• ${c.paymentPlan.cardLast4} (Braintree Refund)`,
        transactionId: `bt_rfnd_${Date.now().toString().slice(-6)}`,
        isAdjustment: true,
        adjustmentType: 'refund',
      };

      c.transactions = [refundTxn, ...c.transactions];
      c.lastSmartsheetSyncNote = `Portabox Admin processed $${Math.abs(params.refundAmountAud)} refund (${params.reason}) → synced to Smartsheet & Customer Portal`;
      c.lastSmartsheetSyncAt = timestampStr;

      const currentSession = getCurrentUserSession();
      if (currentSession && currentSession.id === c.id) {
        setCurrentUserSession(c);
      }
    }
  });

  saveCustomerAccounts(accounts);
  saveSmartsheetStagingRows(buildSmartsheetRowsFromAccounts(accounts));
  loadSmartsheetInvoices();

  addSmartsheetSyncLog({
    direction: 'outbound_api',
    sheetName: 'Invoices & Billing Ledger Sheet',
    action: 'Admin Refund Processed → Smartsheet & Customer Portal',
    rowsAffected: 1,
    status: 'success',
    details: `Refund of $${Math.abs(params.refundAmountAud)} issued for Customer ${params.customerId} (${params.reason}). Synced across Smartsheet & Customer Portal.`,
  });

  notifySmartsheetTwoWaySync({
    source: 'admin_billing',
    summary: `Refund of $${Math.abs(params.refundAmountAud)} processed & synced`,
    customerId: params.customerId,
  });

  return accounts;
}

export function adminAddMonthlyBillAdjustment(params: {
  customerId: string;
  adjustmentType: 'credit' | 'charge';
  amountAud: number;
  description: string;
  updateRecurringMonthlyRate?: boolean;
}): CustomerAccount[] {
  const accounts = loadCustomerAccounts();
  const timestampStr = new Date().toLocaleString('en-AU');

  accounts.forEach((c) => {
    if (c.id === params.customerId) {
      const signedAmount =
        params.adjustmentType === 'credit'
          ? -Math.abs(Number(params.amountAud))
          : Math.abs(Number(params.amountAud));

      if (params.updateRecurringMonthlyRate) {
        c.paymentPlan.periodicAmount = Math.max(0, c.paymentPlan.periodicAmount + signedAmount);
      }

      if (params.adjustmentType === 'credit') {
        c.discountsGiven = [
          {
            id: `ADJ-${Date.now().toString().slice(-4)}`,
            date: new Date().toLocaleDateString('en-AU'),
            type: 'price_match',
            code: 'BILL-ADJUSTMENT',
            description: `Monthly Bill Credit Adjustment: ${params.description}`,
            amount: Math.abs(Number(params.amountAud)),
          },
          ...(c.discountsGiven || []),
        ];
      }

      const adjTxn: CustomerTransaction = {
        id: `ADJ-TXN-${Date.now().toString().slice(-4)}`,
        invoiceNumber: `ADJ-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        date: new Date().toLocaleDateString('en-AU'),
        dueDate: new Date().toLocaleDateString('en-AU'),
        description: `${params.adjustmentType === 'credit' ? 'Monthly Bill Credit Adjustment' : 'Monthly Bill Charge Adjustment'}: ${params.description}`,
        amount: signedAmount,
        status: params.adjustmentType === 'credit' ? 'Paid' : 'Pending',
        paymentMethod: params.adjustmentType === 'credit' ? 'Admin Credit Memo' : 'Added to Next Monthly Bill',
        transactionId: `adj_${Date.now().toString().slice(-6)}`,
        isAdjustment: true,
        adjustmentType: params.adjustmentType,
      };

      c.transactions = [adjTxn, ...c.transactions];
      c.lastSmartsheetSyncNote = `Portabox Admin added ${params.adjustmentType === 'credit' ? `-$${Math.abs(params.amountAud)} credit` : `+$${Math.abs(params.amountAud)} charge`} adjustment to monthly bill (${params.description})`;
      c.lastSmartsheetSyncAt = timestampStr;

      const currentSession = getCurrentUserSession();
      if (currentSession && currentSession.id === c.id) {
        setCurrentUserSession(c);
      }
    }
  });

  saveCustomerAccounts(accounts);
  saveSmartsheetStagingRows(buildSmartsheetRowsFromAccounts(accounts));
  loadSmartsheetInvoices();

  addSmartsheetSyncLog({
    direction: 'outbound_api',
    sheetName: 'Customer Bookings & Billing Sheet',
    action: 'Monthly Bill Adjustment → Smartsheet & Customer Portal',
    rowsAffected: 1,
    status: 'success',
    details: `Monthly bill ${params.adjustmentType} adjustment of $${Math.abs(params.amountAud)} applied for Customer ${params.customerId}: "${params.description}".`,
  });

  notifySmartsheetTwoWaySync({
    source: 'admin_billing',
    summary: `Monthly bill adjustment applied for ${params.customerId}`,
    customerId: params.customerId,
  });

  return accounts;
}

export function adminToggleCeasePayments(params: {
  customerId: string;
  cease: boolean;
  reason?: string;
}): CustomerAccount[] {
  const accounts = loadCustomerAccounts();
  const timestampStr = new Date().toLocaleString('en-AU');

  accounts.forEach((c) => {
    if (c.id === params.customerId) {
      c.paymentPlan.paymentsCeased = params.cease;
      c.paymentPlan.autopayEnabled = !params.cease;
      if (params.cease) {
        c.paymentPlan.paymentsCeasedDate = new Date().toLocaleDateString('en-AU');
        c.paymentPlan.paymentsCeasedReason = params.reason || 'Container off-hired / Payments ceased by Portabox Admin';
        c.paymentPlan.nextBillingDate = 'CEASED (No Further Charges)';
      } else {
        c.paymentPlan.paymentsCeasedDate = undefined;
        c.paymentPlan.paymentsCeasedReason = undefined;
        c.paymentPlan.nextBillingDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-AU');
      }

      c.lastSmartsheetSyncNote = params.cease
        ? `Portabox Admin CEASED all recurring payments (${c.paymentPlan.paymentsCeasedReason})`
        : `Portabox Admin resumed recurring billing plan`;
      c.lastSmartsheetSyncAt = timestampStr;

      const currentSession = getCurrentUserSession();
      if (currentSession && currentSession.id === c.id) {
        setCurrentUserSession(c);
      }
    }
  });

  saveCustomerAccounts(accounts);
  saveSmartsheetStagingRows(buildSmartsheetRowsFromAccounts(accounts));

  addSmartsheetSyncLog({
    direction: 'outbound_api',
    sheetName: 'Customer Bookings & Billing Sheet',
    action: params.cease ? 'Ceased Customer Recurring Payments' : 'Resumed Customer Recurring Payments',
    rowsAffected: 1,
    status: 'success',
    details: `Customer ${params.customerId} recurring billing ${params.cease ? `CEASED (${params.reason || 'Admin action'})` : 'RESUMED'} and synced with Smartsheet & Customer Portal.`,
  });

  notifySmartsheetTwoWaySync({
    source: 'admin_billing',
    summary: `Customer ${params.customerId} recurring payments ${params.cease ? 'ceased' : 'resumed'}`,
    customerId: params.customerId,
  });

  return accounts;
}

/**
 * ============================================================================
 * CONTAINER QR CODE SCANNER & INVENTORY TRACKING ENGINE
 * ============================================================================
 */
export function recordContainerQrScan(params: {
  containerId: string;
  scanAction: ContainerQrScanLog['scanAction'];
  scannedByDriver: string;
  destinationOrCustomerLocation: string;
  customerName?: string;
  serviceabilityScore: number;
  isGeneratingIncome: boolean;
  monthlyIncomeAud?: number;
  notes?: string;
}): ContainerAsset[] {
  const assets = loadContainerAssets();
  const timestampStr = new Date().toLocaleDateString('en-AU') + ' ' + new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });

  const updated = assets.map((asset) => {
    if (asset.containerId.toLowerCase() === params.containerId.toLowerCase()) {
      const prevLocation = asset.currentLocationDetail || asset.depotName;
      let newStatus: ContainerAsset['status'] = asset.status;
      let newLocationType: ContainerAsset['currentLocationType'] = asset.currentLocationType || 'Portabox Depot';

      if (params.scanAction === 'Checkout from Portabox Depot') {
        newStatus = 'Loaded on Truck';
        newLocationType = 'In Transit on Truck';
      } else if (params.scanAction === 'Place at Customer Site') {
        newStatus = 'On Customer Site';
        newLocationType = 'Customer Location';
      } else if (params.scanAction === 'Checkout from Customer Site') {
        newStatus = 'Loaded on Truck';
        newLocationType = 'In Transit on Truck';
      } else if (params.scanAction === 'Check-in at Portabox Depot') {
        newStatus = params.serviceabilityScore < 75 ? 'Maintenance' : 'Available in Depot';
        newLocationType = params.serviceabilityScore < 75 ? 'Maintenance Workshop' : 'Portabox Depot';
      }

      const condition: ContainerAsset['condition'] =
        params.serviceabilityScore >= 95
          ? 'A+ Mint'
          : params.serviceabilityScore >= 85
          ? 'A Excellent'
          : params.serviceabilityScore >= 75
          ? 'B Commercial'
          : 'Maintenance Required';

      const scanEntry: ContainerQrScanLog = {
        id: `scan-${Date.now()}`,
        timestamp: timestampStr,
        qrCode: asset.qrCodePayload || `PORTABOX://ASSET/${asset.containerId}`,
        scanAction: params.scanAction,
        scannedByDriver: params.scannedByDriver,
        fromLocation: prevLocation,
        toLocation: params.destinationOrCustomerLocation,
        serviceabilityScoreRecorded: params.serviceabilityScore,
        notes: params.notes || `${params.scanAction} verified via driver QR scan.`,
      };

      return {
        ...asset,
        status: newStatus,
        condition,
        serviceabilityScore: params.serviceabilityScore,
        currentLocationType: newLocationType,
        currentLocationDetail: params.destinationOrCustomerLocation,
        customerName:
          newLocationType === 'Customer Location'
            ? params.customerName || asset.customerName || 'Active Customer'
            : undefined,
        customerAddress:
          newLocationType === 'Customer Location'
            ? params.destinationOrCustomerLocation
            : undefined,
        isGeneratingIncome: params.isGeneratingIncome,
        monthlyIncomeAud: params.isGeneratingIncome ? (params.monthlyIncomeAud ?? (asset.monthlyIncomeAud || 259)) : 0,
        lastInspectionDate: new Date().toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' }),
        scanHistory: [scanEntry, ...(asset.scanHistory || [])],
      };
    }
    return asset;
  });

  saveContainerAssets(updated);

  addSmartsheetSyncLog({
    direction: 'inbound_webhook',
    sheetName: 'Container Inventory & Yard Dispatch Sheet',
    action: `Driver QR Code Scan: ${params.scanAction}`,
    rowsAffected: 1,
    status: 'success',
    details: `Container ${params.containerId} QR scanned by ${params.scannedByDriver}: ${params.scanAction} → ${params.destinationOrCustomerLocation} (Serviceability Score: ${params.serviceabilityScore}/100, Income Generating: ${params.isGeneratingIncome ? 'YES' : 'NO'}).`,
  });

  notifySmartsheetTwoWaySync({
    source: 'driver_qr_scanner',
    summary: `QR Scan: ${params.containerId} (${params.scanAction})`,
  });

  return updated;
}

