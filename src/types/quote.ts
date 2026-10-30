import { PostcodeRecord, DepotLocation } from '../data/australianPostcodes';

export type ServiceType = 
  | 'storage_at_place' 
  | 'storage_facility' 
  | 'moving' 
  | 'moving_storage';

export type ContainerSizeId = 
  | 'small_10m3' 
  | 'medium_19m3' 
  | 'large_25m3' 
  | 'two_large_50m3';

export type BillingCycle = 
  | 'weekly'
  | 'monthly'
  | '3_months_upfront'
  | '6_months_upfront'
  | '12_months_upfront';

export type StorageDurationUnit = 'months' | 'weeks';

export type StorageDuration = 
  | '2_weeks' 
  | '1_to_3_months' 
  | '4_to_11_months' 
  | '12_plus_months'
  | string; // Allows '1_month', '2_months', '3_weeks', etc.

export type MetroHub = 
  | 'Adelaide' 
  | 'Melbourne' 
  | 'Sydney' 
  | 'Brisbane';

export type PromoLocationScope = MetroHub | 'All';
export type PromoServiceScope = 'storage_onsite' | 'storage_portabox_site' | 'interstate_moving' | 'local_moving';
export type PromoContainerSizeScope = 'all' | '10ft' | '20ft';

export interface PromotionRule {
  id: string;
  name: string;
  code?: string;
  description: string;
  type: 
    | 'free_first_month'
    | 'free_third_month'
    | 'free_initial_delivery'
    | 'percent_off_first_month'
    | 'percent_off_interstate'
    | 'free_container_upgrade'
    | 'fixed_discount';
  value: number; // e.g. 50 for 50%, or 100 for $100
  targetPostcode?: string;
  targetRadiusKm?: number;
  targetHubOrigin?: MetroHub;
  targetHubDestination?: MetroHub;

  // Granular targeting filters
  targetLocations?: (MetroHub | 'All')[]; // Portabox locations: Adelaide, Melbourne, Sydney, Brisbane, All
  serviceTypes?: PromoServiceScope[];     // storage_onsite, storage_portabox_site, interstate_moving, local_moving
  containerSize?: PromoContainerSizeScope;// 'all' | '10ft' | '20ft'
  isExclusive?: boolean;                  // Option: exclusive (no other codes/discounts) vs non-exclusive (stackable)

  minDurationMonths?: number;
  active: boolean;                        // activate and deactivate
  autoApply?: boolean;
}

export interface BlockedPostcode {
  postcode: string;
  suburb: string;
  reason: string;
}

export type DeliveryZoneId = 'A' | 'B' | 'C' | 'D' | 'E';

export interface DeliveryZoneSettings {
  zoneAMaxKm: number; // default 25 (<25 km)
  zoneABaseFee: number;
  zoneARatePerKm: number;
  zoneBMaxKm: number; // default 50 (<50 km)
  zoneBBaseFee: number;
  zoneBRatePerKm: number;
  zoneCMaxKm: number; // default 75 (<75 km)
  zoneCBaseFee: number;
  zoneCRatePerKm: number;
  zoneDMaxKm: number; // default 100 (<100 km)
  zoneDBaseFee: number;
  zoneDRatePerKm: number;
  // Zone E is > zoneDMaxKm (default > 100 km)
  zoneEBaseFee: number;
  zoneERatePerKm: number;
  zoneECallPricing: boolean;
}

export interface ContainerPriceConfig {
  monthlyRate: number;
  weeklyRate: number;
}

export interface LocationPricingConfig {
  hub: MetroHub;
  depotId: string;
  depotName: string;
  containerPrices: {
    small_10m3: ContainerPriceConfig;
    medium_19m3: ContainerPriceConfig;
    large_25m3: ContainerPriceConfig;
  };
  onsiteContainerPrices?: {
    small_10m3: ContainerPriceConfig;
    medium_19m3: ContainerPriceConfig;
    large_25m3: ContainerPriceConfig;
  };
  deliveryZones: DeliveryZoneSettings;
}

