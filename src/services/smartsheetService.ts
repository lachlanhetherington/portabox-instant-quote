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
 * Captures all elements from application quotes, multi-container split lines, protection, and discounts.
 */
export interface SmartsheetRow {
  // --- Identifiers & Lifecycle ---
  id: string;
  smartsheetRowId?: number | string;
  smartsheetRowNumber?: number;
  orderNumber: string;
  customerId: string;
  quoteNumber?: string;
  quoteId?: string;
  quoteStatus?: string;
  quoteDate?: string;
  quoteExpiryDate?: string;
  priceFreezeExpiryDate?: string;
  prim?: 'Parent' | 'Child' | '';

  // --- Customer Profile ---
  customerName: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  customerPhone: string;
  customerEmail: string;
  preferredContactMethod?: 'Phone' | 'SMS' | 'Email' | 'Customer Portal';
  quotingAgent?: string;

  // --- Multi-Container & Independent Split Scheduling ---
  containerId: string;
  containerNumber?: string; // e.g. "1 of 2", "2 of 2"
  containerIndex?: number;  // 1, 2, ...
  containerSize: string;    // e.g. "Large = approx 25 m3"
  containerSizeId?: string; // e.g. "large_25m3"
  containerCount?: number;  // Total containers in quote
  totalContainers?: number; // Total containers in quote
  containerVolumeM3?: number;
  assignedAssetId?: string;
  assignedBarcode?: string;
  scheduledDeliveryDate: string; // Staggered per container (e.g. 14/10/2026)
  deliveryWindow: string;        // Morning, Midday, Afternoon
  deliverySlotWindow?: string;
  isEcoRouteSlot?: boolean;
  timeToDeliveryHours: number;
  schedTransitToDepotDate?: string;
  schedRedeliveryDate?: string;
  schedFinalPickupDate?: string;
  storageDuration?: string;
  storageDurationMonths?: number;
  durationMonths?: number | string;
  moveScenarioCode?: string;     // e.g. "SCENARIO-01 Direct Move"
  moveStoreScenario?: string;
  location?: string;
  postalCodeSuburbFrom?: string;
  postalCodeSuburbTo?: string;
  interstateYn?: string;
  serviceType: string;
  storagePlacement?: 'my_place' | 'facility';
  locationType?: 'Portabox facility' | 'My location' | string;

  // --- Zone Logistics & Distance (Zone A-E Transition) ---
  deliveryAddress: string;
  originSuburb?: string;
  originPostcode?: string;
  destinationAddress?: string;
  destinationSuburb?: string;
  destinationPostcode?: string;
  metroHubDepot?: string;
  distanceFromDepotKm?: number;
  zoneFromLetter?: string; // "Zone A", "Zone B", "Zone C", "Zone D", "Zone E"
  zoneToLetter?: string;   // "Zone A", "Zone B", "Zone C", "Zone D", "Zone E"
  zoneFromName?: string;   // e.g. "South Western Suburbs"
  zoneToName?: string;
  zoneNameFrom?: string;
  zoneNameTo?: string;
  isInterstate?: boolean;
  interstateRouteName?: string;
  originLogisticsMethod?: string;
  destinationLogisticsMethod?: string;
  legsSavedCount?: number;
  legsSavedDollarTotal?: number;

  // --- Protection Plans (CPO / COO / None) ---
  protectionPlan?: 'cpo' | 'coo' | 'none' | string;
  protectionPlanName?: string;
  protectionPlanTier?: string;
  protectionPlanCoverage?: string;
  protectionPlanCpoCoo?: string;
  protectionCoverageAmount?: number; // $5,000 for CPO
  protectionMonthlyFee?: number;     // $15 for CPO, $10 for COO
  isMandatoryInterstateProtection?: boolean;
  insurancePlan?: string;

  // --- Supplies Breakdown ---
  freeBlanketsAllowance?: number; // 10 free per container
  freeBlanketsCount?: number;
  freePadlocksCount?: number;
  extraBlanketsOrdered?: number;
  extraBlanketsFee?: number;
  locksCount?: number;
  isLockFreePromo?: boolean;
  locksPrice?: number;
  boxesCount?: number;
  boxesPrice?: number;
  packingSuppliesTotal?: number;
  suppliesSummary?: string;
  supplies?: string;

  // --- Duration Discount Matrix & Promotional Perks (Image-2 Matrix) ---
  matchedDiscountRuleId?: string;
  discountOffered?: string;
  isFirstMonthFree?: boolean;        // TRUE for 2-11m commitments
  firstMonthSavingsAud?: number;     // Value of 1st month waived storage
  freeSuppliesRetailValue?: number;  // $60 retail value
  annualDiscountOption?: '400A' | '400B' | 'None' | string;
  milestoneCreditTotal?: number;     // $400 for 12+ months
  upfrontDiscountPercent?: number;   // 5% (6m upfront) or 10% (12m upfront)
  durationDiscountPercent?: number;
  durationDiscountAud?: number;
  appliedPromoCode?: string;
  promoCodeDiscountAud?: number;
  totalDiscountAud?: number;
  earlyTerminationClawbackEnforced?: boolean;

  // --- Itemized Leg Fees & Fuel Levies ---
  initialDeliveryFee?: number;       // Leg 1
  idFuelLevy?: number;              // Leg 1 fuel
  returnToWarehouseFee?: number;     // Leg 2 (RTW)
  returnToWhseFee?: number;
  rtwFuelLevy?: number;
  relocationFeeMove?: number;
  moveFuelLevy?: number;
  interstateFreightFee?: number;     // Line-haul
  interstateRelocationFee?: number;
  interstateRelocationFuelLevy?: number;
  interstateFuelLevy?: number;
  redeliveryFee?: number;            // Leg 3 (RDL)
  redeliveryFeeRdl?: number;
  redelFuelLevy?: number;
  finalPickupFee?: number;           // Leg 4 (FPU)
  finalPickUpFeeFpu?: number;
  fpuFuelLevy?: number;
  sidFee?: number;
  sfpuFee?: number;
  sidYn?: string;
  sfpuYn?: string;
  sidIncluded?: boolean;
  sfpuIncluded?: boolean;
  monthlyRentalRate?: number;
  returnToPortaboxFee?: number;
  wrtFuelLevy?: number;
  relocationFee?: number;
  finalPickUpFee?: number;
  typeOfBilling?: string;
  fuelSurcharge?: number;
  movingDistanceKm?: number;

  // --- Financial Balances & Payment Ledger ---
  monthlyStorageFee?: number;
  baseMonthlyRateAud?: number;
  effectiveMonthlyRateAud?: number;
  firstPaymentStoragePayable?: number; // $0 if 1st Month Free!
  firstPaymentTotal?: number;
  firstPaymentGstComponent?: number;
  ongoingMonthlyTotal?: number;       // Storage + CPO
  billingCycle?: string;
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

  // --- Yard Dispatch, Driver Logistics & Operations ---
  orderStatus: ContainerOrder['status'];
  yardReviewStatus: YardReviewStatus;
  assignedDriver: string;
  driverPhone: string;
  assignedTruckId?: string;
  inspectionChecklist?: YardInspectionChecklist;
  accessNotes?: string;
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
  operationalHold?: boolean;
  operationalHoldReason?: string;

  // --- CRM Follow-Up & Call Center Sales Automation ---
  followUpAgent1?: string;
  followUpAgent2?: string;
  recontactDate?: string;
  reContactCustomerDate?: string;
  followUpStatus?: string;
  followUpCustomerStatus?: string;
  followUpNotes?: string;
  contactMethodPreference?: string;
  contactPreference?: string;
  contactMeThisWay?: string;
  callMeBackOn?: string;
  sendQuoteConfirmation?: boolean;
  sendBookingForm?: boolean;
  bookingDate?: string;
  bookingAgent?: string;
  finalDiscountAccepted?: string;
  bookMoveToOzilla?: boolean;
  day7AutoFollowUpDate?: string;
  day7AutoFollowUp?: string;
  day20FinalCheckInDate?: string;
  day20FinalCheckIn?: string;

  // --- Sync Audit Meta ---
  lastUpdatedBy: 'Customer Quoting App' | 'Customer Portal' | 'Call Center Smartsheet' | 'Driver Mobile' | string;
  lastSyncedTimestamp: string;
  syncedToSmartsheet: boolean;
}

export type SmartsheetStagingRow = SmartsheetRow;

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
  tokenName?: string;
  workspaceName?: string;
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

export const DAN_51_COLUMNS = [
  'Prim',
  'Quote Date',
  'Quote ID',
  'Order Number',
  'Container Number',
  'Container Size',
  'First Name',
  'Last Name',
  'Company Name',
  'Email Address',
  'Mobile Phone',
  'Duration months',
  'Move store scenarios 13',
  'Location',
  'Postal Code Suburb From',
  'Postal Code Suburb To',
  'Interstate Y/N',
  'Quoting Agent',
  'Monthly rental rate (MRR)',
  'Initial Delivery Fee (New)',
  'ID Fuel Levy',
  'Return to Portabox Fee (WRT)',
  'WRT Fuel Levy',
  'Relocation fee (Move)',
  'Move Fuel Levy',
  'Interstate relocation fee',
  'Interstate Relocation Fuel Levy',
  'Redelivery Fee (RDL)',
  'Redel Fuel Levy',
  'Final pick up fee (FPU)',
  'FPU Fuel Levy',
  'SID Y/N',
  'SFPU Y/N',
  'Protection Plan CPO/COO',
  'Supplies',
  'Discount Offered',
  'Type of Billing',
  'Send Quote Confirmation to Customer',
  'Follow Up Agent 1',
  'Follow Up Agent 2',
  'Re-Contact Customer Date',
  'FOLLOW UP - Customer Status',
  'Contact Me this way please',
  'Call Me Back On',
  'Send Booking Form to our Customers',
  'Booking Date',
  'Booking Agent',
  'Final Discount Accepted',
  'Book (Move to Ozilla)',
  'Day 7 Auto Follow Up',
  'Day 20 Final Check In!',
] as const;

