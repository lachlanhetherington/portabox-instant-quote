import { QuoteBreakdown, DeliverySlotWindow } from '../types/quote';

export interface CustomerTransaction {
  id: string;
  invoiceNumber: string;
  date: string;
  description: string;
  amount: number;
  status: 'Paid' | 'Pending' | 'Overdue' | 'Refunded';
  dueDate?: string;
  paymentMethod?: string;
  transactionId?: string;
  pdfUrl?: string;
  isAdjustment?: boolean;
  adjustmentType?: 'credit' | 'charge' | 'refund';
}

export interface ContainerOrder {
  id: string;
  orderNumber: string;
  containerId: string;
  containerSize: string;
  containerName: string;
  serviceType: string;
  status: 'Scheduled' | 'Out for Delivery' | 'Placed at Customer' | 'Stored at Depot' | 'Collected' | 'Completed';
  location: string;
  originAddress: string;
  destinationAddress?: string;
  scheduledDeliveryDate: string; // e.g. "2026-10-15"
  deliveryWindow: string; // e.g. "2:00 PM – 4:30 PM (Afternoon Window)"
  driverName?: string;
  driverPhone?: string;
  timeToDeliveryHours: number; // approximate hours remaining from current time
  accessNotes?: string;
  placementSurface?: 'Concrete Driveway' | 'Paved Asphalt' | 'Grass / Lawn' | 'Gravel / Dirt' | 'Roadside / Nature Strip';
  doorOrientation?: 'Doors Facing Street / Road' | 'Doors Facing House / Property' | 'Driver Discretion';
  accessGateWidth?: 'Wide Open (>3.5m)' | 'Standard (3.0m - 3.5m)' | 'Narrow (<3.0m - Caution)';
  overheadClearanceClear?: boolean;
  secondaryContactName?: string;
  secondaryContactPhone?: string;
  referralSource?: string;
  siteNotes?: string;
  pickupRequestedDate?: string;
  pickupStatus?: 'None' | 'Requested by Customer' | 'Scheduled in Smartsheet' | 'Collected';
  
  // Specific Scenario Attributes
  permitStatus?: 'Not Required' | 'Permit Required (Hold)' | 'Permit Under Review' | 'Permit Approved';
  permitDocumentUrl?: string;
  permitNotes?: string;
  dispatchBlockedByPermit?: boolean;
  
  eSignature?: {
    signedBy: string;
    signedAt: string;
    documentRef: string;
    signatureBase64?: string;
    contractVersion: string;
  };

  specificPlacementInstructions?: string; // e.g., "Place container on left side of driveway, door facing garage, 5ft from sidewalk"
  sitePhotos?: string[];
  
  // Warehouse & Forklift Staging
  warehouseLocation?: import('../types/warehouse').WarehouseLocation;

  siteAccessComplication?: {
    reportedAt: string;
    reason: 'low_power_lines' | 'steep_driveway_grade' | 'parked_vehicle_blocking' | 'locked_gate' | 'other';
    reasonLabel: string;
    driverNotes: string;
    photoUrl?: string;
    gpsLat?: number;
    gpsLng?: number;
    resolved: boolean;
    resolution?: 'secondary_placement_approved' | 'aborted_trip_redelivery_fee';
    resolutionNotes?: string;
    dryRunInvoiceId?: string;
    dryRunFeeAmount?: number;
  };

  deliveryDispute?: {
    disputeId: string;
    disputedFee: number;
    reason: string;
    driverGpsLoggedAt: string;
    driverPhotoUrl?: string;
    status: 'Open' | 'Upheld' | 'Courtesy Credit Issued';
    resolutionNotes?: string;
    resolvedAt?: string;
    creditTxnId?: string;
  };

  cancellationDetails?: {
    cancelledAt: string;
    scheduledDate: string;
    noticeHours: number;
    policyOutcome: 'Full Refund (>48h Notice)' | 'Late Cancellation Fee Deducted (<48h Notice)';
    depositRefunded: number;
    feeDeducted: number;
    reason: string;
    refundTxnId?: string;
  };

  history: {
    timestamp: string;
    stage: string;
    note: string;
  }[];
}

export interface CustomerAccount {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  mobile: string;
  companyName?: string;
  address: string;
  suburb: string;
  state: string;
  postcode: string;
  memberSince: string;
  verified: boolean;
  passwordHash?: string; // Simulated for secure login
  lastSmartsheetSyncNote?: string;
  lastSmartsheetSyncAt?: string;
  
  // Quotes
  quotes: {
    id: string;
    quoteNumber: string;
    createdAt: string;
    validUntil: string;
    containerSize: string;
    containerCount: number;
    billingCycle: string;
    firstPaymentTotal: number;
    monthlyStorageFee: number;
    status: 'Draft' | 'Active' | 'Accepted' | 'Expired';
    quoteData: QuoteBreakdown;
  }[];

  // Active & Past Orders
  orders: ContainerOrder[];

  // Financial & Billing
  paymentPlan: {
    planType: '12_months_upfront' | '6_months_upfront' | '3_months_upfront' | 'monthly' | 'weekly';
    planLabel: string;
    autopayEnabled: boolean;
    dunningStatus?: {
      stage: number; // 1, 2, or 3
      lastAttempt: string; // ISO date
      nextAttempt: string; // ISO date
    };
    paymentsCeased?: boolean;
    paymentsCeasedDate?: string;
    paymentsCeasedReason?: string;
    cardBrand: string;
    cardLast4: string;
    cardExpiry: string;
    nextBillingDate: string;
    periodicAmount: number;
    termDiscountPercent: number;
  };

  transactions: CustomerTransaction[];
  
  // Total discounts given to customer
  discountsGiven: {
    id: string;
    date: string;
    type: 'promo_code' | 'upfront_term' | 'volume_discount' | 'price_match';
    code?: string;
    description: string;
    amount: number;
  }[];

  // Lifecycle & CRM Intelligence
  lifecycleStage?: 'New Quote' | 'Booked' | 'Dispatched' | 'Active Placement' | 'Warehouse Storage' | 'Completed';
  feedback?: CustomerFeedback[];
  loyaltyTier?: CustomerLoyaltyTier;
  healthStatus?: 'healthy' | 'attention' | 'at_risk';
  lastContactedAt?: string;
  crmNotes?: string[];
  pricingOverride?: {
    overrideMonthlyRate: number;
    durationMonths: number;
    startDate: string;
    expiryDate: string;
    reason: string;
    appliedBy: string;
    appliedAt: string;
    isActive: boolean;
    monthsRemaining: number;
  };
}

export interface CustomerFeedback {
  id: string;
  orderNumber: string;
  rating: number; // 1 to 5 stars
  submittedAt: string;
  category: 'delivery_placement' | 'container_quality' | 'pricing_transparency' | 'customer_support' | 'general';
  tags: string[]; // e.g. 'Driveway Protected', 'Punctual Driver', 'Zero Tilting', 'Clear Communication'
  comment?: string;
  followUpRequested?: boolean;
  status: 'Received' | 'Acknowledged' | 'Actioned';
  agentNotes?: string;
}

export interface CustomerLoyaltyTier {
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  monthsActive: number;
  perks: string[];
  nextTierMonthsRemaining: number;
  referralCode: string;
  referralEarningsAud: number;
}

const STORAGE_KEY = 'portabox_customer_accounts';
const CURRENT_USER_KEY = 'portabox_current_user_session';