export interface PackingSuppliesConfig {
  boxSinglePrice: number;
  box10Price: number;
  box50Price: number;
  box100Price: number;
  blanketSinglePrice: number;
  blanket10Price: number;
  blanket50Price: number;
  blanket100Price: number;
  // Blankets promotion & allowance
  freeBlanketsPerContainer?: number; // default: 10 free blankets per container rented
  blanketBlockSize?: number; // default: 10
  blanketBlockPriceMonthly?: number; // default: $25 per month per 10-blanket block after free allowance
  isAllBlanketsFreePromo?: boolean; // admin incentive toggle
  // Lock sales
  lockPrice?: number; // default: $20
  isLockFreePromo?: boolean; // admin incentive toggle (free padlock with container rental)
}

export interface ContainerInsuranceConfig {
  enabled: boolean;
  monthlyPricePerContainer: number; // default: $15/mo per container
  isFreePromo: boolean; // admin incentive toggle: offer free insurance to incentivise sales
  coverageAmountPerContainer: number; // e.g., $10,000 coverage
  description?: string;
}

export interface DeliverySlotWindow {
  id: string; // 'morning' | 'midday' | 'afternoon'
  label: string; // e.g. "Morning Window"
  timeRange: string; // e.g. "8:00 AM – 10:30 AM"
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  available: boolean;
  slotsRemaining: number;
}

export interface DepotCalendarConfig {
  depotId: string;
  depotName: string;
  calendarId: string; // e.g. 'primary' or Google calendar email
  timeZone: string;
  dailyMaxSlots: number;
}

export interface InterstateRoutePricing {
  small_10m3: number;
  medium_19m3: number;
  large_25m3: number;
}

export interface DurationDiscountTier {
  months: number;
  discountPercent: number; // e.g. 10 for 10%
  label?: string; // e.g. '2 Months (10% OFF)'
}

export interface AppConfig {
  containerPrices: {
    small_10m3: ContainerPriceConfig;
    medium_19m3: ContainerPriceConfig;
    large_25m3: ContainerPriceConfig;
  };
  onsiteContainerPrices?: {
    small_10m3: ContainerPriceConfig;
    medium_19m3: ContainerPriceConfig;
    large_25m3: ContainerPriceConfig;
  };
  locationPricing?: Record<MetroHub, LocationPricingConfig>;
  packingSupplies: PackingSuppliesConfig;
  domesticLegFee: number;
  deliveryZones: DeliveryZoneSettings;
  interstateRates: Record<string, number>; // key: `${from}->${to}` (default 25m3 baseline)
  interstateRatesBySize?: Record<string, InterstateRoutePricing>; // key: `${from}->${to}` by container size
  fuelSurchargeRatePerKm: number; // default 0.50
  fuelSurchargeEnabled: boolean;
  fuelSurchargeModel?: FuelSurchargeModel; // 'per_km' | 'per_zone' (default 'per_km')
  fuelSurchargeZoneRates?: FuelSurchargeZoneRates; // Fixed rate per leg by delivery zone (A, B, C, D, E)
  promotions: PromotionRule[];
  durationDiscounts?: DurationDiscountTier[];
  blockedPostcodes: BlockedPostcode[];
  depotCalendars?: Record<string, DepotCalendarConfig>;
  braintreeMerchantId?: string;
  braintreeTokenizationKey?: string;
  braintreeEnvironment?: 'sandbox' | 'production';
  googlePayEnabled?: boolean;
  enableCallCenterDispatch?: boolean;
  enableContainerInventory?: boolean;
  enableSelectWeeks?: boolean;
  enableEcoEfficiencyIncentive?: boolean;
  efficiencyDiscountPercentage?: number;
  ecoIncentiveType?: 'dollar_discount' | 'emissions_only';
  phone: string;
  logoUrl?: string;
  promoBannerSlogan?: string;
  enablePromoBanner?: boolean;
  lockTopBannerOnScroll?: boolean; // When enabled (default: true), keeps top announcement banner & header locked on scrolling
  enableDrivewayFitGuarantee?: boolean; // Feature flag: 100% Driveway Fit Guarantee & assessment process
  enableGoogleCalendarLink?: boolean; // Feature flag: Google Calendar availability & slot integrations in customer flow (default off)
  quoteValidityDays?: number; // Exactly 30 calendar days
  rateLockDurationMonths?: number; // Mandatory 12-month freeze
  annualPriceAdjustmentCapPercent?: number; // Default 10%
  containerAdjustmentCaps?: Record<ContainerSizeId, number>; // Optional per-container caps
  insurance?: ContainerInsuranceConfig;
  businessHours?: import('../services/businessHoursService').BusinessHoursConfig;
  postcodeServiceTiers?: import('../services/postcodeServiceTierEngine').PostcodeServiceTierConfig;
  locationBusinessHours?: Record<string, import('../services/businessHoursService').LocationServiceHoursConfig>;
}

