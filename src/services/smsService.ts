import twilio from 'twilio';
import { db } from './firebaseService';
import { collection, addDoc } from 'firebase/firestore';

const getTwilioConfig = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER || '+61488880123';

  return {
    accountSid,
    authToken,
    twilioPhoneNumber,
    isConfigured: Boolean(accountSid && authToken),
  };
};

export const sendSms = async (contactId: string, to: string, message: string): Promise<string> => {
  const { accountSid, authToken, twilioPhoneNumber, isConfigured } = getTwilioConfig();

  let messageSid = `SM_SIM_${Date.now()}`;

  try {
    if (isConfigured && accountSid && authToken) {
      let cachedClient: ReturnType<typeof twilio> | null = null;
function getClient() {
  if (!accountSid || !authToken) {
    throw new Error('Twilio is not configured on this deployment.');
  }
  if (!cachedClient) cachedClient = twilio(accountSid, authToken);
  return cachedClient;
}
      const response = await getClient().messages.create({
        body: message,
        from: twilioPhoneNumber,
        to,
      });
      messageSid = response.sid;
      console.log(`[Twilio SMS Sent] To: ${to} (SID: ${messageSid})`);
    } else {
      console.log(`[Twilio SMS Simulated] To: ${to} | Message: "${message}" (SID: ${messageSid})`);
    }

    // Log outbound message to Firestore (non-blocking so Firestore connection never delays SMS return)
    if (contactId && contactId !== 'unknown') {
      try {
        addDoc(collection(db, 'contacts', contactId, 'messages'), {
          from: twilioPhoneNumber,
          to,
          body: message,
          timestamp: new Date().toISOString(),
          contactId,
          direction: 'outbound',
          sid: messageSid,
          isSimulated: !isConfigured,
        }).catch((firestoreErr) => {
          console.warn('Firestore logging for outbound SMS deferred:', firestoreErr);
        });
      } catch (err) {
        // Ignore synchronous Firestore setup errors
      }
    }

    return messageSid;
  } catch (error) {
    console.error('Error sending SMS:', error);
    // If Twilio error occurred, fallback to simulated message rather than failing the user flow
    console.warn(`Falling back to simulated SMS dispatch for ${to}`);
    return `SM_FALLBACK_${Date.now()}`;
  }
};

export const logInboundSms = async (contactId: string, from: string, body: string): Promise<void> => {
  const { twilioPhoneNumber } = getTwilioConfig();

  if (contactId && contactId !== 'unknown') {
    try {
      addDoc(collection(db, 'contacts', contactId, 'messages'), {
        from,
        to: twilioPhoneNumber,
        body,
        timestamp: new Date().toISOString(),
        contactId,
        direction: 'inbound',
      }).catch((err) => {
        console.warn('Error logging inbound SMS to Firestore deferred:', err);
      });
    } catch (error) {
      console.warn('Firestore setup error for inbound SMS:', error);
    }
  }
};