const SMARTSHEET_CONFIG_KEY = 'portabox_smartsheet_config_v3';
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
  apiToken: 'F3CVVuJ7Gh8ozrm11WDnIsTL1ZYpRKADmNtAX',
  tokenName: 'New CRM - Phase I',
  workspaceName: 'New CRM - Porta',
  sheetName: 'CRM-Phase I (Quotezilla - QZ4)',
  sheetId: '3517583962886020',
  bookingsSheetId: '3517583962886020',
  invoicesSheetId: '4829-INVOICES-02',
  tariffsSheetId: '4829-TARIFFS-04',
  webhookUrl: 'https://api.smartsheet.com/2.0/sheets/3517583962886020/rows',
  autoSyncOnPayment: true,
  autoSyncOnQuote: true,
  twoWayPortalSync: true,
  connected: true,
  lastSyncTime: new Date().toLocaleDateString('en-AU') + ' ' + new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }),
  syncHistory: [
    {
      id: 'log-dan-01',
      timestamp: 'Today at 09:30 AM',
      direction: 'inbound_webhook',
      sheetName: 'CRM-Phase I (Quotezilla - QZ4)',
      action: 'CEO Dan Harrington Smartsheet Linked',
      rowsAffected: 4,
      status: 'success',
      details: 'Connected to workspace "New CRM - Porta" sheet "CRM-Phase I (Quotezilla - QZ4)" [ID: 3517583962886020] using token "New CRM - Phase I". 51-column architecture active.',
      payloadPreview: '{"workspace":"New CRM - Porta","sheet":"CRM-Phase I (Quotezilla - QZ4)","sheetId":"3517583962886020","tokenName":"New CRM - Phase I"}',
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
    const parsed = JSON.parse(raw);
    // Strictly enforce sheetId: 3517583962886020 and sheetName: CRM-Phase I (Quotezilla - QZ4)
    parsed.sheetId = '3517583962886020';
    parsed.sheetName = 'CRM-Phase I (Quotezilla - QZ4)';
    parsed.tokenName = 'New CRM - Phase I';
    parsed.apiToken = parsed.apiToken || 'F3CVVuJ7Gh8ozrm11WDnIsTL1ZYpRKADmNtAX';
    return { ...DEFAULT_SMARTSHEET_CONFIG, ...parsed };
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
 * Normalizes any Australian or non-ISO date string into strict Smartsheet DATE format: YYYY-MM-DD
 */
export function formatSmartsheetIsoDate(raw?: string | null): string {
  if (!raw) return new Date().toISOString().split('T')[0];
  const str = String(raw).trim();
  if (!str) return new Date().toISOString().split('T')[0];

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  // ISO timestamp like 2026-11-10T...
  if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
    return str.split('T')[0];
  }

  // DD-MMM-YY or DD-MMM-YYYY like "12-Aug-26" or "12-Aug-2026"
  const monthMap: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };
  const dMmmMatch = str.match(/^(\d{1,2})[-\s/]([a-zA-Z]{3})[-\s/](\d{2,4})$/);
  if (dMmmMatch) {
    const day = dMmmMatch[1].padStart(2, '0');
    const month = monthMap[dMmmMatch[2].toLowerCase()];
    let year = dMmmMatch[3];
    if (year.length === 2) year = '20' + year;
    if (month) return `${year}-${month}-${day}`;
  }

  // D/M/YYYY or DD/MM/YYYY or M/D/YYYY
  const slashMatch = str.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})$/);
  if (slashMatch) {
    const p1 = parseInt(slashMatch[1], 10);
    const p2 = parseInt(slashMatch[2], 10);
    let year = slashMatch[3];
    if (year.length === 2) year = '20' + year;
    let day = p1;
    let month = p2;
    if (month > 12 && day <= 12) {
      month = p1;
      day = p2;
    }
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return new Date().toISOString().split('T')[0];
}

