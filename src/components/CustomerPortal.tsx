import React, { useState, useEffect } from 'react';
import {
  User,
  Shield,
  Clock,
  Calendar,
  CreditCard,
  Tag,
  Truck,
  Package,
  AlertCircle,
  CheckCircle2,
  Download,
  FileText,
  Phone,
  MessageSquare,
  Lock,
  ArrowRight,
  LogOut,
  ChevronRight,
  MapPin,
  RefreshCw,
  Sparkles,
  ExternalLink,
  DollarSign,
  AlertTriangle,
  ArrowLeftRight,
  FileSpreadsheet,
  Landmark,
  Copy,
  Check,
  Printer,
  Layers,
  ShieldCheck,
  Star,
  Plus,
  Minus,
  Edit3,
  Home,
  Building,
  Award,
  Heart,
  Share2,
  Send,
  Fingerprint,
  KeyRound,
  Smartphone,
  Key,
} from 'lucide-react';
import {
  CustomerAccount,
  ContainerOrder,
  CustomerTransaction,
  CustomerFeedback,
  loadCustomerAccounts,
  getCurrentUserSession,
  setCurrentUserSession,
  saveCustomerAccounts,
  submitCustomerFeedback,
  calculateCustomerLoyaltyTier,
  rescheduleCustomerOrder,
} from '../services/customerPortalService';
import { syncCustomerPortalActionToSmartsheet } from '../services/smartsheetService';
import { loadAppConfig, calculateQuote } from '../services/pricingEngine';
import { QuoteBreakdown, ContainerSizeId, StorageDuration, BillingCycle } from '../types/quote';
import { BookingDecisionModal } from './BookingDecisionModal';
import {
  generateZeptoEftInstruction,
  settleOrRegisterZeptoEftPayment,
  ZeptoEftInstruction,
} from '../services/zeptoEftService';
import { checkBusinessHoursStatus } from '../services/businessHoursService';
import { AfterHoursTextModal } from './AfterHoursTextModal';
import { CustomerLifecycleRoadmap } from './CustomerLifecycleRoadmap';
import { DeliveryMilestoneTracker } from './DeliveryMilestoneTracker';
import {
  authenticateWithPasskey,
  generateTwoFactorChallenge,
  verifyTwoFactorCode,
  registerPasskey,
  getPasskeysForUser,
  PasskeyRecord,
  TwoFactorChallenge,
} from '../services/authSecurityService';

interface CustomerPortalProps {
  isOpen: boolean;
  onClose: () => void;
  phone?: string;
  onOpenBookingModal?: (quote: QuoteBreakdown) => void;
}

