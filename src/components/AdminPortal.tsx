import React, { useState, useEffect } from 'react';
import {
  Users,
  User,
  Sparkles,
  DollarSign,
  Tag,
  MapPin,
  ShieldBan,
  Truck,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Download,
  CheckCircle,
  Phone,
  Mail,
  Send,
  MessageSquare,
  Search,
  TrendingDown,
  Filter,
  ArrowRight,
  Clock,
  CreditCard,
  FileSpreadsheet,
  Layers,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Package,
  RefreshCw,
  SlidersHorizontal,
  Check,
  Wrench,
  Shield,
  Compass,
  Radio,
  QrCode,
  ClipboardCheck,
  Calendar,
  Leaf,
  Landmark,
  Copy,
  Zap,
  Moon,
  Lock,
  Unlock,
  Edit3,
  X,
  Bot,
  ShieldCheck,
  Fingerprint,
  KeyRound,
  Smartphone,
  Key,
} from 'lucide-react';
import {
  authenticateWithPasskey,
  generateTwoFactorChallenge,
  verifyTwoFactorCode,
  getAdminAuthSession,
  setAdminAuthSession,
  clearAdminAuthSession,
  AdminAuthSession,
  TwoFactorChallenge,
} from '../services/authSecurityService';
import { AppConfig, BlockedPostcode, ContainerPriceConfig, CustomerLead, DeliveryZoneSettings, LocationPricingConfig, MetroHub, PromotionRule, PromoLocationScope, PromoServiceScope, PromoContainerSizeScope, QuoteDropOffRecord, FuelSurchargeModel, FuelSurchargeZoneRates } from '../types/quote';
import { PORTABOX_DEPOTS } from '../data/australianPostcodes';
import { DEFAULT_DELIVERY_ZONES, DEFAULT_LOCATION_PRICING, DEFAULT_FUEL_SURCHARGE_ZONE_RATES, getLocationPricingForHub, loadDropOffRecords } from '../services/pricingEngine';
import {
  ZeptoEftInstruction,
  loadZeptoEftRecords,
  reconcileZeptoWebhookAcrossApp,
} from '../services/zeptoEftService';
import {
  CompetitorBenchmark,
  getCompetitorBenchmark,
  forceRefreshCompetitorBenchmark,
} from '../services/competitorPricingService';
import {
  CustomerAccount,
  loadCustomerAccounts,
  saveCustomerAccounts,
  applyCustomerAccountPricingOverride,
  clearCustomerAccountPricingOverride,
  recordManualCustomerPaymentOverride,
} from '../services/customerPortalService';
import {
  SmartsheetRow,
  SmartsheetConfig,
  YardReviewStatus,
  YardInspectionChecklist,
  ContainerAsset,
  TruckFleetAsset,
  loadContainerAssets,
  saveContainerAssets,
  loadTruckFleet,
  saveTruckFleet,
  loadSmartsheetConfig,
  saveSmartsheetConfig,
  loadSmartsheetStagingRows,
  saveSmartsheetStagingRows,
  syncAllToSmartsheet,
  updateYardReviewStatus,
  submitYardInspectionChecklist,
  simulateInboundSmartsheetWebhook,
  downloadSmartsheetTemplateCSV,
  updateSmartsheetInvoiceRowTwoWay,
  adminProcessCustomerRefund,
  adminAddMonthlyBillAdjustment,
  adminToggleCeasePayments,
} from '../services/smartsheetService';
import { CallCenterCalendarPortal } from './CallCenterCalendarPortal';
import { SmartsheetWorkspace } from './SmartsheetWorkspace';
import { SmartsheetInventoryView } from './admin/SmartsheetInventoryView';
import { ContainerCRMView } from './admin/ContainerCRMView';
import { getActiveDepots } from '../data/australianPostcodes';
import {
  BusinessHoursConfig,
  AfterHoursMessage,
  DEFAULT_BUSINESS_HOURS_CONFIG,
  checkBusinessHoursStatus,
  loadAfterHoursMessages,
  updateAfterHoursMessageStatus,
} from '../services/businessHoursService';
import { AfterHoursTextModal } from './AfterHoursTextModal';
import { AdminSidebar, AdminTabId } from './admin/AdminSidebar';
import { AdminWorkspaceTabs, WorkspaceTab } from './admin/AdminWorkspaceTabs';
import { AdminSlideOverDrawer, DrawerState } from './admin/AdminSlideOverDrawer';
import { PricingMatrixWorkspace } from './admin/PricingMatrixWorkspace';
import { SmartsheetGridView } from './admin/SmartsheetGridView';
import { AdminPhoneIntakeDrawer } from './admin/AdminPhoneIntakeDrawer';
import { CallCenterTelephonyHub } from './telephony/CallCenterTelephonyHub';
import { BrandingBannerSettings } from './admin/BrandingBannerSettings';
import { QuoteLifecycleAdminWorkspace } from './admin/QuoteLifecycleAdminWorkspace';
import { DurationDiscountsAdminWorkspace } from './admin/DurationDiscountsAdminWorkspace';
import { FrozenPricingDashboard } from './admin/FrozenPricingDashboard';
import { PostcodeTiersAdminWorkspace } from './admin/PostcodeTiersAdminWorkspace';
import { LocationServiceHoursManager } from './admin/LocationServiceHoursManager';
import { AdminCopilotChat } from './admin/AdminCopilotChat';
import { FinancialDataExportModal } from './admin/FinancialDataExportModal';
import { CompetitorPricingWorkspace } from './admin/CompetitorPricingWorkspace';
import { StaffPermissionsWorkspace } from './admin/StaffPermissionsWorkspace';
import { getStaffSession } from '../services/adminAuthService';

interface AdminPortalProps {
  config: AppConfig;
  leads: CustomerLead[];
  onSaveConfig: (newConfig: AppConfig) => void;
  onUpdateLeadStatus: (leadId: string, status: CustomerLead['status']) => void;
  onAddLeadNote: (leadId: string, note: string) => void;
  onClose: () => void;
  onOpenCustomerPortal?: () => void;
  initialTab?: AdminTabId;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  config,
  leads,
  onSaveConfig,
  onUpdateLeadStatus,
  onAddLeadNote,
  onClose,
  onOpenCustomerPortal,
  initialTab,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTabId>(initialTab || 'pricing_matrix');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Admin Enterprise Security Gate (Passkey & 2FA)
  const [adminAuthSession, setAdminAuthSessionState] = useState<AdminAuthSession | null>(getAdminAuthSession());
  const [adminAuthStep, setAdminAuthStep] = useState<'credentials' | '2fa'>('credentials');
  const [adminEmail, setAdminEmail] = useState('admin@portabox.com.au');
  const [adminPassword, setAdminPassword] = useState('••••••••••••');
  const [admin2FaCode, setAdmin2FaCode] = useState('');
  const [admin2FaMethod, setAdmin2FaMethod] = useState<'sms' | 'authenticator'>('sms');
  const [admin2FaChallenge, setAdmin2FaChallenge] = useState<TwoFactorChallenge | null>(null);
  const [adminAuthError, setAdminAuthError] = useState<string | null>(null);
  const [isAdminPasskeyLoading, setIsAdminPasskeyLoading] = useState(false);
  const [rememberAdminDevice, setRememberAdminDevice] = useState(true);

  const handleAdminPasskeySignIn = async () => {
    setAdminAuthError(null);
    setIsAdminPasskeyLoading(true);
    try {
      const res = await authenticateWithPasskey('admin', adminEmail);
      if (res.success) {
        setAdminAuthSession('passkey', rememberAdminDevice);
        setAdminAuthSessionState(getAdminAuthSession());
      } else {
        setAdminAuthError(res.error || 'Hardware Key / Passkey verification failed. Use 2FA credentials below.');
      }
    } catch (err: any) {
      setAdminAuthError(err?.message || 'Biometric passkey prompt bypassed or unsupported. Use 2FA credentials below.');
    } finally {
      setIsAdminPasskeyLoading(false);
    }
  };

