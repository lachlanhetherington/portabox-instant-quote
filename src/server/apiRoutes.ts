/* The API surface, lifted out of server.ts so one definition serves both
   ways this runs: tsx server.ts locally, where Vite also mounts, and a
   single Vercel function in production, where Vercel serves dist/ itself.
   The routes themselves are upstream's, moved unchanged. */
import express from 'express';
import { sendSms, logInboundSms } from '../services/smsService';
import type { Express } from 'express';

export function registerApiRoutes(app: Express) {
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Proxy for Google Drive API
  app.use('/api/drive', async (req, res) => {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const url = `https://www.googleapis.com${req.url.replace('/api/drive', '')}`;
    
    try {
      const fetchOptions: RequestInit = {
        method: req.method,
        headers: {
          'Authorization': token,
          'Content-Type': req.headers['content-type'] || 'application/json',
        },
      };

      if (req.method !== 'GET' && req.method !== 'HEAD') {
        // For simplicity in this environment, we pipe the stream directly.
        // This requires the request to be readable as a stream.
        fetchOptions.body = req as any;
      }

      const response = await fetch(url, fetchOptions);
      
      // Pipe response back
      res.status(response.status);
      if (response.body) {
        // @ts-ignore
        for await (const chunk of response.body) {
          res.write(chunk);
        }
      }
      res.end();
    } catch (error) {
      res.status(500).json({ error: 'Failed to proxy request' });
    }
  });

  app.post('/api/sms/send', async (req, res) => {
    const { contactId, to, message } = req.body;
    try {
      const sid = await sendSms(contactId, to, message);
      res.json({ success: true, sid });
    } catch (error) {
      res.status(500).json({ error: 'Failed to send SMS' });
    }
  });

  app.post('/api/sms/inbound', async (req, res) => {
    const { From, Body, contactId } = req.body;
    try {
      await logInboundSms(contactId || 'unknown', From, Body);
      res.type('text/xml').send('<Response></Response>');
    } catch (error) {
      res.status(500).send('Error');
    }
  });

  // Twilio Voice Media Stream TwiML endpoint
  app.post('/api/twilio/voice/stream', (req, res) => {
    const host = req.headers.host || 'localhost:3000';
    const wsProto = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'wss' : 'ws';
    const streamUrl = `${wsProto}://${host}/api/twilio/media-stream`;

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Nicole" language="en-AU">Connecting to Portabox Call Center with real-time stream recording enabled.</Say>
  <Connect>
    <Stream url="${streamUrl}" track="both_tracks" />
  </Connect>
  <Record transcribe="true" transcribeCallback="/api/twilio/transcription" maxLength="3600" />
</Response>`;

    res.type('text/xml').send(twiml);
  });

  // Twilio Transcription & Recording Status Webhook
  app.post('/api/twilio/transcription', async (req, res) => {
    const { CallSid, TranscriptionText, TranscriptionStatus, RecordingUrl } = req.body;
    console.log(`[Twilio Transcription Callback] CallSid: ${CallSid}, Status: ${TranscriptionStatus}`);
    res.type('text/xml').send('<Response></Response>');
  });

  // Gemini-Powered Real-Time Call Intelligence & Bulleted Summary
  app.post('/api/twilio/summarize', async (req, res) => {
    const { transcripts, customer } = req.body;

    if (!transcripts || !Array.isArray(transcripts) || transcripts.length === 0) {
      return res.status(400).json({ error: 'Transcripts array required' });
    }

    const conversationText = transcripts
      .map((t: any) => `${t.speakerName || t.speaker.toUpperCase()}: ${t.text}`)
      .join('\n');

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY not set, using heuristic engine');
      }

      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });

      const prompt = `You are the AI Telephony Intelligence Engine for Portabox Australia (a portable storage and container company).
Analyze the following live customer conversation transcript from Twilio Media Streams.

Customer Context:
- Name: ${customer?.firstName || 'Customer'} ${customer?.lastName || ''}
- Phone: ${customer?.mobile || 'Unknown'}
- Suburb: ${customer?.suburb || 'Australia'}

Transcript:
"""
${conversationText}
"""

Return a valid JSON object strictly matching this schema:
{
  "executiveSummary": "A concise 1-2 sentence executive briefing for the CRM agent.",
  "bulletPoints": [
    {
      "category": "🎯 Customer Intent & Objectives",
      "points": ["string", "string"]
    },
    {
      "category": "📦 Container & Logistics Specs",
      "points": ["string", "string"]
    },
    {
      "category": "⚠️ Site Access & Safety Constraints",
      "points": ["string", "string"]
    },
    {
      "category": "💳 Billing & Commercial Terms",
      "points": ["string", "string"]
    }
  ],
  "sentiment": "positive" | "neutral" | "frustrated" | "urgent",
  "sentimentScore": number between -100 and 100,
  "customerIntent": "Short 3-5 word label",
  "keyEntities": {
    "containerSize": "e.g. 25 m³ Pro",
    "orderNumber": "e.g. PBO-9841",
    "datesMentioned": ["string"],
    "amountsMentioned": ["string"],
    "siteAccessNotes": "string",
    "urgencyLevel": "Low" | "Standard" | "High" | "Immediate Action Required"
  },
  "actionItems": [
    {
      "id": "act-1",
      "title": "Short title",
      "description": "Specific action required",
      "category": "rental_extension" | "pickup_schedule" | "damage_report" | "billing_refund" | "sms_dispatch" | "general",
      "completed": false
    }
  ]
}`;

      const aiResponse = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const responseText = aiResponse.text || '{}';
      const parsed = JSON.parse(responseText);
      return res.json(parsed);
    } catch (err: any) {
      console.warn('Gemini summarization fallback triggered:', err.message);

      // Deterministic Intelligent Fallback
      const textLower = conversationText.toLowerCase();
      const isExtension = textLower.includes('extend') || textLower.includes('month');
      const isPickup = textLower.includes('pickup') || textLower.includes('empty') || textLower.includes('collect');
      const isDamage = textLower.includes('leak') || textLower.includes('damage') || textLower.includes('seal') || textLower.includes('water');

      let intent = 'Customer Inbound Inquiry';
      let sentiment: 'positive' | 'neutral' | 'frustrated' | 'urgent' = 'positive';
      let sentimentScore = 75;
      let urgency: 'Low' | 'Standard' | 'High' | 'Immediate Action Required' = 'Standard';

      const bulletPoints: any[] = [];

      if (isExtension) {
        intent = 'Rental Extension Request';
        sentiment = 'positive';
        sentimentScore = 80;
        bulletPoints.push({
          category: '🎯 Customer Intent & Objectives',
          points: [
            'Customer requested extending active container rental period.',
            'Agreed to apply monthly recurring billing to saved card on file.',
          ],
        });
        bulletPoints.push({
          category: '💳 Billing & Commercial Terms',
          points: ['Apply standard monthly storage extension rate with multi-month loyalty rebate.'],
        });
      } else if (isPickup) {
        intent = 'Container Collection Booking';
        sentiment = 'positive';
        sentimentScore = 90;
        urgency = 'High';
        bulletPoints.push({
          category: '🎯 Customer Intent & Objectives',
          points: [
            'Container packing/use completed; customer requested final retrieval.',
            'Needs pickup scheduled to clear driveway or street bay.',
          ],
        });
        bulletPoints.push({
          category: '⚠️ Site Access & Safety Constraints',
          points: ['Verify level horizontal access for tilt-tray retrieval and gate codes.'],
        });
      } else if (isDamage) {
        intent = 'Door Seal / Weather Moisture Inspection';
        sentiment = 'urgent';
        sentimentScore = -20;
        urgency = 'Immediate Action Required';
        bulletPoints.push({
          category: '🎯 Customer Intent & Objectives',
          points: [
            'Customer reported minor water ingress or weather gasket concern.',
            'Requested immediate yard inspection or container reseal before upcoming weather front.',
          ],
        });
        bulletPoints.push({
          category: '📦 Container & Logistics Specs',
          points: ['Goods protected in furniture blankets; dispatch maintenance tech.'],
        });
      } else {
        bulletPoints.push({
          category: '🎯 Customer Intent & Objectives',
          points: ['General account and delivery status consultation.'],
        });
      }

      return res.json({
        executiveSummary: `Live Twilio Media Stream analyzed for ${customer?.firstName || 'customer'}. Key discussion centered around ${intent}.`,
        bulletPoints,
        sentiment,
        sentimentScore,
        customerIntent: intent,
        keyEntities: {
          containerSize: customer?.orders?.[0]?.containerName || 'Portabox Container',
          orderNumber: customer?.orders?.[0]?.orderNumber || 'PBO-9841',
          urgencyLevel: urgency,
        },
        actionItems: [
          {
            id: 'act-auto-1',
            title: `Review ${intent}`,
            description: `Execute appropriate resolution in customer profile.`,
            category: isExtension ? 'rental_extension' : isPickup ? 'pickup_schedule' : isDamage ? 'damage_report' : 'general',
            completed: false,
          },
        ],
      });
    }
  });


  // Gemini-Powered Discount Rule Generation ("Created in Gem")
  app.post('/api/gemini/generate-discount', async (req, res) => {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt string is required' });
    }

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY not set, using heuristic generator');
      }

      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });

      const systemPrompt = `You are the Promotional & Pricing Intelligence Engine for Portabox Australia.
The user wants to create a new promotional discount rule based on their prompt.
Convert their instructions into a structured discount rule matching this JSON schema:

{
  "name": "string (Display title, e.g. Melbourne 20ft Storage Exclusive)",
  "code": "string (Clean uppercase alphanumeric promo code, e.g. MELB20EXCL, ONSITE15, FREEDELADL)",
  "description": "string (Customer-facing summary of terms and savings)",
  "type": "percent_off_first_month" | "fixed_discount" | "free_initial_delivery" | "free_first_month" | "percent_off_interstate" | "free_container_upgrade",
  "value": number (Numeric value: percentage like 20, or dollar amount like 50, or 100 for free delivery),
  "targetLocations": ["All" | "Adelaide" | "Melbourne" | "Sydney" | "Brisbane"],
  "serviceTypes": ["storage_onsite" | "storage_portabox_site" | "local_moving" | "interstate_moving"],
  "containerSize": "all" | "10ft" | "20ft",
  "isExclusive": boolean (true if only this single code can be used and it suppresses duration discounts; false if stackable),
  "minDurationMonths": number (0 for none, or 1, 3, 6, 12),
  "active": true
}

Rules:
- Locations: Adelaide, Melbourne, Sydney, Brisbane, or All
- Service types: storage_onsite (at customer's place), storage_portabox_site (depot facility), local_moving, interstate_moving
- Container sizes: 10ft (10m³ / 12.5m³), 20ft (19m³ / 25m³), or all
- Code exclusivity: If user mentions "exclusive", "only one code", "replaces other discounts", set isExclusive: true. If "stackable", "combined", or "non-exclusive", set isExclusive: false.
- Ensure the code is catchy, relevant, and uppercase.`;

      const aiResponse = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `${systemPrompt}\n\nUser request: "${prompt}"`,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const responseText = aiResponse.text || '{}';
      const parsed = JSON.parse(responseText);
      return res.json({ success: true, promotion: parsed, source: 'gemini-3.8-flash' });
    } catch (err: any) {
      console.warn('Gemini discount generator fallback triggered:', err.message);

      // Intelligent Heuristic Fallback
      const p = prompt.toLowerCase();

      // Locations
      const targetLocations: ('All' | 'Adelaide' | 'Melbourne' | 'Sydney' | 'Brisbane')[] = [];
      if (p.includes('adelaide') || p.includes('sa')) targetLocations.push('Adelaide');
      if (p.includes('melbourne') || p.includes('vic')) targetLocations.push('Melbourne');
      if (p.includes('sydney') || p.includes('nsw')) targetLocations.push('Sydney');
      if (p.includes('brisbane') || p.includes('qld')) targetLocations.push('Brisbane');
      if (targetLocations.length === 0 || p.includes('all') || p.includes('nationwide') || p.includes('australia')) {
        targetLocations.push('All');
      }

      // Service types
      const serviceTypes: ('storage_onsite' | 'storage_portabox_site' | 'local_moving' | 'interstate_moving')[] = [];
      if (p.includes('onsite') || p.includes('on-site') || p.includes('place') || p.includes('yard') || p.includes('driveway')) {
        serviceTypes.push('storage_onsite');
      }
      if (p.includes('facility') || p.includes('depot') || p.includes('at portabox') || p.includes('site storage')) {
        serviceTypes.push('storage_portabox_site');
      }
      if (p.includes('local') || p.includes('metro move') || p.includes('local move')) {
        serviceTypes.push('local_moving');
      }
      if (p.includes('interstate') || p.includes('cross-country') || p.includes('inter-state')) {
        serviceTypes.push('interstate_moving');
      }
      if (serviceTypes.length === 0) {
        serviceTypes.push('storage_onsite', 'storage_portabox_site', 'local_moving', 'interstate_moving');
      }

      // Container size
      let containerSize: 'all' | '10ft' | '20ft' = 'all';
      if (p.includes('10ft') || p.includes('10 ft') || p.includes('10m3') || p.includes('small')) {
        containerSize = '10ft';
      } else if (p.includes('20ft') || p.includes('20 ft') || p.includes('25m3') || p.includes('large') || p.includes('big')) {
        containerSize = '20ft';
      }

      // Exclusivity
      const isExclusive =
        (p.includes('exclusive') && !p.includes('non-exclusive') && !p.includes('not exclusive')) ||
        p.includes('sole') ||
        p.includes('only one') ||
        p.includes('single code');

      // Value & type
      let type: any = 'percent_off_first_month';
      let value = 20;

      const pctMatch = p.match(/(\d+)\s*%/);
      const dollarMatch = p.match(/\$\s*(\d+)/);
      const numMatch = p.match(/(\d+)\s*(?:dollars|bucks|aud|percent|pct|off)/);

      if (p.includes('free delivery') || p.includes('free initial delivery')) {
        type = 'free_initial_delivery';
        value = 100;
      } else if (p.includes('first month free') || p.includes('month free')) {
        type = 'free_first_month';
        value = 100;
      } else if (p.includes('interstate') && (pctMatch || dollarMatch)) {
        type = 'percent_off_interstate';
        value = pctMatch ? parseInt(pctMatch[1], 10) : dollarMatch ? parseInt(dollarMatch[1], 10) : 15;
      } else if (dollarMatch) {
        type = 'fixed_discount';
        value = parseInt(dollarMatch[1], 10);
      } else if (pctMatch) {
        type = 'percent_off_first_month';
        value = parseInt(pctMatch[1], 10);
      } else if (numMatch) {
        if (p.includes('percent') || p.includes('pct')) {
          type = 'percent_off_first_month';
          value = parseInt(numMatch[1], 10);
        } else {
          type = 'fixed_discount';
          value = parseInt(numMatch[1], 10);
        }
      }

      // Code extraction or generator
      let code = '';
      const explicitCodeMatch = p.match(/code\s*[:=]?\s*["']?([A-Za-z0-9_-]{3,15})["']?/i);
      if (explicitCodeMatch) {
        code = explicitCodeMatch[1].toUpperCase();
      } else {
        const locPrefix = targetLocations[0] === 'All' ? 'AU' : targetLocations[0].substring(0, 3).toUpperCase();
        const typePrefix = containerSize !== 'all' ? containerSize.toUpperCase() : 'SAVE';
        code = `${locPrefix}${typePrefix}${value}`;
      }

      const name = `${targetLocations.join('/')} ${containerSize !== 'all' ? containerSize + ' ' : ''}${value}${type.startsWith('percent') ? '%' : '$'} ${isExclusive ? 'Exclusive' : 'Special'}`;
      const description = `${value}${type.startsWith('percent') ? '%' : '$'} discount for ${targetLocations.join(', ')} on ${serviceTypes.map(s => s.replace(/_/g, ' ')).join(', ')}${isExclusive ? ' (Exclusive code: no other discounts allowed)' : ' (Stackable)'}`;

      return res.json({
        success: true,
        promotion: {
          name,
          code,
          description,
          type,
          value,
          targetLocations,
          serviceTypes,
          containerSize,
          isExclusive,
          minDurationMonths: 0,
          active: true,
        },
        source: 'heuristic_engine',
      });
    }
  });

  // Admin-Only Gemini Copilot Chatbot with Function Execution
  app.post('/api/gemini/admin-chat', async (req, res) => {
    const { messages, currentConfig, leads } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const lastMessage = messages[messages.length - 1]?.text || '';
    const conversationHistory = messages
      .slice(-8)
      .map((m: any) => `${m.role === 'user' ? 'Admin' : 'Copilot'}: ${m.text}`)
      .join('\n');

    const configSummary = currentConfig ? {
      fuelSurchargeModel: currentConfig.fuelSurchargeModel || 'per_km',
      fuelSurchargeRatePerKm: currentConfig.fuelSurchargeRatePerKm || 0.45,
      fuelSurchargeZoneRates: currentConfig.fuelSurchargeZoneRates || { zone1: 15, zone2: 25, zone3: 35, zone4: 55 },
      promotionsCount: currentConfig.promotions?.length || 0,
      activePromos: currentConfig.promotions?.filter((p: any) => p.active).map((p: any) => `${p.code} (${p.name})`) || [],
      totalLeads: leads?.length || 0,
    } : {};

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY not set, using heuristic engine');
      }

      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });

      const systemPrompt = `You are the Portabox Australia Executive Admin Copilot & Autonomous Operations Assistant.
You assist Portabox admins in managing logistics, customer quotes, container inventory, tariffs, fuel surcharges, and discount codes.

Current Application Context:
- Fuel Levy Model: ${configSummary.fuelSurchargeModel || 'per_km'} ($${configSummary.fuelSurchargeRatePerKm || 0.45}/km or zone-based)
- Active Promotions (${configSummary.activePromos?.length || 0}): ${(configSummary.activePromos || []).join(', ') || 'None'}
- Total Registered Leads: ${configSummary.totalLeads || 0}
- Portabox Depot Locations: Adelaide, Melbourne, Sydney, Brisbane.

You can perform functions by outputting an "actions" array in your JSON response.
Available Action Types:
1. "CREATE_DISCOUNT_CODE":
   payload: {
     "name": string,
     "code": string,
     "description": string,
     "type": "percent_off_first_month" | "fixed_discount" | "free_initial_delivery" | "free_first_month" | "percent_off_interstate" | "free_container_upgrade",
     "value": number,
     "targetLocations": ("All" | "Adelaide" | "Melbourne" | "Sydney" | "Brisbane")[],
     "serviceTypes": ("storage_onsite" | "storage_portabox_site" | "local_moving" | "interstate_moving")[],
     "containerSize": "all" | "10ft" | "20ft",
     "isExclusive": boolean,
     "minDurationMonths": number,
     "active": boolean
   }
2. "TOGGLE_DISCOUNT_CODE":
   payload: { "code": string, "active": boolean }
3. "DELETE_DISCOUNT_CODE":
   payload: { "code": string }
4. "UPDATE_FUEL_SURCHARGE":
   payload: {
     "model": "per_km" | "zone_fixed",
     "ratePerKm"?: number,
     "zoneRates"?: { "zone1": number, "zone2": number, "zone3": number, "zone4": number },
     "chargePlannedLegsOnlyWhenOccurred"?: boolean
   }
5. "UPDATE_LEAD_STATUS":
   payload: { "leadId": string, "status": "new" | "contacted" | "quote_sent" | "booked" | "delivered" | "completed" | "lost" }
6. "ADD_LEAD_NOTE":
   payload: { "leadId": string, "note": string }
7. "CREATE_PHONE_BOOKING":
   payload: {
     "customerName": string,
     "customerPhone"?: string,
     "customerEmail"?: string,
     "deliveryAddress"?: string,
     "suburb"?: string,
     "postcode"?: string,
     "state"?: string,
     "containerSize"?: "10 m³" | "19 m³" | "25 m³" | "50 m³ (2x 25m³)",
     "serviceType"?: "Storage at Your Place" | "Depot Facility Storage",
     "monthlyRateAud"?: number,
     "legFeeAud"?: number,
     "discountAud"?: number,
     "hasNoPhoneOrEmail"?: boolean
   }

Return a strictly valid JSON response conforming to this schema:
{
  "reply": "Concise, professional, helpful response explaining what you did or answering the question in natural Australian business tone.",
  "actions": [
    {
      "type": "CREATE_DISCOUNT_CODE" | "TOGGLE_DISCOUNT_CODE" | "DELETE_DISCOUNT_CODE" | "UPDATE_FUEL_SURCHARGE" | "UPDATE_LEAD_STATUS" | "ADD_LEAD_NOTE" | "CREATE_PHONE_BOOKING",
      "summary": "Short readable summary of the function performed",
      "payload": { ... }
    }
  ],
  "suggestedFollowUps": ["Short follow up prompt 1", "Short follow up prompt 2"]
}

If no action is required (e.g. general questions or inquiries), leave the "actions" array empty [].`;

      const aiResponse = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `${systemPrompt}\n\nRecent Conversation:\n${conversationHistory}\n\nAdmin: "${lastMessage}"`,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const responseText = aiResponse.text || '{}';
      const parsed = JSON.parse(responseText);
      return res.json({
        success: true,
        reply: parsed.reply || 'Action processed.',
        actions: parsed.actions || [],
        suggestedFollowUps: parsed.suggestedFollowUps || [],
        source: 'gemini-3.8-flash',
      });
    } catch (err: any) {
      console.warn('Gemini admin chat fallback triggered:', err.message);

      // Intelligent Heuristic Copilot Engine
      const p = lastMessage.toLowerCase();
      const actions: any[] = [];
      let reply = '';
      const followUps: string[] = [];

      // 1. Discount Code Creation
      if (p.includes('create') && (p.includes('discount') || p.includes('promo') || p.includes('code') || p.includes('coupon'))) {
        const pctMatch = p.match(/(\d+)\s*%/);
        const dollarMatch = p.match(/\$\s*(\d+)/);
        const value = pctMatch ? parseInt(pctMatch[1], 10) : dollarMatch ? parseInt(dollarMatch[1], 10) : 20;
        const type = dollarMatch ? 'fixed_discount' : 'percent_off_first_month';

        const targetLocations: ('All' | 'Adelaide' | 'Melbourne' | 'Sydney' | 'Brisbane')[] = [];
        if (p.includes('adelaide')) targetLocations.push('Adelaide');
        if (p.includes('melbourne')) targetLocations.push('Melbourne');
        if (p.includes('sydney')) targetLocations.push('Sydney');
        if (p.includes('brisbane')) targetLocations.push('Brisbane');
        if (targetLocations.length === 0) targetLocations.push('All');

        const serviceTypes: any[] = [];
        if (p.includes('onsite') || p.includes('place')) serviceTypes.push('storage_onsite');
        if (p.includes('depot') || p.includes('portabox site') || p.includes('facility')) serviceTypes.push('storage_portabox_site');
        if (p.includes('local')) serviceTypes.push('local_moving');
        if (p.includes('interstate')) serviceTypes.push('interstate_moving');
        if (serviceTypes.length === 0) serviceTypes.push('storage_onsite', 'storage_portabox_site', 'local_moving', 'interstate_moving');

        let containerSize: 'all' | '10ft' | '20ft' = 'all';
        if (p.includes('10ft')) containerSize = '10ft';
        if (p.includes('20ft')) containerSize = '20ft';

        const isExclusive = p.includes('exclusive') && !p.includes('non-exclusive');
        const codeMatch = p.match(/code\s*[:=]?\s*["']?([A-Za-z0-9_-]{3,15})["']?/i);
        const code = codeMatch ? codeMatch[1].toUpperCase() : `${targetLocations[0] === 'All' ? 'AU' : targetLocations[0].substring(0, 3).toUpperCase()}${value}${isExclusive ? 'EXCL' : ''}`;

        actions.push({
          type: 'CREATE_DISCOUNT_CODE',
          summary: `Created ${isExclusive ? 'exclusive' : 'stackable'} discount code ${code} (${value}${type === 'fixed_discount' ? '$' : '%'} off)`,
          payload: {
            name: `${targetLocations.join('/')} ${value}${type === 'fixed_discount' ? '$' : '%'} Off Promo`,
            code,
            description: `${value}${type === 'fixed_discount' ? '$' : '%'} discount for ${targetLocations.join(', ')} on ${serviceTypes.map(s => s.replace(/_/g, ' ')).join(', ')}`,
            type,
            value,
            targetLocations,
            serviceTypes,
            containerSize,
            isExclusive,
            minDurationMonths: 0,
            active: true,
          },
        });

        reply = `I have created the promotional discount code **${code}** with a ${value}${type === 'fixed_discount' ? '$' : '%'} discount targeting ${targetLocations.join(', ')} for ${containerSize === 'all' ? 'all container sizes' : containerSize + ' units'}. It has been saved and is currently active.`;
        followUps.push(`Deactivate code ${code}`, `Create another discount for Adelaide`);
      }
      // 2. Toggle Discount Code (Activate / Deactivate)
      else if ((p.includes('deactivate') || p.includes('disable') || p.includes('activate') || p.includes('enable')) && (p.includes('promo') || p.includes('code') || p.includes('discount'))) {
        const isDeactivate = p.includes('deactivate') || p.includes('disable') || p.includes('turn off');
        const codeMatch = p.match(/\b([A-Z0-9_-]{4,15})\b/i);
        const code = codeMatch ? codeMatch[1].toUpperCase() : (currentConfig?.promotions?.[0]?.code || 'FREEDEL');

        actions.push({
          type: 'TOGGLE_DISCOUNT_CODE',
          summary: `${isDeactivate ? 'Deactivated' : 'Activated'} discount code ${code}`,
          payload: { code, active: !isDeactivate },
        });

        reply = `Discount code **${code}** has been ${isDeactivate ? 'deactivated' : 'activated'}. Customers ${isDeactivate ? 'will no longer be able to redeem this code' : 'can now redeem this code'} during checkout.`;
        followUps.push(`Show all active discount codes`, `Switch fuel levy to zone-based pricing`);
      }
      // 3. Delete Discount Code
      else if ((p.includes('delete') || p.includes('remove')) && (p.includes('promo') || p.includes('code') || p.includes('discount'))) {
        const codeMatch = p.match(/\b([A-Z0-9_-]{4,15})\b/i);
        const code = codeMatch ? codeMatch[1].toUpperCase() : '';
        if (code) {
          actions.push({
            type: 'DELETE_DISCOUNT_CODE',
            summary: `Deleted discount code ${code}`,
            payload: { code },
          });
          reply = `Discount code **${code}** has been permanently removed from the promotions registry.`;
        } else {
          reply = `Please specify which discount code you would like to delete.`;
        }
        followUps.push(`Show active discount codes`, `Create new discount code`);
      }
      // 4. Update Fuel Surcharge Model
      else if (p.includes('fuel') || p.includes('levy') || p.includes('surcharge')) {
        if (p.includes('zone') || p.includes('flat') || p.includes('fixed')) {
          actions.push({
            type: 'UPDATE_FUEL_SURCHARGE',
            summary: 'Switched Fuel Surcharge model to Zone-Based Fixed Rates',
            payload: {
              model: 'zone_fixed',
              zoneRates: { zone1: 15, zone2: 25, zone3: 35, zone4: 55 },
              chargePlannedLegsOnlyWhenOccurred: true,
            },
          });
          reply = `I have updated the Fuel Levy calculation model to **Zone-Based Fixed Pricing** ($15 for Zone 1, $25 for Zone 2, $35 for Zone 3, $55 for Zone 4). Future legs remain deferred until they actually occur.`;
        } else if (p.includes('km') || p.includes('per kilometer') || p.includes('per km') || p.includes('distance')) {
          const rateMatch = p.match(/\$?\s*(\d+(?:\.\d+)?)\s*(?:\/km|per km|c|cents)?/);
          const ratePerKm = rateMatch ? parseFloat(rateMatch[1]) : 0.45;
          actions.push({
            type: 'UPDATE_FUEL_SURCHARGE',
            summary: `Switched Fuel Surcharge model to Per-Km ($${ratePerKm}/km)`,
            payload: {
              model: 'per_km',
              ratePerKm,
              chargePlannedLegsOnlyWhenOccurred: true,
            },
          });
          reply = `I have set the Fuel Levy calculation model to **Per-Km Distance** at **$${ratePerKm}/km**. Delivery quotes will compute fuel based on actual highway transit distance.`;
        } else {
          reply = `Current Fuel Levy configuration is set to **${configSummary.fuelSurchargeModel === 'zone_fixed' ? 'Zone-Based Fixed' : 'Per-Km ($' + configSummary.fuelSurchargeRatePerKm + '/km)'}**. Would you like to switch to zone-based fixed pricing or adjust the per-km rate?`;
        }
        followUps.push(`Set fuel surcharge to $0.50/km`, `Switch fuel levy to zone-based pricing`);
      }
      // 5. Phone Booking / Call Center Intake with Credit Card (including no email/mobile)
      else if (p.includes('phone booking') || (p.includes('book') && (p.includes('phone') || p.includes('caller') || p.includes('credit card') || p.includes('no email')))) {
        let custName = 'Phone Customer';
        const forMatch = p.match(/(?:for|caller|customer|name(?:d)?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
        if (forMatch) {
          custName = forMatch[1];
        }

        let suburb = 'Adelaide';
        let postcode = '5000';
        let state = 'SA';
        if (p.includes('melbourne')) { suburb = 'Melbourne'; postcode = '3000'; state = 'VIC'; }
        else if (p.includes('sydney')) { suburb = 'Sydney'; postcode = '2000'; state = 'NSW'; }
        else if (p.includes('brisbane')) { suburb = 'Brisbane'; postcode = '4000'; state = 'QLD'; }

        let containerSize = '25 m³';
        if (p.includes('10m3') || p.includes('10ft') || p.includes('small')) containerSize = '10 m³';
        if (p.includes('19m3') || p.includes('medium')) containerSize = '19 m³';

        const hasNoContact = p.includes('no email') || p.includes('no phone') || p.includes('no mobile') || p.includes('just with credit card');

        actions.push({
          type: 'CREATE_PHONE_BOOKING',
          summary: `Created Phone Booking for ${custName} (${containerSize} in ${suburb}) via Credit Card${hasNoContact ? ' [No Phone/Email Option]' : ''}`,
          payload: {
            customerName: custName,
            suburb,
            postcode,
            state,
            deliveryAddress: `${suburb} ${state} ${postcode}`,
            containerSize,
            hasNoPhoneOrEmail: hasNoContact,
            monthlyRateAud: containerSize === '10 m³' ? 169 : containerSize === '19 m³' ? 199 : 219,
            legFeeAud: 149,
          },
        });

        reply = `I have taken the phone booking for **${custName}** (${containerSize} at ${suburb}) and authorized first month rental via Credit Card.${hasNoContact ? ' Marked under **Option: Customer does not have mobile phone or email**. Smartsheet row and formal quote document have been generated.' : ''}`;
        followUps.push(`Produce quote for ${custName}`, `View booking in Smartsheet`);
      }
      // 6. Query / Summary / Leads
      else if (p.includes('lead') || p.includes('customer') || p.includes('pipeline') || p.includes('quote')) {
        const total = leads?.length || 0;
        const booked = leads?.filter((l: any) => l.status === 'booked' || l.status === 'delivered').length || 0;
        const recent = (leads || []).slice(0, 3).map((l: any) => `• ${l.name || 'Lead'} (${l.containerName || 'Unit'}, ${l.originPostcode?.suburb || 'AU'} - ${l.status})`).join('\n');

        reply = `You currently have **${total} customer leads** in your CRM pipeline (${booked} booked/delivered).\n\nRecent activity:\n${recent || 'No recent leads recorded.'}`;
        followUps.push(`Show active promotions`, `Create 20% discount code for Melbourne`);
      }
      // General overview
      else {
        reply = `Hello! I'm your Portabox Operations, Call Center & Pricing Copilot. I can directly execute functions such as taking phone bookings with credit cards (including callers without mobile or email), producing quotes, creating targetable discount codes, configuring fuel levies, and updating customer leads. What would you like me to do?`;
        followUps.push(
          `Book 25m3 container for Sarah in Adelaide with credit card, no phone or email`,
          `Create 20% exclusive discount code for Melbourne 20ft units`,
          `Switch fuel levy to zone fixed pricing`
        );
      }

      return res.json({
        success: true,
        reply,
        actions,
        suggestedFollowUps: followUps,
        source: 'heuristic_copilot',
      });
    }
  });

  app.post('/api/smartsheet/webhook', async (req, res) => {
    const { processSmartsheetWebhook } = await import('../services/smartsheetService');
    try {
      await processSmartsheetWebhook(req.body);
      res.status(200).send('Webhook processed');
    } catch (error) {
      console.error('Smartsheet Webhook Error:', error);
      res.status(500).send('Error');
    }
  });

  app.post('/api/smartsheet/sync', async (req, res) => {
    const { syncInventoryToSmartsheet } = await import('../services/smartsheetService');
    try {
      await syncInventoryToSmartsheet(req.body);
      res.json({ success: true });
    } catch (error) {
      console.error('Smartsheet Sync Error:', error);
      res.status(500).json({ error: 'Sync failed' });
    }
  });
}
