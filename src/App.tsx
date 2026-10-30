import React, { useState, useMemo, useEffect } from 'react';
import { Header } from './components/Header';
import { AdminGate } from './components/AdminGate';
import { RightSidebar } from './components/RightSidebar';
import { Step1Where } from './components/Step1Where';
import { Step2What } from './components/Step2What';
import { Step3LoadingLogistics } from './components/Step3LoadingLogistics';
import { Step3Size } from './components/Step3Size';
import { Step4When } from './components/Step4When';
import { Step5DeliveryAndSupplies } from './components/Step5DeliveryAndSupplies';
import { Step6PackingSuppliesAndInsurance } from './components/Step6PackingSuppliesAndInsurance';
import { Step5SendQuote } from './components/Step5SendQuote';
import { Step5Quote } from './components/Step5Quote';
import { Step9NextSteps } from './components/Step9NextSteps';
import { Step6Confirmation } from './components/Step6Confirmation';
import { AdminPortal } from './components/AdminPortal';
import { CustomerPortal } from './components/CustomerPortal';
import { SpaceCalculatorModal } from './components/SpaceCalculatorModal';
import { DrivewayPlacementCheckerModal } from './components/DrivewayPlacementCheckerModal';
import { CallCenterCalendarPortal } from './components/CallCenterCalendarPortal';
import { DriverPortalModal } from './components/DriverPortalModal';
import { CoverageAreaMapModal } from './components/CoverageAreaMapModal';
import { TwilioSoftphoneBar } from './components/telephony/TwilioSoftphoneBar';
import { Customer360Drawer } from './components/telephony/Customer360Drawer';
import { BookingDecisionModal } from './components/BookingDecisionModal';
import { upsertCustomerFromLead, CustomerAccount } from './services/customerPortalService';
import { dispatchQuoteToCustomer } from './services/quoteDispatchService';
import { TelephonyCall } from './services/telephonyService';
import { autoSyncEventToSmartsheet } from './services/smartsheetService';
import {
  AUSTRALIAN_POSTCODES,
  PORTABOX_DEPOTS,
  findClosestDepot,
  PostcodeRecord,
  searchPostcodes,
} from './data/australianPostcodes';
import {
  calculateQuote,
  getMetroHubForPostcode,
  loadAppConfig,
  loadCustomerLeads,
  recordDropOffEvent,
  saveAppConfig,
  saveCustomerLeads,
} from './services/pricingEngine';
import {
  AppConfig,
  BillingCycle,
  ContainerSizeId,
  CustomerLead,
  DeliverySlotWindow,
  LogisticsMethod,
  QuoteBreakdown,
  ServiceType,
  StorageDuration,
} from './types/quote';
import { applyLanguageToDOM, getSavedLanguage } from './services/translationService';
import { AdminLoginModal } from './components/auth/AdminLoginModal';
import { StaffSession } from './types/adminAuth';
import { getStaffSession, clearStaffSession, hasStaffPermission } from './services/adminAuthService';

/**
 * The website's postcode boxes hand off here as ?postcode=3000.
 *
 * searchPostcodes resolves anything valid: one of the known suburbs, or a
 * synthetic record placed by state range. Anything else is ignored and the
 * default stands, so a junk parameter cannot break the opening screen.
 */
function postcodeFromUrl(): PostcodeRecord | null {
  if (typeof window === 'undefined') return null;
  const raw = new URLSearchParams(window.location.search).get('postcode');
  if (!raw || !/^[0-9]{4}$/.test(raw.trim())) return null;
  return searchPostcodes(raw.trim())[0] || null;
}