export type FuelSurchargeModel = 'per_km' | 'per_zone';

export interface FuelSurchargeZoneRates {
  A: number; // e.g. 15
  B: number; // e.g. 25
  C: number; // e.g. 35
  D: number; // e.g. 45
  E: number; // e.g. 60
}

export type { BusinessHoursConfig, LocationServiceHoursConfig } from '../services/businessHoursService';
export type { PostcodeServiceTierConfig, ServiceTierLevel } from '../services/postcodeServiceTierEngine';

export type LogisticsMethod = 'home_delivery' | 'depot_loading';

export interface QuoteLegBreakdown {
  label: string;
  description: string;
  fee: number;
  isPayableNow: boolean; // First payment vs payable at collection
  feePerContainer?: number;
  containerCount?: number;
  baseFee?: number;
  extraKmCharge?: number;
  extraKmDistanceKm?: number;
  fuelSurcharge?: number;
  fuelSurchargeDeferred?: boolean; // Fuel levy not charged upfront for planned future deliveries or final pick-ups until they occur
  fuelSurchargeEstimatedAmount?: number; // Estimated amount that will be billed when the leg occurs
  fuelSurchargeCalculationNote?: string; // Human-readable explanation of zone/per-km basis
  fuelSurchargeZone?: string;
  fuelSurchargeDistanceKm?: number;
  isWaived?: boolean;
  waivedSavings?: number;
  waivedReason?: string;
}

export interface ContainerInsuranceOrder {
  selected: boolean;
  containerCount: number;
  monthlyPricePerContainer: number;
  totalMonthlyInsuranceFee: number;
  isFreePromo: boolean;
  promoSavingsMonthly: number;
  coverageAmount: number;
}

export interface PackingSuppliesOrder {
  boxesCount: number;
  boxesPrice: number;
  blanketsCount: number;
  freeBlanketsAllowance?: number;
  chargeableBlanketsCount?: number;
  blanketsPrice: number;
  locksCount?: number;
  lockUnitPrice?: number;
  locksPrice?: number;
  isLockFreePromo?: boolean;
  locksSavings?: number;
  totalSuppliesPrice: number;
}

export interface QuoteBreakdown {
  containerSize: ContainerSizeId;
  containerCount: number;
  containerSelections?: Record<ContainerSizeId, number>;
  totalVolumeM3?: number;
  containerName: string;
  containerVolume: string;
  containerDimensions: {
    length: string;
    width: string;
    height: string;
    floorSpace: string;
    doorClearance: string;
    approxFit: string;
  };
  isUpgradedFrom?: string;
  serviceType: ServiceType;
  storagePlacement?: 'my_place' | 'facility';
  billingCycle: BillingCycle;
  billingCycleLabel?: string;
  billingCycleSavingsText?: string;
  upfrontMonths?: number;
  upfrontDiscountPercent?: number;
  storageDuration: StorageDuration;
  preferredDate: string;
  
  originPostcode: PostcodeRecord;
  destinationPostcode?: PostcodeRecord;
  originDepot: DepotLocation;
  originDistanceKm: number;
  deliveryZone: string | number; // 'A' | 'B' | 'C' | 'D' | 'E'
  deliveryZoneRangeLabel?: string; // e.g. '< 25 km'
  
  movingDistanceKm?: number; // Road driving distance between origin and destination
  movingDeliveryZone?: string | number;
  movingDeliveryZoneRangeLabel?: string;
  movingKmCharge?: number;
  movingKmRatePerContainer?: number;
  
  isInterstate: boolean;
  interstateRouteName?: string;
  interstateFee?: number;
  interstateFeePerContainer?: number;
  
