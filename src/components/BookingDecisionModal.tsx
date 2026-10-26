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

export const BookingDecisionModal: React.FC<BookingDecisionModalProps> = ({
  isOpen,
  onClose,
  quote,
  customerData,
  onBookingComplete,
}) => {
  const [step, setStep] = useState<'decision' | 'confirmed'>('decision');

  // Contact & Delivery Details
  const [firstName, setFirstName] = useState(customerData?.firstName || '');
  const [lastName, setLastName] = useState(customerData?.lastName || '');
  const [mobile, setMobile] = useState(customerData?.mobile || '');
  const [email, setEmail] = useState(customerData?.email || '');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [placementNotes, setPlacementNotes] = useState('');

  // Payment method & card details
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'eft'>('card');
  const [cardNumber, setCardNumber] = useState('•••• •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('888');
  const [cardName, setCardName] = useState(
    customerData?.firstName ? `${customerData.firstName} ${customerData.lastName || ''}`.trim() : 'Valued Customer'
  );

  const [termsAccepted, setTermsAccepted] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingRef, setBookingRef] = useState('');

  if (!isOpen) return null;

  const isOnsite =
    quote.serviceType === 'storage_at_place' || quote.storagePlacement === 'my_place';

  const handleConfirmBooking = () => {
    if (!firstName.trim() || !mobile.trim()) {
      setError('Please provide your name and mobile phone for delivery dispatch.');
      return;
    }
    if (!termsAccepted) {
      setError('Please accept the container hire agreement terms to continue.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    // Generate unique booking reference
    const ref = `PB-BK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    setBookingRef(ref);

    try {
      // 1. Create or update Customer Account with confirmed order
      const accounts = loadCustomerAccounts();
      const existingIdx = accounts.findIndex(
        (a) =>
          a.email.toLowerCase() === email.toLowerCase() ||
          a.mobile.replace(/\s+/g, '') === mobile.replace(/\s+/g, '')
      );

      const newOrder: any = {
        id: ref,
        orderNumber: ref,
        containerId: `PB-${quote.originDepot.id.toUpperCase().slice(0, 3)}-${Math.floor(100 + Math.random() * 900)}`,
        containerSize: quote.containerSize,
        containerName: quote.containerName,
        serviceType: isOnsite ? 'Storage at your place' : 'Storage at Portabox facility',
        status: 'Scheduled',
        location: quote.originPostcode.suburb,
        originAddress: deliveryAddress || `${quote.originPostcode.suburb}, ${quote.originPostcode.state} ${quote.originPostcode.postcode}`,
        scheduledDeliveryDate: quote.preferredDate,
        deliveryWindow: quote.selectedSlot?.label || '9:00 AM – 11:30 AM (Morning Window)',
        timeToDeliveryHours: 48,
        accessNotes: placementNotes || 'Standard driveway placement (level-lift)',
        monthlyRate: quote.monthlyStorageFee,
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-AU'),
        daysRemainingInLock: 365,
        accessHours: '24/7 Driveway Access',
        placementNotes: placementNotes || 'Standard driveway placement (level-lift)',
        history: [
          {
            timestamp: new Date().toLocaleString('en-AU'),
            stage: 'Booking Confirmed',
            note: `Initial payment of $${quote.firstPaymentTotal} confirmed (${paymentMethod === 'card' ? 'Card Deposit' : 'EFT Invoice'}). Reserved for ${quote.preferredDate}.`,
          },
        ],
      };

      if (existingIdx >= 0) {
        accounts[existingIdx].orders = [newOrder, ...(accounts[existingIdx].orders || [])];
        // Mark matching quote as Accepted
        if (accounts[existingIdx].quotes) {
          accounts[existingIdx].quotes = accounts[existingIdx].quotes.map((q) =>
            q.containerSize === quote.containerSize ? { ...q, status: 'Accepted' } : q
          );
        }
      } else {
        accounts.push({
          id: `CUST-${Date.now().toString().slice(-5)}`,
          email: email || `customer-${Date.now()}@portabox.com.au`,
          firstName,
          lastName: lastName || '',
          mobile,
          address: deliveryAddress || `${quote.originPostcode.suburb}, ${quote.originPostcode.state}`,
          suburb: quote.originPostcode.suburb,
          state: quote.originPostcode.state,
          postcode: quote.originPostcode.postcode,
          memberSince: new Date().toLocaleDateString('en-AU'),
          verified: true,
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
              description: `Initial Container Delivery & First Period Rent (${ref})`,
              amount: quote.firstPaymentTotal,
              status: 'Paid',
              pdfUrl: '#',
              paymentMethod: paymentMethod === 'card' ? 'Visa •••• 4242' : 'Direct Bank Deposit',
            },
          ],
          discountsGiven: [],
          passkeys: [],
        } as any);
      }

      saveCustomerAccounts(accounts);

      // 2. Sync to Smartsheet / Logistics CRM
      syncCustomerPortalActionToSmartsheet({
        customerId: ref,
        customerName: `${firstName} ${lastName}`.trim(),
        actionType: 'booking_updated',
        details: `Customer booked ${quote.containerName} (${quote.containerCount}x) for ${quote.preferredDate}. Total: $${quote.firstPaymentTotal}. Storage: ${isOnsite ? 'Onsite at Place' : 'Facility Depot'}.`,
      });

      // 3. Notify parent or global callbacks
      if (onBookingComplete) {
        onBookingComplete(ref);
      }

      setStep('confirmed');
    } catch (err: any) {
      console.error('Failed to confirm booking:', err);
      setError('An error occurred processing your booking. Please try again or call 1800 467 637.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]">
        {/* Modal Header */}
        <div className="bg-[#15385E] text-white px-5 sm:px-8 py-4 flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#F7D347] flex items-center justify-center text-[#1A1A1A] font-black shadow-xs">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-lg sm:text-xl text-white">
                  {step === 'decision' ? 'Complete Your Portabox Booking' : 'Booking Confirmed!'}
                </h3>
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-md">
                  Guaranteed Rate
                </span>
              </div>
              <p className="text-xs text-sky-200">
                {step === 'decision'
                  ? 'Review your quote, confirm delivery placement, and lock in your container.'
                  : `Booking reference ${bookingRef} has been generated.`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-7 bg-[#f8fafc] space-y-6">
          {step === 'decision' ? (
            <>
              {/* SECTION 1: Itemized Decision Review Card */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-xs font-black uppercase tracking-wider text-[#15385E] flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#5CC1EF]" />
                    <span>1. Quote &amp; Delivery Summary</span>
                  </span>
                  <span className="text-[11px] font-bold text-slate-500">
                    Quote #{quote.originDepot ? `PBQ-${quote.originDepot.id.toUpperCase()}-VERIFIED` : 'PBQ-INSTANT'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Container Configuration</span>
                    <p className="font-extrabold text-slate-900 text-sm">
                      {quote.containerCount} × {quote.containerName} ({quote.containerVolume})
                    </p>
                    <p className="text-slate-500 text-[11px]">
                      Dimensions: {quote.containerDimensions?.length || '4.8m'} × {quote.containerDimensions?.width || '2.4m'} × {quote.containerDimensions?.height || '2.4m'}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Storage Location Choice</span>
                    <div className="flex items-center gap-1.5">
                      {isOnsite ? (
                        <span className="inline-flex items-center gap-1 font-extrabold text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded-md text-xs">
                          <Home className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Store at My Place (Onsite)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-extrabold text-sky-900 bg-sky-100 px-2 py-0.5 rounded-md text-xs">
                          <Building className="w-3.5 h-3.5 text-[#15385E]" />
                          <span>Portabox Secure Facility</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {isOnsite
                        ? 'Clean monthly onsite hire · Kept on your driveway with zero facility storage fees'
                        : `Stored at ${quote.originDepot.name} with 24/7 security & climate management`}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">First Scheduled Delivery</span>
                    <p className="font-extrabold text-slate-900 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#15385E]" />
                      <span>{quote.preferredDate}</span>
                    </p>
                    {quote.selectedSlot && (
                      <p className="text-slate-500 text-[11px] flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{quote.selectedSlot.label} ({quote.selectedSlot.timeRange})</span>
                      </p>
                    )}
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Delivery Location</span>
                    <p className="font-extrabold text-slate-900 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#15385E]" />
                      <span>{quote.originPostcode.suburb}, {quote.originPostcode.state} {quote.originPostcode.postcode}</span>
                    </p>
                    <p className="text-slate-500 text-[11px]">
                      Zone {quote.deliveryZone} ({quote.deliveryZoneRangeLabel || '< 25 km'}) · {quote.originDistanceKm} km from depot
                    </p>
                  </div>
                </div>

                {/* Price Breakdown Line Items */}
                <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-100 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-700">
                    <span>
                      {isOnsite ? 'Onsite Container Hire (first period)' : 'Portabox Facility Storage (first period)'}:
                    </span>
                    <span className="font-mono font-bold">${quote.currentPeriodicStorageFee}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-700">
                    <span>Initial empty container delivery (Zone {quote.deliveryZone}):</span>
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
                      <span>Customer Property Protection (CPO Insurance):</span>
                      <span className="font-mono font-bold">${quote.insuranceMonthlyFee}</span>
                    </div>
                  )}
                  {quote.totalDiscount > 0 && (
                    <div className="flex justify-between items-center text-emerald-700 font-bold">
                      <span>Promotional discount applied:</span>
                      <span className="font-mono">-${quote.totalDiscount}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                    <div>
                      <span className="font-extrabold text-slate-900 text-sm">Total First Payment:</span>
                      <span className="text-[11px] text-slate-500 block">Includes GST · All subsequent months billed in advance</span>
                    </div>
                    <span className="text-xl sm:text-2xl font-black text-[#15385E] font-mono">
                      ${quote.firstPaymentTotal}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Delivery Contact & Site Access Details */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
                <span className="text-xs font-black uppercase tracking-wider text-[#15385E] flex items-center gap-1.5 border-b border-slate-100 pb-3">
                  <Truck className="w-4 h-4 text-[#5CC1EF]" />
                  <span>2. Delivery Site &amp; Contact Details</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      Mobile Number (for Driver SMS updates) *
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
                      Email Address (for Tax Invoice PDF)
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="sarah@example.com.au"
                      className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#5CC1EF]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Street Address
                    </label>
                    <input
                      type="text"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder={`123 Example Street, ${quote.originPostcode.suburb}`}
                      className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#5CC1EF]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Driver Placement &amp; Site Access Notes (Optional)
                    </label>
                    <input
                      type="text"
                      value={placementNotes}
                      onChange={(e) => setPlacementNotes(e.target.value)}
                      placeholder="e.g. Left side of double driveway, doors facing street, gate code #1234"
                      className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#5CC1EF]"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: Payment & Deposit Authorization */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
                <span className="text-xs font-black uppercase tracking-wider text-[#15385E] flex items-center gap-1.5 border-b border-slate-100 pb-3">
                  <CreditCard className="w-4 h-4 text-[#5CC1EF]" />
                  <span>3. Payment &amp; Deposit Authorization</span>
                </span>

                {/* Payment Option Tabs */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                      paymentMethod === 'card'
                        ? 'border-[#15385E] bg-sky-50/50 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <CreditCard className="w-4 h-4 text-[#15385E]" />
                      <span className="font-extrabold text-xs text-slate-900">Credit / Debit Card</span>
                    </div>
                    <p className="text-[11px] text-slate-500">Instant reservation &amp; deposit confirmation</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('eft')}
                    className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                      paymentMethod === 'eft'
                        ? 'border-[#15385E] bg-sky-50/50 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Building className="w-4 h-4 text-[#15385E]" />
                      <span className="font-extrabold text-xs text-slate-900">Direct Deposit / EFT</span>
                    </div>
                    <p className="text-[11px] text-slate-500">Invoice sent with PayID &amp; BSB transfer</p>
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

                {/* Terms Agreement Checkbox */}
                <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 rounded text-[#15385E] focus:ring-[#5CC1EF]"
                  />
                  <span className="text-xs text-slate-600 leading-relaxed">
                    I agree to the Portabox Container Rental Agreement, confirm 3.5m vertical clearance for horizontal level-lift placement, and authorize the initial first payment of <strong>${quote.firstPaymentTotal}</strong>.
                  </span>
                </label>

                {error && (
                  <p className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 text-xs font-bold">
                    {error}
                  </p>
                )}

                {/* Primary Booking Button */}
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleConfirmBooking}
                  className="w-full py-3.5 px-6 rounded-2xl bg-[#F7D347] hover:bg-[#eed235] text-[#1A1A1A] font-black text-sm uppercase tracking-wider border border-[#e6c338] shadow-md flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-98 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Securing Your Booking...</span>
                  ) : (
                    <>
                      <span>Confirm Booking &amp; Pay ${quote.firstPaymentTotal}</span>
                      <ArrowRight className="w-4 h-4 stroke-[3]" />
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            /* SECTION 4: Booking Confirmed Success State */
            <div className="text-center py-6 space-y-6">
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
                  Your delivery slot on <strong>{quote.preferredDate}</strong> is locked in. We have sent confirmation details to your mobile ({mobile}).
                </p>
              </div>

              {/* Reference Box */}
              <div className="max-w-md mx-auto p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl space-y-2 text-left text-xs">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="font-bold text-slate-500">Booking Reference:</span>
                  <span className="font-mono font-black text-sm text-[#15385E]">{bookingRef}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Container:</span>
                  <span className="font-bold text-slate-900">{quote.containerCount} × {quote.containerName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Storage Option:</span>
                  <span className="font-bold text-slate-900">
                    {isOnsite ? 'Onsite at your place' : 'Portabox Secure Facility'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Scheduled Date:</span>
                  <span className="font-bold text-slate-900">{quote.preferredDate}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Payment Processed:</span>
                  <span className="font-mono font-bold text-emerald-700">${quote.firstPaymentTotal} (Paid)</span>
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