export default function App() {
  // App Config & Persistent Leads
  const [config, setConfig] = useState<AppConfig>(loadAppConfig());
  const [leads, setLeads] = useState<CustomerLead[]>(loadCustomerLeads());

  // Staff Authentication & Role-Based Access Control (2FA)
  const [staffSession, setStaffSessionState] = useState<StaffSession | null>(getStaffSession());
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState(false);
  const [targetFeatureAfterLogin, setTargetFeatureAfterLogin] = useState<string | undefined>(undefined);

  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [adminInitialTab, setAdminInitialTab] = useState<'pricing_matrix' | 'telephony' | string>('pricing_matrix');
  const [isCustomerPortalOpen, setIsCustomerPortalOpen] = useState(false);
  const [isCallCenterOpen, setIsCallCenterOpen] = useState(false);
  const [isDriverPortalOpen, setIsDriverPortalOpen] = useState(false);
  const [screenPopCustomer, setScreenPopCustomer] = useState<CustomerAccount | null>(null);
  const [activeTelephonyCall, setActiveTelephonyCall] = useState<TelephonyCall | null>(null);
  const [isCustomer360Open, setIsCustomer360Open] = useState(false);
  const [isSpaceCalculatorOpen, setIsSpaceCalculatorOpen] = useState(false);
  const [isPlacementCheckerOpen, setIsPlacementCheckerOpen] = useState(false);
  const [isCoverageMapModalOpen, setIsCoverageMapModalOpen] = useState(false);

  const handleOpenStaffLogin = (targetFeature?: string) => {
    setTargetFeatureAfterLogin(targetFeature);
    setIsAdminLoginModalOpen(true);
  };

  const handleStaffLoginSuccess = (session: StaffSession) => {
    setStaffSessionState(session);
    // Route user directly to their authorized portal or requested feature
    if (targetFeatureAfterLogin === 'driver' && hasStaffPermission(session.user, 'driver_portal')) {
      setIsDriverPortalOpen(true);
    } else if (targetFeatureAfterLogin === 'dispatch' && hasStaffPermission(session.user, 'dispatch_calendar')) {
      setIsCallCenterOpen(true);
    } else if (targetFeatureAfterLogin === 'admin' && hasStaffPermission(session.user, 'pricing_and_rates')) {
      setIsAdminOpen(true);
    } else if (session.user.role === 'driver') {
      setIsDriverPortalOpen(true);
    } else if (session.user.role === 'call_center') {
      setIsCallCenterOpen(true);
    } else {
      setIsAdminOpen(true);
    }
  };

  const handleStaffLogout = () => {
    clearStaffSession();
    setStaffSessionState(null);
    setIsAdminOpen(false);
    setIsCallCenterOpen(false);
    setIsDriverPortalOpen(false);
  };

  // Quote Flow State
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [sessionId] = useState<string>(() => 'sess-' + Math.random().toString(36).substring(2, 9));
  const [customerContact, setCustomerContact] = useState<{
    firstName: string;
    mobile: string;
    email: string;
    agreedToContact: boolean;
    hasNoPhoneOrEmail?: boolean;
    isAgentCallIn?: boolean;
    channels?: {
      email?: boolean;
      sms?: boolean;
      portal?: boolean;
    };
    agentName?: string;
    agentNotes?: string;
  } | null>(null);
  const [lastPaymentResult, setLastPaymentResult] = useState<any>(null);

  const [originPostcode, setOriginPostcode] = useState<PostcodeRecord | null>(
    postcodeFromUrl() || AUSTRALIAN_POSTCODES[0] // 5061 Hyde Park SA
  );
  const [destinationPostcode, setDestinationPostcode] = useState<PostcodeRecord | null>(null);
  const [serviceType, setServiceType] = useState<ServiceType>('storage_facility');
  const [storagePlacement, setStoragePlacement] = useState<'my_place' | 'facility'>('facility');
  const [containerSelections, setContainerSelections] = useState<Record<ContainerSizeId, number>>({
    small_10m3: 0,
    medium_19m3: 0,
    large_25m3: 1,
    two_large_50m3: 0,
  });
  
  const containerSize = Object.entries(containerSelections).find(([_, count]) => count > 0)?.[0] as ContainerSizeId || 'large_25m3';
  const containerCount = Object.values(containerSelections).reduce((a, b) => a + b, 0);

  const [storageDuration, setStorageDuration] = useState<StorageDuration>('1_to_3_months');
  const [storageDurationMonths, setStorageDurationMonths] = useState<number>(1);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [boxesCount, setBoxesCount] = useState<number>(0);
  const [blanketsCount, setBlanketsCount] = useState<number>(10); // default to 10 free blankets
  const [locksCount, setLocksCount] = useState<number>(1); // default recommended 1 lock
  const [insuranceSelected, setInsuranceSelected] = useState<boolean>(true); // default CPO insurance opted-in
  
  // Loading & Unloading Logistics Method (depot vs home delivery)
  const [originLogisticsMethod, setOriginLogisticsMethod] = useState<LogisticsMethod>('home_delivery');
  const [destinationLogisticsMethod, setDestinationLogisticsMethod] = useState<LogisticsMethod>('home_delivery');
  
  // Default delivery date matching reference or 2-3 days ahead
  const [preferredDate, setPreferredDate] = useState<string>('Wed 14 Oct 2026');
  const [selectedSlot, setSelectedSlot] = useState<DeliverySlotWindow | undefined>(undefined);
  const [appliedPromoCode, setAppliedPromoCode] = useState<string>('');
  const [magicResumeBanner, setMagicResumeBanner] = useState<string | null>(null);

  // Submitted lead
  const [submittedLead, setSubmittedLead] = useState<CustomerLead | null>(null);

  // Dedicated Booking Decision Modal State
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingModalQuote, setBookingModalQuote] = useState<QuoteBreakdown | null>(null);

  const handleOpenBookingModal = (q?: QuoteBreakdown | null) => {
    setBookingModalQuote(q || activeQuote);
    setIsBookingModalOpen(true);
  };

  // Calculated quote memo
  const activeQuote = useMemo(() => {
    if (!originPostcode) return null;
    return calculateQuote({
      originPostcode,
      destinationPostcode: destinationPostcode || undefined,
      serviceType,
      storagePlacement,
      containerSize,
      containerCount,
      containerSelections,
      billingCycle,
      storageDuration,
      storageDurationMonths,
      preferredDate,
      selectedSlot,
      boxesCount,
      blanketsCount,
      locksCount,
      insuranceSelected,
      originLogisticsMethod,
      destinationLogisticsMethod,
      appliedPromoCode,
      config,
    });
  }, [
    originPostcode,
    destinationPostcode,
    serviceType,
    storagePlacement,
    containerSize,
    containerCount,
    containerSelections,
    billingCycle,
    storageDuration,
    storageDurationMonths,
    preferredDate,
    selectedSlot,
    boxesCount,
    blanketsCount,
    locksCount,
    insuranceSelected,
    originLogisticsMethod,
    destinationLogisticsMethod,
    appliedPromoCode,
    config,
  ]);

  // Track user drop-off per page in real-time
  useEffect(() => {
    const PAGE_NAMES: Record<number, string> = {
      1: 'Page 1: Where are you moving or storing?',
      2: 'Page 2: What is your move or storage setup?',
      3: 'Page 3: Loading & Unloading Logistics',
      4: 'Page 4: Which size do you need?',
      5: 'Page 5: Duration & Billing',
      6: 'Page 6: Schedule & Placement',
      7: 'Page 7: Packing Supplies & Insurance',
      8: 'Page 8: Where do we send your quote',
      9: 'Page 9: Final Quote (Detailed quote & savings)',
      10: 'Page 10: Next Steps After Payment (Booking Confirmation & Lifecycle Roadmap)',
    };

    recordDropOffEvent({
      sessionId,
      lastPageStep: currentStep,
      lastPageName: PAGE_NAMES[currentStep] || `Page ${currentStep}`,
      originSuburb: originPostcode?.suburb,
      originPostcode: originPostcode?.postcode,
      destinationSuburb: destinationPostcode?.suburb,
      destinationPostcode: destinationPostcode?.postcode,
      serviceType,
      containerSize,
      containerCount,
      storageDuration,
      billingCycle,
      customerEmail: customerContact?.email,
      customerPhone: customerContact?.mobile,
      completed: currentStep >= 9,
    });
  }, [
    sessionId,
    currentStep,
    originPostcode,
    destinationPostcode,
    serviceType,
    containerSize,
    containerCount,
    storageDuration,
    billingCycle,
    customerContact,
  ]);

  // Instantaneously & smoothly scroll to top whenever the customer navigates to another step
  useEffect(() => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
      const mainContainer = document.querySelector('main') || document.getElementById('root');
      if (mainContainer) mainContainer.scrollTop = 0;
      
      // Secondary frame check in case of layout rendering delays
      requestAnimationFrame(() => {
        window.scrollTo(0, 0);
        if (document.documentElement) document.documentElement.scrollTop = 0;
      });
    } catch {
      window.scrollTo(0, 0);
    }
  }, [currentStep]);

  // Keep selected language applied across step transitions & dynamic state updates
  useEffect(() => {
    const savedLang = getSavedLanguage();
    if (savedLang && savedLang !== 'en') {
      const timer = setTimeout(() => {
        applyLanguageToDOM(savedLang);
      }, 25);
      return () => clearTimeout(timer);
    }
  }, [
    currentStep,
    serviceType,
    storagePlacement,
    containerSize,
    containerCount,
    storageDuration,
    billingCycle,
    boxesCount,
    blanketsCount,
    appliedPromoCode,
    isAdminOpen,
    isCustomerPortalOpen,
    isCallCenterOpen,
  ]);

  // Listen for Two-Way Smartsheet updates (Tariffs, Bookings, Billing, Portal)
  useEffect(() => {
    const handleSmartsheetSync = () => {
      setConfig(loadAppConfig());
      setLeads(loadCustomerLeads());
    };
    const handleOpenScreenPop = (e: any) => {
      if (e.detail?.customer) {
        setScreenPopCustomer(e.detail.customer);
      }
      if (e.detail?.call) {
        setActiveTelephonyCall(e.detail.call);
      }
      setIsCustomer360Open(true);
    };

    window.addEventListener('portabox-smartsheet-sync', handleSmartsheetSync);
    window.addEventListener('portabox-open-screen-pop', handleOpenScreenPop);
    return () => {
      window.removeEventListener('portabox-smartsheet-sync', handleSmartsheetSync);
      window.removeEventListener('portabox-open-screen-pop', handleOpenScreenPop);
    };
  }, []);

  // Check for Magic Resume Link parameter on startup
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const magicQuote = urlParams.get('magicQuote');
      if (magicQuote) {
        const saved = localStorage.getItem('portabox_magic_quote');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.customerName) {
            setCustomerContact({
              firstName: parsed.customerName,
              mobile: parsed.customerMobile || '',
              email: parsed.customerEmail || '',
              agreedToContact: true,
            });
          }
          setMagicResumeBanner(`Welcome back, ${parsed.customerName || 'Valued Customer'}! Your 30-day locked quote (${parsed.ref || magicQuote}) has been resumed.`);
          setCurrentStep(9);
        } else {
          setMagicResumeBanner(`Welcome back! Resumed your locked quotation (${magicQuote}).`);
          setCurrentStep(9);
        }
      }
    } catch {
      // Ignore URL parse errors
    }
  }, []);

  // Admin config save handler
  const handleSaveConfig = (newConfig: AppConfig) => {
    setConfig(newConfig);
    saveAppConfig(newConfig);
    if (newConfig.enableCallCenterDispatch === false) {
      setIsCallCenterOpen(false);
    }
  };

  // Lead status update
  const handleUpdateLeadStatus = (leadId: string, status: CustomerLead['status']) => {
    const updated = leads.map((l) => (l.id === leadId ? { ...l, status } : l));
    setLeads(updated);
    saveCustomerLeads(updated);
  };

  // Lead note addition
  const handleAddLeadNote = (leadId: string, noteText: string) => {
    const updated = leads.map((l) => {
      if (l.id === leadId) {
        return {
          ...l,
          notes: [...(l.notes || []), `${new Date().toLocaleDateString()}: ${noteText}`],
        };
      }
      return l;
    });
    setLeads(updated);
    saveCustomerLeads(updated);
  };

  // Customer submit quote in Step 8 ("Where do we send your quote")
  const handleSendQuote = (customerData: {
    firstName: string;
    mobile: string;
    email: string;
    agreedToContact: boolean;
    hasNoPhoneOrEmail?: boolean;
    isAgentCallIn?: boolean;
    channels?: {
      email?: boolean;
      sms?: boolean;
      portal?: boolean;
    };
    agentName?: string;
    agentNotes?: string;
  }) => {
    setCustomerContact(customerData);

    if (activeQuote) {
      const newLead: CustomerLead = {
        id: `lead-${Date.now()}`,
        createdAt: new Date().toISOString(),
        firstName: customerData.firstName,
        mobile: customerData.mobile,
        email: customerData.email,
        agreedToContact: customerData.agreedToContact,
        status: 'New',
        quote: activeQuote,
        selectedSlot: activeQuote.selectedSlot || selectedSlot,
        dropOffPage: 'Page 8: Final Quote (Completed)',
        smsSent: customerData.channels?.sms !== false,
        emailSent: customerData.channels?.email !== false,
        notes: [
          customerData.isAgentCallIn
            ? `15% Call-In Intake: Agent (${customerData.agentName || 'Call Center'}) took call and dispatched quote via ${[
                customerData.channels?.email !== false ? 'Email' : null,
                customerData.channels?.sms !== false ? 'SMS' : null,
                customerData.channels?.portal !== false ? 'Customer Portal' : null,
              ].filter(Boolean).join(' + ')}.`
            : `Instant quote requested online for ${activeQuote.containerName} at ${activeQuote.originPostcode.suburb}. Delivery slot: ${(activeQuote.selectedSlot || selectedSlot)?.label || 'Standard window'}.`,
        ],
      };

      const updatedLeads = [newLead, ...leads];
      setLeads(updatedLeads);
      saveCustomerLeads(updatedLeads);
      setSubmittedLead(newLead);

      // Automatically sync customer account into Customer Portal & Admin Accounts
      try {
        upsertCustomerFromLead({
          firstName: customerData.firstName,
          email: customerData.email,
          mobile: customerData.mobile,
          quote: activeQuote,
        });
        autoSyncEventToSmartsheet(`New Customer Quote (${activeQuote.containerName})`, newLead.id);

        // Dispatch quote via Email, SMS, or In-Portal (15% call-in / quote dispatch)
        dispatchQuoteToCustomer({
          quote: activeQuote,
          customerName: customerData.firstName,
          customerEmail: customerData.hasNoPhoneOrEmail ? undefined : customerData.email,
          customerMobile: customerData.hasNoPhoneOrEmail ? undefined : customerData.mobile,
          channels: customerData.channels || {
            email: Boolean(customerData.email && !customerData.hasNoPhoneOrEmail),
            sms: Boolean(customerData.mobile && !customerData.hasNoPhoneOrEmail),
            portal: true,
          },
          agentName: customerData.agentName || (customerData.isAgentCallIn ? 'Admin Call Center Agent' : undefined),
          agentNotes: customerData.agentNotes,
        });
      } catch (err) {
        console.error('Customer portal & smartsheet sync error:', err);
      }
    }

    // Step 9: Show final quote breakdown with detailed quote information
    setCurrentStep(9);
  };

  const handleLeadPaymentSuccess = (paymentResult: any) => {
    setLastPaymentResult(paymentResult);
    if (submittedLead) {
      const updatedLead: CustomerLead = {
        ...submittedLead,
        status: 'Booked',
        paymentStatus: 'Paid',
        paymentTransactionId: paymentResult.transactionId,
        paymentAmount: paymentResult.amount,
        paymentMethod: paymentResult.paymentMethod || 'Credit Card (Braintree)',
        notes: [
          ...(submittedLead.notes || []),
          `Payment of $${paymentResult.amount} successfully verified via Braintree Payments (Ref: ${paymentResult.transactionId}) at ${new Date().toLocaleTimeString()}.`,
        ],
      };
      setSubmittedLead(updatedLead);
      const updatedLeads = leads.map((l) => (l.id === submittedLead.id ? updatedLead : l));
      setLeads(updatedLeads);
      saveCustomerLeads(updatedLeads);

      // Sync payment confirmation and active order to customer portal & Smartsheet
      try {
        upsertCustomerFromLead({
          firstName: updatedLead.firstName,
          email: updatedLead.email,
          mobile: updatedLead.mobile,
          quote: updatedLead.quote,
          paymentTransactionId: paymentResult.transactionId,
          paymentAmount: paymentResult.amount,
          paymentMethod: paymentResult.paymentMethod || 'Credit Card (Braintree)',
        });
        autoSyncEventToSmartsheet(`Braintree Payment ($${paymentResult.amount}) Settled`, updatedLead.id);
      } catch (err) {
        console.error('Customer payment & smartsheet sync error:', err);
      }
    }

    // Advance directly to Step 10: Next Steps Page After Payment
    setCurrentStep(10);
  };

  // Navigation handlers
  const isMyPlaceStorage =
    serviceType === 'storage_at_place' ||
    (serviceType !== 'moving' && serviceType !== 'moving_storage' && storagePlacement === 'my_place');

  // Safety guard: If on-site storage at My Place is selected, ensure Step 3 (depot loading) is bypassed
  // and logistics are strictly locked to home delivery
  useEffect(() => {
    if (isMyPlaceStorage) {
      if (originLogisticsMethod !== 'home_delivery') {
        setOriginLogisticsMethod('home_delivery');
      }
      if (destinationLogisticsMethod !== 'home_delivery') {
        setDestinationLogisticsMethod('home_delivery');
      }
      if (currentStep === 3) {
        setCurrentStep(4);
      }
    }
  }, [currentStep, isMyPlaceStorage, originLogisticsMethod, destinationLogisticsMethod]);

      /* Where the arrow goes once there is no previous step: back through
       history if this tab has any, so a visitor who followed the CTA
       lands on the page they left, and the configured site otherwise. */
    const leaveToSite = () => {
      const site = (import.meta.env.VITE_SITE_URL as string) || 'https://portabox-website-ten.vercel.app/';
      if (window.history.length > 1) window.history.back();
      else window.location.href = site;
    };

  const handleBack = () => {
    if (currentStep === 4 && isMyPlaceStorage) {
      setCurrentStep(2);
    } else if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    } else {
      leaveToSite();
    }
  };

  const handleJumpToStep = (step: number) => {
    if (step === 3 && isMyPlaceStorage) {
      setCurrentStep(2);
      return;
    }
    if (step < currentStep) {
      setCurrentStep(step);
    }
  };

  const handleResetQuote = () => {
    setCurrentStep(1);
    setSubmittedLead(null);
    setOriginLogisticsMethod('home_delivery');
    setDestinationLogisticsMethod('home_delivery');
    setContainerSelections({
      small_10m3: 0,
      medium_19m3: 0,
      large_25m3: 1,
      two_large_50m3: 0,
    });
  };

  const currentHub = originPostcode ? getMetroHubForPostcode(originPostcode) : 'Adelaide';

  return (
    <div className="min-h-screen bg-[#f0f4f8] text-[#15385E] flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Header */}
      <Header
        currentStep={currentStep}
        onBack={handleBack}
        staffSession={staffSession}
        onOpenStaffLogin={() => handleOpenStaffLogin()}
        onStaffLogout={handleStaffLogout}
        onOpenStaffPermissions={() => {
          setAdminInitialTab('staff_permissions');
          setIsAdminOpen(true);
        }}
        isAdminOpen={isAdminOpen}
        onToggleAdmin={() => {
          if (!staffSession) {
            handleOpenStaffLogin('admin');
            return;
          }
          setIsAdminOpen(!isAdminOpen);
          if (!isAdminOpen) setIsCallCenterOpen(false);
        }}
        isCallCenterOpen={config.enableCallCenterDispatch !== false ? isCallCenterOpen : false}
        onToggleCallCenter={
          config.enableCallCenterDispatch !== false
            ? () => {
                if (!staffSession) {
                  handleOpenStaffLogin('dispatch');
                  return;
                }
                setIsCallCenterOpen(!isCallCenterOpen);
                if (!isCallCenterOpen) setIsAdminOpen(false);
              }
            : undefined
        }
        onOpenCustomerPortal={() => setIsCustomerPortalOpen(true)}
        onOpenDriverPortal={() => {
          if (!staffSession) {
            handleOpenStaffLogin('driver');
            return;
          }
          setIsDriverPortalOpen(true);
        }}
        onOpenSpaceCalculator={() => setIsSpaceCalculatorOpen(true)}
        onOpenPlacementChecker={config.enableDrivewayFitGuarantee ? () => setIsPlacementCheckerOpen(true) : undefined}
        onOpenCoverageMap={() => setIsCoverageMapModalOpen(true)}
        onOpenTelephony={() => {
          if (!staffSession) {
            handleOpenStaffLogin('telephony');
            return;
          }
          setAdminInitialTab('telephony');
          setIsAdminOpen(true);
          setIsCallCenterOpen(false);
        }}
        phone={config.phone}
        promoBannerSlogan={config.promoBannerSlogan}
        showPromoBanner={config.enablePromoBanner !== false}
        lockBannerOnScroll={config.lockTopBannerOnScroll !== false}
      />

      {/* Driver Login, Daily Calendar Jobs & Route Portal Modal */}
      <DriverPortalModal
        isOpen={isDriverPortalOpen}
        onClose={() => setIsDriverPortalOpen(false)}
        enableContainerInventory={config.enableContainerInventory !== false}
      />

      {/* Main Body */}
      {isCallCenterOpen && config.enableCallCenterDispatch !== false ? (
        <main className="flex-1 w-full flex flex-col p-0 m-0 overflow-hidden">
          <CallCenterCalendarPortal
            onClose={() => setIsCallCenterOpen(false)}
            onOpenCustomerPortal={() => setIsCustomerPortalOpen(true)}
            onApplyCustomerIncentive={(slotId) => {
              setSelectedSlot({
                id: slotId,
                label: slotId === 'morning' ? 'Morning Window' : slotId === 'midday' ? 'Midday Window' : 'Afternoon Window',
                timeRange: slotId === 'morning' ? '09:00 AM – 11:30 AM' : slotId === 'midday' ? '11:30 AM – 02:00 PM' : '02:00 PM – 04:30 PM',
                startHour: slotId === 'morning' ? 9 : slotId === 'midday' ? 11 : 14,
                startMinute: slotId === 'midday' ? 30 : 0,
                endHour: slotId === 'morning' ? 11 : slotId === 'midday' ? 14 : 16,
                endMinute: 30,
                available: true,
                slotsRemaining: 3,
              });
              setIsCallCenterOpen(false);
            }}
          />
        </main>
      ) : isAdminOpen ? (
        <AdminGate onCancel={() => setIsAdminOpen(false)}>
        <main className="flex-1 w-full flex flex-col p-0 m-0 overflow-hidden">
          <AdminPortal
            config={config}
            leads={leads}
            onSaveConfig={handleSaveConfig}
            onUpdateLeadStatus={handleUpdateLeadStatus}
            onAddLeadNote={handleAddLeadNote}
            onClose={() => setIsAdminOpen(false)}
            onOpenCustomerPortal={() => setIsCustomerPortalOpen(true)}
            initialTab={adminInitialTab as any}
          />
        </main>
      </AdminGate>
      ) : (
        /* Normal User Quote Flow: Full-width fluid layout with responsive gutters */
        <main className="flex-1 w-full max-w-[1920px] mx-auto px-3 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-16 py-4 sm:py-6 lg:py-8">
          <div>
            {/* Magic Resume Welcome Banner */}
            {magicResumeBanner && (
              <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-sky-50 to-white border-2 border-emerald-400 text-emerald-950 text-xs font-bold flex items-center justify-between gap-3 shadow-xs animate-in fade-in">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">✨</span>
                  <span>{magicResumeBanner}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMagicResumeBanner(null)}
                  className="px-3 py-1 bg-white hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-black cursor-pointer border border-emerald-200"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Steps 1 to 8: 2-Column Responsive Layout | Steps 9 & 10: Full width without sidebar */}
            <div className={currentStep >= 9 ? "max-w-5xl mx-auto w-full" : "grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 xl:gap-10 2xl:gap-12 items-start"}>
              {/* Left Area: Step Form (approx 7-8 cols or full width on Steps 9 & 10) */}
              <div className={currentStep >= 9 ? "w-full" : "lg:col-span-8 xl:col-span-8 2xl:col-span-8"}>
                {currentStep === 1 && (
                  <Step1Where
                    initialPostcode={originPostcode}
                    onSelectPostcode={(p) => setOriginPostcode(p)}
                    onContinue={() => setCurrentStep(2)}
                    config={config}
                  />
                )}

                {currentStep === 2 && originPostcode && (
                  <Step2What
                    originPostcode={originPostcode}
                    destinationPostcode={destinationPostcode}
                    onSelectDestinationPostcode={(p) => setDestinationPostcode(p)}
                    serviceType={serviceType}
                    onSelectServiceType={(st) => setServiceType(st)}
                    storagePlacement={storagePlacement}
                    onSelectStoragePlacement={(pl) => {
                      setStoragePlacement(pl);
                      if (pl === 'my_place') {
                        setOriginLogisticsMethod('home_delivery');
                        setDestinationLogisticsMethod('home_delivery');
                      }
                    }}
                    containerCount={containerCount}
                    onChangeLocation={() => setCurrentStep(1)}
                    onContinue={() => {
                      if (isMyPlaceStorage) {
                        setOriginLogisticsMethod('home_delivery');
                        setDestinationLogisticsMethod('home_delivery');
                        setCurrentStep(4);
                      } else {
                        setCurrentStep(3);
                      }
                    }}
                    onBack={handleBack}
                    config={config}
                  />
                )}

                {/* Step 3: Loading & Unloading Logistics (Depot Loading vs Home Delivery) */}
                {currentStep === 3 && originPostcode && (
                  <Step3LoadingLogistics
                    originPostcode={originPostcode}
                    destinationPostcode={destinationPostcode}
                    serviceType={serviceType}
                    originLogisticsMethod={originLogisticsMethod}
                    onSelectOriginLogistics={setOriginLogisticsMethod}
                    destinationLogisticsMethod={destinationLogisticsMethod}
                    onSelectDestinationLogistics={setDestinationLogisticsMethod}
                    originDepot={findClosestDepot(originPostcode.lat, originPostcode.lng).depot}
                    destinationDepot={
                      destinationPostcode
                        ? findClosestDepot(destinationPostcode.lat, destinationPostcode.lng).depot
                        : undefined
                    }
                    originDistanceKm={findClosestDepot(originPostcode.lat, originPostcode.lng).distanceKm}
                    legsSavedCount={activeQuote?.legsSavedCount}
                    legsSavedDollarTotal={activeQuote?.legsSavedDollarTotal}
                    isInterstate={activeQuote?.isInterstate}
                    onContinue={() => setCurrentStep(4)}
                    onBack={handleBack}
                    config={config}
                    containerCount={containerCount}
                  />
                )}

                {/* Step 4: Container Size Configuration */}
                {currentStep === 4 && (
                  <Step3Size
                    originPostcode={originPostcode}
                    destinationPostcode={destinationPostcode}
                    serviceType={serviceType}
                    storagePlacement={storagePlacement}
                    containerSelections={containerSelections}
                    onUpdateContainerSelections={setContainerSelections}
                    config={config}
                    onContinue={() => setCurrentStep(5)}
                    onBack={handleBack}
                  />
                )}

                {/* Step 5: Duration & Billing */}
                {currentStep === 5 && originPostcode && (
                  <Step4When
                    originPostcode={originPostcode}
                    containerSize={containerSize}
                    containerCount={containerCount}
                    containerSelections={containerSelections}
                    serviceType={serviceType}
                    storagePlacement={storagePlacement}
                    storageDuration={storageDuration}
                    onSelectDuration={(dur) => setStorageDuration(dur)}
                    storageDurationMonths={storageDurationMonths}
                    onSelectDurationMonths={(m) => setStorageDurationMonths(m)}
                    billingCycle={billingCycle}
                    onSelectBillingCycle={(cycle) => setBillingCycle(cycle)}
                    config={config}
                    onContinue={() => setCurrentStep(6)}
                    onBack={handleBack}
                  />
                )}

                {/* Step 6: Schedule Container Delivery & Driveway Placement */}
                {currentStep === 6 && originPostcode && (
                  <Step5DeliveryAndSupplies
                    originPostcode={originPostcode}
                    containerSize={containerSize}
                    containerCount={containerCount}
                    preferredDate={preferredDate}
                    onSelectDate={(dt) => setPreferredDate(dt)}
                    selectedSlot={selectedSlot}
                    onSelectSlot={(slot) => setSelectedSlot(slot)}
                    boxesCount={boxesCount}
                    onUpdateBoxesCount={(cnt) => setBoxesCount(cnt)}
                    blanketsCount={blanketsCount}
                    onUpdateBlanketsCount={(cnt) => setBlanketsCount(cnt)}
                    config={config}
                    onContinue={() => setCurrentStep(7)}
                    onBack={handleBack}
                  />
                )}

                {/* Step 7: Dedicated Packing Supplies & Insurance Page */}
                {currentStep === 7 && (
                  <Step6PackingSuppliesAndInsurance
                    containerSize={containerSize}
                    containerCount={containerCount}
                    insuranceSelected={insuranceSelected}
                    onToggleInsurance={(sel) => setInsuranceSelected(sel)}
                    locksCount={locksCount}
                    onUpdateLocksCount={(cnt) => setLocksCount(cnt)}
                    blanketsCount={blanketsCount}
                    onUpdateBlanketsCount={(cnt) => setBlanketsCount(cnt)}
                    boxesCount={boxesCount}
                    onUpdateBoxesCount={(cnt) => setBoxesCount(cnt)}
                    config={config}
                    onContinue={() => setCurrentStep(8)}
                    onBack={handleBack}
                  />
                )}

                {/* Step 8: "Where do we send your quote" */}
                {currentStep === 8 && activeQuote && (
                  <Step5SendQuote
                    quote={activeQuote}
                    onSendQuote={handleSendQuote}
                    onBack={handleBack}
                    initialCustomerData={customerContact || undefined}
                  />
                )}

                {/* Step 9: Final Quote Page with Detailed Quote Information */}
                {currentStep === 9 && activeQuote && (
                  <Step5Quote
                    quote={activeQuote}
                    customerData={customerContact || undefined}
                    onResetQuote={handleResetQuote}
                    onApplyPromoCode={(code) => setAppliedPromoCode(code)}
                    onUpdateBoxesCount={(cnt) => setBoxesCount(cnt)}
                    onUpdateBlanketsCount={(cnt) => setBlanketsCount(cnt)}
                    onSelectSlot={(slot) => setSelectedSlot(slot)}
                    depotCalendarConfig={config.depotCalendars?.[currentHub]}
                    onPaymentSuccess={handleLeadPaymentSuccess}
                    onGoToNextSteps={() => setCurrentStep(10)}
                    onOpenBookingModal={() => handleOpenBookingModal(activeQuote)}
                    phone={config.phone}
                    config={config}
                  />
                )}

                {/* Step 10: Next Steps Page After Payment (with Customer Lifecycle Roadmap) */}
                {currentStep === 10 && activeQuote && (
                  <Step9NextSteps
                    quote={activeQuote}
                    customerData={customerContact || undefined}
                    paymentResult={lastPaymentResult}
                    onOpenPlacementChecker={() => setIsPlacementCheckerOpen(true)}
                    onOpenCustomerPortal={() => setIsCustomerPortalOpen(true)}
                    onBackToQuote={() => setCurrentStep(9)}
                    onResetQuote={handleResetQuote}
                    phone={config.phone}
                  />
                )}
              </div>

              {/* Right Area: "YOUR QUOTE SO FAR" Tracker (hidden on Steps 9 & 10) */}
              {currentStep < 9 && (
                <div className="lg:col-span-4 xl:col-span-4 2xl:col-span-4 sticky top-24 sm:top-28">
                  <RightSidebar
                    currentStep={currentStep}
                    onJumpToStep={handleJumpToStep}
                    originPostcode={originPostcode}
                    destinationPostcode={destinationPostcode}
                    originLogisticsMethod={originLogisticsMethod}
                    destinationLogisticsMethod={destinationLogisticsMethod}
                    legsSavedCount={activeQuote?.legsSavedCount}
                    legsSavedDollarTotal={activeQuote?.legsSavedDollarTotal}
                    movingDistanceKm={activeQuote?.movingDistanceKm}
                    movingKmCharge={activeQuote?.movingKmCharge}
                    fuelSurchargeAmount={activeQuote?.fuelSurchargeAmount}
                    serviceType={serviceType}
                    storagePlacement={storagePlacement}
                    containerSize={containerSize}
                    containerCount={activeQuote?.containerCount || containerCount}
                    containerSelections={containerSelections}
                    totalVolumeM3={activeQuote?.totalVolumeM3}
                    storageDuration={storageDuration}
                    preferredDate={preferredDate}
                    selectedSlot={selectedSlot || activeQuote?.selectedSlot}
                    metroHubName={currentHub}
                    billingCycle={billingCycle}
                    boxesCount={boxesCount}
                    blanketsCount={blanketsCount}
                    locksCount={locksCount}
                    insuranceSelected={insuranceSelected}
                    insuranceMonthlyFee={activeQuote?.insuranceMonthlyFee}
                    deliveryFeePerContainer={activeQuote?.domesticLegFeePerContainer}
                    deliveryZone={activeQuote?.deliveryZone}
                    deliveryZoneRangeLabel={activeQuote?.deliveryZoneRangeLabel}
                    interstateFeePerContainer={activeQuote?.interstateFeePerContainer}
                    monthlyStorageFee={activeQuote?.monthlyStorageFee}
                    enableDrivewayFitGuarantee={config.enableDrivewayFitGuarantee}
                    enableGoogleCalendarLink={config.enableGoogleCalendarLink}
                    onOpenPlacementChecker={config.enableDrivewayFitGuarantee ? () => setIsPlacementCheckerOpen(true) : undefined}
                    onBookNow={() => handleOpenBookingModal(activeQuote)}
                  />
                </div>
              )}
            </div>
          </div>
        </main>
      )}

      {/* Quiet, Clean Footer (hidden in Admin or Call Center mode) */}
      {!isAdminOpen && !isCallCenterOpen && (
        <footer className="w-full bg-[#f0f4f8] py-8 border-t border-slate-200/80 mt-auto">
          <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-16 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-[#15385E]">porta<span className="text-[#5CC1EF]">box</span></span>
              <span>·</span>
              <span>Moving & Portable Storage Containers Australia</span>
            </div>

            <div className="flex items-center gap-6 flex-wrap">
              <span>Adelaide · Melbourne · Sydney · Brisbane</span>
              {config.enableDrivewayFitGuarantee && (
                <button
                  onClick={() => setIsPlacementCheckerOpen(true)}
                  className="text-[#15385E] hover:text-[#5CC1EF] font-bold cursor-pointer transition-colors"
                >
                  Driveway Fit Guarantee
                </button>
              )}
              <button
                onClick={() => setIsSpaceCalculatorOpen(true)}
                className="text-[#15385E] hover:text-[#5CC1EF] font-bold cursor-pointer transition-colors"
              >
                Space Calculator
              </button>
              <button
                onClick={() => setIsCustomerPortalOpen(true)}
                className="text-[#15385E] hover:text-[#5CC1EF] font-bold cursor-pointer transition-colors"
              >
                Customer Portal
              </button>
              <button
                onClick={() => {
                  if (staffSession) {
                    setIsAdminOpen(true);
                  } else {
                    handleOpenStaffLogin('admin');
                  }
                }}
                className="text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
              >
                {staffSession ? `Staff Portal (${staffSession.user.name.split(' ')[0]})` : 'Staff & Admin Login (2FA)'}
              </button>
            </div>
          </div>
        </footer>
      )}

      {/* Customer Portal Modal */}
      <CustomerPortal
        isOpen={isCustomerPortalOpen}
        onClose={() => setIsCustomerPortalOpen(false)}
        phone={config.phone}
        onOpenBookingModal={(q) => handleOpenBookingModal(q)}
      />

      {/* Dedicated Booking Decision Modal */}
      {activeQuote && (
        <BookingDecisionModal
          isOpen={isBookingModalOpen}
          onClose={() => {
            setIsBookingModalOpen(false);
            setBookingModalQuote(null);
          }}
          quote={bookingModalQuote || activeQuote}
          customerData={customerContact ? {
            firstName: customerContact.firstName,
            lastName: '',
            mobile: customerContact.mobile,
            email: customerContact.email,
          } as any : null}
          onBookingComplete={() => {
            setIsBookingModalOpen(false);
            setBookingModalQuote(null);
            setCurrentStep(9);
          }}
        />
      )}

      {/* Interactive Room by Room Container Space Calculator Modal */}
      <SpaceCalculatorModal
        isOpen={isSpaceCalculatorOpen}
        onClose={() => setIsSpaceCalculatorOpen(false)}
        onUpdateContainerSelections={setContainerSelections}
        onSelectSize={(size, count) => {
          setContainerSelections({
            small_10m3: size === 'small_10m3' ? (count || 1) : 0,
            medium_19m3: size === 'medium_19m3' ? (count || 1) : 0,
            large_25m3: size === 'large_25m3' ? (count || 1) : 0,
            two_large_50m3: 0,
          });
        }}
      />

      {/* Driveway Placement & Site Feasibility Modal (Feature-flagged) */}
      {config.enableDrivewayFitGuarantee && (
        <DrivewayPlacementCheckerModal
          isOpen={isPlacementCheckerOpen}
          onClose={() => setIsPlacementCheckerOpen(false)}
          selectedContainerSize={containerSize}
          onSelectRecommendedSize={(size) => {
            setContainerSelections({
              small_10m3: size === 'small_10m3' ? 1 : 0,
              medium_19m3: size === 'medium_19m3' ? 1 : 0,
              large_25m3: size === 'large_25m3' ? 1 : 0,
              two_large_50m3: size === 'two_large_50m3' ? 1 : 0,
            });
          }}
          suburbName={originPostcode?.suburb}
          stateCode={originPostcode?.state}
        />
      )}

      {/* Floating Twilio Softphone Dialer & Inbound Alert Bar (Only Rendered for 2FA-Authenticated Staff with Telephony Permission) */}
      {staffSession && hasStaffPermission(staffSession.user, 'softphone_telephony') && (
        <TwilioSoftphoneBar
          onOpenScreenPop={(cust: CustomerAccount | null, call: TelephonyCall | null) => {
            setScreenPopCustomer(cust);
            setActiveTelephonyCall(call);
            setIsCustomer360Open(true);
          }}
          onOpenTelephonyHub={() => {
            setAdminInitialTab('telephony');
            setIsAdminOpen(true);
            setIsCallCenterOpen(false);
          }}
        />
      )}

      {/* Slide-over Customer 360 Screen-Pop Workspace */}
      <Customer360Drawer
        isOpen={isCustomer360Open}
        onClose={() => setIsCustomer360Open(false)}
        customer={screenPopCustomer}
        activeCall={activeTelephonyCall}
      />

      {/* Global Interactive Coverage Areas Map Modal */}
      <CoverageAreaMapModal
        isOpen={isCoverageMapModalOpen}
        onClose={() => setIsCoverageMapModalOpen(false)}
        config={config}
        initialPostcode={originPostcode?.postcode || '5061'}
        onSelectPostcode={(pc) => {
          const found = AUSTRALIAN_POSTCODES.find((p) => p.postcode === pc);
          if (found) {
            setOriginPostcode(found);
          }
        }}
      />

      {/* 2FA Protected Portabox Staff & Admin Login Modal */}
      <AdminLoginModal
        isOpen={isAdminLoginModalOpen}
        onClose={() => setIsAdminLoginModalOpen(false)}
        onLoginSuccess={handleStaffLoginSuccess}
        targetFeatureLabel={targetFeatureAfterLogin}
      />
    </div>
  );
}
