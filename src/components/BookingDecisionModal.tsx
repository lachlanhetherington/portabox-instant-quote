import React, { useState } from 'react';
import {
  X,
  Check,
  ShieldCheck,
  Truck,
  Calendar,
  Clock,
  MapPin,
  CreditCard,
  Building,
  Home,
  CheckCircle2,
  Download,
  ArrowRight,
  Phone,
  FileText,
  Lock,
  Sparkles,
  ChevronRight,
  AlertTriangle,
  Key,
  User,
  Users,
  CheckSquare,
  Square,
  Layers,
  Compass,
} from 'lucide-react';
import { QuoteBreakdown, CustomerLead } from '../types/quote';
import {
  loadCustomerAccounts,
  saveCustomerAccounts,
} from '../services/customerPortalService';
import { syncCustomerPortalActionToSmartsheet } from '../services/smartsheetService';

interface BookingDecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: QuoteBreakdown;
  customerData?: CustomerLead | null;
  onBookingComplete?: (bookingReference: string) => void;
}

type BookingStage = 'placement' | 'dates' | 'security' | 'payment';

export const BookingDecisionModal: React.FC<BookingDecisionModalProps> = ({
  isOpen,
  onClose,
  quote,
  customerData,
  onBookingComplete,
}) => {
  const [currentStage, setCurrentStage] = useState<BookingStage>('placement');
  const [isConfirmed, setIsConfirmed] = useState(false);

  // STAGE 1: Clearance & Placement State
  const [clearanceLength, setClearanceLength] = useState(true); // >= 10m truck run
  const [clearanceWidth, setClearanceWidth] = useState(true); // >= 3.5m width
  const [clearanceHeight, setClearanceHeight] = useState(true); // >= 4.5m overhead
  const [doorOrientation, setDoorOrientation] = useState<'house' | 'street'>('house');
  const [surfaceType, setSurfaceType] = useState<
    'Concrete Driveway' | 'Paved Asphalt' | 'Grass / Lawn' | 'Gravel / Dirt' | 'Roadside / Nature Strip'
  >('Concrete Driveway');
  const [deliveryAddress, setDeliveryAddress] = useState(
    `${quote.originPostcode.suburb}, ${quote.originPostcode.state} ${quote.originPostcode.postcode}`
  );
  const [placementNotes, setPlacementNotes] = useState('');

  // STAGE 2: Scheduling & Delivery Dates
  const [scheduledDate, setScheduledDate] = useState(
    quote.preferredDate || new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [deliveryWindow, setDeliveryWindow] = useState<'morning' | 'afternoon' | 'flexible'>(
    quote.selectedSlot?.label?.toLowerCase().includes('afternoon') ? 'afternoon' : 'morning'
  );

  // STAGE 3: Customer Security PIN & Alternate Contact
  const [customerId] = useState(
    () => `PB-CUST-${Math.floor(10000 + Math.random() * 90000)}`
  );
  const [accountPin, setAccountPin] = useState('2468');
  const [dob, setDob] = useState('15/06/1988');
  const [idType, setIdType] = useState<'Driver Licence' | 'Passport' | 'Proof of Age Card'>('Driver Licence');
  const [firstName, setFirstName] = useState(customerData?.firstName || '');
  const [lastName, setLastName] = useState(customerData?.lastName || '');
  const [mobile, setMobile] = useState(customerData?.mobile || '');
  const [email, setEmail] = useState(customerData?.email || '');

  // Alternate Contact Details
  const [altFirstName, setAltFirstName] = useState('');
  const [altLastName, setAltLastName] = useState('');
  const [altRelationship, setAltRelationship] = useState('Partner / Spouse');
  const [altMobile, setAltMobile] = useState('');
  const [altEmail, setAltEmail] = useState('');

  // STAGE 4: Payment Details
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'eft' | 'auto_eft'>('card');
  const [cardName, setCardName] = useState(
    customerData?.firstName ? `${customerData.firstName} ${customerData.lastName || ''}`.trim() : 'Valued Customer'
  );
  const [cardNumber, setCardNumber] = useState('•••• •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('888');
  const [termsAccepted, setTermsAccepted] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingRef, setBookingRef] = useState('');

  if (!isOpen) return null;

  const isOnsite =
    quote.serviceType === 'storage_at_place' || quote.storagePlacement === 'my_place';

  const windowLabels = {
    morning: 'Morning Window (8:00 AM – 12:00 PM)',
    afternoon: 'Afternoon Window (12:00 PM – 4:00 PM)',
    flexible: 'Flexible Full-Day (8:00 AM – 5:00 PM - Priority Route)',
  };

  const handleNextStage = () => {
    setError(null);
    if (currentStage === 'placement') {
      if (!clearanceLength || !clearanceWidth || !clearanceHeight) {
        setError('Please confirm that your site meets the minimum clearance requirements for the level-lift truck.');
        return;
      }
      if (!deliveryAddress.trim()) {
        setError('Please enter a delivery street address.');
        return;
      }
      setCurrentStage('dates');
    } else if (currentStage === 'dates') {
      if (!scheduledDate) {
        setError('Please select a preferred delivery date.');
        return;
      }
      setCurrentStage('security');
    } else if (currentStage === 'security') {
      if (!firstName.trim() || !mobile.trim()) {
        setError('Please provide your first name and mobile phone number.');
        return;
      }
      if (!accountPin || accountPin.length < 4) {
        setError('Please enter a 4-digit security PIN to secure your customer portal.');
        return;
      }
      setCurrentStage('payment');
    }
  };

  const handleConfirmBooking = () => {
    if (!termsAccepted) {
      setError('Please accept the container rental agreement and 1-year price-lock terms.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const ref = `PB-BK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    setBookingRef(ref);

    try {
      const accounts = loadCustomerAccounts();
      const existingIdx = accounts.findIndex(
        (a) =>
          (email && a.email.toLowerCase() === email.toLowerCase()) ||
          (mobile && a.mobile.replace(/\s+/g, '') === mobile.replace(/\s+/g, ''))
      );

      const newOrder: any = {
        id: ref,
        orderNumber: ref,
        containerId: `PB-${quote.originDepot?.id ? quote.originDepot.id.toUpperCase().slice(0, 3) : 'BNE'}-${Math.floor(100 + Math.random() * 900)}`,
        containerSize: quote.containerSize,
        containerName: quote.containerName,
        serviceType: isOnsite ? 'Storage at your home' : 'Storage at Portabox secure location',
        status: 'Scheduled',
        location: quote.originPostcode.suburb,
        originAddress: deliveryAddress,
        scheduledDeliveryDate: scheduledDate,
        deliveryWindow: windowLabels[deliveryWindow],
        timeToDeliveryHours: 48,
        accessNotes: placementNotes || `Doors facing ${doorOrientation}. Surface: ${surfaceType}. Level-lift placement confirmed.`,
        placementSurface: surfaceType,
        doorOrientation: doorOrientation === 'house' ? 'Doors Facing House / Property' : 'Doors Facing Street / Road',
        accessGateWidth: clearanceWidth ? 'Wide Open (>3.5m)' : 'Standard (3.0m - 3.5m)',
        overheadClearanceClear: clearanceHeight,
        secondaryContactName: altFirstName ? `${altFirstName} ${altLastName} (${altRelationship})` : undefined,
        secondaryContactPhone: altMobile || undefined,
        monthlyRate: quote.monthlyStorageFee,
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-AU'),
        daysRemainingInLock: 365,
        accessHours: isOnsite ? '24/7 Driveway Access' : 'Business Hours Depot Access',
        placementNotes: placementNotes || `Doors facing ${doorOrientation}. Surface: ${surfaceType}. Clearances verified: 10m length, 3.5m width, 4.5m overhead.`,
        history: [
          {
            timestamp: new Date().toLocaleString('en-AU'),
            stage: 'Booking Confirmed & Dispatched',
            note: `Booking confirmed with $${quote.firstPaymentTotal} first payment. 1-Year price freeze active. Delivery set for ${scheduledDate} (${windowLabels[deliveryWindow]}).`,
          },
        ],
      };

      if (existingIdx >= 0) {
        accounts[existingIdx].orders = [newOrder, ...(accounts[existingIdx].orders || [])];
        accounts[existingIdx].address = deliveryAddress;
        if (accounts[existingIdx].quotes) {
          accounts[existingIdx].quotes = accounts[existingIdx].quotes.map((q) =>
            q.containerSize === quote.containerSize ? { ...q, status: 'Accepted' } : q
          );
        }
      } else {
        accounts.push({
          id: customerId,
          email: email || `customer-${Date.now()}@portabox.com.au`,
          firstName,
          lastName: lastName || '',
          mobile,
          address: deliveryAddress,
          suburb: quote.originPostcode.suburb,
          state: quote.originPostcode.state,
          postcode: quote.originPostcode.postcode,
          memberSince: new Date().toLocaleDateString('en-AU'),
          verified: true,
          passwordHash: accountPin,
          quotes: [
            {
              id: `Q-${Date.now()}`,
              quoteNumber: `Q-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
              createdAt: new Date().toLocaleDateString('en-AU'),
              validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-AU'),
              containerSize: quote.containerSize,
              containerCount: quote.containerCount,
              billingCycle: quote.billingCycle,
              firstPaymentTotal: quote.firstPaymentTotal,
              monthlyStorageFee: quote.monthlyStorageFee,
              status: 'Accepted',
              quoteData: quote,
            },
          ],
          orders: [newOrder],
          transactions: [
            {
              id: `TXN-${Date.now().toString().slice(-6)}`,
              invoiceNumber: `INV-${Date.now().toString().slice(-5)}`,
              date: new Date().toLocaleDateString('en-AU'),
              description: `Initial Container Delivery & First Period Rent (${ref}) - 1-Yr Frozen Rate`,
              amount: quote.firstPaymentTotal,
              status: 'Paid',
              pdfUrl: '#',
              paymentMethod:
                paymentMethod === 'card'
                  ? 'Credit Card (Visa •••• 4242)'
                  : paymentMethod === 'eft'
                  ? 'Direct EFT Transfer'
                  : 'Auto EFT / PayID',
            },
          ],
          discountsGiven: [],
          passkeys: [],
        } as any);
      }

      saveCustomerAccounts(accounts);

      // Sync to Smartsheet / Logistics CRM
      syncCustomerPortalActionToSmartsheet({
        customerId: ref,
        customerName: `${firstName} ${lastName}`.trim(),
        actionType: 'booking_updated',
        details: `Customer booked ${quote.containerName} (${quote.containerCount}x) for ${scheduledDate}. Total: $${quote.firstPaymentTotal}. Clearances verified (10m x 3.5m x 4.5m), Doors: ${doorOrientation}. Storage: ${isOnsite ? 'Your Home' : 'Our Location'}.`,
      });

      if (onBookingComplete) {
        onBookingComplete(ref);
      }

      setIsConfirmed(true);
    } catch (err: any) {
      console.error('Failed to confirm booking:', err);
      setError('An error occurred processing your booking. Please try again or call 1800 467 637.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh]">
        {/* Modal Header */}
        <div className="bg-[#15385E] text-white px-5 sm:px-8 py-4 flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#F7D347] flex items-center justify-center text-[#1A1A1A] font-black shadow-xs shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-white">
                  {isConfirmed ? 'Booking Confirmed!' : 'Complete Your Portabox Booking'}
                </h3>
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-md">
                  1-Year Price Freeze
                </span>
              </div>
              <p className="text-xs text-sky-200">
                {isConfirmed
                  ? `Booking reference ${bookingRef} has been confirmed.`
                  : 'Confirm site placement clearances, delivery schedule, security PIN, and lock in your rate.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-sm transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Wizard Stepper Bar (Decision Mode only) */}
        {!isConfirmed && (
          <div className="bg-slate-100 border-b border-slate-200 px-4 sm:px-8 py-2.5 shrink-0">
            <div className="grid grid-cols-4 gap-2 text-center">
              <button
                type="button"
                onClick={() => setCurrentStage('placement')}
                className={`flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg text-xs font-bold transition-all ${
                  currentStage === 'placement'
                    ? 'bg-[#15385E] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center">1</span>
                <span className="truncate">Placement</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentStage('dates')}
                className={`flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg text-xs font-bold transition-all ${
                  currentStage === 'dates'
                    ? 'bg-[#15385E] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center">2</span>
                <span className="truncate">Scheduling</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentStage('security')}
                className={`flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg text-xs font-bold transition-all ${
                  currentStage === 'security'
                    ? 'bg-[#15385E] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center">3</span>
                <span className="truncate">Security PIN</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentStage('payment')}
                className={`flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg text-xs font-bold transition-all ${
                  currentStage === 'payment'
                    ? 'bg-[#15385E] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center">4</span>
                <span className="truncate">Payment</span>
              </button>
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-7 bg-[#f8fafc] space-y-6">
          {!isConfirmed ? (
            <>
              {/* STAGE 1: Placement & Site Clearances */}
              {currentStage === 'placement' && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  <div className="bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200 rounded-2xl p-4 text-xs space-y-2">
                    <div className="flex items-center gap-2 font-black text-[#15385E]">
                      <Truck className="w-4 h-4 text-[#5CC1EF]" />
                      <span>Horizontal Level-Lift System Guarantee</span>
                    </div>
                    <p className="text-slate-700 leading-relaxed">
                      Our specialized level-lift trucks keep your container <strong>100% horizontal</strong> while loading and unloading — so nothing inside shifts or tilts. To place safely at your location, our driver requires standard site clearances:
                    </p>
                  </div>

                  {/* Clearance Checkpoints */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-[#15385E] flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Site Clearance Verification (Required)</span>
                    </h4>

                    <div className="space-y-2.5 pt-1">
                      {/* Clearance 1: 10m Length */}
                      <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={clearanceLength}
                          onChange={(e) => setClearanceLength(e.target.checked)}
                          className="mt-0.5 rounded text-[#15385E] focus:ring-[#5CC1EF]"
                        />
                        <div className="text-xs">
                          <div className="flex items-center gap-2 font-black text-slate-900">
                            <span>Minimum 10m Clear Truck Run</span>
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">Verified</span>
                          </div>
                          <p className="text-slate-500 text-[11px] mt-0.5">
                            Straight driveway or road approach in front of the placement spot for the level-lift truck to align and unload safely.
                          </p>
                        </div>
                      </label>

                      {/* Clearance 2: 3.5m Width */}
                      <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={clearanceWidth}
                          onChange={(e) => setClearanceWidth(e.target.checked)}
                          className="mt-0.5 rounded text-[#15385E] focus:ring-[#5CC1EF]"
                        />
                        <div className="text-xs">
                          <div className="flex items-center gap-2 font-black text-slate-900">
                            <span>Minimum 3.5m Driveway / Gate Width</span>
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">Verified</span>
                          </div>
                          <p className="text-slate-500 text-[11px] mt-0.5">
                            Sufficient width through entrance gates, pillars, and driveway corridors for container and truck width.
                          </p>
                        </div>
                      </label>

                      {/* Clearance 3: 4.5m Height */}
                      <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={clearanceHeight}
                          onChange={(e) => setClearanceHeight(e.target.checked)}
                          className="mt-0.5 rounded text-[#15385E] focus:ring-[#5CC1EF]"
                        />
                        <div className="text-xs">
                          <div className="flex items-center gap-2 font-black text-slate-900">
                            <span>Minimum 4.5m Overhead Height Clearance</span>
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">Verified</span>
                          </div>
                          <p className="text-slate-500 text-[11px] mt-0.5">
                            Clear vertical space free of low tree branches, power lines, carport overhangs, and building eaves.
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Orientation & Surface */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-wider text-[#15385E] flex items-center gap-2">
                      <Compass className="w-4 h-4 text-[#5CC1EF]" />
                      <span>Container Door Orientation &amp; Surface</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                          Where Should Container Doors Face?
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setDoorOrientation('house')}
                            className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                              doorOrientation === 'house'
                                ? 'border-[#15385E] bg-sky-50 text-[#15385E] font-bold'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                            }`}
                          >
                            <span className="block font-black text-xs">Facing House</span>
                            <span className="text-[10px] opacity-75">Easy walking access to front door</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setDoorOrientation('street')}
                            className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                              doorOrientation === 'street'
                                ? 'border-[#15385E] bg-sky-50 text-[#15385E] font-bold'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                            }`}
                          >
                            <span className="block font-black text-xs">Facing Street</span>
                            <span className="text-[10px] opacity-75">Driveway vehicle access</span>
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                          Driveway / Ground Surface
                        </label>
                        <select
                          value={surfaceType}
                          onChange={(e: any) => setSurfaceType(e.target.value)}
                          className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#5CC1EF] bg-white"
                        >
                          <option value="Concrete Driveway">Concrete Driveway</option>
                          <option value="Paved Asphalt">Paved Asphalt</option>
                          <option value="Grass / Lawn">Firm Grass / Lawn</option>
                          <option value="Gravel / Dirt">Crushed Gravel / Dirt</option>
                          <option value="Roadside / Nature Strip">Roadside / Nature Strip</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Delivery Street Address *
                      </label>
                      <input
                        type="text"
                        required
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder={`e.g. 142 River Road, ${quote.originPostcode.suburb}`}
                        className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#5CC1EF]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Driver Placement &amp; Gate Notes (Optional)
                      </label>
                      <input
                        type="text"
                        value={placementNotes}
                        onChange={(e) => setPlacementNotes(e.target.value)}
                        placeholder="e.g. Place on left side of double driveway, gate code #1234, watch for low mailbox"
                        className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#5CC1EF]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STAGE 2: Scheduling & Delivery Dates */}
              {currentStage === 'dates' && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-wider text-[#15385E] flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#5CC1EF]" />
                      <span>Select Preferred Delivery Date</span>
                    </h4>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Delivery Date
                        </label>
                        <input
                          type="date"
                          value={scheduledDate}
                          min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                          onChange={(e) => setScheduledDate(e.target.value)}
                          className="w-full sm:w-72 px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#5CC1EF]"
                        />
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            const d = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0];
                            setScheduledDate(d);
                          }}
                          className="px-3 py-1 text-[11px] font-bold rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer"
                        >
                          In 2 Days
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const d = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                            setScheduledDate(d);
                          }}
                          className="px-3 py-1 text-[11px] font-bold rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer"
                        >
                          In 5 Days
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                            setScheduledDate(d);
                          }}
                          className="px-3 py-1 text-[11px] font-bold rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer"
                        >
                          Next Week
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Delivery Window Selection */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-wider text-[#15385E] flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#5CC1EF]" />
                      <span>Select Delivery Time Window</span>
                    </h4>

                    <div className="space-y-2.5">
                      <button
                        type="button"
                        onClick={() => setDeliveryWindow('morning')}
                        className={`w-full p-3.5 rounded-xl border-2 text-left flex items-center justify-between transition-all cursor-pointer ${
                          deliveryWindow === 'morning'
                            ? 'border-[#15385E] bg-sky-50 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <span className="font-black text-xs text-slate-900 block">
                            Morning Window (8:00 AM – 12:00 PM)
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Driver dispatches early morning with live SMS tracking 30 mins prior
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                          Available
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeliveryWindow('afternoon')}
                        className={`w-full p-3.5 rounded-xl border-2 text-left flex items-center justify-between transition-all cursor-pointer ${
                          deliveryWindow === 'afternoon'
                            ? 'border-[#15385E] bg-sky-50 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <span className="font-black text-xs text-slate-900 block">
                            Afternoon Window (12:00 PM – 4:00 PM)
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Ideal for mid-day arrivals; live driver SMS update sent on dispatch
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                          Available
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeliveryWindow('flexible')}
                        className={`w-full p-3.5 rounded-xl border-2 text-left flex items-center justify-between transition-all cursor-pointer ${
                          deliveryWindow === 'flexible'
                            ? 'border-[#15385E] bg-sky-50 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <span className="font-black text-xs text-slate-900 block">
                            Flexible Full-Day (8:00 AM – 5:00 PM)
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Fastest logistics routing — driver delivers within optimal route schedule
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-sky-800 bg-sky-100 px-2 py-0.5 rounded-md">
                          Eco-Efficient
                        </span>
                      </button>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-600 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#F7D347] shrink-0" />
                      <span>
                        Real-time delivery slot dispatch linked to Portabox logistics calendar.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* STAGE 3: Security PIN & Alternate Contact */}
              {currentStage === 'security' && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  {/* Account Security PIN */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h4 className="text-xs font-black uppercase tracking-wider text-[#15385E] flex items-center gap-2">
                        <Key className="w-4 h-4 text-[#5CC1EF]" />
                        <span>Customer Account &amp; Security PIN</span>
                      </h4>
                      <span className="text-[11px] font-mono font-bold text-slate-500">
                        Assigned ID: {customerId}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          4-Digit Security PIN *
                        </label>
                        <input
                          type="password"
                          maxLength={4}
                          value={accountPin}
                          onChange={(e) => setAccountPin(e.target.value.replace(/\D/g, ''))}
                          placeholder="e.g. 2468"
                          className="w-full px-3 py-2 text-xs font-mono font-black tracking-widest rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#5CC1EF] bg-slate-50"
                        />
                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                          Used to log in &amp; manage your container
                        </span>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Date of Birth (DOB)
                        </label>
                        <input
                          type="text"
                          value={dob}
                          onChange={(e) => setDob(e.target.value)}
                          placeholder="DD/MM/YYYY"
                          className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#5CC1EF]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          ID Type Verification
                        </label>
                        <select
                          value={idType}
                          onChange={(e: any) => setIdType(e.target.value)}
                          className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#5CC1EF] bg-white"
                        >
                          <option value="Driver Licence">Driver Licence</option>
                          <option value="Passport">Australian Passport</option>
                          <option value="Proof of Age Card">Proof of Age Card</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          First Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="e.g. Sarah"
                          className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#5CC1EF]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Last Name
                        </label>
                        <input
                          type="text"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="e.g. Jenkins"
                          className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#5CC1EF]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Mobile Phone * (for driver dispatch SMS)
                        </label>
                        <input
                          type="tel"
                          required
                          value={mobile}
                          onChange={(e) => setMobile(e.target.value)}
                          placeholder="0400 000 000"
                          className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#5CC1EF]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Email Address (for tax invoice PDF)
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="sarah@example.com.au"
                          className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#5CC1EF]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Secondary / Alternate Contact */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h4 className="text-xs font-black uppercase tracking-wider text-[#15385E] flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#5CC1EF]" />
                        <span>Secondary Alternate Contact (Optional)</span>
                      </h4>
                      <span className="text-[11px] text-slate-400">
                        Emergency or authorized site representative
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Alternate First Name
                        </label>
                        <input
                          type="text"
                          value={altFirstName}
                          onChange={(e) => setAltFirstName(e.target.value)}
                          placeholder="e.g. David"
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#5CC1EF]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Alternate Last Name
                        </label>
                        <input
                          type="text"
                          value={altLastName}
                          onChange={(e) => setAltLastName(e.target.value)}
                          placeholder="e.g. Jenkins"
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#5CC1EF]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Relationship to You
                        </label>
                        <select
                          value={altRelationship}
                          onChange={(e) => setAltRelationship(e.target.value)}
                          className="w-full px-3 py-2 font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#5CC1EF] bg-white"
                        >
                          <option value="Partner / Spouse">Partner / Spouse</option>
                          <option value="Family Member">Family Member</option>
                          <option value="Property Manager / Landlord">Property Manager / Landlord</option>
                          <option value="Site Contact / Builder">Site Contact / Builder</option>
                          <option value="Colleague / Friend">Colleague / Friend</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Alternate Mobile Phone
                        </label>
                        <input
                          type="tel"
                          value={altMobile}
                          onChange={(e) => setAltMobile(e.target.value)}
                          placeholder="0411 222 333"
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#5CC1EF]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STAGE 4: Payment & Rate-Lock Confirmation */}
              {currentStage === 'payment' && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  {/* Itemized Order & Price Breakdown */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <span className="text-xs font-black uppercase tracking-wider text-[#15385E] flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-[#5CC1EF]" />
                        <span>Order Summary &amp; 1-Year Rate Freeze</span>
                      </span>
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        12-Month Rate Locked
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Container Order</span>
                        <p className="font-extrabold text-slate-900 text-sm">
                          {quote.containerCount} × {quote.containerName} ({quote.containerVolume})
                        </p>
                        <p className="text-slate-500 text-[11px]">
                          Dimensions: {quote.containerDimensions?.length || '4.8m'} (L) × {quote.containerDimensions?.width || '2.4m'} (W) × {quote.containerDimensions?.height || '2.4m'} (H)
                        </p>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Storage Placement</span>
                        <p className="font-extrabold text-slate-900 text-sm">
                          {isOnsite ? 'Stored at Your Home (Onsite)' : 'Stored at Our Location'}
                        </p>
                        <p className="text-slate-500 text-[11px]">
                          Doors facing: {doorOrientation === 'house' ? 'House / Property' : 'Street'} · Surface: {surfaceType}
                        </p>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Scheduled Delivery</span>
                        <p className="font-extrabold text-slate-900 text-sm">
                          {scheduledDate}
                        </p>
                        <p className="text-slate-500 text-[11px]">
                          {windowLabels[deliveryWindow]}
                        </p>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Delivery Address</span>
                        <p className="font-extrabold text-slate-900 text-sm truncate">
                          {deliveryAddress}
                        </p>
                        <p className="text-slate-500 text-[11px]">
                          Zone {quote.deliveryZone} ({quote.deliveryZoneRangeLabel || '< 25 km'})
                        </p>
                      </div>
                    </div>

                    {/* Price Breakdown Line Items */}
                    <div className="p-4 bg-slate-50/90 rounded-2xl border border-slate-200 space-y-2 text-xs">
                      <div className="flex justify-between items-center text-slate-700">
                        <span>
                          {isOnsite ? 'Container Hire (first period):' : 'Location Storage (first period):'}
                        </span>
                        <span className="font-mono font-bold">${quote.currentPeriodicStorageFee}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-700">
                        <span>Initial delivery fee (Zone {quote.deliveryZone}):</span>
                        <span className="font-mono font-bold">${quote.initialDeliveryFee}</span>
                      </div>
                      {quote.packingSupplies?.totalSuppliesPrice > 0 && (
                        <div className="flex justify-between items-center text-slate-700">
                          <span>Packing supplies &amp; blankets:</span>
                          <span className="font-mono font-bold">${quote.packingSupplies.totalSuppliesPrice}</span>
                        </div>
                      )}
                      {(quote.insuranceMonthlyFee || 0) > 0 && (
                        <div className="flex justify-between items-center text-slate-700">
                          <span>Contents Protection ($5,000 cover):</span>
                          <span className="font-mono font-bold">${quote.insuranceMonthlyFee}</span>
                        </div>
                      )}
                      {quote.totalDiscount > 0 && (
                        <div className="flex justify-between items-center text-emerald-700 font-bold">
                          <span>Promotional discount applied:</span>
                          <span className="font-mono">-${quote.totalDiscount}</span>
                        </div>
                      )}
                      <div className="pt-2.5 border-t border-slate-200 flex justify-between items-baseline">
                        <div>
                          <span className="font-extrabold text-slate-900 text-sm">Total First Payment:</span>
                          <span className="text-[11px] text-slate-500 block">Includes GST · Monthly rent frozen for 1 year</span>
                        </div>
                        <span className="text-xl sm:text-2xl font-black text-[#15385E] font-mono">
                          ${quote.firstPaymentTotal}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Methods */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
                    <span className="text-xs font-black uppercase tracking-wider text-[#15385E] flex items-center gap-1.5 border-b border-slate-100 pb-3">
                      <CreditCard className="w-4 h-4 text-[#5CC1EF]" />
                      <span>Select Payment Method</span>
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('card')}
                        className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                          paymentMethod === 'card'
                            ? 'border-[#15385E] bg-sky-50 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <CreditCard className="w-4 h-4 text-[#15385E]" />
                          <span className="font-extrabold text-xs text-slate-900">Credit / Debit Card</span>
                        </div>
                        <p className="text-[10px] text-slate-500">Stripe / Braintree instant verification</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('eft')}
                        className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                          paymentMethod === 'eft'
                            ? 'border-[#15385E] bg-sky-50 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Building className="w-4 h-4 text-[#15385E]" />
                          <span className="font-extrabold text-xs text-slate-900">Direct Deposit / EFT</span>
                        </div>
                        <p className="text-[10px] text-slate-500">Bank transfer via BSB &amp; Account</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('auto_eft')}
                        className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                          paymentMethod === 'auto_eft'
                            ? 'border-[#15385E] bg-sky-50 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Sparkles className="w-4 h-4 text-[#15385E]" />
                          <span className="font-extrabold text-xs text-slate-900">Auto EFT / PayID</span>
                        </div>
                        <p className="text-[10px] text-slate-500">Fast PayID &amp; automated billing</p>
                      </button>
                    </div>

                    {paymentMethod === 'card' && (
                      <div className="p-3.5 bg-slate-50 rounded-xl space-y-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Cardholder Name</label>
                          <input
                            type="text"
                            value={cardName}
                            onChange={(e) => setCardName(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#5CC1EF]"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-2">
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Card Number</label>
                            <input
                              type="text"
                              value={cardNumber}
                              onChange={(e) => setCardNumber(e.target.value)}
                              className="w-full px-3 py-1.5 text-xs font-mono font-bold rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#5CC1EF]"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Expiry / CVC</label>
                            <div className="flex gap-1">
                              <input
                                type="text"
                                value={cardExpiry}
                                onChange={(e) => setCardExpiry(e.target.value)}
                                placeholder="MM/YY"
                                className="w-1/2 px-2 py-1.5 text-xs font-mono font-bold rounded-lg border border-slate-300 bg-white text-center focus:outline-none"
                              />
                              <input
                                type="text"
                                value={cardCvc}
                                onChange={(e) => setCardCvc(e.target.value)}
                                placeholder="CVC"
                                className="w-1/2 px-2 py-1.5 text-xs font-mono font-bold rounded-lg border border-slate-300 bg-white text-center focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                          <Lock className="w-3.5 h-3.5 text-emerald-600" />
                          <span>256-Bit SSL Encrypted &amp; PCI-DSS Level 1 Compliant</span>
                        </div>
                      </div>
                    )}

                    {paymentMethod === 'eft' && (
                      <div className="p-3.5 bg-slate-50 rounded-xl space-y-2 text-xs">
                        <p className="font-bold text-slate-800">Direct Deposit Bank Details:</p>
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <span className="text-slate-500 block">Bank:</span>
                            <span className="font-bold text-slate-800">Commonwealth Bank of Australia</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Account Name:</span>
                            <span className="font-bold text-slate-800">Portabox Australia Pty Ltd</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">BSB:</span>
                            <span className="font-mono font-bold text-slate-800">063-000</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Account Number:</span>
                            <span className="font-mono font-bold text-slate-800">1234 5678</span>
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-500 pt-1">
                          Use your Customer ID (<strong>{customerId}</strong>) as payment reference.
                        </p>
                      </div>
                    )}

                    {paymentMethod === 'auto_eft' && (
                      <div className="p-3.5 bg-slate-50 rounded-xl space-y-2 text-xs">
                        <p className="font-bold text-slate-800">PayID &amp; Automated Billing:</p>
                        <p className="text-slate-600 text-[11px]">
                          Portabox PayID: <span className="font-mono font-bold text-[#15385E]">accounts@portabox.com.au</span>
                        </p>
                        <p className="text-[10px] text-slate-500">
                          Instant receipt will be sent automatically to {email || 'your email'}.
                        </p>
                      </div>
                    )}

                    {/* Terms Agreement Checkbox */}
                    <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        className="mt-0.5 rounded text-[#15385E] focus:ring-[#5CC1EF]"
                      />
                      <span className="text-xs text-slate-600 leading-relaxed">
                        I agree to the Portabox Container Rental Agreement, confirm 10m length, 3.5m width, and 4.5m overhead clearances for horizontal level-lift delivery, and authorize the initial first payment of <strong>${quote.firstPaymentTotal}</strong> (with 1-year rate freeze).
                      </span>
                    </label>

                    {error && (
                      <p className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 text-xs font-bold">
                        {error}
                      </p>
                    )}

                    {/* Confirm Booking Button */}
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleConfirmBooking}
                      className="w-full py-3.5 px-6 rounded-2xl bg-[#F7D347] hover:bg-[#eed235] text-[#1A1A1A] font-black text-sm uppercase tracking-wider border border-[#e6c338] shadow-md flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-98 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <span>Securing Your Booking &amp; Rate...</span>
                      ) : (
                        <>
                          <span>Confirm Booking &amp; Pay ${quote.firstPaymentTotal}</span>
                          <ArrowRight className="w-4 h-4 stroke-[3]" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Navigation Controls between stages */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                {currentStage !== 'placement' ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (currentStage === 'dates') setCurrentStage('placement');
                      else if (currentStage === 'security') setCurrentStage('dates');
                      else if (currentStage === 'payment') setCurrentStage('security');
                    }}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    ← Back
                  </button>
                ) : (
                  <div />
                )}

                {currentStage !== 'payment' && (
                  <button
                    type="button"
                    onClick={handleNextStage}
                    className="px-5 py-2.5 rounded-xl bg-[#15385E] text-white hover:bg-[#1f4a7a] font-black text-xs uppercase tracking-wider shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Continue</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </>
          ) : (
            /* BOOKING CONFIRMED SUCCESS STATE */
            <div className="text-center py-6 space-y-6 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <span className="text-xs font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  Confirmed &amp; Dispatch Scheduled
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-[#15385E] mt-2">
                  You're all booked in!
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-md mx-auto">
                  Your delivery slot on <strong>{scheduledDate}</strong> is locked in with a <strong>1-Year Rate Freeze Guarantee</strong>. We have sent SMS confirmation to your mobile ({mobile}).
                </p>
              </div>

              {/* Reference & Account Credential Box */}
              <div className="max-w-md mx-auto p-5 bg-white border-2 border-slate-200 rounded-2xl space-y-2.5 text-left text-xs shadow-xs">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="font-bold text-slate-500">Booking Reference:</span>
                  <span className="font-mono font-black text-sm text-[#15385E]">{bookingRef}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-bold">Assigned Customer ID:</span>
                  <span className="font-mono font-bold text-slate-900">{customerId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-bold">Customer Portal PIN:</span>
                  <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    {accountPin}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Container:</span>
                  <span className="font-bold text-slate-900">
                    {quote.containerCount} × {quote.containerName} ({quote.containerVolume})
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Storage Location:</span>
                  <span className="font-bold text-slate-900">
                    {isOnsite ? 'Stored at Your Home' : 'Stored at Our Location'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Scheduled Date &amp; Window:</span>
                  <span className="font-bold text-slate-900">
                    {scheduledDate} · {deliveryWindow === 'morning' ? '8am-12pm' : deliveryWindow === 'afternoon' ? '12pm-4pm' : 'Flexible'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Door Orientation:</span>
                  <span className="font-bold text-slate-900">
                    Doors Facing {doorOrientation === 'house' ? 'House / Property' : 'Street'}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                  <span className="text-slate-800 font-black">1-Year Rate Freeze:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    Active (until {new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString('en-AU')})
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    window.print();
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#15385E] text-white font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-[#1a4470] cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5 text-[#F7D347]" />
                  <span>Download Booking Confirmation</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 text-slate-800 font-bold text-xs hover:bg-slate-200 cursor-pointer"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