// Initial Seed Customers for realistic demonstration & testing
const SEED_CUSTOMERS: CustomerAccount[] = [
  {
    id: 'CUST-8021',
    email: 'sarah.jenkins@gmail.com',
    firstName: 'Sarah',
    lastName: 'Jenkins',
    mobile: '0412 849 201',
    address: '42 Osmond Terrace',
    suburb: 'Norwood',
    state: 'SA',
    postcode: '5067',
    memberSince: '12 Aug 2026',
    verified: true,
    quotes: [
      {
        id: 'QUO-2026-904',
        quoteNumber: 'PBQ-904',
        createdAt: '12 Aug 2026',
        validUntil: '26 Oct 2026',
        containerSize: 'large_25m3',
        containerCount: 1,
        billingCycle: 'monthly',
        firstPaymentTotal: 408,
        monthlyStorageFee: 259,
        status: 'Accepted',
        quoteData: {} as any,
      },
    ],
    orders: [
      {
        id: 'ORD-9841',
        orderNumber: 'PBO-9841',
        containerId: 'PB-BOX-25-088',
        containerSize: '25 m³',
        containerName: 'Large 25 m³ (Portabox Pro)',
        serviceType: 'Storage at secure facility',
        status: 'Placed at Customer',
        location: 'Customer Driveway - Norwood SA (Loading stage)',
        originAddress: '42 Osmond Terrace, Norwood SA 5067',
        destinationAddress: 'Portabox Adelaide Central Depot, Bay 12',
        scheduledDeliveryDate: '2026-10-02',
        deliveryWindow: '9:00 AM – 11:30 AM (Morning Window)',
        driverName: 'Dave Higgins (Driver #03)',
        driverPhone: '0488 123 456',
        timeToDeliveryHours: 5,
        accessNotes: 'Driveway has slight incline. Driver to ring bell upon arrival.',
        history: [
          { timestamp: '12 Aug 2026 14:20', stage: 'Order Booked', note: 'Initial payment confirmed via Braintree.' },
          { timestamp: '01 Oct 2026 08:30', stage: 'Container Dispatched', note: 'Loaded onto horizontal level-lift truck at Adelaide Depot.' },
          { timestamp: '01 Oct 2026 10:15', stage: 'Placed at Customer', note: 'Successfully placed on driveway with ground pads.' },
        ],
      },
    ],
    paymentPlan: {
      planType: 'monthly',
      planLabel: 'Monthly Automatic Debit',
      autopayEnabled: true,
      cardBrand: 'Visa',
      cardLast4: '4242',
      cardExpiry: '11/28',
      nextBillingDate: '12 Nov 2026',
      periodicAmount: 259,
      termDiscountPercent: 0,
    },
    transactions: [
      {
        id: 'TXN-901',
        invoiceNumber: 'INV-2026-0812',
        date: '12 Aug 2026',
        description: 'First payment: Initial delivery ($149) + 1st month storage ($259)',
        amount: 408,
        status: 'Paid',
        paymentMethod: 'Visa •••• 4242 (Braintree)',
        transactionId: 'bt_txn_3N1abc99210041',
      },
      {
        id: 'TXN-902',
        invoiceNumber: 'INV-2026-0912',
        date: '12 Sep 2026',
        description: 'Monthly Storage Rent (Large 25 m³) - Sep 2026',
        amount: 259,
        status: 'Paid',
        paymentMethod: 'Visa •••• 4242 (Braintree Autopay)',
        transactionId: 'bt_txn_3N2xyz88210099',
      },
      {
        id: 'TXN-903',
        invoiceNumber: 'INV-2026-1012',
        date: '12 Oct 2026',
        description: 'Monthly Storage Rent (Large 25 m³) - Oct 2026',
        amount: 259,
        status: 'Pending',
        dueDate: '12 Oct 2026',
        paymentMethod: 'Visa •••• 4242 (Scheduled Autopay)',
      },
    ],
    discountsGiven: [
      {
        id: 'DSC-101',
        date: '12 Aug 2026',
        type: 'promo_code',
        code: 'FREEDEL',
        description: 'Free initial delivery special promo code',
        amount: 149,
      },
    ],
  },
  {
    id: 'CUST-8022',
    email: 'david.miller@builderpro.com.au',
    firstName: 'David',
    lastName: 'Miller',
    companyName: 'Miller Construction & Reno',
    mobile: '0433 912 304',
    address: '18 King William Street',
    suburb: 'Hyde Park',
    state: 'SA',
    postcode: '5061',
    memberSince: '04 Jul 2026',
    verified: true,
    quotes: [
      {
        id: 'QUO-2026-781',
        quoteNumber: 'PBQ-781',
        createdAt: '04 Jul 2026',
        validUntil: '18 Jul 2026',
        containerSize: 'large_25m3',
        containerCount: 1,
        billingCycle: '12_months_upfront',
        firstPaymentTotal: 2628,
        monthlyStorageFee: 219,
        status: 'Accepted',
        quoteData: {} as any,
      },
    ],
    orders: [
      {
        id: 'ORD-8912',
        orderNumber: 'PBO-8912',
        containerId: 'PB-BOX-25-104',
        containerSize: '25 m³ Large',
        containerName: 'Large 25 m³ Container',
        serviceType: 'Driveway storage for renovation',
        status: 'Placed at Customer',
        location: 'Site driveway - Hyde Park SA',
        originAddress: '18 King William Street, Hyde Park SA',
        scheduledDeliveryDate: '2026-10-18',
        deliveryWindow: '1:30 PM – 4:00 PM',
        driverName: 'Mark Stevens (Heavy Haulage #01)',
        driverPhone: '0411 987 654',
        timeToDeliveryHours: 408,
        accessNotes: 'Ensure clearance from overhead power lines. Dual-lift truck needed.',
        history: [
          { timestamp: '04 Jul 2026 10:00', stage: '12-Month Contract Signed', note: 'Upfront prepayment discount locked.' },
          { timestamp: '05 Jul 2026 14:00', stage: 'Containers Delivered', note: 'Placed safely side-by-side on front driveway.' },
        ],
      },
    ],
    paymentPlan: {
      planType: '12_months_upfront',
      planLabel: '12 Months Upfront Prepayment',
      autopayEnabled: true,
      cardBrand: 'Mastercard',
      cardLast4: '8821',
      cardExpiry: '09/27',
      nextBillingDate: '04 Jul 2027',
      periodicAmount: 418,
      termDiscountPercent: 20,
    },
    transactions: [
      {
        id: 'TXN-881',
        invoiceNumber: 'INV-2026-0704',
        date: '04 Jul 2026',
        description: '12 Months Prepayment + 2x Container Delivery (Renovation Multi-Unit)',
        amount: 4290,
        status: 'Paid',
        paymentMethod: 'Mastercard •••• 8821 (Braintree)',
        transactionId: 'bt_txn_3Nupfront998811',
      },
      {
        id: 'TXN-882',
        invoiceNumber: 'INV-2026-0925',
        date: '25 Sep 2026',
        description: 'Heavy duty moving blankets order (10x pack)',
        amount: 220,
        status: 'Overdue',
        dueDate: '28 Sep 2026',
        paymentMethod: 'Pending Payment',
      },
    ],
    discountsGiven: [
      {
        id: 'DSC-201',
        date: '04 Jul 2026',
        type: 'upfront_term',
        description: '12 Months Upfront Advance Billing Discount (20% Off Monthly Storage)',
        amount: 980,
      },
      {
        id: 'DSC-202',
        date: '04 Jul 2026',
        type: 'volume_discount',
        description: 'Multi-container packing waiver',
        amount: 149,
      },
    ],
  },
  {
    id: 'CUST-8023',
    email: 'liam.henderson@outlook.com',
    firstName: 'Liam',
    lastName: 'Henderson',
    mobile: '0488 443 219',
    address: '74 Kensington Road',
    suburb: 'Rose Park',
    state: 'SA',
    postcode: '5067',
    memberSince: '10 Oct 2026',
    verified: true,
    quotes: [
      {
        id: 'QUO-2026-940',
        quoteNumber: 'PBQ-940',
        createdAt: '10 Oct 2026',
        validUntil: '24 Oct 2026',
        containerSize: 'small_10m3',
        containerCount: 1,
        billingCycle: 'monthly',
        firstPaymentTotal: 348,
        monthlyStorageFee: 199,
        status: 'Accepted',
        quoteData: {} as any,
      },
    ],
    orders: [
      {
        id: 'ORD-9915',
        orderNumber: 'PBO-9915',
        containerId: 'PB-BOX-10-044',
        containerSize: '10 m³ (12-Foot Compact)',
        containerName: 'Small 10 m³ Container',
        serviceType: 'Residential Move & Storage',
        status: 'Scheduled',
        location: 'Allocated at Adelaide Depot (Dry Creek SA) - Bay 04',
        originAddress: '74 Kensington Road, Rose Park SA 5067',
        scheduledDeliveryDate: '2026-10-19',
        deliveryWindow: '9:00 AM – 11:30 AM (Morning Window)',
        driverName: 'Dave Higgins (Driver #03)',
        driverPhone: '0488 123 456',
        timeToDeliveryHours: 110,
        accessNotes: 'Driveway access. Gate code #4490.',
        specificPlacementInstructions: 'Place on left side of driveway, door facing garage, 5ft from sidewalk.',
        eSignature: {
          signedBy: 'Liam Henderson',
          signedAt: '10 Oct 2026 14:15',
          documentRef: 'DOC-AGR-9915-v1.pdf',
          contractVersion: 'Standard Residential Terms v4.2',
        },
        permitStatus: 'Not Required',
        history: [
          { timestamp: '10 Oct 2026 14:10', stage: 'Online Quote Generated', note: 'Selected 10 m³ container with monthly billing.' },
          { timestamp: '10 Oct 2026 14:15', stage: 'Agreement Signed', note: 'Digital signature captured for Liam Henderson.' },
          { timestamp: '10 Oct 2026 14:16', stage: 'Deposit Charged', note: 'Initial delivery deposit $149 + storage $199 verified.' },
          { timestamp: '10 Oct 2026 14:20', stage: 'Fleet Reserved', note: 'Unit PB-BOX-10-044 tagged at Dry Creek Depot.' },
        ],
      },
    ],
    paymentPlan: {
      planType: 'monthly',
      planLabel: 'Monthly Automatic Debit',
      autopayEnabled: true,
      cardBrand: 'Visa',
      cardLast4: '3190',
      cardExpiry: '08/28',
      nextBillingDate: '19 Nov 2026',
      periodicAmount: 199,
      termDiscountPercent: 0,
    },
    transactions: [
      {
        id: 'TXN-940',
        invoiceNumber: 'INV-2026-1010',
        date: '10 Oct 2026',
        description: 'Booking Deposit: Initial Delivery ($149) + 1st Month Storage ($199)',
        amount: 348,
        status: 'Paid',
        paymentMethod: 'Visa •••• 3190 (Braintree)',
        transactionId: 'bt_txn_9940_dep',
      },
    ],
    discountsGiven: [],
  },
  {
    id: 'CUST-8024',
    email: 'marcus.brody@glenelgcoastal.com',
    firstName: 'Marcus',
    lastName: 'Brody',
    mobile: '0421 770 992',
    address: '14 Jetty Road',
    suburb: 'Glenelg',
    state: 'SA',
    postcode: '5045',
    memberSince: '11 Oct 2026',
    verified: true,
    quotes: [
      {
        id: 'QUO-2026-955',
        quoteNumber: 'PBQ-955',
        createdAt: '11 Oct 2026',
        validUntil: '25 Oct 2026',
        containerSize: 'large_25m3',
        containerCount: 1,
        billingCycle: 'monthly',
        firstPaymentTotal: 408,
        monthlyStorageFee: 259,
        status: 'Accepted',
        quoteData: {} as any,
      },
    ],
    orders: [
      {
        id: 'ORD-7719',
        orderNumber: 'PBO-7719',
        containerId: 'PB-BOX-25-112',
        containerSize: '25 m³',
        containerName: 'Large 25 m³ Container',
        serviceType: 'Public Road / Nature Strip Placement',
        status: 'Scheduled',
        location: 'Depot Yard Hold - Dry Creek SA',
        originAddress: '14 Jetty Road, Glenelg SA 5045',
        scheduledDeliveryDate: '2026-10-17',
        deliveryWindow: '1:30 PM – 4:00 PM',
        driverName: 'Unassigned (Permit Hold Active)',
        driverPhone: '1800 467 637',
        timeToDeliveryHours: 64,
        accessNotes: 'Public roadside parking nature strip. High foot traffic zone.',
        permitStatus: 'Permit Required (Hold)',
        dispatchBlockedByPermit: true,
        permitNotes: 'City of Holdfast Bay Council Street Placement Permit & HOA clearance required prior to dispatch release.',
        specificPlacementInstructions: 'Place parallel to kerb on marked parking bay, reflective safety cones on corners.',
        history: [
          { timestamp: '11 Oct 2026 11:00', stage: 'Booking Placed', note: 'Customer specified roadside public verge drop-off.' },
          { timestamp: '11 Oct 2026 11:05', stage: 'Permit Hold Triggered', note: 'Automated municipal street placement hold applied. Driver dispatch locked.' },
        ],
      },
    ],
    paymentPlan: {
      planType: 'monthly',
      planLabel: 'Monthly Automatic Debit',
      autopayEnabled: true,
      cardBrand: 'Mastercard',
      cardLast4: '9921',
      cardExpiry: '10/28',
      nextBillingDate: '17 Nov 2026',
      periodicAmount: 259,
      termDiscountPercent: 0,
    },
    transactions: [
      {
        id: 'TXN-955',
        invoiceNumber: 'INV-2026-1011',
        date: '11 Oct 2026',
        description: 'Booking Deposit: Delivery ($149) + 1st Month Storage ($259)',
        amount: 408,
        status: 'Paid',
        paymentMethod: 'Mastercard •••• 9921 (Braintree)',
        transactionId: 'bt_txn_955_dep',
      },
    ],
    discountsGiven: [],
  },
  {
    id: 'CUST-8025',
    email: 'jessica.taylor@designhub.com.au',
    firstName: 'Jessica',
    lastName: 'Taylor',
    mobile: '0439 551 884',
    address: '88 Unley Road',
    suburb: 'Unley',
    state: 'SA',
    postcode: '5061',
    memberSince: '13 Oct 2026',
    verified: true,
    quotes: [
      {
        id: 'QUO-2026-972',
        quoteNumber: 'PBQ-972',
        createdAt: '13 Oct 2026',
        validUntil: '27 Oct 2026',
        containerSize: 'large_25m3',
        containerCount: 1,
        billingCycle: 'monthly',
        firstPaymentTotal: 408,
        monthlyStorageFee: 259,
        status: 'Accepted',
        quoteData: {} as any,
      },
    ],
    orders: [
      {
        id: 'ORD-6621',
        orderNumber: 'PBO-6621',
        containerId: 'PB-BOX-25-055',
        containerSize: '25 m³',
        containerName: 'Large 25 m³ Container',
        serviceType: 'Residential Driveway Storage',
        status: 'Scheduled',
        location: 'Returned to Depot (Failed Access Dry-Run)',
        originAddress: '88 Unley Road, Unley SA 5061',
        scheduledDeliveryDate: '2026-10-14',
        deliveryWindow: '10:00 AM – 12:30 PM',
        driverName: 'Dave Higgins (Driver #03)',
        driverPhone: '0488 123 456',
        timeToDeliveryHours: 0,
        accessNotes: 'Narrow shared laneway driveway. Neighbors park on verge.',
        siteAccessComplication: {
          reportedAt: '14 Oct 2026 10:45',
          reason: 'parked_vehicle_blocking',
          reasonLabel: 'Parked vehicle blocking driveway access',
          driverNotes: 'White Ford Ranger (SA S912-XYZ) parked across shared driveway entrance. Clearance under 2.4m (required: 3.5m). Waited 20 minutes, called customer twice. Trip aborted.',
          photoUrl: 'https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=600&q=80',
          gpsLat: -34.9512,
          gpsLng: 138.6044,
          resolved: false,
          resolution: 'aborted_trip_redelivery_fee',
          dryRunInvoiceId: 'INV-DRY-6621',
          dryRunFeeAmount: 99,
        },
        deliveryDispute: {
          disputeId: 'DISP-6621',
          disputedFee: 99,
          reason: 'Customer states neighbor moved vehicle 10 mins later and disputes $99 dry-run re-delivery fee.',
          driverGpsLoggedAt: '14 Oct 2026 10:45:12 (GPS: -34.9512, 138.6044)',
          driverPhotoUrl: 'https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=600&q=80',
          status: 'Open',
        },
        history: [
          { timestamp: '13 Oct 2026 09:00', stage: 'Order Booked', note: 'Deposit paid $408 via Braintree.' },
          { timestamp: '14 Oct 2026 10:25', stage: 'Driver Arrived', note: 'GPS recorded at 88 Unley Rd (-34.9512, 138.6044).' },
          { timestamp: '14 Oct 2026 10:45', stage: 'Access Complication', note: 'Shared driveway blocked by parked neighbor vehicle. Photo uploaded.' },
          { timestamp: '14 Oct 2026 10:50', stage: 'Dry Run Invoiced', note: 'Trip aborted per terms. $99 dry run charge billed (INV-DRY-6621).' },
          { timestamp: '14 Oct 2026 11:30', stage: 'Dispute Lodged', note: 'Customer called disputing fee claiming driver left too quickly.' },
        ],
      },
    ],
    paymentPlan: {
      planType: 'monthly',
      planLabel: 'Monthly Automatic Debit',
      autopayEnabled: true,
      cardBrand: 'Visa',
      cardLast4: '8841',
      cardExpiry: '05/29',
      nextBillingDate: '14 Nov 2026',
      periodicAmount: 259,
      termDiscountPercent: 0,
    },
    transactions: [
      {
        id: 'TXN-972',
        invoiceNumber: 'INV-2026-1013',
        date: '13 Oct 2026',
        description: 'Booking Deposit: Delivery ($149) + 1st Month Storage ($259)',
        amount: 408,
        status: 'Paid',
        paymentMethod: 'Visa •••• 8841 (Braintree)',
        transactionId: 'bt_txn_972_dep',
      },
      {
        id: 'TXN-DRY-6621',
        invoiceNumber: 'INV-DRY-6621',
        date: '14 Oct 2026',
        description: 'Dry Run / Aborted Delivery Fee (Driveway Blocked by Vehicle)',
        amount: 99,
        status: 'Pending',
        dueDate: '21 Oct 2026',
        paymentMethod: 'Visa •••• 8841 (Disputed)',
        transactionId: 'bt_dry_6621',
      },
    ],
    discountsGiven: [],
  },
];