  const handleAdminCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminAuthError(null);
    if (!adminEmail.trim()) {
      setAdminAuthError('Enter your operations admin email');
      return;
    }
    const dest = admin2FaMethod === 'sms' ? 'Operations Dispatch Mobile (0488 123 456)' : 'Authenticator App (TOTP)';
    const challenge = generateTwoFactorChallenge(admin2FaMethod, dest);
    setAdmin2FaChallenge(challenge);
    setAdmin2FaCode(challenge.code); // Pre-filled for demo convenience
    setAdminAuthStep('2fa');
  };

  const handleAdminVerify2Fa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyTwoFactorCode(admin2FaCode, admin2FaChallenge)) {
      setAdminAuthError('Invalid 2FA code. Enter 123456 or the code shown.');
      return;
    }
    setAdminAuthSession('password_2fa', rememberAdminDevice);
    setAdminAuthSessionState(getAdminAuthSession());
    setAdminAuthStep('credentials');
    setAdmin2FaCode('');
  };

  const handleAdminQuickBypass = () => {
    setAdminAuthSession('passkey', rememberAdminDevice);
    setAdminAuthSessionState(getAdminAuthSession());
    setAdminAuthError(null);
  };

  const handleLockAdminSession = () => {
    clearAdminAuthSession();
    setAdminAuthSessionState(null);
    setAdminAuthStep('credentials');
  };

  const [currentConfig, setCurrentConfig] = useState<AppConfig>(config);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [adminViewMode, setAdminViewMode] = useState<'crm' | 'smartsheet'>('crm');
  const [isPhoneIntakeOpen, setIsPhoneIntakeOpen] = useState(false);
  const [isFinancialExportOpen, setIsFinancialExportOpen] = useState(false);
  const [workspaceTabs, setWorkspaceTabs] = useState<WorkspaceTab[]>([
    { id: 'tab-pricing', tabKey: 'pricing_matrix', title: 'Tariff Matrix & Simulator', isClosable: false },
    { id: 'tab-customers', tabKey: 'customers', title: 'Customers & Ledger' },
    { id: 'tab-leads', tabKey: 'leads', title: 'Quote Leads' },
    { id: 'tab-smartsheet', tabKey: 'smartsheet', title: 'Yard Dispatch' },
  ]);
  const [activeWorkspaceTabId, setActiveWorkspaceTabId] = useState('tab-pricing');
  const [drawerState, setDrawerState] = useState<DrawerState>({
    isOpen: false,
    type: 'customer',
    data: null,
  });

  // Business Hours & After-Hours Messages Queue State
  const [afterHoursMessages, setAfterHoursMessages] = useState<AfterHoursMessage[]>(loadAfterHoursMessages());
  const [afterHoursFilter, setAfterHoursFilter] = useState<'All' | 'Pending Morning Response' | 'Contacted' | 'Closed'>('All');
  const [isTestPopOutOpen, setIsTestPopOutOpen] = useState(false);
  const [isFloatingCopilotOpen, setIsFloatingCopilotOpen] = useState(false);
  const [afterHoursToast, setAfterHoursToast] = useState<string | null>(null);
  const [editingMsgNoteId, setEditingMsgNoteId] = useState<string | null>(null);
  const [editingMsgNoteText, setEditingMsgNoteText] = useState<string>('');
  const [leadsSearch, setLeadsSearch] = useState('');
  const [leadStatusFilter, setLeadStatusFilter] = useState<string>('All');
  const [dropOffs, setDropOffs] = useState<QuoteDropOffRecord[]>(loadDropOffRecords());
  const [dropOffPageFilter, setDropOffPageFilter] = useState<string>('All');
  const [dropOffSearch, setDropOffSearch] = useState<string>('');
  const [newNoteText, setNewNoteText] = useState<Record<string, string>>({});

  // Customer Management & Financial Ledger state
  const [customers, setCustomers] = useState<CustomerAccount[]>(loadCustomerAccounts());
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState<'All' | 'Active' | 'PendingDelivery' | 'Overdue' | 'Upfront'>('All');
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);
  const [reminderSentCustomer, setReminderSentCustomer] = useState<string | null>(null);

  // Admin Billing Action Controls: Refunds, Monthly Bill Adjustments & Cease Payments
  const [billingActionCustomer, setBillingActionCustomer] = useState<string | null>(null);
  const [billingActionMode, setBillingActionMode] = useState<'refund' | 'adjustment' | 'cease' | null>(null);
  const [refundAmountInput, setRefundAmountInput] = useState<number>(149);
  const [refundReasonInput, setRefundReasonInput] = useState<string>('Customer service refund / delivery fee rebate');
  const [refundTargetTxnId, setRefundTargetTxnId] = useState<string>('');
  const [adjTypeInput, setAdjTypeInput] = useState<'credit' | 'charge'>('credit');
  const [adjAmountInput, setAdjAmountInput] = useState<number>(50);
  const [adjDescInput, setAdjDescInput] = useState<string>('Prorated monthly storage adjustment');
  const [adjUpdateMonthlyRate, setAdjUpdateMonthlyRate] = useState<boolean>(true);
  const [ceaseReasonInput, setCeaseReasonInput] = useState<string>('Container returned to depot / storage contract completed');
  const [billingActionFeedback, setBillingActionFeedback] = useState<{ customerId: string; message: string } | null>(null);

  // Manual Customer Pricing Override State (N Months + Existing Pricing Review Policy Upon Expiry)
  const [pricingOverrideCustomer, setPricingOverrideCustomer] = useState<CustomerAccount | null>(null);
  const [overrideRateInput, setOverrideRateInput] = useState<number>(199);
  const [overrideMonthsInput, setOverrideMonthsInput] = useState<number>(6);
  const [overrideReasonInput, setOverrideReasonInput] = useState<string>('Contract extension agreement');

  // Manual Customer Payment Override State
  const [manualPaymentCustomer, setManualPaymentCustomer] = useState<CustomerAccount | null>(null);
  const [manualPaymentAmount, setManualPaymentAmount] = useState<number>(219);
  const [manualPaymentType, setManualPaymentType] = useState<'periodic_rent' | 'custom_adjustment' | 'courtesy_credit' | 'waiver'>('periodic_rent');
  const [manualPaymentMethod, setManualPaymentMethod] = useState<string>('Direct Bank Transfer / PayID (Verified)');
  const [manualPaymentDesc, setManualPaymentDesc] = useState<string>('Manual monthly storage fee payment');
  const [manualPaymentRef, setManualPaymentRef] = useState<string>('');
  const [manualPaymentAdvanceDate, setManualPaymentAdvanceDate] = useState<boolean>(true);

  // Smartsheet Operational Staging & Yard Dispatch state
  const [smartsheetConfig, setSmartsheetConfig] = useState<SmartsheetConfig>(loadSmartsheetConfig());
  const [smartsheetRows, setSmartsheetRows] = useState<SmartsheetRow[]>(loadSmartsheetStagingRows());
  const [zeptoRecords, setZeptoRecords] = useState<ZeptoEftInstruction[]>(loadZeptoEftRecords());
  const [zeptoToast, setZeptoToast] = useState<string | null>(null);
  const [smartsheetSearch, setSmartsheetSearch] = useState('');
  const [smartsheetYardFilter, setSmartsheetYardFilter] = useState<string>('All');
  const [isSyncingSmartsheet, setIsSyncingSmartsheet] = useState(false);
  const [smartsheetSyncResult, setSmartsheetSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showSmartsheetSettings, setShowSmartsheetSettings] = useState(false);
  const [yardToast, setYardToast] = useState<string | null>(null);

  // Smartsheet Container Logistics Bridge Sub-Views & Tools
  const [smartsheetBridgeTab, setSmartsheetBridgeTab] = useState<'grid' | 'two_way_workspace' | 'staging' | 'checklist' | 'webhook_sim' | 'fleet'>('grid');
  const [inspectionTargetOrder, setInspectionTargetOrder] = useState<SmartsheetRow | null>(null);

  React.useEffect(() => {
    const handleSync = () => {
      setCustomers(loadCustomerAccounts());
      setSmartsheetRows(loadSmartsheetStagingRows());
      setSmartsheetConfig(loadSmartsheetConfig());
      setZeptoRecords(loadZeptoEftRecords());
    };
    window.addEventListener('portabox-smartsheet-sync', handleSync);
    return () => window.removeEventListener('portabox-smartsheet-sync', handleSync);
  }, []);

  React.useEffect(() => {
    const handleMsgSaved = () => {
      setAfterHoursMessages(loadAfterHoursMessages());
    };
    window.addEventListener('portabox-after-hours-message-saved', handleMsgSaved);
    return () => window.removeEventListener('portabox-after-hours-message-saved', handleMsgSaved);
  }, []);
  const [containerAssets, setContainerAssets] = useState<ContainerAsset[]>(loadContainerAssets());
  const [truckFleet, setTruckFleet] = useState<TruckFleetAsset[]>(loadTruckFleet());
  const [checklistState, setChecklistState] = useState<YardInspectionChecklist>({
    weatherproofSeal: true,
    sanitizationWash: true,
    floorDrings: true,
    lockboxShroud: true,
    horizontalLiftSafetyLocks: true,
    horizontalLiftLevelPlacement: true,
    inspectedBy: 'Dave Higgins (Yard Supervisor)',
    inspectedAt: new Date().toLocaleDateString('en-AU') + ' 08:30 AM',
    passed: true,
    notes: 'Certified clean, weather-sealed, and prepped for horizontal level-lift loading (zero tilting guarantee).',
  });
  const [simWebhookOrder, setSimWebhookOrder] = useState<string>('PBO-9841');
  const [simWebhookAction, setSimWebhookAction] = useState<YardReviewStatus>('Delivered to Site');
  const [simWebhookLocation, setSimWebhookLocation] = useState<string>('42 Osmond Tce, Norwood SA (-34.921, 138.634)');

  // New promo form state
  const [newPromo, setNewPromo] = useState<Partial<PromotionRule>>({
    name: '',
    code: '',
    description: '',
    type: 'percent_off_first_month',
    value: 20,
    targetLocations: ['All'],
    serviceTypes: ['storage_onsite', 'storage_portabox_site', 'local_moving', 'interstate_moving'],
    containerSize: 'all',
    isExclusive: false,
    active: true,
    autoApply: false,
  });
  const [isAddingPromo, setIsAddingPromo] = useState(false);
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null);
  const [promoFilterStatus, setPromoFilterStatus] = useState<'all' | 'active' | 'inactive' | 'exclusive'>('all');
  const [promoSearchQuery, setPromoSearchQuery] = useState('');
  const [isGeminiPromoOpen, setIsGeminiPromoOpen] = useState(false);
  const [geminiPromoPrompt, setGeminiPromoPrompt] = useState('');
  const [isGeneratingGeminiPromo, setIsGeneratingGeminiPromo] = useState(false);
  const [geminiPromoMessage, setGeminiPromoMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleGenerateGeminiDiscount = async (customPrompt?: string) => {
    const promptToUse = customPrompt || geminiPromoPrompt;
    if (!promptToUse || !promptToUse.trim()) return;

    setIsGeneratingGeminiPromo(true);
    setGeminiPromoMessage(null);

    try {
      const res = await fetch('/api/gemini/generate-discount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptToUse }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.promotion) {
        throw new Error(data.error || 'Failed to generate discount');
      }

      const p = data.promotion;
      setNewPromo({
        name: p.name || 'AI Generated Promo',
        code: p.code ? p.code.toUpperCase() : 'PROMO' + Math.floor(Math.random() * 900 + 100),
        description: p.description || '',
        type: p.type || 'percent_off_first_month',
        value: Number(p.value) ?? 20,
        targetLocations: p.targetLocations && p.targetLocations.length > 0 ? p.targetLocations : ['All'],
        serviceTypes: p.serviceTypes && p.serviceTypes.length > 0 ? p.serviceTypes : ['storage_onsite', 'storage_portabox_site', 'local_moving', 'interstate_moving'],
        containerSize: p.containerSize || 'all',
        isExclusive: Boolean(p.isExclusive),
        active: p.active ?? true,
        autoApply: false,
        minDurationMonths: p.minDurationMonths || 0,
      });

      setEditingPromoId(null);
      setIsAddingPromo(true);
      setGeminiPromoMessage({
        type: 'success',
        text: `✓ Discount code "${p.code}" created via ${data.source === 'gemini-3.8-flash' ? 'Gemini 3.8 Flash' : 'Campaign Engine'}! Review targeting and click Save.`,
      });
    } catch (err: any) {
      setGeminiPromoMessage({
        type: 'error',
        text: err.message || 'Error communicating with Gemini intelligence engine.',
      });
    } finally {
      setIsGeneratingGeminiPromo(false);
    }
  };

  // New blocked postcode form state
  const [newBlocked, setNewBlocked] = useState<BlockedPostcode>({
    postcode: '',
    suburb: '',
    reason: '',
  });

  // Selected Hub for Location-Specific Container Storage Fees & Delivery Zone Fees in Admin
  const [selectedPricingHub, setSelectedPricingHub] = useState<MetroHub>('Adelaide');

  const ALL_ADMIN_HUBS: MetroHub[] = [
    'Adelaide',
    'Sydney',
    'Melbourne',
    'Brisbane',
  ];

  const activeLocationPricing: LocationPricingConfig = getLocationPricingForHub(
    currentConfig,
    selectedPricingHub
  );

  const handleUpdateLocationContainerPrice = (
    hub: MetroHub,
    sizeKey: 'small_10m3' | 'medium_19m3' | 'large_25m3',
    field: 'monthlyRate' | 'weeklyRate',
    value: number
  ) => {
    const existingLoc = getLocationPricingForHub(currentConfig, hub);
    const updatedLoc: LocationPricingConfig = {
      ...existingLoc,
      containerPrices: {
        ...existingLoc.containerPrices,
        [sizeKey]: {
          ...existingLoc.containerPrices[sizeKey],
          [field]: value,
        },
      },
    };
    const nextLocationPricing = {
      ...(currentConfig.locationPricing || DEFAULT_LOCATION_PRICING),
      [hub]: updatedLoc,
    };
    setCurrentConfig({
      ...currentConfig,
      locationPricing: nextLocationPricing,
      // Also keep top-level baseline synced if Adelaide or fallback
      containerPrices: hub === 'Adelaide' ? updatedLoc.containerPrices : currentConfig.containerPrices,
    });
  };

  const handleApplyContainerPricesToAllLocations = (sourceHub: MetroHub) => {
    const sourceLoc = getLocationPricingForHub(currentConfig, sourceHub);
    const nextLocationPricing = { ...(currentConfig.locationPricing || DEFAULT_LOCATION_PRICING) };
    ALL_ADMIN_HUBS.forEach((h) => {
      const loc = getLocationPricingForHub(currentConfig, h);
      nextLocationPricing[h] = {
        ...loc,
        containerPrices: {
          small_10m3: { ...sourceLoc.containerPrices.small_10m3 },
          medium_19m3: { ...sourceLoc.containerPrices.medium_19m3 },
          large_25m3: { ...sourceLoc.containerPrices.large_25m3 },
        },
      };
    });
    setCurrentConfig({
      ...currentConfig,
      containerPrices: { ...sourceLoc.containerPrices },
      locationPricing: nextLocationPricing,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleUpdateLocationDeliveryZones = (
    hub: MetroHub,
    updates: Partial<DeliveryZoneSettings>
  ) => {
    const existingLoc = getLocationPricingForHub(currentConfig, hub);
    const updatedZones: DeliveryZoneSettings = {
      ...existingLoc.deliveryZones,
      ...updates,
    };
    const updatedLoc: LocationPricingConfig = {
      ...existingLoc,
      deliveryZones: updatedZones,
    };
    const nextLocationPricing = {
      ...(currentConfig.locationPricing || DEFAULT_LOCATION_PRICING),
      [hub]: updatedLoc,
    };
    setCurrentConfig({
      ...currentConfig,
      locationPricing: nextLocationPricing,
      deliveryZones: hub === 'Adelaide' ? updatedZones : currentConfig.deliveryZones,
      domesticLegFee:
        hub === 'Adelaide' && updates.zoneABaseFee !== undefined
          ? updates.zoneABaseFee
          : currentConfig.domesticLegFee,
    });
  };

  const handleApplyDeliveryZonesToAllLocations = (sourceHub: MetroHub) => {
    const sourceLoc = getLocationPricingForHub(currentConfig, sourceHub);
    const nextLocationPricing = { ...(currentConfig.locationPricing || DEFAULT_LOCATION_PRICING) };
    ALL_ADMIN_HUBS.forEach((h) => {
      const loc = getLocationPricingForHub(currentConfig, h);
      nextLocationPricing[h] = {
        ...loc,
        deliveryZones: { ...sourceLoc.deliveryZones },
      };
    });
    setCurrentConfig({
      ...currentConfig,
      deliveryZones: { ...sourceLoc.deliveryZones },
      domesticLegFee: sourceLoc.deliveryZones.zoneABaseFee,
      locationPricing: nextLocationPricing,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleSave = () => {
    onSaveConfig(currentConfig);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const [competitorBenchmark, setCompetitorBenchmark] = useState<CompetitorBenchmark>(getCompetitorBenchmark());

  useEffect(() => {
    const handleRatesUpdate = () => {
      setCompetitorBenchmark(getCompetitorBenchmark());
    };
    window.addEventListener('portabox:competitor-rates-updated', handleRatesUpdate);
    return () => window.removeEventListener('portabox:competitor-rates-updated', handleRatesUpdate);
  }, []);

  const handleUpdateEfficiencyDiscount = (pct: number) => {
    const clamped = Math.max(0, Math.min(100, pct));
    const updated: AppConfig = {
      ...currentConfig,
      efficiencyDiscountPercentage: clamped,
    };
    setCurrentConfig(updated);
    onSaveConfig(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleUpdateEcoIncentiveType = (type: 'dollar_discount' | 'emissions_only') => {
    const updated: AppConfig = {
      ...currentConfig,
      ecoIncentiveType: type,
    };
    setCurrentConfig(updated);
    onSaveConfig(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleForceRefreshCompetitor = () => {
    const refreshed = forceRefreshCompetitorBenchmark();
    setCompetitorBenchmark(refreshed);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleToggleCallCenterDispatch = (enabled: boolean) => {
    const updated: AppConfig = {
      ...currentConfig,
      enableCallCenterDispatch: enabled,
    };
    setCurrentConfig(updated);
    onSaveConfig(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleResetDefaults = () => {
    if (confirm('Reset all prices, delivery zones and promotions to default settings?')) {
      localStorage.removeItem('portabox_app_config_v2');
      window.location.reload();
    }
  };

  // Export leads to CSV
  const handleExportCSV = () => {
    if (leads.length === 0) {
      alert('No customer leads to export yet.');
      return;
    }
    const headers = ['ID', 'Date', 'First Name', 'Mobile', 'Email', 'Postcode', 'Suburb', 'Container', 'Service Type', 'First Payment', 'Status'];
    const rows = leads.map((l) => [
      l.id,
      new Date(l.createdAt).toLocaleDateString(),
      `"${l.firstName}"`,
      `"${l.mobile}"`,
      `"${l.email}"`,
      l.quote.originPostcode.postcode,
      `"${l.quote.originPostcode.suburb}"`,
      `"${l.quote.containerName}"`,
      `"${l.quote.serviceType}"`,
      l.quote.firstPaymentTotal,
      l.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `portabox_leads_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered leads
  const effectiveLeadsSearch = (leadsSearch || globalSearchQuery).trim().toLowerCase();
  const filteredLeads = leads.filter((l) => {
    const matchSearch =
      !effectiveLeadsSearch ||
      l.firstName.toLowerCase().includes(effectiveLeadsSearch) ||
      l.mobile.toLowerCase().includes(effectiveLeadsSearch) ||
      l.email.toLowerCase().includes(effectiveLeadsSearch) ||
      l.quote.originPostcode.suburb.toLowerCase().includes(effectiveLeadsSearch) ||
      l.quote.originPostcode.postcode.includes(effectiveLeadsSearch) ||
      l.quote.containerName.toLowerCase().includes(effectiveLeadsSearch);
    const matchStatus = leadStatusFilter === 'All' || l.status === leadStatusFilter;
    return matchSearch && matchStatus;
  });

  // Customer filtering & actions
  const effectiveCustomerSearch = (customerSearch || globalSearchQuery).trim().toLowerCase();
  const filteredCustomers = customers.filter((c) => {
    const matchSearch =
      !effectiveCustomerSearch ||
      c.firstName.toLowerCase().includes(effectiveCustomerSearch) ||
      c.lastName.toLowerCase().includes(effectiveCustomerSearch) ||
      c.email.toLowerCase().includes(effectiveCustomerSearch) ||
      c.mobile.includes(effectiveCustomerSearch) ||
      c.suburb.toLowerCase().includes(effectiveCustomerSearch) ||
      c.orders.some((o) => o.containerId.toLowerCase().includes(effectiveCustomerSearch));

    if (!matchSearch) return false;
    if (customerFilter === 'Active') return c.orders.length > 0;
    if (customerFilter === 'PendingDelivery') return c.orders.some((o) => o.status === 'Scheduled' || o.status === 'Out for Delivery');
    if (customerFilter === 'Overdue') return c.transactions.some((t) => t.status === 'Overdue');
    if (customerFilter === 'Upfront') return c.paymentPlan.planType.includes('upfront');
    return true;
  });

  const handleMarkCustomerInvoicePaid = (customerId: string, txnId: string) => {
    let targetInvoiceNum = '';
    const updated = customers.map((c) => {
      if (c.id === customerId) {
        return {
          ...c,
          transactions: c.transactions.map((t) => {
            if (t.id === txnId) {
              targetInvoiceNum = t.invoiceNumber;
              return { ...t, status: 'Paid' as const, paymentMethod: 'Marked Paid by Portabox Admin' };
            }
            return t;
          }),
        };
      }
      return c;
    });
    setCustomers(updated);
    saveCustomerAccounts(updated);
    if (targetInvoiceNum) {
      updateSmartsheetInvoiceRowTwoWay(targetInvoiceNum, {
        status: 'Paid',
        paymentMethod: 'Marked Paid by Portabox Admin (Smartsheet Synced)',
      });
    }
  };

  const handleSendOverdueReminder = (customer: CustomerAccount, invoiceNum: string) => {
    setReminderSentCustomer(customer.id);
    setTimeout(() => setReminderSentCustomer(null), 3000);
  };

  const handleExecuteAdminRefund = (customerId: string) => {
    if (!refundAmountInput || refundAmountInput <= 0) return;
    const updated = adminProcessCustomerRefund({
      customerId,
      transactionId: refundTargetTxnId || undefined,
      refundAmountAud: refundAmountInput,
      reason: refundReasonInput || 'Portabox Admin Refund',
    });
    setCustomers(updated);
    setBillingActionMode(null);
    setBillingActionFeedback({
      customerId,
      message: `✓ Processed $${refundAmountInput} refund via Braintree & synced to Smartsheet and Customer Portal.`,
    });
    setTimeout(() => setBillingActionFeedback(null), 5000);
  };

  const handleExecuteMonthlyBillAdjustment = (customerId: string) => {
    if (!adjAmountInput || adjAmountInput <= 0) return;
    const updated = adminAddMonthlyBillAdjustment({
      customerId,
      adjustmentType: adjTypeInput,
      amountAud: adjAmountInput,
      description: adjDescInput || 'Monthly bill adjustment',
      updateRecurringMonthlyRate: adjUpdateMonthlyRate,
    });
    setCustomers(updated);
    setBillingActionMode(null);
    setBillingActionFeedback({
      customerId,
      message: `✓ Added ${adjTypeInput === 'credit' ? `-$${adjAmountInput} credit` : `+$${adjAmountInput} charge`} adjustment to monthly bill & synced to Smartsheet.`,
    });
    setTimeout(() => setBillingActionFeedback(null), 5000);
  };

  const handleExecuteToggleCeasePayments = (customerId: string, cease: boolean) => {
    const updated = adminToggleCeasePayments({
      customerId,
      cease,
      reason: ceaseReasonInput || 'Payments ceased by Portabox Admin',
    });
    setCustomers(updated);
    setBillingActionMode(null);
    setBillingActionFeedback({
      customerId,
      message: cease
        ? `✓ Recurring monthly payments CEASED for account ${customerId}. Autopay disabled & synced.`
        : `✓ Recurring monthly billing RESUMED for account ${customerId}.`,
    });
    setTimeout(() => setBillingActionFeedback(null), 5000);
  };

  const handleOpenPricingOverrideModal = (c: CustomerAccount) => {
    setPricingOverrideCustomer(c);
    setOverrideRateInput(c.pricingOverride?.overrideMonthlyRate || c.paymentPlan?.periodicAmount || 219);
    setOverrideMonthsInput(c.pricingOverride?.durationMonths || 6);
    setOverrideReasonInput(c.pricingOverride?.reason || 'Contract extension agreement');
  };

  const handleSavePricingOverride = () => {
    if (!pricingOverrideCustomer) return;
    const res = applyCustomerAccountPricingOverride({
      customerId: pricingOverrideCustomer.id,
      overrideMonthlyRate: Number(overrideRateInput),
      durationMonths: Number(overrideMonthsInput),
      reason: overrideReasonInput,
      appliedBy: 'Portabox Admin',
    });
    setCustomers(loadCustomerAccounts());
    setBillingActionFeedback({
      customerId: pricingOverrideCustomer.id,
      message: res.message,
    });
    setTimeout(() => setBillingActionFeedback(null), 5000);
    setPricingOverrideCustomer(null);
  };

  const handleClearPricingOverride = (c: CustomerAccount) => {
    const res = clearCustomerAccountPricingOverride(c.id);
    setCustomers(loadCustomerAccounts());
    setBillingActionFeedback({
      customerId: c.id,
      message: res.message,
    });
    setTimeout(() => setBillingActionFeedback(null), 5000);
    setPricingOverrideCustomer(null);
  };

  const handleOpenManualPaymentModal = (c: CustomerAccount) => {
    setManualPaymentCustomer(c);
    setManualPaymentAmount(c.paymentPlan?.periodicAmount || 219);
    setManualPaymentType('periodic_rent');
    setManualPaymentMethod('Direct Bank Transfer / PayID (Verified)');
    setManualPaymentDesc(`Manual payment recorded for ${c.firstName} ${c.lastName} - monthly storage`);
    setManualPaymentRef(`MAN-${Date.now().toString().slice(-6)}`);
    setManualPaymentAdvanceDate(true);
  };

  const handleSaveManualPaymentOverride = () => {
    if (!manualPaymentCustomer) return;
    const res = recordManualCustomerPaymentOverride({
      customerId: manualPaymentCustomer.id,
      amount: Number(manualPaymentAmount),
      paymentType: manualPaymentType,
      paymentMethod: manualPaymentMethod,
      description: manualPaymentDesc,
      reference: manualPaymentRef,
      appliedBy: 'Portabox Admin',
      advanceBillingDate: manualPaymentAdvanceDate,
    });
    setCustomers(loadCustomerAccounts());
    setBillingActionFeedback({
      customerId: manualPaymentCustomer.id,
      message: res.message,
    });
    setTimeout(() => setBillingActionFeedback(null), 5000);
    setManualPaymentCustomer(null);
  };

  const handleToggleFeatureFlag = (
    flagKey: 'enableContainerInventory' | 'enableSelectWeeks' | 'enableEcoEfficiencyIncentive' | 'enableSunshineCoastLocation',
    enabled: boolean
  ) => {
    const updated: AppConfig = {
      ...currentConfig,
      [flagKey]: enabled,
    };
    setCurrentConfig(updated);
    onSaveConfig(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
    if (flagKey === 'enableContainerInventory' && !enabled && activeTab === 'inventory') {
      setActiveTab('customers');
    }
  };

  // Smartsheet Logistics Dispatch CSV Export
  const handleExportDispatchCSV = () => {
    const headers = [
      'OrderID',
      'CustomerID',
      'CustomerName',
      'Phone',
      'Email',
      'ContainerID',
      'ContainerSize',
      'ServiceType',
      'Location',
      'ScheduledDeliveryDate',
      'DeliveryWindow',
      'Driver',
      'TimeToDeliveryHours',
      'PaymentPlan',
      'TotalPaid',
      'OverdueStatus',
    ];
    const rows: string[][] = [];

    customers.forEach((c) => {
      c.orders.forEach((o) => {
        const hasOverdue = c.transactions.some((t) => t.status === 'Overdue');
        const paidSum = c.transactions.filter((t) => t.status === 'Paid').reduce((sum, t) => sum + t.amount, 0);
        rows.push([
          `"${o.orderNumber}"`,
          `"${c.id}"`,
          `"${c.firstName} ${c.lastName}"`,
          `"${c.mobile}"`,
          `"${c.email}"`,
          `"${o.containerId}"`,
          `"${o.containerSize}"`,
          `"${o.serviceType}"`,
          `"${o.location}"`,
          `"${o.scheduledDeliveryDate}"`,
          `"${o.deliveryWindow}"`,
          `"${o.driverName || 'Dispatch Scheduled'}"`,
          `${o.timeToDeliveryHours}`,
          `"${c.paymentPlan.planLabel}"`,
          `"${paidSum}"`,
          `"${hasOverdue ? 'OVERDUE' : 'Current'}"`,
        ]);
      });
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `portabox_dispatch_schedule_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Smartsheet action handlers
  const handleSyncSmartsheet = async () => {
    setIsSyncingSmartsheet(true);
    setSmartsheetSyncResult(null);
    try {
      const result = await syncAllToSmartsheet();
      setSmartsheetRows(loadSmartsheetStagingRows());
      setSmartsheetConfig(loadSmartsheetConfig());
      setSmartsheetSyncResult({ success: true, message: result.message });
      setTimeout(() => setSmartsheetSyncResult(null), 5000);
    } catch {
      setSmartsheetSyncResult({ success: false, message: 'Smartsheet sync failed. Please check connection.' });
    } finally {
      setIsSyncingSmartsheet(false);
    }
  };

  const handleUpdateYardStatus = (orderNumber: string, newStatus: YardReviewStatus) => {
    const updated = updateYardReviewStatus(orderNumber, newStatus);
    setSmartsheetRows(updated);
    setSmartsheetConfig(loadSmartsheetConfig());
    setYardToast(`Order #${orderNumber} yard review status updated to "${newStatus}" in Smartsheet`);
    setTimeout(() => setYardToast(null), 3500);
  };

  const handleOpenInspection = (row: SmartsheetRow) => {
    setInspectionTargetOrder(row);
    if (row.inspectionChecklist) {
      setChecklistState({ ...row.inspectionChecklist });
    } else {
      setChecklistState({
        weatherproofSeal: true,
        sanitizationWash: true,
        floorDrings: true,
        lockboxShroud: true,
        horizontalLiftSafetyLocks: true,
        horizontalLiftLevelPlacement: true,
        inspectedBy: 'Dave Higgins (Yard Supervisor)',
        inspectedAt: new Date().toLocaleDateString('en-AU') + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        passed: true,
        notes: '',
      });
    }
    setSmartsheetBridgeTab('checklist');
  };

  const handleSaveInspection = () => {
    if (!inspectionTargetOrder) return;
    const passed = Boolean(
      checklistState.weatherproofSeal &&
      checklistState.sanitizationWash &&
      checklistState.floorDrings &&
      checklistState.lockboxShroud &&
      checklistState.horizontalLiftSafetyLocks &&
      checklistState.horizontalLiftLevelPlacement
    );

    const updatedChecklist: YardInspectionChecklist = {
      ...checklistState,
      passed,
    };
    const updated = submitYardInspectionChecklist(inspectionTargetOrder.orderNumber, updatedChecklist);
    setSmartsheetRows(updated);
    setSmartsheetConfig(loadSmartsheetConfig());
    setInspectionTargetOrder(null);
    setSmartsheetBridgeTab('staging');
    setYardToast(
      passed
        ? `✓ Order #${inspectionTargetOrder.orderNumber} inspection CERTIFIED! Status updated to "Loaded on Level-Lift Truck" in Smartsheet.`
        : `⚠ Order #${inspectionTargetOrder.orderNumber} inspection FAILED one or more checks. Yard hold active.`
    );
    setTimeout(() => setYardToast(null), 4000);
  };

  const handleTriggerInboundWebhook = () => {
    const res = simulateInboundSmartsheetWebhook(simWebhookOrder, simWebhookAction, simWebhookLocation);
    setSmartsheetRows(res.rows);
    setSmartsheetConfig(loadSmartsheetConfig());
    setYardToast(`✓ Inbound Smartsheet Webhook Received: Order #${simWebhookOrder} set to "${simWebhookAction}" by driver mobile.`);
    setTimeout(() => setYardToast(null), 4000);
  };

  const handleDownloadSmartsheetCSV = () => {
    downloadSmartsheetTemplateCSV(smartsheetRows);
  };

  const handleSaveSmartsheetSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveSmartsheetConfig(smartsheetConfig);
    setShowSmartsheetSettings(false);
    setSmartsheetSyncResult({
      success: true,
      message: 'Smartsheet API token, sheet ID, and webhook settings updated.',
    });
    setTimeout(() => setSmartsheetSyncResult(null), 4000);
  };

  const filteredSmartsheetRows = smartsheetRows.filter((r) => {
    const matchSearch =
      r.orderNumber.toLowerCase().includes(smartsheetSearch.toLowerCase()) ||
      r.customerName.toLowerCase().includes(smartsheetSearch.toLowerCase()) ||
      r.customerPhone.includes(smartsheetSearch) ||
      r.containerId.toLowerCase().includes(smartsheetSearch.toLowerCase()) ||
      r.deliveryAddress.toLowerCase().includes(smartsheetSearch.toLowerCase());

    if (!matchSearch) return false;
    if (smartsheetYardFilter !== 'All' && r.yardReviewStatus !== smartsheetYardFilter) return false;
    return true;
  });

  // Business hours settings handlers
  const handleUpdateBusinessHours = (partial: Partial<BusinessHoursConfig>) => {
    const base = currentConfig.businessHours || DEFAULT_BUSINESS_HOURS_CONFIG;
    const updatedHours: BusinessHoursConfig = {
      ...base,
      ...partial,
    };
    const updatedConfig: AppConfig = {
      ...currentConfig,
      businessHours: updatedHours,
    };
    setCurrentConfig(updatedConfig);
    onSaveConfig(updatedConfig);
    setAfterHoursToast('Business operating hours settings saved.');
    setTimeout(() => setAfterHoursToast(null), 3000);
  };

  const handleUpdateMsgStatus = (id: string, status: AfterHoursMessage['status'], notes?: string) => {
    updateAfterHoursMessageStatus(id, status, notes);
    setAfterHoursMessages(loadAfterHoursMessages());
    setAfterHoursToast(`Message marked as ${status}.`);
    setTimeout(() => setAfterHoursToast(null), 3000);
  };

  const handleSelectNavTab = (tabId: AdminTabId, label?: string) => {
    setActiveTab(tabId);
    const existing = workspaceTabs.find((t) => t.tabKey === tabId);
    if (existing) {
      setActiveWorkspaceTabId(existing.id);
    } else {
      const tabTitle =
        label ||
        (tabId === 'pricing_matrix'
          ? 'Tariff Matrix & Simulator'
          : tabId === 'customers'
          ? 'Customers & Billing'
          : tabId === 'leads'
          ? 'Quote Leads'
          : tabId === 'inventory'
          ? 'Container Inventory & QR'
          : tabId === 'smartsheet'
          ? 'Yard Dispatch'
          : tabId === 'call_center_routing'
          ? 'Fleet Calendar'
          : tabId === 'dropoffs'
          ? 'Drop-Off Funnel'
          : tabId === 'zones'
          ? 'Delivery Zones'
          : tabId === 'interstate'
          ? 'Interstate Legs'
          : tabId === 'promotions'
          ? 'Promotions'
          : tabId === 'blocked'
          ? 'Blocked Postcodes'
          : tabId === 'postcode_tiers'
          ? 'Postcode Coverage Areas'
          : tabId === 'depots'
          ? 'Depot Locations'
          : tabId === 'features'
          ? 'Features & Flags'
          : tabId === 'business_hours'
          ? 'Business Hours & SMS'
          : tabId === 'branding'
          ? 'Top Banner & Slogan'
          : tabId === 'quote_lifecycle'
          ? 'Quote Lifecycle & Annual Cap'
          : tabId === 'freeze_management'
          ? 'Frozen Pricing & Revenue Impact'
          : tabId === 'staff_permissions'
          ? 'Staff Roles & 2FA Governance'
          : 'Tab');
      const newTab: WorkspaceTab = {
        id: `tab-${tabId}-${Date.now()}`,
        tabKey: tabId,
        title: tabTitle,
        isClosable: true,
      };
      setWorkspaceTabs((prev) => [...prev, newTab]);
      setActiveWorkspaceTabId(newTab.id);
    }

    if (tabId === 'customers') setCustomers(loadCustomerAccounts());
    if (tabId === 'inventory') setContainerAssets(loadContainerAssets());
    if (tabId === 'smartsheet') setSmartsheetRows(loadSmartsheetStagingRows());
    if (tabId === 'dropoffs') setDropOffs(loadDropOffRecords());
    if (tabId === 'business_hours') setAfterHoursMessages(loadAfterHoursMessages());
  };

  return (
    <div className="bg-slate-900 w-full flex-1 flex flex-col min-h-screen overflow-hidden">
      {/* Top Zendesk / HubSpot-Style Workspace Header & Tabs */}
      <AdminWorkspaceTabs
        tabs={workspaceTabs}
        activeTabId={activeWorkspaceTabId}
        onSelectTab={(tabId) => {
          setActiveWorkspaceTabId(tabId);
          const tab = workspaceTabs.find((t) => t.id === tabId);
          if (tab) {
            setActiveTab(tab.tabKey);
            if (tab.tabKey === 'customers') setCustomers(loadCustomerAccounts());
            if (tab.tabKey === 'inventory') setContainerAssets(loadContainerAssets());
            if (tab.tabKey === 'smartsheet') setSmartsheetRows(loadSmartsheetStagingRows());
            if (tab.tabKey === 'dropoffs') setDropOffs(loadDropOffRecords());
            if (tab.tabKey === 'business_hours') setAfterHoursMessages(loadAfterHoursMessages());
          }
        }}
        onCloseTab={(tabId) => {
          if (workspaceTabs.length <= 1) return;
          const idx = workspaceTabs.findIndex((t) => t.id === tabId);
          const newTabs = workspaceTabs.filter((t) => t.id !== tabId);
          setWorkspaceTabs(newTabs);
          if (activeWorkspaceTabId === tabId) {
            const nextTab = newTabs[Math.max(0, idx - 1)];
            setActiveWorkspaceTabId(nextTab.id);
            setActiveTab(nextTab.tabKey);
          }
        }}
        onOpenNewQuoteTab={() => {
          handleSelectNavTab('pricing_matrix', 'Tariff Matrix & Simulator');
        }}
        onSave={handleSave}
        onCloseAdmin={onClose}
        saveSuccess={saveSuccess}
        searchQuery={globalSearchQuery}
        onSearchChange={setGlobalSearchQuery}
        viewMode={adminViewMode}
        onToggleViewMode={setAdminViewMode}
        onOpenPhoneIntake={() => setIsPhoneIntakeOpen(true)}
        onOpenFinancialExport={() => setIsFinancialExportOpen(true)}
      />

      {/* Main Workspace Frame: Persistent CRM Sidebar + Active Content */}
      <div className="flex-1 flex overflow-hidden bg-slate-100 min-h-[820px]">
        {/* Persistent Collapsible Left Sidebar */}
        <AdminSidebar
          activeTab={activeTab}
          onSelectTab={handleSelectNavTab}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          config={currentConfig}
          onOpenPhoneIntake={() => setIsPhoneIntakeOpen(true)}
          counts={{
            customers: customers.length,
            leads: leads.length,
            dropoffs: dropOffs.length,
            inventory: containerAssets.length,
            smartsheet: smartsheetRows.length,
            pendingAfterHours: afterHoursMessages.filter((m) => m.status === 'Pending Morning Response').length,
            promotions: currentConfig.promotions.length,
            blocked: currentConfig.blockedPostcodes.length,
          }}
        />

        {/* Center / Right Content Workspace Area */}
        <div className="flex-1 overflow-y-auto bg-slate-50/80 p-4 sm:p-6 lg:p-8">
          {adminViewMode === 'smartsheet' ? (
            <div className="space-y-4">
              <div className="bg-[#0b2942] text-white p-4 sm:p-5 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-700 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-600 flex items-center justify-center shrink-0 shadow-xs">
                    <FileSpreadsheet className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-emerald-950 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-950 animate-pulse" />
                        Smartsheet Transition Mode
                      </span>
                      <span className="text-xs text-slate-200 font-bold">
                        User: <strong className="text-white">ahammo@gmail.com</strong>
                      </span>
                      <span className="text-xs text-slate-300 font-semibold">
                        Sheet: <strong className="text-emerald-400">portabox smart sheet Ai agent</strong>
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Classic spreadsheet layout for daily administrative ease. Double-click or click any cell to edit inline. CSV import & export active.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsPhoneIntakeOpen(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all shadow-xs cursor-pointer hover:scale-[1.02]"
                  >
                    <Phone className="w-3.5 h-3.5 animate-pulse" />
                    <span>Live Phone Intake</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdminViewMode('crm')}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#00c0f3]" />
                    <span>Lead Management View</span>
                  </button>
                </div>
              </div>

              <SmartsheetGridView
                rows={smartsheetRows}
                onRefreshRows={(updated) => setSmartsheetRows(updated)}
                onOpenPhoneIntake={() => setIsPhoneIntakeOpen(true)}
                sheetName="portabox smart sheet Ai agent"
                userEmail="ahammo@gmail.com"
              />
            </div>
          ) : (
            <>
          {/* ================= TAB -1: ADMIN AI COPILOT & OPERATIONS ASSISTANT ================= */}
          {activeTab === 'admin_copilot' && (
            <div className="h-[calc(100vh-140px)] min-h-[600px] p-1">
              <AdminCopilotChat
                config={currentConfig}
                leads={leads}
                onSaveConfig={(newCfg) => {
                  setCurrentConfig(newCfg);
                  onSaveConfig(newCfg);
                }}
                onUpdateLeadStatus={onUpdateLeadStatus}
                onAddLeadNote={onAddLeadNote}
              />
            </div>
          )}

          {/* ================= TAB: STAFF ROLES & 2FA GOVERNANCE (CEO & OPS MANAGER) ================= */}
          {activeTab === 'staff_permissions' && (
            <StaffPermissionsWorkspace
              currentSession={getStaffSession()}
            />
          )}

          {/* ================= TAB 0: PRICING MATRIX & LIVE SIMULATOR (PRIMARY WORKSPACE) ================= */}
          {activeTab === 'pricing_matrix' && (
            <PricingMatrixWorkspace
              config={currentConfig}
              onUpdateConfig={(newCfg) => setCurrentConfig(newCfg)}
              onSave={handleSave}
              onCreateLeadFromQuote={() => {
                handleSelectNavTab('leads', 'Quote Leads');
              }}
            />
          )}
        {/* ================= TAB 0A: CUSTOMERS & ACCOUNTS ================= */}
        {activeTab === 'customers' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-extrabold text-[#0b2942]">Customer Accounts & Field Assets</h3>
                <p className="text-xs text-slate-500">
                  Track active containers, delivery ETA countdowns, payment plans, overdue balances, and discounts given.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setIsFinancialExportOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0b2942] hover:bg-[#15385E] text-[#00c0f3] text-xs font-black rounded-xl transition-all cursor-pointer shadow-xs border border-slate-700 hover:scale-[1.02]"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Export Financial Data (CSV)</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportDispatchCSV}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Dispatch Sheet</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Accounts</span>
                <div className="text-2xl font-black text-[#0b2942]">{customers.length}</div>
                <span className="text-[10px] text-emerald-600 font-bold">100% Verified</span>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Containers</span>
                <div className="text-2xl font-black text-[#00c0f3]">
                  {customers.reduce((sum, c) => sum + c.orders.length, 0)} Units
                </div>
                <span className="text-[10px] text-slate-500">In customer care</span>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Overdue Payments</span>
                <div className="text-2xl font-black text-red-600 font-mono">
                  ${customers.reduce((sum, c) => sum + c.transactions.filter(t => t.status === 'Overdue').reduce((s, t) => s + t.amount, 0), 0)}
                </div>
                <span className="text-[10px] text-red-600 font-bold">
                  {customers.reduce((sum, c) => sum + c.transactions.filter(t => t.status === 'Overdue').length, 0)} overdue balance
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Upfront Prepayments</span>
                <div className="text-2xl font-black text-emerald-600 font-mono">
                  {customers.filter(c => c.paymentPlan.planType.includes('upfront')).length}
                </div>
                <span className="text-[10px] text-emerald-600 font-bold">12-Mo & 6-Mo lock</span>
              </div>
            </div>
            {/* Financial Data CSV Extraction & Duration Query Card */}
            <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-sky-50 via-white to-indigo-50/60 border-2 border-sky-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#0b2942] text-[#00c0f3] flex items-center justify-center shrink-0 shadow-xs">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-[#0b2942] text-[#00c0f3] px-2 py-0.5 rounded">
                      FINANCIAL CSV EXTRACTION
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">
                      Invoicing, Payments, Taxes, Customer Ledger
                    </span>
                  </div>
                  <h4 className="text-sm font-extrabold text-[#0b2942] mt-0.5">
                    Extract All Financial Data (Custom Duration Query)
                  </h4>
                  <p className="text-xs text-slate-500">
                    Query range preset: <strong>Jan 1 2026 to Mar 31 2026 (Q1 2026)</strong> or configure custom start/end duration for immediate CSV audit download.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap shrink-0">
                <button
                  type="button"
                  onClick={() => setIsFinancialExportOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#00c0f3] hover:bg-[#00a7d4] text-[#0b2942] text-xs font-black shadow-xs transition-all cursor-pointer hover:scale-105 active:scale-95"
                >
                  <Download className="w-4 h-4 text-[#0b2942]" />
                  <span>Configure Duration &amp; Export CSV</span>
                </button>
              </div>
            </div>

            {/* Zepto NPP / PayID Auto-Generated Reference & Virtual Account Monitor (Option 1) */}
            <div className="p-5 rounded-3xl bg-linear-to-r from-emerald-50/90 via-white to-sky-50/60 border-2 border-emerald-200 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-200/70 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Landmark className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-700 text-white px-2 py-0.5 rounded">
                        ZEPTO NPP / PAYID WEBHOOK MONITOR
                      </span>
                      <span className="text-[10px] font-bold text-emerald-800">
                        Auto-Generated Reference Codes &amp; Virtual BSB/Account Numbers
                      </span>
                    </div>
                    <h4 className="text-sm sm:text-base font-black text-[#0b2942] mt-0.5">
                      Electronic Funds Transfer (EFT) Live Reconciliation Queue
                    </h4>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-xl bg-amber-100 text-amber-800 font-bold">
                    {zeptoRecords.filter((r) => r.status !== 'Cleared (NPP Instant)').length} Pending EFT
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 font-bold">
                    {zeptoRecords.filter((r) => r.status === 'Cleared (NPP Instant)').length} Cleared via NPP
                  </span>
                </div>
              </div>

              {zeptoToast && (
                <div className="p-3 rounded-xl bg-emerald-600 text-white text-xs font-extrabold flex items-center justify-between">
                  <span>{zeptoToast}</span>
                  <button
                    type="button"
                    onClick={() => setZeptoToast(null)}
                    className="text-white font-black cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}

              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="py-2.5 px-3">Auto-Gen Ref Code</th>
                      <th className="py-2.5 px-3">Customer &amp; Order</th>
                      <th className="py-2.5 px-3">Dynamic PayID / Virtual Acct</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                      <th className="py-2.5 px-3 text-right">NPP Status</th>
                      <th className="py-2.5 px-3 text-right">Webhook / Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {zeptoRecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-3">
                          <span className="font-mono font-black text-[#0b2942] bg-[#FEBD69]/30 border border-[#FF9900] px-2 py-0.5 rounded-md text-xs">
                            {rec.referenceCode}
                          </span>
                          {rec.bankReceiptRef && rec.bankReceiptRef !== rec.referenceCode && (
                            <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                              Bank Ref: {rec.bankReceiptRef}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-[#0b2942]">{rec.customerName}</div>
                          <div className="text-[10px] text-slate-500">
                            {rec.orderNumber ? `Order #${rec.orderNumber}` : ''} {rec.invoiceNumber ? `· ${rec.invoiceNumber}` : ''} · {rec.orderDescription}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-700">
                          <div>{rec.payIdEmail}</div>
                          <div className="text-[10px] text-slate-400">
                            BSB {rec.virtualBsb} · Acct {rec.virtualAccountNumber}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-[#0b2942]">
                          ${rec.amountAud}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              rec.status === 'Cleared (NPP Instant)'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : rec.status === 'Remittance Submitted'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {rec.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {rec.status !== 'Cleared (NPP Instant)' ? (
                            <button
                              type="button"
                              onClick={() => {
                                reconcileZeptoWebhookAcrossApp(rec);
                                setZeptoRecords(loadZeptoEftRecords());
                                setCustomers(loadCustomerAccounts());
                                setSmartsheetRows(loadSmartsheetStagingRows());
                                setZeptoToast(
                                  `✓ Zepto NPP Webhook reconciled $${rec.amountAud} for Ref ${rec.referenceCode}. Customer invoice marked Paid & Smartsheet dispatch unlocked.`
                                );
                                setTimeout(() => setZeptoToast(null), 5000);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                            >
                              <Zap className="w-3 h-3 text-amber-300" />
                              <span>Simulate Zepto NPP Clear</span>
                            </button>
                          ) : (
                            <span className="text-[10px] font-mono text-emerald-700 font-bold">
                              ✓ {rec.nppTransactionId || 'Settled'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Search & Filter Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Search customers by name, email, phone, or container ID..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#00c0f3]"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold">
                {(['All', 'Active', 'PendingDelivery', 'Overdue', 'Upfront'] as const).map((filterKey) => (
                  <button
                    key={filterKey}
                    type="button"
                    onClick={() => setCustomerFilter(filterKey)}
                    className={`px-3 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                      customerFilter === filterKey
                        ? 'bg-[#0b2942] text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {filterKey === 'PendingDelivery' ? 'Pending Delivery' : filterKey}
                  </button>
                ))}
              </div>
            </div>

            {/* Customers Master List */}
            <div className="space-y-4">
              {filteredCustomers.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200 text-slate-400 text-xs">
                  No customer accounts match your current filter.
                </div>
              ) : (
                filteredCustomers.map((c) => {
                  const isExpanded = expandedCustomerId === c.id;
                  const overdueList = c.transactions.filter((t) => t.status === 'Overdue');
                  const pendingList = c.transactions.filter((t) => t.status === 'Pending');
                  const paidTotal = c.transactions.filter((t) => t.status === 'Paid').reduce((sum, t) => sum + t.amount, 0);
                  const discountsTotal = c.discountsGiven.reduce((sum, d) => sum + d.amount, 0);

                  return (
                    <div
                      key={c.id}
                      className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden transition-all"
                    >
                      {/* Customer Summary Card Header */}
                      <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex items-start sm:items-center gap-3.5">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0b2942] to-[#00c0f3] text-white flex items-center justify-center font-black text-xl shrink-0 shadow-2xs">
                            {c.firstName[0]}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-extrabold text-base text-[#0b2942]">
                                {c.firstName} {c.lastName}
                              </h4>
                              {c.companyName && (
                                <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                  {c.companyName}
                                </span>
                              )}
                              <span className="font-mono text-xs font-bold text-slate-400">
                                {c.id}
                              </span>
                              {overdueList.length > 0 && (
                                <span className="text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  Overdue Balance
                                </span>
                              )}
                              {c.paymentPlan.paymentsCeased && (
                                <span className="text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-full">
                                  Payments Ceased
                                </span>
                              )}
                              {c.pricingOverride?.isActive && (
                                <span className="text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <Sparkles className="w-3 h-3 text-purple-600" />
                                  Override: ${c.pricingOverride.overrideMonthlyRate}/mo ({c.pricingOverride.durationMonths} Mo)
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                              <span><Mail className="w-3 h-3 inline mr-1 text-slate-400" />{c.email}</span>
                              <span><Phone className="w-3 h-3 inline mr-1 text-slate-400" />{c.mobile}</span>
                              <span><MapPin className="w-3 h-3 inline mr-1 text-slate-400" />{c.suburb}, {c.state}</span>
                              <span>Plan: <strong className="text-slate-700">{c.paymentPlan.planLabel}</strong></span>
                            </div>
                          </div>
                        </div>

                        {/* Top Financial & Delivery Summary */}
                        <div className="flex items-center gap-4 shrink-0 flex-wrap justify-between lg:justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                          <div className="text-left lg:text-right">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Settled</span>
                            <span className="font-mono font-extrabold text-sm text-[#0b2942]">${paidTotal}</span>
                          </div>

                          <div className="text-left lg:text-right">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Discounts Given</span>
                            <span className="font-mono font-extrabold text-sm text-emerald-600">-${discountsTotal}</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => setDrawerState({ isOpen: true, type: 'customer', data: c })}
                            className="px-3 py-2 bg-sky-50 hover:bg-sky-100 text-sky-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-sky-200"
                            title="Open 360° Customer Profile Drawer (HubSpot Style)"
                          >
                            <User className="w-3.5 h-3.5 text-sky-600" />
                            <span>360° Drawer</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setExpandedCustomerId(isExpanded ? null : c.id)}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <span>{isExpanded ? 'Hide Details' : 'View Account & Orders'}</span>
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Expanded Account Details */}
                      {isExpanded && (
                        <div className="px-5 sm:px-6 pb-6 pt-2 border-t border-slate-100 bg-slate-50/50 space-y-6 animate-in fade-in duration-150">
                          {/* 1. Active Orders, Delivery Times & Driver ETA */}
                          <div className="space-y-3">
                            <h5 className="text-xs font-black uppercase tracking-wider text-[#0b2942] flex items-center gap-1.5">
                              <Truck className="w-4 h-4 text-[#00c0f3]" />
                              <span>Containers & Live Delivery Schedule ({c.orders.length})</span>
                            </h5>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {c.orders.map((o) => (
                                <div key={o.id} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
                                  <div className="flex items-center justify-between">
                                    <span className="font-mono font-bold text-xs bg-[#0b2942] text-white px-2 py-0.5 rounded">
                                      {o.containerId}
                                    </span>
                                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                      {o.status}
                                    </span>
                                  </div>

                                  <div className="text-xs font-bold text-slate-800">
                                    {o.containerName} ({o.serviceType})
                                  </div>

                                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                                    <div>
                                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Delivery Date:</span>
                                      <span className="font-semibold text-slate-800">{o.scheduledDeliveryDate}</span>
                                      <div className="text-[11px] text-slate-500">{o.deliveryWindow}</div>
                                    </div>

                                    <div>
                                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Time to Delivery:</span>
                                      <span className="font-mono font-bold text-emerald-600">
                                        {o.timeToDeliveryHours > 24
                                          ? `${Math.floor(o.timeToDeliveryHours / 24)} days, ${o.timeToDeliveryHours % 24} hrs`
                                          : `${o.timeToDeliveryHours} hrs remaining`}
                                      </span>
                                      <div className="text-[10px] text-slate-400">Driver: {o.driverName || 'Scheduled'}</div>
                                    </div>
                                  </div>

                                  <div className="p-2.5 bg-slate-50 rounded-xl text-[11px] text-slate-600">
                                    <strong>Placement Location:</strong> {o.location}
                                    {o.accessNotes && <div className="mt-0.5 italic text-slate-500">Note: "{o.accessNotes}"</div>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* 2. Invoices & Payments Ledger + Admin Refunds, Monthly Bill Adjustments & Cease Payments */}
                          <div className="space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <h5 className="text-xs font-black uppercase tracking-wider text-[#0b2942] flex items-center gap-1.5">
                                <CreditCard className="w-4 h-4 text-[#00c0f3]" />
                                <span>Invoices, Refunds, Monthly Bill Adjustments & Payment Controls ({c.transactions.length})</span>
                              </h5>

                              {/* Admin Billing Action Buttons */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => handleOpenPricingOverrideModal(c)}
                                  className="px-3 py-1.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                                  title="Set customer pricing for further N months (existing pricing review policy applies upon expiry)"
                                >
                                  <Sparkles className="w-3.5 h-3.5 text-purple-700" />
                                  <span>{c.pricingOverride?.isActive ? `Pricing Override (${c.pricingOverride.durationMonths} Mo)` : 'Manual Pricing Override (N Mo)'}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleOpenManualPaymentModal(c)}
                                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                                  title="Provide manual override for customer payments (EFT, PayID, Cash, Waiver)"
                                >
                                  <CreditCard className="w-3.5 h-3.5 text-amber-300" />
                                  <span>Manual Payment Override</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setBillingActionCustomer(c.id);
                                    setBillingActionMode(
                                      billingActionCustomer === c.id && billingActionMode === 'refund' ? null : 'refund'
                                    );
                                    const firstPaid = c.transactions.find((t) => t.status === 'Paid' && t.amount > 0);
                                    if (firstPaid) {
                                      setRefundTargetTxnId(firstPaid.id);
                                      setRefundAmountInput(firstPaid.amount);
                                    }
                                  }}
                                  className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-colors"
                                >
                                  <RotateCcw className="w-3.5 h-3.5 text-purple-600" />
                                  <span>Issue Refund</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setBillingActionCustomer(c.id);
                                    setBillingActionMode(
                                      billingActionCustomer === c.id && billingActionMode === 'adjustment' ? null : 'adjustment'
                                    );
                                  }}
                                  className="px-3 py-1.5 rounded-xl bg-[#FF9900] hover:bg-[#e68a00] text-[#0b2942] border border-[#FEBD69] text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                                >
                                  <DollarSign className="w-3.5 h-3.5 text-[#0b2942]" />
                                  <span>Add Monthly Bill Adjustment</span>
                                </button>

                                {c.paymentPlan.paymentsCeased ? (
                                  <button
                                    type="button"
                                    onClick={() => handleExecuteToggleCeasePayments(c.id, false)}
                                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-colors"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Resume Payments</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setBillingActionCustomer(c.id);
                                      setBillingActionMode(
                                        billingActionCustomer === c.id && billingActionMode === 'cease' ? null : 'cease'
                                      );
                                    }}
                                    className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-colors"
                                  >
                                    <ShieldBan className="w-3.5 h-3.5 text-rose-600" />
                                    <span>Cease Payments</span>
                                  </button>
                                )}
                              </div>
                            </div>

                            {billingActionFeedback && billingActionFeedback.customerId === c.id && (
                              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-between">
                                <span>{billingActionFeedback.message}</span>
                                <button
                                  type="button"
                                  onClick={() => setBillingActionFeedback(null)}
                                  className="text-emerald-700 font-black cursor-pointer"
                                >
                                  ✕
                                </button>
                              </div>
                            )}

                            {/* Inline Admin Billing Control Drawer (Refund / Monthly Bill Adjustment / Cease Payments) */}
                            {billingActionCustomer === c.id && billingActionMode === 'refund' && (
                              <div className="p-4 rounded-2xl bg-purple-50/80 border border-purple-200 space-y-3 text-xs animate-in fade-in">
                                <div className="flex items-center justify-between">
                                  <h6 className="font-black text-purple-950 flex items-center gap-1.5">
                                    <RotateCcw className="w-4 h-4 text-purple-700" />
                                    <span>Process Customer Refund (Braintree & Smartsheet Synced)</span>
                                  </h6>
                                  <button
                                    type="button"
                                    onClick={() => setBillingActionMode(null)}
                                    className="text-slate-500 hover:text-slate-800 font-bold cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  <div>
                                    <label className="font-bold text-slate-700 block mb-1">Select Invoice to Refund</label>
                                    <select
                                      value={refundTargetTxnId}
                                      onChange={(e) => {
                                        setRefundTargetTxnId(e.target.value);
                                        const found = c.transactions.find((t) => t.id === e.target.value);
                                        if (found && found.amount > 0) setRefundAmountInput(found.amount);
                                      }}
                                      className="w-full px-3 py-2 rounded-xl border border-purple-200 bg-white font-semibold"
                                    >
                                      <option value="">General Account Refund</option>
                                      {c.transactions
                                        .filter((t) => t.amount > 0)
                                        .map((t) => (
                                          <option key={t.id} value={t.id}>
                                            {t.invoiceNumber} (${t.amount} - {t.status})
                                          </option>
                                        ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="font-bold text-slate-700 block mb-1">Refund Amount (AUD $)</label>
                                    <input
                                      type="number"
                                      min={1}
                                      value={refundAmountInput}
                                      onChange={(e) => setRefundAmountInput(Number(e.target.value))}
                                      className="w-full px-3 py-2 rounded-xl border border-purple-200 bg-white font-mono font-bold"
                                    />
                                  </div>
                                  <div>
                                    <label className="font-bold text-slate-700 block mb-1">Refund Reason / Note</label>
                                    <input
                                      type="text"
                                      value={refundReasonInput}
                                      onChange={(e) => setRefundReasonInput(e.target.value)}
                                      className="w-full px-3 py-2 rounded-xl border border-purple-200 bg-white font-medium"
                                    />
                                  </div>
                                </div>
                                <div className="flex justify-end">
                                  <button
                                    type="button"
                                    onClick={() => handleExecuteAdminRefund(c.id)}
                                    className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-extrabold cursor-pointer shadow-2xs"
                                  >
                                    Confirm & Issue ${refundAmountInput} Refund
                                  </button>
                                </div>
                              </div>
                            )}

                            {billingActionCustomer === c.id && billingActionMode === 'adjustment' && (
                              <div className="p-4 rounded-2xl bg-[#FEBD69]/20 border border-[#FEBD69] space-y-3 text-xs animate-in fade-in">
                                <div className="flex items-center justify-between">
                                  <h6 className="font-black text-[#0b2942] flex items-center gap-1.5">
                                    <DollarSign className="w-4 h-4 text-[#FF9900]" />
                                    <span>Add Adjustment to Monthly Bill (Current Monthly Rate: ${c.paymentPlan.periodicAmount}/mo)</span>
                                  </h6>
                                  <button
                                    type="button"
                                    onClick={() => setBillingActionMode(null)}
                                    className="text-slate-500 hover:text-slate-800 font-bold cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  <div>
                                    <label className="font-bold text-slate-700 block mb-1">Adjustment Type</label>
                                    <select
                                      value={adjTypeInput}
                                      onChange={(e) => setAdjTypeInput(e.target.value as 'credit' | 'charge')}
                                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-[#0b2942]"
                                    >
                                      <option value="credit">Credit / Discount Deduction (-$)</option>
                                      <option value="charge">Additional Monthly Charge (+$)</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="font-bold text-slate-700 block mb-1">Adjustment Amount (AUD $)</label>
                                    <input
                                      type="number"
                                      min={1}
                                      value={adjAmountInput}
                                      onChange={(e) => setAdjAmountInput(Number(e.target.value))}
                                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono font-bold"
                                    />
                                  </div>
                                  <div>
                                    <label className="font-bold text-slate-700 block mb-1">Adjustment Description</label>
                                    <input
                                      type="text"
                                      value={adjDescInput}
                                      onChange={(e) => setAdjDescInput(e.target.value)}
                                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium"
                                    />
                                  </div>
                                </div>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                                  <label className="flex items-center gap-2 font-bold text-[#0b2942] cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={adjUpdateMonthlyRate}
                                      onChange={(e) => setAdjUpdateMonthlyRate(e.target.checked)}
                                      className="w-4 h-4 rounded accent-[#FF9900]"
                                    />
                                    <span>
                                      Also update ongoing recurring monthly bill rate (New rate:{' '}
                                      <strong>
                                        $
                                        {Math.max(
                                          0,
                                          c.paymentPlan.periodicAmount +
                                            (adjTypeInput === 'credit' ? -adjAmountInput : adjAmountInput)
                                        )}
                                        /mo
                                      </strong>
                                      )
                                    </span>
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => handleExecuteMonthlyBillAdjustment(c.id)}
                                    className="px-4 py-2 rounded-xl bg-[#FF9900] hover:bg-[#e68a00] text-[#0b2942] border border-[#FEBD69] font-extrabold cursor-pointer shadow-2xs"
                                  >
                                    Apply Monthly Bill Adjustment
                                  </button>
                                </div>
                              </div>
                            )}

                            {billingActionCustomer === c.id && billingActionMode === 'cease' && (
                              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-3 text-xs animate-in fade-in">
                                <div className="flex items-center justify-between">
                                  <h6 className="font-black text-rose-950 flex items-center gap-1.5">
                                    <ShieldBan className="w-4 h-4 text-rose-600" />
                                    <span>Cease Recurring Payments for {c.firstName} {c.lastName}</span>
                                  </h6>
                                  <button
                                    type="button"
                                    onClick={() => setBillingActionMode(null)}
                                    className="text-slate-500 hover:text-slate-800 font-bold cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                                <p className="text-rose-800">
                                  This will immediately stop automatic recurring Braintree billing (${c.paymentPlan.periodicAmount}/period) and mark the customer's payment plan as <strong>CEASED</strong> in both Smartsheet and the Customer Portal.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-2">
                                  <input
                                    type="text"
                                    value={ceaseReasonInput}
                                    onChange={(e) => setCeaseReasonInput(e.target.value)}
                                    placeholder="Reason for ceasing payments (e.g. Container returned to depot)"
                                    className="flex-1 px-3 py-2 rounded-xl border border-rose-200 bg-white font-medium"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleExecuteToggleCeasePayments(c.id, true)}
                                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold cursor-pointer whitespace-nowrap"
                                  >
                                    Confirm Cease Payments
                                  </button>
                                </div>
                              </div>
                            )}

                            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold">
                                  <tr>
                                    <th className="p-3">Invoice</th>
                                    <th className="p-3">Date</th>
                                    <th className="p-3">Description</th>
                                    <th className="p-3">Method</th>
                                    <th className="p-3 text-right">Amount</th>
                                    <th className="p-3 text-right">Status</th>
                                    <th className="p-3 text-right">Action</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {c.transactions.map((t) => (
                                    <tr key={t.id} className="hover:bg-slate-50/70">
                                      <td className="p-3 font-mono font-bold text-[#0b2942]">{t.invoiceNumber}</td>
                                      <td className="p-3 text-slate-500">{t.date}</td>
                                      <td className="p-3 text-slate-700 font-medium">{t.description}</td>
                                      <td className="p-3 text-slate-500 font-mono text-[11px]">{t.paymentMethod || 'Braintree'}</td>
                                      <td className="p-3 text-right font-mono font-bold text-[#0b2942]">
                                        {t.amount < 0 ? `-$${Math.abs(t.amount)}` : `$${t.amount}`}
                                      </td>
                                      <td className="p-3 text-right">
                                        <span
                                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                            t.status === 'Paid'
                                              ? 'bg-emerald-100 text-emerald-800'
                                              : t.status === 'Refunded'
                                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                              : t.status === 'Overdue'
                                              ? 'bg-red-100 text-red-800'
                                              : 'bg-amber-100 text-amber-800'
                                          }`}
                                        >
                                          {t.status}
                                        </span>
                                      </td>
                                      <td className="p-3 text-right">
                                        {t.status === 'Overdue' ? (
                                          <div className="flex items-center gap-1.5 justify-end">
                                            <button
                                              type="button"
                                              onClick={() => handleMarkCustomerInvoicePaid(c.id, t.id)}
                                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                                            >
                                              Mark Paid
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleSendOverdueReminder(c, t.invoiceNumber)}
                                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold cursor-pointer"
                                            >
                                              Remind
                                            </button>
                                          </div>
                                        ) : t.status === 'Paid' && t.amount > 0 ? (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setBillingActionCustomer(c.id);
                                              setBillingActionMode('refund');
                                              setRefundTargetTxnId(t.id);
                                              setRefundAmountInput(t.amount);
                                            }}
                                            className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-[10px] font-bold cursor-pointer"
                                          >
                                            Refund
                                          </button>
                                        ) : (
                                          <span className="text-[11px] text-slate-400">
                                            {t.status === 'Refunded' ? 'Refunded' : 'Settled'}
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* 3. Discounts Awarded */}
                          {c.discountsGiven.length > 0 && (
                            <div className="space-y-2">
                              <h5 className="text-xs font-black uppercase tracking-wider text-[#0b2942] flex items-center gap-1.5">
                                <Tag className="w-4 h-4 text-[#00c0f3]" />
                                <span>Discounts Awarded to this Account</span>
                              </h5>
                              <div className="flex flex-wrap gap-2 text-xs">
                                {c.discountsGiven.map((d) => (
                                  <div key={d.id} className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-2">
                                    <span className="font-mono font-bold bg-emerald-600 text-white px-1.5 py-0.5 rounded text-[10px]">
                                      {d.code || d.type.toUpperCase()}
                                    </span>
                                    <span>{d.description}</span>
                                    <span className="font-mono font-black text-emerald-700">-${d.amount}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* ================= MANUAL PRICING OVERRIDE MODAL (N MONTHS + REVIEW POLICY EXIRY) ================= */}
            {pricingOverrideCustomer && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border-2 border-purple-200 overflow-hidden animate-scale-in">
                  <div className="bg-[#15385E] text-white p-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-purple-500/20 text-[#FF9900] rounded-2xl border border-purple-400/30">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-black text-base text-white">Manual Customer Pricing Override</h3>
                        <p className="text-xs text-purple-200">
                          {pricingOverrideCustomer.firstName} {pricingOverrideCustomer.lastName} · {pricingOverrideCustomer.id}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPricingOverrideCustomer(null)}
                      className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="p-6 space-y-4 text-xs font-['Plus_Jakarta_Sans',sans-serif]">
                    {/* Current Rates Context */}
                    <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-purple-50/60 border border-purple-100">
                      <div>
                        <span className="text-[10px] text-purple-700 uppercase font-black block">Current Plan Rate</span>
                        <span className="font-mono font-black text-slate-800 text-sm">
                          ${pricingOverrideCustomer.paymentPlan?.periodicAmount || 219}/month
                        </span>
                        <span className="text-[10px] text-slate-500 block">{pricingOverrideCustomer.paymentPlan?.planLabel}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-purple-700 uppercase font-black block">Active Status</span>
                        <span className="font-bold text-emerald-700 text-sm block">
                          {pricingOverrideCustomer.pricingOverride?.isActive ? 'Active Custom Override' : 'Standard Rate Freeze'}
                        </span>
                        {pricingOverrideCustomer.pricingOverride?.isActive && (
                          <span className="text-[10px] text-purple-600 font-bold block">
                            ${pricingOverrideCustomer.pricingOverride.overrideMonthlyRate}/mo ({pricingOverrideCustomer.pricingOverride.durationMonths} Mo)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Override Monthly Rate Input */}
                    <div>
                      <label className="font-black text-slate-700 block mb-1 text-xs">
                        Manual Override Monthly Storage Rate (AUD $)
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3.5 top-2.5 font-black text-slate-400">$</span>
                          <input
                            type="number"
                            min={1}
                            value={overrideRateInput}
                            onChange={(e) => setOverrideRateInput(Number(e.target.value))}
                            className="w-full pl-8 pr-3 py-2.5 rounded-xl border-2 border-purple-200 focus:border-purple-600 focus:outline-none font-mono font-black text-slate-800 text-sm"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          {[149, 179, 199, 219, 249].map((amt) => (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => setOverrideRateInput(amt)}
                              className={`px-2 py-1.5 rounded-lg border text-[11px] font-bold cursor-pointer transition-all ${
                                overrideRateInput === amt
                                  ? 'bg-purple-600 text-white border-purple-600'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                              }`}
                            >
                              ${amt}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Override Duration (N Months) */}
                    <div>
                      <label className="font-black text-slate-700 block mb-1 text-xs">
                        Override Duration for Further N Months
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={60}
                          value={overrideMonthsInput}
                          onChange={(e) => setOverrideMonthsInput(Number(e.target.value))}
                          className="w-24 px-3 py-2.5 rounded-xl border-2 border-purple-200 focus:border-purple-600 focus:outline-none font-mono font-black text-slate-800 text-sm"
                        />
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {[1, 2, 3, 6, 9, 12, 24].map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setOverrideMonthsInput(m)}
                              className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                                overrideMonthsInput === m
                                  ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                              }`}
                            >
                              {m} Mo
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Reason / Justification */}
                    <div>
                      <label className="font-black text-slate-700 block mb-1 text-xs">
                        Override Reason / Customer Agreement Notes
                      </label>
                      <input
                        type="text"
                        value={overrideReasonInput}
                        onChange={(e) => setOverrideReasonInput(e.target.value)}
                        placeholder="e.g. VIP multi-container contract, retention discount, goodwill rate"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-purple-600 focus:outline-none font-medium"
                      />
                    </div>

                    {/* Policy Rule Governance Banner */}
                    <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/90 text-[11px] text-amber-900 space-y-1.5 leading-relaxed">
                      <div className="font-black flex items-center gap-1.5 text-amber-950">
                        <ShieldCheck className="w-4 h-4 text-amber-600" />
                        <span>Pricing Governance &amp; Post-Expiry Policy</span>
                      </div>
                      <p>
                        Admin has option to set custom pricing for a further <strong>{overrideMonthsInput} months</strong>.
                        Once this pricing period expires, Portabox&apos;s <strong>existing pricing review policy</strong> (Annual Review capped at max increase with floor constraint protection) applies automatically.
                      </p>
                    </div>

                    {/* Modal Actions */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200">
                      {pricingOverrideCustomer.pricingOverride?.isActive ? (
                        <button
                          type="button"
                          onClick={() => handleClearPricingOverride(pricingOverrideCustomer)}
                          className="px-3.5 py-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 font-bold text-xs transition-colors cursor-pointer"
                        >
                          Clear Override (Restore Policy)
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setPricingOverrideCustomer(null)}
                          className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}

                      <div className="flex items-center gap-2">
                        {pricingOverrideCustomer.pricingOverride?.isActive && (
                          <button
                            type="button"
                            onClick={() => setPricingOverrideCustomer(null)}
                            className="px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleSavePricingOverride}
                          className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Apply Override (${overrideRateInput}/mo for {overrideMonthsInput} Mo)</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ================= MANUAL CUSTOMER PAYMENT OVERRIDE MODAL ================= */}
            {manualPaymentCustomer && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border-2 border-emerald-200 overflow-hidden animate-scale-in">
                  <div className="bg-[#0b2942] text-white p-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-emerald-500/20 text-[#00c0f3] rounded-2xl border border-emerald-400/30">
                        <CreditCard className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="font-black text-base text-white">Manual Customer Payment Override</h3>
                        <p className="text-xs text-emerald-200">
                          {manualPaymentCustomer.firstName} {manualPaymentCustomer.lastName} · {manualPaymentCustomer.id}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setManualPaymentCustomer(null)}
                      className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="p-6 space-y-4 text-xs font-['Plus_Jakarta_Sans',sans-serif]">
                    {/* Customer Account Summary */}
                    <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                      <div>
                        <span className="text-[10px] text-emerald-800 uppercase font-black block">Customer Contact</span>
                        <span className="font-bold text-slate-800 text-xs block">{manualPaymentCustomer.email}</span>
                        <span className="text-[11px] text-slate-500">{manualPaymentCustomer.mobile}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-800 uppercase font-black block">Billing Status</span>
                        <span className="font-mono font-black text-slate-800 text-sm">
                          ${manualPaymentCustomer.paymentPlan?.periodicAmount || 219}/period
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          Next due: {manualPaymentCustomer.paymentPlan?.nextBillingDate || 'Scheduled'}
                        </span>
                      </div>
                    </div>

                    {/* Payment Amount Input */}
                    <div>
                      <label className="font-black text-slate-700 block mb-1 text-xs">
                        Manual Payment Amount (AUD $)
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3.5 top-2.5 font-black text-slate-400">$</span>
                          <input
                            type="number"
                            min={1}
                            value={manualPaymentAmount}
                            onChange={(e) => setManualPaymentAmount(Number(e.target.value))}
                            className="w-full pl-8 pr-3 py-2.5 rounded-xl border-2 border-emerald-200 focus:border-emerald-600 focus:outline-none font-mono font-black text-slate-800 text-sm"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          {[
                            manualPaymentCustomer.paymentPlan?.periodicAmount || 219,
                            Math.round((manualPaymentCustomer.paymentPlan?.periodicAmount || 219) / 2),
                            99,
                            149,
                          ].map((amt, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setManualPaymentAmount(amt)}
                              className={`px-2 py-1.5 rounded-lg border text-[11px] font-bold cursor-pointer transition-all ${
                                manualPaymentAmount === amt
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                              }`}
                            >
                              ${amt}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Payment Type */}
                    <div>
                      <label className="font-black text-slate-700 block mb-1 text-xs">Payment Classification</label>
                      <select
                        value={manualPaymentType}
                        onChange={(e) => setManualPaymentType(e.target.value as any)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-800 bg-white"
                      >
                        <option value="periodic_rent">Periodic Storage Rent Payment (EFT / PayID / Cash)</option>
                        <option value="custom_adjustment">Deposit / Upfront Payment Override</option>
                        <option value="courtesy_credit">Courtesy Credit / Goodwill Adjustment (-$)</option>
                        <option value="waiver">Fee Waiver (Late Fee / Dry Run Rebate)</option>
                      </select>
                    </div>

                    {/* Payment Method */}
                    <div>
                      <label className="font-black text-slate-700 block mb-1 text-xs">Payment Method / Channel</label>
                      <select
                        value={manualPaymentMethod}
                        onChange={(e) => setManualPaymentMethod(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-800 bg-white"
                      >
                        <option value="Direct Bank Transfer / PayID (Verified)">Direct Bank Transfer / PayID (Verified)</option>
                        <option value="Zepto NPP Instant / PayID Webhook">Zepto NPP Instant / PayID Webhook</option>
                        <option value="EFTPOS / Card Terminal at Counter">EFTPOS / Card Terminal at Counter</option>
                        <option value="Staff Card Phone Auth (Braintree Manual)">Staff Card Phone Auth (Braintree Manual)</option>
                        <option value="Cash Received at Depot Counter">Cash Received at Depot Counter</option>
                        <option value="Courtesy Goodwill Credit / Admin Waiver">Courtesy Goodwill Credit / Admin Waiver</option>
                      </select>
                    </div>

                    {/* Reference / Transaction ID */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="font-black text-slate-700 block mb-1 text-xs">Reference / Auth Code</label>
                        <input
                          type="text"
                          value={manualPaymentRef}
                          onChange={(e) => setManualPaymentRef(e.target.value)}
                          placeholder="e.g. EFT-98214 or CASH-01"
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="font-black text-slate-700 block mb-1 text-xs">Ledger Description</label>
                        <input
                          type="text"
                          value={manualPaymentDesc}
                          onChange={(e) => setManualPaymentDesc(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                        />
                      </div>
                    </div>

                    {/* Advance Next Billing Date Checkbox */}
                    <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer font-bold text-slate-800">
                      <input
                        type="checkbox"
                        checked={manualPaymentAdvanceDate}
                        onChange={(e) => setManualPaymentAdvanceDate(e.target.checked)}
                        className="w-4 h-4 rounded accent-emerald-600"
                      />
                      <span>Advance next periodic billing date by 30 days &amp; clear any overdue holds</span>
                    </label>

                    {/* Modal Actions */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => setManualPaymentCustomer(null)}
                        className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveManualPaymentOverride}
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <CreditCard className="w-4 h-4 text-amber-300" />
                        <span>Confirm &amp; Record Payment (${manualPaymentAmount} AUD)</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 0A-2: CONTAINER INVENTORY & QR SYSTEM ================= */}
        {activeTab === 'inventory' && (
          <div className="space-y-6">
            <SmartsheetInventoryView />
            <ContainerCRMView />
          </div>
        )}

        {/* ================= TAB 0B: SMARTSHEET YARD DISPATCH & OPERATIONAL STAGING ================= */}
        {activeTab === 'smartsheet' && (
          <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-[#00c0f3] text-white px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    SMARTSHEET API V2 CONNECTED
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    Sheet: <strong className="text-slate-800">{smartsheetConfig.sheetName}</strong>
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    (ID: {smartsheetConfig.sheetId})
                  </span>
                </div>
                <h3 className="text-lg font-extrabold text-[#0b2942]">
                  Smartsheet Operational Staging & Yard Dispatch Review
                </h3>
                <p className="text-xs text-slate-500">
                  Live operational queue synchronizing container fleet allocations, driver dispatch windows, and Braintree payments.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleSyncSmartsheet}
                  disabled={isSyncingSmartsheet}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#00c0f3] hover:bg-[#00a7d4] text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs disabled:opacity-75"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSmartsheet ? 'animate-spin' : ''}`} />
                  <span>{isSyncingSmartsheet ? 'Syncing to Smartsheet...' : 'Sync All to Smartsheet'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadSmartsheetCSV}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Staging CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowSmartsheetSettings(!showSmartsheetSettings)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Settings & Webhooks</span>
                </button>
              </div>
            </div>

            {/* Sync Notifications & Yard Update Toasts */}
            {smartsheetSyncResult && (
              <div
                className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in duration-150 ${
                  smartsheetSyncResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{smartsheetSyncResult.message}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {smartsheetConfig.lastSyncTime}
                </span>
              </div>
            )}

            {yardToast && (
              <div className="p-3 bg-sky-50 border border-sky-200 text-[#0b2942] text-xs font-bold rounded-2xl flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-[#00c0f3] shrink-0" />
                <span>{yardToast}</span>
              </div>
            )}

            {/* Smartsheet Connection & Webhook Settings Drawer */}
            {showSmartsheetSettings && (
              <form
                onSubmit={handleSaveSmartsheetSettings}
                className="p-5 sm:p-6 bg-slate-50 border border-slate-200 rounded-3xl space-y-4 animate-in fade-in"
              >
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h4 className="text-sm font-extrabold text-[#0b2942] flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-[#00c0f3]" />
                    Smartsheet API & Staging Webhook Configuration
                  </h4>
                  <span className="text-[10px] text-slate-400">OAuth2 / Bearer Token Target</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Smartsheet Sheet Name</label>
                    <input
                      type="text"
                      value={smartsheetConfig.sheetName}
                      onChange={(e) => setSmartsheetConfig({ ...smartsheetConfig, sheetName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-[#00c0f3]"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Smartsheet Sheet ID</label>
                    <input
                      type="text"
                      value={smartsheetConfig.sheetId}
                      onChange={(e) => setSmartsheetConfig({ ...smartsheetConfig, sheetId: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono focus:ring-2 focus:ring-[#00c0f3]"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">API Access Token (Bearer)</label>
                    <input
                      type="password"
                      value={smartsheetConfig.apiToken}
                      onChange={(e) => setSmartsheetConfig({ ...smartsheetConfig, apiToken: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono focus:ring-2 focus:ring-[#00c0f3]"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Staging Webhook URL (Zapier / Make / Cloud Function)</label>
                    <input
                      type="url"
                      value={smartsheetConfig.webhookUrl}
                      onChange={(e) => setSmartsheetConfig({ ...smartsheetConfig, webhookUrl: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono text-[11px] focus:ring-2 focus:ring-[#00c0f3]"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-200 text-xs">
                  <div className="flex items-center gap-5">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={smartsheetConfig.autoSyncOnPayment}
                        onChange={(e) => setSmartsheetConfig({ ...smartsheetConfig, autoSyncOnPayment: e.target.checked })}
                        className="w-4 h-4 rounded text-[#00c0f3] focus:ring-[#00c0f3]"
                      />
                      <span className="font-semibold text-slate-700">Auto-sync customer orders on Braintree payment</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={smartsheetConfig.autoSyncOnQuote}
                        onChange={(e) => setSmartsheetConfig({ ...smartsheetConfig, autoSyncOnQuote: e.target.checked })}
                        className="w-4 h-4 rounded text-[#00c0f3] focus:ring-[#00c0f3]"
                      />
                      <span className="font-semibold text-slate-700">Auto-sync on customer quote submission</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#0b2942] hover:bg-[#081e30] text-white rounded-xl font-bold cursor-pointer transition-colors shadow-2xs"
                  >
                    Save Configuration
                  </button>
                </div>
              </form>
            )}

            {/* Logistics Bridge Navigation Sub-Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto text-xs font-bold">
              <button
                type="button"
                onClick={() => setSmartsheetBridgeTab('grid')}
                className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                  smartsheetBridgeTab === 'grid'
                    ? 'bg-emerald-600 text-white shadow-2xs font-black'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-white" />
                <span>Smartsheet Grid View (Live Interactive Sheet)</span>
              </button>

              <button
                type="button"
                onClick={() => setSmartsheetBridgeTab('two_way_workspace')}
                className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                  smartsheetBridgeTab === 'two_way_workspace'
                    ? 'bg-[#0b2942] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-[#00c0f3]" />
                <span>Two-Way Intermediary Smartsheets (4 Live Sheets)</span>
              </button>

              <button
                type="button"
                onClick={() => setSmartsheetBridgeTab('staging')}
                className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                  smartsheetBridgeTab === 'staging'
                    ? 'bg-[#00c0f3] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Operational Staging Queue ({smartsheetRows.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setSmartsheetBridgeTab('checklist')}
                className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                  smartsheetBridgeTab === 'checklist'
                    ? 'bg-[#00c0f3] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                <span>5-Point Yard Inspection Bridge</span>
              </button>

              <button
                type="button"
                onClick={() => setSmartsheetBridgeTab('fleet')}
                className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                  smartsheetBridgeTab === 'fleet'
                    ? 'bg-[#00c0f3] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Depot Inventory & Level-Lift Fleet ({containerAssets.length} Containers)</span>
              </button>

              <button
                type="button"
                onClick={() => setSmartsheetBridgeTab('webhook_sim')}
                className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                  smartsheetBridgeTab === 'webhook_sim'
                    ? 'bg-[#00c0f3] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Two-Way Webhook Bridge & Driver Simulator</span>
              </button>
            </div>

            {/* Operational Staging Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Staged</span>
                <div className="text-2xl font-black text-[#0b2942]">{smartsheetRows.length}</div>
                <span className="text-[10px] text-slate-500">Orders in Smartsheet</span>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pending Yard Review</span>
                <div className="text-2xl font-black text-amber-600">
                  {smartsheetRows.filter((r) => r.yardReviewStatus === 'Pending Inspection' || r.yardReviewStatus === 'Container Washed & Tagged').length}
                </div>
                <span className="text-[10px] text-amber-600 font-semibold">Inspection & Wash</span>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Loaded on Trucks</span>
                <div className="text-2xl font-black text-indigo-600">
                  {smartsheetRows.filter((r) => r.yardReviewStatus === 'Loaded on Level-Lift Truck').length}
                </div>
                <span className="text-[10px] text-indigo-600 font-semibold">Level-Lift Ready</span>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Placed at Sites</span>
                <div className="text-2xl font-black text-emerald-600">
                  {smartsheetRows.filter((r) => r.yardReviewStatus === 'Delivered to Site').length}
                </div>
                <span className="text-[10px] text-emerald-600 font-semibold">Active customer care</span>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Revenue Staged</span>
                <div className="text-2xl font-black text-[#00c0f3] font-mono">
                  ${smartsheetRows.reduce((sum, r) => sum + r.amountPaid, 0)}
                </div>
                <span className="text-[10px] text-slate-500">Braintree settled</span>
              </div>
            </div>

            {/* ================= VIEW: LIVE SMARTSHEET GRID ================= */}
            {smartsheetBridgeTab === 'grid' && (
              <SmartsheetGridView
                rows={smartsheetRows}
                onRefreshRows={(updated) => setSmartsheetRows(updated)}
                onOpenPhoneIntake={() => setIsPhoneIntakeOpen(true)}
                sheetName={smartsheetConfig.sheetName || 'portabox smart sheet Ai agent'}
                userEmail="ahammo@gmail.com"
              />
            )}

            {/* ================= VIEW 0: 4 TWO-WAY INTERMEDIARY SMARTSHEETS WORKSPACE ================= */}
            {smartsheetBridgeTab === 'two_way_workspace' && (
              <SmartsheetWorkspace
                compactHeader
                onOpenCustomerPortalForCustomer={() => {
                  if (onOpenCustomerPortal) onOpenCustomerPortal();
                }}
              />
            )}

            {/* ================= VIEW 1: STAGING QUEUE ================= */}
            {smartsheetBridgeTab === 'staging' && (
              <>
                {/* Search & Yard Review Filter Toolbar */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="text"
                      value={smartsheetSearch}
                      onChange={(e) => setSmartsheetSearch(e.target.value)}
                      placeholder="Filter Smartsheet orders by customer name, order #, container ID, or delivery address..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#00c0f3]"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold">
                    {[
                      'All',
                      'Pending Inspection',
                      'Container Washed & Tagged',
                      'Loaded on Level-Lift Truck',
                      'Dispatched - En Route',
                      'Delivered to Site',
                    ].map((statusVal) => (
                      <button
                        key={statusVal}
                        type="button"
                        onClick={() => setSmartsheetYardFilter(statusVal)}
                        className={`px-3 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                          smartsheetYardFilter === statusVal
                            ? 'bg-[#00c0f3] text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {statusVal}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Interactive Smartsheet Operational Staging Grid */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-[#0b2942] text-white uppercase text-[10px] font-extrabold tracking-wider">
                        <tr>
                          <th className="p-3.5 border-r border-slate-700/60 whitespace-nowrap">Order #</th>
                          <th className="p-3.5 border-r border-slate-700/60 whitespace-nowrap">Customer</th>
                          <th className="p-3.5 border-r border-slate-700/60 whitespace-nowrap">Container</th>
                          <th className="p-3.5 border-r border-slate-700/60 whitespace-nowrap">Delivery Address</th>
                          <th className="p-3.5 border-r border-slate-700/60 whitespace-nowrap">Delivery Window</th>
                          <th className="p-3.5 border-r border-slate-700/60 whitespace-nowrap">Driver & Truck</th>
                          <th className="p-3.5 border-r border-slate-700/60 whitespace-nowrap bg-[#00c0f3] text-white">
                            Yard Review Status (Interactive)
                          </th>
                          <th className="p-3.5 border-r border-slate-700/60 whitespace-nowrap text-center">Inspection Cert</th>
                          <th className="p-3.5 border-r border-slate-700/60 whitespace-nowrap text-right">Payment</th>
                          <th className="p-3.5 whitespace-nowrap">Braintree Ref & Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredSmartsheetRows.length === 0 ? (
                          <tr>
                            <td colSpan={10} className="p-8 text-center text-slate-400">
                              No operational staging rows found matching your search.
                            </td>
                          </tr>
                        ) : (
                          filteredSmartsheetRows.map((row) => (
                            <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                              {/* Order # */}
                              <td className="p-3.5 font-mono font-bold text-[#0b2942] border-r border-slate-100 whitespace-nowrap">
                                <span className="bg-sky-50 text-[#00c0f3] border border-sky-200 px-2 py-0.5 rounded-md">
                                  {row.orderNumber}
                                </span>
                                {row.operationalHold && (
                                  <span className="block mt-1 text-[9px] font-black uppercase text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                                    DISPATCH HOLD
                                  </span>
                                )}
                              </td>

                              {/* Customer */}
                              <td className="p-3.5 border-r border-slate-100">
                                <div className="font-extrabold text-[#0b2942]">{row.customerName}</div>
                                <div className="text-[11px] text-slate-500">{row.customerPhone}</div>
                                <div className="text-[10px] text-slate-400 truncate max-w-[140px]">{row.customerEmail}</div>
                              </td>

                              {/* Container */}
                              <td className="p-3.5 border-r border-slate-100 whitespace-nowrap">
                                <span className="font-mono font-black text-xs text-[#0b2942] block">
                                  {row.containerId}
                                </span>
                                <span className="text-[11px] text-slate-500">{row.containerSize}</span>
                                <span className="text-[10px] text-slate-400 block">{row.serviceType}</span>
                              </td>

                              {/* Delivery Address */}
                              <td className="p-3.5 border-r border-slate-100 max-w-xs">
                                <div className="text-slate-800 font-medium truncate">{row.deliveryAddress}</div>
                              </td>

                              {/* Delivery Window */}
                              <td className="p-3.5 border-r border-slate-100 whitespace-nowrap">
                                <div className="font-bold text-[#0b2942]">{row.scheduledDeliveryDate}</div>
                                <div className="text-[11px] text-slate-500">{row.deliveryWindow}</div>
                              </td>

                              {/* Driver & Truck */}
                              <td className="p-3.5 border-r border-slate-100 whitespace-nowrap">
                                <span className="font-medium text-slate-800 block">{row.assignedDriver}</span>
                                <span className="text-[10px] text-slate-400 font-mono">Truck: TRUCK-ADL-01</span>
                              </td>

                              {/* Interactive Yard Review Status Dropdown */}
                              <td className="p-3.5 border-r border-slate-100 bg-sky-50/40">
                                <select
                                  value={row.yardReviewStatus}
                                  onChange={(e) => handleUpdateYardStatus(row.orderNumber, e.target.value as YardReviewStatus)}
                                  className={`w-full text-xs font-bold py-1.5 px-2.5 rounded-xl border transition-all cursor-pointer ${
                                    row.yardReviewStatus === 'Delivered to Site'
                                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                      : row.yardReviewStatus === 'Dispatched - En Route'
                                      ? 'bg-blue-50 border-blue-300 text-blue-800'
                                      : row.yardReviewStatus === 'Loaded on Level-Lift Truck'
                                      ? 'bg-indigo-50 border-indigo-300 text-indigo-800'
                                      : row.yardReviewStatus === 'Container Washed & Tagged'
                                      ? 'bg-sky-50 border-sky-300 text-sky-800'
                                      : 'bg-amber-50 border-amber-300 text-amber-800'
                                  }`}
                                >
                                  <option value="Pending Inspection">Pending Inspection</option>
                                  <option value="Container Washed & Tagged">Container Washed & Tagged</option>
                                  <option value="Loaded on Level-Lift Truck">Loaded on Level-Lift Truck</option>
                                  <option value="Dispatched - En Route">Dispatched - En Route</option>
                                  <option value="Delivered to Site">Delivered to Site</option>
                                  <option value="Returned to Depot">Returned to Depot</option>
                                </select>
                              </td>

                              {/* Inspection Cert */}
                              <td className="p-3.5 border-r border-slate-100 text-center whitespace-nowrap">
                                {row.inspectionChecklist?.passed ? (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenInspection(row)}
                                    className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 mx-auto cursor-pointer"
                                  >
                                    <Check className="w-3 h-3 text-emerald-700" />
                                    <span>Certified</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenInspection(row)}
                                    className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 mx-auto cursor-pointer"
                                  >
                                    <Wrench className="w-3 h-3 text-amber-700" />
                                    <span>Inspect</span>
                                  </button>
                                )}
                              </td>

                              {/* Financial / Payment */}
                              <td className="p-3.5 border-r border-slate-100 text-right whitespace-nowrap">
                                <span className="font-mono font-black text-sm text-[#0b2942] block">
                                  ${row.amountPaid}
                                </span>
                                <span
                                  className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                    row.paymentStatus === 'Paid'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : row.paymentStatus === 'Overdue'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {row.paymentStatus}
                                </span>
                                <div className="text-[10px] text-slate-400 mt-0.5">{row.paymentPlan}</div>
                              </td>

                              {/* Braintree Ref & Notes */}
                              <td className="p-3.5 text-xs max-w-xs">
                                <div className="font-mono text-[10px] text-slate-500 truncate">
                                  Ref: {row.braintreeTransactionId}
                                </div>
                                {row.accessNotes && (
                                  <div className="text-[11px] text-slate-700 italic truncate mt-0.5">
                                    "{row.accessNotes}"
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* ================= VIEW 2: 5-POINT YARD PREP & INSPECTION BRIDGE ================= */}
            {smartsheetBridgeTab === 'checklist' && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-md">
                      LOGISTICS QUALITY ASSURANCE BRIDGE
                    </span>
                    <h4 className="text-lg font-black text-[#0b2942] mt-1">
                      Pre-Dispatch 5-Point Container Inspection
                    </h4>
                    <p className="text-xs text-slate-500">
                      Standard operating procedure before any Portabox is loaded onto a horizontal level-lift truck (zero tilting guarantee keeps goods completely level) and synced to Smartsheet.
                    </p>
                  </div>

                  {/* Target Order Selector */}
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-700">Order to Certify:</label>
                    <select
                      value={inspectionTargetOrder?.orderNumber || smartsheetRows[0]?.orderNumber}
                      onChange={(e) => {
                        const row = smartsheetRows.find((r) => r.orderNumber === e.target.value);
                        if (row) handleOpenInspection(row);
                      }}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono font-bold"
                    >
                      {smartsheetRows.map((r) => (
                        <option key={r.id} value={r.orderNumber}>
                          {r.orderNumber} - {r.customerName} ({r.containerId})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 5-Point Interactive Inspection Checklist */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <label className="flex items-start gap-3 p-4 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={checklistState.weatherproofSeal}
                      onChange={(e) => setChecklistState({ ...checklistState, weatherproofSeal: e.target.checked })}
                      className="w-5 h-5 rounded text-[#00c0f3] focus:ring-[#00c0f3] mt-0.5"
                    />
                    <div>
                      <span className="font-extrabold text-[#0b2942] block">
                        1. Weatherproof Marine Rubber Seals & Compression Cam Latches
                      </span>
                      <span className="text-slate-500">
                        Check door perimeter rubber gaskets for water-tight seal and verify dual cam locking levers latch securely.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-4 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={checklistState.sanitizationWash}
                      onChange={(e) => setChecklistState({ ...checklistState, sanitizationWash: e.target.checked })}
                      className="w-5 h-5 rounded text-[#00c0f3] focus:ring-[#00c0f3] mt-0.5"
                    />
                    <div>
                      <span className="font-extrabold text-[#0b2942] block">
                        2. Heated High-Pressure Steam Sanitization & Odor Clearance
                      </span>
                      <span className="text-slate-500">
                        Interior chamber completely washed, dried, deodorized, and free of dust or debris.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-4 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={checklistState.floorDrings}
                      onChange={(e) => setChecklistState({ ...checklistState, floorDrings: e.target.checked })}
                      className="w-5 h-5 rounded text-[#00c0f3] focus:ring-[#00c0f3] mt-0.5"
                    />
                    <div>
                      <span className="font-extrabold text-[#0b2942] block">
                        3. Marine Hardwood Flooring & Tie-Down D-Rings
                      </span>
                      <span className="text-slate-500">
                        Inspect hardwood plywood floor for smoothness and verify all recessed wall/floor D-rings are solid.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-4 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={checklistState.lockboxShroud}
                      onChange={(e) => setChecklistState({ ...checklistState, lockboxShroud: e.target.checked })}
                      className="w-5 h-5 rounded text-[#00c0f3] focus:ring-[#00c0f3] mt-0.5"
                    />
                    <div>
                      <span className="font-extrabold text-[#0b2942] block">
                        4. Security Lockbox Hardened Padlock Shroud
                      </span>
                      <span className="text-slate-500">
                        Verify steel security shroud is intact to prevent angle grinder or bolt-cutter tampering.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-4 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 cursor-pointer transition-colors md:col-span-2">
                    <input
                      type="checkbox"
                      checked={checklistState.horizontalLiftLevelPlacement}
                      onChange={(e) => setChecklistState({ ...checklistState, horizontalLiftLevelPlacement: e.target.checked })}
                      className="w-5 h-5 rounded text-[#00c0f3] focus:ring-[#00c0f3] mt-0.5"
                    />
                    <div>
                      <span className="font-extrabold text-[#0b2942] block">
                        5. Horizontal Level-Lift Hydraulic Arms & 4-Corner Twist-Locks (Zero-Tilt Guarantee)
                      </span>
                      <span className="text-slate-500">
                        Inspect dual-stage horizontal hydraulic lift system and 4-corner twist-locks. Guarantees 100% horizontal flat transfer onto truck with zero container tilting or shifting of packed goods.
                      </span>
                    </div>
                  </label>
                </div>

                {/* Inspector Details & Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700">Inspecting Yard Officer</label>
                      <input
                        type="text"
                        value={checklistState.inspectedBy}
                        onChange={(e) => setChecklistState({ ...checklistState, inspectedBy: e.target.value })}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setSmartsheetBridgeTab('staging')}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveInspection}
                      className="px-6 py-2 bg-[#00c0f3] hover:bg-[#00a7d4] text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>Certify & Sync Status to Smartsheet</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ================= VIEW 3: DEPOT INVENTORY & HORIZONTAL LEVEL-LIFT FLEET ================= */}
            {smartsheetBridgeTab === 'fleet' && (
              <div className="space-y-6">
                {/* Physical Containers */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="text-sm font-extrabold text-[#0b2942] flex items-center gap-2">
                        <Package className="w-4 h-4 text-[#00c0f3]" />
                        Depot Container Assets & Technical Specifications
                      </h4>
                      <p className="text-xs text-slate-500">
                        Physical steel containers tracked in the Smartsheet Logistics Master Sheet.
                      </p>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
                      {containerAssets.filter((c) => c.status === 'Available in Depot').length} Available in Depot
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-extrabold">
                        <tr>
                          <th className="p-3">Container ID</th>
                          <th className="p-3">Volume</th>
                          <th className="p-3">Home Depot & Bay</th>
                          <th className="p-3 text-right">Tare Weight</th>
                          <th className="p-3 text-right">Max Gross</th>
                          <th className="p-3">Condition</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Assigned Order</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {containerAssets.map((c) => (
                          <tr key={c.containerId} className="hover:bg-slate-50/60">
                            <td className="p-3 font-mono font-bold text-[#0b2942]">{c.containerId}</td>
                            <td className="p-3 font-medium text-slate-700">{c.size}</td>
                            <td className="p-3 text-slate-600">
                              {c.depotName} <span className="font-mono text-slate-400">({c.bayNumber})</span>
                            </td>
                            <td className="p-3 text-right font-mono">{c.tareWeightKg} kg</td>
                            <td className="p-3 text-right font-mono font-bold">{c.maxGrossWeightKg} kg</td>
                            <td className="p-3">
                              <span className="bg-sky-50 text-[#00c0f3] font-bold px-2 py-0.5 rounded text-[10px]">
                                {c.condition}
                              </span>
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  c.status === 'Available in Depot'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : c.status === 'Allocated - In Yard Prep'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {c.status}
                              </span>
                            </td>
                            <td className="p-3 font-mono text-[11px] text-slate-500">
                              {c.assignedOrderNumber || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Horizontal Level-Lift Container Fleet */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h4 className="text-sm font-extrabold text-[#0b2942] flex items-center gap-2">
                      <Truck className="w-4 h-4 text-[#00c0f3]" />
                      Horizontal Level-Lift Logistics Fleet Registry
                    </h4>
                    <p className="text-xs text-slate-500">
                      Heavy transport level-lift trucks with zero-tilt horizontal loading systems assigned to container deliveries.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {truckFleet.map((t) => (
                      <div key={t.truckId} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-[#0b2942]">{t.truckId}</span>
                          <span className="font-mono text-slate-500 text-[11px]">Rego: {t.rego}</span>
                        </div>
                        <h5 className="font-extrabold text-sm text-[#0b2942]">{t.truckModel}</h5>
                        <div className="grid grid-cols-2 gap-2 text-slate-600 text-[11px]">
                          <div><strong>Lift Mechanism:</strong> {t.truckType}</div>
                          <div><strong>Home Depot:</strong> {t.depot}</div>
                          <div><strong>Driver:</strong> {t.driverName}</div>
                          <div><strong>Driver Phone:</strong> {t.driverPhone}</div>
                        </div>
                        <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                          <span className="text-[10px] text-slate-500">Status:</span>
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded text-[10px]">
                            {t.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ================= VIEW 4: TWO-WAY WEBHOOK BRIDGE & DRIVER SIMULATOR ================= */}
            {smartsheetBridgeTab === 'webhook_sim' && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded-md">
                    TWO-WAY BIDIRECTIONAL BRIDGE
                  </span>
                  <h4 className="text-lg font-black text-[#0b2942] mt-1">
                    Smartsheet Webhook Listener & Driver Mobile Simulator
                  </h4>
                  <p className="text-xs text-slate-500">
                    Test live webhook callbacks from Smartsheet mobile apps used by delivery drivers in the field.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="space-y-4 md:col-span-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Target Order</label>
                      <select
                        value={simWebhookOrder}
                        onChange={(e) => setSimWebhookOrder(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold font-mono"
                      >
                        {smartsheetRows.map((r) => (
                          <option key={r.id} value={r.orderNumber}>
                            {r.orderNumber} - {r.customerName} ({r.deliveryAddress})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Driver Field Action</label>
                        <select
                          value={simWebhookAction}
                          onChange={(e) => setSimWebhookAction(e.target.value as YardReviewStatus)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold"
                        >
                          <option value="Dispatched - En Route">Dispatched - En Route</option>
                          <option value="Delivered to Site">Delivered to Site (Complete)</option>
                          <option value="Returned to Depot">Returned to Depot</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Driver GPS Coordinates</label>
                        <input
                          type="text"
                          value={simWebhookLocation}
                          onChange={(e) => setSimWebhookLocation(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleTriggerInboundWebhook}
                      className="px-5 py-2.5 bg-[#0b2942] hover:bg-[#081e30] text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-2"
                    >
                      <Radio className="w-4 h-4 text-[#00c0f3]" />
                      <span>Simulate Inbound Webhook Event from Smartsheet</span>
                    </button>
                  </div>

                  {/* Sample Payload Preview */}
                  <div className="p-4 rounded-2xl bg-slate-900 text-sky-300 font-mono text-[11px] space-y-2 overflow-x-auto">
                    <div className="text-white font-bold text-xs uppercase flex items-center justify-between">
                      <span>Webhook Payload Preview</span>
                      <span className="text-[9px] text-slate-400">JSON</span>
                    </div>
                    <pre className="text-[10px] leading-tight text-slate-300 whitespace-pre-wrap">
{JSON.stringify(
  {
    event: 'row.updated',
    sheetId: smartsheetConfig.sheetId,
    orderNumber: simWebhookOrder,
    yardReviewStatus: simWebhookAction,
    driverGpsLocation: simWebhookLocation,
    merchantGateway: 'braintree_aud',
    timestamp: new Date().toISOString(),
  },
  null,
  2
)}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {/* Smartsheet Audit Trail & Sync History */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="text-sm font-extrabold text-[#0b2942] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#00c0f3]" />
                  Smartsheet Sync Log & Webhook Audit Trail
                </h4>
                <span className="text-[10px] text-slate-400">Audit retention: 15 events</span>
              </div>

              <div className="space-y-2">
                {smartsheetConfig.syncHistory.map((log) => (
                  <div key={log.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-start justify-between gap-3 text-xs">
                    <div className="flex items-start gap-2.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      <div>
                        <span className="font-extrabold text-[#0b2942]">{log.action}</span>
                        <span className="text-slate-400 ml-2">({log.timestamp})</span>
                        <p className="text-slate-600 mt-0.5 text-[11px]">{log.details}</p>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-600 shrink-0">
                      {log.rowsAffected} row{log.rowsAffected > 1 ? 's' : ''} affected
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB: CALL CENTER CALENDAR & ROUTING OPTIMIZER ================= */}
        {activeTab === 'call_center_routing' && (
          <div className="space-y-4">
            {/* Feature Flag Status & Quick Toggle Bar */}
            <div className={`p-4 rounded-2xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs ${
              currentConfig.enableCallCenterDispatch !== false
                ? 'bg-emerald-50/80 border-emerald-200'
                : 'bg-amber-50 border-amber-200'
            }`}>
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-xl text-white shrink-0 mt-0.5 ${
                  currentConfig.enableCallCenterDispatch !== false ? 'bg-emerald-600' : 'bg-amber-500'
                }`}>
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                      currentConfig.enableCallCenterDispatch !== false ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'
                    }`}>
                      {currentConfig.enableCallCenterDispatch !== false ? '✓ Feature Selected (Active in App)' : '⚠ Feature Deselected (Hidden from App)'}
                    </span>
                    <span className="text-xs font-bold text-slate-900">
                      Call Center Dispatch Feature Flag
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {currentConfig.enableCallCenterDispatch !== false
                      ? 'Call center dispatch tools are currently active. The "Call Center Dispatch" button is visible in the top header and staff can access calendar slots, route optimization, and driver routing sheets.'
                      : 'Call center dispatch functions have been deselected from the customer-facing app. The dispatch button in the header is hidden. You can review internal schedules below or re-enable the feature.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleToggleCallCenterDispatch(currentConfig.enableCallCenterDispatch === false)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 shadow-xs ${
                  currentConfig.enableCallCenterDispatch !== false
                    ? 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {currentConfig.enableCallCenterDispatch !== false ? 'Deselect (Turn Off in App)' : 'Select (Turn On in App)'}
              </button>
            </div>

            <CallCenterCalendarPortal
              onClose={() => setActiveTab('customers')}
            />
          </div>
        )}

        {/* ================= TAB: TWILIO TELEPHONY & SCREEN-POP HUB ================= */}
        {activeTab === 'telephony' && (
          <CallCenterTelephonyHub />
        )}

        {/* ================= TAB 1: CUSTOMER LEADS CRM ================= */}
        {activeTab === 'leads' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-extrabold text-[#0b2942]">Customer Inquiries & Quotes</h3>
                <p className="text-xs text-slate-500">
                  Collected customer leads for follow-up calls, SMS dispatch, and CRM marketing.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export to CSV</span>
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={leadsSearch}
                  onChange={(e) => setLeadsSearch(e.target.value)}
                  placeholder="Search by customer name, mobile, email, suburb, or postcode..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#00c0f3]"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-semibold whitespace-nowrap">Status:</span>
                {['All', 'New', 'Contacted', 'Booked', 'Follow-up'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setLeadStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      leadStatusFilter === st
                        ? 'bg-[#0b2942] text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            {filteredLeads.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">No matching customer quotes found</p>
                <p className="text-xs text-slate-400 mt-1">Quotes submitted via the app will automatically appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Contact</th>
                      <th className="py-3 px-4">Location</th>
                      <th className="py-3 px-4">Container & Service</th>
                      <th className="py-3 px-4">First Payment</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Follow-up Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLeads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          <div>{lead.firstName}</div>
                          <div className="text-[10px] text-slate-400 font-normal">
                            {new Date(lead.createdAt).toLocaleDateString()} {new Date(lead.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-mono text-slate-800">{lead.mobile}</div>
                          <div className="text-slate-500 text-[11px]">{lead.email}</div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="px-1.5 py-0.5 rounded bg-sky-50 text-[#00c0f3] text-[9px] font-bold">
                              SMS Sent
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 text-[9px] font-bold">
                              Email Sent
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800">
                            {lead.quote.originPostcode.suburb}
                          </div>
                          <div className="text-slate-400 text-[11px]">
                            {lead.quote.originPostcode.state} {lead.quote.originPostcode.postcode} (Zone {lead.quote.deliveryZone})
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800">{lead.quote.containerName}</div>
                          <div className="text-slate-500 text-[11px]">
                            {lead.quote.serviceType.replace(/_/g, ' ')} · {lead.quote.storageDuration.replace(/_/g, ' ')}
                          </div>
                        </td>

                        <td className="py-3 px-4 font-mono font-bold text-slate-900 text-sm">
                          ${lead.quote.firstPaymentTotal}
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <select
                              value={lead.status}
                              onChange={(e) => onUpdateLeadStatus(lead.id, e.target.value as any)}
                              className="text-xs font-semibold px-2 py-1 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#00c0f3]"
                            >
                              <option value="New">New</option>
                              <option value="Contacted">Contacted</option>
                              <option value="Booked">Booked</option>
                              <option value="Follow-up">Follow-up</option>
                              <option value="Archived">Archived</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => setDrawerState({ isOpen: true, type: 'lead', data: lead })}
                              className="p-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 cursor-pointer transition-colors"
                              title="Inspect lead in 360° drawer (Pipedrive/HubSpot style)"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                            </button>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="space-y-1 max-w-xs">
                            {lead.notes && lead.notes.length > 0 && (
                              <div className="text-[11px] text-slate-600 bg-slate-100 p-1.5 rounded">
                                {lead.notes[lead.notes.length - 1]}
                              </div>
                            )}
                            <div className="flex items-center gap-1 mt-1">
                              <input
                                type="text"
                                placeholder="Add note..."
                                value={newNoteText[lead.id] || ''}
                                onChange={(e) =>
                                  setNewNoteText({ ...newNoteText, [lead.id]: e.target.value })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && newNoteText[lead.id]?.trim()) {
                                    onAddLeadNote(lead.id, newNoteText[lead.id]);
                                    setNewNoteText({ ...newNoteText, [lead.id]: '' });
                                  }
                                }}
                                className="w-full text-[11px] px-2 py-1 rounded border border-slate-200"
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB: DROP-OFF TRACKING & FUNNEL ================= */}
        {activeTab === 'dropoffs' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-rose-100 text-rose-700 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded tracking-wide">
                    FUNNEL ANALYTICS
                  </span>
                  <span className="text-xs text-slate-400 font-bold">
                    {dropOffs.length} recorded sessions
                  </span>
                </div>
                <h3 className="text-xl font-extrabold text-[#0b2942] mt-1">
                  Quote Funnel & Page Drop-Off Analytics
                </h3>
                <p className="text-xs text-slate-500">
                  Identifies the exact page where customers stop or abandon the quote process so you can address friction and recover leads.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDropOffs(loadDropOffRecords())}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Refresh Log</span>
                </button>
              </div>
            </div>

            {/* Funnel Stage Breakdown Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { step: 1, name: 'Page 1: Where', desc: 'Suburb & Postcode check', color: 'border-sky-300 bg-sky-50/50' },
                { step: 2, name: 'Page 2: What', desc: 'Service type & move destination', color: 'border-indigo-300 bg-indigo-50/50' },
                { step: 3, name: 'Page 3: Which Size', desc: 'Container size selection', color: 'border-amber-300 bg-amber-50/50' },
                { step: 4, name: 'Page 4: When', desc: 'Storage duration & billing cycle', color: 'border-purple-300 bg-purple-50/50' },
                { step: 5, name: 'Page 5: Send Quote', desc: 'Email & mobile contact capture', color: 'border-rose-300 bg-rose-50/50' },
                { step: 6, name: 'Page 6: Final Quote', desc: 'Quote viewed & completed', color: 'border-emerald-300 bg-emerald-50/50' },
              ].map((stage) => {
                const countAtStage = dropOffs.filter((d) => d.lastPageStep === stage.step).length;
                const total = dropOffs.length || 1;
                const pct = Math.round((countAtStage / total) * 100);

                return (
                  <div
                    key={stage.step}
                    className={`p-4 rounded-2xl border ${stage.color} space-y-2`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-[#0b2942]">
                        {stage.name}
                      </span>
                      <span className="text-xs font-black font-mono px-2 py-0.5 rounded-full bg-white text-slate-800 border border-slate-200 shadow-2xs">
                        {countAtStage} sessions ({pct}%)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600">{stage.desc}</p>
                    <div className="w-full bg-white/80 h-2 rounded-full overflow-hidden border border-slate-200">
                      <div
                        className={`h-full ${stage.step === 6 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                        style={{ width: `${Math.max(pct, 6)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Filter and Search Bar for Drop-Offs */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by suburb, postcode, email, or mobile..."
                  value={dropOffSearch}
                  onChange={(e) => setDropOffSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#00c0f3]"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={dropOffPageFilter}
                  onChange={(e) => setDropOffPageFilter(e.target.value)}
                  className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white focus:outline-none"
                >
                  <option value="All">All Funnel Pages</option>
                  <option value="Page 1">Page 1: Where</option>
                  <option value="Page 2">Page 2: What</option>
                  <option value="Page 3">Page 3: Which Size</option>
                  <option value="Page 4">Page 4: When</option>
                  <option value="Page 5">Page 5: Send Quote</option>
                  <option value="Page 6">Page 6: Final Quote (Completed)</option>
                </select>
              </div>
            </div>

            {/* Drop-Off Sessions Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-extrabold text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Time / Session</th>
                      <th className="px-4 py-3">Drop-Off Page Name</th>
                      <th className="px-4 py-3">Location / Move</th>
                      <th className="px-4 py-3">Container & Qty</th>
                      <th className="px-4 py-3">Duration & Billing</th>
                      <th className="px-4 py-3">Contact Info</th>
                      <th className="px-4 py-3 text-right">Outcome</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dropOffs
                      .filter((d) => {
                        const q = dropOffSearch.toLowerCase();
                        const matchSearch =
                          !q ||
                          (d.originSuburb && d.originSuburb.toLowerCase().includes(q)) ||
                          (d.originPostcode && d.originPostcode.includes(q)) ||
                          (d.customerEmail && d.customerEmail.toLowerCase().includes(q)) ||
                          (d.customerPhone && d.customerPhone.includes(q)) ||
                          d.lastPageName.toLowerCase().includes(q);

                        const matchPage =
                          dropOffPageFilter === 'All' ||
                          d.lastPageName.toLowerCase().includes(dropOffPageFilter.toLowerCase());

                        return matchSearch && matchPage;
                      })
                      .map((session) => (
                        <tr key={session.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3.5 text-slate-500">
                            <div className="font-mono font-bold text-slate-800">
                              {new Date(session.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div className="text-[10px]">
                              {new Date(session.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-lg font-extrabold text-[11px] ${
                                session.completed
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : session.lastPageStep === 5
                                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                  : session.lastPageStep === 4
                                  ? 'bg-purple-100 text-purple-800 border border-purple-300'
                                  : session.lastPageStep === 3
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : 'bg-sky-100 text-sky-800 border border-sky-300'
                              }`}
                            >
                              {session.lastPageName}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-slate-700">
                            <div className="font-bold text-[#0b2942]">
                              {session.originSuburb ? `${session.originSuburb} (${session.originPostcode})` : 'Not specified'}
                            </div>
                            {session.destinationSuburb && (
                              <div className="text-[10px] text-slate-500">
                                → Moving to {session.destinationSuburb} ({session.destinationPostcode})
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-3.5 text-slate-700">
                            <div className="font-semibold capitalize">
                              {session.containerSize ? session.containerSize.replace(/_/g, ' ') : 'None'}
                            </div>
                            {session.containerCount && session.containerCount > 1 && (
                              <div className="text-[10px] text-sky-600 font-bold">
                                {session.containerCount} containers
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-3.5 text-slate-600">
                            <div>{session.storageDuration ? session.storageDuration.replace(/_/g, ' ') : '—'}</div>
                            <div className="text-[10px] text-slate-400 capitalize">{session.billingCycle || '—'}</div>
                          </td>

                          <td className="px-4 py-3.5 text-slate-700">
                            {session.customerEmail || session.customerPhone ? (
                              <div className="space-y-0.5">
                                {session.customerPhone && (
                                  <a href={`tel:${session.customerPhone}`} className="font-mono text-[11px] font-bold text-[#00c0f3] hover:underline block">
                                    {session.customerPhone}
                                  </a>
                                )}
                                {session.customerEmail && (
                                  <div className="text-[10px] text-slate-500 truncate max-w-[150px]">
                                    {session.customerEmail}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Pre-contact stage</span>
                            )}
                          </td>

                          <td className="px-4 py-3.5 text-right">
                            {session.completed ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                <CheckCircle className="w-3 h-3 text-emerald-600" />
                                Completed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                                Abandoned
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: CONTAINER & LEG PRICING ================= */}
        {activeTab === 'pricing' && (
          <div className="space-y-6 max-w-4xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-extrabold text-[#0b2942]">
                  Location-Specific Container Storage Fees & Delivery Rates
                </h3>
                <p className="text-xs text-slate-500">
                  Set different container storage fees (monthly & weekly) and base delivery fees for each Portabox depot location.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleApplyContainerPricesToAllLocations(selectedPricingHub)}
                className="px-3.5 py-2 rounded-xl bg-[#FF9900] hover:bg-[#e68a00] text-[#0b2942] border border-[#FEBD69] text-xs font-extrabold cursor-pointer transition-colors shadow-2xs shrink-0"
              >
                Copy {selectedPricingHub} Storage Rates to All Locations
              </button>
            </div>

            {/* Depot Location Selector Pills */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-[#0b2942] flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#00c0f3]" />
                  <span>Select Depot Location to Configure Storage & Delivery Fees:</span>
                </span>
                <span className="text-[11px] font-bold text-slate-500">
                  Editing: <strong className="text-[#0b2942]">{activeLocationPricing.depotName}</strong>
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {ALL_ADMIN_HUBS.map((hubName) => {
                  const isSelected = selectedPricingHub === hubName;
                  return (
                    <button
                      key={hubName}
                      type="button"
                      onClick={() => setSelectedPricingHub(hubName)}
                      className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
                        isSelected
                          ? 'bg-[#FF9900] text-[#0b2942] border-2 border-[#FEBD69] shadow-xs'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <MapPin className={`w-3.5 h-3.5 ${isSelected ? 'text-[#0b2942]' : 'text-[#00c0f3]'}`} />
                      <span>{hubName}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Container Storage Fees for Selected Location */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* 10 m³ Container */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-sm text-[#0b2942]">10 m³ Container</h4>
                  <span className="text-[10px] font-bold bg-sky-50 text-[#00c0f3] px-2 py-0.5 rounded-md border border-sky-200">
                    {selectedPricingHub}
                  </span>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Monthly storage rate ($ / month)
                  </label>
                  <input
                    type="number"
                    value={activeLocationPricing.containerPrices.small_10m3.monthlyRate}
                    onChange={(e) =>
                      handleUpdateLocationContainerPrice(
                        selectedPricingHub,
                        'small_10m3',
                        'monthlyRate',
                        Number(e.target.value)
                      )
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Weekly storage rate ($ / week)
                  </label>
                  <input
                    type="number"
                    value={activeLocationPricing.containerPrices.small_10m3.weeklyRate}
                    onChange={(e) =>
                      handleUpdateLocationContainerPrice(
                        selectedPricingHub,
                        'small_10m3',
                        'weeklyRate',
                        Number(e.target.value)
                      )
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold font-mono"
                  />
                </div>
              </div>

              {/* 19 m³ Container */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-sm text-[#0b2942]">19 m³ Container</h4>
                  <span className="text-[10px] font-bold bg-sky-50 text-[#00c0f3] px-2 py-0.5 rounded-md border border-sky-200">
                    {selectedPricingHub}
                  </span>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Monthly storage rate ($ / month)
                  </label>
                  <input
                    type="number"
                    value={activeLocationPricing.containerPrices.medium_19m3.monthlyRate}
                    onChange={(e) =>
                      handleUpdateLocationContainerPrice(
                        selectedPricingHub,
                        'medium_19m3',
                        'monthlyRate',
                        Number(e.target.value)
                      )
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Weekly storage rate ($ / week)
                  </label>
                  <input
                    type="number"
                    value={activeLocationPricing.containerPrices.medium_19m3.weeklyRate}
                    onChange={(e) =>
                      handleUpdateLocationContainerPrice(
                        selectedPricingHub,
                        'medium_19m3',
                        'weeklyRate',
                        Number(e.target.value)
                      )
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold font-mono"
                  />
                </div>
              </div>

              {/* 25 m³ Container */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-sm text-[#0b2942]">25 m³ Container</h4>
                  <span className="text-[10px] font-bold bg-sky-50 text-[#00c0f3] px-2 py-0.5 rounded-md border border-sky-200">
                    {selectedPricingHub}
                  </span>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Monthly storage rate ($ / month)
                  </label>
                  <input
                    type="number"
                    value={activeLocationPricing.containerPrices.large_25m3.monthlyRate}
                    onChange={(e) =>
                      handleUpdateLocationContainerPrice(
                        selectedPricingHub,
                        'large_25m3',
                        'monthlyRate',
                        Number(e.target.value)
                      )
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Weekly storage rate ($ / week)
                  </label>
                  <input
                    type="number"
                    value={activeLocationPricing.containerPrices.large_25m3.weeklyRate}
                    onChange={(e) =>
                      handleUpdateLocationContainerPrice(
                        selectedPricingHub,
                        'large_25m3',
                        'weeklyRate',
                        Number(e.target.value)
                      )
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Quick Location Delivery Fee Summary & Direct Editor (Zones A through E) */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="font-extrabold text-sm text-[#0b2942]">
                    {selectedPricingHub} Delivery Zones (A–E): KM Radii, Base Fees & Per-Km Rates
                  </h4>
                  <p className="text-xs text-slate-500">
                    Configure KM radii, base delivery fees, and optional additive per-km pricing for Zones A through E in {selectedPricingHub}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('zones')}
                  className="text-xs font-bold text-[#00c0f3] hover:underline cursor-pointer self-start sm:self-auto"
                >
                  Open Full Zones A–E & Km Editor →
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
                {/* Zone A */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-[#00c0f3] uppercase">Zone A (&lt;{activeLocationPricing.deliveryZones.zoneAMaxKm} km)</span>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] text-slate-500 block">Radius (&lt; km)</label>
                      <input
                        type="number"
                        value={activeLocationPricing.deliveryZones.zoneAMaxKm}
                        onChange={(e) =>
                          handleUpdateLocationDeliveryZones(selectedPricingHub, {
                            zoneAMaxKm: Number(e.target.value),
                          })
                        }
                        className="w-full px-2 py-1.5 rounded-lg border bg-white font-mono font-bold text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label className="text-[10px] text-slate-500 block">Base Fee ($)</label>
                        <input
                          type="number"
                          value={activeLocationPricing.deliveryZones.zoneABaseFee}
                          onChange={(e) =>
                            handleUpdateLocationDeliveryZones(selectedPricingHub, {
                              zoneABaseFee: Number(e.target.value),
                            })
                          }
                          className="w-full px-2 py-1.5 rounded-lg border bg-white font-mono font-bold text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 block">+/Km ($)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={activeLocationPricing.deliveryZones.zoneARatePerKm}
                          onChange={(e) =>
                            handleUpdateLocationDeliveryZones(selectedPricingHub, {
                              zoneARatePerKm: Number(e.target.value),
                            })
                          }
                          className="w-full px-2 py-1.5 rounded-lg border bg-white font-mono font-bold text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Zone B */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-[#00c0f3] uppercase">Zone B (&lt;{activeLocationPricing.deliveryZones.zoneBMaxKm} km)</span>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] text-slate-500 block">Radius (&lt; km)</label>
                      <input
                        type="number"
                        value={activeLocationPricing.deliveryZones.zoneBMaxKm}
                        onChange={(e) =>
                          handleUpdateLocationDeliveryZones(selectedPricingHub, {
                            zoneBMaxKm: Number(e.target.value),
                          })
                        }
                        className="w-full px-2 py-1.5 rounded-lg border bg-white font-mono font-bold text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label className="text-[10px] text-slate-500 block">Base Fee ($)</label>
                        <input
                          type="number"
                          value={activeLocationPricing.deliveryZones.zoneBBaseFee}
                          onChange={(e) =>
                            handleUpdateLocationDeliveryZones(selectedPricingHub, {
                              zoneBBaseFee: Number(e.target.value),
                            })
                          }
                          className="w-full px-2 py-1.5 rounded-lg border bg-white font-mono font-bold text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 block">+/Km ($)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={activeLocationPricing.deliveryZones.zoneBRatePerKm}
                          onChange={(e) =>
                            handleUpdateLocationDeliveryZones(selectedPricingHub, {
                              zoneBRatePerKm: Number(e.target.value),
                            })
                          }
                          className="w-full px-2 py-1.5 rounded-lg border bg-white font-mono font-bold text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Zone C */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-[#00c0f3] uppercase">Zone C (&lt;{activeLocationPricing.deliveryZones.zoneCMaxKm} km)</span>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] text-slate-500 block">Radius (&lt; km)</label>
                      <input
                        type="number"
                        value={activeLocationPricing.deliveryZones.zoneCMaxKm}
                        onChange={(e) =>
                          handleUpdateLocationDeliveryZones(selectedPricingHub, {
                            zoneCMaxKm: Number(e.target.value),
                          })
                        }
                        className="w-full px-2 py-1.5 rounded-lg border bg-white font-mono font-bold text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label className="text-[10px] text-slate-500 block">Base Fee ($)</label>
                        <input
                          type="number"
                          value={activeLocationPricing.deliveryZones.zoneCBaseFee}
                          onChange={(e) =>
                            handleUpdateLocationDeliveryZones(selectedPricingHub, {
                              zoneCBaseFee: Number(e.target.value),
                            })
                          }
                          className="w-full px-2 py-1.5 rounded-lg border bg-white font-mono font-bold text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 block">+/Km ($)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={activeLocationPricing.deliveryZones.zoneCRatePerKm}
                          onChange={(e) =>
                            handleUpdateLocationDeliveryZones(selectedPricingHub, {
                              zoneCRatePerKm: Number(e.target.value),
                            })
                          }
                          className="w-full px-2 py-1.5 rounded-lg border bg-white font-mono font-bold text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Zone D */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-[#00c0f3] uppercase">Zone D (&lt;{activeLocationPricing.deliveryZones.zoneDMaxKm} km)</span>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] text-slate-500 block">Radius (&lt; km)</label>
                      <input
                        type="number"
                        value={activeLocationPricing.deliveryZones.zoneDMaxKm}
                        onChange={(e) =>
                          handleUpdateLocationDeliveryZones(selectedPricingHub, {
                            zoneDMaxKm: Number(e.target.value),
                          })
                        }
                        className="w-full px-2 py-1.5 rounded-lg border bg-white font-mono font-bold text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label className="text-[10px] text-slate-500 block">Base Fee ($)</label>
                        <input
                          type="number"
                          value={activeLocationPricing.deliveryZones.zoneDBaseFee}
                          onChange={(e) =>
                            handleUpdateLocationDeliveryZones(selectedPricingHub, {
                              zoneDBaseFee: Number(e.target.value),
                            })
                          }
                          className="w-full px-2 py-1.5 rounded-lg border bg-white font-mono font-bold text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 block">+/Km ($)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={activeLocationPricing.deliveryZones.zoneDRatePerKm}
                          onChange={(e) =>
                            handleUpdateLocationDeliveryZones(selectedPricingHub, {
                              zoneDRatePerKm: Number(e.target.value),
                            })
                          }
                          className="w-full px-2 py-1.5 rounded-lg border bg-white font-mono font-bold text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Zone E */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-amber-600 uppercase">Zone E (&gt;{activeLocationPricing.deliveryZones.zoneDMaxKm} km)</span>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] text-slate-500 block">Threshold (&gt; Zone D km)</label>
                      <div className="px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-100 font-mono font-bold text-xs text-slate-600">
                        &gt; {activeLocationPricing.deliveryZones.zoneDMaxKm} km
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label className="text-[10px] text-slate-500 block">Base Fee ($)</label>
                        <input
                          type="number"
                          value={activeLocationPricing.deliveryZones.zoneEBaseFee}
                          onChange={(e) =>
                            handleUpdateLocationDeliveryZones(selectedPricingHub, {
                              zoneEBaseFee: Number(e.target.value),
                            })
                          }
                          className="w-full px-2 py-1.5 rounded-lg border bg-white font-mono font-bold text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 block">+/Km ($)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={activeLocationPricing.deliveryZones.zoneERatePerKm}
                          onChange={(e) =>
                            handleUpdateLocationDeliveryZones(selectedPricingHub, {
                              zoneERatePerKm: Number(e.target.value),
                            })
                          }
                          className="w-full px-2 py-1.5 rounded-lg border bg-white font-mono font-bold text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* All Locations Overview Matrix Table */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-3">
              <h4 className="font-extrabold text-sm text-[#0b2942]">
                All Locations Storage &amp; Delivery Zone (A–E) Matrix
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                      <th className="py-2 pr-3">Location Hub</th>
                      <th className="py-2 px-2">10 m³</th>
                      <th className="py-2 px-2">19 m³</th>
                      <th className="py-2 px-2">25 m³</th>
                      <th className="py-2 px-2">Zone A</th>
                      <th className="py-2 px-2">Zone B</th>
                      <th className="py-2 px-2">Zone C</th>
                      <th className="py-2 px-2">Zone D</th>
                      <th className="py-2 pl-2">Zone E</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ALL_ADMIN_HUBS.map((hubName) => {
                      const loc = getLocationPricingForHub(currentConfig, hubName);
                      const z = loc.deliveryZones;
                      return (
                        <tr
                          key={hubName}
                          onClick={() => setSelectedPricingHub(hubName)}
                          className={`cursor-pointer transition-colors ${
                            selectedPricingHub === hubName ? 'bg-[#FEBD69]/20 font-bold' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-2.5 pr-3 font-extrabold text-[#0b2942]">{hubName}</td>
                          <td className="py-2.5 px-2 font-mono">
                            ${loc.containerPrices.small_10m3.monthlyRate}/mo
                          </td>
                          <td className="py-2.5 px-2 font-mono">
                            ${loc.containerPrices.medium_19m3.monthlyRate}/mo
                          </td>
                          <td className="py-2.5 px-2 font-mono">
                            ${loc.containerPrices.large_25m3.monthlyRate}/mo
                          </td>
                          <td className="py-2.5 px-2 font-mono text-[#0b2942]">
                            &lt;{z.zoneAMaxKm}km: ${z.zoneABaseFee}{z.zoneARatePerKm > 0 ? `+${z.zoneARatePerKm}/km` : ''}
                          </td>
                          <td className="py-2.5 px-2 font-mono text-[#0b2942]">
                            &lt;{z.zoneBMaxKm}km: ${z.zoneBBaseFee}{z.zoneBRatePerKm > 0 ? `+${z.zoneBRatePerKm}/km` : ''}
                          </td>
                          <td className="py-2.5 px-2 font-mono text-[#0b2942]">
                            &lt;{z.zoneCMaxKm}km: ${z.zoneCBaseFee}{z.zoneCRatePerKm > 0 ? `+${z.zoneCRatePerKm}/km` : ''}
                          </td>
                          <td className="py-2.5 px-2 font-mono text-[#0b2942]">
                            &lt;{z.zoneDMaxKm}km: ${z.zoneDBaseFee}{z.zoneDRatePerKm > 0 ? `+${z.zoneDRatePerKm}/km` : ''}
                          </td>
                          <td className="py-2.5 pl-2 font-mono text-[#0b2942]">
                            &gt;{z.zoneDMaxKm}km: ${z.zoneEBaseFee}{z.zoneERatePerKm > 0 ? `+${z.zoneERatePerKm}/km` : ''}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Packing Supplies Pricing Settings */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4">
              <div>
                <h4 className="font-extrabold text-sm text-[#0b2942]">Packing Supplies & Blanket Rental Rates</h4>
                <p className="text-xs text-slate-500">
                  Set prices for moving cartons and protective blanket hire packages.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Boxes */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 space-y-2">
                  <h5 className="text-xs font-bold text-[#0b2942] uppercase tracking-wider">Heavy Duty Boxes</h5>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] text-slate-500 block">Single Box ($)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={currentConfig.packingSupplies.boxSinglePrice}
                        onChange={(e) =>
                          setCurrentConfig({
                            ...currentConfig,
                            packingSupplies: {
                              ...currentConfig.packingSupplies,
                              boxSinglePrice: Number(e.target.value),
                            },
                          })
                        }
                        className="w-full px-2 py-1 rounded-lg border font-mono font-bold text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block">10 Pack ($)</label>
                      <input
                        type="number"
                        value={currentConfig.packingSupplies.box10Price}
                        onChange={(e) =>
                          setCurrentConfig({
                            ...currentConfig,
                            packingSupplies: {
                              ...currentConfig.packingSupplies,
                              box10Price: Number(e.target.value),
                            },
                          })
                        }
                        className="w-full px-2 py-1 rounded-lg border font-mono font-bold text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block">50 Pack ($)</label>
                      <input
                        type="number"
                        value={currentConfig.packingSupplies.box50Price}
                        onChange={(e) =>
                          setCurrentConfig({
                            ...currentConfig,
                            packingSupplies: {
                              ...currentConfig.packingSupplies,
                              box50Price: Number(e.target.value),
                            },
                          })
                        }
                        className="w-full px-2 py-1 rounded-lg border font-mono font-bold text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block">100 Pack ($)</label>
                      <input
                        type="number"
                        value={currentConfig.packingSupplies.box100Price}
                        onChange={(e) =>
                          setCurrentConfig({
                            ...currentConfig,
                            packingSupplies: {
                              ...currentConfig.packingSupplies,
                              box100Price: Number(e.target.value),
                            },
                          })
                        }
                        className="w-full px-2 py-1 rounded-lg border font-mono font-bold text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Blankets */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 space-y-2">
                  <h5 className="text-xs font-bold text-[#0b2942] uppercase tracking-wider">Blanket Rental</h5>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] text-slate-500 block">Single Blanket ($)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={currentConfig.packingSupplies.blanketSinglePrice}
                        onChange={(e) =>
                          setCurrentConfig({
                            ...currentConfig,
                            packingSupplies: {
                              ...currentConfig.packingSupplies,
                              blanketSinglePrice: Number(e.target.value),
                            },
                          })
                        }
                        className="w-full px-2 py-1 rounded-lg border font-mono font-bold text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block">10 Pack ($)</label>
                      <input
                        type="number"
                        value={currentConfig.packingSupplies.blanket10Price}
                        onChange={(e) =>
                          setCurrentConfig({
                            ...currentConfig,
                            packingSupplies: {
                              ...currentConfig.packingSupplies,
                              blanket10Price: Number(e.target.value),
                            },
                          })
                        }
                        className="w-full px-2 py-1 rounded-lg border font-mono font-bold text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block">50 Pack ($)</label>
                      <input
                        type="number"
                        value={currentConfig.packingSupplies.blanket50Price}
                        onChange={(e) =>
                          setCurrentConfig({
                            ...currentConfig,
                            packingSupplies: {
                              ...currentConfig.packingSupplies,
                              blanket50Price: Number(e.target.value),
                            },
                          })
                        }
                        className="w-full px-2 py-1 rounded-lg border font-mono font-bold text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block">100 Pack ($)</label>
                      <input
                        type="number"
                        value={currentConfig.packingSupplies.blanket100Price}
                        onChange={(e) =>
                          setCurrentConfig({
                            ...currentConfig,
                            packingSupplies: {
                              ...currentConfig.packingSupplies,
                              blanket100Price: Number(e.target.value),
                            },
                          })
                        }
                        className="w-full px-2 py-1 rounded-lg border font-mono font-bold text-xs"
                      />
                    </div>
                  </div>

                  {/* Free Blankets Policy & Monthly Block Pricing */}
                  <div className="pt-2 border-t border-slate-200/60 space-y-2">
                    <span className="text-[10px] font-black uppercase text-[#0b2942] tracking-wider block">
                      Free Blanket Allowance &amp; Rental Blocks
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="text-[10px] text-slate-500 block">Free Blankets / Container</label>
                        <input
                          type="number"
                          min="0"
                          value={currentConfig.packingSupplies.freeBlanketsPerContainer ?? 10}
                          onChange={(e) =>
                            setCurrentConfig({
                              ...currentConfig,
                              packingSupplies: {
                                ...currentConfig.packingSupplies,
                                freeBlanketsPerContainer: Number(e.target.value),
                              },
                            })
                          }
                          className="w-full px-2 py-1 rounded-lg border font-mono font-bold text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 block">Price / 10 Block ($/mo)</label>
                        <input
                          type="number"
                          min="0"
                          value={currentConfig.packingSupplies.blanketBlockPriceMonthly ?? 25}
                          onChange={(e) =>
                            setCurrentConfig({
                              ...currentConfig,
                              packingSupplies: {
                                ...currentConfig.packingSupplies,
                                blanketBlockPriceMonthly: Number(e.target.value),
                              },
                            })
                          }
                          className="w-full px-2 py-1 rounded-lg border font-mono font-bold text-xs"
                        />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 pt-1 text-[11px] text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(currentConfig.packingSupplies.isAllBlanketsFreePromo)}
                        onChange={(e) =>
                          setCurrentConfig({
                            ...currentConfig,
                            packingSupplies: {
                              ...currentConfig.packingSupplies,
                              isAllBlanketsFreePromo: e.target.checked,
                            },
                          })
                        }
                        className="w-3.5 h-3.5 rounded text-emerald-600 accent-emerald-600"
                      />
                      <span className="font-bold text-emerald-800">
                        Promotional Incentive: Offer ALL blankets 100% Free
                      </span>
                    </label>
                  </div>
                </div>

                {/* Padlocks */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 space-y-2">
                  <h5 className="text-xs font-bold text-[#0b2942] uppercase tracking-wider">Heavy-Duty Padlocks</h5>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] text-slate-500 block">Padlock Price ($)</label>
                      <input
                        type="number"
                        min="0"
                        value={currentConfig.packingSupplies.lockPrice ?? 20}
                        onChange={(e) =>
                          setCurrentConfig({
                            ...currentConfig,
                            packingSupplies: {
                              ...currentConfig.packingSupplies,
                              lockPrice: Number(e.target.value),
                            },
                          })
                        }
                        className="w-full px-2 py-1 rounded-lg border font-mono font-bold text-xs"
                      />
                    </div>
                    <div className="flex flex-col justify-end">
                      <span className="text-[10px] text-slate-500 font-medium">
                        Discus stainless steel lock (anti-bolt cutter)
                      </span>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 pt-2 text-[11px] text-slate-700 cursor-pointer border-t border-slate-200/60">
                    <input
                      type="checkbox"
                      checked={Boolean(currentConfig.packingSupplies.isLockFreePromo)}
                      onChange={(e) =>
                        setCurrentConfig({
                          ...currentConfig,
                          packingSupplies: {
                            ...currentConfig.packingSupplies,
                            isLockFreePromo: e.target.checked,
                          },
                        })
                      }
                      className="w-3.5 h-3.5 rounded text-emerald-600 accent-emerald-600"
                    />
                    <span className="font-bold text-emerald-800">
                      Promotional Incentive: Free Padlock Included with Container
                    </span>
                  </label>
                </div>

                {/* Container Protection Option (CPO / Insurance) */}
                <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/30 space-y-2">
                  <h5 className="text-xs font-bold text-[#0b2942] uppercase tracking-wider flex items-center justify-between">
                    <span>Container Protection Option (CPO Insurance)</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                      Contents Cover
                    </span>
                  </h5>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] text-slate-500 block">Price / Container ($/mo)</label>
                      <input
                        type="number"
                        min="0"
                        value={currentConfig.insurance?.monthlyPricePerContainer ?? 15}
                        onChange={(e) =>
                          setCurrentConfig({
                            ...currentConfig,
                            insurance: {
                              ...(currentConfig.insurance || {
                                enabled: true,
                                monthlyPricePerContainer: 15,
                                isFreePromo: false,
                                coverageAmountPerContainer: 10000,
                              }),
                              monthlyPricePerContainer: Number(e.target.value),
                            },
                          })
                        }
                        className="w-full px-2 py-1 rounded-lg border font-mono font-bold text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block">Cover Amount / Container ($)</label>
                      <input
                        type="number"
                        min="1000"
                        step="1000"
                        value={currentConfig.insurance?.coverageAmountPerContainer ?? 10000}
                        onChange={(e) =>
                          setCurrentConfig({
                            ...currentConfig,
                            insurance: {
                              ...(currentConfig.insurance || {
                                enabled: true,
                                monthlyPricePerContainer: 15,
                                isFreePromo: false,
                                coverageAmountPerContainer: 10000,
                              }),
                              coverageAmountPerContainer: Number(e.target.value),
                            },
                          })
                        }
                        className="w-full px-2 py-1 rounded-lg border font-mono font-bold text-xs"
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 pt-2 text-[11px] text-slate-700 cursor-pointer border-t border-slate-200/60">
                    <input
                      type="checkbox"
                      checked={Boolean(currentConfig.insurance?.isFreePromo)}
                      onChange={(e) =>
                        setCurrentConfig({
                          ...currentConfig,
                          insurance: {
                            ...(currentConfig.insurance || {
                              enabled: true,
                              monthlyPricePerContainer: 15,
                              isFreePromo: false,
                              coverageAmountPerContainer: 10000,
                            }),
                            isFreePromo: e.target.checked,
                          },
                        })
                      }
                      className="w-3.5 h-3.5 rounded text-emerald-600 accent-emerald-600"
                    />
                    <span className="font-bold text-emerald-800">
                      Promotional Incentive: Offer Free Insurance to Incentivise Sales
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Zone A through E Leg Pricing Summary Card (replaces legacy Standard Domestic Transport Leg Fee) */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="font-extrabold text-sm text-[#0b2942]">
                    Zone A through E Transport Leg Fees ({selectedPricingHub})
                  </h4>
                  <p className="text-xs text-slate-500">
                    Every transport leg in the quote process (Initial delivery, Local move, Return to depot, Redelivery, Final collection) uses the customer's detected Zone A–E delivery fee (+ per-km surcharge).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('zones')}
                  className="px-3.5 py-1.5 rounded-xl bg-[#FF9900] hover:bg-[#e68a00] text-[#0b2942] border border-[#FEBD69] text-xs font-extrabold cursor-pointer transition-colors self-start sm:self-auto shrink-0"
                >
                  Open Delivery Zones &amp; Radii Editor →
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs pt-1">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-extrabold uppercase text-[#00c0f3] block">Zone A (&lt;{activeLocationPricing.deliveryZones.zoneAMaxKm} km)</span>
                  <div className="text-base font-black text-[#0b2942] font-mono mt-0.5">${activeLocationPricing.deliveryZones.zoneABaseFee}</div>
                  <span className="text-[10px] text-slate-500">+ ${activeLocationPricing.deliveryZones.zoneARatePerKm}/km</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-extrabold uppercase text-[#00c0f3] block">Zone B (&lt;{activeLocationPricing.deliveryZones.zoneBMaxKm} km)</span>
                  <div className="text-base font-black text-[#0b2942] font-mono mt-0.5">${activeLocationPricing.deliveryZones.zoneBBaseFee}</div>
                  <span className="text-[10px] text-slate-500">+ ${activeLocationPricing.deliveryZones.zoneBRatePerKm}/km</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-extrabold uppercase text-[#00c0f3] block">Zone C (&lt;{activeLocationPricing.deliveryZones.zoneCMaxKm} km)</span>
                  <div className="text-base font-black text-[#0b2942] font-mono mt-0.5">${activeLocationPricing.deliveryZones.zoneCBaseFee}</div>
                  <span className="text-[10px] text-slate-500">+ ${activeLocationPricing.deliveryZones.zoneCRatePerKm}/km</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-extrabold uppercase text-[#00c0f3] block">Zone D (&lt;{activeLocationPricing.deliveryZones.zoneDMaxKm} km)</span>
                  <div className="text-base font-black text-[#0b2942] font-mono mt-0.5">${activeLocationPricing.deliveryZones.zoneDBaseFee}</div>
                  <span className="text-[10px] text-slate-500">+ ${activeLocationPricing.deliveryZones.zoneDRatePerKm}/km</span>
                </div>
                <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200">
                  <span className="text-[10px] font-extrabold uppercase text-amber-700 block">Zone E (&gt;{activeLocationPricing.deliveryZones.zoneDMaxKm} km)</span>
                  <div className="text-base font-black text-[#0b2942] font-mono mt-0.5">${activeLocationPricing.deliveryZones.zoneEBaseFee}</div>
                  <span className="text-[10px] text-slate-500">+ ${activeLocationPricing.deliveryZones.zoneERatePerKm}/km</span>
                </div>
              </div>
            </div>

            {/* Daily Competitor Pricing Benchmark Card (Modular Container Benchmark) */}
            <div className="p-5 rounded-2xl border-2 border-sky-200 bg-sky-50/60 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-sky-200 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#00c0f3] text-white">
                    <TrendingDown className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-sky-800 bg-sky-100 px-2 py-0.5 rounded-full border border-sky-200">
                      Daily Automated Tariff Feed
                    </span>
                    <h4 className="font-extrabold text-sm text-[#0b2942] mt-0.5">
                      Competitor Pricing Benchmark (Modular Container Benchmark)
                    </h4>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-300">
                    <CheckCircle className="w-3 h-3 text-emerald-600" />
                    {competitorBenchmark.status}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSelectNavTab('competitor_pricing', 'Competitor Rates & Benchmarks')}
                    className="flex items-center gap-1.5 px-3 py-1 bg-[#15385E] hover:bg-[#0f2844] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                  >
                    <SlidersHorizontal className="w-3 h-3 text-[#F7D347]" />
                    <span>Open Competitor Editor</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleForceRefreshCompetitor}
                    className="flex items-center gap-1 px-3 py-1 bg-white hover:bg-sky-100 text-[#0b2942] rounded-xl text-xs font-bold border border-sky-300 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3 text-[#00c0f3]" />
                    <span>Re-verify</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Benchmark Service</span>
                  <div className="text-sm font-black text-[#0b2942] truncate" title={competitorBenchmark.competitorName}>
                    {competitorBenchmark.competitorName}
                  </div>
                  <span className="text-[10px] text-slate-500">Standard modular container</span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Delivery Fee per Box</span>
                  <div className="text-sm font-black text-[#0b2942] font-mono">${competitorBenchmark.deliveryFeePerContainer} AUD</div>
                  <span className="text-[10px] text-emerald-600 font-semibold">${competitorBenchmark.deliveryFeePerContainer} per leg (vs Portabox $149)</span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Modular Usable Capacity</span>
                  <div className="text-sm font-black text-[#0b2942] font-mono">{competitorBenchmark.containerVolumeM3} m³</div>
                  <span className="text-[10px] text-slate-500">${competitorBenchmark.monthlyStorageRatePerM3}/m³ monthly rate</span>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed bg-white/70 p-3 rounded-xl border border-sky-100">
                <strong>Why Portabox Saves Customers More:</strong> While smaller modular container competitors charge ${competitorBenchmark.deliveryFeePerContainer} per delivery leg, their boxes only hold ~{competitorBenchmark.containerVolumeM3} m³. A customer with 25 m³ needs {Math.ceil(25 / competitorBenchmark.containerVolumeM3)} modular containers ({Math.ceil(25 / competitorBenchmark.containerVolumeM3)} x ${competitorBenchmark.deliveryFeePerContainer} = ${Math.ceil(25 / competitorBenchmark.containerVolumeM3) * competitorBenchmark.deliveryFeePerContainer} in delivery fees), whereas Portabox needs only 1 full-size container ($149 level-lift delivery) — saving the customer ${Math.max(0, Math.ceil(25 / competitorBenchmark.containerVolumeM3) * competitorBenchmark.deliveryFeePerContainer - 149)} in delivery charges alone!
              </p>
            </div>
          </div>
        )}

        {/* ================= TAB 3: DELIVERY ZONES & KM CHARGES ================= */}
        {activeTab === 'zones' && (
          <div className="space-y-6 max-w-4xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-extrabold text-[#0b2942]">
                  Delivery Zones & Moving Km Surcharges
                </h3>
                <p className="text-xs text-slate-500">
                  Configure distance thresholds from the Portabox depots, base delivery prices per zone, and additive rate per km (calculated on a one-way basis).
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleApplyDeliveryZonesToAllLocations(selectedPricingHub)}
                className="px-3.5 py-2 rounded-xl bg-[#FF9900] hover:bg-[#e68a00] text-[#0b2942] border border-[#FEBD69] text-xs font-extrabold cursor-pointer transition-colors shadow-2xs shrink-0"
              >
                Copy {selectedPricingHub} Zone Prices to All Locations
              </button>
            </div>

            {/* Location Selector for Delivery Zones */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-[#0b2942] flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#00c0f3]" />
                  <span>Select Depot Location to Configure Delivery Zones & Base Fees:</span>
                </span>
                <span className="text-[11px] font-bold text-slate-500">
                  Editing: <strong className="text-[#0b2942]">{activeLocationPricing.depotName}</strong>
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {ALL_ADMIN_HUBS.map((hubName) => {
                  const isSelected = selectedPricingHub === hubName;
                  return (
                    <button
                      key={hubName}
                      type="button"
                      onClick={() => setSelectedPricingHub(hubName)}
                      className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
                        isSelected
                          ? 'bg-[#FF9900] text-[#0b2942] border-2 border-[#FEBD69] shadow-xs'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <MapPin className={`w-3.5 h-3.5 ${isSelected ? 'text-[#0b2942]' : 'text-[#00c0f3]'}`} />
                      <span>{hubName}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              {/* Zone A */}
              <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-extrabold text-[#00c0f3] uppercase tracking-wider">Zone A</span>
                  <h4 className="font-extrabold text-base text-[#0b2942]">Inner Metro Radius (&lt; {activeLocationPricing.deliveryZones.zoneAMaxKm} km)</h4>
                  <p className="text-xs text-slate-500">Default &lt; 25 km radius · Base delivery fee + optional additive per-km rate</p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="text-right">
                    <label className="text-[10px] font-semibold text-slate-400 block mb-1">Zone A Radius (&lt; km)</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        value={activeLocationPricing.deliveryZones.zoneAMaxKm}
                        onChange={(e) =>
                          handleUpdateLocationDeliveryZones(selectedPricingHub, {
                            zoneAMaxKm: Number(e.target.value),
                          })
                        }
                        className="w-20 px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-bold font-mono"
                      />
                      <span className="text-xs text-slate-500 font-semibold">km</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <label className="text-[10px] font-semibold text-slate-400 block mb-1">Base Delivery Fee</label>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-slate-700">$</span>
                      <input
                        type="number"
                        value={activeLocationPricing.deliveryZones.zoneABaseFee}
                        onChange={(e) =>
                          handleUpdateLocationDeliveryZones(selectedPricingHub, {
                            zoneABaseFee: Number(e.target.value),
                          })
                        }
                        className="w-20 px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-bold font-mono"
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <label className="text-[10px] font-semibold text-slate-400 block mb-1">+ Rate / Km</label>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-slate-700">$</span>
                      <input
                        type="number"
                        step="0.1"
                        value={activeLocationPricing.deliveryZones.zoneARatePerKm}
                        onChange={(e) =>
                          handleUpdateLocationDeliveryZones(selectedPricingHub, {
                            zoneARatePerKm: Number(e.target.value),
                          })
                        }
                        className="w-20 px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-bold font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Zone B */}
              <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-extrabold text-[#00c0f3] uppercase tracking-wider">Zone B</span>
                  <h4 className="font-extrabold text-base text-[#0b2942]">Metro Radius (&lt; {activeLocationPricing.deliveryZones.zoneBMaxKm} km)</h4>
                  <p className="text-xs text-slate-500">Default &lt; 50 km radius ({activeLocationPricing.deliveryZones.zoneAMaxKm}–{activeLocationPricing.deliveryZones.zoneBMaxKm} km) · Base delivery fee + optional per-km rate</p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="text-right">
                    <label className="text-[10px] font-semibold text-slate-400 block mb-1">Zone B Radius (&lt; km)</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        value={activeLocationPricing.deliveryZones.zoneBMaxKm}
                        onChange={(e) =>
                          handleUpdateLocationDeliveryZones(selectedPricingHub, {
                            zoneBMaxKm: Number(e.target.value),
                          })
                        }
                        className="w-20 px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-bold font-mono"
                      />
                      <span className="text-xs text-slate-500 font-semibold">km</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <label className="text-[10px] font-semibold text-slate-400 block mb-1">Base Delivery Fee</label>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-slate-700">$</span>
                      <input
                        type="number"
                        value={activeLocationPricing.deliveryZones.zoneBBaseFee}
                        onChange={(e) =>
                          handleUpdateLocationDeliveryZones(selectedPricingHub, {
                            zoneBBaseFee: Number(e.target.value),
                          })
                        }
                        className="w-20 px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-bold font-mono"
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <label className="text-[10px] font-semibold text-slate-400 block mb-1">+ Rate / Km</label>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-slate-700">$</span>
                      <input
                        type="number"
                        step="0.1"
                        value={activeLocationPricing.deliveryZones.zoneBRatePerKm}
                        onChange={(e) =>
                          handleUpdateLocationDeliveryZones(selectedPricingHub, {
                            zoneBRatePerKm: Number(e.target.value),
                          })
                        }
                        className="w-20 px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-bold font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Zone C */}
              <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-extrabold text-[#00c0f3] uppercase tracking-wider">Zone C</span>
                  <h4 className="font-extrabold text-base text-[#0b2942]">Outer Metro Radius (&lt; {activeLocationPricing.deliveryZones.zoneCMaxKm} km)</h4>
                  <p className="text-xs text-slate-500">Default &lt; 75 km radius ({activeLocationPricing.deliveryZones.zoneBMaxKm}–{activeLocationPricing.deliveryZones.zoneCMaxKm} km) · Base delivery fee + optional per-km rate</p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="text-right">
                    <label className="text-[10px] font-semibold text-slate-400 block mb-1">Zone C Radius (&lt; km)</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        value={activeLocationPricing.deliveryZones.zoneCMaxKm}
                        onChange={(e) =>
                          handleUpdateLocationDeliveryZones(selectedPricingHub, {
                            zoneCMaxKm: Number(e.target.value),
                          })
                        }
                        className="w-20 px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-bold font-mono"
                      />
                      <span className="text-xs text-slate-500 font-semibold">km</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <label className="text-[10px] font-semibold text-slate-400 block mb-1">Base Delivery Fee</label>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-slate-700">$</span>
                      <input
                        type="number"
                        value={activeLocationPricing.deliveryZones.zoneCBaseFee}
                        onChange={(e) =>
                          handleUpdateLocationDeliveryZones(selectedPricingHub, {
                            zoneCBaseFee: Number(e.target.value),
                          })
                        }
                        className="w-20 px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-bold font-mono"
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <label className="text-[10px] font-semibold text-slate-400 block mb-1">+ Rate / Km</label>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-slate-700">$</span>
                      <input
                        type="number"
                        step="0.1"
                        value={activeLocationPricing.deliveryZones.zoneCRatePerKm}
                        onChange={(e) =>
                          handleUpdateLocationDeliveryZones(selectedPricingHub, {
                            zoneCRatePerKm: Number(e.target.value),
                          })
                        }
                        className="w-20 px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-bold font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Zone D */}
              <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-extrabold text-[#00c0f3] uppercase tracking-wider">Zone D</span>
                  <h4 className="font-extrabold text-base text-[#0b2942]">Semi-Rural &amp; Regional Radius (&lt; {activeLocationPricing.deliveryZones.zoneDMaxKm} km)</h4>
                  <p className="text-xs text-slate-500">Default &lt; 100 km radius ({activeLocationPricing.deliveryZones.zoneCMaxKm}–{activeLocationPricing.deliveryZones.zoneDMaxKm} km) · Base delivery fee + optional per-km rate</p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="text-right">
                    <label className="text-[10px] font-semibold text-slate-400 block mb-1">Zone D Radius (&lt; km)</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        value={activeLocationPricing.deliveryZones.zoneDMaxKm}
                        onChange={(e) =>
                          handleUpdateLocationDeliveryZones(selectedPricingHub, {
                            zoneDMaxKm: Number(e.target.value),
                          })
                        }
                        className="w-20 px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-bold font-mono"
                      />
                      <span className="text-xs text-slate-500 font-semibold">km</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <label className="text-[10px] font-semibold text-slate-400 block mb-1">Base Delivery Fee</label>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-slate-700">$</span>
                      <input
                        type="number"
                        value={activeLocationPricing.deliveryZones.zoneDBaseFee}
                        onChange={(e) =>
                          handleUpdateLocationDeliveryZones(selectedPricingHub, {
                            zoneDBaseFee: Number(e.target.value),
                          })
                        }
                        className="w-20 px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-bold font-mono"
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <label className="text-[10px] font-semibold text-slate-400 block mb-1">+ Rate / Km</label>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-slate-700">$</span>
                      <input
                        type="number"
                        step="0.1"
                        value={activeLocationPricing.deliveryZones.zoneDRatePerKm}
                        onChange={(e) =>
                          handleUpdateLocationDeliveryZones(selectedPricingHub, {
                            zoneDRatePerKm: Number(e.target.value),
                          })
                        }
                        className="w-20 px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-bold font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Zone E */}
              <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-extrabold text-amber-600 uppercase tracking-wider">
                    Zone E (&gt; {activeLocationPricing.deliveryZones.zoneDMaxKm} km)
                  </span>
                  <h4 className="font-extrabold text-base text-[#0b2942]">Extended Regional (&gt; {activeLocationPricing.deliveryZones.zoneDMaxKm} km)</h4>
                  <p className="text-xs text-slate-500">
                    Routes over {activeLocationPricing.deliveryZones.zoneDMaxKm} km (threshold controlled by Zone D radius) · Base fee + optional per-km rate or Call for Custom Pricing
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="text-right">
                    <label className="text-[10px] font-semibold text-slate-400 block mb-1">Base Delivery Fee</label>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-slate-700">$</span>
                      <input
                        type="number"
                        value={activeLocationPricing.deliveryZones.zoneEBaseFee}
                        onChange={(e) =>
                          handleUpdateLocationDeliveryZones(selectedPricingHub, {
                            zoneEBaseFee: Number(e.target.value),
                          })
                        }
                        className="w-20 px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-bold font-mono"
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <label className="text-[10px] font-semibold text-slate-400 block mb-1">+ Rate / Km</label>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-slate-700">$</span>
                      <input
                        type="number"
                        step="0.1"
                        value={activeLocationPricing.deliveryZones.zoneERatePerKm}
                        onChange={(e) =>
                          handleUpdateLocationDeliveryZones(selectedPricingHub, {
                            zoneERatePerKm: Number(e.target.value),
                          })
                        }
                        className="w-20 px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-bold font-mono"
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer pt-3">
                    <input
                      type="checkbox"
                      checked={activeLocationPricing.deliveryZones.zoneECallPricing}
                      onChange={(e) =>
                        handleUpdateLocationDeliveryZones(selectedPricingHub, {
                          zoneECallPricing: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded text-[#00c0f3]"
                    />
                    <span className="text-xs font-bold text-slate-700">Call Pricing Prompt</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Fuel Surcharge / Fuel Levy Configuration - Flexible: Fixed per leg by zones OR per km travelled */}
            <div className="p-5 rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50/90 via-sky-50/50 to-white space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-blue-100">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Truck className="w-5 h-5 text-blue-600" />
                    <h4 className="text-sm font-extrabold text-blue-950">
                      Fuel Levy / Surcharge Policy &amp; Calculation Model
                    </h4>
                  </div>
                  <p className="text-xs text-blue-900/80 max-w-2xl leading-relaxed">
                    Set fuel levy as a <strong>fixed price per leg based on delivery zones</strong> or <strong>per kilometer ($/km)</strong>. Non-optional for customers; strictly controlled by Portabox admin.
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer self-start sm:self-auto bg-white px-3 py-1.5 rounded-xl border border-blue-200 shadow-2xs">
                  <input
                    type="checkbox"
                    checked={currentConfig.fuelSurchargeEnabled !== false}
                    onChange={(e) =>
                      setCurrentConfig({
                        ...currentConfig,
                        fuelSurchargeEnabled: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-black text-blue-950">Active in Quotes</span>
                </label>
              </div>

              {/* Model Selector Toggle: Fixed per leg based on zones vs Per km */}
              <div className="space-y-2">
                <label className="block text-xs font-black uppercase tracking-wider text-blue-900">
                  Select Pricing Method:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentConfig({
                        ...currentConfig,
                        fuelSurchargeModel: 'per_zone',
                        fuelSurchargeZoneRates: currentConfig.fuelSurchargeZoneRates || { ...DEFAULT_FUEL_SURCHARGE_ZONE_RATES },
                      })
                    }
                    className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-1 shadow-2xs ${
                      (currentConfig.fuelSurchargeModel || 'per_km') === 'per_zone'
                        ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                        : 'border-blue-200 bg-white hover:border-blue-300 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black">
                        Option 1: Fixed Price per Leg by Zone
                      </span>
                      {(currentConfig.fuelSurchargeModel || 'per_km') === 'per_zone' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-blue-900">
                          Active
                        </span>
                      )}
                    </div>
                    <p className={`text-[11px] leading-relaxed ${
                      (currentConfig.fuelSurchargeModel || 'per_km') === 'per_zone' ? 'text-blue-100' : 'text-slate-500'
                    }`}>
                      Charge a set flat fuel levy per container per leg according to Zone A, B, C, D, or E.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setCurrentConfig({
                        ...currentConfig,
                        fuelSurchargeModel: 'per_km',
                      })
                    }
                    className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-1 shadow-2xs ${
                      (currentConfig.fuelSurchargeModel || 'per_km') === 'per_km'
                        ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                        : 'border-blue-200 bg-white hover:border-blue-300 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black">
                        Option 2: Per Kilometer ($/km)
                      </span>
                      {(currentConfig.fuelSurchargeModel || 'per_km') === 'per_km' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-blue-900">
                          Active
                        </span>
                      )}
                    </div>
                    <p className={`text-[11px] leading-relaxed ${
                      (currentConfig.fuelSurchargeModel || 'per_km') === 'per_km' ? 'text-blue-100' : 'text-slate-500'
                    }`}>
                      Charge dynamic diesel surcharge based on actual road driving distance for that leg.
                    </p>
                  </button>
                </div>
              </div>

              {/* Dynamic Sub-Settings depending on selected model */}
              {(currentConfig.fuelSurchargeModel || 'per_km') === 'per_zone' ? (
                /* ZONE FIXED RATES INPUT GRID */
                <div className="p-4 rounded-xl bg-white border border-blue-200 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-extrabold text-blue-950">
                      Fixed Fuel Levy by Delivery Zone ($ AUD per container per leg):
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentConfig({
                          ...currentConfig,
                          fuelSurchargeZoneRates: { ...DEFAULT_FUEL_SURCHARGE_ZONE_RATES },
                        })
                      }
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                    >
                      Reset Zone Defaults (A:$15, B:$25, C:$35, D:$45, E:$60)
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {(['A', 'B', 'C', 'D', 'E'] as const).map((z) => {
                      const currentRates = currentConfig.fuelSurchargeZoneRates || DEFAULT_FUEL_SURCHARGE_ZONE_RATES;
                      return (
                        <div key={z} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-[#15385E]">Zone {z}</span>
                            <span className="text-[10px] font-semibold text-slate-500">
                              {z === 'A' ? '<25km' : z === 'B' ? '25-50km' : z === 'C' ? '50-75km' : z === 'D' ? '75-100km' : '>100km'}
                            </span>
                          </div>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1.5 text-xs font-bold text-slate-400">$</span>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={currentRates[z] !== undefined ? currentRates[z] : DEFAULT_FUEL_SURCHARGE_ZONE_RATES[z]}
                              onChange={(e) => {
                                const val = Math.max(0, parseFloat(e.target.value) || 0);
                                setCurrentConfig({
                                  ...currentConfig,
                                  fuelSurchargeZoneRates: {
                                    ...DEFAULT_FUEL_SURCHARGE_ZONE_RATES,
                                    ...(currentConfig.fuelSurchargeZoneRates || {}),
                                    [z]: val,
                                  },
                                });
                              }}
                              className="w-full pl-6 pr-2 py-1 text-xs font-bold font-mono rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900"
                            />
                          </div>
                          <span className="text-[10px] text-slate-400 block text-center">/ container / leg</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* PER-KM RATE INPUT */
                <div className="p-4 rounded-xl bg-white border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <label className="text-xs font-extrabold text-blue-950 block">
                      Per-Kilometer Distance Fuel Rate:
                    </label>
                    <span className="text-[11px] text-slate-500">
                      Multiplied by road driving distance for that leg.
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative w-32">
                      <span className="absolute left-3 top-2 text-xs font-bold text-blue-400">$</span>
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        value={currentConfig.fuelSurchargeRatePerKm !== undefined ? currentConfig.fuelSurchargeRatePerKm : 0.50}
                        onChange={(e) =>
                          setCurrentConfig({
                            ...currentConfig,
                            fuelSurchargeRatePerKm: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full pl-6 pr-3 py-2 text-xs font-bold font-mono rounded-lg border border-blue-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-950"
                      />
                    </div>
                    <span className="text-xs font-bold text-blue-900">/ km travelled</span>
                  </div>
                </div>
              )}

              {/* Policy Rules & Automatic Enforcement Notice */}
              <div className="p-3.5 rounded-xl bg-blue-100/70 border border-blue-200 text-xs text-blue-950 space-y-1.5">
                <div className="font-extrabold flex items-center gap-1.5 text-blue-900">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Portabox Fuel Levy Policy Rules (Automated in Customer Quotes):</span>
                </div>
                <ul className="space-y-1 text-[11px] text-blue-900/90 pl-5 list-disc leading-relaxed">
                  <li>
                    <strong>Deferred on Future Legs:</strong> Fuel levy is <em>not charged upfront</em> for planned future deliveries or final pick-ups until they actually occur.
                  </li>
                  <li>
                    <strong>Initial Upfront Leg:</strong> Only the initial delivery leg (empty container dispatch) includes fuel levy in the first payment total.
                  </li>
                  <li>
                    <strong>Interstate Moves:</strong> Container is returned to the <strong>destination Portabox location</strong> and the fuel levy is calculated based on this one-way transit distance / destination zone (not return/round-trip distance), deferred until collection occurs.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 4: INTERSTATE LEGS ================= */}
        {activeTab === 'interstate' && (
          <div className="space-y-6 max-w-5xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-extrabold text-[#0b2942]">
                  Interstate Freight Legs by Container Size (One-way)
                </h3>
                <p className="text-xs text-slate-500">
                  Configure line-haul interstate transit pricing per container size (Small 10 m³, Medium 19 m³, and Large 25 m³) between major Australian capitals and coastal corridors.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-4">Interstate Route Corridor</th>
                    <th className="py-3.5 px-4">Small · 10 m³ ($)</th>
                    <th className="py-3.5 px-4">Medium · 19 m³ ($)</th>
                    <th className="py-3.5 px-4">Large · 25 m³ ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Object.keys(currentConfig.interstateRates).map((route) => {
                    const fallbackLarge = currentConfig.interstateRates[route] || 2290;
                    const sizeEntry = currentConfig.interstateRatesBySize?.[route] || {
                      small_10m3: Math.round((fallbackLarge * 0.72) / 10) * 10,
                      medium_19m3: Math.round((fallbackLarge * 0.86) / 10) * 10,
                      large_25m3: fallbackLarge,
                    };

                    const handleSizeRateChange = (
                      sizeField: 'small_10m3' | 'medium_19m3' | 'large_25m3',
                      val: number
                    ) => {
                      const nextEntry = {
                        ...sizeEntry,
                        [sizeField]: val,
                      };
                      setCurrentConfig({
                        ...currentConfig,
                        interstateRates: {
                          ...currentConfig.interstateRates,
                          ...(sizeField === 'large_25m3' ? { [route]: val } : {}),
                        },
                        interstateRatesBySize: {
                          ...(currentConfig.interstateRatesBySize || {}),
                          [route]: nextEntry,
                        },
                      });
                    };

                    return (
                      <tr key={route} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Truck className="w-4 h-4 text-[#00c0f3] shrink-0" />
                            <span className="font-extrabold text-[#0b2942] text-xs">
                              {route.replace('->', ' → ')}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-slate-500">$</span>
                            <input
                              type="number"
                              value={sizeEntry.small_10m3}
                              onChange={(e) =>
                                handleSizeRateChange('small_10m3', Number(e.target.value))
                              }
                              className="w-24 px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-bold font-mono text-[#0b2942] focus:outline-none focus:ring-2 focus:ring-[#00c0f3]"
                            />
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-slate-500">$</span>
                            <input
                              type="number"
                              value={sizeEntry.medium_19m3}
                              onChange={(e) =>
                                handleSizeRateChange('medium_19m3', Number(e.target.value))
                              }
                              className="w-24 px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-bold font-mono text-[#0b2942] focus:outline-none focus:ring-2 focus:ring-[#00c0f3]"
                            />
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-slate-500">$</span>
                            <input
                              type="number"
                              value={sizeEntry.large_25m3}
                              onChange={(e) =>
                                handleSizeRateChange('large_25m3', Number(e.target.value))
                              }
                              className="w-24 px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-bold font-mono text-[#0b2942] focus:outline-none focus:ring-2 focus:ring-[#00c0f3]"
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 5: PROMOTIONS ENGINE ================= */}
        {activeTab === 'promotions' && (
          <div className="space-y-6">
            {/* Eco Efficiency Discount & Carbon Incentive Control Card */}
            <div className="p-6 rounded-3xl bg-linear-to-br from-emerald-50/90 via-sky-50/60 to-white border-2 border-emerald-300 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-200/70 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-lg shadow-sm shrink-0">
                    <Leaf className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                      Eco-Route & Logistics Incentive Engine
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-[#0b2942] mt-0.5">
                      Efficiency Discount & Carbon Reduction Incentive
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                    Current Mode:
                  </span>
                  <span className={`px-2.5 py-1 rounded-xl text-xs font-black uppercase tracking-wider ${
                    (currentConfig.ecoIncentiveType || 'dollar_discount') === 'dollar_discount'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-indigo-600 text-white shadow-2xs'
                  }`}>
                    {(currentConfig.ecoIncentiveType || 'dollar_discount') === 'dollar_discount'
                      ? `Dollar Discount (${currentConfig.efficiencyDiscountPercentage ?? 20}%)`
                      : 'Emissions Only (No $ Discount)'}
                  </span>
                </div>
              </div>

              {/* Incentive Type Selector: Dollar Discount vs Emissions Only */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Select Customer Incentive Structure for Eco-Clustered Delivery Windows:
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* Mode 1: Dollar Discount + Emissions */}
                  <div
                    onClick={() => handleUpdateEcoIncentiveType('dollar_discount')}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                      (currentConfig.ecoIncentiveType || 'dollar_discount') === 'dollar_discount'
                        ? 'border-emerald-500 bg-white ring-2 ring-emerald-200 shadow-xs'
                        : 'border-slate-200 bg-white/70 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-extrabold text-sm text-[#0b2942] flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-emerald-600" />
                        Eco Efficiency Discount
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                        Has Dollar Discount
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Passes <strong className="text-emerald-700">{currentConfig.efficiencyDiscountPercentage ?? 20}%</strong> of fleet logistics savings directly to customer quotes as an instant AUD discount, alongside calculating CO₂ emissions saved.
                    </p>
                  </div>

                  {/* Mode 2: Emissions Reduction Only */}
                  <div
                    onClick={() => handleUpdateEcoIncentiveType('emissions_only')}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                      currentConfig.ecoIncentiveType === 'emissions_only'
                        ? 'border-indigo-500 bg-white ring-2 ring-indigo-200 shadow-xs'
                        : 'border-slate-200 bg-white/70 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-extrabold text-sm text-[#0b2942] flex items-center gap-2">
                        <Leaf className="w-4 h-4 text-indigo-600" />
                        Emissions Reduction Recognition
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full border border-indigo-300">
                        No Dollar Discount ($0)
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Promotes eco-friendly delivery clustering and presents calculated kilograms of CO₂ prevented with horizontal level-lift delivery, <strong className="text-indigo-700">without deducting any dollar discount</strong>.
                    </p>
                  </div>
                </div>
              </div>

              {/* Efficiency Discount Percentage Slider & Number Input */}
              <div className="p-4 rounded-2xl bg-white border border-emerald-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="text-xs font-black text-[#0b2942] block">
                      Efficiency Discount Percentage (Share of Fleet Savings)
                    </label>
                    <span className="text-[11px] text-slate-500">
                      Determines the portion of gross route clustering savings (~$160 baseline) passed to the customer.
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={currentConfig.efficiencyDiscountPercentage ?? 20}
                      onChange={(e) => handleUpdateEfficiencyDiscount(Number(e.target.value))}
                      className="w-20 px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50/50 text-sm font-black font-mono text-center text-[#0b2942]"
                    />
                    <span className="text-sm font-black text-slate-600">%</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={5}
                    max={50}
                    step={1}
                    value={currentConfig.efficiencyDiscountPercentage ?? 20}
                    onChange={(e) => handleUpdateEfficiencyDiscount(Number(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Quick Presets:</span>
                  {[10, 15, 20, 25, 30, 40].map((presetPct) => (
                    <button
                      key={presetPct}
                      type="button"
                      onClick={() => handleUpdateEfficiencyDiscount(presetPct)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        (currentConfig.efficiencyDiscountPercentage ?? 20) === presetPct
                          ? 'bg-emerald-600 text-white shadow-2xs font-extrabold'
                          : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-800'
                      }`}
                    >
                      {presetPct}% (${Math.round(160 * (presetPct / 100))})
                    </button>
                  ))}
                </div>
              </div>

              {/* Exclusivity & Stacking Policy Notice */}
              <div className="p-4 rounded-2xl bg-linear-to-r from-sky-50 to-indigo-50/70 border border-sky-200/80 text-xs text-slate-800 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">🏷️</span>
                  <strong className="font-extrabold text-[#0b2942] text-sm">Flexible Discount Coding & Exclusivity Governance</strong>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 rounded-xl bg-white/90 border border-amber-200/80 shadow-2xs">
                    <span className="font-bold text-amber-900 flex items-center gap-1.5 text-xs">
                      <Lock className="w-3.5 h-3.5 text-amber-600" />
                      Code Exclusive (Sole Promotion)
                    </span>
                    <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                      Strictly sole promotion. When applied to a quote, all automatic duration discounts and other promo codes are replaced/suppressed so no double-dipping occurs.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/90 border border-blue-200/80 shadow-2xs">
                    <span className="font-bold text-blue-900 flex items-center gap-1.5 text-xs">
                      <Unlock className="w-3.5 h-3.5 text-blue-600" />
                      Code Not Exclusive (Stackable)
                    </span>
                    <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                      Permits stacking. Stacks seamlessly on top of standard long-term duration discounts and automatic logistics incentives.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Header, Search & Filter Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-extrabold text-[#0b2942] flex items-center gap-2">
                  <span>Discount Coding Engine</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-100 text-slate-700">
                    {currentConfig.promotions.length} Total
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure discount codes targetable by Portabox location, service type, container size, and code exclusivity.
                </p>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setIsFloatingCopilotOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-900 text-xs font-black transition-all cursor-pointer border border-purple-300"
                >
                  <Bot className="w-4 h-4 text-purple-700" />
                  <span>Chat with Copilot</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsGeminiPromoOpen(!isGeminiPromoOpen)}
                  className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-black transition-all shadow-xs cursor-pointer ${
                    isGeminiPromoOpen
                      ? 'bg-purple-700 text-white shadow-purple-200'
                      : 'bg-linear-to-r from-purple-600 via-indigo-600 to-sky-600 hover:from-purple-700 hover:to-sky-700 text-white'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Created in Gem (AI Assistant)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditingPromoId(null);
                    setNewPromo({
                      name: '',
                      code: '',
                      description: '',
                      type: 'percent_off_first_month',
                      value: 20,
                      targetLocations: ['All'],
                      serviceTypes: ['storage_onsite', 'storage_portabox_site', 'local_moving', 'interstate_moving'],
                      containerSize: 'all',
                      isExclusive: false,
                      active: true,
                      autoApply: false,
                    });
                    setIsAddingPromo(!isAddingPromo);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-[#00c0f3] hover:bg-[#00a6d2] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isAddingPromo ? 'Close Form' : 'Manual Code Creator'}</span>
                </button>
              </div>
            </div>

            {/* Gemini AI Campaign Generator ("Created in Gem") */}
            {isGeminiPromoOpen && (
              <div className="p-5 rounded-3xl bg-linear-to-br from-purple-900 via-indigo-900 to-[#0b2942] text-white shadow-lg space-y-4 border border-purple-500/30 animate-in fade-in duration-200">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-linear-to-tr from-amber-400 to-purple-400 flex items-center justify-center text-purple-950 font-black shadow-md shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400 text-purple-950 px-2 py-0.5 rounded-full">
                          Created in Gem
                        </span>
                        <span className="text-xs text-purple-200 font-semibold">Gemini 3.8 Flash Engine</span>
                      </div>
                      <h4 className="text-base font-black text-white mt-0.5">
                        Natural Language Discount Code Creator
                      </h4>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsGeminiPromoOpen(false)}
                    className="p-1.5 text-purple-300 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-purple-200/90 leading-relaxed">
                  Describe the campaign you want in plain Australian English. Gemini will automatically extract the Portabox location (Adelaide, Melbourne, etc.), service type (onsite, portabox depot, local, interstate), container size (10ft, 20ft, all), and exclusivity rules.
                </p>

                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    type="text"
                    value={geminiPromoPrompt}
                    onChange={(e) => setGeminiPromoPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isGeneratingGeminiPromo) {
                        handleGenerateGeminiDiscount();
                      }
                    }}
                    placeholder="e.g. Create a 25% exclusive discount for onsite storage in Adelaide for 20ft container, code ADEL20ONSITE"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-purple-300/60 text-xs font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={isGeneratingGeminiPromo || !geminiPromoPrompt.trim()}
                    onClick={() => handleGenerateGeminiDiscount()}
                    className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-purple-950 rounded-xl text-xs font-black shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                  >
                    {isGeneratingGeminiPromo ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Generate with Gem</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Quick Prompts */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300">Quick Presets:</span>
                  {[
                    'Melbourne 20ft exclusive 20% discount code MELB20EXCL',
                    'Adelaide onsite storage $50 off for 20ft container',
                    'Interstate moves 15% discount code INTERSTATE15 (Sydney & Brisbane)',
                    'Free initial delivery code FREEDEL (All locations, non-exclusive)',
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setGeminiPromoPrompt(preset);
                        handleGenerateGeminiDiscount(preset);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-[11px] text-purple-100 font-medium transition-colors cursor-pointer"
                    >
                      {preset.split(' code ')[0]}
                    </button>
                  ))}
                </div>

                {geminiPromoMessage && (
                  <div
                    className={`p-3 rounded-xl text-xs font-bold border ${
                      geminiPromoMessage.type === 'success'
                        ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
                        : 'bg-red-500/20 border-red-400/50 text-red-200'
                    }`}
                  >
                    {geminiPromoMessage.text}
                  </div>
                )}
              </div>
            )}

            {/* Status Tabs & Search Filter */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto">
                {(['all', 'active', 'inactive', 'exclusive'] as const).map((tab) => {
                  const count =
                    tab === 'all'
                      ? currentConfig.promotions.length
                      : tab === 'active'
                      ? currentConfig.promotions.filter((p) => p.active).length
                      : tab === 'inactive'
                      ? currentConfig.promotions.filter((p) => !p.active).length
                      : currentConfig.promotions.filter((p) => p.isExclusive).length;
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setPromoFilterStatus(tab)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all capitalize whitespace-nowrap cursor-pointer ${
                        promoFilterStatus === tab
                          ? 'bg-white text-[#0b2942] shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tab} <span className="text-[10px] font-mono opacity-60">({count})</span>
                    </button>
                  );
                })}
              </div>

              <div className="relative flex-1 sm:max-w-xs">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search code, name, or location..."
                  value={promoSearchQuery}
                  onChange={(e) => setPromoSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-[#00c0f3] focus:outline-none"
                />
              </div>
            </div>

            {/* Create / Edit Discount Code Drawer */}
            {isAddingPromo && (
              <div className="p-6 rounded-3xl bg-linear-to-br from-sky-50/90 via-white to-slate-50 border-2 border-sky-300 shadow-sm space-y-5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-sky-200/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#00c0f3] text-white flex items-center justify-center font-bold">
                      <Tag className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-[#0b2942]">
                        {editingPromoId ? 'Edit Discount Code' : 'Create New Discount Code'}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Configure targeting parameters, exclusivity, and active lifecycle.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingPromo(false);
                      setEditingPromoId(null);
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* 1. Code String */}
                  <div>
                    <label className="text-[11px] font-black text-slate-700 block mb-1">
                      Discount Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. MELB20FT, SAVE50, SYDMOVE"
                      value={newPromo.code || ''}
                      onChange={(e) => setNewPromo({ ...newPromo, code: e.target.value.toUpperCase().replace(/\s+/g, '') })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-mono font-black text-[#0b2942] uppercase tracking-wider focus:ring-2 focus:ring-[#00c0f3] focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">Customer enters this code at checkout.</span>
                  </div>

                  {/* 2. Promo Display Name */}
                  <div>
                    <label className="text-[11px] font-black text-slate-700 block mb-1">
                      Promotion Display Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Melbourne 20ft Storage Special"
                      value={newPromo.name || ''}
                      onChange={(e) => setNewPromo({ ...newPromo, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-[#0b2942] focus:ring-2 focus:ring-[#00c0f3] focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">Visible on the itemised quote breakdown.</span>
                  </div>

                  {/* 3. Description */}
                  <div>
                    <label className="text-[11px] font-black text-slate-700 block mb-1">Description</label>
                    <input
                      type="text"
                      placeholder="e.g. $75 off 20ft container moves & storage"
                      value={newPromo.description || ''}
                      onChange={(e) => setNewPromo({ ...newPromo, description: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-700 focus:ring-2 focus:ring-[#00c0f3] focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">Brief summary of terms & savings.</span>
                  </div>

                  {/* 4. Promo Type */}
                  <div>
                    <label className="text-[11px] font-black text-slate-700 block mb-1">Discount Calculation Type</label>
                    <select
                      value={newPromo.type || 'percent_off_first_month'}
                      onChange={(e) => setNewPromo({ ...newPromo, type: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-[#0b2942] focus:ring-2 focus:ring-[#00c0f3] focus:outline-none"
                    >
                      <option value="percent_off_first_month">% Off First Period Storage Rent</option>
                      <option value="fixed_discount">Fixed Dollar Discount ($ Off Total Initial Invoice)</option>
                      <option value="free_initial_delivery">Free Initial Delivery Leg ($149 Saving)</option>
                      <option value="free_first_month">First Month Storage Free (100% Off)</option>
                      <option value="percent_off_interstate">% Off Interstate Move Leg</option>
                      <option value="free_container_upgrade">Free Upgrade to 25m³ Container</option>
                    </select>
                  </div>

                  {/* 5. Value */}
                  <div>
                    <label className="text-[11px] font-black text-slate-700 block mb-1">
                      Discount Value ({newPromo.type?.startsWith('percent') ? '%' : '$'})
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        value={newPromo.value ?? 20}
                        onChange={(e) => setNewPromo({ ...newPromo, value: Number(e.target.value) })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-mono font-black text-[#0b2942] focus:ring-2 focus:ring-[#00c0f3] focus:outline-none"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                        {newPromo.type?.startsWith('percent') ? '%' : 'AUD'}
                      </span>
                    </div>
                  </div>

                  {/* 6. Minimum Duration Commitment */}
                  <div>
                    <label className="text-[11px] font-black text-slate-700 block mb-1">Minimum Storage Duration</label>
                    <select
                      value={newPromo.minDurationMonths || 0}
                      onChange={(e) => setNewPromo({ ...newPromo, minDurationMonths: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-[#00c0f3] focus:outline-none"
                    >
                      <option value={0}>No minimum duration requirement</option>
                      <option value={1}>1+ Month commitment</option>
                      <option value={3}>3+ Months commitment</option>
                      <option value={6}>6+ Months commitment</option>
                      <option value={12}>12+ Months commitment</option>
                    </select>
                  </div>
                </div>

                {/* TARGETING DIMENSIONS SECTION */}
                <div className="p-4 rounded-2xl bg-white border border-sky-200 space-y-4">
                  <h5 className="text-xs font-black uppercase tracking-wider text-[#0b2942] flex items-center gap-2">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-[#00c0f3]" />
                    <span>Targeting Dimensions & Eligibility Rules</span>
                  </h5>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* A. Set by Portabox Location */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-700 flex items-center justify-between">
                        <span>1. Set by Portabox Location</span>
                        <span className="text-[10px] text-slate-400 font-normal">Origins & Depots</span>
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {(['All', 'Adelaide', 'Melbourne', 'Sydney', 'Brisbane'] as const).map((loc) => {
                          const currentLocs = newPromo.targetLocations || ['All'];
                          const isSelected = currentLocs.includes(loc);

                          return (
                            <button
                              key={loc}
                              type="button"
                              onClick={() => {
                                if (loc === 'All') {
                                  setNewPromo({ ...newPromo, targetLocations: ['All'] });
                                } else {
                                  let updated: (MetroHub | 'All')[] = currentLocs.filter((l) => l !== 'All');
                                  if (updated.includes(loc)) {
                                    updated = updated.filter((l) => l !== loc);
                                    if (updated.length === 0) updated = ['All'];
                                  } else {
                                    updated.push(loc);
                                  }
                                  setNewPromo({ ...newPromo, targetLocations: updated });
                                }
                              }}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-[#0b2942] text-white shadow-2xs font-black'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {loc === 'All' ? '🌐 All Locations' : loc}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-slate-500">
                        Selected: <strong className="text-slate-800">{(newPromo.targetLocations || ['All']).join(', ')}</strong>
                      </p>
                    </div>

                    {/* B. Set by Type (storage onsite, storage portabox site, interstate, local) */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-700 flex items-center justify-between">
                        <span>2. Set by Service Type</span>
                        <span className="text-[10px] text-slate-400 font-normal">Customer Moves</span>
                      </label>
                      <div className="space-y-1.5">
                        {[
                          { id: 'storage_onsite' as const, label: 'Storage Onsite (at your place)' },
                          { id: 'storage_portabox_site' as const, label: 'Storage at Portabox Site (depot)' },
                          { id: 'local_moving' as const, label: 'Local Moving (metro)' },
                          { id: 'interstate_moving' as const, label: 'Interstate Moving' },
                        ].map((srv) => {
                          const currentTypes = newPromo.serviceTypes || ['storage_onsite', 'storage_portabox_site', 'local_moving', 'interstate_moving'];
                          const isChecked = currentTypes.includes(srv.id);

                          return (
                            <label
                              key={srv.id}
                              className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                                isChecked
                                  ? 'bg-sky-50 border-sky-300 text-[#0b2942]'
                                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  let next = [...currentTypes];
                                  if (e.target.checked) {
                                    if (!next.includes(srv.id)) next.push(srv.id);
                                  } else {
                                    next = next.filter((t) => t !== srv.id);
                                    if (next.length === 0) next = [srv.id]; // keep at least one
                                  }
                                  setNewPromo({ ...newPromo, serviceTypes: next });
                                }}
                                className="w-3.5 h-3.5 rounded text-[#00c0f3]"
                              />
                              <span className="text-[11px]">{srv.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* C. Set by Container Size */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-700 flex items-center justify-between">
                        <span>3. Set by Container Size</span>
                        <span className="text-[10px] text-slate-400 font-normal">Fleet Units</span>
                      </label>
                      <div className="grid grid-cols-1 gap-2">
                        {[
                          { id: 'all' as const, title: 'All Container Sizes', desc: 'Valid for 10ft & 20ft units' },
                          { id: '10ft' as const, title: '10ft (12.5 m³)', desc: 'Valid only for 10ft / 10m³ units' },
                          { id: '20ft' as const, title: '20ft (25 m³)', desc: 'Valid only for 20ft / 25m³ units' },
                        ].map((sz) => {
                          const isSelected = (newPromo.containerSize || 'all') === sz.id;
                          return (
                            <button
                              key={sz.id}
                              type="button"
                              onClick={() => setNewPromo({ ...newPromo, containerSize: sz.id })}
                              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                                isSelected
                                  ? 'border-[#00c0f3] bg-sky-50/80 ring-2 ring-sky-200'
                                  : 'border-slate-200 bg-white hover:bg-slate-50'
                              }`}
                            >
                              <div className="font-black text-xs text-[#0b2942]">{sz.title}</div>
                              <div className="text-[10px] text-slate-500">{sz.desc}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* EXCLUSIVITY & STACKING SELECTION */}
                <div className="p-4 rounded-2xl bg-white border border-sky-200 space-y-3">
                  <label className="text-[11px] font-black text-slate-700 block">
                    4. Option: Code Exclusive vs Code Not Exclusive
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Exclusive Option */}
                    <div
                      onClick={() => setNewPromo({ ...newPromo, isExclusive: true })}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                        newPromo.isExclusive
                          ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-200 shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-black text-xs text-[#0b2942] flex items-center gap-2">
                          <Lock className="w-4 h-4 text-amber-600" />
                          Code Exclusive
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300">
                          No other code can be applied
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Strictly sole discount. Replaces duration discounts and prevents any other code from being applied.
                      </p>
                    </div>

                    {/* Non-Exclusive Option */}
                    <div
                      onClick={() => setNewPromo({ ...newPromo, isExclusive: false })}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                        !newPromo.isExclusive
                          ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-200 shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-black text-xs text-[#0b2942] flex items-center gap-2">
                          <Unlock className="w-4 h-4 text-blue-600" />
                          Code Not Exclusive
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full border border-blue-300">
                          Other codes can be applied
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Stackable promotion. Can be combined with standard rental duration savings and auto-applied incentives.
                      </p>
                    </div>
                  </div>
                </div>

                {/* BOTTOM ACTIVATION & SUBMIT ROW */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                  <div className="flex items-center gap-6">
                    {/* Active toggle */}
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newPromo.active ?? true}
                        onChange={(e) => setNewPromo({ ...newPromo, active: e.target.checked })}
                        className="w-4 h-4 rounded text-emerald-600"
                      />
                      <span className="text-xs font-bold text-slate-800">
                        Active (Customers can redeem code)
                      </span>
                    </label>

                    {/* Auto-apply checkbox */}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newPromo.autoApply || false}
                        onChange={(e) => setNewPromo({ ...newPromo, autoApply: e.target.checked })}
                        className="w-4 h-4 rounded text-[#00c0f3]"
                      />
                      <span className="text-xs font-medium text-slate-600">
                        Auto-apply without code
                      </span>
                    </label>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingPromo(false);
                        setEditingPromoId(null);
                      }}
                      className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (!newPromo.name || !newPromo.name.trim()) {
                          alert('Please provide a promotional name.');
                          return;
                        }

                        if (editingPromoId) {
                          // Update existing
                          const updated = currentConfig.promotions.map((p) => {
                            if (p.id === editingPromoId) {
                              return {
                                ...p,
                                name: newPromo.name || p.name,
                                code: newPromo.code ? newPromo.code.toUpperCase() : undefined,
                                description: newPromo.description || p.description,
                                type: newPromo.type || p.type,
                                value: newPromo.value ?? p.value,
                                targetLocations: newPromo.targetLocations || ['All'],
                                serviceTypes: newPromo.serviceTypes || ['storage_onsite', 'storage_portabox_site', 'local_moving', 'interstate_moving'],
                                containerSize: newPromo.containerSize || 'all',
                                isExclusive: Boolean(newPromo.isExclusive),
                                active: newPromo.active ?? true,
                                autoApply: Boolean(newPromo.autoApply),
                                minDurationMonths: newPromo.minDurationMonths || undefined,
                              };
                            }
                            return p;
                          });
                          const updatedConfig = { ...currentConfig, promotions: updated };
                          setCurrentConfig(updatedConfig);
                          onSaveConfig(updatedConfig);
                          setIsAddingPromo(false);
                          setEditingPromoId(null);
                        } else {
                          // Create new
                          const created: PromotionRule = {
                            id: `promo-${Date.now()}`,
                            name: newPromo.name || 'Special Discount',
                            code: newPromo.code ? newPromo.code.toUpperCase() : undefined,
                            description: newPromo.description || newPromo.name || '',
                            type: newPromo.type || 'percent_off_first_month',
                            value: newPromo.value ?? 20,
                            targetLocations: newPromo.targetLocations || ['All'],
                            serviceTypes: newPromo.serviceTypes || ['storage_onsite', 'storage_portabox_site', 'local_moving', 'interstate_moving'],
                            containerSize: newPromo.containerSize || 'all',
                            isExclusive: Boolean(newPromo.isExclusive),
                            active: newPromo.active ?? true,
                            autoApply: Boolean(newPromo.autoApply),
                            minDurationMonths: newPromo.minDurationMonths || undefined,
                          };
                          const updatedConfig = {
                            ...currentConfig,
                            promotions: [created, ...currentConfig.promotions],
                          };
                          setCurrentConfig(updatedConfig);
                          onSaveConfig(updatedConfig);
                          setIsAddingPromo(false);
                        }
                      }}
                      className="px-6 py-2 bg-[#0b2942] hover:bg-[#15385E] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                    >
                      {editingPromoId ? 'Update Discount Code' : 'Save New Discount Code'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* List of existing promos with filter and search */}
            <div className="space-y-3">
              {currentConfig.promotions
                .filter((promo) => {
                  if (promoFilterStatus === 'active' && !promo.active) return false;
                  if (promoFilterStatus === 'inactive' && promo.active) return false;
                  if (promoFilterStatus === 'exclusive' && !promo.isExclusive) return false;

                  if (promoSearchQuery.trim()) {
                    const q = promoSearchQuery.toLowerCase();
                    const matchesCode = promo.code?.toLowerCase().includes(q);
                    const matchesName = promo.name.toLowerCase().includes(q);
                    const matchesDesc = promo.description.toLowerCase().includes(q);
                    const matchesLoc = (promo.targetLocations || []).some((l) => l.toLowerCase().includes(q));
                    return matchesCode || matchesName || matchesDesc || matchesLoc;
                  }
                  return true;
                })
                .map((promo) => (
                  <div
                    key={promo.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      promo.active ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-50 border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {promo.code ? (
                          <span className="px-2.5 py-1 rounded-lg bg-sky-50 text-[#00c0f3] font-mono font-black text-xs border border-sky-200 tracking-wider">
                            {promo.code}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 font-bold text-[10px]">
                            NO CODE
                          </span>
                        )}

                        <span className="font-extrabold text-sm text-[#0b2942]">{promo.name}</span>

                        {promo.isExclusive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 font-black text-[10px] uppercase">
                            <Lock className="w-2.5 h-2.5 text-amber-700" />
                            Exclusive
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[10px] uppercase">
                            <Unlock className="w-2.5 h-2.5 text-blue-500" />
                            Stackable
                          </span>
                        )}

                        {promo.autoApply && (
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                            Auto-apply
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 line-clamp-1">{promo.description}</p>

                      {/* Targeting badges */}
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                        <span className="font-bold text-slate-700">
                          {promo.type.replace(/_/g, ' ')}: {promo.value}{promo.type.startsWith('percent') ? '%' : '$'}
                        </span>
                        <span>•</span>

                        {/* Location */}
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-medium">
                          📍 {promo.targetLocations && promo.targetLocations.length > 0 ? promo.targetLocations.join(', ') : 'All Locations'}
                        </span>

                        {/* Service types */}
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-medium">
                          🚚 {promo.serviceTypes && promo.serviceTypes.length > 0
                            ? promo.serviceTypes.map((s) => s.replace(/_/g, ' ')).join(', ')
                            : 'All Service Types'}
                        </span>

                        {/* Container size */}
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-medium">
                          📦 {promo.containerSize === '10ft' ? '10ft only' : promo.containerSize === '20ft' ? '20ft only' : 'All Sizes'}
                        </span>

                        {promo.minDurationMonths && promo.minDurationMonths > 0 && (
                          <span className="text-slate-400">
                            • Min {promo.minDurationMonths} mo
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      {/* Activate / Deactivate Toggle */}
                      <button
                        type="button"
                        onClick={() => {
                          const updated = currentConfig.promotions.map((p) =>
                            p.id === promo.id ? { ...p, active: !p.active } : p
                          );
                          const updatedConfig = { ...currentConfig, promotions: updated };
                          setCurrentConfig(updatedConfig);
                          onSaveConfig(updatedConfig);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                          promo.active
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                            : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                        }`}
                      >
                        {promo.active ? '✓ Active' : 'Deactivated'}
                      </button>

                      {/* Edit button */}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPromoId(promo.id);
                          setNewPromo({
                            ...promo,
                            targetLocations: promo.targetLocations || ['All'],
                            serviceTypes: promo.serviceTypes || ['storage_onsite', 'storage_portabox_site', 'local_moving', 'interstate_moving'],
                            containerSize: promo.containerSize || 'all',
                            isExclusive: Boolean(promo.isExclusive),
                            active: promo.active ?? true,
                          });
                          setIsAddingPromo(true);
                        }}
                        className="p-2 rounded-xl text-slate-500 hover:text-[#0b2942] hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Edit Promo"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      {/* Duplicate button */}
                      <button
                        type="button"
                        onClick={() => {
                          const cloned: PromotionRule = {
                            ...promo,
                            id: `promo-${Date.now()}`,
                            name: `${promo.name} (Copy)`,
                            code: promo.code ? `${promo.code}COPY` : undefined,
                          };
                          const updatedConfig = {
                            ...currentConfig,
                            promotions: [cloned, ...currentConfig.promotions],
                          };
                          setCurrentConfig(updatedConfig);
                          onSaveConfig(updatedConfig);
                        }}
                        className="p-2 rounded-xl text-slate-500 hover:text-[#00c0f3] hover:bg-sky-50 transition-colors cursor-pointer"
                        title="Duplicate Promo"
                      >
                        <Copy className="w-4 h-4" />
                      </button>

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Delete promotion "${promo.name}"?`)) {
                            const updated = currentConfig.promotions.filter((p) => p.id !== promo.id);
                            const updatedConfig = { ...currentConfig, promotions: updated };
                            setCurrentConfig(updatedConfig);
                            onSaveConfig(updatedConfig);
                          }
                        }}
                        className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Delete Promo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

              {currentConfig.promotions.length === 0 && (
                <div className="p-8 text-center rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 text-xs">
                  No promotional codes configured yet. Click "Create New Discount Code" above to add one.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 6: BLOCKED POSTCODES ================= */}
        {activeTab === 'blocked' && (
          <div className="space-y-6 max-w-3xl">
            <div>
              <h3 className="text-lg font-extrabold text-[#0b2942]">Blocked & Restricted Postcodes</h3>
              <p className="text-xs text-slate-500">
                Block specific postcodes not serviceable by Portabox (e.g. island ferries, inaccessible regional roads).
              </p>
            </div>

            {/* Add new blocked postcode */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Postcode (e.g. 5222)"
                value={newBlocked.postcode}
                onChange={(e) => setNewBlocked({ ...newBlocked, postcode: e.target.value })}
                className="w-full sm:w-28 px-3 py-2 rounded-xl border bg-white text-xs font-semibold"
              />
              <input
                type="text"
                placeholder="Suburb name (e.g. Kangaroo Island)"
                value={newBlocked.suburb}
                onChange={(e) => setNewBlocked({ ...newBlocked, suburb: e.target.value })}
                className="w-full sm:w-44 px-3 py-2 rounded-xl border bg-white text-xs font-semibold"
              />
              <input
                type="text"
                placeholder="Reason (e.g. Ferry required; call dispatch)"
                value={newBlocked.reason}
                onChange={(e) => setNewBlocked({ ...newBlocked, reason: e.target.value })}
                className="flex-1 px-3 py-2 rounded-xl border bg-white text-xs font-semibold"
              />
              <button
                onClick={() => {
                  if (!newBlocked.postcode.trim()) return;
                  setCurrentConfig({
                    ...currentConfig,
                    blockedPostcodes: [newBlocked, ...currentConfig.blockedPostcodes],
                  });
                  setNewBlocked({ postcode: '', suburb: '', reason: '' });
                }}
                className="px-4 py-2 bg-[#0b2942] text-white rounded-xl text-xs font-bold cursor-pointer whitespace-nowrap"
              >
                Add Block
              </button>
            </div>

            {/* List */}
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
              {currentConfig.blockedPostcodes.map((b) => (
                <div key={b.postcode} className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm font-mono text-[#0b2942]">{b.postcode}</span>
                      <span className="font-bold text-xs text-slate-700">{b.suburb}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{b.reason}</p>
                  </div>
                  <button
                    onClick={() => {
                      setCurrentConfig({
                        ...currentConfig,
                        blockedPostcodes: currentConfig.blockedPostcodes.filter(
                          (item) => item.postcode !== b.postcode
                        ),
                      });
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB: POSTCODE SERVICE TIERS ================= */}
        {activeTab === 'postcode_tiers' && (
          <PostcodeTiersAdminWorkspace
            config={currentConfig}
            onUpdateTierConfig={(tierConfig) => {
              const updated = {
                ...currentConfig,
                postcodeServiceTiers: tierConfig,
              };
              setCurrentConfig(updated);
              onSaveConfig(updated);
            }}
            onSave={handleSave}
          />
        )}

        {/* ================= TAB 7: DEPOT LOCATIONS ================= */}
        {activeTab === 'depots' && (
          <div className="space-y-6 max-w-3xl">
            <div>
              <h3 className="text-lg font-extrabold text-[#0b2942]">Active Portabox Depot Hubs</h3>
              <p className="text-xs text-slate-500">
                Operating facilities where Portabox container trucks and customer containers are dispatched from.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {getActiveDepots().map((depot) => (
                <div key={depot.id} className="p-5 rounded-2xl border border-slate-200 bg-white space-y-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-sky-50 text-[#00c0f3]">
                      {depot.state} Hub
                    </span>
                    <span className="font-mono text-xs text-slate-400">{depot.postcode}</span>
                  </div>
                  <h4 className="font-extrabold text-base text-[#0b2942]">{depot.name}</h4>
                  <p className="text-xs text-slate-600">
                    {depot.address}, {depot.suburb} {depot.state} {depot.postcode}
                  </p>
                  <p className="text-xs text-slate-400 font-mono">
                    Lat: {depot.lat} · Lng: {depot.lng}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB 8: FEATURE FLAGS & APPLICATION MODULES ================= */}
        {activeTab === 'features' && (
          <div className="space-y-6 max-w-4xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-extrabold text-[#0b2942]">Feature Flags & App Modules</h3>
                <p className="text-xs text-slate-500">
                  Select or deselect operational modules and customer-facing features across the Portabox app.
                </p>
              </div>
              {saveSuccess && (
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                  ✓ Feature settings saved!
                </span>
              )}
            </div>

            {/* Feature 1: Call Center Dispatch & Fleet Logistics */}
            <div className={`p-6 rounded-2xl border transition-all ${
              currentConfig.enableCallCenterDispatch !== false
                ? 'bg-white border-slate-200 shadow-xs'
                : 'bg-amber-50/50 border-amber-200'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-2xl text-white shrink-0 ${
                    currentConfig.enableCallCenterDispatch !== false ? 'bg-indigo-600 shadow-xs' : 'bg-slate-400'
                  }`}>
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h4 className="text-base font-extrabold text-[#0b2942]">
                        Call Center Dispatch & Logistics Routing
                      </h4>
                      <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                        currentConfig.enableCallCenterDispatch !== false
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}>
                        {currentConfig.enableCallCenterDispatch !== false ? 'Feature Selected (Enabled)' : 'Feature Deselected (Disabled)'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                      Controls whether the Call Center Dispatch booking portal, Google Calendar scheduling, fleet route optimization engine, and driver routing sheets are available in the application.
                    </p>

                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                        <CheckCircle2 className={`w-4 h-4 shrink-0 ${currentConfig.enableCallCenterDispatch !== false ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <span>Call Center Dispatch button in header</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                        <CheckCircle2 className={`w-4 h-4 shrink-0 ${currentConfig.enableCallCenterDispatch !== false ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <span>Google Calendar container schedule</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                        <CheckCircle2 className={`w-4 h-4 shrink-0 ${currentConfig.enableCallCenterDispatch !== false ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <span>Fleet routing optimizer & 48-hr suggestions</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                        <CheckCircle2 className={`w-4 h-4 shrink-0 ${currentConfig.enableCallCenterDispatch !== false ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <span>Trailer capacity allocation & driver sheets</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex sm:flex-col items-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleCallCenterDispatch(currentConfig.enableCallCenterDispatch === false)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                      currentConfig.enableCallCenterDispatch !== false
                        ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {currentConfig.enableCallCenterDispatch !== false ? 'Deselect Feature' : 'Select Feature (Enable)'}
                  </button>
                  <span className="text-[11px] text-slate-400">
                    {currentConfig.enableCallCenterDispatch !== false ? 'Click to deselect from app' : 'Click to restore feature'}
                  </span>
                </div>
              </div>
            </div>

            {/* Feature 1B: Container Inventory System & Driver QR Scanner */}
            <div className={`p-6 rounded-2xl border transition-all ${
              currentConfig.enableContainerInventory !== false
                ? 'bg-white border-slate-200 shadow-xs'
                : 'bg-amber-50/50 border-amber-200'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-2xl shrink-0 ${
                    currentConfig.enableContainerInventory !== false
                      ? 'bg-[#FF9900] text-[#0b2942] border border-[#FEBD69] shadow-xs'
                      : 'bg-slate-400 text-white'
                  }`}>
                    <QrCode className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h4 className="text-base font-extrabold text-[#0b2942]">
                        Container Inventory System (QR Code Tracking & Serviceability Score)
                      </h4>
                      <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                        currentConfig.enableContainerInventory !== false
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}>
                        {currentConfig.enableContainerInventory !== false ? 'Feature Selected (Enabled)' : 'Feature Deselected (Disabled)'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                      Tracks every container across Portabox depots and customer locations with serialized QR codes that drivers scan on check-out/check-in, 0–100 serviceability level scores, and real-time visibility into whether each container is generating income.
                    </p>
                  </div>
                </div>
                <div className="flex sm:flex-col items-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleFeatureFlag('enableContainerInventory', currentConfig.enableContainerInventory === false)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                      currentConfig.enableContainerInventory !== false
                        ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {currentConfig.enableContainerInventory !== false ? 'Deselect Feature' : 'Select Feature (Enable)'}
                  </button>
                </div>
              </div>
            </div>

            {/* Feature 1C: "Select Weeks" Storage Duration Function */}
            <div className={`p-6 rounded-2xl border transition-all ${
              currentConfig.enableSelectWeeks !== false
                ? 'bg-white border-slate-200 shadow-xs'
                : 'bg-amber-50/50 border-amber-200'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-2xl text-white shrink-0 ${
                    currentConfig.enableSelectWeeks !== false ? 'bg-[#0b2942]' : 'bg-slate-400'
                  }`}>
                    <Clock className="w-6 h-6 text-[#FEBD69]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h4 className="text-base font-extrabold text-[#0b2942]">
                        "Select Weeks" Storage Duration Function
                      </h4>
                      <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                        currentConfig.enableSelectWeeks !== false
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}>
                        {currentConfig.enableSelectWeeks !== false ? 'Feature Selected (Enabled)' : 'Feature Deselected (Disabled)'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                      Allows customers in Step 4 ("When & Storage Duration") to toggle between "Select Months" and "Select Weeks" (1, 2, 3, or 4+ weeks). When deselected, only monthly durations are shown.
                    </p>
                  </div>
                </div>
                <div className="flex sm:flex-col items-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleFeatureFlag('enableSelectWeeks', currentConfig.enableSelectWeeks === false)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                      currentConfig.enableSelectWeeks !== false
                        ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {currentConfig.enableSelectWeeks !== false ? 'Deselect Feature' : 'Select Feature (Enable)'}
                  </button>
                </div>
              </div>
            </div>

            {/* Feature 1D: Efficiency Discount & Emissions Reduction Recognition */}
            <div className={`p-6 rounded-2xl border transition-all ${
              currentConfig.enableEcoEfficiencyIncentive !== false
                ? 'bg-white border-slate-200 shadow-xs'
                : 'bg-amber-50/50 border-amber-200'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-2xl text-white shrink-0 ${
                    currentConfig.enableEcoEfficiencyIncentive !== false ? 'bg-emerald-600' : 'bg-slate-400'
                  }`}>
                    <Leaf className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h4 className="text-base font-extrabold text-[#0b2942]">
                        Efficiency Discount & Emissions Reduction Recognition
                      </h4>
                      <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                        currentConfig.enableEcoEfficiencyIncentive !== false
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}>
                        {currentConfig.enableEcoEfficiencyIncentive !== false ? 'Feature Selected (Enabled)' : 'Feature Deselected (Disabled)'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                      Controls whether the 48-hour fleet route clustering Eco Efficiency Discount and CO₂ Emissions Reduction Recognition banners appear in the delivery slot picker and quote engine.
                    </p>
                  </div>
                </div>
                <div className="flex sm:flex-col items-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleFeatureFlag('enableEcoEfficiencyIncentive', currentConfig.enableEcoEfficiencyIncentive === false)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                      currentConfig.enableEcoEfficiencyIncentive !== false
                        ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {currentConfig.enableEcoEfficiencyIncentive !== false ? 'Deselect Feature' : 'Select Feature (Enable)'}
                  </button>
                </div>
              </div>
            </div>

            {/* Feature: 100% Driveway Fit Guarantee & Driveway Assessment Process */}
            <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-2xl text-white shrink-0 ${
                    currentConfig.enableDrivewayFitGuarantee ? 'bg-emerald-600' : 'bg-slate-400'
                  }`}>
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h4 className="text-base font-extrabold text-[#0b2942]">
                        100% Driveway Fit Guarantee &amp; Driveway Assessment Process
                      </h4>
                      <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                        currentConfig.enableDrivewayFitGuarantee
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold'
                          : 'bg-amber-100 text-amber-800 border border-amber-200 font-bold'
                      }`}>
                        {currentConfig.enableDrivewayFitGuarantee ? 'Active' : 'Deactivated (Flagged Off)'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                      Controls customer-facing visibility of the <strong>100% Driveway Fit Guarantee</strong> and the interactive <strong>Driveway assessment process</strong> across quote steps, sidebar, and footer. Admin can reactivate this at any time.
                    </p>
                  </div>
                </div>

                <div className="flex sm:flex-col items-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const updated: AppConfig = {
                        ...currentConfig,
                        enableDrivewayFitGuarantee: !currentConfig.enableDrivewayFitGuarantee,
                      };
                      setCurrentConfig(updated);
                      onSaveConfig(updated);
                      setSaveSuccess(true);
                      setTimeout(() => setSaveSuccess(false), 2500);
                    }}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                      currentConfig.enableDrivewayFitGuarantee
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold'
                    }`}
                  >
                    {currentConfig.enableDrivewayFitGuarantee ? 'Deactivate Guarantee' : 'Reactivate Guarantee'}
                  </button>
                </div>
              </div>
            </div>

            {/* Feature: Google Calendar Availability Links & Slot Integrations */}
            <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-2xl text-white shrink-0 ${
                    currentConfig.enableGoogleCalendarLink ? 'bg-sky-600' : 'bg-slate-400'
                  }`}>
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h4 className="text-base font-extrabold text-[#0b2942]">
                        Google Calendar Availability &amp; Slot Integrations
                      </h4>
                      <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                        currentConfig.enableGoogleCalendarLink
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold'
                          : 'bg-amber-100 text-amber-800 border border-amber-200 font-bold'
                      }`}>
                        {currentConfig.enableGoogleCalendarLink ? 'Active' : 'Turned Off (Admin Default)'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                      Controls customer-facing visibility of external <strong>&ldquo;Open Google Calendar Availability&rdquo;</strong> links in Step 6 (Schedule &amp; Placement), sidebar tracking, and quote review. Default is turned off to keep scheduling seamlessly native to Portabox. Admin can reactivate this at any time.
                    </p>
                  </div>
                </div>

                <div className="flex sm:flex-col items-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const updated: AppConfig = {
                        ...currentConfig,
                        enableGoogleCalendarLink: !currentConfig.enableGoogleCalendarLink,
                      };
                      setCurrentConfig(updated);
                      onSaveConfig(updated);
                      setSaveSuccess(true);
                      setTimeout(() => setSaveSuccess(false), 2500);
                    }}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                      currentConfig.enableGoogleCalendarLink
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                        : 'bg-[#15385E] hover:bg-[#1f4a7a] text-white font-extrabold'
                    }`}
                  >
                    {currentConfig.enableGoogleCalendarLink ? 'Turn Off Google Calendar Link' : 'Enable Google Calendar Link'}
                  </button>
                </div>
              </div>
            </div>

            {/* Feature 2: Fuel Surcharge / Fuel Levy Calculation */}
            <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-2xl text-white shrink-0 ${
                    currentConfig.fuelSurchargeEnabled ? 'bg-blue-600' : 'bg-slate-400'
                  }`}>
                    <Truck className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h4 className="text-base font-extrabold text-[#0b2942]">
                        Fuel Levy &amp; Surcharge System
                      </h4>
                      <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                        currentConfig.fuelSurchargeEnabled
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {currentConfig.fuelSurchargeEnabled ? 'Active' : 'Disabled'}
                      </span>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                        {currentConfig.fuelSurchargeModel === 'per_zone'
                          ? 'Zone Fixed Rate Model (A–E)'
                          : `Per-Km Distance Model ($${(currentConfig.fuelSurchargeRatePerKm || 0.50).toFixed(2)}/km)`}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                      {currentConfig.fuelSurchargeModel === 'per_zone'
                        ? `Charges flat zone-based fuel levy: Zone A ($${(currentConfig.fuelSurchargeZoneRates || DEFAULT_FUEL_SURCHARGE_ZONE_RATES).A}), B ($${(currentConfig.fuelSurchargeZoneRates || DEFAULT_FUEL_SURCHARGE_ZONE_RATES).B}), C ($${(currentConfig.fuelSurchargeZoneRates || DEFAULT_FUEL_SURCHARGE_ZONE_RATES).C}), D ($${(currentConfig.fuelSurchargeZoneRates || DEFAULT_FUEL_SURCHARGE_ZONE_RATES).D}), E ($${(currentConfig.fuelSurchargeZoneRates || DEFAULT_FUEL_SURCHARGE_ZONE_RATES).E}).`
                        : `Calculates fuel levy at $${(currentConfig.fuelSurchargeRatePerKm || 0.50).toFixed(2)}/km road driving distance.`}
                      {' '}
                      <strong>Policy:</strong> Fuel levy is deferred for planned future deliveries/pick-ups until they occur. For interstate moves, container is returned to destination Portabox location and levy is calculated based on this one-way transit distance (not return/round-trip distance).
                    </p>
                  </div>
                </div>

                <div className="flex sm:flex-col items-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const newModel = currentConfig.fuelSurchargeModel === 'per_zone' ? 'per_km' : 'per_zone';
                      const updated: AppConfig = {
                        ...currentConfig,
                        fuelSurchargeModel: newModel,
                        fuelSurchargeZoneRates: currentConfig.fuelSurchargeZoneRates || { ...DEFAULT_FUEL_SURCHARGE_ZONE_RATES },
                      };
                      setCurrentConfig(updated);
                      onSaveConfig(updated);
                      setSaveSuccess(true);
                      setTimeout(() => setSaveSuccess(false), 2500);
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 cursor-pointer transition-colors"
                  >
                    Switch to {currentConfig.fuelSurchargeModel === 'per_zone' ? 'Per-Km ($/km)' : 'Zone Fixed Rates'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const updated: AppConfig = {
                        ...currentConfig,
                        fuelSurchargeEnabled: !currentConfig.fuelSurchargeEnabled,
                      };
                      setCurrentConfig(updated);
                      onSaveConfig(updated);
                      setSaveSuccess(true);
                      setTimeout(() => setSaveSuccess(false), 2500);
                    }}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                      currentConfig.fuelSurchargeEnabled
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {currentConfig.fuelSurchargeEnabled ? 'Deselect Surcharge' : 'Enable Surcharge'}
                  </button>
                </div>
              </div>
            </div>

            {/* Feature 3: Braintree Gateway & Payment Processing */}
            <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-2xl bg-[#00c0f3] text-white shrink-0 shadow-xs">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h4 className="text-base font-extrabold text-[#0b2942]">
                        Braintree Payment Processing (PayPal Service)
                      </h4>
                      <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                        Merchant Vault Tokenization Active
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                      Accepts credit cards (Visa, Mastercard, AMEX), PayPal 3-in-1, and Google Pay via Braintree Hosted Fields with automatic recurring monthly vault storage.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 4: Top Promo Banner & Slogan */}
            <div className={`p-6 rounded-2xl border transition-all ${
              currentConfig.enablePromoBanner !== false
                ? 'bg-white border-slate-200 shadow-xs'
                : 'bg-amber-50/50 border-amber-200'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-2xl text-[#1A1A1A] shrink-0 shadow-xs ${
                    currentConfig.enablePromoBanner !== false ? 'bg-[#F7D347] border border-[#e5c235]' : 'bg-slate-300'
                  }`}>
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h4 className="text-base font-extrabold text-[#0b2942]">
                        Top Header Announcement Banner &amp; Price Match Guarantee
                      </h4>
                      <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                        currentConfig.enablePromoBanner !== false
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}>
                        {currentConfig.enablePromoBanner !== false ? 'Banner Visible' : 'Banner Hidden'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                      Displays the top gold announcement bar across the app: &ldquo;{currentConfig.promoBannerSlogan || 'UP TO 50% MORE SPACE · GUARANTEED LOWER COST · PRICE MATCH GUARANTEE'}&rdquo;.
                    </p>
                  </div>
                </div>

                <div className="flex sm:flex-col items-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleSelectNavTab('branding', 'Top Banner & Slogan')}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#00c0f3] hover:bg-[#00a9d7] text-white transition-all cursor-pointer shadow-xs"
                  >
                    Configure Slogan
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const updated: AppConfig = {
                        ...currentConfig,
                        enablePromoBanner: currentConfig.enablePromoBanner === false,
                      };
                      setCurrentConfig(updated);
                      onSaveConfig(updated);
                      setSaveSuccess(true);
                      setTimeout(() => setSaveSuccess(false), 2500);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      currentConfig.enablePromoBanner !== false
                        ? 'text-rose-600 hover:text-rose-800'
                        : 'text-emerald-600 hover:text-emerald-800'
                    }`}
                  >
                    {currentConfig.enablePromoBanner !== false ? 'Hide Banner' : 'Show Banner'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 13: BUSINESS HOURS & SMS AUTO-RESPONDER ================= */}
        {activeTab === 'business_hours' && (() => {
          const hoursConfig = currentConfig.businessHours || DEFAULT_BUSINESS_HOURS_CONFIG;
          const liveStatus = checkBusinessHoursStatus(hoursConfig);
          const filteredMessages = afterHoursMessages.filter((m) => {
            if (afterHoursFilter === 'All') return true;
            return m.status === afterHoursFilter;
          });
          const pendingCount = afterHoursMessages.filter((m) => m.status === 'Pending Morning Response').length;
          const contactedCount = afterHoursMessages.filter((m) => m.status === 'Contacted').length;

          const DAYS_OF_WEEK = [
            { id: 1, label: 'Mon', full: 'Monday' },
            { id: 2, label: 'Tue', full: 'Tuesday' },
            { id: 3, label: 'Wed', full: 'Wednesday' },
            { id: 4, label: 'Thu', full: 'Thursday' },
            { id: 5, label: 'Fri', full: 'Friday' },
            { id: 6, label: 'Sat', full: 'Saturday' },
            { id: 0, label: 'Sun', full: 'Sunday' },
          ];

          return (
            <div className="space-y-6 max-w-5xl">
              {/* Toast Feedback */}
              {afterHoursToast && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-between animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>{afterHoursToast}</span>
                  </div>
                </div>
              )}

              {/* Section Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-lg font-extrabold text-[#0b2942]">
                      Business Operating Hours & SMS Auto-Responder
                    </h3>
                    <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                      hoursConfig.enabled !== false
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-100 text-rose-800 border border-rose-200'
                    }`}>
                      {hoursConfig.enabled !== false ? 'Auto-Responder Active' : 'Auto-Responder Disabled'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Set Portabox office operating hours, timezone, and the out-of-hours pop-out modal when customers text via &ldquo;Are you stuck?&rdquo; or the customer portal.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setIsTestPopOutOpen(true)}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-[#FF9900] hover:bg-[#e68a00] text-[#0b2942] border border-[#FEBD69] rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-xs active:scale-98"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Test & Preview Pop-Out</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleUpdateBusinessHours({
                        forceAfterHoursForTesting: !hoursConfig.forceAfterHoursForTesting,
                      });
                    }}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      hoursConfig.forceAfterHoursForTesting
                        ? 'bg-amber-600 hover:bg-amber-700 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    <span>
                      {hoursConfig.forceAfterHoursForTesting ? 'Test Mode Active (Force Outside Hours)' : 'Simulate Outside Hours'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Live Status Hero Banner */}
              <div className={`p-5 rounded-3xl border transition-all ${
                liveStatus.isOutside
                  ? 'bg-gradient-to-r from-slate-900 to-[#0b2942] text-white border-slate-800 shadow-md'
                  : 'bg-emerald-50/90 text-emerald-950 border-emerald-200'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className={`p-3 rounded-2xl shrink-0 ${
                      liveStatus.isOutside ? 'bg-amber-400 text-slate-900' : 'bg-emerald-600 text-white'
                    }`}>
                      {liveStatus.isOutside ? <Moon className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          liveStatus.isOutside ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {liveStatus.isOutside ? 'OUTSIDE OPERATING HOURS' : 'CURRENTLY OPEN'}
                        </span>
                        <span className={`text-xs font-semibold ${liveStatus.isOutside ? 'text-slate-300' : 'text-emerald-700'}`}>
                          {liveStatus.reason}
                        </span>
                      </div>
                      <h4 className="text-base sm:text-lg font-black mt-1">
                        {liveStatus.isOutside ? 'Stepped away for the day · Pop-out Auto-Responder ACTIVE' : 'Office is open · Direct customer SMS enabled'}
                      </h4>
                      <p className={`text-xs mt-0.5 ${liveStatus.isOutside ? 'text-slate-300' : 'text-emerald-700'}`}>
                        Schedule: {liveStatus.scheduleSummary} · <span className="font-bold">{liveStatus.nextOpenText}</span>
                      </p>
                    </div>
                  </div>



                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      After-Hours Pop-Out Feature
                    </label>
                    <button
                      type="button"
                      onClick={() => handleUpdateBusinessHours({ enabled: hoursConfig.enabled !== false })}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 border ${
                        hoursConfig.enabled !== false
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{hoursConfig.enabled !== false ? 'Enabled (Pop-out Active)' : 'Disabled (Direct SMS Always)'}</span>
                    </button>
                  </div>
                </div>

                {/* Pop-Out Auto-Responder Copy Editor */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-xs font-bold text-slate-700">
                        Out-of-Hours Pop-Out Message Copy
                      </label>
                      <p className="text-[11px] text-slate-500">
                        The exact message displayed in the modal when a user texts outside business hours.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUpdateBusinessHours({ autoReplyText: DEFAULT_BUSINESS_HOURS_CONFIG.autoReplyText })}
                      className="text-[11px] font-bold text-[#00c0f3] hover:underline cursor-pointer"
                    >
                      Reset to Default Copy
                    </button>
                  </div>

                  <textarea
                    rows={4}
                    value={hoursConfig.autoReplyText || ''}
                    onChange={(e) => handleUpdateBusinessHours({ autoReplyText: e.target.value })}
                    className="w-full p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-semibold text-[#0b2942] focus:outline-none focus:ring-2 focus:ring-[#00c0f3] focus:bg-white leading-relaxed resize-none"
                  />
                </div>
              </div>

              {/* ================= LOCATION-SPECIFIC SERVICE HOURS MANAGER ================= */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs">
                <LocationServiceHoursManager
                  config={currentConfig}
                  onUpdateLocationHours={(hoursMap) => {
                    const updated = {
                      ...currentConfig,
                      locationBusinessHours: hoursMap,
                    };
                    setCurrentConfig(updated);
                    onSaveConfig(updated);
                  }}
                  onSave={handleSave}
                />
              </div>

              {/* ================= INCOMING AFTER-HOURS INQUIRIES QUEUE ================= */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-extrabold text-[#0b2942]">
                        Customer After-Hours Inquiries & Callback Queue ({filteredMessages.length})
                      </h4>
                      {pendingCount > 0 && (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                          {pendingCount} Pending Morning Contact
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      Messages left by customers overnight via the after-hours pop-out modal. Call or text them first thing in the morning!
                    </p>
                  </div>

                  {/* Filter buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(['All', 'Pending Morning Response', 'Contacted', 'Closed'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setAfterHoursFilter(st)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                          afterHoursFilter === st
                            ? 'bg-[#0b2942] text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {st} {st === 'Pending Morning Response' ? `(${pendingCount})` : st === 'Contacted' ? `(${contactedCount})` : ''}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredMessages.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    No inquiries matching filter &ldquo;{afterHoursFilter}&rdquo;.
                  </div>
                ) : (
                  <div className="overflow-x-auto divide-y divide-slate-100 rounded-2xl border border-slate-100">
                    {filteredMessages.map((msg) => {
                      const isPending = msg.status === 'Pending Morning Response';
                      return (
                        <div key={msg.id} className="p-4 hover:bg-slate-50/70 transition-colors space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                            <div className="flex items-start gap-3">
                              <div className={`p-2.5 rounded-xl text-white shrink-0 ${
                                isPending ? 'bg-amber-500' : msg.status === 'Contacted' ? 'bg-emerald-600' : 'bg-slate-400'
                              }`}>
                                <MessageSquare className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h5 className="font-extrabold text-sm text-[#0b2942]">
                                    {msg.customerName}
                                  </h5>
                                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                    isPending
                                      ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                      : msg.status === 'Contacted'
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                      : 'bg-slate-100 text-slate-700'
                                  }`}>
                                    {msg.status}
                                  </span>
                                  <span className="text-[11px] text-slate-400">
                                    {new Date(msg.createdAt).toLocaleString('en-AU', {
                                      dateStyle: 'medium',
                                      timeStyle: 'short',
                                    })}
                                  </span>
                                </div>

                                <div className="flex items-center gap-3 text-xs text-slate-600 mt-1 flex-wrap">
                                  <span className="font-mono font-bold text-[#0b2942]">{msg.customerMobile}</span>
                                  {msg.suburbOrPostcode && (
                                    <>
                                      <span>·</span>
                                      <span className="flex items-center gap-1 text-slate-700">
                                        <MapPin className="w-3 h-3 text-[#00c0f3]" />
                                        <span>{msg.suburbOrPostcode}</span>
                                      </span>
                                    </>
                                  )}
                                  <span>·</span>
                                  <span className="text-slate-400">Source: {msg.source}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                              <button
                                type="button"
                                onClick={() => setDrawerState({ isOpen: true, type: 'message', data: msg })}
                                className="px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                                title="Inspect message in slide-over drawer (HubSpot style)"
                              >
                                <Clock className="w-3 h-3 text-purple-600" />
                                <span>360° Drawer</span>
                              </button>
                              <a
                                href={`tel:${msg.customerMobile.replace(/\s+/g, '')}`}
                                className="px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <Phone className="w-3 h-3" />
                                <span>Call</span>
                              </a>
                              <a
                                href={`sms:${msg.customerMobile.replace(/\s+/g, '')}?body=${encodeURIComponent(
                                  `Hi ${msg.customerName}, following up on your message to Portabox this morning!`
                                )}`}
                                className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <Send className="w-3 h-3" />
                                <span>SMS Reply</span>
                              </a>
                              {isPending ? (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateMsgStatus(msg.id, 'Contacted', `Contacted customer on ${new Date().toLocaleTimeString()}`)}
                                  className="px-3 py-1.5 rounded-xl bg-[#0b2942] hover:bg-[#081e30] text-white text-xs font-bold transition-colors cursor-pointer"
                                >
                                  Mark Contacted
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateMsgStatus(msg.id, 'Pending Morning Response')}
                                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                                >
                                  Reopen
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Message details quote box */}
                          <div className="pl-11">
                            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-800 leading-relaxed font-medium">
                              <span className="font-bold text-[#0b2942]">Customer Request: </span>
                              &ldquo;{msg.message}&rdquo;
                            </div>
                            {msg.notes && (
                              <div className="mt-1.5 text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                                <CheckCircle className="w-3 h-3 text-emerald-600" />
                                <span>Staff Note: {msg.notes}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* ================= TAB 14: TOP BANNER & SLOGAN (BRANDING) ================= */}
        {activeTab === 'branding' && (
          <BrandingBannerSettings
            config={currentConfig}
            onSaveConfig={(updated) => {
              setCurrentConfig(updated);
              onSaveConfig(updated);
              setSaveSuccess(true);
              setTimeout(() => setSaveSuccess(false), 2500);
            }}
          />
        )}

        {/* ================= TAB: COMPETITOR PRICING BENCHMARK & MARKET EDITOR ================= */}
        {activeTab === 'competitor_pricing' && (
          <CompetitorPricingWorkspace
            onSaveNotification={(msg) => {
              setSaveSuccess(true);
              setTimeout(() => setSaveSuccess(false), 2500);
            }}
          />
        )}

        {/* ================= TAB: DURATION DISCOUNTS CONFIGURATION ================= */}
        {activeTab === 'duration_discounts' && (
          <DurationDiscountsAdminWorkspace
            config={currentConfig}
            onUpdateConfig={(updated) => {
              setCurrentConfig(updated);
              onSaveConfig(updated);
              setSaveSuccess(true);
              setTimeout(() => setSaveSuccess(false), 2500);
            }}
          />
        )}

        {/* ================= TAB 15: QUOTE LIFECYCLE & ANNUAL REVIEW CAP ================= */}
        {activeTab === 'quote_lifecycle' && (
          <QuoteLifecycleAdminWorkspace
            config={currentConfig}
            onSaveConfig={(updated) => {
              setCurrentConfig(updated);
              onSaveConfig(updated);
              setSaveSuccess(true);
              setTimeout(() => setSaveSuccess(false), 2500);
            }}
            onNavigateToFreezeManagement={() => handleSelectNavTab('freeze_management', 'Frozen Pricing & Revenue Impact')}
          />
        )}

        {/* ================= TAB 16: FROZEN PRICING & REVENUE IMPACT FORECAST ================= */}
        {activeTab === 'freeze_management' && (
          <FrozenPricingDashboard
            config={currentConfig}
            onSaveConfig={(updated) => {
              setCurrentConfig(updated);
              onSaveConfig(updated);
              setSaveSuccess(true);
              setTimeout(() => setSaveSuccess(false), 2500);
            }}
          />
        )}
            </>
          )}
        </div>
      </div>

      {/* Slide-Over Detail Inspector Drawer (HubSpot / Pipedrive Style) */}
      <AdminSlideOverDrawer
        drawerState={drawerState}
        onClose={() => setDrawerState({ isOpen: false, type: 'customer', data: null })}
        onMarkMessageContacted={(id) => handleUpdateMsgStatus(id, 'Contacted')}
        onUpdateLeadStatus={onUpdateLeadStatus}
        onOpenCustomerBillingAction={(customerId, mode) => {
          const cust = customers.find((c) => c.id === customerId);
          if (cust) {
            setDrawerState({ isOpen: false, type: 'customer', data: null });
            handleSelectNavTab('customers', 'Customers & Billing');
            setExpandedCustomerId(cust.id);
            setBillingActionCustomer(cust.id);
            setBillingActionMode(mode);
          }
        }}
      />

      {/* Phone Call Rapid Intake Drawer (Customer on Phone) */}
      <AdminPhoneIntakeDrawer
        isOpen={isPhoneIntakeOpen}
        onClose={() => setIsPhoneIntakeOpen(false)}
        config={currentConfig}
        onBookingCreated={(newRow) => {
          setSmartsheetRows((prev) => [newRow, ...prev]);
          setCustomers(loadCustomerAccounts());
          setLeadsSearch('');
        }}
      />

      {/* Test / Preview Pop-Out Modal */}
      <AfterHoursTextModal
        isOpen={isTestPopOutOpen}
        onClose={() => setIsTestPopOutOpen(false)}
        config={currentConfig.businessHours}
        defaultCustomerName="Andrew (Admin Preview)"
        defaultCustomerMobile="0412 000 111"
        defaultSuburbOrPostcode="5061 Hyde Park"
        source="Direct"
      />

      {/* Floating Admin Copilot Launcher Button (Accessible from Any Tab) */}
      <button
        type="button"
        onClick={() => setIsFloatingCopilotOpen(!isFloatingCopilotOpen)}
        className="fixed bottom-6 right-6 z-40 px-4 py-3 bg-linear-to-r from-purple-700 via-indigo-700 to-[#0b2942] hover:from-purple-800 hover:to-[#112F4F] text-white rounded-2xl shadow-2xl flex items-center gap-2.5 font-black text-xs border border-purple-400/40 cursor-pointer transition-all hover:scale-105 active:scale-95 group"
      >
        <div className="w-6 h-6 rounded-lg bg-amber-400 text-purple-950 flex items-center justify-center font-bold shadow-xs">
          <Sparkles className="w-3.5 h-3.5" />
        </div>
        <span className="tracking-wide">AI Copilot</span>
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      </button>

      {/* Floating Slide-over Copilot Drawer */}
      {isFloatingCopilotOpen && (
        <div 
          className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsFloatingCopilotOpen(false)}
        >
          <div
            className="w-full max-w-lg h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <AdminCopilotChat
              config={currentConfig}
              leads={leads}
              onSaveConfig={(newCfg) => {
                setCurrentConfig(newCfg);
                onSaveConfig(newCfg);
              }}
              onUpdateLeadStatus={onUpdateLeadStatus}
              onAddLeadNote={onAddLeadNote}
              isFloating={true}
              onCloseFloating={() => setIsFloatingCopilotOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Financial Data CSV Extraction & Duration Query Modal */}
      <FinancialDataExportModal
        isOpen={isFinancialExportOpen}
        onClose={() => setIsFinancialExportOpen(false)}
        defaultStartDate="2026-01-01"
        defaultEndDate="2026-03-31"
      />

      {/* Footer reset button */}
      <div className="px-6 py-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <span className="font-semibold text-slate-300">Portabox CRM & Tariff Console · Multi-Tab Unified Engine</span>
        <button
          onClick={handleResetDefaults}
          className="flex items-center gap-1 text-slate-400 hover:text-white cursor-pointer transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset all to factory defaults</span>
        </button>
      </div>
    </div>
  );
};
