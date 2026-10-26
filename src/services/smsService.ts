import twilio from 'twilio';
import { db } from './firebaseService';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

export const sendSms = async (contactId: string, to: string, message: string) => {
  try {
    const response = await client.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to,
    });

    // Log outbound message to Firestore
    await addDoc(collection(db, 'contacts', contactId, 'messages'), {
      from: twilioPhoneNumber,
      to,
      body: message,
      timestamp: new Date().toISOString(),
      contactId,
      direction: 'outbound',
    });

    return response.sid;
  } catch (error) {
    console.error('Error sending SMS:', error);
    throw error;
  }
};

export const logInboundSms = async (contactId: string, from: string, body: string) => {
  try {
    await addDoc(collection(db, 'contacts', contactId, 'messages'), {
      from,
      to: twilioPhoneNumber,
      body,
      timestamp: new Date().toISOString(),
      contactId,
      direction: 'inbound',
    });
  } catch (error) {
    console.error('Error logging inbound SMS:', error);
    throw error;
  }
};