export function loadCustomerAccounts(): CustomerAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveCustomerAccounts(SEED_CUSTOMERS);
      return SEED_CUSTOMERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED_CUSTOMERS;
  } catch (err) {
    console.error('Error loading customer accounts:', err);
    return SEED_CUSTOMERS;
  }
}

export function saveCustomerAccounts(accounts: CustomerAccount[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
  } catch (err) {
    console.error('Error saving customer accounts:', err);
  }
}

export function getCurrentUserSession(): CustomerAccount | null {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setCurrentUserSession(customer: CustomerAccount | null): void {
  try {
    if (customer) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(customer));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  } catch (err) {
    console.error('Error setting current user session:', err);
  }
}

/**
 * Register or update customer from a submitted quote lead / paid booking
 */
export function upsertCustomerFromLead(lead: {
  firstName: string;
  lastName?: string;
  email: string;
  mobile: string;
  quote: QuoteBreakdown;
  paymentTransactionId?: string;
  paymentAmount?: number;
  paymentMethod?: string;
}): CustomerAccount {
  const accounts = loadCustomerAccounts();
  const existingIdx = accounts.findIndex(
    (a) => a.email.toLowerCase() === lead.email.toLowerCase() || a.mobile === lead.mobile
  );

  const containerSizeLabel = lead.quote.containerName || '25 m³ Container';
  const newOrder: ContainerOrder = {
    id: `ORD-${Date.now().toString().slice(-4)}`,
    orderNumber: `PBO-${Date.now().toString().slice(-4)}`,
    containerId: `PB-BOX-${Math.floor(100 + Math.random() * 900)}`,
    containerSize: lead.quote.containerVolume || '25 m³',
    containerName: containerSizeLabel,
    serviceType: lead.quote.serviceType === 'moving_storage' ? 'Move & Storage' : 'Container Storage',
    status: 'Scheduled',
    location: `En route to ${lead.quote.originPostcode.suburb} ${lead.quote.originPostcode.state}`,
    originAddress: `${lead.quote.originPostcode.suburb}, ${lead.quote.originPostcode.state} ${lead.quote.originPostcode.postcode}`,
    scheduledDeliveryDate: lead.quote.preferredDate,
    deliveryWindow: lead.quote.selectedSlot?.timeRange || 'Morning Window (8:00 AM – 11:30 AM)',
    driverName: 'Dispatch Scheduled (Portabox Metro Fleet)',
    driverPhone: '1800 467 637',
    timeToDeliveryHours: 72,
    accessNotes: 'Standard residential driveway delivery.',
    history: [
      {
        timestamp: new Date().toLocaleString(),
        stage: 'Booking Confirmed',
        note: `Quote confirmed with first payment total $${lead.quote.firstPaymentTotal}.`,
      },
    ],
  };

  const newQuote = {
    id: `QUO-${Date.now().toString().slice(-4)}`,
    quoteNumber: `PBQ-${Date.now().toString().slice(-4)}`,
    createdAt: new Date().toLocaleDateString('en-AU'),
    validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('en-AU'),
    containerSize: lead.quote.containerSize,
    containerCount: lead.quote.containerCount,
    billingCycle: lead.quote.billingCycle,
    firstPaymentTotal: lead.quote.firstPaymentTotal,
    monthlyStorageFee: lead.quote.monthlyStorageFee,
    status: 'Accepted' as const,
    quoteData: lead.quote,
  };

  const newTransaction: CustomerTransaction = {
    id: `TXN-${Date.now().toString().slice(-4)}`,
    invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
    date: new Date().toLocaleDateString('en-AU'),
    description: `Booking deposit: Container delivery + ${lead.quote.billingCycle} storage`,
    amount: lead.paymentAmount || lead.quote.firstPaymentTotal,
    status: 'Paid',
    paymentMethod: lead.paymentMethod || 'Credit Card (Braintree)',
    transactionId: lead.paymentTransactionId || `bt_live_${Date.now()}`,
  };

  const discounts = (lead.quote.appliedPromotions || []).map((p, idx) => ({
    id: `DSC-${Date.now()}-${idx}`,
    date: new Date().toLocaleDateString('en-AU'),
    type: 'promo_code' as const,
    code: p.rule.code,
    description: p.description,
    amount: p.discountAmount,
  }));

  if (existingIdx >= 0) {
    const existing = accounts[existingIdx];
    existing.quotes = [newQuote, ...(existing.quotes || [])];
    existing.orders = [newOrder, ...(existing.orders || [])];
    existing.transactions = [newTransaction, ...(existing.transactions || [])];
    if (discounts.length > 0) {
      existing.discountsGiven = [...discounts, ...(existing.discountsGiven || [])];
    }
    accounts[existingIdx] = existing;
    saveCustomerAccounts(accounts);
    setCurrentUserSession(existing);
    return existing;
  } else {
    const newCustomer: CustomerAccount = {
      id: `CUST-${Math.floor(1000 + Math.random() * 9000)}`,
      email: lead.email,
      firstName: lead.firstName,
      lastName: lead.lastName || '',
      mobile: lead.mobile,
      address: `${lead.quote.originPostcode.suburb}, ${lead.quote.originPostcode.state}`,
      suburb: lead.quote.originPostcode.suburb,
      state: lead.quote.originPostcode.state,
      postcode: lead.quote.originPostcode.postcode,
      memberSince: new Date().toLocaleDateString('en-AU', { month: 'short', year: 'numeric' }),
      verified: true,
      quotes: [newQuote],
      orders: [newOrder],
      paymentPlan: {
        planType: lead.quote.billingCycle as any,
        planLabel:
          lead.quote.billingCycle === '12_months_upfront'
            ? '12 Months Upfront Prepayment'
            : lead.quote.billingCycle === '6_months_upfront'
            ? '6 Months Upfront Prepayment'
            : lead.quote.billingCycle === '3_months_upfront'
            ? '3 Months Upfront Prepayment'
            : lead.quote.billingCycle === 'weekly'
            ? 'Weekly Debit'
            : 'Monthly Direct Debit',
        autopayEnabled: true,
        cardBrand: 'Visa',
        cardLast4: '4242',
        cardExpiry: '12/28',
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-AU'),
        periodicAmount: lead.quote.currentPeriodicStorageFee,
        termDiscountPercent: lead.quote.upfrontDiscountPercent || 0,
      },
      transactions: [newTransaction],
      discountsGiven: discounts,
    };
    accounts.push(newCustomer);
    saveCustomerAccounts(accounts);
    setCurrentUserSession(newCustomer);
    return newCustomer;
  }
}

