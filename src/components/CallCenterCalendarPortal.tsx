import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Truck,
  Plus,
  Trash2,
  MoveRight,
  TrendingDown,
  Navigation,
  Compass,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Printer,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
  X,
  RefreshCw,
  Phone,
  Layers,
  ArrowRight,
  Zap,
  Send,
  MessageSquare,
  Check,
  FileSpreadsheet,
} from 'lucide-react';
import {
  RouteStop,
  OptimizedDailyRoute,
  SlotEfficiencyRecommendation,
  Smart48HourChangeSuggestion,
  Smart48HourOptimizationSummary,
  loadScheduledDeliveries,
  saveScheduledDeliveries,
  optimizeDailyRoute,
  suggestEfficientSlotForAddress,
  generate48HourOptimizationSuggestions,
  apply48HourSuggestion,
  applyAll48HourSuggestions,
  DEPOT_COORDINATES,
  calculateDistanceKm,
  GOOGLE_MAPS_API_KEY,
} from '../services/routingOptimizationService';
import { MetroHub, DeliverySlotWindow } from '../types/quote';
import { loadAppConfig, saveAppConfig, loadCustomerLeads } from '../services/pricingEngine';
import { updateSmartsheetBookingRowTwoWay } from '../services/smartsheetService';
import { SmartsheetWorkspace } from './SmartsheetWorkspace';
import { AdminPhoneIntakeDrawer } from './admin/AdminPhoneIntakeDrawer';
import { AdminCopilotChat } from './admin/AdminCopilotChat';

interface CallCenterCalendarPortalProps {
  onClose: () => void;
  onApplyCustomerIncentive?: (slot: string, discount: number) => void;
  onOpenCustomerPortal?: () => void;
}

const TIME_SLOTS = [
  '09:00 AM – 11:30 AM',
  '11:30 AM – 02:00 PM',
  '02:00 PM – 04:30 PM',
  '04:30 PM – 07:00 PM',
];

const DEPOTS_LIST: MetroHub[] = [
  'Adelaide',
  'Melbourne',
  'Sydney',
  'Brisbane',
];

