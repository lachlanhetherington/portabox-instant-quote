// import { sendSms } from './smsService'; // Removed direct import to fix client-side bundling error
import { CustomerAccount } from './customerPortalService';
import { db } from './firebaseService';
import { doc, updateDoc } from 'firebase/firestore';

// Helper to call server-side SMS API
const sendSmsProxy = async (contactId: string, to: string, message: string) => {
  const response = await fetch('/api/sms/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contactId, to, message }),
  });
  if (!response.ok) throw new Error('Failed to send SMS');
};

// Define dunning stages with delay in hours and message content
export const DUNNING_STAGES = [
  { stage: 1, delayHours: 0, message: "Portabox: Payment failed. Keep your storage active by updating your card: https://portabox.com.au/portal/billing" },
  { stage: 2, delayHours: 24, message: "Portabox Reminder: Your storage payment is overdue. Please update your card to avoid service disruption: https://portabox.com.au/portal/billing" },
  { stage: 3, delayHours: 72, message: "Urgent: Portabox storage account is at risk. Please update your payment immediately to keep your goods safe: https://portabox.com.au/portal/billing" },
];

export const initiateDunning = async (customer: CustomerAccount) => {
  if (!customer.paymentPlan.dunningStatus) {
    const stage1 = DUNNING_STAGES[0];
    const now = new Date();
    
    // Send SMS via proxy
    await sendSmsProxy(customer.id, customer.mobile, stage1.message);

    // Update customer in Firestore
    const customerRef = doc(db, 'customers', customer.id);
    await updateDoc(customerRef, {
      'paymentPlan.dunningStatus': {
        stage: 1,
        lastAttempt: now.toISOString(),
        nextAttempt: new Date(now.getTime() + stage1.delayHours * 60 * 60 * 1000).toISOString()
      }
    });
  }
};

export const checkAndEscalateDunning = async (customer: CustomerAccount) => {
  if (customer.paymentPlan.dunningStatus) {
    const { stage, nextAttempt } = customer.paymentPlan.dunningStatus;
    const now = new Date();
    
    if (now >= new Date(nextAttempt) && stage < DUNNING_STAGES.length) {
      const nextStage = DUNNING_STAGES[stage]; // array is 0-indexed, so index 'stage' is next
      
      // Send SMS via proxy
      await sendSmsProxy(customer.id, customer.mobile, nextStage.message);
      
      // Update customer in Firestore
      const customerRef = doc(db, 'customers', customer.id);
      await updateDoc(customerRef, {
        'paymentPlan.dunningStatus': {
          stage: nextStage.stage,
          lastAttempt: now.toISOString(),
          nextAttempt: new Date(now.getTime() + nextStage.delayHours * 60 * 60 * 1000).toISOString()
        }
      });
    }
  }
};