// =========================================================================
// SCENARIO WORKFLOW OPERATIONAL FUNCTIONS (END-TO-END CRM & LOGISTICS)
// =========================================================================

/**
 * 1. Check Real-Time Depot Inventory for Container Size Upgrade
 */
export function checkDepotInventoryForUpgrade(targetSize: string, depotName: string = 'Adelaide Depot'): {
  available: boolean;
  count: number;
  candidateUnitIds: string[];
} {
  try {
    const raw = localStorage.getItem('portabox_smartsheet_inventory_v3');
    if (!raw) {
      return { available: true, count: 3, candidateUnitIds: ['PB-BOX-25-104', 'PB-BOX-25-105', 'PB-BOX-25-108'] };
    }
    const assets = JSON.parse(raw);
    const matches = assets.filter((a: any) =>
      a.status === 'Available in Depot' &&
      a.size.toLowerCase().includes(targetSize.toLowerCase().replace(/_/g, ' '))
    );
    return {
      available: matches.length > 0,
      count: matches.length,
      candidateUnitIds: matches.map((m: any) => m.containerId),
    };
  } catch {
    return { available: true, count: 2, candidateUnitIds: ['PB-BOX-25-104', 'PB-BOX-25-108'] };
  }
}

/**
 * 2. Modify Container Size or Quantity (Amended Addendum & Rate Recalculation)
 */
export function modifyContainerSizeOrQuantity(params: {
  customerId: string;
  orderId: string;
  newSizeId: 'small_10m3' | 'medium_19m3' | 'large_25m3' | 'two_large_50m3';
  newSizeLabel: string;
  newMonthlyRate: number;
  deliveryDifferenceAud: number;
  reason?: string;
}): { success: boolean; message: string; customer: CustomerAccount; addendumRef: string } {
  const accounts = loadCustomerAccounts();
  const accIndex = accounts.findIndex((a) => a.id === params.customerId);
  if (accIndex === -1) throw new Error('Customer not found');

  const customer = accounts[accIndex];
  const order = customer.orders.find((o) => o.id === params.orderId);
  if (!order) throw new Error('Order not found');

  // Check inventory
  const invCheck = checkDepotInventoryForUpgrade(params.newSizeLabel);
  const newAssetId = invCheck.candidateUnitIds[0] || `PB-BOX-${Math.floor(100 + Math.random() * 900)}`;

  const oldSize = order.containerSize;
  const oldAssetId = order.containerId;
  const addendumRef = `ADDENDUM-${Date.now().toString().slice(-5)}`;

  // Update order
  order.containerSize = params.newSizeLabel;
  order.containerName = `${params.newSizeLabel} Container`;
  order.containerId = newAssetId;
  order.history.unshift({
    timestamp: new Date().toLocaleString('en-AU'),
    stage: 'Container Modified / Upgraded',
    note: `Modified unit from ${oldSize} (${oldAssetId}) to ${params.newSizeLabel} (${newAssetId}). New monthly rate: $${params.newMonthlyRate}/mo. Contract Addendum Ref: ${addendumRef}. Reason: ${params.reason || 'Customer requested size upgrade mid-packing'}.`,
  });

  // Update payment plan monthly rate
  if (customer.paymentPlan) {
    customer.paymentPlan.periodicAmount = params.newMonthlyRate;
  }

  // If there's an adjustment in delivery or prorated setup fee
  if (params.deliveryDifferenceAud > 0) {
    const diffTxn: CustomerTransaction = {
      id: `TXN-ADD-${Date.now().toString().slice(-4)}`,
      invoiceNumber: `INV-ADD-${Date.now().toString().slice(-6)}`,
      date: new Date().toLocaleDateString('en-AU'),
      description: `Contract Addendum: Size upgrade difference fee (${oldSize} -> ${params.newSizeLabel})`,
      amount: params.deliveryDifferenceAud,
      status: 'Paid',
      paymentMethod: customer.paymentPlan ? `${customer.paymentPlan.cardBrand} •••• ${customer.paymentPlan.cardLast4}` : 'Credit Card',
      transactionId: `bt_add_${Date.now()}`,
    };
    customer.transactions.unshift(diffTxn);
  }

  accounts[accIndex] = customer;
  saveCustomerAccounts(accounts);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('portabox-smartsheet-sync'));
  }

  return {
    success: true,
    message: `Container size updated to ${params.newSizeLabel} (Unit ${newAssetId}). Monthly rate adjusted to $${params.newMonthlyRate}/mo. Addendum ${addendumRef} generated.`,
    customer,
    addendumRef,
  };
}

