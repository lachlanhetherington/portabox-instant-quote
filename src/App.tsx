import React, { useState, useMemo, useEffect } from 'react';
import { Header } from './components/Header';
import { RightSidebar } from './components/RightSidebar';
import { Step1Where } from './components/Step1Where';
import { Step2What } from './components/Step2What';
import { Step3Size } from './components/Step3Size';
import { Step4When } from './components/Step4When';
import { Step5SendQuote } from './components/Step5SendQuote';
import { Step5Quote } from './components/Step5Quote';
import { Step6Confirmation } from './components/Step6Confirmation';
import { AdminPortal } from './components/AdminPortal';
import { CustomerPortal } from './components/CustomerPortal';
import { CallCenterCalendarPortal } from './components/CallCenterCalendarPortal';
import { CancelQuoteModal } from './components/CancelQuoteModal';
import { PortalHubModal } from './components/PortalHubModal';
import { Lock } from 'lucide-react';
import { upsertCustomerFromLead } from './services/customerPortalService';
import { autoSyncEventToSmartsheet } from './services/smartsheetService';
import {
  AUSTRALIAN_POSTCODES,
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
  ServiceType,
  StorageDuration,
} from './types/quote';

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
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isCustomerPortalOpen, setIsCustomerPortalOpen] = useState(false);
  const [isCallCenterOpen, setIsCallCenterOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isPortalHubOpen, setIsPortalHubOpen] = useState(false);

  // Keyboard shortcut for staff access (Ctrl+Shift+A for Admin, Ctrl+Shift+P for Portal Hub)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setIsAdminOpen((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setIsPortalHubOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Quote Flow State
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [sessionId] = useState<string>(() => 'sess-' + Math.random().toString(36).substring(2, 9));
  const [customerContact, setCustomerContact] = useState<{
    firstName: string;
    mobile: string;
    email: string;
    agreedToContact: boolean;
  } | null>(null);

  const [originPostcode, setOriginPostcode] = useState<PostcodeRecord | null>(
    postcodeFromUrl() || AUSTRALIAN_POSTCODES[0] // 5061 Hyde Park SA
  );
  const [destinationPostcode, setDestinationPostcode] = useState<PostcodeRecord | null>(null);
  const [serviceType, setServiceType] = useState<ServiceType>('storage_at_place');
  const [storagePlacement, setStoragePlacement] = useState<'my_place' | 'facility'>('my_place');
  const [containerSize, setContainerSize] = useState<ContainerSizeId>('large_25m3');
  const [containerCount, setContainerCount] = useState<number>(1);
  const [storageDuration, setStorageDuration] = useState<StorageDuration>('4_to_11_months');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [boxesCount, setBoxesCount] = useState<number>(0);
  const [blanketsCount, setBlanketsCount] = useState<number>(0);
  
  // Default delivery date matching reference or 2-3 days ahead
  const [preferredDate, setPreferredDate] = useState<string>('Wed 14 Oct 2026');
  const [selectedSlot, setSelectedSlot] = useState<DeliverySlotWindow | undefined>(undefined);
  const [appliedPromoCode, setAppliedPromoCode] = useState<string>('');

  // Submitted lead
  const [submittedLead, setSubmittedLead] = useState<CustomerLead | null>(null);

  // Calculated quote memo
  const activeQuote = useMemo(() => {
    if (!originPostcode) return null;
    return calculateQuote({
      originPostcode,
      destinationPostcode: destinationPostcode || undefined,
      serviceType,
      containerSize,
      containerCount,
      billingCycle,
      storageDuration,
      preferredDate,
      selectedSlot,
      boxesCount,
      blanketsCount,
      appliedPromoCode,
      config,
    });
  }, [
    originPostcode,
    destinationPostcode,
    serviceType,
    containerSize,
    containerCount,
    billingCycle,
    storageDuration,
    preferredDate,
    selectedSlot,
    boxesCount,
    blanketsCount,
    appliedPromoCode,
    config,
  ]);

  // Track user drop-off per page in real-time
  useEffect(() => {
    const PAGE_NAMES: Record<number, string> = {
      1: 'Page 1: Where are you moving or storing?',
      2: 'Page 2: What is your move or storage setup?',
      3: 'Page 3: Which size do you need?',
      4: 'Page 4: When & storage duration',
      5: 'Page 5: Where do we send your quote',
      6: 'Page 6: Final Quote (Detailed quote & savings)',
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
      completed: currentStep === 6,
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

  // Customer submit quote in Step 5 ("Where do we send your quote")
  const handleSendQuote = (customerData: {
    firstName: string;
    mobile: string;
    email: string;
    agreedToContact: boolean;
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
        dropOffPage: 'Page 6: Final Quote (Completed)',
        smsSent: true,
        emailSent: true,
        notes: [`Instant quote requested online for ${activeQuote.containerName} at ${activeQuote.originPostcode.suburb}. Delivery slot: ${(activeQuote.selectedSlot || selectedSlot)?.label || 'Standard window'}.`],
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
      } catch (err) {
        console.error('Customer portal & smartsheet sync error:', err);
      }
    }

    // Step 7 Requirement: "send quote button-> show the last page with the final quote page with the detailed quote information information"
    setCurrentStep(6);
  };

  const handleLeadPaymentSuccess = (paymentResult: any) => {
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
  };

  // Navigation handlers
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleJumpToStep = (step: number) => {
    if (step < currentStep) {
      setCurrentStep(step);
    }
  };

  const handleResetQuote = () => {
    setCurrentStep(1);
    setSubmittedLead(null);
  };

  const currentHub = originPostcode ? getMetroHubForPostcode(originPostcode) : 'Adelaide';

  return (
    <div className="min-h-screen bg-[#f0f4f8] text-[#0f2c4a] flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Header */}
      <Header
        currentStep={currentStep}
        onBackStep={handleBack}
        onCancelQuote={() => setIsCancelModalOpen(true)}
        isAdminOpen={isAdminOpen}
        onToggleAdmin={() => {
          setIsAdminOpen(!isAdminOpen);
          if (!isAdminOpen) setIsCallCenterOpen(false);
        }}
        isCallCenterOpen={config.enableCallCenterDispatch !== false ? isCallCenterOpen : false}
        onToggleCallCenter={
          config.enableCallCenterDispatch !== false
            ? () => {
                setIsCallCenterOpen(!isCallCenterOpen);
                if (!isCallCenterOpen) setIsAdminOpen(false);
              }
            : undefined
        }
        onOpenCustomerPortal={() => setIsCustomerPortalOpen(true)}
        onOpenPortalHub={() => setIsPortalHubOpen(true)}
        phone={config.phone}
      />

      {/* Main Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-2.5 sm:py-8">
        {/* If Call Center Dispatch is Open */}
        {isCallCenterOpen && config.enableCallCenterDispatch !== false ? (
          <CallCenterCalendarPortal
            onClose={() => setIsCallCenterOpen(false)}
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
        ) : isAdminOpen ? (
          <AdminPortal
            config={config}
            leads={leads}
            onSaveConfig={handleSaveConfig}
            onUpdateLeadStatus={handleUpdateLeadStatus}
            onAddLeadNote={handleAddLeadNote}
            onClose={() => setIsAdminOpen(false)}
          />
        ) : (
          /* Normal User Quote Flow */
          <div>
            {/* Steps 1 to 5: 2-Column Responsive Layout | Step 6: Full width without sidebar */}
            <div className={currentStep === 6 ? "max-w-4xl mx-auto w-full" : "grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start"}>
              {/* Left Area: Step Form (approx 7 cols or full width on Step 6) */}
              <div className={currentStep === 6 ? "w-full" : "lg:col-span-8"}>
                {currentStep === 1 && (
                  <Step1Where
                    initialPostcode={originPostcode}
                    onSelectPostcode={(p) => setOriginPostcode(p)}
                    onContinue={() => setCurrentStep(2)}
                    onCancelQuote={() => setIsCancelModalOpen(true)}
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
                    onSelectStoragePlacement={(pl) => setStoragePlacement(pl)}
                    containerCount={containerCount}
                    onChangeLocation={() => setCurrentStep(1)}
                    onContinue={() => setCurrentStep(3)}
                    onBack={handleBack}
                    config={config}
                  />
                )}

                {currentStep === 3 && (
                  <Step3Size
                    containerSize={containerSize}
                    onSelectContainerSize={(sz) => {
                      setContainerSize(sz);
                      if (sz === 'combo_35m3') {
                        setContainerCount(2);
                      }
                    }}
                    containerCount={containerCount}
                    onSelectContainerCount={(cnt) => setContainerCount(cnt)}
                    config={config}
                    onContinue={() => setCurrentStep(4)}
                    onBack={handleBack}
                  />
                )}

                {currentStep === 4 && originPostcode && (
                  <Step4When
                    originPostcode={originPostcode}
                    containerSize={containerSize}
                    containerCount={containerCount}
                    storageDuration={storageDuration}
                    onSelectDuration={(dur) => setStorageDuration(dur)}
                    billingCycle={billingCycle}
                    onSelectBillingCycle={(cycle) => setBillingCycle(cycle)}
                    preferredDate={preferredDate}
                    onSelectDate={(dt) => setPreferredDate(dt)}
                    boxesCount={boxesCount}
                    onUpdateBoxesCount={(cnt) => setBoxesCount(cnt)}
                    blanketsCount={blanketsCount}
                    onUpdateBlanketsCount={(cnt) => setBlanketsCount(cnt)}
                    selectedSlot={selectedSlot}
                    onSelectSlot={(slot) => setSelectedSlot(slot)}
                    config={config}
                    onContinue={() => setCurrentStep(5)}
                    onBack={handleBack}
                  />
                )}

                {/* Step 5: "Where do we send your quote" */}
                {currentStep === 5 && activeQuote && (
                  <Step5SendQuote
                    quote={activeQuote}
                    onSendQuote={handleSendQuote}
                    onBack={handleBack}
                    initialCustomerData={customerContact || undefined}
                  />
                )}

                {/* Step 6: Final Quote Page with Detailed Quote Information */}
                {currentStep === 6 && activeQuote && (
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
                    phone={config.phone}
                  />
                )}
              </div>

              {/* Right Area: "YOUR QUOTE SO FAR" Tracker (hidden on mobile and hidden on Step 6) */}
              {currentStep !== 6 && (
                <div className="hidden lg:block lg:col-span-4">
                  <RightSidebar
                    currentStep={currentStep}
                    onJumpToStep={handleJumpToStep}
                    originPostcode={originPostcode}
                    destinationPostcode={destinationPostcode}
                    movingDistanceKm={activeQuote?.movingDistanceKm}
                    movingKmCharge={activeQuote?.movingKmCharge}
                    fuelSurchargeAmount={activeQuote?.fuelSurchargeAmount}
                    serviceType={serviceType}
                    storagePlacement={storagePlacement}
                    containerSize={containerSize}
                    containerCount={activeQuote?.containerCount || containerCount}
                    storageDuration={storageDuration}
                    preferredDate={preferredDate}
                    selectedSlot={selectedSlot || activeQuote?.selectedSlot}
                    metroHubName={currentHub}
                    billingCycle={billingCycle}
                    boxesCount={boxesCount}
                    blanketsCount={blanketsCount}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Quiet, Clean, High-Converting Consolidated Footer */}
      <footer className="w-full bg-[#f0f4f8] py-3 sm:py-5 border-t border-slate-200/80 mt-auto">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#0b2942]">portabox</span>
            <span>·</span>
            <span>Moving & Portable Storage Containers Australia</span>
          </div>

          <div className="flex items-center gap-3 sm:gap-5">
            <span className="hidden md:inline text-slate-400">Adelaide · Melbourne · Sydney · Brisbane · Sunshine Coast</span>
            <button
              onClick={() => setIsPortalHubOpen(true)}
              className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors font-semibold py-1 px-2.5 rounded-lg hover:bg-slate-200/60 cursor-pointer"
              title="Staff, Dispatch & Customer Portals"
            >
              <Lock className="w-3 h-3 text-slate-400" />
              <span>Staff & Portals</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Cancel Quote Confirmation Modal */}
      <CancelQuoteModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        onConfirm={() => {
          setIsCancelModalOpen(false);
          handleResetQuote();
        }}
        websiteUrl={(import.meta.env.VITE_SITE_URL as string) || 'https://portabox-website-ten.vercel.app/'}
      />

      {/* Unified Portal Hub Modal (Consolidates Customer Portal, Dispatch, & Admin) */}
      <PortalHubModal
        isOpen={isPortalHubOpen}
        onClose={() => setIsPortalHubOpen(false)}
        onOpenCustomerPortal={() => setIsCustomerPortalOpen(true)}
        onOpenCallCenter={() => setIsCallCenterOpen(true)}
        onOpenAdmin={() => setIsAdminOpen(true)}
        isCallCenterEnabled={config.enableCallCenterDispatch !== false}
        phone={config.phone}
      />

      {/* Customer Portal Modal */}
      <CustomerPortal
        isOpen={isCustomerPortalOpen}
        onClose={() => setIsCustomerPortalOpen(false)}
        phone={config.phone}
      />
    </div>
  );
}
