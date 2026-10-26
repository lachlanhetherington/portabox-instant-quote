import React from 'react';
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  Package,
  Calendar,
  CreditCard,
  Send,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Sparkles,
  QrCode,
  ExternalLink,
} from 'lucide-react';

export type DrawerItemType = 'customer' | 'lead' | 'message' | 'container';

export interface DrawerState {
  isOpen: boolean;
  type: DrawerItemType;
  data: any;
}

interface AdminSlideOverDrawerProps {
  drawerState: DrawerState;
  onClose: () => void;
  onMarkMessageContacted?: (id: string) => void;
  onUpdateLeadStatus?: (leadId: string, status: any) => void;
  onOpenCustomerBillingAction?: (customerId: string, mode: 'refund' | 'adjustment' | 'cease') => void;
}

export const AdminSlideOverDrawer: React.FC<AdminSlideOverDrawerProps> = ({
  drawerState,
  onClose,
  onMarkMessageContacted,
  onUpdateLeadStatus,
  onOpenCustomerBillingAction,
}) => {
  if (!drawerState.isOpen || !drawerState.data) return null;

  const { type, data } = drawerState;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#0b2942] text-white p-5 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="p-2 rounded-xl bg-white/10 text-[#00c0f3] shrink-0">
              {type === 'customer' && <User className="w-5 h-5" />}
              {type === 'lead' && <Sparkles className="w-5 h-5" />}
              {type === 'message' && <Clock className="w-5 h-5" />}
              {type === 'container' && <QrCode className="w-5 h-5" />}
            </div>
            <div className="truncate">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#FEBD69]">
                {type === 'customer' && 'CUSTOMER 360° PROFILE'}
                {type === 'lead' && 'QUOTE LEAD INSPECTOR'}
                {type === 'message' && 'AFTER-HOURS INQUIRY'}
                {type === 'container' && 'CONTAINER ASSET QR'}
              </span>
              <h3 className="text-base font-extrabold text-white truncate">
                {type === 'customer' && `${data.firstName} ${data.lastName}`}
                {type === 'lead' && `${data.firstName || 'Customer Lead'}`}
                {type === 'message' && data.customerName}
                {type === 'container' && `Container #${data.serialNumber || data.id}`}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body based on type */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-700">
          {/* TYPE: CUSTOMER */}
          {type === 'customer' && (
            <div className="space-y-5">
              {/* Contact card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-slate-500">Contact:</span>
                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${data.mobile?.replace(/\s+/g, '')}`}
                      className="px-2.5 py-1 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-800 font-extrabold flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3" />
                      <span>Call</span>
                    </a>
                    <a
                      href={`sms:${data.mobile?.replace(/\s+/g, '')}`}
                      className="px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-extrabold flex items-center gap-1"
                    >
                      <Send className="w-3 h-3" />
                      <span>SMS</span>
                    </a>
                  </div>
                </div>
                <div className="text-slate-900 font-bold">{data.email}</div>
                <div className="text-slate-600 font-mono">{data.mobile}</div>
              </div>

              {/* Order Status */}
              {data.orders?.[0] && (
                <div className="p-4 rounded-2xl border border-sky-200 bg-sky-50/50 space-y-2">
                  <span className="text-[10px] font-black uppercase text-sky-800">Active Container Order</span>
                  <div className="font-extrabold text-sm text-[#0b2942]">
                    {data.orders[0].containerName} (#{data.orders[0].containerId})
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Status:</span>
                    <span className="font-bold text-[#00c0f3]">{data.orders[0].status}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Delivery Location:</span>
                    <span className="font-bold text-slate-900">{data.orders[0].deliveryAddress}</span>
                  </div>
                </div>
              )}

              {/* Admin Billing Controls */}
              {onOpenCustomerBillingAction && (
                <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
                  <span className="text-[10px] font-black uppercase text-slate-500">Admin Billing Actions</span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenCustomerBillingAction(data.id, 'refund');
                      }}
                      className="py-2 px-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-black text-center border border-amber-200 transition-colors cursor-pointer"
                    >
                      Refund
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenCustomerBillingAction(data.id, 'adjustment');
                      }}
                      className="py-2 px-2.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-900 font-black text-center border border-sky-200 transition-colors cursor-pointer"
                    >
                      Adjust Bill
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenCustomerBillingAction(data.id, 'cease');
                      }}
                      className="py-2 px-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-900 font-black text-center border border-rose-200 transition-colors cursor-pointer"
                    >
                      Cease Bill
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TYPE: LEAD */}
          {type === 'lead' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between font-bold">
                  <span>Customer:</span>
                  <span className="text-slate-900">{data.firstName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Mobile:</span>
                  <span className="font-mono font-bold text-slate-900">{data.mobile}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Email:</span>
                  <span className="text-slate-700">{data.email}</span>
                </div>
              </div>

              {data.quote && (
                <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 space-y-2">
                  <span className="text-[10px] font-black uppercase text-sky-800">Quote Calculated</span>
                  <div className="text-sm font-extrabold text-[#0b2942]">{data.quote.containerName}</div>
                  <div className="flex items-center justify-between text-slate-700">
                    <span>First Payment:</span>
                    <span className="font-mono font-black text-base text-[#0b2942]">${data.quote.firstPaymentTotal}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Delivery Zone:</span>
                    <span className="font-bold">Zone {data.quote.deliveryZone} (${data.quote.domesticLegFeePerContainer})</span>
                  </div>
                </div>
              )}

              {onUpdateLeadStatus && (
                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onUpdateLeadStatus(data.id, 'Booked')}
                    className="flex-1 py-2.5 rounded-xl bg-[#00c0f3] hover:bg-[#00a8d6] text-white font-extrabold transition-colors cursor-pointer text-center"
                  >
                    Mark as Booked
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateLeadStatus(data.id, 'Contacted')}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold transition-colors cursor-pointer text-center"
                  >
                    Mark Contacted
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TYPE: AFTER-HOURS MESSAGE */}
          {type === 'message' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2 text-amber-950">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-800">Message Received</span>
                <p className="text-sm italic font-medium leading-relaxed">&ldquo;{data.message}&rdquo;</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span>Customer:</span>
                  <span className="font-bold text-slate-900">{data.customerName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Mobile:</span>
                  <span className="font-mono font-bold text-slate-900">{data.customerMobile}</span>
                </div>
                {data.suburbOrPostcode && (
                  <div className="flex items-center justify-between">
                    <span>Location:</span>
                    <span className="font-bold text-slate-900">{data.suburbOrPostcode}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Received:</span>
                  <span>{new Date(data.createdAt).toLocaleString('en-AU')}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <a
                  href={`tel:${data.customerMobile?.replace(/\s+/g, '')}`}
                  className="flex-1 py-2.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 font-extrabold transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call Customer</span>
                </a>
                <a
                  href={`sms:${data.customerMobile?.replace(/\s+/g, '')}?body=${encodeURIComponent(
                    `Hi ${data.customerName}, following up on your message to Portabox this morning!`
                  )}`}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-extrabold transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send SMS</span>
                </a>
              </div>

              {onMarkMessageContacted && data.status !== 'Contacted' && (
                <button
                  type="button"
                  onClick={() => {
                    onMarkMessageContacted(data.id);
                    onClose();
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#0b2942] hover:bg-[#081e30] text-white font-extrabold transition-colors cursor-pointer"
                >
                  Mark Follow-up Complete (Contacted)
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