/**
 * Applies an Admin Manual Pricing Override for further N months to a customer account.
 * Once the N months expire, the existing pricing review policy applies.
 */
export function applyCustomerAccountPricingOverride(params: {
  customerId: string;
  overrideMonthlyRate: number;
  durationMonths: number;
  reason?: string;
  appliedBy?: string;
}): { success: boolean; message: string; customer?: CustomerAccount } {
  const accounts = loadCustomerAccounts();
  const accIndex = accounts.findIndex((a) => a.id === params.customerId);
  if (accIndex === -1) {
    return { success: false, message: `Customer account ${params.customerId} not found.` };
  }

  const customer = accounts[accIndex];
  const now = new Date();
  const durationDays = Math.round(params.durationMonths * 30.4375);
  const expiryDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

  customer.pricingOverride = {
    overrideMonthlyRate: params.overrideMonthlyRate,
    durationMonths: params.durationMonths,
    startDate: now.toISOString(),
    expiryDate: expiryDate.toISOString(),
    reason: params.reason || 'Admin custom rate agreement',
    appliedBy: params.appliedBy || 'Admin',
    appliedAt: now.toISOString(),
    isActive: true,
    monthsRemaining: params.durationMonths,
  };

  // Update current periodic payment amount
  if (customer.paymentPlan) {
    customer.paymentPlan.periodicAmount = params.overrideMonthlyRate;
  }

  // Record a CRM note
  if (!customer.crmNotes) customer.crmNotes = [];
  customer.crmNotes.unshift(
    `[${now.toLocaleDateString('en-AU')}] Admin pricing override applied: $${params.overrideMonthlyRate}/mo locked for further ${params.durationMonths} months (until ${expiryDate.toLocaleDateString('en-AU')}). Reason: ${params.reason || 'Admin custom rate'}. Existing pricing review policy applies after expiry.`
  );

  accounts[accIndex] = customer;
  saveCustomerAccounts(accounts);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('portabox-smartsheet-sync'));
  }

  return {
    success: true,
    message: `Pricing override of $${params.overrideMonthlyRate}/mo applied for further ${params.durationMonths} months. Once expired on ${expiryDate.toLocaleDateString('en-AU')}, standard review policy applies.`,
    customer,
  };
}

/**
 * Clears an admin pricing override on a customer account and reverts to standard pricing review policy
 */
export function clearCustomerAccountPricingOverride(customerId: string): {
  success: boolean;
  message: string;
  customer?: CustomerAccount;
} {
  const accounts = loadCustomerAccounts();
  const accIndex = accounts.findIndex((a) => a.id === customerId);
  if (accIndex === -1) {
    return { success: false, message: 'Customer account not found' };
  }

  const customer = accounts[accIndex];
  const now = new Date();

  delete customer.pricingOverride;

  if (!customer.crmNotes) customer.crmNotes = [];
  customer.crmNotes.unshift(
    `[${now.toLocaleDateString('en-AU')}] Admin pricing override removed. Existing pricing review policy restored.`
  );

  accounts[accIndex] = customer;
  saveCustomerAccounts(accounts);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('portabox-smartsheet-sync'));
  }

  return {
    success: true,
    message: 'Pricing override removed. Standard pricing review policy restored.',
    customer,
  };
}

export interface ManualPaymentOverrideParams {
  customerId: string;
  amount: number;
  paymentType: 'periodic_rent' | 'custom_adjustment' | 'courtesy_credit' | 'waiver';
  paymentMethod: string;
  description: string;
  reference?: string;
  appliedBy?: string;
  advanceBillingDate?: boolean;
  newNextBillingDate?: string;
}

/**
 * Manually records or overrides a customer payment (e.g. cash, EFT, staff card auth, or courtesy waiver)
 * and synchronizes ledger transactions and next billing dates.
 */
export function recordManualCustomerPaymentOverride(params: ManualPaymentOverrideParams): {
  success: boolean;
  message: string;
  customer?: CustomerAccount;
  transaction?: CustomerTransaction;
} {
  const accounts = loadCustomerAccounts();
  const accIndex = accounts.findIndex((a) => a.id === params.customerId);
  if (accIndex === -1) {
    return { success: false, message: `Customer account ${params.customerId} not found.` };
  }

  const customer = accounts[accIndex];
  const now = new Date();
  const txRef = params.reference?.trim() || `MAN-PAY-${Date.now().toString().slice(-6)}`;
  const invoiceNum = `INV-M-${Date.now().toString().slice(-5)}`;

  const newTx: CustomerTransaction = {
    id: `tx-${Date.now()}`,
    invoiceNumber: invoiceNum,
    date: now.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }),
    description: params.description || `Manual Payment Override (${params.paymentMethod})`,
    amount: params.amount,
    status: 'Paid',
    paymentMethod: params.paymentMethod,
    transactionId: txRef,
    isAdjustment: params.paymentType === 'courtesy_credit' || params.paymentType === 'waiver',
    adjustmentType: params.paymentType === 'courtesy_credit' || params.paymentType === 'waiver' ? 'credit' : undefined,
  };

  customer.transactions = [newTx, ...(customer.transactions || [])];

  // If periodic rent was paid or advanceBillingDate requested, advance next billing date by 30 days
  if (customer.paymentPlan && (params.paymentType === 'periodic_rent' || params.advanceBillingDate)) {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 30);
    customer.paymentPlan.nextBillingDate =
      params.newNextBillingDate ||
      nextDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
    
    // Clear any active dunning hold
    if (customer.paymentPlan.dunningStatus) {
      delete customer.paymentPlan.dunningStatus;
    }
  }

  if (!customer.crmNotes) customer.crmNotes = [];
  customer.crmNotes.unshift(
    `[${now.toLocaleDateString('en-AU')}] Manual Payment Override: $${params.amount} AUD recorded via ${params.paymentMethod} by ${params.appliedBy || 'Admin'}. Ref: ${txRef}. Description: ${params.description}`
  );

  accounts[accIndex] = customer;
  saveCustomerAccounts(accounts);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('portabox-smartsheet-sync', {
        detail: {
          summary: `Manual payment override: $${params.amount} AUD for ${customer.firstName} ${customer.lastName} (${params.paymentMethod})`,
        },
      })
    );
  }

  return {
    success: true,
    message: `Manual payment of $${params.amount} AUD recorded successfully for ${customer.firstName} ${customer.lastName} (Ref: ${txRef}).`,
    customer,
    transaction: newTx,
  };
}

/**
 * 3. Pre-Delivery Cancellation & Deposit Refund (>48h notice policy check)
 */