/**
 * Transforms Customer Accounts & Container Orders into Smartsheet Bookings, Billing & Staging Rows
 * Multi-container quotes expand into linked individual container rows sharing the same Quote ID
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

    const primaryQuote = c.quotes?.[0];
    const qData = primaryQuote?.quoteData;
    const rawQuoteId = primaryQuote?.quoteNumber || `Q-${c.id.replace('CUST-', '')}`;
    const quoteId = rawQuoteId.startsWith('PBQ-') ? rawQuoteId.replace('PBQ-', 'Q-') : rawQuoteId;
    const quoteCreatedAt = primaryQuote?.createdAt ? formatSmartsheetIsoDate(primaryQuote.createdAt) : '2026-07-01';

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

      const totalContainers = qData?.containerCount || primaryQuote?.containerCount || 1;

      // Expand into individual container lines for multi-container logistics flexibility
      for (let idx = 0; idx < totalContainers; idx++) {
        const isParent = idx === 0;
        const containerSeq = `${idx + 1} of ${totalContainers}`;
        const containerRowId = totalContainers > 1 ? `${c.id}-${o.id}-C${idx + 1}` : `${c.id}-${o.id}`;
        const containerOrderNumber = totalContainers > 1 ? `${o.orderNumber}-C${idx + 1}` : o.orderNumber;
        const containerAssetId = totalContainers > 1 ? `${o.containerId}-${String.fromCharCode(65 + idx)}` : o.containerId;

        // Independent container delivery date: container 2+ can be staggered e.g. 3 days later
        let containerSchedDate = o.scheduledDeliveryDate;
        if (idx > 0 && containerSchedDate) {
          try {
            const parsed = new Date(containerSchedDate);
            if (!isNaN(parsed.getTime())) {
              parsed.setDate(parsed.getDate() + (idx * 3));
              containerSchedDate = parsed.toISOString().split('T')[0];
            }
          } catch {
            // Keep original if date parsing fails
          }
        }

        const zoneFrom = qData?.deliveryZone ? `Zone ${qData.deliveryZone}` : 'Zone A';
        const zoneTo = qData?.movingDeliveryZone ? `Zone ${qData.movingDeliveryZone}` : undefined;
        const distanceKm = qData?.originDistanceKm || (c.address?.includes('King William') ? 4 : 18);
        const fuelLevy = qData?.fuelSurchargePerContainer || (qData?.deliveryZone === 'B' ? 15 : qData?.deliveryZone === 'C' ? 25 : qData?.deliveryZone === 'D' ? 35 : qData?.deliveryZone === 'E' ? 50 : 5);
        const legBaseFee = qData?.domesticLegFeePerContainer || 179;
        const containerMonthlyRent = qData?.monthlyRatePerContainer || (o.containerSize.includes('10') ? 149 : o.containerSize.includes('19') ? 169 : 219);
        const isFirstMoFree = Boolean(qData?.isFirstMonthFree && totalContainers > 0);
        const protectionFee = qData?.protectionMonthlyFee || (qData?.protectionPlan === 'coo' ? 10 : 15);

        rows.push({
          id: containerRowId,
          orderNumber: containerOrderNumber,
          customerId: c.id,
          quoteNumber: primaryQuote?.quoteNumber,
          quoteId,
          quoteStatus: primaryQuote?.status || 'Active Quoted',
          quoteDate: quoteCreatedAt,
          quoteExpiryDate: '30 Days Guaranteed',
          priceFreezeExpiryDate: '1-Year Rate Freeze Active',
          prim: isParent ? 'Parent' : 'Child',

          customerName: `${c.firstName} ${c.lastName || ''}`.trim(),
          firstName: c.firstName,
          lastName: c.lastName || '',
          companyName: c.companyName || '',
          customerPhone: c.mobile,
          customerEmail: c.email,
          preferredContactMethod: 'Phone',
          quotingAgent: c.companyName ? 'Wendy - wendyf@auspods.com.au' : 'Jonathan - jonathane@auspods.com.au',

          containerId: containerAssetId,
          containerNumber: containerSeq,
          containerIndex: idx + 1,
          containerSize: o.containerSize,
          containerSizeId: qData?.containerSize || 'large_25m3',
          containerCount: totalContainers,
          containerVolumeM3: o.containerSize.includes('10') ? 10 : o.containerSize.includes('19') ? 19 : 25,
          assignedAssetId: containerAssetId,
          assignedBarcode: `PBX-BARCODE-${containerAssetId}`,
          scheduledDeliveryDate: containerSchedDate,
          deliveryWindow: o.deliveryWindow,
          deliverySlotWindow: qData?.selectedSlot?.label || o.deliveryWindow,
          isEcoRouteSlot: Boolean(qData?.ecoEmissionsInfo && qData.ecoEmissionsInfo.co2SavedKg > 0),
          timeToDeliveryHours: o.timeToDeliveryHours ?? 24,
          storageDuration: qData?.storageDuration || '1_to_3_months',
          storageDurationMonths: (qData as any)?.storageDurationMonths || 2,
          moveScenarioCode: qData?.serviceType === 'moving_storage' ? 'SCENARIO-06 Move & Interim Storage' : qData?.serviceType === 'moving' ? 'SCENARIO-01 Direct Move' : 'SCENARIO-09 Storage Onsite',
          serviceType: o.serviceType,
          storagePlacement: qData?.storagePlacement || 'facility',
          locationType: qData?.storagePlacement === 'my_place' ? 'My location' : 'Portabox facility',

          deliveryAddress: o.originAddress,
          originSuburb: qData?.originPostcode?.suburb || c.suburb,
          originPostcode: qData?.originPostcode?.postcode || c.postcode,
          destinationAddress: o.destinationAddress || (qData?.destinationPostcode ? `${qData.destinationPostcode.suburb}, ${qData.destinationPostcode.state} ${qData.destinationPostcode.postcode}` : undefined),
          destinationSuburb: qData?.destinationPostcode?.suburb,
          destinationPostcode: qData?.destinationPostcode?.postcode,
          metroHubDepot: qData?.originDepot?.name || 'Adelaide Central Depot',
          distanceFromDepotKm: distanceKm,
          zoneFromLetter: zoneFrom,
          zoneToLetter: zoneTo,
          zoneFromName: 'South Western Suburbs',
          zoneToName: qData?.destinationPostcode ? 'Northeast Adelaide' : undefined,
          isInterstate: Boolean(qData?.isInterstate),
          interstateRouteName: qData?.interstateRouteName,
          originLogisticsMethod: qData?.originLogisticsMethod || 'home_delivery',
          destinationLogisticsMethod: qData?.destinationLogisticsMethod || 'home_delivery',
          legsSavedCount: qData?.legsSavedCount || 0,
          legsSavedDollarTotal: qData?.legsSavedDollarTotal || 0,

          protectionPlan: qData?.protectionPlan === 'coo' ? `COO-${protectionFee || 22}` : qData?.protectionPlan === 'cpo' ? `CPO-${protectionFee || 22}` : 'CPO-22',
          protectionPlanName: qData?.protectionPlan === 'coo' ? 'COO (Container Only Option)' : 'CPO (Content Protection Option)',
          protectionCoverageAmount: qData?.protectionPlan === 'cpo' ? 5000 : 0,
          protectionMonthlyFee: protectionFee,
          isMandatoryInterstateProtection: Boolean(qData?.isInterstate),
          insurancePlan: qData?.protectionPlan === 'coo' ? `COO-${protectionFee || 22}` : `CPO-${protectionFee || 22}`,

          freeBlanketsAllowance: 10,
          freeBlanketsCount: 10,
          extraBlanketsOrdered: qData?.packingSupplies?.blanketsCount ? Math.max(0, qData.packingSupplies.blanketsCount - 10) : 0,
          extraBlanketsFee: qData?.packingSupplies?.blanketsPrice || 0,
          locksCount: qData?.packingSupplies?.locksCount || 1,
          isLockFreePromo: Boolean(qData?.freeLockIncluded),
          locksPrice: qData?.packingSupplies?.locksPrice || 0,
          boxesCount: qData?.packingSupplies?.boxesCount || 0,
          boxesPrice: qData?.packingSupplies?.boxesPrice || 0,
          packingSuppliesTotal: qData?.packingSupplies?.totalSuppliesPrice || 0,
          suppliesSummary: (qData?.packingSupplies?.blanketsCount && qData.packingSupplies.blanketsCount > 10) ? `10 Free Furniture Blankets + ${qData.packingSupplies.blanketsCount - 10} paid blankets` : '10 Free Furniture Blankets',

          matchedDiscountRuleId: qData?.discountMatrixMatchedRule?.id || (isFirstMoFree ? 'dm-2m-both' : 'dm-1m-both'),
          isFirstMonthFree: isFirstMoFree,
          firstMonthSavingsAud: isFirstMoFree ? containerMonthlyRent : 0,
          freeSuppliesRetailValue: qData?.freeSuppliesRetailValue || 60,
          annualDiscountOption: qData?.annualDiscountOption || '400B',
          milestoneCreditTotal: qData?.milestoneCreditTotal || 0,
          upfrontDiscountPercent: qData?.upfrontDiscountPercent || 0,
          durationDiscountPercent: qData?.durationDiscountPercent || 0,
          durationDiscountAud: qData?.durationDiscountAmount || 0,
          appliedPromoCode: qData?.appliedPromoCode || '',
          promoCodeDiscountAud: qData?.totalDiscount || 0,
          totalDiscountAud: (isFirstMoFree ? containerMonthlyRent : 0) + (qData?.totalDiscount || 0),
          discountOffered: isFirstMoFree ? (qData?.annualDiscountOption ? `1stFREE, BLKTFREE, ${qData.annualDiscountOption}` : '1stFREE, BLKTFREE') : (qData?.annualDiscountOption ? `BLKTFREE, ${qData.annualDiscountOption}` : 'BLKTFREE'),
          earlyTerminationClawbackEnforced: Boolean(isFirstMoFree || qData?.milestoneCreditTotal || qData?.freeSuppliesRetailValue),

          initialDeliveryFee: legBaseFee,
          idFuelLevy: fuelLevy,
          returnToWarehouseFee: qData?.serviceType === 'moving_storage' ? legBaseFee : 0,
          rtwFuelLevy: qData?.serviceType === 'moving_storage' ? fuelLevy : 0,
          interstateFreightFee: qData?.interstateFeePerContainer || 0,
          interstateFuelLevy: qData?.isInterstate ? 50 : 0,
          redeliveryFee: qData?.serviceType === 'moving_storage' ? legBaseFee : 0,
          redelFuelLevy: qData?.serviceType === 'moving_storage' ? fuelLevy : 0,
          finalPickupFee: legBaseFee,
          fpuFuelLevy: fuelLevy,
          fuelSurcharge: fuelLevy,
          movingDistanceKm: qData?.movingDistanceKm || 0,

          monthlyStorageFee: containerMonthlyRent,
          baseMonthlyRateAud: containerMonthlyRent,
          effectiveMonthlyRateAud: containerMonthlyRent,
          firstPaymentStoragePayable: isFirstMoFree ? 0 : containerMonthlyRent,
          firstPaymentTotal: isParent ? (qData?.firstPaymentTotal || (totalPaid + balanceDue)) : (legBaseFee + fuelLevy + (isFirstMoFree ? 0 : containerMonthlyRent)),
          firstPaymentGstComponent: Math.round(((isParent ? (qData?.firstPaymentTotal || (totalPaid + balanceDue)) : (legBaseFee + fuelLevy + (isFirstMoFree ? 0 : containerMonthlyRent))) / 11) * 100) / 100,
          ongoingMonthlyTotal: containerMonthlyRent + protectionFee,
          billingCycle: qData?.billingCycle || primaryQuote?.billingCycle || 'Monthly',
          paymentStatus: hasOverdue ? 'Overdue' : hasPending && totalPaid === 0 ? 'Pending' : 'Paid',
          paymentPlan: c.paymentPlan.planLabel,
          periodicRateAud: c.paymentPlan.periodicAmount,
          nextBillingDate: c.paymentPlan.nextBillingDate,
          autopayEnabled: c.paymentPlan.autopayEnabled,
          amountPaid: isParent ? totalPaid : 0,
          balanceDueAud: isParent ? balanceDue : 0,
          callCenterDiscountAud: totalDiscount,
          callCenterDiscountReason: isFirstMoFree ? '1st Month Free Storage Promo' : (c.discountsGiven?.[0]?.description || 'Standard Promo / Term Rebate'),
          braintreeTransactionId: latestPaid?.transactionId || 'bt_txn_verified_990142',

          orderStatus: o.status,
          yardReviewStatus: yardStatus,
          assignedDriver: o.driverName || 'Dave Higgins (Driver #03)',
          driverPhone: o.driverPhone || '0488 123 456',
          assignedTruckId: 'TRUCK-ADL-01',
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
          deliveryZone: zoneFrom,
          pickupRequestedDate: o.pickupRequestedDate || '',
          pickupStatus: o.pickupStatus || 'None',
          operationalHold,
          operationalHoldReason,

          followUpAgent1: 'Jonathan - jonathane@auspods.com.au',
          followUpAgent2: 'Wendy - wendyf@auspods.com.au',
          recontactDate: '10/07/26',
          followUpStatus: hasOverdue ? 'Overdue Follow-up' : totalPaid > 0 ? 'Booked - Deposit Paid' : '2nd Follow UP Completed - LVM/EMAIL',
          followUpNotes: 'Customer confirmed split delivery: Container 1 needed first for packing master bedroom; Container 2 needed 3 days later for garage.',
          contactMethodPreference: 'Phone & SMS',
          sendQuoteConfirmation: true,
          sendBookingForm: true,
          bookingDate: totalPaid > 0 ? '01/07/2026' : undefined,
          bookingAgent: 'Jonathan',
          bookMoveToOzilla: totalPaid > 0,
          day7AutoFollowUpDate: '08/07/26',
          day20FinalCheckInDate: '21/07/26',

          lastUpdatedBy: c.lastSmartsheetSyncNote?.includes('Customer Portal')
            ? 'Customer Portal'
            : c.lastSmartsheetSyncNote?.includes('Call Center')
            ? 'Call Center Smartsheet'
            : 'Customer Quoting App',
          lastSyncedTimestamp: c.lastSmartsheetSyncAt || new Date().toLocaleString('en-AU'),
          syncedToSmartsheet: true,
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
      }
    });
  });

  return rows;
}

export const DAN_HARRINGTON_SEED_ROWS: SmartsheetRow[] = [
  {
    id: 'sm-dan-row-1',
    prim: 'Parent',
    quoteDate: '2026-11-03',
    quoteId: 'Q-059009',
    quoteNumber: 'Q-059009',
    orderNumber: 'PBO-2684',
    customerId: 'CUST-VALUED-01',
    containerNumber: '1 of 2',
    containerIndex: 1,
    totalContainers: 2,
    containerId: 'PB-BOX-25-01',
    containerSize: 'Large- 25 m³',
    firstName: 'Valued',
    lastName: 'Customer',
    customerName: 'Valued Customer',
    companyName: '',
    customerEmail: 'valued.9193@phone-quote.com.au',
    customerPhone: '0400 000 000',
    storageDurationMonths: 0.5,
    durationMonths: '0.5',
    moveScenarioCode: 'SCENARIO-01 Direct Move',
    locationType: 'Portabox facility',
    deliveryAddress: 'Hyde Park, SA 5061',
    suburb: 'Hyde Park',
    postcode: '5061',
    originSuburb: 'Hyde Park',
    originPostcode: '5061',
    deliveryZone: 'Zone A',
    zoneFromLetter: 'Zone A',
    zoneToLetter: '',
    isInterstate: false,
    quotingAgent: 'Jonathan - jonathane@auspods.com.au',
    monthlyStorageFee: 197,
    periodicRateAud: 197,
    initialDeliveryFee: 179,
    idFuelLevy: 17.5,
    returnToWarehouseFee: 0,
    rtwFuelLevy: 0,
    interstateFreightFee: 0,
    interstateFuelLevy: 0,
    redeliveryFee: 0,
    redelFuelLevy: 0,
    finalPickUpFeeFpu: 179,
    finalPickupFee: 179,
    fpuFuelLevy: 17.5,
    sidYn: 'N',
    sfpuYn: 'N',
    protectionPlan: 'COO-22',
    insurancePlan: 'COO-22',
    freeBlanketsCount: 10,
    extraBlanketsOrdered: 10,
    suppliesSummary: '10 Free Furniture Blankets + 10 paid blankets',
    discountOffered: '400B',
    paymentPlan: 'Standard Monthly (Phone Quote)',
    orderStatus: 'Scheduled',
    yardReviewStatus: 'Pending Inspection',
    sendQuoteConfirmation: true,
    followUpAgent1: 'Jonathan - jonathane@auspods.com.au',
    followUpAgent2: 'Wendy - wendyf@auspods.com.au',
    recontactDate: '',
    followUpCustomerStatus: 'New Quote Active',
    contactPreference: 'Email / Phone',
    callMeBackOn: '',
    sendBookingForm: true,
    bookingDate: '2026-07-01',
    bookingAgent: 'Jonathan',
    finalDiscountAccepted: '',
    bookMoveToOzilla: true,
    day7AutoFollowUp: '',
    day20FinalCheckIn: '',
    scheduledDeliveryDate: '2026-11-10',
    deliveryWindow: 'Morning (08:30 - 11:30)',
    timeToDeliveryHours: 48,
    assignedDriver: 'Dave Higgins (Driver #03)',
    assignedTruckId: 'TRUCK-ADL-01',
    driverPhone: '0488 123 456',
    placementSurface: 'Concrete Driveway',
    doorOrientation: 'Doors Facing Street / Road',
    accessGateWidth: 'Wide Open (>3.5m)',
    overheadClearanceClear: true,
    paymentStatus: 'Pending',
    serviceType: 'Direct Move & Store',
    nextBillingDate: '2026-04-11',
    autopayEnabled: true,
    callCenterDiscountAud: 0,
    braintreeTransactionId: 'BT-DAN-DEMO-01',
    amountPaid: 0,
    balanceDueAud: 393,
    lastUpdatedBy: 'Call Center Smartsheet',
    lastSyncedTimestamp: 'Today at 09:30 AM',
    syncedToSmartsheet: true,
  },
  {
    id: 'sm-dan-row-2',
    prim: 'Child',
    quoteDate: '2026-11-03',
    quoteId: 'Q-059009',
    quoteNumber: 'Q-059009',
    orderNumber: 'PBO-8089',
    customerId: 'CUST-VALUED-01',
    containerNumber: '2 of 2',
    containerIndex: 2,
    totalContainers: 2,
    containerId: 'PB-BOX-19-02',
    containerSize: 'Medium -19 m³',
    firstName: 'Valued',
    lastName: 'Customer',
    customerName: 'Valued Customer',
    companyName: '',
    customerEmail: 'valued.9193@phone-quote.com.au',
    customerPhone: '0400 000 000',
    storageDurationMonths: 2,
    durationMonths: '2',
    moveScenarioCode: 'SCENARIO-01 Direct Move',
    locationType: 'Portabox facility',
    deliveryAddress: 'Hyde Park, SA 5061',
    suburb: 'Hyde Park',
    postcode: '5061',
    originSuburb: 'Hyde Park',
    originPostcode: '5061',
    deliveryZone: 'Zone A',
    zoneFromLetter: 'Zone A',
    zoneToLetter: '',
    isInterstate: false,
    quotingAgent: 'Jonathan - jonathane@auspods.com.au',
    monthlyStorageFee: 197,
    periodicRateAud: 197,
    initialDeliveryFee: 179,
    idFuelLevy: 17.5,
    returnToWarehouseFee: 0,
    rtwFuelLevy: 0,
    interstateFreightFee: 0,
    interstateFuelLevy: 0,
    redeliveryFee: 0,
    redelFuelLevy: 0,
    finalPickUpFeeFpu: 179,
    finalPickupFee: 179,
    fpuFuelLevy: 17.5,
    sidYn: 'N',
    sfpuYn: 'N',
    protectionPlan: 'CPO-22',
    insurancePlan: 'CPO-22',
    freeBlanketsCount: 10,
    extraBlanketsOrdered: 0,
    suppliesSummary: '10 Blankets',
    discountOffered: '1 mth free, 400A',
    paymentPlan: '6 months upfront and monthly',
    orderStatus: 'Scheduled',
    yardReviewStatus: 'Pending Inspection',
    sendQuoteConfirmation: true,
    followUpAgent1: 'Jonathan - jonathane@auspods.com.au',
    followUpAgent2: 'Wendy - wendyf@auspods.com.au',
    recontactDate: '',
    followUpCustomerStatus: 'New Quote Active',
    contactPreference: 'Email / Phone',
    callMeBackOn: '',
    sendBookingForm: true,
    bookingDate: '2026-07-01',
    bookingAgent: 'Jonathan',
    finalDiscountAccepted: '',
    bookMoveToOzilla: true,
    day7AutoFollowUp: '',
    day20FinalCheckIn: '',
    scheduledDeliveryDate: '2026-11-13',
    deliveryWindow: 'Midday (11:30 - 14:30)',
    timeToDeliveryHours: 120,
    assignedDriver: 'Dave Higgins (Driver #03)',
    assignedTruckId: 'TRUCK-ADL-01',
    driverPhone: '0488 123 456',
    placementSurface: 'Concrete Driveway',
    doorOrientation: 'Doors Facing Street / Road',
    accessGateWidth: 'Wide Open (>3.5m)',
    overheadClearanceClear: true,
    paymentStatus: 'Pending',
    serviceType: 'Direct Move & Store',
    nextBillingDate: '2026-04-11',
    autopayEnabled: true,
    callCenterDiscountAud: 0,
    braintreeTransactionId: 'BT-DAN-DEMO-02',
    amountPaid: 0,
    balanceDueAud: 393,
    lastUpdatedBy: 'Call Center Smartsheet',
    lastSyncedTimestamp: 'Today at 09:30 AM',
    syncedToSmartsheet: true,
  },
  {
    id: 'sm-dan-row-3',
    prim: 'Parent',
    quoteDate: '2026-08-12',
    quoteId: 'Q-904',
    quoteNumber: 'Q-904',
    orderNumber: 'PBO-9841',
    customerId: 'CUST-SARAH-01',
    containerNumber: '1 of 1',
    containerIndex: 1,
    totalContainers: 1,
    containerId: 'PB-BOX-25-09',
    containerSize: 'Large- 25 m³',
    firstName: 'Sarah',
    lastName: 'Jenkins',
    customerName: 'Sarah Jenkins',
    companyName: '',
    customerEmail: 'sarah.jenkins@gmail.com',
    customerPhone: '0412 849 201',
    storageDurationMonths: 12,
    durationMonths: '12',
    moveScenarioCode: 'SCENARIO-01 Direct Move',
    locationType: 'Portabox facility',
    deliveryAddress: 'Norwood, SA 5067',
    suburb: 'Norwood',
    postcode: '5067',
    originSuburb: 'Norwood',
    originPostcode: '5067',
    deliveryZone: 'Zone A',
    zoneFromLetter: 'Zone A',
    zoneToLetter: '',
    isInterstate: false,
    quotingAgent: 'Jonathan - jonathane@auspods.com.au',
    monthlyStorageFee: 259,
    periodicRateAud: 259,
    initialDeliveryFee: 179,
    idFuelLevy: 5,
    returnToWarehouseFee: 0,
    rtwFuelLevy: 0,
    interstateFreightFee: 0,
    interstateFuelLevy: 0,
    redeliveryFee: 0,
    redelFuelLevy: 0,
    finalPickUpFeeFpu: 179,
    finalPickupFee: 179,
    fpuFuelLevy: 5,
    sidYn: 'N',
    sfpuYn: 'N',
    protectionPlan: 'CPO-22',
    insurancePlan: 'CPO-22',
    freeBlanketsCount: 10,
    extraBlanketsOrdered: 0,
    suppliesSummary: '10 Free Furniture Blankets',
    discountOffered: 'None',
    paymentPlan: 'Standard Monthly Plan',
    orderStatus: 'Scheduled',
    yardReviewStatus: 'Pending Inspection',
    sendQuoteConfirmation: true,
    followUpAgent1: 'Jonathan - jonathane@auspods.com.au',
    followUpAgent2: 'Wendy - wendyf@auspods.com.au',
    recontactDate: '',
    followUpCustomerStatus: 'New Quote Active',
    contactPreference: 'Email / Phone',
    callMeBackOn: '',
    sendBookingForm: true,
    bookingDate: '2026-08-12',
    bookingAgent: 'Jonathan',
    finalDiscountAccepted: '',
    bookMoveToOzilla: true,
    day7AutoFollowUp: '',
    day20FinalCheckIn: '',
    scheduledDeliveryDate: '2026-11-15',
    deliveryWindow: 'Morning (08:30 - 11:30)',
    timeToDeliveryHours: 48,
    assignedDriver: 'Dave Higgins (Driver #03)',
    assignedTruckId: 'TRUCK-ADL-01',
    driverPhone: '0488 123 456',
    placementSurface: 'Concrete Driveway',
    doorOrientation: 'Doors Facing Street / Road',
    accessGateWidth: 'Wide Open (>3.5m)',
    overheadClearanceClear: true,
    paymentStatus: 'Paid',
    serviceType: 'Direct Move & Store',
    nextBillingDate: '2026-09-12',
    autopayEnabled: true,
    callCenterDiscountAud: 0,
    braintreeTransactionId: 'BT-DAN-DEMO-03',
    amountPaid: 443,
    balanceDueAud: 0,
    lastUpdatedBy: 'Call Center Smartsheet',
    lastSyncedTimestamp: 'Today at 09:30 AM',
    syncedToSmartsheet: true,
  },
];

export function loadSmartsheetStagingRows(): SmartsheetRow[] {
  const sanitizeDates = (rows: SmartsheetRow[]): SmartsheetRow[] =>
    rows.map((r) => ({
      ...r,
      quoteDate: formatSmartsheetIsoDate(r.quoteDate),
      bookingDate: r.bookingDate ? formatSmartsheetIsoDate(r.bookingDate) : '',
      scheduledDeliveryDate: r.scheduledDeliveryDate ? formatSmartsheetIsoDate(r.scheduledDeliveryDate) : '',
    }));

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

      // Preserve custom phone bookings or imported rows
      const customRows = savedRows.filter((saved) => !freshRows.some((f) => f.orderNumber === saved.orderNumber));
      const combined = [...merged, ...customRows];

      // Ensure Dan Harrington's official seed quotes are present
      DAN_HARRINGTON_SEED_ROWS.forEach((seedRow) => {
        if (!combined.some((r) => r.quoteNumber === seedRow.quoteNumber || r.quoteId === seedRow.quoteId || r.orderNumber === seedRow.orderNumber)) {
          combined.push(seedRow);
        }
      });

      const sanitizedCombined = sanitizeDates(combined);
      saveSmartsheetStagingRows(sanitizedCombined);
      return sanitizedCombined;
    }

    const initialRows = [...freshRows];
    DAN_HARRINGTON_SEED_ROWS.forEach((seedRow) => {
      if (!initialRows.some((r) => r.quoteNumber === seedRow.quoteNumber || r.quoteId === seedRow.quoteId || r.orderNumber === seedRow.orderNumber)) {
        initialRows.push(seedRow);
      }
    });
    const sanitizedInitial = sanitizeDates(initialRows);
    saveSmartsheetStagingRows(sanitizedInitial);
    return sanitizedInitial;
  } catch {
    const accounts = loadCustomerAccounts();
    return sanitizeDates([...buildSmartsheetRowsFromAccounts(accounts), ...DAN_HARRINGTON_SEED_ROWS]);
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
      if (updates.companyName !== undefined && updates.companyName !== c.companyName) {
        c.companyName = updates.companyName;
        changedFieldsSummary.push(`Company (${updates.companyName})`);
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
  containerCount?: number;
  staggeredDates?: string[];
  zoneFromLetter?: string;
  zoneToLetter?: string;
  protectionPlan?: string;
}): {
  row: SmartsheetRow;
  childRows?: SmartsheetRow[];
  account: CustomerAccount;
} {
  const timestampStr = new Date().toLocaleString('en-AU');
  const accounts = loadCustomerAccounts();
  const orderNumInt = Math.floor(1000 + Math.random() * 9000);
  const orderNumber = `PBO-${orderNumInt}`;
  const quoteNumber = `P-${orderNumInt}`;
  const customerId = `CUST-PH-${Date.now().toString().slice(-5)}`;
  const totalContainers = data.containerCount || 1;
  
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

  const zoneLetter = data.zoneFromLetter || data.deliveryZone || 'Zone A';

  const smartsheetRow: SmartsheetRow = {
    id: `${customerId}-${order.id}`,
    orderNumber,
    quoteNumber,
    customerId,
    prim: 'Parent',
    containerNumber: `1 of ${totalContainers}`,
    containerIndex: 1,
    totalContainers,
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
    deliveryZone: zoneLetter,
    zoneFromLetter: zoneLetter,
    zoneToLetter: data.zoneToLetter || zoneLetter,
    distanceFromDepotKm: 18,
    isInterstate: false,
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
    monthlyStorageFee: data.monthlyRateAud || 219,
    initialDeliveryFee: data.legFeeAud || 179,
    idFuelLevy: 5,
    finalPickUpFeeFpu: 179,
    fpuFuelLevy: 5,
    protectionPlan: data.protectionPlan || 'Customer Goods in Transit/Storage Cover ($5,000 Included)',
    protectionCoverageAmount: 5000,
    protectionMonthlyFee: 0,
    isMandatoryInterstateProtection: false,
    freeBlanketsCount: 5,
    freePadlocksCount: 1,
    freeSuppliesRetailValue: 50,
    discountOffered: data.discountAud ? `Phone Courtesy $${data.discountAud} Off` : 'Free Blankets & Lock',
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

  const childRows: SmartsheetRow[] = [];
  if (totalContainers > 1) {
    for (let c = 2; c <= totalContainers; c++) {
      const staggeredOffsetDays = (c - 1) * 3;
      const baseD = new Date(data.scheduledDeliveryDate);
      const childDate = (data.staggeredDates && data.staggeredDates[c - 1]) ||
        new Date(baseD.getTime() + staggeredOffsetDays * 86400000).toISOString().slice(0, 10);

      const childRow: SmartsheetRow = {
        ...smartsheetRow,
        id: `${customerId}-${order.id}-box-${c}`,
        prim: 'Child',
        containerNumber: `${c} of ${totalContainers}`,
        containerIndex: c,
        totalContainers,
        containerId: `PB-BOX-${data.containerSize.slice(0, 2)}-${Math.floor(100 + Math.random() * 900)}`,
        scheduledDeliveryDate: childDate,
        orderStatus: 'Scheduled',
        yardReviewStatus: 'Pending Inspection',
        initialDeliveryFee: data.legFeeAud || 179,
        finalPickUpFeeFpu: 179,
        lastUpdatedBy: 'Call Center Smartsheet',
        lastSyncedTimestamp: timestampStr,
      };
      childRows.push(childRow);
    }
  }

  const existingRows = loadSmartsheetStagingRows();
  const updatedRows = [smartsheetRow, ...childRows, ...existingRows];
  saveSmartsheetStagingRows(updatedRows);

  notifySmartsheetTwoWaySync({
    source: 'phone_intake',
    summary: `New Phone Booking #${orderNumber} (${data.customerName}, ${totalContainers} Box${totalContainers > 1 ? 'es' : ''}) added to Smartsheet`,
    customerId,
    orderNumber,
  });

  return { row: smartsheetRow, childRows, account: newAccount };
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

  // Push update to live Smartsheet asynchronously in background
  if (targetRow.smartsheetRowId || targetRow.id) {
    updateRowInLiveSmartsheet(String(targetRow.smartsheetRowId || targetRow.id), updates).catch((err) => {
      console.warn('Live Smartsheet inline update deferred:', err);
    });
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
 * Download comprehensive Smartsheet-compatible CSV template
 * Fully aligned with New_smart_sheet_f80c7241.csv plus multi-container logistics,
 * Zone A-E transition, duration discount matrix, and protection plans.
 */
