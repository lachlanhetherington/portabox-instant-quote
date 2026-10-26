import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  Lock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Zap,
  Landmark,
  Copy,
  Check,
} from 'lucide-react';
import {
  processBraintreePayment,
  detectBraintreeCardBrand,
  BRAINTREE_TEST_PRESETS,
  BraintreePaymentMethodType,
  BraintreePaymentResult,
} from '../services/braintreeService';
import { initiateDunning } from '../services/dunningService';
import { loadCustomerAccounts } from '../services/customerPortalService';
import {
  generateZeptoEftInstruction,
  settleOrRegisterZeptoEftPayment,
} from '../services/zeptoEftService';

interface BraintreePaymentSectionProps {
  amount: number;
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  orderDescription: string;
  billingCycleLabel?: string;
  onPaymentSuccess: (result: BraintreePaymentResult) => void;
  onPaymentError?: (error: string) => void;
}

export const BraintreePaymentSection: React.FC<BraintreePaymentSectionProps> = ({
  amount,
  customerId,
  customerName = 'Portabox Customer',
  customerEmail = 'customer@portabox.com.au',
  customerPhone = '1800 467 637',
  orderDescription,
  billingCycleLabel = 'Monthly storage',
  onPaymentSuccess,
  onPaymentError,
}) => {
  const [activeMethod, setActiveMethod] = useState<BraintreePaymentMethodType>('credit_card');
  const [cardNumber, setCardNumber] = useState('');
  const [cardholderName, setCardholderName] = useState(customerName);
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [postalCode, setPostalCode] = useState('5061');
  const [vaultMethod, setVaultMethod] = useState(true);
  const [paypalEmail, setPaypalEmail] = useState(customerEmail);

  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccessData, setPaymentSuccessData] = useState<BraintreePaymentResult | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [bankReceiptInput, setBankReceiptInput] = useState<string>('');
  const [remittanceNoticeMessage, setRemittanceNoticeMessage] = useState<string | null>(null);

  // Auto-generated Zepto NPP / PayID & Virtual Account instruction (Option 1)
  const zeptoInstruction = useMemo(
    () =>
      generateZeptoEftInstruction({
        amountAud: amount,
        customerName,
        customerEmail,
        customerPhone,
        orderDescription,
      }),
    [amount, customerName, customerEmail, customerPhone, orderDescription]
  );

  const handleCopyText = (label: string, text: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Process Zepto NPP / PayID EFT (Option 1: Instant Webhook Settlement or Remittance Lodgement)
  const handleZeptoEftSubmit = async (mode: 'instant_npp_webhook' | 'remittance_submitted') => {
    setIsProcessing(true);
    setPaymentError(null);
    setRemittanceNoticeMessage(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 750));
      const { updatedInstruction, nppTransactionId } = settleOrRegisterZeptoEftPayment({
        instruction: zeptoInstruction,
        mode,
        bankReceiptRef: bankReceiptInput.trim() || zeptoInstruction.referenceCode,
      });

      if (mode === 'instant_npp_webhook') {
        const result: BraintreePaymentResult = {
          success: true,
          transactionId: `${updatedInstruction.referenceCode} (${nppTransactionId})`,
          status: 'settled',
          paymentMethod: `EFT / PayID (${updatedInstruction.referenceCode} via Zepto NPP)`,
          paymentMethodType: 'eft_zepto',
          amount,
          currency: 'AUD',
          settledAt: new Date().toISOString(),
          vaultToken: `zepto_acct_${updatedInstruction.virtualAccountNumber}`,
        };
        setPaymentSuccessData(result);
        onPaymentSuccess(result);
      } else {
        setRemittanceNoticeMessage(
          `✓ Transfer lodged with Reference ${updatedInstruction.referenceCode}. Your container is reserved in Smartsheet and will auto-reconcile as soon as Zepto NPP detects the deposit.`
        );
      }
    } catch {
      setPaymentError('Could not register EFT payment instruction.');
    } finally {
      setIsProcessing(false);
    }
  };

  const cardBrand = detectBraintreeCardBrand(cardNumber);

  // Format Card Number with 4-digit spacing
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = raw.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
  };

  // Format Expiry MM/YY
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 2) {
      raw = raw.slice(0, 2) + '/' + raw.slice(2);
    }
    setExpiry(raw);
  };

  const handleUsePreset = (preset: (typeof BRAINTREE_TEST_PRESETS)[0]) => {
    setCardNumber(preset.number.replace(/(\d{4})(?=\d)/g, '$1 '));
    setExpiry(preset.expiry);
    setCvv(preset.cvv);
    setCardholderName(customerName || 'Portabox Verified Buyer');
    setPaymentError(null);
  };

  // Process Card Payment via Braintree
  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError(null);

    if (cardNumber.replace(/\s+/g, '').length < 15) {
      setPaymentError('Please enter a valid 15 or 16-digit card number.');
      return;
    }
    if (!expiry || !expiry.includes('/')) {
      setPaymentError('Please enter card expiry in MM/YY format.');
      return;
    }
    if (cvv.length < 3) {
      setPaymentError('Please enter a valid 3 or 4-digit CVV security code.');
      return;
    }

    setIsProcessing(true);
    try {
      const [expMonth, expYear] = expiry.split('/');
      const result = await processBraintreePayment({
        amount,
        paymentMethodType: 'credit_card',
        customerName: cardholderName,
        customerEmail,
        customerPhone,
        cardDetails: {
          cardNumber,
          cardholderName,
          expiryMonth: expMonth,
          expiryYear: `20${expYear}`,
          cvv,
          postalCode,
        },
        vaultPaymentMethod: vaultMethod,
        orderDescription,
      });

      if (result.success) {
        setPaymentSuccessData(result);
        onPaymentSuccess(result);
      } else {
        setPaymentError(result.error || 'Braintree authorization failed.');
        if (onPaymentError) onPaymentError(result.error || 'Braintree authorization failed.');
        if (customerId) {
          const accounts = loadCustomerAccounts();
          const customer = accounts.find(a => a.id === customerId);
          if (customer) {
            await initiateDunning(customer);
          }
        }
      }
    } catch {
      setPaymentError('An error occurred connecting to Braintree. Please check card details.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Process PayPal via Braintree
  const handlePayPalSubmit = async () => {
    setIsProcessing(true);
    setPaymentError(null);
    try {
      const result = await processBraintreePayment({
        amount,
        paymentMethodType: 'paypal',
        customerName,
        customerEmail: paypalEmail,
        customerPhone,
        paypalEmail,
        vaultPaymentMethod: vaultMethod,
        orderDescription,
      });

      if (result.success) {
        setPaymentSuccessData(result);
        onPaymentSuccess(result);
      } else {
        setPaymentError(result.error || 'PayPal authorization failed.');
      }
    } catch {
      setPaymentError('PayPal checkout could not complete.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Process Digital Wallets (Google Pay / Apple Pay)
  const handleWalletSubmit = async (walletType: 'google_pay' | 'apple_pay') => {
    setIsProcessing(true);
    setPaymentError(null);
    try {
      const result = await processBraintreePayment({
        amount,
        paymentMethodType: walletType,
        customerName,
        customerEmail,
        customerPhone,
        vaultPaymentMethod: vaultMethod,
        orderDescription,
      });

      if (result.success) {
        setPaymentSuccessData(result);
        onPaymentSuccess(result);
      }
    } catch {
      setPaymentError('Digital wallet payment failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border-2 border-[#DAD7D1] shadow-xs p-6 sm:p-8 space-y-6">
      {/* Top Banner: Braintree Gateway Verified */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#5CC1EF] text-[#15385E] flex items-center justify-center font-black shadow-xs">
            <Lock className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-[#15385E] text-white px-2 py-0.5 rounded">
                BRAINTREE PAYMENTS
              </span>
              <span className="text-[10px] font-bold text-slate-500">
                A PayPal Company · Level 1 PCI-DSS
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-[#15385E]">
              Secure Payment & Container Reservation
            </h3>
          </div>
        </div>

        <div className="text-left sm:text-right">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Payable Now
          </span>
          <span className="text-2xl font-black text-[#15385E] font-mono">${amount} AUD</span>
          <span className="text-[10px] text-emerald-600 font-bold block">
            GST Inclusive · Instant Confirmation
          </span>
        </div>
      </div>

      {/* Success Notification */}
      {paymentSuccessData && (
        <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-3xl space-y-2 animate-in fade-in">
          <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>Payment Successfully Settled via Braintree!</span>
          </div>
          <div className="text-xs text-emerald-900 space-y-1">
            <p><strong>Transaction Ref:</strong> <span className="font-mono">{paymentSuccessData.transactionId}</span></p>
            <p><strong>Method:</strong> {paymentSuccessData.paymentMethod}</p>
            <p><strong>Vault Token:</strong> <span className="font-mono">{paymentSuccessData.vaultToken}</span> (Autopay Active)</p>
          </div>
        </div>
      )}

      {/* Payment Method Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          type="button"
          onClick={() => {
            setActiveMethod('credit_card');
            setPaymentError(null);
          }}
          className={`py-3 px-2 sm:px-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
            activeMethod === 'credit_card'
              ? 'border-[#00c0f3] bg-sky-50/50 text-[#0b2942] shadow-2xs'
              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <CreditCard className="w-4 h-4 text-[#00c0f3]" />
          <span>Credit / Debit Card</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveMethod('eft_zepto');
            setPaymentError(null);
          }}
          className={`py-3 px-2 sm:px-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
            activeMethod === 'eft_zepto'
              ? 'border-emerald-500 bg-emerald-50/70 text-[#0b2942] shadow-2xs ring-2 ring-emerald-500/20'
              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Landmark className="w-4 h-4 text-emerald-600" />
          <span>EFT / PayID (Zepto)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveMethod('paypal');
            setPaymentError(null);
          }}
          className={`py-3 px-2 sm:px-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
            activeMethod === 'paypal'
              ? 'border-blue-500 bg-blue-50/50 text-[#0b2942] shadow-2xs'
              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <span className="font-extrabold text-blue-600 font-sans italic text-sm">P</span>
          <span>PayPal</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveMethod('google_pay');
            setPaymentError(null);
          }}
          className={`py-3 px-2 sm:px-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
            activeMethod === 'google_pay' || activeMethod === 'apple_pay'
              ? 'border-slate-800 bg-slate-900 text-white shadow-2xs'
              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Zap className="w-4 h-4 text-amber-400" />
          <span>Google / Apple Pay</span>
        </button>
      </div>

      {paymentError && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{paymentError}</span>
        </div>
      )}

      {/* TAB 1: Braintree Hosted Fields Credit Card */}
      {activeMethod === 'credit_card' && (
        <form onSubmit={handleCardSubmit} className="space-y-4">
          {/* Quick Sandbox Presets for Testing */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
              1-Click Braintree Sandbox Test Cards:
            </span>
            <div className="flex flex-wrap gap-2">
              {BRAINTREE_TEST_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleUsePreset(p)}
                  className="px-2.5 py-1 bg-white hover:bg-sky-50 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 transition-colors cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Cardholder Name
            </label>
            <input
              type="text"
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value)}
              placeholder="e.g. Sarah Jenkins"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00c0f3]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Card Number (Braintree Hosted Fields)
              </label>
              <span className="text-xs font-extrabold text-[#00c0f3]">{cardBrand}</span>
            </div>
            <div className="relative">
              <input
                type="text"
                value={cardNumber}
                onChange={handleCardNumberChange}
                placeholder="4111 1111 1111 1111"
                maxLength={19}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 font-mono text-sm font-bold tracking-wider focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00c0f3]"
              />
              <CreditCard className="w-4 h-4 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Expiry Date
              </label>
              <input
                type="text"
                value={expiry}
                onChange={handleExpiryChange}
                placeholder="MM/YY"
                maxLength={5}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00c0f3]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Security CVV
              </label>
              <input
                type="password"
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="123"
                maxLength={4}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00c0f3]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Postcode
              </label>
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value.slice(0, 4))}
                placeholder="5061"
                maxLength={4}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00c0f3]"
              />
            </div>
          </div>

          {/* Braintree Vault Checkbox */}
          <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-sky-50/50 border border-sky-100 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={vaultMethod}
              onChange={(e) => setVaultMethod(e.target.checked)}
              className="w-4 h-4 rounded text-[#5CC1EF] focus:ring-[#5CC1EF]"
            />
            <div className="text-xs">
              <span className="font-extrabold text-[#15385E]">Save to Braintree Vault</span>
              <span className="text-slate-500 block">
                Store payment token safely for recurring {billingCycleLabel} automatic debit. Cancel anytime.
              </span>
            </div>
          </label>

          {/* CTA Pay Now Button: #F7D347 Vibrant Gold / Yellow with #1A1A1A text */}
          <button
            type="submit"
            disabled={isProcessing}
            className="w-full py-4 bg-[#F7D347] hover:bg-[#eed235] text-[#1A1A1A] border-2 border-[#e6c338] rounded-2xl font-black text-sm tracking-wide shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-[#15385E]" />
                <span className="font-black text-[#1A1A1A]">Authorizing with Braintree Gateway...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 text-[#15385E]" />
                <span className="font-black text-[#1A1A1A]">Pay ${amount} AUD Now via Braintree</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* TAB 2: PayPal via Braintree */}
      {activeMethod === 'paypal' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-blue-50 border border-blue-200 text-center space-y-3">
            <div className="text-2xl font-black text-blue-800 font-sans italic">PayPal</div>
            <p className="text-xs text-blue-900 max-w-sm mx-auto">
              Check out in seconds with PayPal One-Touch powered by Braintree. Your bank or card details are never shared with merchants.
            </p>
            <div className="max-w-xs mx-auto text-left">
              <label className="block text-[11px] font-bold text-blue-900 mb-1">
                PayPal Account Email
              </label>
              <input
                type="email"
                value={paypalEmail}
                onChange={(e) => setPaypalEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-blue-200 bg-white text-xs font-semibold"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handlePayPalSubmit}
            disabled={isProcessing}
            className="w-full py-3.5 bg-[#ffc439] hover:bg-[#f6bb32] text-[#003087] rounded-2xl font-black text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <span>Proceed with PayPal (${amount} AUD)</span>
            )}
          </button>
        </div>
      )}

      {/* TAB 3: Digital Wallets via Braintree */}
      {activeMethod === 'google_pay' && (
        <div className="space-y-4 text-center">
          <p className="text-xs text-slate-500">
            Use device biometrics (Face ID / Fingerprint) to pay instantly via Braintree tokenized digital wallets.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleWalletSubmit('google_pay')}
              disabled={isProcessing}
              className="py-3 px-4 bg-black hover:bg-slate-800 text-white rounded-2xl font-extrabold text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Pay with G Pay</span>
            </button>

            <button
              type="button"
              onClick={() => handleWalletSubmit('apple_pay')}
              disabled={isProcessing}
              className="py-3 px-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-extrabold text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Pay with Apple Pay</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: EFT / PayID with Zepto Auto-Generated Reference & Virtual Account (Option 1) */}
      {activeMethod === 'eft_zepto' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-600 text-white">
                  <Landmark className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-700 text-white px-2 py-0.5 rounded">
                      ZEPTO NPP / PAYID AUTO-RECONCILIATION
                    </span>
                    <span className="text-[10px] font-bold text-emerald-800">
                      Zero Card Merchant Fees · Osko Instant
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-[#0b2942] mt-0.5">
                    Electronic Funds Transfer (Unique Reference &amp; Virtual Account)
                  </h4>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-[10px] uppercase font-bold text-emerald-700 block">Exact Transfer Amount</span>
                <span className="text-lg font-black font-mono text-[#0b2942]">${amount}.00 AUD</span>
              </div>
            </div>

            {/* Auto-Generated Reference Code Highlight Box */}
            <div className="p-4 rounded-2xl bg-white border-2 border-[#FF9900] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Auto-Generated EFT Reference Code (Include in Bank Description)
                </span>
                <div className="text-xl sm:text-2xl font-black font-mono text-[#0b2942] tracking-wider mt-0.5">
                  {zeptoInstruction.referenceCode}
                </div>
                <span className="text-[11px] text-slate-500">
                  Automatically matches your payment to this quote &amp; releases container dispatch in Smartsheet
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopyText('ref', zeptoInstruction.referenceCode)}
                className="px-4 py-2.5 rounded-xl bg-[#FF9900] hover:bg-[#e68a00] text-[#0b2942] border border-[#FEBD69] font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shrink-0 self-start sm:self-center shadow-2xs"
              >
                {copiedField === 'ref' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#0b2942]" />
                    <span>Copied Reference!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#0b2942]" />
                    <span>Copy Reference</span>
                  </>
                )}
              </button>
            </div>

            {/* Dynamic PayID & Virtual BSB/Account Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-white border border-emerald-200 flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Dynamic PayID (Osko)</span>
                  <span className="font-mono font-bold text-[#0b2942] break-all">{zeptoInstruction.payIdEmail}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyText('payid', zeptoInstruction.payIdEmail)}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer shrink-0"
                  title="Copy PayID"
                >
                  {copiedField === 'payid' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-emerald-200 flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Zepto Virtual BSB</span>
                  <span className="font-mono font-bold text-sm text-[#0b2942]">{zeptoInstruction.virtualBsb}</span>
                  <span className="block text-[10px] text-slate-400">{zeptoInstruction.accountName}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyText('bsb', zeptoInstruction.virtualBsb)}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer shrink-0"
                  title="Copy BSB"
                >
                  {copiedField === 'bsb' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-emerald-200 flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Unique Virtual Account #</span>
                  <span className="font-mono font-bold text-sm text-[#0b2942]">{zeptoInstruction.virtualAccountNumber}</span>
                  <span className="block text-[10px] text-emerald-700 font-semibold">Dedicated to this order</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyText('acct', zeptoInstruction.virtualAccountNumber)}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer shrink-0"
                  title="Copy Account Number"
                >
                  {copiedField === 'acct' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Optional Customer Bank Receipt / Remittance Input */}
            <div className="pt-1">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Optional: Your Bank Receipt Number (if already transferred via netbanking)
              </label>
              <input
                type="text"
                value={bankReceiptInput}
                onChange={(e) => setBankReceiptInput(e.target.value)}
                placeholder={`e.g. OSKO-991824 or leave blank to use ${zeptoInstruction.referenceCode}`}
                className="w-full px-3.5 py-2 rounded-xl border border-emerald-200 bg-white text-xs font-mono"
              />
            </div>

            {remittanceNoticeMessage && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{remittanceNoticeMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleZeptoEftSubmit('instant_npp_webhook')}
                className="py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-extrabold text-xs shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 text-amber-300" />
                )}
                <span>Confirm Instant PayID / NPP Transfer (${amount} AUD)</span>
              </button>

              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleZeptoEftSubmit('remittance_submitted')}
                className="py-3.5 px-4 bg-white hover:bg-emerald-100/60 text-[#0b2942] border border-emerald-300 rounded-2xl font-extrabold text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Lodge EFT Remittance (Pending Bank Clearance)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          Braintree 256-Bit SSL Tokenization
        </span>
        <span>Merchant Account: portabox_aud</span>
      </div>
    </div>
  );
};