export function cancelPreDeliveryOrderWithPolicy(params: {
  customerId: string;
  orderId: string;
  reason: string;
}): {
  success: boolean;
  message: string;
  policyOutcome: 'Full Refund (>48h Notice)' | 'Late Cancellation Fee Deducted (<48h Notice)';
  refundAmount: number;
  feeDeducted: number;
  customer: CustomerAccount;
} {
  const accounts = loadCustomerAccounts();
  const accIndex = accounts.findIndex((a) => a.id === params.customerId);
  if (accIndex === -1) throw new Error('Customer not found');

  const customer = accounts[accIndex];
  const order = customer.orders.find((o) => o.id === params.orderId);
  if (!order) throw new Error('Order not found');

  // Compute notice hours
  const scheduledTime = new Date(order.scheduledDeliveryDate).getTime();
  const nowTime = Date.now();
  const hoursRemaining = Math.max(0, Math.round((scheduledTime - nowTime) / (1000 * 60 * 60)));

  // Find original booking deposit transaction
  const depositTxn = customer.transactions.find(
    (t) => t.status === 'Paid' && (t.description.toLowerCase().includes('deposit') || t.description.toLowerCase().includes('first payment'))
  ) || customer.transactions[0];

  const totalPaid = depositTxn ? Math.abs(depositTxn.amount) : 348;
  const isOver48Hours = hoursRemaining >= 48;

  const policyOutcome = isOver48Hours
    ? ('Full Refund (>48h Notice)' as const)
    : ('Late Cancellation Fee Deducted (<48h Notice)' as const);

  const feeDeducted = isOver48Hours ? 0 : 99; // $99 dispatch staging fee if late
  const refundAmount = Math.max(0, totalPaid - feeDeducted);

  const refundTxnId = `RFD-CAN-${Date.now().toString().slice(-4)}`;
  const refundTxn: CustomerTransaction = {
    id: refundTxnId,
    invoiceNumber: `INV-RFD-${Date.now().toString().slice(-6)}`,
    date: new Date().toLocaleDateString('en-AU'),
    description: `Booking Cancellation Refund (${policyOutcome}): $${refundAmount} returned${feeDeducted > 0 ? ` ($${feeDeducted} late staging fee retained)` : ''}. Reason: ${params.reason}`,
    amount: -refundAmount,
    status: 'Refunded',
    paymentMethod: depositTxn?.paymentMethod || 'Original Payment Gateway (Braintree)',
    transactionId: `bt_rfd_${Date.now()}`,
    isAdjustment: true,
    adjustmentType: 'refund',
  };

  customer.transactions.unshift(refundTxn);

  // Cease autopay
  if (customer.paymentPlan) {
    customer.paymentPlan.autopayEnabled = false;
    customer.paymentPlan.paymentsCeased = true;
    customer.paymentPlan.paymentsCeasedDate = new Date().toLocaleDateString('en-AU');
    customer.paymentPlan.paymentsCeasedReason = `Order cancelled prior to delivery (${params.reason})`;
  }

  // Update order status & record cancellation details
  order.status = 'Completed';
  order.location = 'Cancelled - Inventory Released';
  order.cancellationDetails = {
    cancelledAt: new Date().toLocaleString('en-AU'),
    scheduledDate: order.scheduledDeliveryDate,
    noticeHours: hoursRemaining,
    policyOutcome,
    depositRefunded: refundAmount,
    feeDeducted,
    reason: params.reason,
    refundTxnId,
  };

  order.history.unshift({
    timestamp: new Date().toLocaleString('en-AU'),
    stage: 'Order Cancelled (Pre-Delivery)',
    note: `Cancelled with ${hoursRemaining}h notice. Policy outcome: ${policyOutcome}. Gateway refund: $${refundAmount}. Released container ${order.containerId} back to depot pool. Reason: ${params.reason}.`,
  });

  // Release inventory in Smartsheet inventory cache
  try {
    const rawInv = localStorage.getItem('portabox_smartsheet_inventory_v3');
    if (rawInv) {
      const inv = JSON.parse(rawInv);
      const unit = inv.find((u: any) => u.containerId === order.containerId);
      if (unit) {
        unit.status = 'Available in Depot';
        unit.assignedOrderNumber = undefined;
        localStorage.setItem('portabox_smartsheet_inventory_v3', JSON.stringify(inv));
      }
    }
  } catch (err) {
    console.error('Error releasing inventory asset:', err);
  }

  // Cancel scheduled delivery in routing table
  try {
    const rawStops = localStorage.getItem('portabox_scheduled_deliveries');
    if (rawStops) {
      const stops = JSON.parse(rawStops);
      const filtered = stops.filter((s: any) => s.orderNumber !== order.orderNumber);
      localStorage.setItem('portabox_scheduled_deliveries', JSON.stringify(filtered));
    }
  } catch (err) {
    console.error('Error removing stop from route:', err);
  }

  accounts[accIndex] = customer;
  saveCustomerAccounts(accounts);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('portabox-smartsheet-sync'));
  }

  return {
    success: true,
    message: `Order cancelled under policy: ${policyOutcome}. $${refundAmount} refunded to customer via payment gateway. Inventory released.`,
    policyOutcome,
    refundAmount,
    feeDeducted,
    customer,
  };
}

/**
 * 4. Delivery Reschedule (Customer-Initiated) & Billing Start Shift
 */
export function rescheduleOrderDelivery(params: {
  customerId: string;
  orderId: string;
  newDeliveryDate: string;
  newDeliveryWindow: string;
  reason?: string;
}): { success: boolean; message: string; customer: CustomerAccount } {
  const accounts = loadCustomerAccounts();
  const accIndex = accounts.findIndex((a) => a.id === params.customerId);
  if (accIndex === -1) throw new Error('Customer not found');

  const customer = accounts[accIndex];
  const order = customer.orders.find((o) => o.id === params.orderId);
  if (!order) throw new Error('Order not found');

  const oldDate = order.scheduledDeliveryDate;
  const oldWindow = order.deliveryWindow;

  order.scheduledDeliveryDate = params.newDeliveryDate;
  order.deliveryWindow = params.newDeliveryWindow;

  // Shift next recurring billing cycle date to 30 days after new delivery date
  if (customer.paymentPlan) {
    const newDateObj = new Date(params.newDeliveryDate);
    const nextBillObj = new Date(newDateObj.getTime() + 30 * 24 * 60 * 60 * 1000);
    customer.paymentPlan.nextBillingDate = nextBillObj.toLocaleDateString('en-AU');
  }

  order.history.unshift({
    timestamp: new Date().toLocaleString('en-AU'),
    stage: 'Delivery Rescheduled',
    note: `Rescheduled from ${oldDate} (${oldWindow}) to ${params.newDeliveryDate} (${params.newDeliveryWindow}). Shifted recurring billing cycle start. Reason: ${params.reason || 'Customer request'}.`,
  });

  // Update routing stop if exists
  try {
    const rawStops = localStorage.getItem('portabox_scheduled_deliveries');
    if (rawStops) {
      const stops = JSON.parse(rawStops);
      const stop = stops.find((s: any) => s.orderNumber === order.orderNumber);
      if (stop) {
        stop.preferredSlot = params.newDeliveryWindow;
        stop.notes = `Rescheduled to ${params.newDeliveryDate}. ${stop.notes || ''}`;
        localStorage.setItem('portabox_scheduled_deliveries', JSON.stringify(stops));
      }
    }
  } catch (err) {
    console.error('Error updating routing stop:', err);
  }

  accounts[accIndex] = customer;
  saveCustomerAccounts(accounts);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('portabox-smartsheet-sync'));
  }

  return {
    success: true,
    message: `Delivery rescheduled to ${params.newDeliveryDate} (${params.newDeliveryWindow}). Recurring billing start shifted.`,
    customer,
  };
}

/**
 * 5. Municipal Permit & HOA Clearance Verification
 */
export function updatePermitAndHoaClearance(params: {
  customerId: string;
  orderId: string;
  permitStatus: 'Not Required' | 'Permit Required (Hold)' | 'Permit Under Review' | 'Permit Approved';
  documentName?: string;
  notes?: string;
}): { success: boolean; message: string; customer: CustomerAccount } {
  const accounts = loadCustomerAccounts();
  const accIndex = accounts.findIndex((a) => a.id === params.customerId);
  if (accIndex === -1) throw new Error('Customer not found');

  const customer = accounts[accIndex];
  const order = customer.orders.find((o) => o.id === params.orderId);
  if (!order) throw new Error('Order not found');

  order.permitStatus = params.permitStatus;
  order.permitNotes = params.notes || order.permitNotes;
  if (params.documentName) {
    order.permitDocumentUrl = `/documents/${params.documentName}`;
  }

  if (params.permitStatus === 'Permit Approved') {
    order.dispatchBlockedByPermit = false;
    order.driverName = 'Dave Higgins (Driver #03)';
    order.driverPhone = '0488 123 456';
    order.location = 'Cleared for Dispatch - Adelaide Depot';
    order.history.unshift({
      timestamp: new Date().toLocaleString('en-AU'),
      stage: 'Permit & HOA Cleared',
      note: `Municipal / HOA approval verified (${params.documentName || 'Council Permit verified'}). Dispatch hold released. Assigned driver: Dave Higgins.`,
    });
  } else if (params.permitStatus === 'Permit Required (Hold)') {
    order.dispatchBlockedByPermit = true;
    order.driverName = 'Unassigned (Permit Hold Active)';
    order.location = 'Depot Yard Hold - Dry Creek SA';
    order.history.unshift({
      timestamp: new Date().toLocaleString('en-AU'),
      stage: 'Permit Hold Applied',
      note: `Flagged with Permit Required Hold. Driver dispatch locked. Notes: ${params.notes || 'Awaiting municipal street permit approval'}.`,
    });
  } else {
    order.history.unshift({
      timestamp: new Date().toLocaleString('en-AU'),
      stage: 'Permit Status Updated',
      note: `Status updated to ${params.permitStatus}. ${params.notes || ''}`,
    });
  }

  accounts[accIndex] = customer;
  saveCustomerAccounts(accounts);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('portabox-smartsheet-sync'));
  }

  return {
    success: true,
    message: `Permit clearance status updated to "${params.permitStatus}". ${order.dispatchBlockedByPermit ? 'Dispatch remains locked.' : 'Dispatch unlocked for driver.'}`,
    customer,
  };
}

/**
 * 6. Specific Placement Instructions Update
 */