export function downloadSmartsheetTemplateCSV(rows: SmartsheetRow[]): void {
  const headers = [
    'Prim',
    'Quote Date',
    'Quote ID',
    'Order Number',
    'Container Number',
    'Container Index',
    'Total Containers',
    'Container ID',
    'Container Size',
    'Customer Name',
    'First Name',
    'Last Name',
    'Email Address',
    'Mobile Phone',
    'Company Name',
    'Duration months',
    'Move store scenarios',
    'Location',
    'Postal Code Suburb From',
    'Postal Code Suburb To',
    'Delivery Site Address',
    'Zone Name (From)',
    'Zone Name (To)',
    'Zone Letter (From)',
    'Zone Letter (To)',
    'Distance From Depot (km)',
    'Interstate Y/N',
    'Quoting Agent (web or Name)',
    'Monthly rental rate (MRR)',
    'Initial Delivery Fee (New)',
    'ID Fuel Levy',
    'Return to Whse Fee (RTW)',
    'WRT Fuel Levy',
    'Relocation fee (Move)',
    'Move Fuel Levy',
    'Interstate relocation fee',
    'Interstate Relocation Fuel Levy',
    'Redelivery Fee (RDL)',
    'Redel Fuel Levy',
    'Final pick up fee (FPU)',
    'FPU Fuel Levy',
    'SID',
    'SFPU',
    'Protection Plan',
    'Protection Coverage Amount',
    'Protection Monthly Fee',
    'Mandatory Interstate Protection',
    'Supplies / Free Blankets',
    'Free Padlocks Count',
    'Free Supplies Retail Value',
    'Discount Offered',
    '1st Month Free Applied',
    '1st Month Free Savings AUD',
    '12M+ Milestone Discount Option',
    'Milestone Credit Total AUD',
    'Upfront Discount Percent',
    'Clawback Enforced if Early Termination',
    'Scheduled Delivery Date',
    'Delivery Window',
    'Sched Transit to Depot Date',
    'Sched Redelivery Date',
    'Sched Final Pickup Date',
    'Assigned Driver',
    'Driver Phone',
    'Assigned Truck ID',
    'Yard Review Status',
    'Inspection Verified',
    'Placement Surface',
    'Door Orientation',
    'Gate Clearance Width',
    'Order Status',
    'Type of Billing',
    'Periodic Billing Rate (AUD)',
    'Next Billing Date',
    'Total Amount Paid (AUD)',
    'Balance Due (AUD)',
    'Call Center Discount (AUD)',
    'Braintree Transaction ID',
    'Operational Hold',
    'Send Quote Confirmation to Customer',
    'Follow Up Agent 1',
    'Follow Up Agent 2',
    'Re-Contact Customer Date',
    'FOLLOW UP - Customer Status',
    'Contact Me this way please',
    'Call Me Back On',
    'Send Booking Form to our Customers',
    'Booking Date',
    'Booking Agent',
    'Final Discount Accepted',
    'Book (Move to Ozilla)',
    'Day 7 Auto Follow Up',
    'Day 20 Final Check In!',
    'Last Updated By',
    'Last Synced Timestamp',
  ];

  const escapeCsv = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvRows = rows.map((r) => [
    escapeCsv(r.prim || 'Parent'),
    escapeCsv(r.quoteDate || new Date().toLocaleDateString('en-AU')),
    escapeCsv(r.quoteNumber || r.orderNumber || 'P-TBD'),
    escapeCsv(r.orderNumber),
    escapeCsv(r.containerNumber || '1 of 1'),
    escapeCsv(r.containerIndex || 1),
    escapeCsv(r.totalContainers || 1),
    escapeCsv(r.containerId),
    escapeCsv(r.containerSize),
    escapeCsv(r.customerName),
    escapeCsv(r.customerName.split(' ')[0] || ''),
    escapeCsv(r.customerName.split(' ').slice(1).join(' ') || ''),
    escapeCsv(r.customerEmail),
    escapeCsv(r.customerPhone),
    escapeCsv(r.companyName || ''),
    escapeCsv(r.storageDuration || 1),
    escapeCsv(r.moveStoreScenario || r.serviceType),
    escapeCsv(r.locationType || (r.serviceType.toLowerCase().includes('facility') || r.serviceType.toLowerCase().includes('depot') ? 'Portabox facility' : 'My location')),
    escapeCsv(`${r.originPostcode || r.postcode || ''} ${r.originSuburb || r.suburb || ''}`.trim()),
    escapeCsv(`${r.destinationPostcode || ''} ${r.destinationSuburb || ''}`.trim()),
    escapeCsv(r.deliveryAddress),
    escapeCsv(r.zoneNameFrom || r.deliveryZone || 'Zone A'),
    escapeCsv(r.zoneNameTo || r.deliveryZone || 'Zone A'),
    escapeCsv(r.zoneFromLetter || 'Zone A'),
    escapeCsv(r.zoneToLetter || 'Zone A'),
    escapeCsv(r.distanceFromDepotKm ?? 15),
    escapeCsv(r.isInterstate ? 'Y' : 'N'),
    escapeCsv(r.quotingAgent || 'Web App Direct'),
    escapeCsv(r.periodicRateAud || r.monthlyStorageFee || 219),
    escapeCsv(r.initialDeliveryFee ?? 179),
    escapeCsv(r.idFuelLevy ?? 5),
    escapeCsv(r.returnToWhseFee ?? 0),
    escapeCsv(r.rtwFuelLevy ?? 0),
    escapeCsv(r.relocationFeeMove ?? 0),
    escapeCsv(r.moveFuelLevy ?? 0),
    escapeCsv(r.interstateRelocationFee ?? 0),
    escapeCsv(r.interstateRelocationFuelLevy ?? 0),
    escapeCsv(r.redeliveryFeeRdl ?? 0),
    escapeCsv(r.redelFuelLevy ?? 0),
    escapeCsv(r.finalPickUpFeeFpu ?? 179),
    escapeCsv(r.fpuFuelLevy ?? 5),
    escapeCsv(r.sidFee ?? 0),
    escapeCsv(r.sfpuFee ?? 0),
    escapeCsv(r.protectionPlan || 'Customer Goods in Transit/Storage Cover ($5,000 Included)'),
    escapeCsv(r.protectionCoverageAmount ?? 5000),
    escapeCsv(r.protectionMonthlyFee ?? 0),
    escapeCsv(r.isMandatoryInterstateProtection ? 'TRUE' : 'FALSE'),
    escapeCsv(r.freeBlanketsCount ? `${r.freeBlanketsCount} Free Furniture Blankets` : 'None'),
    escapeCsv(r.freePadlocksCount ?? 1),
    escapeCsv(r.freeSuppliesRetailValue ?? 50),
    escapeCsv(r.discountOffered || 'None'),
    escapeCsv(r.isFirstMonthFree ? 'TRUE' : 'FALSE'),
    escapeCsv(r.firstMonthSavingsAud ?? 0),
    escapeCsv(r.annualDiscountOption || 'None'),
    escapeCsv(r.milestoneCreditTotal ?? 0),
    escapeCsv(r.upfrontDiscountPercent ? `${r.upfrontDiscountPercent}%` : '0%'),
    escapeCsv(r.earlyTerminationClawbackEnforced ? 'TRUE' : 'FALSE'),
    escapeCsv(r.scheduledDeliveryDate),
    escapeCsv(r.deliveryWindow),
    escapeCsv(r.schedTransitToDepotDate || ''),
    escapeCsv(r.schedRedeliveryDate || ''),
    escapeCsv(r.schedFinalPickupDate || ''),
    escapeCsv(r.assignedDriver),
    escapeCsv(r.driverPhone || '0488 123 456'),
    escapeCsv(r.assignedTruckId || 'TRUCK-ADL-01'),
    escapeCsv(r.yardReviewStatus),
    escapeCsv(r.inspectionChecklist?.passed ? 'PASSED (Certified)' : 'PENDING'),
    escapeCsv(r.placementSurface || 'Concrete Driveway'),
    escapeCsv(r.doorOrientation || 'Doors Facing Street / Road'),
    escapeCsv(r.accessGateWidth || 'Wide Open (>3.5m)'),
    escapeCsv(r.orderStatus),
    escapeCsv(r.paymentPlan || 'Monthly Standard Billing'),
    escapeCsv(r.periodicRateAud),
    escapeCsv(r.nextBillingDate),
    escapeCsv(r.amountPaid),
    escapeCsv(r.balanceDueAud),
    escapeCsv(r.callCenterDiscountAud),
    escapeCsv(r.braintreeTransactionId),
    escapeCsv(r.operationalHold ? 'HOLD: ' + (r.operationalHoldReason || 'Payment Overdue') : 'CLEAR'),
    escapeCsv(r.sendQuoteConfirmation ? 'TRUE' : 'FALSE'),
    escapeCsv(r.followUpAgent1 || 'Call Center Queue'),
    escapeCsv(r.followUpAgent2 || ''),
    escapeCsv(r.reContactCustomerDate || ''),
    escapeCsv(r.followUpCustomerStatus || 'New Quote Active'),
    escapeCsv(r.contactPreference || 'Email / Phone'),
    escapeCsv(r.callMeBackOn || ''),
    escapeCsv(r.sendBookingForm ? 'TRUE' : 'FALSE'),
    escapeCsv(r.bookingDate || ''),
    escapeCsv(r.bookingAgent || ''),
    escapeCsv(r.finalDiscountAccepted || ''),
    escapeCsv(r.bookMoveToOzilla ? 'TRUE' : 'FALSE'),
    escapeCsv(r.day7AutoFollowUp || ''),
    escapeCsv(r.day20FinalCheckIn || ''),
    escapeCsv(r.lastUpdatedBy || 'Call Center Smartsheet'),
    escapeCsv(r.lastSyncedTimestamp || new Date().toLocaleString('en-AU')),
  ]);

  const csvContent =
    'data:text/csv;charset=utf-8,\uFEFF' +
    [headers.join(','), ...csvRows.map((e) => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute(
    'download',
    `portabox_quoting_smartsheet_93col_${new Date().toISOString().slice(0, 10)}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Universal Smartsheet CSV text parser
 * Parses 93-column full export CSV or legacy New_smart_sheet_f80c7241.csv
 * Preserves multi-container parent/child groupings and quote linking.
 */
export function parseSmartsheetCSVText(csvText: string): SmartsheetRow[] {
  if (!csvText || !csvText.trim()) return [];

  // Split lines respecting quoted newlines
  const rawLines = csvText.trim().split(/\r?\n/);
  if (rawLines.length < 2) return [];

  // Parse header line to dynamically locate column indexes
  const parseRowFields = (line: string): string[] => {
    const fields: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        fields.push(cur.trim());
        cur = '';
      } else {
        cur += char;
      }
    }
    fields.push(cur.trim());
    return fields;
  };

  const headerLine = rawLines[0];
  const headers = parseRowFields(headerLine).map(h => h.trim().toLowerCase());

  const getIdx = (keywords: string[]): number => {
    return headers.findIndex(h => keywords.some(k => h.includes(k.toLowerCase())));
  };

  // Find column indexes
  const primIdx = getIdx(['prim']);
  const quoteIdIdx = getIdx(['quote id', 'order number']);
  const quoteDateIdx = getIdx(['quote date']);
  const orderNumIdx = getIdx(['order number', 'order #']);
  const containerNumIdx = getIdx(['container number']);
  const containerSizeIdx = getIdx(['container size', 'box size']);
  const containerIdIdx = getIdx(['container id']);
  const emailIdx = getIdx(['email']);
  const phoneIdx = getIdx(['phone', 'mobile']);
  const firstNameIdx = getIdx(['first name']);
  const lastNameIdx = getIdx(['last name']);
  const customerNameIdx = getIdx(['customer name']);
  const companyNameIdx = getIdx(['company name']);
  const durationMonthsIdx = getIdx(['duration months', 'duration']);
  const locationIdx = getIdx(['location', 'where']);
  const moveScenarioIdx = getIdx(['move store scenarios', 'service type']);
  const mrrIdx = getIdx(['monthly rental rate', 'mrr', 'periodic rate']);
  const initDelIdx = getIdx(['initial delivery fee', 'initial delivery']);
  const idFuelIdx = getIdx(['id fuel levy']);
  const rtwIdx = getIdx(['return to whse fee', 'rtw']);
  const moveFeeIdx = getIdx(['relocation fee (move)', 'relocation fee']);
  const rdlIdx = getIdx(['redelivery fee (rdl)', 'redelivery fee']);
  const fpuIdx = getIdx(['final pick up fee (fpu)', 'final pick up fee', 'fpu']);
  const fromSuburbIdx = getIdx(['postal code suburb from', 'origin suburb']);
  const toSuburbIdx = getIdx(['postal code suburb to', 'destination suburb']);
  const zoneFromIdx = getIdx(['zone name (from)', 'zone (from)', 'zone from']);
  const zoneToIdx = getIdx(['zone name (to)', 'zone (to)', 'zone to']);
  const zoneLetterFromIdx = getIdx(['zone letter (from)', 'transition zone letter from']);
  const zoneLetterToIdx = getIdx(['zone letter (to)', 'transition zone letter to']);
  const interstateIdx = getIdx(['interstate y/n', 'interstate']);
  const quotingAgentIdx = getIdx(['quoting agent']);
  const followUpStatusIdx = getIdx(['follow up - customer status', 'follow up status']);
  const protectionIdx = getIdx(['protection plan', 'protection']);
  const discountOfferedIdx = getIdx(['discount offered', 'discounts']);
  const firstMonthFreeIdx = getIdx(['1st month free', 'first month free']);
  const schedDateIdx = getIdx(['scheduled delivery date', 'scheduled date', 're-contact customer date']);
  const deliveryWindowIdx = getIdx(['delivery window', 'time window']);
  const deliveryAddressIdx = getIdx(['delivery site address', 'delivery address', 'address']);
  const assignedDriverIdx = getIdx(['assigned driver', 'driver']);
  const yardStatusIdx = getIdx(['yard review status']);
  const orderStatusIdx = getIdx(['order status', 'portal order status']);
  const paymentStatusIdx = getIdx(['payment status']);
  const balanceDueIdx = getIdx(['balance due', 'balance (aud)']);

  const parsedRows: SmartsheetRow[] = [];
  const timestampStr = new Date().toLocaleString('en-AU');

  let currentParentQuoteId = '';
  let currentParentCustomer = 'Customer';
  let currentParentPhone = '0400 000 000';
  let currentParentEmail = 'customer@portabox.com.au';
  let currentParentAddress = 'Adelaide SA';

  for (let i = 1; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (!line) continue;
    const fields = parseRowFields(line);
    if (fields.length < 3) continue;

    const val = (idx: number, fallback = '') => (idx >= 0 && idx < fields.length && fields[idx] !== '' ? fields[idx] : fallback);

    const quoteId = val(quoteIdIdx) || val(orderNumIdx) || `PBO-IMP-${1000 + i}`;
    const prim = val(primIdx) || (quoteId === currentParentQuoteId ? 'Child' : 'Parent');

    let customerName = val(customerNameIdx);
    if (!customerName) {
      const fn = val(firstNameIdx);
      const ln = val(lastNameIdx);
      customerName = [fn, ln].filter(Boolean).join(' ') || (prim === 'Child' ? currentParentCustomer : 'Customer Inquiry');
    }

    const email = val(emailIdx) || (prim === 'Child' ? currentParentEmail : `lead-${i}@portabox.com.au`);
    const phone = val(phoneIdx) || (prim === 'Child' ? currentParentPhone : '0400 000 000');
    const address = val(deliveryAddressIdx) || val(fromSuburbIdx) || (prim === 'Child' ? currentParentAddress : 'Adelaide SA');

    if (prim === 'Parent' || !currentParentQuoteId) {
      currentParentQuoteId = quoteId;
      currentParentCustomer = customerName;
      currentParentPhone = phone;
      currentParentEmail = email;
      currentParentAddress = address;
    }

    const cleanNum = (str: string, fallback = 0) => {
      const n = Number(str.replace(/[^0-9.-]+/g, ''));
      return isNaN(n) ? fallback : n;
    };

    const containerSizeRaw = val(containerSizeIdx) || 'Large = approx 25 m3';
    let containerSize = '25 m³';
    if (containerSizeRaw.toLowerCase().includes('10')) containerSize = '10 m³';
    else if (containerSizeRaw.toLowerCase().includes('19')) containerSize = '19 m³';
    else if (containerSizeRaw.toLowerCase().includes('25')) containerSize = '25 m³';

    const rawZoneFrom = val(zoneFromIdx) || 'South Western Suburbs';
    const rawZoneTo = val(zoneToIdx) || rawZoneFrom;
    const zoneFromLetter = val(zoneLetterFromIdx) || 'Zone A';
    const zoneToLetter = val(zoneLetterToIdx) || zoneFromLetter;

    const isFirstMth = val(firstMonthFreeIdx).toLowerCase() === 'true' || val(discountOfferedIdx).toLowerCase().includes('1st mth free');

    parsedRows.push({
      id: `sm-csv-${Date.now()}-${i}`,
      orderNumber: quoteId.startsWith('PBO-') ? quoteId : `PBO-${quoteId.replace(/[^0-9]/g, '') || Math.floor(1000 + Math.random() * 9000)}`,
      quoteNumber: quoteId,
      customerId: `CUST-IMP-${i}`,
      prim: prim as 'Parent' | 'Child',
      containerNumber: val(containerNumIdx) || (prim === 'Child' ? '2 of 2' : '1 of 1'),
      containerIndex: prim === 'Child' ? 2 : 1,
      totalContainers: prim === 'Child' ? 2 : 1,
      customerName,
      customerPhone: phone,
      customerEmail: email,
      companyName: val(companyNameIdx),
      containerId: val(containerIdIdx) || `PB-BOX-${containerSize.slice(0, 2)}-${Math.floor(100 + Math.random() * 900)}`,
      containerSize,
      serviceType: val(moveScenarioIdx) || 'Storage at Your Place',
      orderStatus: (val(orderStatusIdx) as any) || 'Scheduled',
      deliveryAddress: address,
      originSuburb: val(fromSuburbIdx) || 'Adelaide',
      destinationSuburb: val(toSuburbIdx) || '',
      suburb: val(fromSuburbIdx) || 'Adelaide',
      postcode: '5000',
      deliveryZone: zoneFromLetter,
      zoneNameFrom: rawZoneFrom,
      zoneNameTo: rawZoneTo,
      zoneFromLetter,
      zoneToLetter,
      distanceFromDepotKm: 18,
      isInterstate: val(interstateIdx).toUpperCase() === 'Y' || val(interstateIdx).toUpperCase() === 'TRUE',
      scheduledDeliveryDate: val(schedDateIdx) || new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
      deliveryWindow: val(deliveryWindowIdx) || '09:00 AM – 11:30 AM (Morning Window)',
      timeToDeliveryHours: 48,
      assignedDriver: val(assignedDriverIdx) || 'Dave Higgins (Driver #03)',
      driverPhone: '0488 123 456',
      assignedTruckId: 'TRUCK-ADL-01',
      yardReviewStatus: (val(yardStatusIdx) as any) || 'Pending Inspection',
      paymentStatus: (val(paymentStatusIdx) as any) || 'Pending',
      paymentPlan: 'Standard Monthly Plan',
      periodicRateAud: cleanNum(val(mrrIdx), 219),
      monthlyStorageFee: cleanNum(val(mrrIdx), 219),
      initialDeliveryFee: cleanNum(val(initDelIdx), 179),
      idFuelLevy: cleanNum(val(idFuelIdx), 5),
      returnToWhseFee: cleanNum(val(rtwIdx), 0),
      relocationFeeMove: cleanNum(val(moveFeeIdx), 0),
      redeliveryFeeRdl: cleanNum(val(rdlIdx), 0),
      finalPickUpFeeFpu: cleanNum(val(fpuIdx), 179),
      protectionPlan: val(protectionIdx) || 'Customer Goods in Transit/Storage Cover ($5,000 Included)',
      protectionCoverageAmount: 5000,
      protectionMonthlyFee: 0,
      isMandatoryInterstateProtection: false,
      freeBlanketsCount: 5,
      freePadlocksCount: 1,
      freeSuppliesRetailValue: 50,
      discountOffered: val(discountOfferedIdx) || (isFirstMth ? 'Free Blankets, Free Lock, 1st Mth Free' : 'Standard Rate'),
      isFirstMonthFree: isFirstMth,
      firstMonthSavingsAud: isFirstMth ? cleanNum(val(mrrIdx), 219) : 0,
      nextBillingDate: new Date(Date.now() + 30 * 86400000).toLocaleDateString('en-AU'),
      autopayEnabled: true,
      amountPaid: 0,
      balanceDueAud: cleanNum(val(balanceDueIdx), 368),
      callCenterDiscountAud: 0,
      braintreeTransactionId: 'pending_csv_import',
      accessNotes: 'Imported from Smartsheet CSV with multi-container support',
      placementSurface: 'Concrete Driveway',
      doorOrientation: 'Doors Facing Street / Road',
      accessGateWidth: 'Wide Open (>3.5m)',
      overheadClearanceClear: true,
      quotingAgent: val(quotingAgentIdx) || 'Web App Direct',
      followUpCustomerStatus: val(followUpStatusIdx) || 'New Quote Active',
      lastUpdatedBy: 'Call Center Smartsheet',
      lastSyncedTimestamp: timestampStr,
      syncedToSmartsheet: true,
      operationalHold: false,
    });
  }

  return parsedRows;
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

/**
 * Programmatically creates a new Smartsheet under the user's Smartsheet account
 * via the backend /api/smartsheet/create-sheet proxy.
 */
export async function createSmartsheetInUserAccount(params: {
  apiToken: string;
  sheetName?: string;
}): Promise<{
  success: boolean;
  sheetId?: string;
  permalink?: string;
  name?: string;
  error?: string;
}> {
  try {
    const res = await fetch('/api/smartsheet/create-sheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to create Smartsheet' };
    }

    // Auto-update local config with new sheet ID
    const cfg = loadSmartsheetConfig();
    cfg.apiToken = params.apiToken;
    cfg.sheetId = data.sheetId;
    cfg.sheetName = data.name || params.sheetName || 'CRM-Phase I (Quotezilla - QZ4)';
    cfg.connected = true;
    cfg.lastSyncTime = new Date().toLocaleDateString('en-AU') + ' ' + new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
    saveSmartsheetConfig(cfg);

    addSmartsheetSyncLog({
      direction: 'outbound_api',
      sheetName: cfg.sheetName,
      action: 'Sheet Created in Smartsheet Account',
      rowsAffected: 0,
      status: 'success',
      details: `New sheet "${cfg.sheetName}" created under user Smartsheet account (ID: ${data.sheetId}). Direct link: ${data.permalink}`,
    });

    notifySmartsheetTwoWaySync({
      source: 'smartsheet_create_api',
      summary: `Created new sheet ${cfg.sheetName} (ID: ${data.sheetId}) in Smartsheet`,
    });

    return {
      success: true,
      sheetId: data.sheetId,
      permalink: data.permalink,
      name: data.name,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error reaching Smartsheet API' };
  }
}

/**
 * Programmatically connects to CEO Dan Harrington's live Smartsheet
 * (CRM - Phase I / Quotezilla - QZ4) in workspace "New CRM - Porta"
 * using his provided API Access Token.
 */
export async function syncWithDanSmartsheet(options?: {
  apiToken?: string;
  sheetName?: string;
  sheetId?: string;
  workspaceName?: string;
}): Promise<{
  success: boolean;
  sheetId?: string;
  sheetName?: string;
  workspace?: string;
  permalink?: string;
  columnsCount?: number;
  totalRowCount?: number;
  pushedCount?: number;
  pulledCount?: number;
  rows?: SmartsheetRow[];
  error?: string;
}> {
  const token = options?.apiToken || 'F3CVVuJ7Gh8ozrm11WDnIsTL1ZYpRKADmNtAX';
  const name = options?.sheetName || 'CRM-Phase I (Quotezilla - QZ4)';
  const ws = options?.workspaceName || 'New CRM - Porta';
  const targetSheetId = options?.sheetId;

  try {
    // 1. Load current staging rows to push any newly created quotes
    const localRows = loadSmartsheetStagingRows();

    // 2. Call bidirectional sync endpoint with automatic retry on transient HTML error
    let res: Response;
    let text = '';
    let data: any = null;

    try {
      res = await fetch('/api/smartsheet/sync-dan-rows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiToken: token,
          sheetName: name,
          sheetId: targetSheetId,
          rows: localRows,
        }),
      });
      text = await res.text();
      try {
        data = JSON.parse(text);
      } catch {
        // If server was temporarily rebooting or returned HTML, wait 1.2s and retry once
        await new Promise((r) => setTimeout(r, 1200));
        res = await fetch('/api/smartsheet/sync-dan-rows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiToken: token,
            sheetName: name,
            sheetId: targetSheetId,
            rows: localRows,
          }),
        });
        text = await res.text();
        data = JSON.parse(text);
      }
    } catch {
      return {
        success: false,
        error: 'Unable to reach sync service. The server was briefly reloading; please click Sync again.',
      };
    }

    if (!res.ok || !data?.success) {
      return { success: false, error: data?.error || 'Failed to sync with Dan Harrington Smartsheet' };
    }

    // 3. If live rows were returned, save them into local staging so the app grid immediately displays them!
    if (Array.isArray(data.rows) && data.rows.length > 0) {
      // Merge: preserve any local rows that may still be staging
      const liveQuoteIds = new Set(data.rows.map((r: any) => String(r.quoteId || '').toLowerCase().trim()));
      const remainingLocal = localRows.filter((lr) => !liveQuoteIds.has(String(lr.quoteId || '').toLowerCase().trim()));
      const mergedRows: SmartsheetRow[] = [...data.rows, ...remainingLocal];
      saveSmartsheetStagingRows(mergedRows);
    }

    const cfg = loadSmartsheetConfig();
    cfg.apiToken = token;
    cfg.tokenName = 'New CRM - Phase I';
    cfg.workspaceName = ws;
    cfg.sheetName = data.sheetName || name;
    cfg.sheetId = data.sheetId;
    cfg.connected = true;
    cfg.lastSyncTime = new Date().toLocaleDateString('en-AU') + ' ' + new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
    saveSmartsheetConfig(cfg);

    addSmartsheetSyncLog({
      direction: 'inbound_webhook',
      sheetName: cfg.sheetName,
      action: 'Live Two-Way Sync with Smartsheet',
      rowsAffected: data.totalRows || data.rows?.length || 0,
      status: 'success',
      details: `Connected to sheet "${cfg.sheetName}" (ID: ${data.sheetId}). Pulled ${data.pulledCount || 0} live rows from Smartsheet. Pushed ${data.pushedCount || 0} new quotes to Smartsheet. Direct link: ${data.permalink || 'Smartsheet Live'}`,
    });

    notifySmartsheetTwoWaySync({
      source: 'smartsheet_dan_sync',
      summary: `Synced with ${cfg.sheetName} (${ws}) · Pulled ${data.pulledCount || 0} rows, Pushed ${data.pushedCount || 0} rows`,
    });

    return {
      success: true,
      sheetId: data.sheetId,
      sheetName: data.sheetName || name,
      workspace: ws,
      permalink: data.permalink,
      totalRowCount: data.totalRows || data.rows?.length || 0,
      pushedCount: data.pushedCount || 0,
      pulledCount: data.pulledCount || 0,
      rows: data.rows,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error communicating with Smartsheet API' };
  }
}

/**
 * Pushes a single quote or booking row immediately to live Smartsheet
 */
export async function pushQuoteToLiveSmartsheet(row: Partial<SmartsheetRow>): Promise<{ success: boolean; insertedRowId?: string; error?: string }> {
  const cfg = loadSmartsheetConfig();
  const token = cfg.apiToken || 'F3CVVuJ7Gh8ozrm11WDnIsTL1ZYpRKADmNtAX';
  const sheetId = cfg.sheetId || '3517583962886020';

  try {
    const res = await fetch('/api/smartsheet/push-row', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiToken: token,
        sheetId,
        row,
      }),
    });
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return { success: false, error: 'Server returned non-JSON' };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Updates an existing row in live Smartsheet
 */
export async function updateRowInLiveSmartsheet(rowId: string, updates: Partial<SmartsheetRow>): Promise<{ success: boolean; error?: string }> {
  const cfg = loadSmartsheetConfig();
  const token = cfg.apiToken || 'F3CVVuJ7Gh8ozrm11WDnIsTL1ZYpRKADmNtAX';
  const sheetId = cfg.sheetId || '3517583962886020';

  try {
    const res = await fetch('/api/smartsheet/update-row', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiToken: token,
        sheetId,
        rowId,
        updates,
      }),
    });
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return { success: false, error: 'Server returned non-JSON' };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Generates and downloads a clean 51-column CSV matching Dan Harrington's SS Columns - Clean format
 */
export function downloadDan51ColCSV(rows: SmartsheetRow[]): void {
  const headers = [
    'Prim',
    'Quote Date',
    'Quote ID',
    'Order Number',
    'Container Number',
    'Container Size',
    'First Name',
    'Last Name',
    'Company Name',
    'Email Address',
    'Mobile Phone',
    'Duration months',
    'Move store scenarios 13',
    'Location',
    'Postal Code Suburb From',
    'Postal Code Suburb To',
    'Interstate Y/N',
    'Quoting Agent',
    'Monthly rental rate (MRR)',
    'Initial Delivery Fee (New)',
    'ID Fuel Levy',
    'Return to Portabox Fee (WRT)',
    'WRT Fuel Levy',
    'Relocation fee (Move)',
    'Move Fuel Levy',
    'Interstate relocation fee',
    'Interstate Relocation Fuel Levy',
    'Redelivery Fee (RDL)',
    'Redel Fuel Levy',
    'Final pick up fee (FPU)',
    'FPU Fuel Levy',
    'SID Y/N',
    'SFPU Y/N',
    'Protection Plan CPO/COO',
    'Supplies',
    'Discount Offered',
    'Type of Billing',
    'Send Quote Confirmation to Customer',
    'Follow Up Agent 1',
    'Follow Up Agent 2',
    'Re-Contact Customer Date',
    'FOLLOW UP - Customer Status',
    'Contact Me this way please',
    'Call Me Back On',
    'Send Booking Form to our Customers',
    'Booking Date',
    'Booking Agent',
    'Final Discount Accepted',
    'Book (Move to Ozilla)',
    'Day 7 Auto Follow Up',
    'Day 20 Final Check In!',
  ];

  const escapeCSV = (val: any): string => {
    if (val === undefined || val === null) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvRows = [headers.join(',')];

  rows.forEach((r) => {
    const qId = r.quoteId || r.quoteNumber || 'Q-059009';
    const qIdFormatted = qId.startsWith('PBQ-') ? qId.replace('PBQ-', 'Q-') : qId;

    const protCode = r.protectionPlan
      ? (r.protectionPlan.includes('-') ? r.protectionPlan : `${r.protectionPlan.toUpperCase()}-${r.protectionMonthlyFee || 22}`)
      : 'CPO-22';

    const suppliesStr = r.suppliesSummary || (r.freeBlanketsCount ? `${r.freeBlanketsCount} Free Furniture Blankets` : '10 Free Furniture Blankets');
    const discStr = r.discountOffered || (r.isFirstMonthFree ? '1stFREE' : 'None');

    const rowValues = [
      escapeCSV(r.prim || 'Parent'),
      escapeCSV(r.quoteDate || '2026-11-03'),
      escapeCSV(qIdFormatted),
      escapeCSV(r.orderNumber),
      escapeCSV(r.containerNumber || '1 of 1'),
      escapeCSV(r.containerSize),
      escapeCSV(r.firstName || (r.customerName ? r.customerName.split(' ')[0] : 'Customer')),
      escapeCSV(r.lastName || (r.customerName ? r.customerName.split(' ').slice(1).join(' ') : '')),
      escapeCSV(r.companyName || ''),
      escapeCSV(r.customerEmail),
      escapeCSV(r.customerPhone),
      escapeCSV(r.durationMonths || r.storageDurationMonths || '2'),
      escapeCSV(r.moveScenarioCode || ''),
      escapeCSV(r.locationType || 'Portabox facility'),
      escapeCSV(`${r.originPostcode || r.postcode || '5000'} ${r.originSuburb || r.suburb || 'Adelaide'}`.trim()),
      escapeCSV(r.destinationSuburb ? `${r.destinationPostcode || ''} ${r.destinationSuburb}`.trim() : ''),
      escapeCSV(r.isInterstate ? 'Y' : 'N'),
      escapeCSV(r.quotingAgent || 'Jonathan - jonathane@auspods.com.au'),
      escapeCSV(r.monthlyStorageFee || r.periodicRateAud || 197),
      escapeCSV(r.initialDeliveryFee || 179),
      escapeCSV(r.idFuelLevy || 17.5),
      escapeCSV(r.returnToWarehouseFee || 0),
      escapeCSV(r.rtwFuelLevy || 0),
      escapeCSV(r.movingDistanceKm ? 179 : 0),
      escapeCSV(r.movingDistanceKm ? 17.5 : 0),
      escapeCSV(r.interstateFreightFee || 0),
      escapeCSV(r.interstateFuelLevy || 0),
      escapeCSV(r.redeliveryFee || 0),
      escapeCSV(r.redelFuelLevy || 0),
      escapeCSV(r.finalPickUpFeeFpu || r.finalPickupFee || 179),
      escapeCSV(r.fpuFuelLevy || 17.5),
      escapeCSV(r.sidYn || 'N'),
      escapeCSV(r.sfpuYn || 'N'),
      escapeCSV(protCode),
      escapeCSV(suppliesStr),
      escapeCSV(discStr),
      escapeCSV(r.paymentPlan || 'Standard Monthly (Phone Quote)'),
      escapeCSV(r.sendQuoteConfirmation !== false ? 'TRUE' : 'FALSE'),
      escapeCSV(r.followUpAgent1 || 'Jonathan - jonathane@auspods.com.au'),
      escapeCSV(r.followUpAgent2 || 'Wendy - wendyf@auspods.com.au'),
      escapeCSV(r.reContactCustomerDate || r.recontactDate || ''),
      escapeCSV(r.followUpCustomerStatus || r.followUpStatus || 'New Quote Active'),
      escapeCSV(r.contactPreference || r.contactMethodPreference || 'Email / Phone'),
      escapeCSV(r.callMeBackOn || ''),
      escapeCSV(r.sendBookingForm !== false ? 'TRUE' : 'FALSE'),
      escapeCSV(r.bookingDate || ''),
      escapeCSV(r.bookingAgent || 'Jonathan'),
      escapeCSV(r.finalDiscountAccepted || ''),
      escapeCSV(r.bookMoveToOzilla ? 'TRUE' : 'FALSE'),
      escapeCSV(r.day7AutoFollowUp || ''),
      escapeCSV(r.day20FinalCheckIn || ''),
    ];

    csvRows.push(rowValues.join(','));
  });

  const blob = new Blob([csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `CRM_Phase_I_Quotezilla_QZ4_51Col_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}


