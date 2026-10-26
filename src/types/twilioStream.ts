export interface TranscriptTurn {
  id: string;
  speaker: 'customer' | 'agent' | 'ivr';
  speakerName: string;
  text: string;
  timestamp: string;
  confidence: number;
  isFinal: boolean;
}

export interface StreamActionItem {
  id: string;
  title: string;
  description: string;
  category: 'rental_extension' | 'pickup_schedule' | 'damage_report' | 'billing_refund' | 'sms_dispatch' | 'general' | 'refund';
  targetTab?: 'extend' | 'pickup' | 'damage' | 'refunds' | 'payment_plan' | 'card_update' | 'sms' | 'size_change' | 'permit_hoa' | 'dispute_audit' | 'cancellation';
  targetPayload?: Record<string, any>;
  completed: boolean;
}

export interface StreamSummaryData {
  callId: string;
  streamSid: string;
  status: 'streaming' | 'completed' | 'paused' | 'idle';
  streamSource: 'twilio_media_stream' | 'twilio_recording_transcript' | 'live_webrtc_stream';
  codec: string;
  sampleRateHz: number;
  packetsReceived: number;
  bytesReceived: number;
  latencyMs: number;
  executiveSummary: string;
  bulletPoints: {
    category: string;
    points: string[];
  }[];
  sentiment: 'positive' | 'neutral' | 'frustrated' | 'urgent';
  sentimentScore: number; // -100 to 100
  customerIntent: string;
  keyEntities: {
    containerSize?: string;
    orderNumber?: string;
    datesMentioned?: string[];
    amountsMentioned?: string[];
    siteAccessNotes?: string;
    urgencyLevel?: 'Low' | 'Standard' | 'High' | 'Immediate Action Required';
  };
  actionItems: StreamActionItem[];
  transcripts: TranscriptTurn[];
  lastUpdated: string;
  recordingUrl?: string;
}

export interface TwilioStreamPreset {
  id: string;
  customerName: string;
  customerPhone?: string;
  customerId: string;
  scenarioTitle?: string;
  title?: string;
  containerDetails?: string;
  sampleTurns?: TranscriptTurn[];
  turns?: TranscriptTurn[];
  fallbackSummary: {
    executiveSummary: string;
    bulletPoints: { category: string; points: string[] }[];
    sentiment: 'positive' | 'neutral' | 'frustrated' | 'urgent';
    sentimentScore: number;
    customerIntent: string;
    keyEntities: {
      containerSize?: string;
      orderNumber?: string;
      datesMentioned?: string[];
      amountsMentioned?: string[];
      siteAccessNotes?: string;
      urgencyLevel?: 'Low' | 'Standard' | 'High' | 'Immediate Action Required';
    };
    actionItems: StreamActionItem[];
  };
}