export function updateSpecificPlacementInstructions(params: {
  customerId: string;
  orderId: string;
  instructions: string;
}): { success: boolean; message: string; customer: CustomerAccount } {
  const accounts = loadCustomerAccounts();
  const accIndex = accounts.findIndex((a) => a.id === params.customerId);
  if (accIndex === -1) throw new Error('Customer not found');

  const customer = accounts[accIndex];
  const order = customer.orders.find((o) => o.id === params.orderId);
  if (!order) throw new Error('Order not found');

  order.specificPlacementInstructions = params.instructions;
  order.history.unshift({
    timestamp: new Date().toLocaleString('en-AU'),
    stage: 'Placement Instructions Updated',
    note: `Specific instructions added: "${params.instructions}". Synced to driver field manifest and mobile app.`,
  });

  // Sync directly to RouteStop notes
  try {
    const rawStops = localStorage.getItem('portabox_scheduled_deliveries');
    if (rawStops) {
      const stops = JSON.parse(rawStops);
      const stop = stops.find((s: any) => s.orderNumber === order.orderNumber);
      if (stop) {
        stop.notes = `[DRIVER PLACEMENT INSTRUCTION]: ${params.instructions} | ${stop.notes || ''}`;
        localStorage.setItem('portabox_scheduled_deliveries', JSON.stringify(stops));
      }
    }
  } catch (err) {
    console.error('Error updating stop placement instruction:', err);
  }

  accounts[accIndex] = customer;
  saveCustomerAccounts(accounts);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('portabox-driver-manifest-update', { detail: { orderNumber: order.orderNumber, instructions: params.instructions } }));
  }

  return {
    success: true,
    message: `Placement instructions successfully saved and pushed to assigned driver: "${params.instructions}".`,
    customer,
  };
}

/**
 * 7. Report Driver Site Access Complication / Reroute on Delivery Day
 */
export function reportDriverSiteComplication(params: {
  orderNumber: string;
  reason: 'low_power_lines' | 'steep_driveway_grade' | 'parked_vehicle_blocking' | 'locked_gate' | 'other';
  reasonLabel: string;
  driverNotes: string;
  photoUrl?: string;
  gpsLat?: number;
  gpsLng?: number;
  action: 'secondary_placement_approved' | 'abort_trip_redelivery_fee';
  secondaryPlacementNotes?: string;
}): { success: boolean; message: string; dryRunInvoiceId?: string } {
  const accounts = loadCustomerAccounts();
  let foundCustomer: CustomerAccount | null = null;
  let foundOrder: ContainerOrder | null = null;
  let accIndex = -1;

  for (let i = 0; i < accounts.length; i++) {
    const ord = accounts[i].orders.find((o) => o.orderNumber === params.orderNumber);
    if (ord) {
      foundCustomer = accounts[i];
      foundOrder = ord;
      accIndex = i;
      break;
    }
  }

  if (!foundCustomer || !foundOrder) {
    throw new Error(`Order ${params.orderNumber} not found.`);
  }

  const isAbort = params.action === 'abort_trip_redelivery_fee';
  const dryRunInvoiceId = isAbort ? `INV-DRY-${Date.now().toString().slice(-4)}` : undefined;

  foundOrder.siteAccessComplication = {
    reportedAt: new Date().toLocaleString('en-AU'),
    reason: params.reason,
    reasonLabel: params.reasonLabel,
    driverNotes: params.driverNotes,
    photoUrl: params.photoUrl || 'https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=600&q=80',
    gpsLat: params.gpsLat || -34.9512,
    gpsLng: params.gpsLng || 138.6044,
    resolved: !isAbort,
    resolution: isAbort ? 'aborted_trip_redelivery_fee' : 'secondary_placement_approved',
    resolutionNotes: params.secondaryPlacementNotes,
    dryRunInvoiceId,
    dryRunFeeAmount: isAbort ? 99 : 0,
  };

  if (isAbort) {
    foundOrder.location = 'Returned to Depot (Failed Access Dry-Run)';
    foundOrder.history.unshift({
      timestamp: new Date().toLocaleString('en-AU'),
      stage: 'Delivery Aborted - Access Blocked',
      note: `Driver arrived (GPS logged). Blocked by ${params.reasonLabel}. Photo evidence recorded. Trip aborted; $99 dry-run re-delivery fee invoiced (${dryRunInvoiceId}).`,
    });

    const dryRunTxn: CustomerTransaction = {
      id: `TXN-${dryRunInvoiceId}`,
      invoiceNumber: dryRunInvoiceId!,
      date: new Date().toLocaleDateString('en-AU'),
      description: `Dry Run / Aborted Delivery Fee: ${params.reasonLabel}`,
      amount: 99,
      status: 'Pending',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-AU'),
      paymentMethod: foundCustomer.paymentPlan ? `${foundCustomer.paymentPlan.cardBrand} •••• ${foundCustomer.paymentPlan.cardLast4}` : 'Pending Payment',
      transactionId: `bt_dry_${Date.now()}`,
    };
    foundCustomer.transactions.unshift(dryRunTxn);
  } else {
    foundOrder.specificPlacementInstructions = `Secondary placement: ${params.secondaryPlacementNotes || 'Alternative spot approved by customer'}`;
    foundOrder.history.unshift({
      timestamp: new Date().toLocaleString('en-AU'),
      stage: 'Secondary Placement Sign-off',
      note: `Site obstacle (${params.reasonLabel}) resolved via customer sign-off on secondary placement: ${params.secondaryPlacementNotes}.`,
    });
  }

  accounts[accIndex] = foundCustomer;
  saveCustomerAccounts(accounts);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('portabox-smartsheet-sync'));
    window.dispatchEvent(new CustomEvent('portabox-site-complication-alert', { detail: { orderNumber: params.orderNumber, reason: params.reasonLabel } }));
  }

  return {
    success: true,
    message: isAbort
      ? `Trip aborted. GPS & photo logged. $99 dry-run fee invoiced to customer account.`
      : `Secondary placement signed off and container placement logged.`,
    dryRunInvoiceId,
  };
}

/**
 * 8. Resolve Failed Delivery Dispute (Audit GPS, Photos, Signed Clearance Terms)
 */
export function resolveDeliveryDispute(params: {
  customerId: string;
  orderId: string;
  outcome: 'uphold_fee' | 'courtesy_credit';
  explanation: string;
  creditAmount?: number;
}): { success: boolean; message: string; customer: CustomerAccount } {
  const accounts = loadCustomerAccounts();
  const accIndex = accounts.findIndex((a) => a.id === params.customerId);
  if (accIndex === -1) throw new Error('Customer not found');

  const customer = accounts[accIndex];
  const order = customer.orders.find((o) => o.id === params.orderId);
  if (!order) throw new Error('Order not found');

  if (!order.deliveryDispute) {
    order.deliveryDispute = {
      disputeId: `DISP-${Date.now().toString().slice(-4)}`,
      disputedFee: 99,
      reason: 'Dispute over dry-run fee',
      driverGpsLoggedAt: new Date().toLocaleString('en-AU'),
      status: 'Open',
    };
  }

  if (params.outcome === 'courtesy_credit') {
    const creditAmount = params.creditAmount || order.deliveryDispute.disputedFee || 99;
    const creditTxnId = `CRD-DISP-${Date.now().toString().slice(-4)}`;
    const creditTxn: CustomerTransaction = {
      id: creditTxnId,
      invoiceNumber: `INV-CRD-${Date.now().toString().slice(-6)}`,
      date: new Date().toLocaleDateString('en-AU'),
      description: `One-Time Courtesy Credit: Waiver of Dry-Run Fee (${order.deliveryDispute.reason}). ${params.explanation}`,
      amount: -creditAmount,
      status: 'Paid',
      paymentMethod: 'Account Credit',
      transactionId: `bt_crd_${Date.now()}`,
      isAdjustment: true,
      adjustmentType: 'credit',
    };

    customer.transactions.unshift(creditTxn);

    // If dry run invoice exists, mark it as reconciled/refunded
    const dryRunTxn = customer.transactions.find((t) => t.description.toLowerCase().includes('dry run') && t.status === 'Pending');
    if (dryRunTxn) {
      dryRunTxn.status = 'Refunded';
    }

    order.deliveryDispute.status = 'Courtesy Credit Issued';
    order.deliveryDispute.resolutionNotes = params.explanation;
    order.deliveryDispute.resolvedAt = new Date().toLocaleString('en-AU');
    order.deliveryDispute.creditTxnId = creditTxnId;

    order.history.unshift({
      timestamp: new Date().toLocaleString('en-AU'),
      stage: 'Dispute Resolved: Courtesy Credit',
      note: `Dispute audited against driver GPS & photos. One-time courtesy credit of $${creditAmount} issued. Explanation: ${params.explanation}.`,
    });
  } else {
    order.deliveryDispute.status = 'Upheld';
    order.deliveryDispute.resolutionNotes = params.explanation;
    order.deliveryDispute.resolvedAt = new Date().toLocaleString('en-AU');

    order.history.unshift({
      timestamp: new Date().toLocaleString('en-AU'),
      stage: 'Dispute Resolved: Fee Upheld',
      note: `Dispute reviewed with driver GPS coordinates, time stamps, and photo proof. Signed digital terms require clear 3.5m access. Dry-run fee upheld. Explanation: ${params.explanation}.`,
    });
  }

  accounts[accIndex] = customer;
  saveCustomerAccounts(accounts);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('portabox-smartsheet-sync'));
  }

  return {
    success: true,
    message: params.outcome === 'courtesy_credit'
      ? `Dispute resolved: One-time courtesy credit of $${params.creditAmount || 99} issued to customer.`
      : `Dispute resolved: Dry-run fee upheld based on GPS timestamps & photographic evidence.`,
    customer,
  };
}

/**
 * 9. Digital Rental Agreement Electronic Signature Capture
 */
