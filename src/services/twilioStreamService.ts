import { TranscriptTurn, StreamActionItem, StreamSummaryData, TwilioStreamPreset } from '../types/twilioStream';
import { CustomerAccount, loadCustomerAccounts } from './customerPortalService';
import { TelephonyCall, getActiveCall, loadTelephonyCalls, saveTelephonyCalls, notifyTelephonyUpdate } from './telephonyService';

const STREAM_STORAGE_PREFIX = 'portabox_stream_summary_';
const ACTIVE_STREAM_KEY = 'portabox_active_stream_session';

export const TWILIO_STREAM_PRESETS: TwilioStreamPreset[] = [
  {
    id: 'preset-sarah-extension',
    customerName: 'Sarah Jenkins',
    customerPhone: '0412 849 201',
    customerId: 'CUST-8021',
    scenarioTitle: 'Rental Extension & Driveway Stability Check',
    containerDetails: '25 m³ Portabox Pro (PBX-8041) · Placed at 42 Osmond Terrace, Norwood',
    sampleTurns: [
      {
        id: 'turn-1',
        speaker: 'ivr',
        speakerName: 'Portabox Voice IVR',
        text: 'Thank you for calling Portabox Australia. Caller ID recognized for Sarah Jenkins. Connecting to your account specialist.',
        timestamp: '10:14:02 AM',
        confidence: 0.99,
        isFinal: true,
      },
      {
        id: 'turn-2',
        speaker: 'agent',
        speakerName: 'Dave (Portabox Agent)',
        text: 'Hi Sarah, Dave here from Portabox Adelaide! I see your 25 cubic meter container at Osmond Terrace. How can I help you today?',
        timestamp: '10:14:08 AM',
        confidence: 0.98,
        isFinal: true,
      },
      {
        id: 'turn-3',
        speaker: 'customer',
        speakerName: 'Sarah Jenkins',
        text: 'Hi Dave! We are doing some extensive kitchen and dining renovations and the builders are running a few weeks behind schedule. We definitely need to extend our container rental by another 2 months.',
        timestamp: '10:14:18 AM',
        confidence: 0.96,
        isFinal: true,
      },
      {
        id: 'turn-4',
        speaker: 'agent',
        speakerName: 'Dave (Portabox Agent)',
        text: 'No problem at all Sarah. We can certainly extend it for two months. If you lock in 2 or 3 months upfront, we also apply our 5% loyalty discount on the monthly storage fee of $259.',
        timestamp: '10:14:31 AM',
        confidence: 0.97,
        isFinal: true,
      },
      {
        id: 'turn-5',
        speaker: 'customer',
        speakerName: 'Sarah Jenkins',
        text: 'That sounds perfect! Please apply the extension to my Visa card on file. Also, after yesterday\'s wind storm, I noticed the front leveling block moved slightly on our sloped driveway. The container is completely safe, but could someone take a look when in the area?',
        timestamp: '10:14:48 AM',
        confidence: 0.95,
        isFinal: true,
      },
      {
        id: 'turn-6',
        speaker: 'agent',
        speakerName: 'Dave (Portabox Agent)',
        text: 'Understood. I will log a routine yard check for driver Dave to inspect the timber leveling pads, and lock in your 2-month extension right away with the discounted rate.',
        timestamp: '10:15:02 AM',
        confidence: 0.98,
        isFinal: true,
      },
      {
        id: 'turn-7',
        speaker: 'customer',
        speakerName: 'Sarah Jenkins',
        text: 'Thank you so much Dave, that gives us huge peace of mind. Have a wonderful day!',
        timestamp: '10:15:11 AM',
        confidence: 0.97,
        isFinal: true,
      },
    ],
    fallbackSummary: {
      executiveSummary:
        'Customer Sarah Jenkins called regarding her active 25 m³ container rental in Norwood. She requested a 2-month rental extension due to builder delays and requested a driver inspection of the driveway leveling block following windy weather.',
      bulletPoints: [
        {
          category: '🎯 Customer Intent & Objectives',
          points: [
            'Extend current 25 m³ container rental by 2 additional months.',
            'Confirm payment method using saved Visa on file (•••• 9142).',
            'Request precautionary site check on front leveling timber pads.',
          ],
        },
        {
          category: '📦 Container & Logistics Specs',
          points: [
            'Unit: 25 m³ Portabox Pro (ID: PBX-8041, Order #PBO-9841).',
            'Location: 42 Osmond Terrace, Norwood SA 5067 (Driveway placement).',
            'Current standard monthly rate: $259.00 / month.',
          ],
        },
        {
          category: '⚠️ Site Access & Safety Constraints',
          points: [
            'Slight driveway slope noted; front timber ground pad shifted slightly during high wind.',
            'Container remains stable, but customer requested driver visual inspection.',
          ],
        },
        {
          category: '💳 Billing & Commercial Terms',
          points: [
            'Eligible for 5% multi-month rental extension discount ($246.05/mo).',
            'Customer authorized direct charge to existing Braintree vault payment token.',
          ],
        },
      ],
      sentiment: 'positive',
      sentimentScore: 84,
      customerIntent: 'Rental Extension & Ground Pad Inspection',
      keyEntities: {
        containerSize: '25 m³ Portabox Pro',
        orderNumber: 'PBO-9841',
        datesMentioned: ['+2 Months Extension', 'Immediate inspection'],
        amountsMentioned: ['$259/mo', '5% discount ($246.05/mo)'],
        siteAccessNotes: 'Driveway sloped; verify front timber leveling blocks.',
        urgencyLevel: 'Standard',
      },
      actionItems: [
        {
          id: 'act-1',
          title: 'Apply 2-Month Rental Extension',
          description: 'Process 2-month extension with 5% discount on Order #PBO-9841.',
          category: 'rental_extension',
          targetTab: 'extend',
          targetPayload: { additionalMonths: 2, orderId: 'ORD-9841' },
          completed: false,
        },
        {
          id: 'act-2',
          title: 'Dispatch Driver for Ground Pad Check',
          description: 'Notify Metro fleet driver to inspect leveling pads at 42 Osmond Tce.',
          category: 'damage_report',
          targetTab: 'damage',
          targetPayload: { category: 'Floor moisture / stain', severity: 'Minor (Usable)' },
          completed: false,
        },
        {
          id: 'act-3',
          title: 'Send Confirmation SMS to Sarah',
          description: 'Send SMS with revised rental dates and updated payment receipt.',
          category: 'sms_dispatch',
          targetTab: 'sms',
          completed: false,
        },
      ],
    },
  },
  {
    id: 'preset-david-pickup',
    customerName: 'David Miller',
    customerPhone: '0433 912 304',
    customerId: 'CUST-8022',
    scenarioTitle: 'Commercial Fit-Out Complete · Urgent Pickup Scheduled',
    containerDetails: '25 m³ Commercial Large (PBX-8042) · Placed at 18 King William Rd, Unley',
    sampleTurns: [
      {
        id: 'turn-d1',
        speaker: 'ivr',
        speakerName: 'Portabox Voice IVR',
        text: 'Inbound call from recognized trade contractor David Miller (BuilderPro Pty Ltd). Priority routing enabled.',
        timestamp: '11:02:10 AM',
        confidence: 0.99,
        isFinal: true,
      },
      {
        id: 'turn-d2',
        speaker: 'agent',
        speakerName: 'Chloe (Portabox Agent)',
        text: 'G\'day David, Chloe from Portabox. How did the King William Road retail fit-out go?',
        timestamp: '11:02:18 AM',
        confidence: 0.97,
        isFinal: true,
      },
      {
        id: 'turn-d3',
        speaker: 'customer',
        speakerName: 'David Miller',
        text: 'Morning Chloe! Handover was signed off this morning. Both containers are empty and broom-clean. We need them picked up this Friday October 22nd morning so council doesn\'t fine us for parking bay access.',
        timestamp: '11:02:30 AM',
        confidence: 0.96,
        isFinal: true,
      },
      {
        id: 'turn-d4',
        speaker: 'agent',
        speakerName: 'Chloe (Portabox Agent)',
        text: 'Fantastic news on handover! Friday morning window between 8:00 AM and 11:30 AM is open for our heavy tilt-tray rig. Is the rear gate code still 4821?',
        timestamp: '11:02:44 AM',
        confidence: 0.98,
        isFinal: true,
      },
      {
        id: 'turn-d5',
        speaker: 'customer',
        speakerName: 'David Miller',
        text: 'Yes, gate code is 4821. Driveway is completely clear and horizontal for horizontal level-lift. Can you text me driver tracking when he departs the depot?',
        timestamp: '11:02:58 AM',
        confidence: 0.97,
        isFinal: true,
      },
    ],
    fallbackSummary: {
      executiveSummary:
        'BuilderPro contractor David Miller called to book final pickup for the 25 m³ Commercial Large container at King William Rd, Unley. Job is finished, units are empty, and collection is booked for Friday Oct 22 morning window.',
      bulletPoints: [
        {
          category: '🎯 Customer Intent & Objectives',
          points: [
            'Schedule final retrieval of 25 m³ Commercial Large container.',
            'Target Date: Friday, 22 October 2026 (Morning Window 8:00 AM – 11:30 AM).',
            'Avoid council street occupation penalties.',
          ],
        },
        {
          category: '📦 Container & Logistics Specs',
          points: [
            'Unit: 25 m³ Commercial Large (ID: PBX-8042, Order #PBO-9842).',
            'Site: 18 King William Rd, Unley SA 5061.',
            'Container condition: Emptied and broom-clean, ready for level-lift tilt tray.',
          ],
        },
        {
          category: '⚠️ Site Access & Safety Constraints',
          points: [
            'Security Gate Access PIN: 4821.',
            'Clear overhead clearance confirmed; level ground for tilt-tray retrieval.',
          ],
        },
        {
          category: '💳 Billing & Commercial Terms',
          points: [
            'Commercial trade account in good standing ($389/mo paid upfront).',
            'Zero pending collection fees; dispatch ETA tracking link via SMS.',
          ],
        },
      ],
      sentiment: 'positive',
      sentimentScore: 92,
      customerIntent: 'Final Container Pickup Booking',
      keyEntities: {
        containerSize: '25 m³ Commercial Large',
        orderNumber: 'PBO-9842',
        datesMentioned: ['Friday 22 October 2026', 'Morning Window 8:00-11:30 AM'],
        siteAccessNotes: 'Gate PIN 4821; clear horizontal access.',
        urgencyLevel: 'High',
      },
      actionItems: [
        {
          id: 'act-d1',
          title: 'Schedule Pickup for Oct 22 Morning Window',
          description: 'Lock in Friday morning collection with driver Dave in fleet manifest.',
          category: 'pickup_schedule',
          targetTab: 'pickup',
          targetPayload: {
            pickupDate: '2026-10-22',
            pickupSlot: 'Morning Window (8:00 AM – 11:30 AM)',
            pickupInstructions: 'Gate PIN: 4821. Broom-clean confirmed.',
          },
          completed: false,
        },
        {
          id: 'act-d2',
          title: 'Dispatch Live Tracking SMS',
          description: 'Send automated SMS with live GPS tracking link when driver departs.',
          category: 'sms_dispatch',
          targetTab: 'sms',
          completed: false,
        },
      ],
    },
  },
  {
    id: 'preset-marcus-damage',
    customerName: 'Marcus Wong',
    customerPhone: '0420 551 892',
    customerId: 'CUST-8023',
    scenarioTitle: 'Heavy Storm Ingress Concern & Rapid Swap Inquiry',
    containerDetails: '16 m³ Standard Box (PBX-8043) · Placed at 12 High Street, Burnside',
    sampleTurns: [
      {
        id: 'turn-m1',
        speaker: 'ivr',
        speakerName: 'Portabox Voice IVR',
        text: 'Inbound caller Marcus Wong matched by mobile 0420 551 892. Connected to urgent claims line.',
        timestamp: '02:15:20 PM',
        confidence: 0.99,
        isFinal: true,
      },
      {
        id: 'turn-m2',
        speaker: 'customer',
        speakerName: 'Marcus Wong',
        text: 'Hello, we had a torrential downpour an hour ago and I checked on our furniture inside the box. There\'s a small trickle of water near the bottom corner of the rubber door seal.',
        timestamp: '02:15:32 PM',
        confidence: 0.95,
        isFinal: true,
      },
      {
        id: 'turn-m3',
        speaker: 'agent',
        speakerName: 'Dave (Portabox Agent)',
        text: 'Marcus, I\'m so sorry to hear that. All our containers are marine-grade weather sealed, so a seal leak is taken very seriously. Has any of your furniture or belongings absorbed water?',
        timestamp: '02:15:45 PM',
        confidence: 0.98,
        isFinal: true,
      },
      {
        id: 'turn-m4',
        speaker: 'customer',
        speakerName: 'Marcus Wong',
        text: 'Fortunately everything is wrapped in our Portabox furniture blankets so nothing is ruined yet. But we have another storm front arriving tomorrow evening, so we need either a replacement seal or a swap immediately.',
        timestamp: '02:16:01 PM',
        confidence: 0.96,
        isFinal: true,
      },
      {
        id: 'turn-m5',
        speaker: 'agent',
        speakerName: 'Dave (Portabox Agent)',
        text: 'Understood Marcus. You have our Silver Container Care Insurance active which includes $25,000 weather coverage. I am logging an emergency inspection with our yard supervisor right now to reseal or swap before 4:00 PM tomorrow.',
        timestamp: '02:16:18 PM',
        confidence: 0.98,
        isFinal: true,
      },
    ],
    fallbackSummary: {
      executiveSummary:
        'Customer Marcus Wong called to report minor water trickle near the door seal of unit PBX-8043 in Burnside following a severe thunderstorm. Goods are protected by moving blankets. Customer holds Silver Insurance ($25k). Emergency swap/reseal scheduled before tomorrow storm front.',
      bulletPoints: [
        {
          category: '🎯 Customer Intent & Objectives',
          points: [
            'Report weather ingress near bottom door seal.',
            'Request immediate reseal or container swap before second storm front tomorrow.',
            'Confirm contents insurance coverage status.',
          ],
        },
        {
          category: '📦 Container & Logistics Specs',
          points: [
            'Unit: 16 m³ Standard Portabox (ID: PBX-8043, Order #PBO-9843).',
            'Location: 12 High Street, Burnside SA 5066.',
            'Belongings protected in heavy-duty furniture blankets; no ruined goods currently.',
          ],
        },
        {
          category: '⚠️ Site Access & Safety Constraints',
          points: [
            'Time-sensitive: storm forecast within 24 hours.',
            'Driveway accessible for rapid seal replacement service vehicle.',
          ],
        },
        {
          category: '💳 Billing & Insurance Protection',
          points: [
            'Active Silver Policy (#POL-8023) covering up to $25,000 for storm/water ingress.',
            'Zero replacement surcharge under Portabox weather guarantee.',
          ],
        },
      ],
      sentiment: 'urgent',
      sentimentScore: -25,
      customerIntent: 'Weather Seal Leak & Emergency Reseal Request',
      keyEntities: {
        containerSize: '16 m³ Standard',
        orderNumber: 'PBO-9843',
        datesMentioned: ['Before 4:00 PM Tomorrow'],
        urgencyLevel: 'Immediate Action Required',
      },
      actionItems: [
        {
          id: 'act-m1',
          title: 'Log Urgent Damage Report: Door Seal Leak',
          description: 'Submit report with priority "Critical" and flag for yard supervisor replacement.',
          category: 'damage_report',
          targetTab: 'damage',
          targetPayload: {
            category: 'Door seal leak',
            severity: 'Moderate (Action required)',
            replaceContainerRequested: true,
          },
          completed: false,
        },
        {
          id: 'act-m2',
          title: 'Dispatch Reseal Technician / Swap Vehicle',
          description: 'Schedule maintenance van to inspect Burnside site prior to storm.',
          category: 'general',
          completed: false,
        },
      ],
    },
  },
  {
    id: 'preset-liam-upgrade',
    title: 'Liam Henderson: Mid-Packing Upgrade (12ft to 16ft Unit)',
    customerId: 'CUST-8023',
    customerName: 'Liam Henderson',
    turns: [
      {
        id: 'turn-lu1',
        speaker: 'customer',
        speakerName: 'Liam Henderson',
        text: 'Hi there, I have an upcoming reservation for a 10 m³ container (PBO-9915), but we started packing our living room today and realized we have way more bulky furniture than we thought. Can we upgrade to the 16-foot 25 m³ unit before delivery?',
        timestamp: '11:05:12 AM',
        confidence: 0.96,
        isFinal: true,
      },
      {
        id: 'turn-lu2',
        speaker: 'agent',
        speakerName: 'Dave (Portabox Agent)',
        text: 'G\'day Liam! Absolutely. Let me run a live check on our Dry Creek depot inventory. Yes, we have 3 Grade A+ 25 m³ weatherproof units available in Bay 04. The monthly rate adjusts from $199 to $259 per month. We can bind that to your order and issue an amended contract addendum right now.',
        timestamp: '11:05:28 AM',
        confidence: 0.98,
        isFinal: true,
      },
      {
        id: 'turn-lu3',
        speaker: 'customer',
        speakerName: 'Liam Henderson',
        text: 'That\'s fantastic news! Yes please, commit the upgrade to the 25 m³ unit. Will the delivery window stay the same?',
        timestamp: '11:05:42 AM',
        confidence: 0.97,
        isFinal: true,
      },
      {
        id: 'turn-lu4',
        speaker: 'agent',
        speakerName: 'Dave (Portabox Agent)',
        text: 'Yes mate, morning window 8:00 AM – 11:30 AM is locked in on our horizontal level-lift truck. I\'m generating your amended addendum now.',
        timestamp: '11:05:58 AM',
        confidence: 0.98,
        isFinal: true,
      },
    ],
    fallbackSummary: {
      executiveSummary:
        'Customer Liam Henderson called requesting a container size upgrade from 10 m³ (12-foot) to 25 m³ (16-foot Pro) due to more furniture than anticipated. Depot stock confirmed available at Dry Creek. Rate recalculated from $199 to $259/mo.',
      bulletPoints: [
        {
          category: '🎯 Customer Intent & Objectives',
          points: [
            'Upgrade reservation from 10 m³ (12ft) to 25 m³ (16ft Pro) mid-packing.',
            'Confirm inventory availability at Dry Creek Depot.',
            'Maintain scheduled morning delivery window.',
          ],
        },
        {
          category: '📦 Container & Logistics Specs',
          points: [
            'Order: PBO-9915 (Allocated Unit: PB-BOX-10-044 -> New Unit: PB-BOX-25-104).',
            'New Monthly Storage Rate: $259.00 / month (+$60/mo difference).',
            'Contract Addendum required to bind updated size.',
          ],
        },
      ],
      sentiment: 'positive',
      sentimentScore: 88,
      customerIntent: 'Container Size Upgrade (12ft to 16ft Pro)',
      keyEntities: {
        containerSize: '25 m³ Portabox Pro',
        orderNumber: 'PBO-9915',
        datesMentioned: ['Morning delivery 8:00 AM – 11:30 AM'],
        amountsMentioned: ['$259/mo (+$60/mo)'],
        urgencyLevel: 'Standard',
      },
      actionItems: [
        {
          id: 'act-lu1',
          title: 'Upgrade Container to 25 m³ (16ft Pro)',
          description: 'Reallocate depot unit, adjust monthly rate to $259, and issue contract addendum.',
          category: 'general',
          targetTab: 'size_change',
          targetPayload: {
            orderId: 'ORD-9915',
            targetSize: 'large_25m3',
            upgradeReason: 'Customer requested upgrade from 12ft to 16ft unit mid-packing',
          },
          completed: false,
        },
      ],
    },
  },
  {
    id: 'preset-marcus-permit',
    title: 'Marcus Brody: Street Placement Council Permit Clearance',
    customerId: 'CUST-8024',
    customerName: 'Marcus Brody',
    turns: [
      {
        id: 'turn-mp1',
        speaker: 'customer',
        speakerName: 'Marcus Brody',
        text: 'Hello, my order PBO-7719 for 14 Jetty Road Glenelg is currently on a "Permit Required" hold because we\'re placing it on the public parking bay. I just received the formal permit from City of Holdfast Bay Council (Permit #CP-2026-88). Can we clear the hold?',
        timestamp: '09:20:10 AM',
        confidence: 0.96,
        isFinal: true,
      },
      {
        id: 'turn-mp2',
        speaker: 'agent',
        speakerName: 'Dave (Portabox Agent)',
        text: 'Hi Marcus, wonderful! Let me verify the council permit details and attach the approval document. Once cleared, the operational dispatch hold will be removed and driver Dave Higgins will be assigned to your route.',
        timestamp: '09:20:25 AM',
        confidence: 0.98,
        isFinal: true,
      },
      {
        id: 'turn-mp3',
        speaker: 'customer',
        speakerName: 'Marcus Brody',
        text: 'Thank you Dave. We also have four high-visibility reflective cones ready to place around the container corners as mandated by the council.',
        timestamp: '09:20:38 AM',
        confidence: 0.97,
        isFinal: true,
      },
    ],
    fallbackSummary: {
      executiveSummary:
        'Marcus Brody called to clear a "Permit Required" hold on order PBO-7719 at 14 Jetty Road Glenelg. City of Holdfast Bay street parking permit #CP-2026-88 provided. Safety cones on site. Dispatch hold cleared.',
      bulletPoints: [
        {
          category: '🎯 Customer Intent & Objectives',
          points: [
            'Provide approved municipal street placement permit #CP-2026-88.',
            'Clear operational dispatch hold to allow driver assignment.',
            'Confirm roadside safety cone requirements.',
          ],
        },
        {
          category: '📦 Container & Logistics Specs',
          points: [
            'Order: PBO-7719 · Unit: PB-BOX-25-112 (25 m³ Container).',
            'Location: 14 Jetty Road, Glenelg SA 5045 (Roadside nature strip).',
            'Council: City of Holdfast Bay Council (14-day permit).',
          ],
        },
      ],
      sentiment: 'positive',
      sentimentScore: 85,
      customerIntent: 'Municipal Permit Clearance & Dispatch Release',
      keyEntities: {
        containerSize: '25 m³ Portabox Pro',
        orderNumber: 'PBO-7719',
        datesMentioned: ['14-day council permit'],
        siteAccessNotes: 'Roadside nature strip; safety cones deployed.',
        urgencyLevel: 'Standard',
      },
      actionItems: [
        {
          id: 'act-mp1',
          title: 'Approve Permit & Release Dispatch Hold',
          description: 'Attach City of Holdfast Bay permit #CP-2026-88 and unlock driver dispatch.',
          category: 'general',
          targetTab: 'permit_hoa',
          targetPayload: {
            orderId: 'ORD-7719',
            permitStatus: 'Permit Approved',
            permitNotes: 'City of Holdfast Bay Council Permit #CP-2026-88 verified',
          },
          completed: false,
        },
      ],
    },
  },
  {
    id: 'preset-jessica-dispute',
    title: 'Jessica Taylor: Blocked Driveway Dispute & Fee Waiver',
    customerId: 'CUST-8025',
    customerName: 'Jessica Taylor',
    turns: [
      {
        id: 'turn-jd1',
        speaker: 'customer',
        speakerName: 'Jessica Taylor',
        text: 'Hi, I received a $99 dry-run invoice for order PBO-6621 yesterday. The driver aborted delivery claiming a neighbor\'s utility vehicle was blocking our shared driveway. But my neighbor moved it only 15 minutes later! Can we please review this fee?',
        timestamp: '01:40:15 PM',
        confidence: 0.95,
        isFinal: true,
      },
      {
        id: 'turn-jd2',
        speaker: 'agent',
        speakerName: 'Dave (Portabox Agent)',
        text: 'Hello Jessica, I understand your frustration. Looking at the driver audit log, driver Dave Higgins recorded GPS coordinates at 10:45 AM and took a timestamped photo showing clearance was under 2.4 meters. Under Section 3.1 of our signed terms, a 3.5-meter clear driveway is required. However, as you are a valued customer and the vehicle was moved promptly, I can review this with our manager and issue a one-time courtesy credit of $99.',
        timestamp: '01:40:42 PM',
        confidence: 0.98,
        isFinal: true,
      },
      {
        id: 'turn-jd3',
        speaker: 'customer',
        speakerName: 'Jessica Taylor',
        text: 'That would be so much appreciated! We really want to proceed with Portabox and will make sure the driveway is completely clear next time.',
        timestamp: '01:40:58 PM',
        confidence: 0.97,
        isFinal: true,
      },
    ],
    fallbackSummary: {
      executiveSummary:
        'Customer Jessica Taylor called disputing an aborted delivery dry-run fee ($99) on order PBO-6621 in Unley. Driver photographic evidence and GPS timestamp confirmed neighbor ute blocked entrance (<2.4m clearance). One-time courtesy credit of $99 approved as customer goodwill.',
      bulletPoints: [
        {
          category: '🎯 Customer Intent & Objectives',
          points: [
            'Dispute $99 dry-run delivery fee on order PBO-6621.',
            'Explain that neighbor vehicle was moved 15 minutes after driver arrived.',
            'Request courtesy credit waiver and reschedule delivery.',
          ],
        },
        {
          category: '📦 Container & Logistics Specs',
          points: [
            'Order: PBO-6621 · Unit: PB-BOX-25-055 (25 m³ Container).',
            'GPS Stamp: -34.9512, 138.6044 (88 Unley Road, Unley SA).',
            'Clearance violation confirmed by driver photo; resolved via courtesy credit.',
          ],
        },
      ],
      sentiment: 'neutral',
      sentimentScore: 45,
      customerIntent: 'Aborted Delivery Fee Dispute & Goodwill Courtesy Credit',
      keyEntities: {
        containerSize: '25 m³ Portabox Pro',
        orderNumber: 'PBO-6621',
        datesMentioned: ['Reschedule to next available slot'],
        amountsMentioned: ['$99 dry-run fee (waived via courtesy credit)'],
        siteAccessNotes: 'Neighbor vehicle blocked entrance; site photos reviewed.',
        urgencyLevel: 'High',
      },
      actionItems: [
        {
          id: 'act-jd1',
          title: 'Audit GPS & Issue $99 Courtesy Credit',
          description: 'Reconcile dry-run invoice and issue $99 goodwill courtesy credit to customer balance.',
          category: 'refund',
          targetTab: 'dispute_audit',
          targetPayload: {
            orderId: 'ORD-6621',
            disputeOutcome: 'courtesy_credit',
            disputeExplanation: 'One-time courtesy credit issued as customer goodwill adjustment',
          },
          completed: false,
        },
      ],
    },
  },
  {
    id: 'preset-cancellation-policy',
    title: 'Liam Henderson: Pre-Delivery Cancellation (>48h Full Refund)',
    customerId: 'CUST-8023',
    customerName: 'Liam Henderson',
    turns: [
      {
        id: 'turn-cp1',
        speaker: 'customer',
        speakerName: 'Liam Henderson',
        text: 'Hello, our house purchase contract just fell through this morning and our move has been called off. Our delivery is scheduled for next week. Can we cancel and get our booking deposit refunded?',
        timestamp: '03:10:05 PM',
        confidence: 0.96,
        isFinal: true,
      },
      {
        id: 'turn-cp2',
        speaker: 'agent',
        speakerName: 'Dave (Portabox Agent)',
        text: 'I\'m so sorry to hear that your contract fell through Liam. Because your delivery is scheduled in 5 days, your notice is well over our 48-hour policy threshold. You are eligible for a 100% full refund of your $348 deposit with zero penalty fee. I can process the gateway refund and release the reserved container right now.',
        timestamp: '03:10:28 PM',
        confidence: 0.98,
        isFinal: true,
      },
      {
        id: 'turn-cp3',
        speaker: 'customer',
        speakerName: 'Liam Henderson',
        text: 'Thank you so much Dave. That makes a stressful day a lot easier. We will definitely use Portabox when we buy our next home.',
        timestamp: '03:10:44 PM',
        confidence: 0.97,
        isFinal: true,
      },
    ],
    fallbackSummary: {
      executiveSummary:
        'Liam Henderson called to cancel move due to an aborted house purchase. Delivery scheduled in 5 days (110 hours notice). Compliant with >48h policy. 100% full refund of $348 deposit processed via Braintree. Fleet unit released.',
      bulletPoints: [
        {
          category: '🎯 Customer Intent & Objectives',
          points: [
            'Cancel container delivery due to aborted home purchase.',
            'Verify refund eligibility under >48 hour cancellation policy.',
            'Cease monthly direct debit autopay cycle.',
          ],
        },
        {
          category: '📦 Container & Logistics Specs',
          points: [
            'Order: PBO-9915 · Scheduled delivery: 2026-10-19 (110 hours advance notice).',
            'Full Refund Amount: $348.00 (Zero cancellation penalty).',
            'Unit PB-BOX-10-044 released back to Dry Creek Depot pool.',
          ],
        },
      ],
      sentiment: 'positive',
      sentimentScore: 75,
      customerIntent: 'Advance Cancellation & 100% Policy Deposit Refund',
      keyEntities: {
        containerSize: '10 m³ Portabox',
        orderNumber: 'PBO-9915',
        datesMentioned: ['Delivery in 5 days (110 hrs advance notice)'],
        amountsMentioned: ['$348.00 full refund (zero penalty)'],
        urgencyLevel: 'Standard',
      },
      actionItems: [
        {
          id: 'act-cp1',
          title: 'Process Policy Cancellation & $348 Refund',
          description: 'Release reserved fleet container, cancel dispatch ticket, and refund $348 via Braintree.',
          category: 'refund',
          targetTab: 'cancellation',
          targetPayload: {
            orderId: 'ORD-9915',
            cancelReason: 'Home purchase settlement aborted 5 days prior to scheduled move',
          },
          completed: false,
        },
      ],
    },
  },
];

