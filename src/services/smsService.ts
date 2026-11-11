import twilio from 'twilio';
import { db } from './firebaseService';
import { collection, addDoc } from 'firebase/firestore';
import { formatAustralianMobile } from './clicksendService';

const getClickSendConfig = () => {
  const username = process.env.CLICKSEND_USERNAME;
  const apiKey = process.env.CLICKSEND_API_KEY;
  const senderId = process.env.CLICKSEND_FROM || 'Portabox';

  return {
    username,
    apiKey,
    senderId,
    isConfigured: Boolean(username && apiKey),
  };
};

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
  const clicksend = getClickSendConfig();
  const twilioCfg = getTwilioConfig();
  const formattedTo = formatAustralianMobile(to);

  let messageSid = `SM_${Date.now()}`;
  let providerUsed: 'clicksend' | 'twilio' | 'simulated' = 'simulated';

  try {
    // 1. Try ClickSend first (Preferred Australian Gateway)
    if (clicksend.isConfigured && clicksend.username && clicksend.apiKey) {
      try {
        const authHeader = 'Basic ' + Buffer.from(`${clicksend.username}:${clicksend.apiKey}`).toString('base64');
        const csRes = await fetch('https://rest.clicksend.com/v3/sms/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader,
          },
          body: JSON.stringify({
            messages: [
              {
                source: 'portabox-system',
                from: clicksend.senderId,
                to: formattedTo,
                body: message,
                custom_string: contactId,
              },
            ],
          }),
        });
        const csData: any = await csRes.json().catch(() => null);
        if (csRes.ok && csData?.response_code === 'SUCCESS') {
          messageSid = csData.data?.messages?.[0]?.message_id || `CS_${Date.now()}`;
          providerUsed = 'clicksend';
          console.log(`[ClickSend SMS Dispatched] To: ${formattedTo} (ID: ${messageSid})`);
        } else {
          console.warn('[ClickSend Gateway Warning]', csData?.response_msg || 'API returned warning');
        }
      } catch (csErr: any) {
        console.warn('[ClickSend network dispatch skipped, trying fallback]', csErr.message);
      }
    }

    // 2. If ClickSend didn't handle it, try Twilio
    if (providerUsed === 'simulated' && twilioCfg.isConfigured && twilioCfg.accountSid && twilioCfg.authToken) {
      const client = twilio(twilioCfg.accountSid, twilioCfg.authToken);
      const response = await client.messages.create({
        body: message,
        from: twilioCfg.twilioPhoneNumber,
        to: formattedTo,
      });
      messageSid = response.sid;
      providerUsed = 'twilio';
      console.log(`[Twilio SMS Sent] To: ${formattedTo} (SID: ${messageSid})`);
    }

    // 3. Fallback to realistic simulation if no active live keys
    if (providerUsed === 'simulated') {
      messageSid = `SM_SIM_${Date.now()}`;
      console.log(`[SMS Gateway Simulated] To: ${formattedTo} | Message: "${message}" (ID: ${messageSid})`);
    }

    // Log outbound message to Firestore (non-blocking)
    if (contactId && contactId !== 'unknown') {
      try {
        addDoc(collection(db, 'contacts', contactId, 'messages'), {
          from: providerUsed === 'clicksend' ? clicksend.senderId : twilioCfg.twilioPhoneNumber,
          to: formattedTo,
          body: message,
          timestamp: new Date().toISOString(),
          contactId,
          direction: 'outbound',
          sid: messageSid,
          provider: providerUsed,
          isSimulated: providerUsed === 'simulated',
        }).catch((firestoreErr) => {
          console.warn('Firestore logging for outbound SMS deferred:', firestoreErr);
        });
      } catch {
        // Ignore synchronous Firestore setup errors
      }
    }

    return messageSid;
  } catch (error) {
    console.error('Error sending SMS:', error);
    console.warn(`Falling back to simulated SMS dispatch for ${formattedTo}`);
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