export function signDigitalRentalAgreement(params: {
  customerId: string;
  orderId: string;
  signedBy: string;
  signatureBase64?: string;
  contractVersion?: string;
}): { success: boolean; message: string; customer: CustomerAccount; docRef: string } {
  const accounts = loadCustomerAccounts();
  const accIndex = accounts.findIndex((a) => a.id === params.customerId);
  if (accIndex === -1) throw new Error('Customer not found');

  const customer = accounts[accIndex];
  const order = customer.orders.find((o) => o.id === params.orderId);
  if (!order) throw new Error('Order not found');

  const docRef = `DOC-AGR-${order.orderNumber}-${Date.now().toString().slice(-4)}.pdf`;
  const contractVersion = params.contractVersion || 'Standard Master Rental Agreement v4.2';

  order.eSignature = {
    signedBy: params.signedBy,
    signedAt: new Date().toLocaleString('en-AU'),
    documentRef: docRef,
    signatureBase64: params.signatureBase64,
    contractVersion,
  };

  order.history.unshift({
    timestamp: new Date().toLocaleString('en-AU'),
    stage: 'Digital Agreement Signed',
    note: `Electronic signature captured for ${params.signedBy}. Document Ref: ${docRef} (${contractVersion}). Terms and clearance obligations accepted.`,
  });

  accounts[accIndex] = customer;
  saveCustomerAccounts(accounts);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('portabox-smartsheet-sync'));
  }

  return {
    success: true,
    message: `Digital rental agreement signed by ${params.signedBy}. Document generated: ${docRef}.`,
    customer,
    docRef,
  };
}

/**
 * 10. Submit CSAT / NPS Customer Feedback with Satisfaction Tags
 */
export function submitCustomerFeedback(params: {
  customerId: string;
  orderNumber: string;
  rating: number; // 1-5
  category: CustomerFeedback['category'];
  tags: string[];
  comment?: string;
  followUpRequested?: boolean;
}): { success: boolean; message: string; customer: CustomerAccount; feedback: CustomerFeedback } {
  const accounts = loadCustomerAccounts();
  const accIndex = accounts.findIndex((a) => a.id === params.customerId);
  if (accIndex === -1) throw new Error('Customer account not found');

  const customer = accounts[accIndex];
  const newFeedback: CustomerFeedback = {
    id: `FDBK-${Date.now().toString().slice(-6)}`,
    orderNumber: params.orderNumber,
    rating: params.rating,
    submittedAt: new Date().toLocaleString('en-AU'),
    category: params.category,
    tags: params.tags,
    comment: params.comment,
    followUpRequested: params.followUpRequested ?? (params.rating <= 3),
    status: 'Received',
  };

  customer.feedback = [newFeedback, ...(customer.feedback || [])];

  // Auto-record milestone in order history
  const order = customer.orders.find((o) => o.orderNumber === params.orderNumber);
  if (order) {
    order.history.unshift({
      timestamp: new Date().toLocaleString('en-AU'),
      stage: 'Customer Feedback Received',
      note: `CSAT Rating: ${params.rating}/5 stars (${params.category}). Tags: ${params.tags.join(', ')}.${params.comment ? ` Note: "${params.comment}"` : ''}`,
    });
  }

  accounts[accIndex] = customer;
  saveCustomerAccounts(accounts);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('portabox-smartsheet-sync'));
  }

  return {
    success: true,
    message: params.rating >= 4
      ? 'Thank you for your 5-star rating! Your feedback helps our delivery crew.'
      : 'Thank you for your honest feedback. Our Customer Care team has been notified and will prioritize your service.',
    customer,
    feedback: newFeedback,
  };
}

/**
 * 11. Calculate Customer Loyalty Progression & Referral Rewards
 */
export function calculateCustomerLoyaltyTier(account: CustomerAccount): CustomerLoyaltyTier {
  // Compute tenure based on memberSince or first order
  const orderCount = account.orders.length;
  const isUpfront = account.paymentPlan?.planType?.includes('upfront') || false;
  const totalMonthsActive = Math.max(1, orderCount * 2 + (isUpfront ? 6 : 1));

  let tier: CustomerLoyaltyTier['tier'] = 'Bronze';
  let perks: string[] = ['10 Free Moving Blankets', 'Guaranteed 30-Day Rate Lock'];
  let nextTierMonthsRemaining = 3;

  if (totalMonthsActive >= 12) {
    tier = 'Platinum';
    perks = [
      '20% Max Duration Discount Locked',
      'Free Annual Container Health Inspection',
      'Priority Same-Day Redelivery Windows',
      'Dedicated VIP Concierge Line',
      'Complimentary Second Set of Heavy Duty Padlocks',
    ];
    nextTierMonthsRemaining = 0;
  } else if (totalMonthsActive >= 6) {
    tier = 'Gold';
    perks = [
      '10% Duration Storage Discount',
      'Free Poly Paver & Surface Ground Pads Included',
      'Priority Weekend Delivery Routing',
      'Free Container Size Swap Guarantee',
    ];
    nextTierMonthsRemaining = 12 - totalMonthsActive;
  } else if (totalMonthsActive >= 3) {
    tier = 'Silver';
    perks = [
      '5% Duration Storage Discount',
      'Free Heavy-Duty Padlock Upgrade ($20 Value)',
      'Direct SMS Driver Dispatch Updates',
    ];
    nextTierMonthsRemaining = 6 - totalMonthsActive;
  } else {
    tier = 'Bronze';
    nextTierMonthsRemaining = 3 - totalMonthsActive;
  }

  const referralCode = `PORTA-${account.firstName.toUpperCase().slice(0, 4)}${account.id.slice(-4)}`;
  const referralEarningsAud = totalMonthsActive > 6 ? 150 : totalMonthsActive > 3 ? 50 : 0;

  return {
    tier,
    monthsActive: totalMonthsActive,
    perks,
    nextTierMonthsRemaining: Math.max(0, nextTierMonthsRemaining),
    referralCode,
    referralEarningsAud,
  };
}

/**
 * 12. Calculate Customer Lifecycle Health Score & Risk Indicators
 */
export function calculateCustomerHealthScore(account: CustomerAccount): {
  score: number; // 0 to 100
  status: 'healthy' | 'attention' | 'at_risk';
  reasons: string[];
} {
  let score = 90;
  const reasons: string[] = [];

  const overdue = account.transactions?.filter((t) => t.status === 'Overdue') || [];
  if (overdue.length > 0) {
    score -= 35;
    reasons.push(`${overdue.length} overdue invoice(s) totalling $${overdue.reduce((s, t) => s + t.amount, 0)}`);
  }

  const dunningStage = account.paymentPlan?.dunningStatus?.stage || 0;
  if (dunningStage >= 2) {
    score -= 25;
    reasons.push(`Dunning collection stage ${dunningStage} active`);
  }

  const recentLowFeedback = account.feedback?.find((f) => f.rating <= 2);
  if (recentLowFeedback) {
    score -= 20;
    reasons.push(`Low CSAT rating of ${recentLowFeedback.rating}/5 stars logged`);
  }

  const activeDispute = account.orders?.some((o) => o.deliveryDispute?.status === 'Open');
  if (activeDispute) {
    score -= 15;
    reasons.push('Open delivery fee dispute pending resolution');
  }

  if (account.paymentPlan?.autopayEnabled) {
    score += 10;
  }

  const clampedScore = Math.max(10, Math.min(100, score));
  let status: 'healthy' | 'attention' | 'at_risk' = 'healthy';
  if (clampedScore < 50) {
    status = 'at_risk';
  } else if (clampedScore < 75) {
    status = 'attention';
  }

  if (reasons.length === 0) {
    reasons.push('Account in excellent standing with automated billing');
  }

  return { score: clampedScore, status, reasons };
}

/**
 * 13. Reschedule Customer Order Delivery / Pickup
 */
export function rescheduleCustomerOrder(params: {
  customerId: string;
  orderNumber: string;
  newDate: string;
  newWindow: string;
  reason?: string;
}): { success: boolean; message: string; customer: CustomerAccount } {
  const accounts = loadCustomerAccounts();
  const accIndex = accounts.findIndex((a) => a.id === params.customerId);
  if (accIndex === -1) throw new Error('Customer not found');

  const customer = accounts[accIndex];
  const order = customer.orders.find((o) => o.orderNumber === params.orderNumber);
  if (!order) throw new Error('Order not found');

  const oldDate = order.scheduledDeliveryDate;
  order.scheduledDeliveryDate = params.newDate;
  order.deliveryWindow = params.newWindow;

  order.history.unshift({
    timestamp: new Date().toLocaleString('en-AU'),
    stage: 'Delivery Rescheduled',
    note: `Customer self-service rescheduled delivery from ${oldDate} to ${params.newDate} (${params.newWindow}).${params.reason ? ` Reason: ${params.reason}` : ''}`,
  });

  accounts[accIndex] = customer;
  saveCustomerAccounts(accounts);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('portabox-smartsheet-sync'));
  }

  return {
    success: true,
    message: `Delivery rescheduled to ${params.newDate} (${params.newWindow}). Dispatch fleet notified.`,
    customer,
  };
}