  kmRatePerKm: number;
  kmTotalCharge: number;
  requiresCallForPricing: boolean;
  
  monthlyContainerRate: number;
  weeklyContainerRate: number;
  monthlyRatePerContainer: number;
  weeklyRatePerContainer: number;
  storageRateFormatted: string;
  storagePricingText: string;
  
  domesticLegFeePerContainer: number;
  deliveryPricingText: string;
  
  fuelSurchargeRatePerKm: number;
  fuelSurchargeAmount: number;
  fuelSurchargePerContainer: number;
  isFuelSurchargeIncluded: boolean;
  fuelSurchargeModel?: FuelSurchargeModel;
  fuelSurchargeZoneRates?: FuelSurchargeZoneRates;
  deferredFuelSurchargeAmount?: number;
  totalEstimatedFuelSurcharge?: number;
  distanceCalculationMethod: 'driving_distance';
  
  packingSupplies: PackingSuppliesOrder;
  insurance?: ContainerInsuranceOrder;
  insuranceMonthlyFee?: number;
  insuranceSavingsMonthly?: number;
  
  legs: QuoteLegBreakdown[];
  waivedLegs?: QuoteLegBreakdown[];
  originLogisticsMethod?: LogisticsMethod;
  destinationLogisticsMethod?: LogisticsMethod;
  legsSavedCount?: number;
  legsSavedDollarTotal?: number;
  initialDeliveryFee: number;
  firstPaymentTotal: number;
  monthlyStorageFee: number;
  weeklyStorageFee: number;
  currentPeriodicStorageFee: number;
  collectionFeeEstimate: number;
  
  durationDiscountPercent?: number;
  durationDiscountAmount?: number;
  durationDiscountReason?: string;
  baseMonthlyStorageFee?: number;
  
  appliedPromotions: {
    rule: PromotionRule;
    discountAmount: number;
    description: string;
  }[];
  totalDiscount: number;
  appliedPromoCode?: string;
  promoCodeError?: string;
  promoCodeSuccessMessage?: string;
  isExclusivePromoApplied?: boolean;
  
  summaryText: string;
  smsPreviewText: string;
  selectedSlot?: DeliverySlotWindow;
  calendarEventLink?: string;
  ecoEmissionsInfo?: {
    isBestValue: boolean;
    co2SavedKg: number;
    co2SavedText: string;
    reason: string;
    incentiveMode: 'dollar_discount' | 'emissions_only';
    discountPercent: number;
    discountAud: number;
  };

  // 30-Day Guaranteed Price Lock & Expiration Lifecycle
  quoteCreatedAt?: string;
  quoteExpiresAt?: string;
  quoteValidityDays?: number; // 30
  isQuoteExpired?: boolean;
  daysRemainingInPriceLock?: number;
  isRepricedAfterExpiry?: boolean;
  originalQuotedAt?: string;
  originalQuotedMonthlyRate?: number;
  originalQuotedDeliveryFee?: number;
  rateLockDurationMonths?: number; // 12
}

export interface CustomerLead {
  id: string;
  createdAt: string;
  firstName: string;
  lastName?: string;
  mobile: string;
  email: string;
  agreedToContact: boolean;
  status: 'New' | 'Contacted' | 'Booked' | 'Follow-up' | 'Archived';
  quote: QuoteBreakdown;
  selectedSlot?: DeliverySlotWindow;
  calendarEventLink?: string;
  dropOffPage?: string;
  notes?: string[];
  smsSent: boolean;
  emailSent: boolean;
  paymentStatus?: 'Pending' | 'Paid' | 'Failed';
  paymentTransactionId?: string;
  paymentAmount?: number;
  paymentMethod?: string;
}

export interface QuoteDropOffRecord {
  id: string;
  sessionId: string;
  timestamp: string;
  lastPageStep: number;
  lastPageName: string;
  originSuburb?: string;
  originPostcode?: string;
  destinationSuburb?: string;
  destinationPostcode?: string;
  serviceType?: string;
  containerSize?: string;
  containerCount?: number;
  storageDuration?: string;
  billingCycle?: string;
  customerEmail?: string;
  customerPhone?: string;
  completed: boolean;
}