export const CallCenterCalendarPortal: React.FC<CallCenterCalendarPortalProps> = ({
  onClose,
  onApplyCustomerIncentive,
  onOpenCustomerPortal,
}) => {
  const [selectedDepot, setSelectedDepot] = useState<MetroHub>('Adelaide');
  const [activeTab, setActiveTab] = useState<'calendar' | 'smartsheet' | 'smart_48h' | 'optimizer' | 'driver_sheet' | 'smart_booking'>('calendar');
  const [scheduledDeliveries, setScheduledDeliveries] = useState<RouteStop[]>(loadScheduledDeliveries());

  React.useEffect(() => {
    const handleSync = () => {
      setScheduledDeliveries(loadScheduledDeliveries());
    };
    window.addEventListener('portabox-smartsheet-sync', handleSync);
    return () => window.removeEventListener('portabox-smartsheet-sync', handleSync);
  }, []);
  const [hasTrailerAttached, setHasTrailerAttached] = useState<boolean>(true);
  const [enableChaining, setEnableChaining] = useState<boolean>(true);
  const [optimizationMode, setOptimizationMode] = useState<'day' | 'week'>('day');

  // Calendar Date Navigation
  const [currentDateStr, setCurrentDateStr] = useState<string>('Thursday, 02 Oct 2026');

  // Add Delivery Modal State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newCustomerName, setNewCustomerName] = useState<string>('');
  const [newCustomerPhone, setNewCustomerPhone] = useState<string>('04');
  const [newAddress, setNewAddress] = useState<string>('');
  const [newSuburb, setNewSuburb] = useState<string>('Norwood');
  const [newPostcode, setNewPostcode] = useState<string>('5067');
  const [newContainerSize, setNewContainerSize] = useState<string>('25 m³');
  const [newAction, setNewAction] = useState<RouteStop['action']>('dropoff_full');
  const [newSlot, setNewSlot] = useState<string>('09:00 AM – 11:30 AM');
  const [newNotes, setNewNotes] = useState<string>('');

  // Move Slot State
  const [movingStopId, setMovingStopId] = useState<string | null>(null);

  const appConfig = useMemo(() => loadAppConfig(), []);
  const effPct = appConfig.efficiencyDiscountPercentage ?? 20;
  const ecoIncentiveType = appConfig.ecoIncentiveType || 'dollar_discount';

  // Call Center Smart Booking Assistant State
  const [lookupAddress, setLookupAddress] = useState<string>('42 Osmond Terrace, Norwood SA 5067');
  const [lookupPostcode, setLookupPostcode] = useState<string>('5067');
  const [lookupContainerSize, setLookupContainerSize] = useState<string>('25 m³');
  const [smartRecommendation, setSmartRecommendation] = useState<SlotEfficiencyRecommendation | null>(
    () => suggestEfficientSlotForAddress('42 Osmond Terrace, Norwood SA 5067', '5067', -34.925, 138.615, effPct, ecoIncentiveType)
  );

  // 48-Hour Smart Routing Optimizer Modal & Drawer State
  const [show48HourOptimizer, setShow48HourOptimizer] = useState<boolean>(false);
  const [smsModalSuggestion, setSmsModalSuggestion] = useState<Smart48HourChangeSuggestion | null>(null);
  const [smsSentNotice, setSmsSentNotice] = useState<string | null>(null);

  // Feedback Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Call Center Phone Booking Intake & AI Copilot Chatbot
  const [isPhoneIntakeOpen, setIsPhoneIntakeOpen] = useState<boolean>(false);
  const [phoneIntakeInitialNoPhoneOrEmail, setPhoneIntakeInitialNoPhoneOrEmail] = useState<boolean>(true);
  const [isCopilotOpen, setIsCopilotOpen] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Run Optimization Calculation
  const optimizedRoute: OptimizedDailyRoute = useMemo(() => {
    return optimizeDailyRoute({
      date: currentDateStr,
      depotHub: selectedDepot,
      stops: scheduledDeliveries,
      useTrailer: hasTrailerAttached,
      enableChaining: enableChaining,
    });
  }, [currentDateStr, selectedDepot, scheduledDeliveries, hasTrailerAttached, enableChaining]);

  // Compute 48-Hour Optimization Suggestions
  const smart48Summary: Smart48HourOptimizationSummary = useMemo(() => {
    return generate48HourOptimizationSuggestions(scheduledDeliveries, selectedDepot);
  }, [scheduledDeliveries, selectedDepot]);

  const handleApplySingleSuggestion = (suggestionId: string) => {
    const sugg = smart48Summary.suggestions.find((s) => s.id === suggestionId);
    const updated = apply48HourSuggestion(scheduledDeliveries, suggestionId);
    setScheduledDeliveries(updated);
    if (sugg) {
      updateSmartsheetBookingRowTwoWay(
        sugg.orderNumber,
        {
          deliveryWindow: sugg.suggestedSlot,
          scheduledDeliveryDate: sugg.suggestedDay,
        },
        `Call Center applied 48h Smart Route optimization for #${sugg.orderNumber}: moved to ${sugg.suggestedDay} (${sugg.suggestedSlot}). Synced to Smartsheet & Customer Portal.`
      );
    }
    showToast('✓ 48-Hour Smart routing change applied! Calendar, Smartsheet & Customer Portal updated.');
  };

  const handleApplyAll48HourSuggestions = () => {
    const updated = applyAll48HourSuggestions(scheduledDeliveries, smart48Summary.suggestions);
    setScheduledDeliveries(updated);
    smart48Summary.suggestions.forEach((sugg) => {
      updateSmartsheetBookingRowTwoWay(
        sugg.orderNumber,
        {
          deliveryWindow: sugg.suggestedSlot,
          scheduledDeliveryDate: sugg.suggestedDay,
        },
        `Call Center batch-applied 48h Smart Route optimization for #${sugg.orderNumber} (${sugg.suggestedSlot}).`
      );
    });
    showToast(`✓ All ${smart48Summary.suggestions.length} 48-hour routing optimizations applied & synced to Smartsheet and Customer Portal!`);
    setShow48HourOptimizer(false);
  };

  const handleSendCustomerSMS = (sugg: Smart48HourChangeSuggestion) => {
    setSmsSentNotice(`SMS sent to ${sugg.customerName} (${sugg.customerPhone}): "Hi ${sugg.customerName.split(' ')[0]}, Portabox can offer an instant $${sugg.customerIncentiveDiscountAud} discount if you switch your delivery to ${sugg.suggestedDay} ${sugg.suggestedSlot}. Reply YES to confirm."`);
    setTimeout(() => {
      setSmsSentNotice(null);
      setSmsModalSuggestion(null);
    }, 4500);
  };

  // Handle Smart Booking lookup
  const handleRunLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const rec = suggestEfficientSlotForAddress(lookupAddress, lookupPostcode, -34.925, 138.615, effPct, ecoIncentiveType);
    setSmartRecommendation(rec);
    showToast(`Calculated optimal route slot: ${rec.recommendedSlotLabel} (Saves $${rec.grossLogisticsSavingsAud} in logistics)`);
  };

  // 1-Click Book Smart Slot
  const handleBookSuggestedSlot = () => {
    if (!smartRecommendation) return;
    const newStop: RouteStop = {
      id: `stop-${Date.now()}`,
      orderNumber: `PBO-${Math.floor(1000 + Math.random() * 9000)}`,
      customerName: 'Call Center New Order',
      customerPhone: '0418 000 999',
      address: lookupAddress.split(',')[0] || lookupAddress,
      suburb: 'Norwood',
      postcode: lookupPostcode,
      lat: -34.922,
      lng: 138.632,
      action: 'dropoff_full',
      containerId: `PB-BOX-${lookupContainerSize.slice(0, 2)}-${Math.floor(100 + Math.random() * 899)}`,
      containerSize: lookupContainerSize,
      preferredSlot: smartRecommendation.recommendedSlotLabel,
      serviceDurationMins: 30,
      isTrailerSlot: smartRecommendation.trailerEligible && hasTrailerAttached,
      notes: `Booked via Call Center Smart Routing Assistant (Clustered with ${smartRecommendation.clustersWithOrder || 'Depot Run'})`,
    };

    const updated = [...scheduledDeliveries, newStop];
    setScheduledDeliveries(updated);
    saveScheduledDeliveries(updated);
    if (onApplyCustomerIncentive) {
      onApplyCustomerIncentive(smartRecommendation.recommendedSlotId, smartRecommendation.customerDiscountAud);
    }
    showToast(`✓ Order booked into ${smartRecommendation.recommendedSlotLabel}! Customer awarded ${ecoIncentiveType === 'dollar_discount' ? `$${smartRecommendation.customerDiscountAud} (${effPct}% efficiency incentive)` : 'Eco route emissions reduction'}.`);
    setActiveTab('calendar');
  };

  // Add Delivery to Calendar
  const handleAddDelivery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName || !newAddress) return;

    const newStop: RouteStop = {
      id: `stop-${Date.now()}`,
      orderNumber: `PBO-${Math.floor(1000 + Math.random() * 9000)}`,
      customerName: newCustomerName,
      customerPhone: newCustomerPhone,
      address: newAddress,
      suburb: newSuburb,
      postcode: newPostcode,
      lat: -34.93 + (Math.random() - 0.5) * 0.05,
      lng: 138.61 + (Math.random() - 0.5) * 0.05,
      action: newAction,
      containerId: `PB-BOX-25-${Math.floor(100 + Math.random() * 900)}`,
      containerSize: newContainerSize,
      preferredSlot: newSlot,
      serviceDurationMins: 30,
      isTrailerSlot: hasTrailerAttached && scheduledDeliveries.length % 2 === 1,
      notes: newNotes,
    };

    const updated = [...scheduledDeliveries, newStop];
    setScheduledDeliveries(updated);
    saveScheduledDeliveries(updated);
    setShowAddModal(false);
    showToast(`✓ Order #${newStop.orderNumber} scheduled for ${newSlot}`);
  };

  // Remove Delivery
  const handleRemoveDelivery = (id: string) => {
    const updated = scheduledDeliveries.filter((s) => s.id !== id);
    setScheduledDeliveries(updated);
    saveScheduledDeliveries(updated);
    showToast('Delivery removed from schedule.');
  };

  // Move Delivery to Different Slot & sync two-way with Smartsheet & Customer Portal
  const handleMoveSlot = (stopId: string, newSlotVal: string) => {
    let movedOrderNumber = '';
    const updated = scheduledDeliveries.map((s) => {
      if (s.id === stopId) {
        movedOrderNumber = s.orderNumber;
        return { ...s, preferredSlot: newSlotVal };
      }
      return s;
    });
    setScheduledDeliveries(updated);
    saveScheduledDeliveries(updated);
    if (movedOrderNumber) {
      updateSmartsheetBookingRowTwoWay(
        movedOrderNumber,
        { deliveryWindow: newSlotVal },
        `Call Center shifted Order #${movedOrderNumber} delivery window to ${newSlotVal} (Synced to Smartsheet & Customer Portal)`
      );
    }
    setMovingStopId(null);
    showToast(`Delivery shifted to ${newSlotVal} & synced to Smartsheet + Customer Portal`);
  };

  return (
    <div className="bg-white w-full flex-1 flex flex-col min-h-screen overflow-hidden animate-in fade-in duration-200">
      {/* Top Banner & Header */}
      <div className="bg-[#0b2942] text-white p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider bg-[#00c0f3] text-white px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                CALL CENTER GOOGLE CALENDAR & LOGISTICS DISPATCH
              </span>
              <span className="text-xs text-sky-200 font-bold flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-[#00c0f3]" />
                Trailer Attached (Dual-Container Capacity Active)
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Portabox Call Center Dispatch & Routing Optimizer
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl mt-0.5">
              Live Google Calendar view for container deliveries, Google Maps route optimization, trailer capacity gains, and customer 20% efficiency discount booking.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Depot Selector */}
            <select
              value={selectedDepot}
              onChange={(e) => setSelectedDepot(e.target.value as MetroHub)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 text-white border border-slate-700 text-xs font-bold cursor-pointer focus:ring-2 focus:ring-[#00c0f3]"
            >
              {DEPOTS_LIST.map((d) => (
                <option key={d} value={d}>
                  {d} Depot
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => {
                setShow48HourOptimizer(true);
                setActiveTab('smart_48h');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-md hover:shadow-lg active:scale-98"
              title="Suggest optimal changes across a 48-hour period"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>Smart Routing Optimizer (48h)</span>
              {smart48Summary.suggestions.length > 0 && (
                <span className="bg-white text-amber-800 text-[10px] font-black px-1.5 py-0.5 rounded-full shadow-2xs">
                  {smart48Summary.suggestions.length}
                </span>
              )}
            </button>

            {/* 15% Inbound Call Phone Intake (Fill Form, Email, SMS, or Portal Quote) */}
            <button
              type="button"
              onClick={() => {
                setPhoneIntakeInitialNoPhoneOrEmail(false);
                setIsPhoneIntakeOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-sky-500 to-[#00c0f3] hover:from-sky-600 hover:to-[#00a6d2] text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-md hover:shadow-lg active:scale-98"
              title="15% Call-In Intake: Agent fills the form for caller on the phone and sends quote via Email, SMS, or Customer Portal"
            >
              <Phone className="w-4 h-4 text-white" />
              <span>15% Call-In (Email/SMS/Portal)</span>
            </button>

            {/* Call Center Phone Booking (Credit Card Only - No Phone/Email option) */}
            <button
              type="button"
              onClick={() => {
                setPhoneIntakeInitialNoPhoneOrEmail(true);
                setIsPhoneIntakeOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#F7D347] hover:bg-[#ebd034] text-slate-950 rounded-xl text-xs font-black transition-all cursor-pointer shadow-md hover:shadow-lg active:scale-98"
              title="Make phone booking with credit card (option for callers without mobile phone or email, produce printable quote)"
            >
              <Phone className="w-4 h-4 text-slate-900" />
              <span>Phone Booking (Credit Card)</span>
            </button>

            {/* AI Operations Copilot for Call Center */}
            <button
              type="button"
              onClick={() => setIsCopilotOpen(!isCopilotOpen)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-md hover:shadow-lg active:scale-98"
              title="Open Call Center AI Operations Copilot"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>AI Copilot</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#00c0f3] hover:bg-[#00a7d4] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule Delivery</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Close Console
            </button>
          </div>
        </div>

        {/* Global Logistics Quick Indicators */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-700/60 text-xs">
          <div className="p-3 rounded-2xl bg-white/10 border border-white/10 space-y-0.5">
            <span className="text-[10px] text-sky-200 uppercase font-bold tracking-wider">Scheduled Today</span>
            <div className="text-xl font-black text-white">{scheduledDeliveries.length} Containers</div>
            <span className="text-[10px] text-slate-300">{hasTrailerAttached ? 'Truck + Trailer Convoy' : 'Solo Truck Run'}</span>
          </div>

          <div className="p-3 rounded-2xl bg-white/10 border border-white/10 space-y-0.5">
            <span className="text-[10px] text-sky-200 uppercase font-bold tracking-wider">Total Route Distance</span>
            <div className="text-xl font-black text-white font-mono">{optimizedRoute.totalDistanceKm} km</div>
            <span className="text-[10px] text-emerald-400 font-bold">Saved {Math.round(scheduledDeliveries.length * 32 - optimizedRoute.totalDistanceKm)} km deadhead</span>
          </div>

          <div className="p-3 rounded-2xl bg-white/10 border border-white/10 space-y-0.5">
            <span className="text-[10px] text-sky-200 uppercase font-bold tracking-wider">Driver Shift Time</span>
            <div className="text-xl font-black text-white font-mono">{optimizedRoute.totalShiftHours} hrs</div>
            <span className="text-[10px] text-emerald-400 font-bold">
              {optimizedRoute.overtimeHours === 0 ? '✓ Zero Overtime (Under 8h)' : `${optimizedRoute.overtimeHours}h Overtime`}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-white/10 border border-white/10 space-y-0.5">
            <span className="text-[10px] text-sky-200 uppercase font-bold tracking-wider">Logistics Savings Pool</span>
            <div className="text-xl font-black text-[#00c0f3] font-mono">${optimizedRoute.efficiencySavingsPoolAud}</div>
            <span className="text-[10px] text-amber-300 font-bold">${optimizedRoute.customerIncentivePoolAud} (20% Customer Pool)</span>
          </div>
        </div>
      </div>

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="bg-emerald-50 border-b border-emerald-200 p-3.5 text-xs font-bold text-emerald-800 flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button type="button" onClick={() => setToastMessage(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Tabs Navigation */}
      <div className="bg-slate-100/90 px-6 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('calendar')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'calendar' ? 'bg-white text-[#00c0f3] shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5 text-[#00c0f3]" />
            <span>Google Calendar Dispatch View ({scheduledDeliveries.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('smartsheet')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'smartsheet'
                ? 'bg-[#0b2942] text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#00c0f3]" />
            <span>Two-Way Smartsheets (Bookings, Billing &amp; Portal)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('smart_48h')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'smart_48h' ? 'bg-white text-amber-700 shadow-xs ring-1 ring-amber-300' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>Smart Routing (48h Changes: {smart48Summary.suggestions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('smart_booking')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'smart_booking' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Smart Slot Assistant & 20% Incentive</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('optimizer')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'optimizer' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-indigo-600" />
            <span>Google Maps Route Optimizer</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('driver_sheet')}
            className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'driver_sheet' ? 'bg-white text-[#0b2942] shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Driver Daily Routing Sheet</span>
          </button>
        </div>

        {/* Trailer & Chaining Controls */}
        <div className="flex items-center gap-4 text-xs">
          <label className="flex items-center gap-2 cursor-pointer select-none font-bold text-slate-700">
            <input
              type="checkbox"
              checked={hasTrailerAttached}
              onChange={(e) => setHasTrailerAttached(e.target.checked)}
              className="w-4 h-4 rounded text-[#00c0f3] focus:ring-[#00c0f3]"
            />
            <span className="flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-[#00c0f3]" />
              Attach Trailer (+1 Container)
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none font-bold text-slate-700">
            <input
              type="checkbox"
              checked={enableChaining}
              onChange={(e) => setEnableChaining(e.target.checked)}
              className="w-4 h-4 rounded text-[#00c0f3] focus:ring-[#00c0f3]"
            />
            <span>Chain Empty Pickups</span>
          </label>
        </div>
      </div>

      <div className="p-6 sm:p-8 space-y-6">
        {/* ================= TAB 1: GOOGLE CALENDAR DISPATCH VIEW ================= */}
        {activeTab === 'calendar' && (
          <div className="space-y-6">
            {/* Calendar Controls & Date Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setCurrentDateStr('Wednesday, 01 Oct 2026')}
                    className="p-1.5 hover:bg-white rounded-lg text-slate-700 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 text-xs font-extrabold text-[#0b2942]">{currentDateStr}</span>
                  <button
                    type="button"
                    onClick={() => setCurrentDateStr('Friday, 03 Oct 2026')}
                    className="p-1.5 hover:bg-white rounded-lg text-slate-700 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <span className="text-xs text-slate-500 font-medium">
                  Depot: <strong>{selectedDepot} Depot ({DEPOT_COORDINATES[selectedDepot].address})</strong>
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Drop Off Full
                </span>
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 font-bold border border-amber-200">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Pick Up Empty
                </span>
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-800 font-bold border border-indigo-200">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  Chained Direct Move
                </span>
              </div>
            </div>

            {/* Smart Routing 48-Hour Efficiency Banner in Calendar */}
            {smart48Summary.suggestions.length > 0 && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Zap className="w-4 h-4 fill-white" />
                  </div>
                  <div>
                    <span className="font-extrabold text-[#0b2942] block">
                      Smart Routing Notice: {smart48Summary.suggestions.length} route optimizations detected in next 48 hours!
                    </span>
                    <span className="text-slate-600 text-[11px]">
                      Applying these changes saves <strong>{smart48Summary.totalKmSaved} km</strong>, cuts <strong>{smart48Summary.totalDriveHoursSaved} hrs</strong> of transit, and saves <strong>${smart48Summary.totalFuelWearSavedAud} AUD</strong> in fleet fuel & wear.
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveTab('smart_48h')}
                    className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold cursor-pointer transition-colors shadow-xs text-xs flex items-center gap-1"
                  >
                    <span>View 48h Suggested Changes</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyAll48HourSuggestions}
                    className="px-3.5 py-1.5 bg-[#0b2942] hover:bg-[#081e30] text-white rounded-xl font-bold cursor-pointer transition-colors shadow-xs text-xs"
                  >
                    Apply All
                  </button>
                </div>
              </div>
            )}

            {/* Time Slots Grid (Google Calendar Format) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {TIME_SLOTS.map((slotLabel) => {
                const stopsInSlot = scheduledDeliveries.filter((s) => s.preferredSlot === slotLabel);
                const isMorning = slotLabel.includes('09:00');

                return (
                  <div
                    key={slotLabel}
                    className="bg-slate-50 rounded-3xl p-4 border border-slate-200/80 flex flex-col min-h-[380px]"
                  >
                    {/* Slot Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-black text-[#0b2942]">
                          <Clock className="w-3.5 h-3.5 text-[#00c0f3]" />
                          <span>{slotLabel}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold block">
                          2.5h Operational Window
                        </span>
                      </div>
                      <span className="font-mono text-xs font-bold bg-white px-2 py-0.5 rounded-md border border-slate-200 text-slate-600">
                        {stopsInSlot.length}
                      </span>
                    </div>

                    {/* Deliveries list in slot */}
                    <div className="space-y-3 flex-1 overflow-y-auto">
                      {stopsInSlot.length === 0 ? (
                        <div className="h-40 flex flex-col items-center justify-center text-center p-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
                          <p>No deliveries in this window.</p>
                          <span className="text-[10px] text-emerald-600 font-bold mt-1">
                            Available for dispatch booking
                          </span>
                        </div>
                      ) : (
                        stopsInSlot.map((stop, idx) => (
                          <div
                            key={stop.id}
                            className={`p-3.5 rounded-2xl border transition-all text-xs space-y-2 bg-white shadow-2xs hover:shadow-sm ${
                              stop.action === 'dropoff_full'
                                ? 'border-emerald-200'
                                : stop.action === 'pickup_empty'
                                ? 'border-amber-200'
                                : 'border-indigo-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-[11px] bg-slate-100 text-[#0b2942] px-2 py-0.5 rounded">
                                {stop.orderNumber}
                              </span>
                              <span
                                className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                  stop.action === 'dropoff_full'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : stop.action === 'pickup_empty'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-indigo-100 text-indigo-800'
                                }`}
                              >
                                {stop.action.replace('_', ' ')}
                              </span>
                            </div>

                            <div>
                              <div className="font-extrabold text-[#0b2942]">{stop.customerName}</div>
                              <div className="text-[11px] text-slate-500">{stop.address}, {stop.suburb}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{stop.customerPhone}</div>
                            </div>

                            <div className="p-2 bg-slate-50 rounded-xl flex items-center justify-between text-[11px]">
                              <span className="font-mono font-bold text-[#0b2942]">{stop.containerId}</span>
                              <span className="text-slate-500 font-semibold">{stop.containerSize}</span>
                            </div>

                            {/* Trailer allocation tag */}
                            {stop.isTrailerSlot && (
                              <div className="text-[10px] font-bold text-sky-800 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded flex items-center gap-1">
                                <Truck className="w-3 h-3 text-[#00c0f3]" />
                                <span>Trailer Deck Loaded (Trailer #T-01)</span>
                              </div>
                            )}

                            {/* Action Bar: Move Slot or Remove */}
                            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                              {movingStopId === stop.id ? (
                                <div className="space-y-1 w-full">
                                  <label className="block text-[10px] font-bold text-slate-500">Move to:</label>
                                  <select
                                    onChange={(e) => handleMoveSlot(stop.id, e.target.value)}
                                    defaultValue={stop.preferredSlot}
                                    className="w-full text-xs font-bold p-1 rounded-lg border border-slate-200 bg-white"
                                  >
                                    {TIME_SLOTS.map((s) => (
                                      <option key={s} value={s}>
                                        {s}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setMovingStopId(stop.id)}
                                    className="text-slate-500 hover:text-[#00c0f3] font-bold flex items-center gap-1 cursor-pointer"
                                  >
                                    <MoveRight className="w-3 h-3" />
                                    <span>Move Slot</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveDelivery(stop.id)}
                                    className="text-red-500 hover:text-red-700 cursor-pointer p-1"
                                    title="Cancel Delivery"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= TAB: 48-HOUR SMART ROUTING OPTIMIZER ================= */}
        {activeTab === 'smart_48h' && (
          <div className="space-y-6">
            {/* 48-Hour Optimization Master Header */}
            <div className="bg-gradient-to-r from-[#0b2942] via-[#0d3b61] to-[#005180] text-white p-6 sm:p-8 rounded-3xl space-y-4 shadow-md">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-2xs">
                      <Zap className="w-3 h-3 fill-white" />
                      48-HOUR FLEET EFFICIENCY ENGINE
                    </span>
                    <span className="text-xs text-sky-200 font-bold">
                      Depot: {selectedDepot} ({DEPOT_COORDINATES[selectedDepot].address})
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black">
                    Smart Routing Optimizer · 48-Hour Order Rescheduling
                  </h3>
                  <p className="text-xs text-slate-300 max-w-3xl leading-relaxed mt-1">
                    Evaluates all bookings across Today and Tomorrow to recommend schedule changes that eliminate deadheading, pair orders on truck trailers for dual-container dispatch, chain empty container pickups directly to nearby drop-offs, and prevent driver overtime.
                  </p>
                </div>

                <div className="shrink-0">
                  {smart48Summary.suggestions.length > 0 ? (
                    <button
                      type="button"
                      onClick={handleApplyAll48HourSuggestions}
                      className="px-5 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-black rounded-2xl transition-all cursor-pointer shadow-lg hover:shadow-xl active:scale-98 flex items-center gap-2"
                    >
                      <Zap className="w-4 h-4 fill-white" />
                      <span>Apply All {smart48Summary.suggestions.length} 48-Hour Changes</span>
                    </button>
                  ) : (
                    <div className="px-4 py-2 bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold rounded-xl flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>48-Hour Route at Maximum Efficiency</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 48-Hour Optimization Financial & Efficiency Audit Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-4 border-t border-white/10 text-xs">
                <div className="p-3 rounded-2xl bg-white/10 border border-white/10 space-y-0.5">
                  <span className="text-[10px] text-amber-200 uppercase font-bold tracking-wider">Distance Reduction</span>
                  <div className="text-xl font-black text-white font-mono">{smart48Summary.totalKmSaved} km</div>
                  <span className="text-[10px] text-emerald-300 font-bold">Deadhead eliminated</span>
                </div>

                <div className="p-3 rounded-2xl bg-white/10 border border-white/10 space-y-0.5">
                  <span className="text-[10px] text-amber-200 uppercase font-bold tracking-wider">Drive Time Saved</span>
                  <div className="text-xl font-black text-white font-mono">{smart48Summary.totalDriveHoursSaved} hrs</div>
                  <span className="text-[10px] text-emerald-300 font-bold">Overtime avoided</span>
                </div>

                <div className="p-3 rounded-2xl bg-white/10 border border-white/10 space-y-0.5">
                  <span className="text-[10px] text-amber-200 uppercase font-bold tracking-wider">Fleet Operating Savings</span>
                  <div className="text-xl font-black text-emerald-400 font-mono">${smart48Summary.totalFuelWearSavedAud} AUD</div>
                  <span className="text-[10px] text-slate-300">Fuel & vehicle wear</span>
                </div>

                <div className="p-3 rounded-2xl bg-white/10 border border-white/10 space-y-0.5">
                  <span className="text-[10px] text-amber-200 uppercase font-bold tracking-wider">Customer Incentive Pool</span>
                  <div className="text-xl font-black text-[#00c0f3] font-mono">${smart48Summary.totalCustomerIncentivePoolAud} AUD</div>
                  <span className="text-[10px] text-sky-200 font-bold">20% savings incentive</span>
                </div>

                <div className="p-3 rounded-2xl bg-white/10 border border-white/10 space-y-0.5">
                  <span className="text-[10px] text-amber-200 uppercase font-bold tracking-wider">Trailer & Chaining</span>
                  <div className="text-xl font-black text-white font-mono">
                    {smart48Summary.trailerOpportunitiesFound + smart48Summary.chainedMoveOpportunitiesFound} Runs
                  </div>
                  <span className="text-[10px] text-amber-300 font-bold">Dual-container active</span>
                </div>
              </div>
            </div>

            {/* List of 48-Hour Suggested Schedule Changes */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h4 className="text-sm font-black text-[#0b2942] flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span>Suggested Schedule Changes across 48-Hour Period ({smart48Summary.suggestions.length})</span>
                </h4>
                <span className="text-xs text-slate-500">
                  Click 'Accept & Apply' to immediately update the calendar and driver manifest.
                </span>
              </div>

              {smart48Summary.suggestions.length === 0 ? (
                <div className="p-12 text-center bg-emerald-50/60 rounded-3xl border border-emerald-200 space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                  <h4 className="font-extrabold text-[#0b2942] text-base">All Orders Perfectly Optimized!</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    There are no deadhead detours, scheduling conflicts, or trailer inefficiencies across the 48-hour planning horizon.
                  </p>
                </div>
              ) : (
                smart48Summary.suggestions.map((sugg) => (
                  <div
                    key={sugg.id}
                    className="p-5 sm:p-6 bg-white rounded-3xl border border-slate-200 hover:border-amber-300 transition-all shadow-xs hover:shadow-md space-y-4"
                  >
                    {/* Suggestion Top Badge & Category */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1.5 ${
                            sugg.actionType === 'enable_trailer_dual'
                              ? 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                              : sugg.actionType === 'shift_day_cluster'
                              ? 'bg-blue-100 text-blue-900 border border-blue-200'
                              : sugg.actionType === 'enable_chaining'
                              ? 'bg-purple-100 text-purple-900 border border-purple-200'
                              : 'bg-amber-100 text-amber-900 border border-amber-200'
                          }`}
                        >
                          {sugg.actionType === 'enable_trailer_dual' && <Truck className="w-3.5 h-3.5 text-indigo-700" />}
                          {sugg.actionType === 'shift_day_cluster' && <Compass className="w-3.5 h-3.5 text-blue-700" />}
                          {sugg.actionType === 'enable_chaining' && <Layers className="w-3.5 h-3.5 text-purple-700" />}
                          {sugg.actionType === 'traffic_rush_mitigation' && <Clock className="w-3.5 h-3.5 text-amber-700" />}
                          <span>{sugg.actionTitle}</span>
                        </span>

                        <span className="font-mono text-xs font-bold bg-slate-100 px-2 py-0.5 rounded text-[#0b2942]">
                          Order #{sugg.orderNumber}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs">
                        <span className="font-extrabold text-emerald-700 font-mono">
                          +${sugg.costSavingsAud} AUD Savings
                        </span>
                        <span className="text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                          Offer -${sugg.customerIncentiveDiscountAud} AUD Customer Incentive
                        </span>
                      </div>
                    </div>

                    {/* Customer & Slot Comparison Bar */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                      {/* Customer Info */}
                      <div className="md:col-span-4 space-y-0.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Customer & Site</span>
                        <div className="font-extrabold text-sm text-[#0b2942]">{sugg.customerName}</div>
                        <div className="text-xs text-slate-600">{sugg.address}, {sugg.suburb}</div>
                        <div className="text-[11px] font-mono text-slate-400">{sugg.customerPhone} · {sugg.containerId} ({sugg.containerSize})</div>
                      </div>

                      {/* Current vs Suggested Slot */}
                      <div className="md:col-span-8 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
                        {/* Current Timing */}
                        <div className="text-left w-full sm:w-auto">
                          <span className="text-[10px] font-bold text-red-600 uppercase block">Current Slot (Sub-optimal)</span>
                          <span className="text-xs font-bold text-slate-700 block">{sugg.currentDay}</span>
                          <span className="text-xs font-mono font-bold text-slate-500">{sugg.currentSlot}</span>
                        </div>

                        {/* Arrow */}
                        <div className="text-amber-500 font-black text-sm flex items-center gap-1">
                          <ArrowRight className="w-5 h-5 text-amber-500" />
                        </div>

                        {/* Suggested Timing */}
                        <div className="text-left sm:text-right w-full sm:w-auto">
                          <span className="text-[10px] font-bold text-emerald-700 uppercase block flex items-center gap-1 sm:justify-end">
                            <Sparkles className="w-3 h-3 text-emerald-600" />
                            <span>Recommended Slot (High Efficiency)</span>
                          </span>
                          <span className="text-xs font-black text-[#0b2942] block">{sugg.suggestedDay}</span>
                          <span className="text-xs font-mono font-black text-[#00c0f3]">{sugg.suggestedSlot}</span>
                          {sugg.usesTrailer && (
                            <span className="text-[10px] font-bold text-sky-800 bg-sky-50 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                              🚚 Trailer Deck (#T-01)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Rationale & Logistics Explanation */}
                    <div className="text-xs text-slate-700 space-y-1.5">
                      <p className="leading-relaxed bg-sky-50/50 p-3 rounded-xl border border-sky-100">
                        <strong>Logistics Rationale:</strong> {sugg.rationale}
                      </p>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] text-slate-600 font-medium">
                        <div><strong>Distance Saved:</strong> -{sugg.distanceSavedKm} km</div>
                        <div><strong>Drive Time Saved:</strong> -{sugg.timeSavedMins} mins</div>
                        <div><strong>Gross Fleet Saving:</strong> +${sugg.costSavingsAud} AUD</div>
                        <div><strong>Vehicle:</strong> {sugg.recommendedTruck}</div>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                      <span className="text-xs text-slate-500">
                        Paired with <strong>{sugg.pairedCustomerName || 'Local Fleet Run'}</strong> ({sugg.pairedSuburb || 'Depot Convoy'})
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSmsModalSuggestion(sugg)}
                          className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-[#00c0f3]" />
                          <span>SMS Customer Incentive (${sugg.customerIncentiveDiscountAud} Off)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleApplySingleSuggestion(sugg.id)}
                          className="px-5 py-2 rounded-xl bg-[#0b2942] hover:bg-[#081e30] text-white text-xs font-black transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                          <span>Accept & Move Order</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 2: SMART CALL CENTER BOOKING ASSISTANT & 20% INCENTIVE ================= */}
        {activeTab === 'smart_booking' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-[#0b2942] to-[#005180] text-white p-6 sm:p-7 rounded-3xl space-y-3">
              <span className="text-[10px] font-black uppercase tracking-wider bg-[#00c0f3] text-white px-2.5 py-0.5 rounded-full inline-block">
                CALL CENTER REVENUE & LOGISTICS ENGINE
              </span>
              <h3 className="text-xl font-black">
                Smart Slot Recommendation & Customer Efficiency Incentive
              </h3>
              <p className="text-xs text-sky-100 max-w-3xl leading-relaxed">
                When a customer calls to book a portable storage box, enter their delivery address below. The engine calculates the optimal delivery window that clusters with existing runs and trailer capacity, providing you with a <strong>20% logistics savings discount</strong> to close the sale on the phone!
              </p>
            </div>

            {/* Address Lookup Form */}
            <form onSubmit={handleRunLookup} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">Customer Delivery Address</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="text"
                      value={lookupAddress}
                      onChange={(e) => setLookupAddress(e.target.value)}
                      placeholder="e.g. 42 Osmond Terrace, Norwood SA 5067"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 font-semibold focus:ring-2 focus:ring-[#00c0f3]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Container Size</label>
                  <select
                    value={lookupContainerSize}
                    onChange={(e) => setLookupContainerSize(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white font-bold"
                  >
                    <option value="10 m³">10 m³ (Studio / Room)</option>
                    <option value="19 m³">19 m³ (1-2 Bedroom)</option>
                    <option value="25 m³">25 m³ (3 Bedroom Standard)</option>
                    <option value="50 m³">50 m³ (2× 25m³ Large Units)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-xs text-slate-500">
                  Target Depot: <strong>{selectedDepot} Depot ({DEPOT_COORDINATES[selectedDepot].address})</strong>
                </span>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#00c0f3] hover:bg-[#00a7d4] text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Analyze Optimal Routing Window</span>
                </button>
              </div>
            </form>

            {/* Smart Recommendation Card */}
            {smartRecommendation && (
              <div className="p-6 bg-emerald-50/70 border-2 border-emerald-300 rounded-3xl space-y-4 animate-in fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-xs">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded">
                        RECOMMENDED BEST VALUE TIME SLOT
                      </span>
                      <h4 className="text-lg font-black text-emerald-950 mt-0.5">
                        {smartRecommendation.recommendedSlotLabel} ({smartRecommendation.date})
                      </h4>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Customer Incentive</span>
                    {ecoIncentiveType === 'dollar_discount' ? (
                      <>
                        <span className="text-3xl font-black text-emerald-700 font-mono">
                          -${smartRecommendation.customerDiscountAud} AUD
                        </span>
                        <span className="text-[10px] font-bold text-emerald-800 block">
                          ({effPct}% of ${smartRecommendation.grossLogisticsSavingsAud} Fleet Savings)
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-2xl font-black text-indigo-700 font-mono">
                          🌱 -27.3 kg CO₂
                        </span>
                        <span className="text-[10px] font-bold text-indigo-800 block">
                          (Emissions Recognition Mode)
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Mathematical Justification Box */}
                <div className="p-4 bg-white rounded-2xl border border-emerald-200 text-xs text-slate-700 space-y-2">
                  <div className="font-extrabold text-[#0b2942] flex items-center gap-2">
                    <Compass className="w-4 h-4 text-emerald-600" />
                    Routing Efficiency Rationale:
                  </div>
                  <p className="leading-relaxed">{smartRecommendation.rationale}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                    <div><strong>Distance Saved:</strong> {smartRecommendation.distanceSavedKm} km</div>
                    <div><strong>Drive Time Saved:</strong> {smartRecommendation.timeSavedMins} mins</div>
                    <div><strong>Gross Fleet Savings:</strong> ${smartRecommendation.grossLogisticsSavingsAud}</div>
                    <div><strong>Trailer Utilization:</strong> Dual Capacity</div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-600">
                    Tell customer: <em>{ecoIncentiveType === 'dollar_discount'
                      ? `"Because we already have our truck in your area during this window, we can apply an instant $${smartRecommendation.customerDiscountAud} efficiency discount today."`
                      : `"Because we already have our level-lift truck in your area during this window, choosing this slot eliminates redundant driving and prevents ~27 kg of CO₂ emissions."`}</em>
                  </span>

                  <button
                    type="button"
                    onClick={handleBookSuggestedSlot}
                    className="px-6 py-3 bg-[#0b2942] hover:bg-[#081e30] text-white text-xs font-black rounded-xl transition-all cursor-pointer shadow-md flex items-center gap-2"
                  >
                    <span>Book {smartRecommendation.recommendedSlotLabel} for Customer</span>
                    <ArrowRight className="w-4 h-4 text-[#00c0f3]" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: GOOGLE MAPS ROUTE OPTIMIZER ================= */}
        {activeTab === 'optimizer' && (
          <div className="space-y-6">
            {/* Route Optimizer Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-[#0b2942]">
                  Google Maps Fleet Routing Optimizer ({selectedDepot} Depot)
                </h3>
                <p className="text-xs text-slate-500">
                  Calculates minimum driving time, traffic delay mitigation, and zero-overtime sequencing.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={optimizedRoute.googleMapsDirectionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-[#00c0f3] hover:bg-[#00a7d4] text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Open in Google Maps Navigation</span>
                  <ExternalLink className="w-3 h-3 opacity-80" />
                </a>
              </div>
            </div>

            {/* Google Map Interactive Visualization */}
            <div className="relative rounded-3xl overflow-hidden border border-slate-200 shadow-sm bg-slate-900 h-96 flex flex-col justify-between p-6">
              {/* Live Google Maps Embed or Polyline Canvas */}
              <iframe
                title="Google Maps Route Embed"
                width="100%"
                height="100%"
                className="absolute inset-0 border-0 opacity-80"
                loading="lazy"
                src={`https://www.google.com/maps/embed/v1/directions?key=${GOOGLE_MAPS_API_KEY}&origin=${encodeURIComponent(
                  optimizedRoute.depotAddress
                )}&destination=${encodeURIComponent(optimizedRoute.depotAddress)}&waypoints=${encodeURIComponent(
                  optimizedRoute.stops.map((s) => s.address + ', ' + s.suburb).join('|')
                )}&mode=driving`}
              />

              {/* Map Floating HUD Control */}
              <div className="relative z-10 bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-slate-200 max-w-md text-xs space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <span className="font-extrabold text-[#0b2942] flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-[#00c0f3]" />
                    Optimized Waypoint Sequence
                  </span>
                  <span className="font-mono font-bold text-slate-500">{optimizedRoute.totalDistanceKm} km Total</span>
                </div>
                <div className="space-y-1 text-[11px] text-slate-700">
                  <div><strong>Depot Start:</strong> {optimizedRoute.depotAddress} (08:00 AM)</div>
                  {optimizedRoute.stops.map((s, idx) => (
                    <div key={s.id} className="flex items-center justify-between">
                      <span>#{idx + 1}. {s.customerName} ({s.suburb})</span>
                      <span className="font-mono text-slate-500">ETA {s.estimatedArrival}</span>
                    </div>
                  ))}
                  <div><strong>Depot Return:</strong> Estimated 02:45 PM</div>
                </div>
              </div>

              {/* Map Legend */}
              <div className="relative z-10 self-end bg-slate-900/90 text-white p-3 rounded-2xl text-[11px] font-bold flex items-center gap-3 backdrop-blur-xs">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" /> Depot</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Drop-off</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Pick-up</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-400" /> Chained Transfer</span>
              </div>
            </div>

            {/* Financial & Logistics Optimization Audit */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Fleet Operating Costs</span>
                <div className="text-xl font-black text-[#0b2942] font-mono">${optimizedRoute.totalOperatingCostAud} AUD</div>
                <div className="text-[11px] text-slate-600 space-y-0.5 pt-1">
                  <div>Diesel Fuel: {optimizedRoute.fuelLitresUsed} L (${optimizedRoute.fuelCostAud})</div>
                  <div>Truck Wear & Tear: ${optimizedRoute.wearAndTearCostAud}</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
                <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider">Logistics Gross Savings</span>
                <div className="text-xl font-black text-emerald-800 font-mono">+${optimizedRoute.efficiencySavingsPoolAud} AUD</div>
                <div className="text-[11px] text-emerald-900 space-y-0.5 pt-1">
                  <div>Chained Direct Moves: {optimizedRoute.chainedMovesCount} stops</div>
                  <div>Trailer Deadhead Elimination: Active</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 space-y-1">
                <span className="text-[10px] text-sky-800 font-bold uppercase tracking-wider">Customer Incentive Budget</span>
                <div className="text-xl font-black text-[#00c0f3] font-mono">${optimizedRoute.customerIncentivePoolAud} AUD</div>
                <div className="text-[11px] text-sky-900 space-y-0.5 pt-1">
                  <div>20% of fleet efficiency savings passed to customers who select optimal windows.</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 4: DRIVER DAILY ROUTING SHEET ================= */}
        {activeTab === 'driver_sheet' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-800 px-2 py-0.5 rounded">
                  PRINTABLE MANIFEST & TABLET VIEW
                </span>
                <h3 className="text-lg font-black text-[#0b2942] mt-1">
                  Daily Driver Routing Sheet · {currentDateStr}
                </h3>
                <p className="text-xs text-slate-500">
                  Assigned to {optimizedRoute.driverName} · Truck {optimizedRoute.truckId} ({optimizedRoute.truckRego})
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Sheet</span>
                </button>

                <a
                  href={optimizedRoute.googleMapsDirectionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-[#00c0f3] hover:bg-[#00a7d4] text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Start Turn-by-Turn GPS</span>
                </a>
              </div>
            </div>

            {/* Manifest Overview Header */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-medium">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Driver</span>
                <strong className="text-slate-800">{optimizedRoute.driverName}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Vehicle Configuration</span>
                <strong className="text-slate-800">
                  {hasTrailerAttached ? 'Truck + Trailer (Dual Capacity)' : 'Single Truck Deck'}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Stops</span>
                <strong className="text-slate-800">{optimizedRoute.stops.length} Customer Stops</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Depot Return</span>
                <strong className="text-slate-800">~02:45 PM (Shift: {optimizedRoute.totalShiftHours} hrs)</strong>
              </div>
            </div>

            {/* Stops Table */}
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#0b2942] text-white uppercase text-[10px] font-extrabold tracking-wider">
                  <tr>
                    <th className="p-3.5">Seq #</th>
                    <th className="p-3.5">Window / ETA</th>
                    <th className="p-3.5">Customer & Contact</th>
                    <th className="p-3.5">Site Address</th>
                    <th className="p-3.5">Container ID & Placement</th>
                    <th className="p-3.5">Action & Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {optimizedRoute.stops.map((stop, idx) => (
                    <tr key={stop.id} className="hover:bg-slate-50/80">
                      <td className="p-3.5 font-bold font-mono text-[#0b2942]">
                        <span className="w-6 h-6 rounded-full bg-[#00c0f3] text-white flex items-center justify-center text-xs">
                          {idx + 1}
                        </span>
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        <div className="font-bold text-[#0b2942]">{stop.preferredSlot}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          ETA {stop.estimatedArrival} – Depart {stop.estimatedDeparture} (30m)
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="font-extrabold text-[#0b2942]">{stop.customerName}</div>
                        <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                          <Phone className="w-3 h-3 text-[#00c0f3]" />
                          <span>{stop.customerPhone}</span>
                        </div>
                      </td>

                      <td className="p-3.5 max-w-xs">
                        <div className="font-medium text-slate-800">{stop.address}, {stop.suburb} {stop.postcode}</div>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.address + ' ' + stop.suburb)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-[#00c0f3] font-bold hover:underline inline-flex items-center gap-0.5 mt-0.5"
                        >
                          <span>Open in Maps</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        <span className="font-mono font-black text-xs text-[#0b2942] block">
                          {stop.containerId}
                        </span>
                        <span className="text-[11px] text-slate-500">{stop.containerSize}</span>
                        {stop.isTrailerSlot ? (
                          <span className="block text-[9px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded mt-0.5">
                            Trailer Deck (Rear)
                          </span>
                        ) : (
                          <span className="block text-[9px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded mt-0.5">
                            Truck Main Deck
                          </span>
                        )}
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                            stop.action === 'dropoff_full'
                              ? 'bg-emerald-100 text-emerald-800'
                              : stop.action === 'pickup_empty'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}
                        >
                          {stop.action.replace('_', ' ')}
                        </span>
                        {stop.notes && <div className="text-[11px] text-slate-600 mt-1 italic">"{stop.notes}"</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 5: TWO-WAY INTERMEDIARY SMARTSHEETS ================= */}
        {activeTab === 'smartsheet' && (
          <SmartsheetWorkspace
            compactHeader
            onOpenCustomerPortalForCustomer={() => {
              if (onOpenCustomerPortal) onOpenCustomerPortal();
            }}
          />
        )}
      </div>

      {/* ================= MODAL: ADD DELIVERY ================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleAddDelivery}
            className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full space-y-4 shadow-2xl animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-base font-black text-[#0b2942] flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#00c0f3]" />
                Schedule New Container Delivery
              </h4>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Customer Name</label>
                  <input
                    type="text"
                    required
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    placeholder="e.g. John Smith"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Customer Mobile</label>
                  <input
                    type="text"
                    required
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Street Address</label>
                <input
                  type="text"
                  required
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="e.g. 50 Parade West"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Suburb</label>
                  <input
                    type="text"
                    value={newSuburb}
                    onChange={(e) => setNewSuburb(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Postcode</label>
                  <input
                    type="text"
                    value={newPostcode}
                    onChange={(e) => setNewPostcode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Container Size</label>
                  <select
                    value={newContainerSize}
                    onChange={(e) => setNewContainerSize(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold"
                  >
                    <option value="10 m³">10 m³</option>
                    <option value="19 m³">19 m³</option>
                    <option value="25 m³">25 m³</option>
                    <option value="50 m³">50 m³ (2x 25m³)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Operation Type</label>
                  <select
                    value={newAction}
                    onChange={(e) => setNewAction(e.target.value as RouteStop['action'])}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold"
                  >
                    <option value="dropoff_full">Drop Off Full</option>
                    <option value="pickup_empty">Pick Up Empty</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Preferred Slot</label>
                <select
                  value={newSlot}
                  onChange={(e) => setNewSlot(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold"
                >
                  {TIME_SLOTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Driver Placement Notes</label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g. Driveway on left side of house"
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#00c0f3] hover:bg-[#00a7d4] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                Add to Calendar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= MODAL: SMS CUSTOMER INCENTIVE ================= */}
      {smsModalSuggestion && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#00c0f3] text-white flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-[#0b2942]">Send Customer Incentive SMS</h4>
                  <span className="text-[11px] text-slate-500 font-mono">
                    To: {smsModalSuggestion.customerName} ({smsModalSuggestion.customerPhone})
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSmsModalSuggestion(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400">Offer Overview</span>
              <div className="text-[#0b2942] font-medium leading-relaxed">
                By switching from <strong>{smsModalSuggestion.currentDay} {smsModalSuggestion.currentSlot}</strong> to <strong>{smsModalSuggestion.suggestedDay} {smsModalSuggestion.suggestedSlot}</strong>, Portabox saves ${smsModalSuggestion.costSavingsAud} in fleet transit costs. We pass 20% (<strong className="text-emerald-700">${smsModalSuggestion.customerIncentiveDiscountAud} AUD</strong>) directly to the customer as an incentive credit.
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <label className="block text-slate-700 font-bold">SMS Message Preview</label>
              <div className="p-3.5 rounded-xl bg-sky-50/70 border border-sky-200 text-slate-800 text-[11px] font-mono leading-relaxed">
                "Hi {smsModalSuggestion.customerName.split(' ')[0]}, Portabox has a level-lift container truck in your street at {smsModalSuggestion.suggestedSlot} ({smsModalSuggestion.suggestedDay})! If you switch to this slot, we’ll apply a ${smsModalSuggestion.customerIncentiveDiscountAud} eco-efficiency discount to your order (plus zero-tilt flat placement). Reply YES to accept."
              </div>
            </div>

            {smsSentNotice && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{smsSentNotice}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSmsModalSuggestion(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSendCustomerSMS(smsModalSuggestion)}
                className="px-5 py-2 bg-[#00c0f3] hover:bg-[#00a7d4] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send SMS to Customer</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Call Center Phone Intake Drawer (Supports Option for Callers without Mobile/Email with Credit Card & Quote Production) */}
      <AdminPhoneIntakeDrawer
        isOpen={isPhoneIntakeOpen}
        onClose={() => setIsPhoneIntakeOpen(false)}
        config={appConfig}
        initialNoPhoneOrEmail={phoneIntakeInitialNoPhoneOrEmail}
        onBookingCreated={(newRow) => {
          const newStop: RouteStop = {
            id: `stop-${Date.now()}`,
            orderNumber: newRow.orderNumber,
            customerName: newRow.customerName,
            customerPhone: newRow.customerPhone,
            address: newRow.deliveryAddress || `${newRow.suburb || 'Adelaide'} SA ${newRow.postcode || '5000'}`,
            suburb: newRow.suburb || 'Adelaide',
            postcode: newRow.postcode || '5000',
            lat: -34.93 + (Math.random() - 0.5) * 0.05,
            lng: 138.61 + (Math.random() - 0.5) * 0.05,
            action: 'dropoff_full' as const,
            containerId: newRow.containerId,
            containerSize: newRow.containerSize,
            preferredSlot: newRow.deliveryWindow?.includes('09:00')
              ? '09:00 AM – 11:30 AM'
              : newRow.deliveryWindow?.includes('11:30')
              ? '11:30 AM – 02:00 PM'
              : '02:00 PM – 04:30 PM',
            serviceDurationMins: 30,
            isTrailerSlot: hasTrailerAttached && scheduledDeliveries.length % 2 === 1,
            notes: newRow.accessNotes,
          };
          const updated = [newStop, ...scheduledDeliveries];
          setScheduledDeliveries(updated);
          saveScheduledDeliveries(updated);
          showToast(`✓ Phone Booking #${newRow.orderNumber} added to Call Center Calendar!`);
        }}
      />

      {/* Call Center AI Operations Copilot */}
      {isCopilotOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl border-l border-slate-200 animate-in slide-in-from-right duration-200 flex flex-col">
          <AdminCopilotChat
            config={appConfig}
            leads={loadCustomerLeads()}
            onSaveConfig={(newCfg) => {
              saveAppConfig(newCfg);
              showToast('✓ App configuration updated by Copilot.');
            }}
            isFloating={true}
            onCloseFloating={() => setIsCopilotOpen(false)}
          />
        </div>
      )}
    </div>
  );
};