export const CustomerPortal: React.FC<CustomerPortalProps> = ({
  isOpen,
  onClose,
  phone = '1800 467 637',
  onOpenBookingModal,
}) => {
  const [currentUser, setCurrentUser] = useState<CustomerAccount | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'quotes' | 'billing' | 'discounts' | 'selfservice' | 'loyalty'>('overview');

  // Dedicated Quote Booking & Inline Editing States
  const [activeBookingQuote, setActiveBookingQuote] = useState<QuoteBreakdown | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [editPlacement, setEditPlacement] = useState<'my_place' | 'facility'>('my_place');
  const [editContainerSize, setEditContainerSize] = useState<ContainerSizeId>('large_25m3');
  const [editContainerCount, setEditContainerCount] = useState<number>(1);
  const [editDuration, setEditDuration] = useState<StorageDuration>('4_to_11_months');
  const [editBillingCycle, setEditBillingCycle] = useState<BillingCycle>('monthly');
  const [quoteSaveSuccess, setQuoteSaveSuccess] = useState<string | null>(null);

  // Live recalculate preview when editing a quote inline in portal
  const livePreviewQuote = React.useMemo(() => {
    if (!editingQuoteId || !currentUser) return null;
    const existing = currentUser.quotes.find((q) => q.id === editingQuoteId);
    if (!existing) return null;
    const base = existing.quoteData;
    const cfg = loadAppConfig();

    return calculateQuote({
      originPostcode: base?.originPostcode || { postcode: currentUser.postcode || '5061', suburb: currentUser.suburb || 'Hyde Park', state: currentUser.state || 'SA', deliveryZone: 'A', kmFromCBD: 4 },
      destinationPostcode: base?.destinationPostcode,
      serviceType: editPlacement === 'my_place' ? 'storage_at_place' : 'storage_facility',
      storagePlacement: editPlacement,
      containerSize: editContainerSize,
      containerCount: editContainerCount,
      billingCycle: editBillingCycle,
      storageDuration: editDuration,
      storageDurationMonths: editDuration === '1_to_3_months' ? 1 : editDuration === '12_plus_months' ? 12 : 6,
      preferredDate: base?.preferredDate || 'Wed 14 Oct 2026',
      selectedSlot: base?.selectedSlot,
      boxesCount: base?.packingSupplies?.boxesCount || 0,
      blanketsCount: base?.packingSupplies?.blanketsCount || 10,
      locksCount: base?.packingSupplies?.locksCount || 1,
      insuranceSelected: base?.insurance?.selected ?? true,
      appliedPromoCode: base?.appliedPromoCode,
      config: cfg,
    });
  }, [editingQuoteId, currentUser, editPlacement, editContainerSize, editContainerCount, editDuration, editBillingCycle]);

  const handleStartEditQuote = (q: any) => {
    setEditingQuoteId(q.id);
    const qData = q.quoteData;
    const isPlace = qData?.storagePlacement === 'my_place' || qData?.serviceType === 'storage_at_place' || q.containerSize?.toLowerCase().includes('onsite');
    setEditPlacement(isPlace ? 'my_place' : 'facility');
    setEditContainerSize((qData?.containerSize as ContainerSizeId) || (q.containerSize as ContainerSizeId) || 'large_25m3');
    setEditContainerCount(qData?.containerCount || q.containerCount || 1);
    setEditDuration((qData?.storageDuration as StorageDuration) || '4_to_11_months');
    setEditBillingCycle((qData?.billingCycle as BillingCycle) || (q.billingCycle as BillingCycle) || 'monthly');
    setQuoteSaveSuccess(null);
  };

  const handleSaveEditedQuote = () => {
    if (!editingQuoteId || !currentUser || !livePreviewQuote) return;
    const allAccounts = loadCustomerAccounts();
    const accIdx = allAccounts.findIndex((a) => a.id === currentUser.id);
    if (accIdx < 0) return;

    const updatedQuotes = currentUser.quotes.map((q) => {
      if (q.id === editingQuoteId) {
        return {
          ...q,
          containerSize: livePreviewQuote.containerSize,
          containerCount: livePreviewQuote.containerCount,
          billingCycle: livePreviewQuote.billingCycle,
          firstPaymentTotal: livePreviewQuote.firstPaymentTotal,
          monthlyStorageFee: livePreviewQuote.monthlyStorageFee,
          quoteData: livePreviewQuote,
        };
      }
      return q;
    });

    const updatedAcc = { ...allAccounts[accIdx], quotes: updatedQuotes };
    allAccounts[accIdx] = updatedAcc;
    saveCustomerAccounts(allAccounts);
    setCurrentUser(updatedAcc);
    setCurrentUserSession(updatedAcc);

    syncCustomerPortalActionToSmartsheet({
      customerId: currentUser.id,
      customerName: `${currentUser.firstName} ${currentUser.lastName}`.trim(),
      actionType: 'booking_updated',
      details: `Quote ${editingQuoteId} updated to ${livePreviewQuote.containerName} (${editPlacement === 'my_place' ? 'Onsite' : 'Portabox Facility'}). First payment: $${livePreviewQuote.firstPaymentTotal}.`,
    });

    setQuoteSaveSuccess('Quote updated successfully with live rates.');
    setTimeout(() => {
      setEditingQuoteId(null);
      setQuoteSaveSuccess(null);
    }, 1200);
  };

  const handleBookQuote = (targetQuote: QuoteBreakdown) => {
    if (onOpenBookingModal) {
      onOpenBookingModal(targetQuote);
    } else {
      setActiveBookingQuote(targetQuote);
      setIsBookingModalOpen(true);
    }
  };
  
  // Login Form States & Passkey / 2FA Security
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authStep, setAuthStep] = useState<'login' | 'otp'>('login');
  const [otpCode, setOtpCode] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeySuccess, setPasskeySuccess] = useState<string | null>(null);
  const [twoFactorMethod, setTwoFactorMethod] = useState<'sms' | 'authenticator'>('sms');
  const [active2FaChallenge, setActive2FaChallenge] = useState<TwoFactorChallenge | null>(null);
  const [userPasskeys, setUserPasskeys] = useState<PasskeyRecord[]>([]);
  const [isRegisteringPasskey, setIsRegisteringPasskey] = useState(false);

  // CSAT Rating & Feedback State
  const [csatRating, setCsatRating] = useState<number>(5);
  const [csatTags, setCsatTags] = useState<string[]>(['Driveway Protected with Poly Pads', 'Level-Lift Kept Flat']);
  const [csatComment, setCsatComment] = useState<string>('');
  const [csatSuccessMessage, setCsatSuccessMessage] = useState<string | null>(null);
  const [googleReviewBonusClaimed, setGoogleReviewBonusClaimed] = useState<boolean>(false);
  const [referralCopied, setReferralCopied] = useState<boolean>(false);

  // Delivery Reschedule State
  const [isRescheduleOpen, setIsRescheduleOpen] = useState<boolean>(false);
  const [rescheduleDate, setRescheduleDate] = useState<string>('2026-10-18');
  const [rescheduleWindow, setRescheduleWindow] = useState<string>('9:00 AM – 11:30 AM (Morning Window)');
  const [rescheduleReason, setRescheduleReason] = useState<string>('Settlement / Key Handover Delay');
  const [rescheduleSuccess, setRescheduleSuccess] = useState<string | null>(null);

  // Self-service pickup / delivery notes state
  const [pickupRequested, setPickupRequested] = useState(false);
  const [pickupDate, setPickupDate] = useState('2026-10-25');
  const [pickupServiceType, setPickupServiceType] = useState<'depot_return' | 'redelivery_move'>('depot_return');
  const [pickupTimeSlot, setPickupTimeSlot] = useState<'morning' | 'midday' | 'afternoon'>('morning');
  const [redeliveryStreet, setRedeliveryStreet] = useState('');
  const [redeliverySuburb, setRedeliverySuburb] = useState('');
  const [placementSurface, setPlacementSurface] = useState<string>('Concrete Driveway');
  const [doorOrientation, setDoorOrientation] = useState<string>('Doors Facing Street / Road');
  const [overheadClearanceChecked, setOverheadClearanceChecked] = useState(true);
  const [accessNotesText, setAccessNotesText] = useState('');
  const [notesSavedSuccess, setNotesSavedSuccess] = useState(false);

  // Self-service Supplies & Extension States
  const [suppliesCart, setSuppliesCart] = useState<Record<string, number>>({});
  const [suppliesOrderSuccess, setSuppliesOrderSuccess] = useState(false);
  const [extensionMonths, setExtensionMonths] = useState<number>(3);
  const [extensionSuccess, setExtensionSuccess] = useState(false);
  const [activeDocPreview, setActiveDocPreview] = useState<'agreement' | 'insurance' | 'guide' | null>(null);

  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);
  const [eftDrawerTxn, setEftDrawerTxn] = useState<CustomerTransaction | null>(null);
  const [copiedEftField, setCopiedEftField] = useState<string | null>(null);
  const [eftStatusNotice, setEftStatusNotice] = useState<string | null>(null);
  const [isAfterHoursModalOpen, setIsAfterHoursModalOpen] = useState(false);

  // Load session on mount & listen for two-way Smartsheet updates in real time
  useEffect(() => {
    const refreshUserFromStorage = () => {
      const session = getCurrentUserSession();
      if (session) {
        const all = loadCustomerAccounts();
        const found = all.find((a) => a.id === session.id) || session;
        setCurrentUser(found);
        if (found.orders?.[0]?.accessNotes) {
          setAccessNotesText(found.orders[0].accessNotes);
        }
        if (found.orders?.[0]?.pickupRequestedDate) {
          setPickupDate(found.orders[0].pickupRequestedDate);
          setPickupRequested(true);
        }
      }
    };

    if (isOpen) {
      refreshUserFromStorage();
    }

    window.addEventListener('portabox-smartsheet-sync', refreshUserFromStorage);
    return () => window.removeEventListener('portabox-smartsheet-sync', refreshUserFromStorage);
  }, [isOpen]);

  // Sync user passkeys whenever current user changes
  useEffect(() => {
    if (currentUser?.email) {
      setUserPasskeys(getPasskeysForUser(currentUser.email));
    } else {
      setUserPasskeys([]);
    }
  }, [currentUser]);

  if (!isOpen) return null;

  // Handle Passkey Sign-In (Biometric / Security Key)
  const handlePasskeySignIn = async () => {
    setLoginError(null);
    setPasskeyLoading(true);
    try {
      const res = await authenticateWithPasskey('customer', loginEmail.trim() || undefined);
      if (res.success && res.userId) {
        const accounts = loadCustomerAccounts();
        const found = accounts.find((a) => a.email.toLowerCase() === res.userId?.toLowerCase()) || accounts[0];
        setCurrentUser(found);
        setCurrentUserSession(found);
        setAuthStep('login');
        setPasskeySuccess(`Authenticated via ${res.passkey?.name || 'Biometric Passkey'}`);
        setTimeout(() => setPasskeySuccess(null), 4000);
      } else {
        setLoginError(res.error || 'Passkey authentication failed. Please sign in via SMS code below.');
      }
    } catch (err: any) {
      setLoginError(err?.message || 'Biometric passkey prompt bypassed or unsupported. Use SMS code below.');
    } finally {
      setPasskeyLoading(false);
    }
  };

  // Register New Passkey for the current logged-in customer
  const handleRegisterNewPasskey = async () => {
    if (!currentUser) return;
    setIsRegisteringPasskey(true);
    try {
      const res = await registerPasskey(currentUser.email, 'customer');
      if (res.success && res.passkey) {
        setUserPasskeys(getPasskeysForUser(currentUser.email));
        setPasskeySuccess(`✓ Registered Passkey: ${res.passkey.name}`);
        setTimeout(() => setPasskeySuccess(null), 4000);
      } else {
        setLoginError(res.error || 'Failed to register passkey.');
      }
    } catch (err: any) {
      setLoginError(err?.message || 'Failed to register passkey.');
    } finally {
      setIsRegisteringPasskey(false);
    }
  };

  // Handle Login submission with 2FA challenge generation
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (!loginEmail.trim()) {
      setLoginError('Please enter your email address');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      const accounts = loadCustomerAccounts();
      const match = accounts.find(
        (a) => a.email.toLowerCase() === loginEmail.trim().toLowerCase()
      );

      if (match) {
        const destination =
          twoFactorMethod === 'sms'
            ? match.mobile || '0412 345 678'
            : 'Authenticator App (TOTP)';
        const challenge = generateTwoFactorChallenge(twoFactorMethod, destination);
        setActive2FaChallenge(challenge);
        setOtpCode(challenge.code); // Pre-filled for effortless testing, customer can also retype
        setAuthStep('otp');
      } else {
        setLoginError('No Portabox customer account found with this email. You can use 1-click test login below or enter a demo account.');
      }
    }, 400);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length < 4) {
      setLoginError('Please enter the 6-digit verification code.');
      return;
    }

    const isValid = verifyTwoFactorCode(otpCode, active2FaChallenge);
    if (!isValid) {
      setLoginError('Invalid verification code. Enter 849201 or the code sent to your device.');
      return;
    }

    const accounts = loadCustomerAccounts();
    const match = accounts.find(
      (a) => a.email.toLowerCase() === loginEmail.trim().toLowerCase()
    );
    if (match) {
      setCurrentUser(match);
      setCurrentUserSession(match);
      setAuthStep('login');
      setLoginEmail('');
      setOtpCode('');
      setActive2FaChallenge(null);
      setLoginError(null);
    }
  };

  const handleQuickLogin = (email: string) => {
    const accounts = loadCustomerAccounts();
    const match = accounts.find((a) => a.email.toLowerCase() === email.toLowerCase());
    if (match) {
      setCurrentUser(match);
      setCurrentUserSession(match);
      setLoginError(null);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentUserSession(null);
    setAuthStep('login');
    setActive2FaChallenge(null);
  };

  // Pay Overdue or Pending invoice with Braintree & sync back to Smartsheet
  const handlePayOverdueInvoice = (txnId: string) => {
    if (!currentUser) return;
    setPayingInvoiceId(txnId);
    setTimeout(() => {
      const accounts = loadCustomerAccounts();
      const userIdx = accounts.findIndex((a) => a.id === currentUser.id);
      if (userIdx >= 0) {
        let paidInvoiceNum = '';
        let paidAmount = 0;
        const updatedTxns = accounts[userIdx].transactions.map((t) => {
          if (t.id === txnId) {
            paidInvoiceNum = t.invoiceNumber;
            paidAmount = t.amount;
            return {
              ...t,
              status: 'Paid' as const,
              paymentMethod: 'Paid online via Customer Portal (Braintree)',
              transactionId: `bt_settled_${Date.now().toString().slice(-6)}`,
            };
          }
          return t;
        });
        accounts[userIdx].transactions = updatedTxns;
        saveCustomerAccounts(accounts);

        // Two-way sync back to Call Center & Billing Smartsheets
        syncCustomerPortalActionToSmartsheet({
          customerId: accounts[userIdx].id,
          customerName: `${accounts[userIdx].firstName} ${accounts[userIdx].lastName}`.trim(),
          orderNumber: accounts[userIdx].orders?.[0]?.orderNumber,
          actionType: 'invoice_paid',
          details: `Invoice ${paidInvoiceNum} ($${paidAmount}) paid by customer in Customer Portal. Smartsheet payment status set to PAID & dispatch hold cleared.`,
        });

        const refreshed = loadCustomerAccounts().find((a) => a.id === currentUser.id) || accounts[userIdx];
        setCurrentUser({ ...refreshed });
        setCurrentUserSession({ ...refreshed });
      }
      setPayingInvoiceId(null);
    }, 600);
  };

  const handleSaveAccessNotes = () => {
    if (!currentUser || !currentUser.orders.length) return;
    const accounts = loadCustomerAccounts();
    const userIdx = accounts.findIndex((a) => a.id === currentUser.id);
    if (userIdx >= 0) {
      accounts[userIdx].orders[0].accessNotes = accessNotesText;
      (accounts[userIdx].orders[0] as any).placementSurface = placementSurface;
      (accounts[userIdx].orders[0] as any).doorOrientation = doorOrientation;
      (accounts[userIdx].orders[0] as any).overheadClearanceClear = overheadClearanceChecked;
      saveCustomerAccounts(accounts);

      syncCustomerPortalActionToSmartsheet({
        customerId: accounts[userIdx].id,
        customerName: `${accounts[userIdx].firstName} ${accounts[userIdx].lastName}`.trim(),
        orderNumber: accounts[userIdx].orders[0].orderNumber,
        actionType: 'access_notes_updated',
        details: `Updated driver placement & site access in Customer Portal: Surface: ${placementSurface}, Orientation: ${doorOrientation}, Overhead Clear: ${overheadClearanceChecked ? 'Yes' : 'No'}, Notes: "${accessNotesText}"`,
      });

      const refreshed = loadCustomerAccounts().find((a) => a.id === currentUser.id) || accounts[userIdx];
      setCurrentUser({ ...refreshed });
      setNotesSavedSuccess(true);
      setTimeout(() => setNotesSavedSuccess(false), 3500);
    }
  };

  const handleConfirmPickupBooking = () => {
    if (!currentUser || !currentUser.orders.length) return;
    const accounts = loadCustomerAccounts();
    const userIdx = accounts.findIndex((a) => a.id === currentUser.id);
    if (userIdx >= 0) {
      accounts[userIdx].orders[0].pickupRequestedDate = pickupDate;
      accounts[userIdx].orders[0].pickupStatus = 'Requested by Customer';
      if (pickupServiceType === 'redelivery_move' && redeliveryStreet) {
        accounts[userIdx].orders[0].destinationAddress = `${redeliveryStreet}, ${redeliverySuburb || currentUser.suburb}`;
      }
      const timeSlotLabel =
        pickupTimeSlot === 'morning'
          ? 'Morning Window (7:00 AM – 11:30 AM)'
          : pickupTimeSlot === 'midday'
          ? 'Midday Window (11:30 AM – 3:30 PM)'
          : 'Afternoon Window (3:30 PM – 7:00 PM)';

      accounts[userIdx].orders[0].deliveryWindow = timeSlotLabel;

      accounts[userIdx].orders[0].history = [
        {
          timestamp: new Date().toLocaleString('en-AU'),
          stage: 'Container Pickup / Re-delivery Scheduled (Customer Portal)',
          note: `Customer requested horizontal level-lift pickup for ${pickupDate} [${timeSlotLabel}] ${
            pickupServiceType === 'redelivery_move' ? `Re-delivery to: ${accounts[userIdx].orders[0].destinationAddress}` : 'Returning to Depot'
          }. Synced to Call Center Smartsheet.`,
        },
        ...(accounts[userIdx].orders[0].history || []),
      ];
      saveCustomerAccounts(accounts);

      syncCustomerPortalActionToSmartsheet({
        customerId: accounts[userIdx].id,
        customerName: `${accounts[userIdx].firstName} ${accounts[userIdx].lastName}`.trim(),
        orderNumber: accounts[userIdx].orders[0].orderNumber,
        actionType: 'pickup_requested',
        details: `Requested ${pickupServiceType === 'redelivery_move' ? 're-delivery move' : 'depot pickup'} for ${pickupDate} (${timeSlotLabel}) via Customer Portal self-service.`,
      });

      const refreshed = loadCustomerAccounts().find((a) => a.id === currentUser.id) || accounts[userIdx];
      setCurrentUser({ ...refreshed });
      setPickupRequested(true);
    }
  };

  const handleOrderSupplies = () => {
    if (!currentUser || !currentUser.orders.length) return;
    const itemsList = Object.entries(suppliesCart).filter(([_, qty]) => qty > 0);
    if (itemsList.length === 0) return;

    const SUPPLY_PRICES: Record<string, { label: string; price: number }> = {
      standard_boxes: { label: '10x Heavy-Duty Standard Moving Boxes', price: 25.0 },
      book_boxes: { label: '10x Book & Wine Cartons (Heavy Duty)', price: 22.0 },
      furniture_blankets: { label: '5x Quilted Furniture Blankets Rental', price: 15.0 },
      packing_tape: { label: '1x Heavy-Duty Packing Tape & Dispenser', price: 12.0 },
      wardrobe_box: { label: '1x Port-a-Robe Hanging Garment Box', price: 16.5 },
    };

    let totalAmount = 0;
    const descParts: string[] = [];
    itemsList.forEach(([id, qty]) => {
      const item = SUPPLY_PRICES[id];
      if (item) {
        totalAmount += item.price * qty;
        descParts.push(`${qty}x ${item.label}`);
      }
    });

    const accounts = loadCustomerAccounts();
    const userIdx = accounts.findIndex((a) => a.id === currentUser.id);
    if (userIdx >= 0) {
      const invNum = `INV-SUPPLY-${Math.floor(1000 + Math.random() * 9000)}`;
      const newTxn: CustomerTransaction = {
        id: `TXN-SUPPLY-${Date.now().toString().slice(-4)}`,
        invoiceNumber: invNum,
        date: new Date().toLocaleDateString('en-AU'),
        dueDate: new Date(Date.now() + 7 * 86400000).toLocaleDateString('en-AU'),
        description: `Packing Supplies Add-On: ${descParts.join(', ')}`,
        amount: Math.round(totalAmount),
        status: 'Pending',
        paymentMethod: 'Braintree Autopay Next Cycle',
      };
      accounts[userIdx].transactions = [newTxn, ...accounts[userIdx].transactions];

      accounts[userIdx].orders[0].history = [
        {
          timestamp: new Date().toLocaleString('en-AU'),
          stage: 'Additional Packing Supplies Ordered',
          note: `Customer ordered: ${descParts.join(', ')} ($${Math.round(totalAmount)} AUD). Slotted for next truck dispatch.`,
        },
        ...(accounts[userIdx].orders[0].history || []),
      ];

      saveCustomerAccounts(accounts);

      syncCustomerPortalActionToSmartsheet({
        customerId: accounts[userIdx].id,
        customerName: `${accounts[userIdx].firstName} ${accounts[userIdx].lastName}`.trim(),
        orderNumber: accounts[userIdx].orders[0].orderNumber,
        actionType: 'booking_updated',
        details: `Customer ordered packing supplies via Portal: ${descParts.join(', ')} ($${Math.round(totalAmount)} AUD). Invoice ${invNum} generated.`,
      });

      const refreshed = loadCustomerAccounts().find((a) => a.id === currentUser.id) || accounts[userIdx];
      setCurrentUser({ ...refreshed });
      setSuppliesCart({});
      setSuppliesOrderSuccess(true);
      setTimeout(() => setSuppliesOrderSuccess(false), 4500);
    }
  };

  const handleExtendDuration = () => {
    if (!currentUser) return;
    const accounts = loadCustomerAccounts();
    const userIdx = accounts.findIndex((a) => a.id === currentUser.id);
    if (userIdx >= 0) {
      const discountPct = extensionMonths >= 12 ? 20 : extensionMonths >= 6 ? 10 : extensionMonths >= 3 ? 5 : 0;
      const basePeriodic = accounts[userIdx].paymentPlan.periodicAmount;
      const discountedPeriodic = Math.round(basePeriodic * (1 - discountPct / 100));

      accounts[userIdx].paymentPlan.termDiscountPercent = discountPct;
      accounts[userIdx].paymentPlan.periodicAmount = discountedPeriodic;
      accounts[userIdx].paymentPlan.planLabel = `${extensionMonths} Months Extended Contract (${discountPct}% discount locked)`;

      const discountAmount = (basePeriodic - discountedPeriodic) * extensionMonths;
      if (discountAmount > 0) {
        accounts[userIdx].discountsGiven = [
          {
            id: `DSC-EXT-${Date.now().toString().slice(-4)}`,
            date: new Date().toLocaleDateString('en-AU'),
            type: 'upfront_term',
            description: `${extensionMonths}-Month Term Extension Reward (${discountPct}% off)`,
            amount: discountAmount,
          },
          ...(accounts[userIdx].discountsGiven || []),
        ];
      }

      saveCustomerAccounts(accounts);

      syncCustomerPortalActionToSmartsheet({
        customerId: accounts[userIdx].id,
        customerName: `${accounts[userIdx].firstName} ${accounts[userIdx].lastName}`.trim(),
        actionType: 'plan_updated',
        details: `Customer extended storage rental by +${extensionMonths} months. Rate updated to $${discountedPeriodic}/mo with ${discountPct}% discount.`,
      });

      const refreshed = loadCustomerAccounts().find((a) => a.id === currentUser.id) || accounts[userIdx];
      setCurrentUser({ ...refreshed });
      setExtensionSuccess(true);
      setTimeout(() => setExtensionSuccess(false), 4000);
    }
  };

  // Overdue and Pending Calculations
  const overdueTransactions = currentUser?.transactions.filter((t) => t.status === 'Overdue') || [];
  const pendingTransactions = currentUser?.transactions.filter((t) => t.status === 'Pending') || [];
  const paidTransactions = currentUser?.transactions.filter((t) => t.status === 'Paid') || [];
  const totalPaid = paidTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalDiscounts = (currentUser?.discountsGiven || []).reduce((sum, d) => sum + d.amount, 0);
  const activeOrder = currentUser?.orders?.[0];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Top Header Bar */}
        <div className="bg-[#15385E] text-white px-5 sm:px-8 py-4 flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#5CC1EF] flex items-center justify-center text-[#15385E] font-black shadow-xs">
              <User className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-xl tracking-tight text-white font-['Cabinet_Grotesk',sans-serif]">
                  Portabox Customer Self-Service Portal
                </h3>
                <span className="hidden sm:inline-flex text-[10px] font-black bg-[#F7D347] text-[#1A1A1A] px-2 py-0.5 rounded-md uppercase tracking-wider">
                  Secure Live Account
                </span>
              </div>
              <p className="text-xs text-sky-100">
                Manage your containers, schedule pickups, update driver access, and handle billing
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentUser && (
              <button
                type="button"
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#f8fafc]">
          {!currentUser ? (
            /* Secure Login View with Passkey & 2FA */
            <div className="max-w-md mx-auto py-6">
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border-2 border-[#DAD7D1] text-center space-y-5">
                <div className="w-16 h-16 rounded-2xl bg-sky-50 text-[#15385E] mx-auto flex items-center justify-center border border-[#5CC1EF]/40 shadow-2xs">
                  <Fingerprint className="w-8 h-8 text-[#15385E]" />
                </div>

                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider border border-emerald-200 mb-2">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Passkey &amp; 2FA Protected</span>
                  </div>
                  <h2 className="text-2xl font-black text-[#15385E]">Customer Sign In</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Instant biometric passkey or verified two-factor security login to your container account.
                  </p>
                </div>

                {passkeySuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 text-left">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{passkeySuccess}</span>
                  </div>
                )}

                {loginError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2 text-left">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{loginError}</span>
                  </div>
                )}

                {/* 1-Tap Biometric Passkey Button */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handlePasskeySignIn}
                    disabled={passkeyLoading}
                    className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#15385E] to-[#1c4b7e] hover:from-[#112f4f] hover:to-[#173e6b] text-white font-extrabold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2.5 border border-sky-400/30"
                  >
                    {passkeyLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-[#F7D347]" />
                    ) : (
                      <Fingerprint className="w-5 h-5 text-[#F7D347]" />
                    )}
                    <span>Sign in with Biometric Passkey</span>
                  </button>
                  <p className="text-[11px] text-slate-400">
                    Supports Touch ID, Face ID, Windows Hello, and YubiKeys
                  </p>
                </div>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-200"></div>
                  <span className="flex-shrink mx-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Or Sign in with 2FA
                  </span>
                  <div className="flex-grow border-t border-slate-200"></div>
                </div>

                {authStep === 'login' ? (
                  <form onSubmit={handleLoginSubmit} className="space-y-4 text-left">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Customer Email Address
                      </label>
                      <input
                        type="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="e.g. sarah.jenkins@gmail.com"
                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5CC1EF]"
                      />
                    </div>

                    {/* 2FA Preferred Method Toggle */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Two-Factor Authentication Method
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setTwoFactorMethod('sms')}
                          className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            twoFactorMethod === 'sms'
                              ? 'bg-sky-50 border-[#5CC1EF] text-[#15385E]'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <Smartphone className="w-4 h-4 text-[#5CC1EF]" />
                          <span>SMS Code</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setTwoFactorMethod('authenticator')}
                          className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            twoFactorMethod === 'authenticator'
                              ? 'bg-sky-50 border-[#5CC1EF] text-[#15385E]'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <KeyRound className="w-4 h-4 text-[#5CC1EF]" />
                          <span>Authenticator (TOTP)</span>
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3.5 bg-[#F7D347] hover:bg-[#eed235] text-[#1A1A1A] rounded-2xl font-black text-sm tracking-wide shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2 border border-[#e6c338]"
                    >
                      {isSubmitting ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-[#1A1A1A]" />
                      ) : (
                        <>
                          <span>Send 2FA Security Code</span>
                          <ArrowRight className="w-4 h-4 text-[#1A1A1A] stroke-[3]" />
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-4 text-left">
                    <div className="p-3 bg-sky-50 border border-[#5CC1EF]/40 rounded-xl text-xs text-[#15385E] space-y-1">
                      <div className="flex items-center gap-1.5 font-bold">
                        <Shield className="w-4 h-4 text-[#5CC1EF] shrink-0" />
                        <span>
                          {twoFactorMethod === 'sms'
                            ? `SMS 2FA Sent to Mobile`
                            : 'Authenticator Token Required'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        {twoFactorMethod === 'sms'
                          ? `A simulated 6-digit verification code has been dispatched to your mobile.`
                          : 'Enter the 6-digit code from Google Authenticator, Authy, or 1Password.'}
                      </p>
                      {active2FaChallenge && (
                        <div className="pt-1 flex items-center justify-between text-[11px]">
                          <span className="font-mono text-slate-700">Code: <strong>{active2FaChallenge.code}</strong></span>
                          <button
                            type="button"
                            onClick={() => setOtpCode(active2FaChallenge.code)}
                            className="text-[#15385E] font-extrabold hover:underline cursor-pointer"
                          >
                            Auto-Fill Code
                          </button>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        6-Digit Security Code
                      </label>
                      <input
                        type="text"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        placeholder="849201"
                        maxLength={6}
                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-center font-mono text-xl tracking-widest font-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5CC1EF]"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setAuthStep('login')}
                        className="w-1/3 py-3 border border-slate-200 hover:bg-slate-50 rounded-2xl font-bold text-xs text-slate-600 transition-colors cursor-pointer"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        className="w-2/3 py-3 bg-[#F7D347] hover:bg-[#eed235] text-[#1A1A1A] border border-[#e6c338] rounded-2xl font-black text-sm shadow-xs transition-colors cursor-pointer"
                      >
                        Verify &amp; Access Portal
                      </button>
                    </div>
                  </form>
                )}

                {/* 1-Click Demo Logins for Testing */}
                <div className="pt-4 border-t border-slate-100">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                    Quick 1-Click Demo Accounts:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                    <button
                      type="button"
                      onClick={() => handleQuickLogin('sarah.jenkins@gmail.com')}
                      className="p-3 rounded-xl border-2 border-[#DAD7D1] hover:border-[#5CC1EF] bg-slate-50/70 hover:bg-sky-50/40 transition-all text-left cursor-pointer"
                    >
                      <div className="font-extrabold text-xs text-[#15385E]">Sarah Jenkins</div>
                      <div className="text-[10px] text-slate-500">25 m³ Container · Norwood SA · Active</div>
                      <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded mt-1 inline-block">
                        Monthly Autopay
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickLogin('david.miller@builderpro.com.au')}
                      className="p-3 rounded-xl border-2 border-[#DAD7D1] hover:border-[#5CC1EF] bg-slate-50/70 hover:bg-sky-50/40 transition-all text-left cursor-pointer"
                    >
                      <div className="font-extrabold text-xs text-[#15385E]">David Miller (Builder)</div>
                      <div className="text-[10px] text-slate-500">25 m³ Large · Hyde Park SA</div>
                      <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded mt-1 inline-block">
                        12 Mo Upfront · 1 Overdue
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Logged-In Customer Dashboard */
            <div className="space-y-6">
              {/* Customer Profile Banner */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-[#DAD7D1] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="flex items-start sm:items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#15385E] to-[#5CC1EF] text-white flex items-center justify-center font-black text-2xl shadow-sm shrink-0">
                    {currentUser.firstName[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl sm:text-2xl font-black text-[#15385E]">
                        {currentUser.firstName} {currentUser.lastName}
                      </h2>
                      {currentUser.companyName && (
                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          {currentUser.companyName}
                        </span>
                      )}
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Verified Account ({currentUser.id})
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500 mt-1 flex-wrap">
                      <span>Email: <strong className="text-slate-800">{currentUser.email}</strong></span>
                      <span>Mobile: <strong className="text-slate-800">{currentUser.mobile}</strong></span>
                      <span>Service: <strong className="text-slate-800">{currentUser.suburb}, {currentUser.state}</strong></span>
                      <span>Member Since: <strong className="text-slate-800">{currentUser.memberSince}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <span className="px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-[11px] font-extrabold flex items-center gap-1.5">
                    <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-600" />
                    <span>2-Way Smartsheet Synced</span>
                  </span>
                  <a
                    href={`tel:${phone.replace(/\s+/g, '')}`}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-[#15385E] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5 text-[#5CC1EF]" />
                    <span>Call Dispatch</span>
                  </a>
                  <a
                    href="sms:0488883234"
                    onClick={(e) => {
                      const status = checkBusinessHoursStatus();
                      if (status.isOutside) {
                        e.preventDefault();
                        setIsAfterHoursModalOpen(true);
                      }
                    }}
                    className="px-4 py-2.5 bg-[#15385E] hover:bg-[#112F4F] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-[#5CC1EF]" />
                    <span>Text Support</span>
                  </a>
                </div>
              </div>

              {/* Two-Way Smartsheet Live Update Notification Banner */}
              {currentUser.lastSmartsheetSyncNote && (
                <div className="bg-sky-50 border border-[#5CC1EF]/40 rounded-2xl p-3.5 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#15385E]">
                  <div className="flex items-center gap-2.5">
                    <FileSpreadsheet className="w-4 h-4 text-[#5CC1EF] shrink-0" />
                    <div>
                      <span className="font-extrabold text-[#15385E]">Latest Smartsheet Two-Way Sync: </span>
                      <span className="text-slate-700 font-medium">{currentUser.lastSmartsheetSyncNote}</span>
                    </div>
                  </div>
                  {currentUser.lastSmartsheetSyncAt && (
                    <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 shrink-0">
                      {currentUser.lastSmartsheetSyncAt}
                    </span>
                  )}
                </div>
              )}

              {/* Overdue Payment Alert Banner (if any) */}
              {overdueTransactions.length > 0 && (
                <div className="bg-red-500 text-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white text-red-600 flex items-center justify-center font-black shrink-0">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-wider">
                        Action Required: {overdueTransactions.length} Overdue Payment
                      </h4>
                      <p className="text-xs text-red-100 mt-0.5">
                        Invoice {overdueTransactions[0].invoiceNumber} for ${overdueTransactions[0].amount} was due on {overdueTransactions[0].dueDate || 'recently'}. Please clear to avoid late fees.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handlePayOverdueInvoice(overdueTransactions[0].id)}
                    disabled={payingInvoiceId === overdueTransactions[0].id}
                    className="px-5 py-2.5 bg-white hover:bg-red-50 text-red-700 font-extrabold text-xs rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
                  >
                    {payingInvoiceId === overdueTransactions[0].id ? 'Processing...' : `Pay $${overdueTransactions[0].amount} Now via Braintree`}
                  </button>
                </div>
              )}

              {/* Portal Tab Navigation */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto text-xs font-bold scrollbar-none">
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                    activeTab === 'overview'
                      ? 'bg-[#15385E] text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Clock className={`w-4 h-4 ${activeTab === 'overview' ? 'text-[#F7D347]' : 'text-slate-500'}`} />
                  <span>Overview &amp; Live ETA</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('selfservice')}
                  className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                    activeTab === 'selfservice'
                      ? 'bg-[#15385E] text-white shadow-xs'
                      : 'bg-[#F7D347]/20 text-[#15385E] hover:bg-[#F7D347]/30 border border-[#F7D347]'
                  }`}
                >
                  <Package className={`w-4 h-4 ${activeTab === 'selfservice' ? 'text-[#F7D347]' : 'text-[#15385E]'}`} />
                  <span className="font-extrabold">Self-Service Hub</span>
                  <span className="text-[9px] font-black bg-[#F7D347] text-[#1A1A1A] px-1.5 py-0.2 rounded">ACTIONS</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('orders')}
                  className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                    activeTab === 'orders'
                      ? 'bg-[#15385E] text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Truck className={`w-4 h-4 ${activeTab === 'orders' ? 'text-[#F7D347]' : 'text-slate-500'}`} />
                  <span>Containers ({currentUser.orders.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('billing')}
                  className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                    activeTab === 'billing'
                      ? 'bg-[#15385E] text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <CreditCard className={`w-4 h-4 ${activeTab === 'billing' ? 'text-[#F7D347]' : 'text-slate-500'}`} />
                  <span>Payments &amp; Ledger</span>
                  {overdueTransactions.length > 0 && (
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('quotes')}
                  className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                    activeTab === 'quotes'
                      ? 'bg-[#15385E] text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <FileText className={`w-4 h-4 ${activeTab === 'quotes' ? 'text-[#F7D347]' : 'text-slate-500'}`} />
                  <span>Quotes ({currentUser.quotes.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('discounts')}
                  className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                    activeTab === 'discounts'
                      ? 'bg-[#15385E] text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Tag className={`w-4 h-4 ${activeTab === 'discounts' ? 'text-[#F7D347]' : 'text-slate-500'}`} />
                  <span>Discounts (${totalDiscounts})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('loyalty')}
                  className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                    activeTab === 'loyalty'
                      ? 'bg-[#15385E] text-white shadow-xs'
                      : 'bg-gradient-to-r from-amber-50 to-purple-50 text-[#15385E] hover:from-amber-100 hover:to-purple-100 border border-amber-300'
                  }`}
                >
                  <Award className={`w-4 h-4 ${activeTab === 'loyalty' ? 'text-[#F7D347]' : 'text-amber-600'}`} />
                  <span className="font-extrabold">VIP Rewards &amp; Referrals</span>
                  <span className="text-[9px] font-black bg-emerald-600 text-white px-1.5 py-0.2 rounded">$50 REWARD</span>
                </button>
              </div>

              {/* TAB 1: OVERVIEW & LIVE DELIVERY ETA */}
              {activeTab === 'overview' && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  {/* Customer Lifecycle 5-Stage Journey Roadmap */}
                  <CustomerLifecycleRoadmap
                    currentStage={activeOrder?.status === 'Placed at Customer' || activeOrder?.status === 'Stored at Depot' ? 5 : activeOrder ? 4 : 2}
                    phone={phone}
                    variant="portal_dashboard"
                  />

                  {/* Key Metrics Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                        Active Containers
                      </span>
                      <div className="text-2xl font-black text-[#0b2942]">
                        {currentUser.orders.length} Unit{currentUser.orders.length > 1 ? 's' : ''}
                      </div>
                      <span className="text-[11px] text-emerald-600 font-semibold block">
                        {activeOrder?.status || 'Active in service'}
                      </span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                        Next Billing Date
                      </span>
                      <div className="text-2xl font-black text-[#0b2942] font-mono">
                        {currentUser.paymentPlan.nextBillingDate}
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium block">
                        ${currentUser.paymentPlan.periodicAmount}/period ({currentUser.paymentPlan.planLabel})
                      </span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                        Total Paid To Date
                      </span>
                      <div className="text-2xl font-black text-[#0b2942] font-mono">
                        ${totalPaid}
                      </div>
                      <span className="text-[11px] text-emerald-600 font-semibold block">
                        {paidTransactions.length} settled invoice{paidTransactions.length > 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                        Lifetime Savings Given
                      </span>
                      <div className="text-2xl font-black text-emerald-600 font-mono">
                        ${totalDiscounts}
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium block">
                        Promos & advance term savings
                      </span>
                    </div>
                  </div>

                  {/* Account Security: Passkeys & Two-Factor Authentication Status */}
                  <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-slate-200 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-sky-50 text-[#15385E] border border-[#5CC1EF]/40 flex items-center justify-center font-black shrink-0">
                          <Fingerprint className="w-5 h-5 text-[#15385E]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-black text-[#15385E]">
                              Passkey &amp; Two-Factor Authentication (2FA)
                            </h4>
                            <span className="text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                              Active &amp; Protected
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">
                            Sign in securely without passwords using your device biometrics (Face ID, Touch ID, or Windows Hello) and verified 2FA.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleRegisterNewPasskey}
                        disabled={isRegisteringPasskey}
                        className="px-4 py-2 bg-[#15385E] hover:bg-[#112f4f] text-[#F7D347] font-black text-xs rounded-xl flex items-center gap-2 transition-all shadow-2xs cursor-pointer shrink-0"
                      >
                        {isRegisteringPasskey ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#F7D347]" />
                        ) : (
                          <Plus className="w-3.5 h-3.5 text-[#F7D347]" />
                        )}
                        <span>Register This Device as Passkey</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {/* Registered Passkeys */}
                      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                          <Key className="w-3.5 h-3.5 text-[#5CC1EF]" />
                          <span>Registered Biometric Passkeys ({userPasskeys.length})</span>
                        </span>
                        {userPasskeys.length > 0 ? (
                          <div className="space-y-1.5">
                            {userPasskeys.map((pk) => (
                              <div
                                key={pk.id}
                                className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200"
                              >
                                <div className="flex items-center gap-2">
                                  <Fingerprint className="w-4 h-4 text-emerald-600" />
                                  <span className="font-bold text-[#15385E]">{pk.name}</span>
                                </div>
                                <span className="text-[10px] text-slate-400 font-medium">Added {pk.createdAt}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-500 text-[11px] italic">
                            No hardware passkey registered yet. Click &quot;Register This Device&quot; to enable 1-tap sign-in.
                          </p>
                        )}
                      </div>

                      {/* 2FA Configuration */}
                      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Two-Factor Authentication (2FA) Channels</span>
                        </span>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200">
                            <div className="flex items-center gap-2">
                              <Smartphone className="w-4 h-4 text-[#5CC1EF]" />
                              <div>
                                <span className="font-bold text-[#15385E]">SMS Mobile Verification</span>
                                <span className="block text-[10px] text-slate-400 font-mono">
                                  {currentUser.mobile || '0412 345 678'}
                                </span>
                              </div>
                            </div>
                            <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              Default Channel
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200">
                            <div className="flex items-center gap-2">
                              <KeyRound className="w-4 h-4 text-purple-600" />
                              <span className="font-bold text-[#15385E]">TOTP Authenticator Apps</span>
                            </div>
                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              Google Auth / Authy Ready
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {activeOrder && (
                    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-2xl bg-sky-100 text-[#00c0f3]">
                            <Truck className="w-6 h-6" />
                          </div>
                          <div>
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#00c0f3]">
                              Live Container Delivery Tracker
                            </span>
                            <h3 className="text-lg sm:text-xl font-black text-[#0b2942]">
                              Order #{activeOrder.orderNumber} · Container {activeOrder.containerId}
                            </h3>
                          </div>
                        </div>

                        <div className="bg-sky-50 border border-sky-200/80 rounded-2xl px-4 py-2.5 text-right">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                            Target Delivery Window
                          </span>
                          <span className="text-sm font-black text-[#0b2942]">
                            {activeOrder.scheduledDeliveryDate} ({activeOrder.deliveryWindow})
                          </span>
                        </div>
                      </div>

                      {/* 4-Stage Progress Line (Dynamic from Smartsheet & Order Status) */}
                      <div className="py-2">
                        <div className="grid grid-cols-4 gap-2 text-center relative">
                          {/* Progress connector line */}
                          <div className="absolute top-4 left-1/8 right-1/8 h-1 bg-slate-200 -z-0">
                            <div
                              className="h-full bg-emerald-500 transition-all duration-300"
                              style={{
                                width:
                                  activeOrder.status === 'Placed at Customer' ||
                                  activeOrder.status === 'Stored at Depot' ||
                                  activeOrder.status === 'Collected' ||
                                  activeOrder.status === 'Completed'
                                    ? '100%'
                                    : activeOrder.status === 'Out for Delivery'
                                    ? '75%'
                                    : '40%',
                              }}
                            />
                          </div>

                          <div className="relative z-10 flex flex-col items-center space-y-1.5">
                            <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                              ✓
                            </div>
                            <span className="text-xs font-bold text-[#0b2942]">1. Booked</span>
                            <span className="text-[10px] text-slate-400">Order Confirmed</span>
                          </div>

                          <div className="relative z-10 flex flex-col items-center space-y-1.5">
                            <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                              ✓
                            </div>
                            <span className="text-xs font-bold text-[#0b2942]">2. Prepped</span>
                            <span className="text-[10px] text-slate-400">Depot Certified</span>
                          </div>

                          <div className="relative z-10 flex flex-col items-center space-y-1.5">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-xs ${
                                activeOrder.status === 'Placed at Customer' ||
                                activeOrder.status === 'Stored at Depot' ||
                                activeOrder.status === 'Collected' ||
                                activeOrder.status === 'Completed'
                                  ? 'bg-emerald-500 text-white'
                                  : activeOrder.status === 'Out for Delivery'
                                  ? 'bg-[#00c0f3] text-white animate-pulse'
                                  : 'bg-slate-100 text-slate-500 border border-slate-300'
                              }`}
                            >
                              {activeOrder.status === 'Placed at Customer' ||
                              activeOrder.status === 'Stored at Depot' ||
                              activeOrder.status === 'Collected' ||
                              activeOrder.status === 'Completed' ? (
                                '✓'
                              ) : (
                                <Truck className="w-4 h-4" />
                              )}
                            </div>
                            <span className="text-xs font-extrabold text-[#0b2942]">3. Dispatched</span>
                            <span className="text-[10px] text-slate-500 font-medium">Driver En Route</span>
                          </div>

                          <div className="relative z-10 flex flex-col items-center space-y-1.5">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                                activeOrder.status === 'Placed at Customer' ||
                                activeOrder.status === 'Stored at Depot' ||
                                activeOrder.status === 'Collected' ||
                                activeOrder.status === 'Completed'
                                  ? 'bg-emerald-500 text-white shadow-xs'
                                  : 'bg-slate-100 text-slate-400 border border-slate-300'
                              }`}
                            >
                              {activeOrder.status === 'Placed at Customer' ||
                              activeOrder.status === 'Stored at Depot' ||
                              activeOrder.status === 'Collected' ||
                              activeOrder.status === 'Completed'
                                ? '✓'
                                : '4'}
                            </div>
                            <span
                              className={`text-xs font-bold ${
                                activeOrder.status === 'Placed at Customer'
                                  ? 'text-emerald-700 font-extrabold'
                                  : 'text-slate-400'
                              }`}
                            >
                              4. {activeOrder.status === 'Stored at Depot' ? 'At Depot' : 'Placed'}
                            </span>
                            <span className="text-[10px] text-slate-400">{activeOrder.status}</span>
                          </div>
                        </div>
                      </div>

                      {/* Details Box */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                            Current Location
                          </span>
                          <span className="text-xs font-bold text-[#0b2942] flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-[#00c0f3]" />
                            {activeOrder.location}
                          </span>
                        </div>

                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                            Assigned Driver
                          </span>
                          <span className="text-xs font-bold text-[#0b2942]">
                            {activeOrder.driverName || 'Mick T. (Heavy Haulage)'}
                          </span>
                          <div className="text-[11px] text-slate-500">{activeOrder.driverPhone || '0412 000 111'}</div>
                        </div>

                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                            Time to Delivery
                          </span>
                          <span className="text-sm font-black text-emerald-600 font-mono">
                            {activeOrder.timeToDeliveryHours > 24
                              ? `${Math.floor(activeOrder.timeToDeliveryHours / 24)} days, ${activeOrder.timeToDeliveryHours % 24} hrs`
                              : `${activeOrder.timeToDeliveryHours} hours remaining`}
                          </span>
                          <div className="text-[11px] text-slate-500">Live GPS tracking active</div>
                        </div>
                      </div>

                      {/* 1-Click Self-Service Order Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setRescheduleDate(activeOrder.scheduledDeliveryDate);
                              setRescheduleWindow(activeOrder.deliveryWindow);
                              setIsRescheduleOpen(true);
                            }}
                            className="px-3.5 py-2 rounded-xl bg-[#F7D347] hover:bg-[#eed235] text-[#1A1A1A] font-black text-xs flex items-center gap-1.5 transition-all shadow-2xs border border-[#e6c338] cursor-pointer"
                          >
                            <Calendar className="w-3.5 h-3.5 text-[#1A1A1A]" />
                            <span>Reschedule Delivery Date</span>
                          </button>

                          <a
                            href={`tel:${activeOrder.driverPhone || '0412000111'}`}
                            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#15385E] font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Phone className="w-3.5 h-3.5 text-[#5CC1EF]" />
                            <span>Call Driver Direct</span>
                          </a>
                        </div>

                        <button
                          type="button"
                          onClick={() => setActiveTab('selfservice')}
                          className="text-xs font-bold text-slate-500 hover:text-[#15385E] flex items-center gap-1 cursor-pointer"
                        >
                          <span>Site Placement &amp; Surface Notes</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Post-Placement Experience & Driver Satisfaction (CSAT) Card */}
                  {activeOrder && (
                    <div className="bg-white rounded-3xl p-6 sm:p-7 border-2 border-slate-200 shadow-xs space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-black shrink-0 border border-amber-200">
                            <Star className="w-5 h-5 fill-amber-400 text-amber-500" />
                          </div>
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                              CUSTOMER SATISFACTION (CSAT)
                            </span>
                            <h4 className="text-base font-black text-[#15385E] mt-0.5">
                              Rate Your Container Delivery &amp; Driver Placement
                            </h4>
                          </div>
                        </div>

                        {currentUser.feedback && currentUser.feedback.length > 0 && (
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Verified Rating Submitted</span>
                          </span>
                        )}
                      </div>

                      {currentUser.feedback && currentUser.feedback.length > 0 ? (
                        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-emerald-950">
                                Your Rating for Order #{currentUser.feedback[0].orderNumber}:
                              </span>
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <Star
                                    key={s}
                                    className={`w-4 h-4 ${
                                      s <= currentUser.feedback![0].rating ? 'fill-amber-400 text-amber-500' : 'text-slate-300'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {currentUser.feedback[0].submittedAt}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            {currentUser.feedback[0].tags.map((t, idx) => (
                              <span
                                key={idx}
                                className="text-[11px] font-bold bg-white text-emerald-900 border border-emerald-200 px-2.5 py-0.5 rounded-lg"
                              >
                                ✓ {t}
                              </span>
                            ))}
                          </div>

                          {currentUser.feedback[0].comment && (
                            <p className="text-xs text-slate-700 italic">
                              "{currentUser.feedback[0].comment}"
                            </p>
                          )}

                          {/* Referral Incentive unlocked */}
                          <div className="pt-3 border-t border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-2">
                              <Heart className="w-4 h-4 text-rose-500 fill-rose-500 shrink-0" />
                              <span className="font-extrabold text-[#15385E]">
                                Give $50, Get $50 Friend Referral Reward Active:
                              </span>
                              <span className="font-mono font-black text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200">
                                PORTA-{currentUser.firstName.toUpperCase().slice(0, 4)}{currentUser.id.slice(-4)}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                const code = `PORTA-${currentUser.firstName.toUpperCase().slice(0, 4)}${currentUser.id.slice(-4)}`;
                                navigator.clipboard?.writeText(code);
                                setReferralCopied(true);
                                setTimeout(() => setReferralCopied(false), 3000);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-white border border-emerald-300 text-emerald-900 font-bold hover:bg-emerald-100 transition-colors cursor-pointer shrink-0"
                            >
                              {referralCopied ? '✓ Copied Referral Code' : 'Copy Referral Code'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4 pt-1">
                          <p className="text-xs text-slate-600">
                            Did your driver place the container flat on your driveway with poly protective pads? Rate your delivery experience to help us maintain 5-star service.
                          </p>

                          {/* Star Selection */}
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-slate-700">Your Rating:</span>
                            <div className="flex items-center gap-1.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => setCsatRating(star)}
                                  className="p-1 hover:scale-110 transition-transform cursor-pointer"
                                  title={`${star} Star${star > 1 ? 's' : ''}`}
                                >
                                  <Star
                                    className={`w-6 h-6 transition-colors ${
                                      star <= csatRating
                                        ? 'fill-amber-400 text-amber-500'
                                        : 'text-slate-300 hover:text-amber-300'
                                    }`}
                                  />
                                </button>
                              ))}
                            </div>
                            <span className="text-xs font-extrabold text-[#15385E] font-mono">
                              {csatRating === 5 ? '5.0 — Exceptional!' : csatRating === 4 ? '4.0 — Great Service' : csatRating === 3 ? '3.0 — Satisfactory' : 'Needs Follow-Up'}
                            </span>
                          </div>

                          {/* Satisfaction Chips */}
                          <div className="space-y-1.5">
                            <span className="text-[11px] font-bold text-slate-500 block">
                              What stood out? (Select all that apply)
                            </span>
                            <div className="flex items-center gap-2 flex-wrap">
                              {[
                                'Driveway Protected with Poly Pads',
                                'Level-Lift Kept Flat',
                                'Punctual Arrival',
                                'Courteous Driver',
                                'Clear SMS Communication',
                                'Container Clean & Weatherproof',
                              ].map((tag) => {
                                const isSelected = csatTags.includes(tag);
                                return (
                                  <button
                                    key={tag}
                                    type="button"
                                    onClick={() => {
                                      setCsatTags((prev) =>
                                        isSelected ? prev.filter((t) => t !== tag) : [...prev, tag]
                                      );
                                    }}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                      isSelected
                                        ? 'bg-[#15385E] text-[#F7D347] border-[#15385E] shadow-2xs'
                                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                    }`}
                                  >
                                    {isSelected ? '✓ ' : '+ '}
                                    {tag}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Comments */}
                          <div>
                            <textarea
                              value={csatComment}
                              onChange={(e) => setCsatComment(e.target.value)}
                              placeholder="Any specific compliments for your driver or comments on the container placement? (optional)"
                              rows={2}
                              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5CC1EF]"
                            />
                          </div>

                          {csatSuccessMessage && (
                            <div className="space-y-3 animate-in fade-in">
                              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>{csatSuccessMessage}</span>
                              </div>

                              {/* 5-Star CSAT to Google Reviews Loop (+$25 Invoice Credit) */}
                              {csatRating >= 4 && (
                                <div className="p-4 bg-gradient-to-r from-amber-50 via-sky-50 to-emerald-50 border-2 border-[#F7D347] rounded-2xl space-y-3">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
                                    <span className="font-black text-[#15385E] text-sm">
                                      You're an Official Portabox VIP Advocate!
                                    </span>
                                    <span className="text-[10px] font-black uppercase bg-[#F7D347] text-[#1A1A1A] px-2 py-0.5 rounded border border-[#e6c338]">
                                      +$25 Monthly Bill Credit
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-600 leading-relaxed">
                                    Thank you for rating your delivery {csatRating} Stars! Share your experience on Google Reviews to help local families move stress-free, and we will automatically apply a <strong>$25 credit to your next monthly storage invoice</strong>.
                                  </p>
                                  <div className="flex flex-wrap items-center gap-2 pt-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const reviewText = `Portabox made our move completely stress-free! ${csatComment ? `"${csatComment}"` : 'Zero paver scratches with level-lift delivery.'} Drivers were friendly and on time. Highly recommend Portabox!`;
                                        navigator.clipboard?.writeText(reviewText);
                                        window.open('https://maps.google.com/?cid=portabox_australia_verified', '_blank');
                                        setGoogleReviewBonusClaimed(true);
                                      }}
                                      className="px-4 py-2 bg-[#15385E] hover:bg-[#112F4F] text-[#F7D347] font-black text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-2 transition-all active:scale-95"
                                    >
                                      <Star className="w-3.5 h-3.5 fill-[#F7D347]" />
                                      <span>
                                        {googleReviewBonusClaimed
                                          ? '✓ $25 Invoice Credit Claimed! (Review Copied)'
                                          : 'Copy Review & Post to Google (+$25 Credit)'}
                                      </span>
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* 1-to-3 Star Emergency Recovery Escalation */}
                              {csatRating <= 3 && (
                                <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl text-xs space-y-2">
                                  <div className="flex items-center gap-2 text-rose-900 font-black">
                                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                                    <span>Emergency Customer Care Ticket #CARE-7821 Logged</span>
                                  </div>
                                  <p className="text-rose-800 leading-relaxed">
                                    We take full responsibility for your experience. A local Metro Depot Operations Manager has been paged with your notes and will call you within 2 business hours to arrange a resolution or courtesy credit.
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[11px] text-slate-400">
                              Verified review stored securely on your Portabox customer record.
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                if (!currentUser || !activeOrder) return;
                                const res = submitCustomerFeedback({
                                  customerId: currentUser.id,
                                  orderNumber: activeOrder.orderNumber,
                                  rating: csatRating,
                                  category: 'delivery_placement',
                                  tags: csatTags,
                                  comment: csatComment.trim() || undefined,
                                });
                                setCurrentUser({ ...res.customer });
                                setCsatSuccessMessage(res.message);
                              }}
                              className="px-6 py-2.5 bg-[#15385E] hover:bg-[#112F4F] text-[#F7D347] font-black rounded-xl text-xs transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                            >
                              <Send className="w-3.5 h-3.5 text-[#F7D347]" />
                              <span>Submit Verified Review</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: CONTAINERS & ORDERS */}
              {activeTab === 'orders' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-extrabold text-[#0b2942]">
                      Your Container Fleet & Orders ({currentUser.orders.length})
                    </h3>
                  </div>

                  <div className="space-y-4">
                    {currentUser.orders.map((order) => (
                      <div
                        key={order.id}
                        className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black bg-[#0b2942] text-white px-2.5 py-0.5 rounded-full">
                                {order.containerId}
                              </span>
                              <h4 className="text-base font-extrabold text-[#0b2942]">
                                {order.containerName}
                              </h4>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              Order #{order.orderNumber} · Service: <strong>{order.serviceType}</strong>
                            </p>
                          </div>

                          <div className="text-left sm:text-right">
                            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800">
                              Status: {order.status}
                            </span>
                            <div className="text-xs text-slate-500 mt-1 font-mono">
                              Drop-off: {order.scheduledDeliveryDate}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                          <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                            <span className="font-bold text-slate-500">Origin / Placed Address:</span>
                            <p className="text-slate-800 font-medium">{order.originAddress}</p>
                          </div>

                          <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                            <span className="font-bold text-slate-500">Placement & Driver Notes:</span>
                            <p className="text-slate-800 font-medium">{order.accessNotes || 'Standard driveway placement'}</p>
                          </div>
                        </div>

                        {/* Order Timeline History */}
                        <div className="pt-2">
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-2">
                            Tracking Milestones:
                          </span>
                          <div className="space-y-2">
                            {order.history.map((h, i) => (
                              <div key={i} className="flex items-start gap-3 text-xs">
                                <div className="w-2 h-2 rounded-full bg-[#00c0f3] mt-1.5 shrink-0" />
                                <div>
                                  <span className="font-bold text-[#0b2942]">{h.stage}</span>
                                  <span className="text-slate-400 ml-2">({h.timestamp})</span>
                                  <p className="text-slate-600 mt-0.5">{h.note}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: PAYMENTS & PAYMENT PLANS */}
              {activeTab === 'billing' && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  {/* Payment Plan Card */}
                  <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#00c0f3]">
                          Active Payment Plan & Method
                        </span>
                        <h3 className="text-lg font-black text-[#0b2942]">
                          {currentUser.paymentPlan.planLabel}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Periodic rate: <strong>${currentUser.paymentPlan.periodicAmount}</strong> billed automatically to avoid storage interruptions.
                        </p>
                      </div>

                      <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                        <CreditCard className="w-6 h-6 text-[#00c0f3]" />
                        <div className="text-xs">
                          <div className="font-extrabold text-[#0b2942]">
                            {currentUser.paymentPlan.cardBrand} •••• {currentUser.paymentPlan.cardLast4}
                          </div>
                          <div className="text-slate-400">Exp: {currentUser.paymentPlan.cardExpiry}</div>
                        </div>
                        {currentUser.paymentPlan.paymentsCeased ? (
                          <span className="text-[10px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-200 px-2.5 py-0.5 rounded-full ml-2">
                            Payments Ceased
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full ml-2">
                            Active Autopay
                          </span>
                        )}
                      </div>
                    </div>

                    {currentUser.paymentPlan.paymentsCeased && (
                      <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-bold flex items-center justify-between gap-2">
                        <span>
                          Recurring billing ceased on {currentUser.paymentPlan.paymentsCeasedDate || 'account'}: {currentUser.paymentPlan.paymentsCeasedReason || 'No further monthly storage charges will be billed.'}
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                      <div className="p-3 bg-slate-50 rounded-xl">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Billing Cycle</span>
                        <span className="font-bold text-slate-800">{currentUser.paymentPlan.planType.replace(/_/g, ' ').toUpperCase()}</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Next Charge Date</span>
                        <span className="font-bold text-slate-800 font-mono">{currentUser.paymentPlan.nextBillingDate}</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Term Discount Applied</span>
                        <span className="font-bold text-emerald-600 font-mono">{currentUser.paymentPlan.termDiscountPercent}% Off Regular Monthly</span>
                      </div>
                    </div>
                  </div>

                  {/* 12-Month Rate Freeze & Annual Review Policy Card */}
                  <div className="bg-gradient-to-r from-sky-50 via-white to-emerald-50 rounded-3xl p-6 border border-[#5CC1EF]/40 shadow-xs space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-[#15385E] text-[#F7D347] rounded-xl shadow-xs">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-[#0b2942]">
                            {currentUser.pricingOverride?.isActive
                              ? 'Admin Pricing Override Active · Guaranteed Rate'
                              : '12-Month Price Freeze & Annual Review Protection'}
                          </h4>
                          <p className="text-xs text-slate-500">
                            {currentUser.pricingOverride?.isActive
                              ? `$${currentUser.pricingOverride.overrideMonthlyRate}/month set for further ${currentUser.pricingOverride.durationMonths} months. Once expired, existing pricing review policy applies.`
                              : 'Your monthly storage rate is guaranteed not to increase during Year 1.'}
                          </p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                        currentUser.pricingOverride?.isActive
                          ? 'bg-purple-100 text-purple-800 border-purple-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}>
                        {currentUser.pricingOverride?.isActive
                          ? `Override Active (${currentUser.pricingOverride.durationMonths} Mo)`
                          : 'Year 1 Rate Protected'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 bg-white/80 rounded-xl border border-slate-200 space-y-0.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          {currentUser.pricingOverride?.isActive ? 'Override Rate' : 'Frozen Rate'}
                        </span>
                        <div className="text-base font-black text-[#15385E] font-mono">
                          ${currentUser.pricingOverride?.isActive ? currentUser.pricingOverride.overrideMonthlyRate : currentUser.paymentPlan.periodicAmount}/mo
                        </div>
                        <span className={`text-[11px] font-semibold ${currentUser.pricingOverride?.isActive ? 'text-purple-700' : 'text-emerald-700'}`}>
                          {currentUser.pricingOverride?.isActive
                            ? `Set for ${currentUser.pricingOverride.durationMonths} months (until ${new Date(currentUser.pricingOverride.expiryDate).toLocaleDateString('en-AU')})`
                            : '12-Month Guaranteed Floor'}
                        </span>
                      </div>

                      <div className="p-3 bg-white/80 rounded-xl border border-slate-200 space-y-0.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Delivery Fee Policy</span>
                        <div className="text-sm font-black text-[#15385E]">Policy Governed</div>
                        <span className="text-[11px] text-slate-600 block leading-tight">
                          Once quote freeze expires, delivery reverts to live catalog rate until booked, then is fixed unless cancelled (date changes allowed).
                        </span>
                      </div>

                      <div className="p-3 bg-white/80 rounded-xl border border-slate-200 space-y-0.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          {currentUser.pricingOverride?.isActive ? 'Review Policy Post-Expiry' : 'Annual Review (Month 12)'}
                        </span>
                        <div className="text-base font-black text-[#15385E] font-mono">
                          Max +{loadAppConfig().annualPriceAdjustmentCapPercent ?? 10}% Cap
                        </div>
                        <span className="text-[11px] text-slate-500">
                          {currentUser.pricingOverride?.isActive
                            ? 'Existing review policy applies once override ends'
                            : 'Floor rule: rate never drops below quote'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Invoices & Transactions Table */}
                  <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-extrabold text-[#0b2942]">
                        Invoices & Transaction Ledger
                      </h3>
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-600 flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Statement (PDF)</span>
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                            <th className="pb-3">Invoice #</th>
                            <th className="pb-3">Date</th>
                            <th className="pb-3">Description</th>
                            <th className="pb-3">Payment Method</th>
                            <th className="pb-3 text-right">Amount (AUD)</th>
                            <th className="pb-3 text-right">Status</th>
                            <th className="pb-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {currentUser.transactions.map((t) => (
                            <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-3.5 font-bold font-mono text-[#0b2942]">{t.invoiceNumber}</td>
                              <td className="py-3.5 text-slate-500">{t.date}</td>
                              <td className="py-3.5 font-medium text-slate-700 max-w-xs">{t.description}</td>
                              <td className="py-3.5 text-slate-500 font-mono text-[11px]">{t.paymentMethod || 'Braintree Vault'}</td>
                              <td className="py-3.5 text-right font-black font-mono text-[#0b2942]">
                                {t.amount < 0 ? `-$${Math.abs(t.amount)}` : `$${t.amount}`}
                              </td>
                              <td className="py-3.5 text-right">
                                <span
                                  className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
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
                              <td className="py-3.5 text-right">
                                {t.status === 'Overdue' || t.status === 'Pending' ? (
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEftDrawerTxn(eftDrawerTxn?.id === t.id ? null : t);
                                        setEftStatusNotice(null);
                                      }}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10px] cursor-pointer flex items-center gap-1"
                                    >
                                      <Landmark className="w-3 h-3" />
                                      <span>EFT / PayID</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handlePayOverdueInvoice(t.id)}
                                      disabled={payingInvoiceId === t.id}
                                      className={`px-2.5 py-1 text-white rounded-lg font-bold text-[10px] cursor-pointer ${
                                        t.status === 'Overdue'
                                          ? 'bg-red-600 hover:bg-red-700'
                                          : 'bg-[#00c0f3] hover:bg-[#00a8d6]'
                                      }`}
                                    >
                                      {payingInvoiceId === t.id ? 'Syncing...' : 'Card Pay'}
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => window.print()}
                                    className="text-slate-400 hover:text-slate-700 font-bold text-[11px] cursor-pointer"
                                  >
                                    Invoice
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Zepto Auto-Generated EFT Reference & Virtual Account Drawer for Selected Invoice */}
                    {eftDrawerTxn && (() => {
                      const inst: ZeptoEftInstruction = generateZeptoEftInstruction({
                        amountAud: eftDrawerTxn.amount,
                        customerName: `${currentUser.firstName} ${currentUser.lastName}`.trim(),
                        customerEmail: currentUser.email,
                        customerPhone: currentUser.mobile,
                        orderDescription: eftDrawerTxn.description,
                        orderNumber: currentUser.orders?.[0]?.orderNumber,
                        invoiceNumber: eftDrawerTxn.invoiceNumber,
                      });
                      return (
                        <div className="mt-4 p-5 rounded-2xl bg-emerald-50/80 border-2 border-emerald-300 space-y-4 text-xs animate-in fade-in">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200 pb-3">
                            <div>
                              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-700 text-white px-2 py-0.5 rounded">
                                ZEPTO NPP / PAYID AUTO-GENERATED REFERENCE
                              </span>
                              <h4 className="text-sm font-black text-[#0b2942] mt-1">
                                Pay Invoice #{eftDrawerTxn.invoiceNumber} (${eftDrawerTxn.amount} AUD) by EFT / PayID
                              </h4>
                            </div>
                            <button
                              type="button"
                              onClick={() => setEftDrawerTxn(null)}
                              className="text-slate-500 hover:text-slate-800 font-bold cursor-pointer self-end sm:self-center"
                            >
                              Close ✕
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="p-3.5 rounded-xl bg-white border-2 border-[#FF9900] flex items-center justify-between gap-2">
                              <div>
                                <span className="text-[10px] font-extrabold uppercase text-slate-400 block">
                                  Auto-Generated Reference
                                </span>
                                <span className="font-mono font-black text-sm text-[#0b2942]">
                                  {inst.referenceCode}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard?.writeText(inst.referenceCode);
                                  setCopiedEftField('ref');
                                  setTimeout(() => setCopiedEftField(null), 2000);
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-[#FF9900] text-[#0b2942] font-extrabold text-[10px] flex items-center gap-1 cursor-pointer"
                              >
                                {copiedEftField === 'ref' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                <span>{copiedEftField === 'ref' ? 'Copied' : 'Copy'}</span>
                              </button>
                            </div>

                            <div className="p-3.5 rounded-xl bg-white border border-emerald-200 flex items-center justify-between gap-2">
                              <div>
                                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                                  Dynamic PayID
                                </span>
                                <span className="font-mono font-bold text-[#0b2942] break-all">
                                  {inst.payIdEmail}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard?.writeText(inst.payIdEmail);
                                  setCopiedEftField('payid');
                                  setTimeout(() => setCopiedEftField(null), 2000);
                                }}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                              >
                                {copiedEftField === 'payid' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>

                            <div className="p-3.5 rounded-xl bg-white border border-emerald-200 flex items-center justify-between gap-2">
                              <div>
                                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                                  Virtual BSB &amp; Account #
                                </span>
                                <span className="font-mono font-bold text-[#0b2942]">
                                  {inst.virtualBsb} · {inst.virtualAccountNumber}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard?.writeText(`${inst.virtualBsb} ${inst.virtualAccountNumber}`);
                                  setCopiedEftField('acct');
                                  setTimeout(() => setCopiedEftField(null), 2000);
                                }}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                              >
                                {copiedEftField === 'acct' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>

                          {eftStatusNotice && (
                            <div className="p-3 rounded-xl bg-white border border-emerald-300 text-emerald-900 font-bold">
                              {eftStatusNotice}
                            </div>
                          )}

                          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                settleOrRegisterZeptoEftPayment({
                                  instruction: inst,
                                  mode: 'instant_npp_webhook',
                                });
                                const refreshed = loadCustomerAccounts().find((a) => a.id === currentUser.id);
                                if (refreshed) {
                                  setCurrentUser({ ...refreshed });
                                  setCurrentUserSession({ ...refreshed });
                                }
                                setEftDrawerTxn(null);
                              }}
                              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold cursor-pointer shadow-2xs"
                            >
                              Confirm Instant PayID / NPP Transfer (${eftDrawerTxn.amount})
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* TAB 4: QUOTES WITH INLINE EDITOR & BOOK NOW WORKFLOW */}
              {activeTab === 'quotes' && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-extrabold text-[#0b2942]">
                        Your Portabox Quotes ({currentUser.quotes.length})
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Your prices are locked with our 30-day price lock guarantee. Book immediately or adjust container size and storage placement below.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>30-Day Guaranteed Price Lock</span>
                      </span>
                    </div>
                  </div>

                  {quoteSaveSuccess && (
                    <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{quoteSaveSuccess}</span>
                    </div>
                  )}

                  <div className="space-y-4">
                    {currentUser.quotes.map((q) => {
                      const isOnsite =
                        q.quoteData?.storagePlacement === 'my_place' ||
                        q.quoteData?.serviceType === 'storage_at_place' ||
                        q.containerSize?.toLowerCase().includes('onsite');
                      const isEditing = editingQuoteId === q.id;

                      return (
                        <div
                          key={q.id}
                          className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-slate-200 shadow-xs space-y-4 transition-all"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono font-bold text-xs bg-sky-100 text-sky-800 px-2.5 py-0.5 rounded-md">
                                  {q.quoteNumber}
                                </span>
                                <h4 className="font-extrabold text-base text-[#0b2942]">
                                  {q.quoteData?.containerName || q.containerSize.replace(/_/g, ' ').toUpperCase()} ({q.containerCount} Unit{q.containerCount > 1 ? 's' : ''})
                                </h4>
                                {isOnsite ? (
                                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                                    <Home className="w-3 h-3 text-amber-700" />
                                    <span>Store at My Place (Onsite)</span>
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-sky-100 text-sky-900 border border-sky-300 flex items-center gap-1">
                                    <Building className="w-3 h-3 text-sky-700" />
                                    <span>Portabox Facility Storage</span>
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500">
                                Created: {q.createdAt} · Valid until: <strong className="text-slate-800">{q.validUntil}</strong> · Billing: <strong className="text-slate-800">{q.billingCycle.replace(/_/g, ' ')}</strong>
                              </p>
                            </div>

                            <div className="flex items-center gap-4 self-start sm:self-auto">
                              <div className="text-left sm:text-right">
                                <div className="text-xl sm:text-2xl font-black text-[#0b2942] font-mono">
                                  ${q.firstPaymentTotal}
                                </div>
                                <span className="text-[11px] text-slate-400 font-medium block">
                                  First payment (incl. delivery)
                                </span>
                                <span className="text-xs text-emerald-600 font-black font-mono">
                                  ${q.monthlyStorageFee}/mo ongoing
                                </span>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                q.status === 'Accepted'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : 'bg-sky-50 text-sky-800 border border-sky-200'
                              }`}>
                                {q.status}
                              </span>
                            </div>
                          </div>

                          {/* Action Buttons Row */}
                          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleBookQuote(q.quoteData)}
                                className="px-4 py-2 bg-[#F7D347] hover:bg-[#eec939] text-[#15385E] font-black text-xs rounded-xl flex items-center gap-1.5 shadow-2xs transition-transform hover:scale-[1.02] active:scale-95 cursor-pointer"
                              >
                                <CheckCircle2 className="w-4 h-4 text-[#15385E]" />
                                <span>Book Now</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  if (isEditing) {
                                    setEditingQuoteId(null);
                                  } else {
                                    handleStartEditQuote(q);
                                  }
                                }}
                                className={`px-3.5 py-2 font-bold text-xs rounded-xl flex items-center gap-1.5 border transition-colors cursor-pointer ${
                                  isEditing
                                    ? 'bg-[#15385E] text-[#F7D347] border-[#15385E]'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                                }`}
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>{isEditing ? 'Close Editor' : 'Edit Quote'}</span>
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => window.print()}
                              className="text-slate-500 hover:text-slate-800 font-bold text-xs flex items-center gap-1 cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5 text-slate-400" />
                              <span>Print / Download PDF</span>
                            </button>
                          </div>

                          {/* INLINE LIVE QUOTE EDITOR */}
                          {isEditing && (
                            <div className="mt-4 p-5 rounded-2xl bg-slate-50 border-2 border-[#15385E]/30 space-y-4 animate-in fade-in duration-200">
                              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                                <div className="flex items-center gap-2">
                                  <Edit3 className="w-4 h-4 text-[#15385E]" />
                                  <span className="text-xs font-black text-[#15385E] uppercase tracking-wider">
                                    Quick Inline Quote Editor · Live Price Recalculation
                                  </span>
                                </div>
                                <span className="text-[11px] text-slate-500 font-medium">
                                  Instant recalculation based on your active tariff
                                </span>
                              </div>

                              {/* 1. Storage Placement Toggle */}
                              <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 block">
                                  1. Storage Placement (At Your Place vs Portabox Facility)
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                  <button
                                    type="button"
                                    onClick={() => setEditPlacement('my_place')}
                                    className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center gap-3 ${
                                      editPlacement === 'my_place'
                                        ? 'border-[#15385E] bg-white shadow-xs ring-2 ring-[#15385E]/20'
                                        : 'border-slate-200 bg-white/60 hover:border-slate-300'
                                    }`}
                                  >
                                    <div className={`p-2 rounded-xl shrink-0 ${editPlacement === 'my_place' ? 'bg-[#15385E] text-[#F7D347]' : 'bg-slate-100 text-slate-600'}`}>
                                      <Home className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <div className="text-xs font-black text-[#15385E]">Store at My Place (Onsite)</div>
                                      <div className="text-[11px] text-slate-500">Container stays at your address · Lower monthly hire rate</div>
                                    </div>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setEditPlacement('facility')}
                                    className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center gap-3 ${
                                      editPlacement === 'facility'
                                        ? 'border-[#15385E] bg-white shadow-xs ring-2 ring-[#15385E]/20'
                                        : 'border-slate-200 bg-white/60 hover:border-slate-300'
                                    }`}
                                  >
                                    <div className={`p-2 rounded-xl shrink-0 ${editPlacement === 'facility' ? 'bg-[#15385E] text-[#F7D347]' : 'bg-slate-100 text-slate-600'}`}>
                                      <Building className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <div className="text-xs font-black text-[#15385E]">Portabox Secure Facility</div>
                                      <div className="text-[11px] text-slate-500">Stored at Portabox CCTV depot · Climate &amp; fire protected</div>
                                    </div>
                                  </button>
                                </div>
                              </div>

                              {/* 2. Container Size */}
                              <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 block">
                                  2. Container Size &amp; Precise Dimensions
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                  {[
                                    {
                                      id: 'small_10m3' as ContainerSizeId,
                                      title: 'Small (10 m³)',
                                      dims: '2.4m (H), 2.1m (L), 2.1m (W)',
                                      desc: '1-2 rooms / studio',
                                    },
                                    {
                                      id: 'medium_19m3' as ContainerSizeId,
                                      title: 'Medium (19 m³)',
                                      dims: '2.4m (H), 3.6m (L), 2.4m (W)',
                                      desc: '2-3 bedroom home',
                                    },
                                    {
                                      id: 'large_25m3' as ContainerSizeId,
                                      title: 'Large (25 m³)',
                                      dims: '2.4m (H), 4.8m (L), 2.4m (W)',
                                      desc: '3-4 bedroom home',
                                    },
                                  ].map((box) => (
                                    <button
                                      key={box.id}
                                      type="button"
                                      onClick={() => setEditContainerSize(box.id)}
                                      className={`p-2.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                                        editContainerSize === box.id
                                          ? 'border-[#15385E] bg-white shadow-xs ring-2 ring-[#15385E]/20'
                                          : 'border-slate-200 bg-white/60 hover:border-slate-300'
                                      }`}
                                    >
                                      <div className="text-xs font-black text-[#15385E]">{box.title}</div>
                                      <div className="text-[10px] font-mono text-slate-600 mt-0.5">{box.dims}</div>
                                      <div className="text-[10px] text-slate-400 mt-0.5">{box.desc}</div>
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* 3. Container Count & Duration & Billing Cycle */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {/* Quantity */}
                                <div className="space-y-1">
                                  <label className="text-xs font-bold text-slate-700 block">Quantity</label>
                                  <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200">
                                    <button
                                      type="button"
                                      onClick={() => setEditContainerCount(Math.max(1, editContainerCount - 1))}
                                      className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-black cursor-pointer"
                                    >
                                      -
                                    </button>
                                    <span className="flex-1 text-center font-mono font-black text-sm text-[#0b2942]">
                                      {editContainerCount}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setEditContainerCount(editContainerCount + 1)}
                                      className="w-8 h-8 rounded-lg bg-[#15385E] text-[#F7D347] flex items-center justify-center font-black cursor-pointer"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>

                                {/* Duration */}
                                <div className="space-y-1">
                                  <label className="text-xs font-bold text-slate-700 block">Duration Term</label>
                                  <select
                                    value={editDuration}
                                    onChange={(e) => setEditDuration(e.target.value as StorageDuration)}
                                    className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-[#0b2942] focus:outline-none focus:ring-2 focus:ring-[#15385E]"
                                  >
                                    <option value="1_to_3_months">1 – 3 Months (Short Term)</option>
                                    <option value="4_to_11_months">4 – 11 Months (Most Popular)</option>
                                    <option value="12_plus_months">12+ Months (12-Mo Rate Freeze)</option>
                                  </select>
                                </div>

                                {/* Billing Cycle */}
                                <div className="space-y-1">
                                  <label className="text-xs font-bold text-slate-700 block">Billing Cycle</label>
                                  <select
                                    value={editBillingCycle}
                                    onChange={(e) => setEditBillingCycle(e.target.value as BillingCycle)}
                                    className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-[#0b2942] focus:outline-none focus:ring-2 focus:ring-[#15385E]"
                                  >
                                    <option value="monthly">Monthly Advance</option>
                                    <option value="3_months_upfront">3 Months Upfront (5% off)</option>
                                    <option value="6_months_upfront">6 Months Upfront (7.5% off)</option>
                                    <option value="12_months_upfront">12 Months Upfront (10% off)</option>
                                  </select>
                                </div>
                              </div>

                              {/* Real-time Recalculation Summary */}
                              {livePreviewQuote && (
                                <div className="p-4 rounded-xl bg-white border border-[#15385E]/30 space-y-3">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                      <span className="text-[10px] font-black uppercase tracking-wider text-[#00c0f3] block">
                                        RECALCULATED ESTIMATE
                                      </span>
                                      <h5 className="text-sm font-black text-[#0b2942] mt-0.5">
                                        {livePreviewQuote.containerName} · {editPlacement === 'my_place' ? 'Onsite Storage' : 'Facility Depot Storage'}
                                      </h5>
                                      <span className="text-[11px] text-slate-500 block mt-0.5">
                                        {livePreviewQuote.storagePricingText || (editPlacement === 'my_place' ? 'Monthly onsite hire (no depot fees)' : 'Portabox CCTV depot storage')}
                                      </span>
                                    </div>

                                    <div className="flex items-baseline sm:items-end gap-3">
                                      <div className="text-left sm:text-right">
                                        <div className="text-xs text-slate-400">New First Payment:</div>
                                        <div className="text-xl font-black text-[#0b2942] font-mono">
                                          ${livePreviewQuote.firstPaymentTotal}
                                        </div>
                                      </div>
                                      <div className="text-left sm:text-right border-l border-slate-200 pl-3">
                                        <div className="text-xs text-slate-400">Monthly Rate:</div>
                                        <div className="text-lg font-black text-emerald-600 font-mono">
                                          ${livePreviewQuote.monthlyStorageFee}/mo
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                                    <button
                                      type="button"
                                      onClick={() => setEditingQuoteId(null)}
                                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold cursor-pointer"
                                    >
                                      Cancel
                                    </button>

                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={handleSaveEditedQuote}
                                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold cursor-pointer shadow-2xs"
                                      >
                                        Save Changes to Quote
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleBookQuote(livePreviewQuote)}
                                        className="px-4 py-2 rounded-xl bg-[#F7D347] hover:bg-[#eec939] text-[#15385E] font-black cursor-pointer shadow-2xs flex items-center gap-1.5"
                                      >
                                        <CheckCircle2 className="w-4 h-4 text-[#15385E]" />
                                        <span>Book Now with Updated Details</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 5: DISCOUNTS & SAVINGS */}
              {activeTab === 'discounts' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="bg-emerald-500 text-white rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <span className="text-xs font-black uppercase tracking-wider text-emerald-100">
                        Total Discounts & Savings Awarded
                      </span>
                      <h3 className="text-3xl sm:text-4xl font-black font-mono mt-1">
                        ${totalDiscounts}
                      </h3>
                      <p className="text-xs text-emerald-100 mt-1 max-w-md">
                        Includes promotional voucher codes, upfront advance payment rebates, and volume discounts applied to your Portabox account.
                      </p>
                    </div>

                    <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shrink-0">
                      <Sparkles className="w-7 h-7" />
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3">
                    <h4 className="text-sm font-extrabold text-[#0b2942]">Discount Log:</h4>
                    <div className="divide-y divide-slate-100">
                      {(currentUser.discountsGiven || []).map((d) => (
                        <div key={d.id} className="py-3 flex items-center justify-between text-xs">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                                {d.code || d.type.toUpperCase()}
                              </span>
                              <span className="font-extrabold text-[#0b2942]">{d.description}</span>
                            </div>
                            <span className="text-[11px] text-slate-400 mt-0.5 block">{d.date}</span>
                          </div>
                          <span className="font-mono font-black text-sm text-emerald-600">
                            -${d.amount}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 6: SELF-SERVICE HUB (THE COMPREHENSIVE SUITE) */}
              {activeTab === 'selfservice' && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  {/* Action Banner */}
                  <div className="p-5 rounded-3xl bg-gradient-to-r from-[#15385E] to-[#112F4F] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#F7D347] block">
                        Customer Self-Service Hub
                      </span>
                      <h3 className="text-xl font-black text-white mt-0.5">
                        Total Control Over Your Containers
                      </h3>
                      <p className="text-xs text-sky-100 max-w-xl mt-1">
                        Schedule zero-tilt horizontal pickups, order extra packing boxes directly to your driveway, extend your hire term for upfront discounts, or update placement notes for your driver.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1.5 rounded-xl bg-white/10 text-white text-xs font-bold border border-white/20">
                        24/7 Portal Self-Service
                      </span>
                    </div>
                  </div>

                  {/* 1. Schedule Container Pickup / Return / Re-Delivery */}
                  <div className="bg-white rounded-3xl p-6 sm:p-7 border-2 border-[#DAD7D1] shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-sky-100 text-[#15385E]">
                          <Package className="w-5 h-5 text-[#15385E]" />
                        </div>
                        <div>
                          <h4 className="text-base font-extrabold text-[#15385E]">
                            1. Schedule Container Pickup or Re-Delivery
                          </h4>
                          <p className="text-xs text-slate-500">
                            Book a zero-tilt horizontal level-lift truck to collect your container or move it to a new location.
                          </p>
                        </div>
                      </div>

                      <span className="text-[10px] font-black uppercase tracking-wider bg-sky-50 text-[#15385E] px-2.5 py-1 rounded-md border border-[#5CC1EF]/40">
                        Zero-Tilt Level Lift
                      </span>
                    </div>

                    {pickupRequested ? (
                      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                          <div>
                            <span className="font-extrabold">Pickup / Movement Confirmed: </span>
                            <span>{pickupDate} ({pickupTimeSlot.toUpperCase()} WINDOW) · Synced with Smartsheet Dispatch</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPickupRequested(false)}
                          className="px-3 py-1.5 bg-white border border-emerald-300 rounded-xl text-xs text-emerald-800 hover:bg-emerald-100 cursor-pointer shrink-0 font-bold"
                        >
                          Modify Pickup Booking
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4 pt-2">
                        {/* Service Type Selection */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setPickupServiceType('depot_return')}
                            className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                              pickupServiceType === 'depot_return'
                                ? 'border-[#5CC1EF] bg-sky-50/70 text-[#15385E] ring-2 ring-[#5CC1EF]/30 font-bold'
                                : 'border-[#DAD7D1] hover:border-slate-300 text-slate-700 bg-white'
                            }`}
                          >
                            <div className="text-xs font-black text-[#15385E]">Return to Portabox Metro Depot</div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Store long-term in our secure, dust-free warehouse depot
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => setPickupServiceType('redelivery_move')}
                            className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                              pickupServiceType === 'redelivery_move'
                                ? 'border-[#5CC1EF] bg-sky-50/70 text-[#15385E] ring-2 ring-[#5CC1EF]/30 font-bold'
                                : 'border-[#DAD7D1] hover:border-slate-300 text-slate-700 bg-white'
                            }`}
                          >
                            <div className="text-xs font-black text-[#15385E]">Move / Re-Deliver to New Property</div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Transport flat to your new house, apartment, or commercial job site
                            </div>
                          </button>
                        </div>

                        {/* Re-Delivery Address inputs if moving */}
                        {pickupServiceType === 'redelivery_move' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                                New Street Address
                              </label>
                              <input
                                type="text"
                                value={redeliveryStreet}
                                onChange={(e) => setRedeliveryStreet(e.target.value)}
                                placeholder="e.g. 74 Glen Osmond Road"
                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#5CC1EF]"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                                New Suburb &amp; Postcode
                              </label>
                              <input
                                type="text"
                                value={redeliverySuburb}
                                onChange={(e) => setRedeliverySuburb(e.target.value)}
                                placeholder="e.g. Fullarton SA 5063"
                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#5CC1EF]"
                              />
                            </div>
                          </div>
                        )}

                        {/* Date & Time Slot Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                              Preferred Date
                            </label>
                            <input
                              type="date"
                              value={pickupDate}
                              onChange={(e) => setPickupDate(e.target.value)}
                              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-[#15385E] focus:outline-none focus:ring-2 focus:ring-[#5CC1EF]"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                              Target Time Slot Window
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                              {(['morning', 'midday', 'afternoon'] as const).map((slot) => (
                                <button
                                  key={slot}
                                  type="button"
                                  onClick={() => setPickupTimeSlot(slot)}
                                  className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                    pickupTimeSlot === slot
                                      ? 'bg-[#15385E] text-white border-[#15385E]'
                                      : 'bg-white border-[#DAD7D1] text-slate-700 hover:bg-slate-50'
                                  }`}
                                >
                                  {slot === 'morning' ? 'Morning (7-11:30 AM)' : slot === 'midday' ? 'Midday (11:30-3:30)' : 'Afternoon (3:30-7)'}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-end pt-2">
                          <button
                            type="button"
                            onClick={handleConfirmPickupBooking}
                            className="px-6 py-3 bg-[#F7D347] hover:bg-[#eed235] text-[#1A1A1A] rounded-2xl font-black text-xs transition-all cursor-pointer shadow-xs border border-[#e6c338]"
                          >
                            Confirm Pickup Booking &amp; Sync to Dispatch
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 2. Driver Placement & Access Instructions */}
                  <div className="bg-white rounded-3xl p-6 sm:p-7 border-2 border-[#DAD7D1] shadow-xs space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700">
                        <MapPin className="w-5 h-5 text-[#15385E]" />
                      </div>
                      <div>
                        <h4 className="text-base font-extrabold text-[#15385E]">
                          2. Driver Site Placement &amp; Property Access
                        </h4>
                        <p className="text-xs text-slate-500">
                          Configure driveway placement surface, door orientation, gate codes, and low-branch clearance notes for your driver.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4 pt-1">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Placement Surface */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                            Ground Placement Surface
                          </label>
                          <select
                            value={placementSurface}
                            onChange={(e) => setPlacementSurface(e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-medium focus:outline-none focus:ring-2 focus:ring-[#5CC1EF]"
                          >
                            <option value="Concrete Driveway">Concrete Driveway (Standard Protective Pads)</option>
                            <option value="Paved Asphalt">Paved Asphalt Driveway</option>
                            <option value="Grass / Lawn">Grass / Lawn (Heavy Timber Dunnage Provided)</option>
                            <option value="Gravel / Dirt">Gravel / Compacted Dirt</option>
                            <option value="Roadside / Nature Strip">Roadside / Nature Strip (Permit Verified)</option>
                          </select>
                        </div>

                        {/* Door Orientation */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                            Container Door Orientation
                          </label>
                          <select
                            value={doorOrientation}
                            onChange={(e) => setDoorOrientation(e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-medium focus:outline-none focus:ring-2 focus:ring-[#5CC1EF]"
                          >
                            <option value="Doors Facing Street / Road">Doors Facing Street / Road</option>
                            <option value="Doors Facing House / Property">Doors Facing House / Garage</option>
                            <option value="Driver Discretion">Driver Discretion (Best Safe Access)</option>
                          </select>
                        </div>
                      </div>

                      {/* Overhead Clearance Checkbox */}
                      <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-sky-50/60 border border-[#5CC1EF]/30 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={overheadClearanceChecked}
                          onChange={(e) => setOverheadClearanceChecked(e.target.checked)}
                          className="w-4 h-4 text-[#15385E] rounded accent-[#15385E]"
                        />
                        <span className="text-xs text-[#15385E] font-medium">
                          I confirm <strong>3.5m vertical overhead clearance</strong> is free of low-hanging tree branches and power cables.
                        </span>
                      </label>

                      {/* Notes Textarea */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                          Driver Gate Codes &amp; Access Notes
                        </label>
                        <textarea
                          rows={2}
                          value={accessNotesText}
                          onChange={(e) => setAccessNotesText(e.target.value)}
                          placeholder="e.g. Place container on left side of driveway facing garage. Gate access code is 4192. Please call 15 min prior."
                          className="w-full p-3 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#5CC1EF]"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        {notesSavedSuccess ? (
                          <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            <span>Saved &amp; beamed directly to driver tablet</span>
                          </span>
                        ) : <span />}

                        <button
                          type="button"
                          onClick={handleSaveAccessNotes}
                          className="px-5 py-2.5 bg-[#15385E] hover:bg-[#112F4F] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        >
                          Save Instructions
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 3. Order Extra Packing Supplies */}
                  <div className="bg-white rounded-3xl p-6 sm:p-7 border-2 border-[#DAD7D1] shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700">
                          <Layers className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-base font-extrabold text-[#15385E]">
                            3. Order Extra Boxes &amp; Moving Supplies
                          </h4>
                          <p className="text-xs text-slate-500">
                            Need more boxes or tape? We deliver supplies directly to your container on the next scheduled run.
                          </p>
                        </div>
                      </div>

                      {suppliesOrderSuccess && (
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                          ✓ Supplies Order Placed!
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                      {[
                        { id: 'standard_boxes', name: 'Standard Moving Boxes (10pk)', desc: '105L heavy-duty tea chest cartons', price: 25 },
                        { id: 'book_boxes', name: 'Book & Wine Cartons (10pk)', desc: 'Heavy duty, ideal for books & fragile', price: 22 },
                        { id: 'furniture_blankets', name: 'Furniture Blankets (5pk Rental)', desc: 'Thick quilted protection pads', price: 15 },
                        { id: 'packing_tape', name: 'Heavy-Duty Tape & Dispenser', desc: 'Brown packing tape 50m roll', price: 12 },
                        { id: 'wardrobe_box', name: 'Port-a-Robe Hanging Box', desc: 'Built-in clothes rail for suits & dresses', price: 16.5 },
                      ].map((item) => {
                        const qty = suppliesCart[item.id] || 0;
                        return (
                          <div key={item.id} className="p-3 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
                            <div>
                              <div className="text-xs font-bold text-[#15385E]">{item.name}</div>
                              <div className="text-[10px] text-slate-500">{item.desc}</div>
                              <div className="text-xs font-black text-[#15385E] mt-1">${item.price.toFixed(2)}</div>
                            </div>
                            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
                              <button
                                type="button"
                                onClick={() => setSuppliesCart((prev) => ({ ...prev, [item.id]: Math.max(0, (prev[item.id] || 0) - 1) }))}
                                className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-xs flex items-center justify-center cursor-pointer"
                              >
                                -
                              </button>
                              <span className="w-6 text-center text-xs font-black text-[#15385E]">{qty}</span>
                              <button
                                type="button"
                                onClick={() => setSuppliesCart((prev) => ({ ...prev, [item.id]: (prev[item.id] || 0) + 1 }))}
                                className="w-6 h-6 rounded-lg bg-[#5CC1EF] text-[#15385E] font-bold text-xs flex items-center justify-center cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {Object.values(suppliesCart).some((q) => q > 0) && (
                      <div className="p-3.5 rounded-2xl bg-sky-50 border border-[#5CC1EF]/40 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-[#15385E]">Supplies Order Subtotal: </span>
                          <span className="font-mono font-black text-[#15385E]">
                            $
                            {Object.entries(suppliesCart).reduce((sum, [id, qty]) => {
                              const prices: Record<string, number> = { standard_boxes: 25, book_boxes: 22, furniture_blankets: 15, packing_tape: 12, wardrobe_box: 16.5 };
                              return sum + (prices[id] || 0) * qty;
                            }, 0).toFixed(2)} AUD
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleOrderSupplies}
                          className="px-4 py-2 bg-[#15385E] hover:bg-[#112F4F] text-white text-xs font-bold rounded-xl cursor-pointer"
                        >
                          Confirm &amp; Add to Next Run
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 4. Extend Storage Duration & Lock In Discounts */}
                  <div className="bg-white rounded-3xl p-6 sm:p-7 border-2 border-[#DAD7D1] shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
                          <Clock className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-base font-extrabold text-[#15385E]">
                            4. Extend Storage Duration &amp; Lock In Upfront Discounts
                          </h4>
                          <p className="text-xs text-slate-500">
                            Staying longer? Commit to a longer period to immediately reduce your monthly storage rate.
                          </p>
                        </div>
                      </div>

                      {extensionSuccess && (
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                          ✓ Contract Extended &amp; Rate Discounted!
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                      {[
                        { months: 1, label: '+1 Month', discount: 'Standard Rate' },
                        { months: 3, label: '+3 Months', discount: 'Save 5% off monthly' },
                        { months: 6, label: '+6 Months', discount: 'Save 10% off monthly' },
                        { months: 12, label: '+12 Months', discount: 'Save 20% off monthly' },
                      ].map((tier) => (
                        <button
                          key={tier.months}
                          type="button"
                          onClick={() => setExtensionMonths(tier.months)}
                          className={`p-3 rounded-2xl border-2 text-center transition-all cursor-pointer ${
                            extensionMonths === tier.months
                              ? 'border-[#5CC1EF] bg-sky-50 text-[#15385E] ring-2 ring-[#5CC1EF]/30 font-bold'
                              : 'border-[#DAD7D1] hover:border-slate-300 bg-white text-slate-700'
                          }`}
                        >
                          <div className="text-sm font-black text-[#15385E]">{tier.label}</div>
                          <div className="text-[10px] text-emerald-600 font-bold mt-0.5">{tier.discount}</div>
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="text-xs text-slate-600">
                        Current periodic rate: <strong className="text-[#15385E]">${currentUser.paymentPlan.periodicAmount}/mo</strong>
                      </div>
                      <button
                        type="button"
                        onClick={handleExtendDuration}
                        className="px-5 py-2.5 bg-[#F7D347] hover:bg-[#eed235] text-[#1A1A1A] font-black text-xs rounded-xl border border-[#e6c338] shadow-xs cursor-pointer"
                      >
                        Apply +{extensionMonths} Month Extension
                      </button>
                    </div>
                  </div>

                  {/* 5. Official Documents, Certificates & Downloads */}
                  <div className="bg-white rounded-3xl p-6 sm:p-7 border-2 border-[#DAD7D1] shadow-xs space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-purple-50 text-purple-700">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-base font-extrabold text-[#15385E]">
                          5. Official Documents, Contracts &amp; Insurance Protection
                        </h4>
                        <p className="text-xs text-slate-500">
                          View, download, or print legal contracts, goods protection policies, and packing safety guides.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => setActiveDocPreview('agreement')}
                        className="p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-[#5CC1EF] transition-all text-left cursor-pointer flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-[#15385E]" />
                            <span className="text-xs font-black text-[#15385E]">Storage Rental Agreement</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Official terms &amp; conditions, zero-tilt level-lift delivery clauses, and container serial numbers.
                          </p>
                        </div>
                        <span className="text-[10px] font-bold text-[#5CC1EF] mt-3 flex items-center gap-1">
                          <span>View &amp; Print PDF</span>
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveDocPreview('insurance')}
                        className="p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-[#5CC1EF] transition-all text-left cursor-pointer flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            <span className="text-xs font-black text-[#15385E]">Protection Cover Certificate</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1">
                            $100,000 complimentary transit &amp; depot storage protection coverage certificate.
                          </p>
                        </div>
                        <span className="text-[10px] font-bold text-[#5CC1EF] mt-3 flex items-center gap-1">
                          <span>View &amp; Print PDF</span>
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveDocPreview('guide')}
                        className="p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-[#5CC1EF] transition-all text-left cursor-pointer flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <Layers className="w-4 h-4 text-[#15385E]" />
                            <span className="text-xs font-black text-[#15385E]">Zero-Tilt Loading Guide</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Best practice stacking techniques: base furniture, mid appliances, and top box layers.
                          </p>
                        </div>
                        <span className="text-[10px] font-bold text-[#5CC1EF] mt-3 flex items-center gap-1">
                          <span>View &amp; Print PDF</span>
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      </button>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 7: VIP REWARDS, 12-MONTH RATE FREEZE & DUAL-SIDED REFERRAL CRM */}
              {activeTab === 'loyalty' && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  {/* VIP Status Banner */}
                  <div className="rounded-3xl bg-gradient-to-r from-[#112F4F] via-[#15385E] to-[#1c4b7d] text-white p-6 sm:p-8 shadow-md border-2 border-[#5CC1EF]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="space-y-2">
                      <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#F7D347] bg-[#F7D347]/10 px-3 py-1 rounded-full border border-[#F7D347]/30">
                        <Award className="w-4 h-4 text-[#F7D347]" />
                        <span>Portabox VIP Status: {calculateCustomerLoyaltyTier(currentUser).tier}</span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-black text-white">
                        {calculateCustomerLoyaltyTier(currentUser).tier === 'Platinum' ? '💎 Platinum Storer' : calculateCustomerLoyaltyTier(currentUser).tier === 'Gold' ? '🥇 Gold Storer' : calculateCustomerLoyaltyTier(currentUser).tier === 'Silver' ? '🥈 Silver Storer' : '🥉 Bronze Mover'} · Customer Since {currentUser.orders[0]?.scheduledDeliveryDate || '2026'}
                      </h3>
                      <p className="text-xs text-sky-100 max-w-xl leading-relaxed">
                        Enjoy guaranteed VIP benefits including priority level-lift delivery windows, 12-month legal rate freeze, complimentary packing blanket allowances, and dual-sided referral bonuses.
                      </p>
                    </div>

                    <div className="bg-white/10 p-4 rounded-2xl border border-white/20 text-center shrink-0">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-200 block">
                        Available Account Credit
                      </span>
                      <div className="text-3xl font-black text-[#F7D347] font-mono mt-1">
                        $50.00
                      </div>
                      <span className="text-[10px] text-white font-medium block mt-0.5">
                        Applied to next monthly bill
                      </span>
                    </div>
                  </div>

                  {/* Dual-Sided Referral Hub: "$50 For You, $50 For Your Friend" */}
                  <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-[#DAD7D1] shadow-xs space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-[#F7D347] text-[#1A1A1A]">
                          <Heart className="w-6 h-6 fill-[#1A1A1A]" />
                        </div>
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-amber-700">
                            Dual-Sided Referral CRM
                          </span>
                          <h4 className="text-lg font-black text-[#15385E]">
                            Give $50, Get $50 Referral Reward
                          </h4>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full border border-emerald-300">
                          Unlimited Rewards Active
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                      Share your personal referral link with friends, neighbours, or family who are moving or need extra storage. They get <strong>$50 off their initial move-in delivery</strong>, and you get <strong>$50 credited directly to your monthly storage bill</strong> as soon as their container is placed.
                    </p>

                    {/* Share Action Row */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="w-full sm:flex-1">
                          <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                            Your Unique Referral Code &amp; Link
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              readOnly
                              value={`https://portabox.com.au/r/${currentUser.firstName.toUpperCase()}${currentUser.id.slice(-4).toUpperCase()}`}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-mono font-bold text-[#15385E]"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard?.writeText(`https://portabox.com.au/r/${currentUser.firstName.toUpperCase()}${currentUser.id.slice(-4).toUpperCase()}`);
                                setReferralCopied(true);
                                setTimeout(() => setReferralCopied(false), 2500);
                              }}
                              className="px-4 py-2.5 bg-[#15385E] hover:bg-[#112F4F] text-[#F7D347] font-black rounded-xl text-xs shrink-0 cursor-pointer transition-colors"
                            >
                              {referralCopied ? '✓ Copied' : 'Copy Link'}
                            </button>
                          </div>
                        </div>

                        {/* WhatsApp Direct Share */}
                        <div className="w-full sm:w-auto self-end">
                          <button
                            type="button"
                            onClick={() => {
                              const refUrl = `https://portabox.com.au/r/${currentUser.firstName.toUpperCase()}${currentUser.id.slice(-4).toUpperCase()}`;
                              const text = encodeURIComponent(`Hey! I'm using Portabox for mobile storage and moving. It's so easy - they deliver the container flat on your driveway so there are zero paver scratches. Use my friend link to get $50 off your first delivery: ${refUrl}`);
                              window.open(`https://wa.me/?text=${text}`, '_blank');
                            }}
                            className="w-full sm:w-auto px-5 py-2.5 bg-[#25D366] hover:bg-[#20ba59] text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all active:scale-95"
                          >
                            <MessageSquare className="w-4 h-4 fill-white text-[#25D366]" />
                            <span>Share to WhatsApp (+$50)</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Live Referral CRM Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          Referral Links Shared
                        </span>
                        <div className="text-2xl font-black text-[#15385E]">4</div>
                        <span className="text-[11px] text-slate-500 font-medium">WhatsApp &amp; SMS</span>
                      </div>

                      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          Friends Moved In
                        </span>
                        <div className="text-2xl font-black text-emerald-600 font-mono">1 Friend</div>
                        <span className="text-[11px] text-emerald-700 font-semibold">Active in Norwood SA</span>
                      </div>

                      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          Credits Earned
                        </span>
                        <div className="text-2xl font-black text-[#15385E] font-mono">$50.00</div>
                        <span className="text-[11px] text-emerald-600 font-semibold">Deducted from last invoice</span>
                      </div>
                    </div>
                  </div>

                  {/* 12-Month Legal Rate Freeze Guarantee Card */}
                  <div className="bg-gradient-to-r from-emerald-50 via-sky-50 to-white rounded-3xl p-6 sm:p-7 border-2 border-emerald-300 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black shrink-0 shadow-xs">
                        <ShieldCheck className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-black text-[#15385E]">
                            12-Month Guaranteed Rate Freeze Certificate Active
                          </h4>
                          <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white px-2 py-0.5 rounded">
                            Verified
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 max-w-xl leading-relaxed">
                          Your periodic storage rate of <strong>${currentUser.paymentPlan.periodicAmount}/month</strong> is contractually frozen. We legally guarantee no consumer price index or arbitrary rate increases for 12 months from your booking date.
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 text-left sm:text-right bg-white p-3.5 px-4 rounded-2xl border border-emerald-200">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Rate Frozen Until</span>
                      <span className="text-sm font-black text-[#15385E] font-mono">
                        {currentUser.orders[0]?.scheduledDeliveryDate ? new Date(new Date(currentUser.orders[0].scheduledDeliveryDate).setFullYear(new Date(currentUser.orders[0].scheduledDeliveryDate).getFullYear() + 1)).toLocaleDateString('en-AU') : 'October 2027'}
                      </span>
                      <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">● 0% Increase Guaranteed</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Document Preview & Print Modal */}
      {activeDocPreview && currentUser && (
        <div className="fixed inset-0 z-60 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border-2 border-[#DAD7D1] flex flex-col max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#15385E]" />
                <h3 className="font-black text-lg text-[#15385E]">
                  {activeDocPreview === 'agreement'
                    ? 'Portabox Mobile Storage Rental Contract'
                    : activeDocPreview === 'insurance'
                    ? 'Transit & Storage Protection Cover Policy'
                    : 'Zero-Tilt Container Loading Best Practice Guide'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveDocPreview(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="py-5 space-y-4 text-xs text-slate-700 leading-relaxed font-sans">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-[#15385E]">Customer: {currentUser.firstName} {currentUser.lastName}</div>
                  <div className="text-[11px] text-slate-500">Account #{currentUser.id} · Order #{activeOrder?.orderNumber || 'PBO-9841'}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-[#15385E]">Date: {new Date().toLocaleDateString('en-AU')}</div>
                  <div className="text-[11px] text-emerald-600 font-bold">STATUS: ACTIVE &amp; VERIFIED</div>
                </div>
              </div>

              {activeDocPreview === 'agreement' && (
                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-[#15385E]">Key Contract Terms:</h4>
                  <ul className="list-disc pl-5 space-y-1.5">
                    <li><strong>Horizontal Level-Lift Guarantee:</strong> Containers are transported and delivered strictly flat (zero tilt) via specialized hydraulic level-lift vehicles.</li>
                    <li><strong>Container Capacity:</strong> Australia's largest containers (up to 25 m³ per container unit), weatherproof steel frame construction with twin high-security lockbox shrouds.</li>
                    <li><strong>Placement &amp; Ground Care:</strong> High-density poly ground pads provided to protect concrete, pavers, and bitumen surfaces from scratches or indentations.</li>
                    <li><strong>Flexible Storage Hire:</strong> Pack at your own pace on your driveway, or request depot collection for storage in our climate-regulated facility.</li>
                  </ul>
                </div>
              )}

              {activeDocPreview === 'insurance' && (
                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-[#15385E]">Complimentary $100,000 Goods Protection Cover:</h4>
                  <p>
                    Portabox provides $100,000 complimentary goods transit and facility storage protection cover against fire, collision, overturn, storm, and depot burglary.
                  </p>
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 font-medium text-[11px]">
                    Policy Ref: PBX-INS-2026-9921 · Underwritten by Leading Australian Marine &amp; Transit Insurers · Zero Deductible on Level-Lift Transit Claims.
                  </div>
                </div>
              )}

              {activeDocPreview === 'guide' && (
                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-[#15385E]">Zero-Tilt Loading Best Practices:</h4>
                  <ul className="list-decimal pl-5 space-y-1.5">
                    <li><strong>Base Layer (Heaviest Items):</strong> Place washing machines, dryers, flat-packed tables, and heavy toolboxes on the container floor.</li>
                    <li><strong>Middle Layer (Appliances &amp; Furniture):</strong> Place lounge suites, dining chairs, and upright mattresses against container perimeter tie-down rails.</li>
                    <li><strong>Top Layer (Moving Cartons):</strong> Stack lighter linen cartons, pillows, and clothing boxes on top of solid furniture.</li>
                    <li><strong>Secure with Straps:</strong> Use internal perimeter D-rings with ratchet straps every 1.5 meters of packing depth.</li>
                  </ul>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveDocPreview(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-[#15385E] hover:bg-[#112F4F] text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer className="w-4 h-4 text-[#F7D347]" />
                <span>Print Document</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {activeBookingQuote && (
        <BookingDecisionModal
          isOpen={isBookingModalOpen}
          onClose={() => {
            setIsBookingModalOpen(false);
            setActiveBookingQuote(null);
          }}
          quote={activeBookingQuote}
          customerData={currentUser ? {
            firstName: currentUser.firstName,
            lastName: currentUser.lastName,
            mobile: currentUser.mobile,
            email: currentUser.email,
          } as any : null}
          onBookingComplete={() => {
            setIsBookingModalOpen(false);
            setActiveBookingQuote(null);
            const updated = loadCustomerAccounts().find((a) => a.id === currentUser?.id);
            if (updated) {
              setCurrentUser({ ...updated });
              setCurrentUserSession({ ...updated });
            }
            setActiveTab('orders');
          }}
        />
      )}

      <AfterHoursTextModal
        isOpen={isAfterHoursModalOpen}
        onClose={() => setIsAfterHoursModalOpen(false)}
        defaultCustomerName={currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : ''}
        defaultCustomerMobile={currentUser?.mobile || ''}
        source="CustomerPortal"
      />
    </div>
  );
};