// Helper to broadcast stream updates
export function notifyStreamUpdate() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('portabox-stream-update'));
  }
}

// ----------------- STORAGE LOAD & SAVE -----------------

export function loadStreamSummary(keyId: string): StreamSummaryData | null {
  try {
    const raw = localStorage.getItem(`${STREAM_STORAGE_PREFIX}${keyId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveStreamSummary(summary: StreamSummaryData): void {
  try {
    localStorage.setItem(`${STREAM_STORAGE_PREFIX}${summary.callId}`, JSON.stringify(summary));
    localStorage.setItem(ACTIVE_STREAM_KEY, summary.callId);
    notifyStreamUpdate();
  } catch (err) {
    console.error('Error saving stream summary:', err);
  }
}

export function getActiveStreamSession(): StreamSummaryData | null {
  try {
    const activeId = localStorage.getItem(ACTIVE_STREAM_KEY);
    if (!activeId) return null;
    return loadStreamSummary(activeId);
  } catch {
    return null;
  }
}

// ----------------- REAL-TIME SIMULATION & ENGINE -----------------

let streamTimer: any = null;
let audioPacketInterval: any = null;

export function startTwilioMediaStream(
  presetId = 'preset-sarah-extension',
  customer?: CustomerAccount | null
): StreamSummaryData {
  stopTwilioMediaStream();

  const preset = TWILIO_STREAM_PRESETS.find((p) => p.id === presetId) || TWILIO_STREAM_PRESETS[0];
  const targetCustomer = customer || loadCustomerAccounts().find((c) => c.id === preset.customerId) || null;
  const callId = `TW-STRM-${Date.now().toString().slice(-6)}`;
  const streamSid = `MZ${Math.random().toString(36).substring(2, 12).toUpperCase()}${Date.now().toString().slice(-6)}`;

  // Start with first 2 turns, then stream remaining turns sequentially
  const allTurns = preset.sampleTurns || preset.turns || [];
  const initialTurns = allTurns.slice(0, 2);

  const initialSummary: StreamSummaryData = {
    callId,
    streamSid,
    status: 'streaming',
    streamSource: 'twilio_media_stream',
    codec: 'audio/x-mulaw (PCMU 8000Hz 64kbps)',
    sampleRateHz: 8000,
    packetsReceived: 42,
    bytesReceived: 6720,
    latencyMs: 24,
    executiveSummary: `${targetCustomer?.firstName || 'Customer'} connected via Twilio Voice. Initializing real-time media stream & speaker diarization.`,
    bulletPoints: [
      {
        category: 'Live Voice Stream Status',
        points: [
          'Twilio Media Stream WebSocket established with 64kbps µ-law audio feed.',
          `Connected to verified customer: ${targetCustomer?.firstName || preset.customerName} (${targetCustomer?.mobile || preset.customerPhone}).`,
        ],
      },
    ],
    sentiment: 'neutral',
    sentimentScore: 10,
    customerIntent: preset.fallbackSummary.customerIntent,
    keyEntities: preset.fallbackSummary.keyEntities,
    actionItems: preset.fallbackSummary.actionItems,
    transcripts: initialTurns,
    lastUpdated: new Date().toLocaleTimeString('en-AU'),
    recordingUrl: 'https://api.twilio.com/2010-04-01/Accounts/AC98f237/Recordings/RE98214819241.wav',
  };

  saveStreamSummary(initialSummary);

  // Audio packet simulation (Twilio streams 20ms chunks of 160 bytes µ-law)
  audioPacketInterval = setInterval(() => {
    const current = loadStreamSummary(callId);
    if (!current || current.status !== 'streaming') return;
    current.packetsReceived += 50; // 50 packets per sec (20ms each)
    current.bytesReceived += 50 * 160;
    current.latencyMs = Math.floor(18 + Math.random() * 12);
    saveStreamSummary(current);
  }, 1000);

  // Progressive transcript streamer: emits next turns every 3.5 seconds
  let turnIndex = 2;
  streamTimer = setInterval(() => {
    const current = loadStreamSummary(callId);
    if (!current || current.status !== 'streaming') {
      clearInterval(streamTimer);
      return;
    }

    if (turnIndex < allTurns.length) {
      const nextTurn = allTurns[turnIndex];
      current.transcripts.push(nextTurn);
      turnIndex++;

      // Update summary progressively
      if (turnIndex >= 4) {
        current.executiveSummary = preset.fallbackSummary.executiveSummary;
        current.bulletPoints = preset.fallbackSummary.bulletPoints;
        current.sentiment = preset.fallbackSummary.sentiment;
        current.sentimentScore = preset.fallbackSummary.sentimentScore;
        current.actionItems = preset.fallbackSummary.actionItems;
      }
      current.lastUpdated = new Date().toLocaleTimeString('en-AU');
      saveStreamSummary(current);
    } else {
      // Completed full transcript
      current.status = 'completed';
      current.executiveSummary = preset.fallbackSummary.executiveSummary;
      current.bulletPoints = preset.fallbackSummary.bulletPoints;
      current.sentiment = preset.fallbackSummary.sentiment;
      current.sentimentScore = preset.fallbackSummary.sentimentScore;
      current.actionItems = preset.fallbackSummary.actionItems;
      current.lastUpdated = new Date().toLocaleTimeString('en-AU');
      saveStreamSummary(current);
      clearInterval(streamTimer);
      clearInterval(audioPacketInterval);
    }
  }, 3500);

  return initialSummary;
}

export function stopTwilioMediaStream(): void {
  if (streamTimer) clearInterval(streamTimer);
  if (audioPacketInterval) clearInterval(audioPacketInterval);
  const active = getActiveStreamSession();
  if (active && active.status === 'streaming') {
    active.status = 'completed';
    saveStreamSummary(active);
  }
}

export function pauseResumeTwilioStream(): boolean {
  const active = getActiveStreamSession();
  if (!active) return false;
  if (active.status === 'streaming') {
    active.status = 'paused';
    saveStreamSummary(active);
    return false;
  } else if (active.status === 'paused') {
    active.status = 'streaming';
    saveStreamSummary(active);
    return true;
  }
  return false;
}

// ----------------- AI SUMMARIZATION CALL -----------------

export async function generateAiSummaryForTranscript(
  transcriptTurns: TranscriptTurn[],
  customerInfo?: { name: string; email?: string; phone?: string; orders?: any[] }
): Promise<Partial<StreamSummaryData>> {
  try {
    const response = await fetch('/api/twilio/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcripts: transcriptTurns,
        customer: customerInfo,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (err) {
    console.warn('Backend /api/twilio/summarize unavailable, using client-side intelligence fallback', err);
  }

  // Graceful client-side summarization fallback
  const fullText = transcriptTurns.map((t) => `${t.speaker.toUpperCase()}: ${t.text}`).join('\n');
  const isExtension = fullText.toLowerCase().includes('extend') || fullText.toLowerCase().includes('month');
  const isPickup = fullText.toLowerCase().includes('pickup') || fullText.toLowerCase().includes('empty');
  const isDamage = fullText.toLowerCase().includes('leak') || fullText.toLowerCase().includes('damage') || fullText.toLowerCase().includes('water');

  const bulletPoints: { category: string; points: string[] }[] = [];

  if (isExtension) {
    bulletPoints.push({
      category: '🎯 Customer Intent & Objectives',
      points: [
        'Customer requested container rental extension.',
        'Prefers charging payment card on file for recurring period.',
      ],
    });
  } else if (isPickup) {
    bulletPoints.push({
      category: '🎯 Customer Intent & Objectives',
      points: [
        'Container emptied and ready for collection.',
        'Urgent pickup scheduling required to avoid council obstruction.',
      ],
    });
  } else if (isDamage) {
    bulletPoints.push({
      category: '🎯 Customer Intent & Objectives',
      points: [
        'Reported potential weather/water ingress near door seal.',
        'Requested immediate inspection or container replacement.',
      ],
    });
  } else {
    bulletPoints.push({
      category: '🎯 Customer Intent & Objectives',
      points: ['Customer inquiry regarding container booking and status.'],
    });
  }

  return {
    executiveSummary: `Conversation between ${customerInfo?.name || 'Customer'} and Portabox representative analyzed. Core topic: ${
      isExtension ? 'Rental Extension' : isPickup ? 'Collection Scheduling' : isDamage ? 'Damage / Seal Inspection' : 'Account Support'
    }.`,
    bulletPoints,
    sentiment: isDamage ? 'urgent' : 'positive',
    sentimentScore: isDamage ? -20 : 80,
    customerIntent: isExtension ? 'Rental Extension' : isPickup ? 'Final Pickup' : isDamage ? 'Seal Inspection' : 'General Inquiry',
  };
}

export function markActionCompleted(callId: string, actionId: string): void {
  const current = loadStreamSummary(callId);
  if (!current) return;
  current.actionItems = current.actionItems.map((item) =>
    item.id === actionId ? { ...item, completed: !item.completed } : item
  );
  saveStreamSummary(current);
}
