# Implementation Plan: Call Center In-App Response System with Gemini Smart Replies & Dual-Channel Dispatch

Equip call center agents to instantly respond to incoming customer quote inquiries and overnight messages via a unified dual-channel dispatcher (In-App Customer Portal Chat + SMS) backed by server-side Gemini 3.8 Flash smart reply suggestions and automatic Smartsheet follow-up logging.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following operational preferences were confirmed via Phase 1 clarification:
> - **Delivery Channels**: Dual channel dispatch—simultaneously post to the customer's self-service **Customer Portal Chat** and send an immediate **SMS** to their mobile phone.
> - **Gemini AI Assistance**: One-click smart reply suggestions with three editable tone presets:
>   1. *Friendly & Informative* (addresses access, container dimensions, delivery windows).
>   2. *Booking Incentive & Discount* (highlights `1st Month Free`, `10 Free Furniture Blankets`, or price freezes).
>   3. *Quick SMS / Callback Confirmation* (concise mobile-friendly check-in).
> - **Smartsheet Integration**: Outbound responses automatically update Dan's Smartsheet Columns 39–44 (`FOLLOW UP - Customer Status` set to `Contacted`, `Follow Up Agent 1`, and `Re-Contact Customer Date`).

---

## 1. Overview & Core Concept

### What It Delivers
When an agent reviews an alert in the Notification Bell or Smartsheet grid, clicking **"Reply"** opens the `AdminMessageResponseModal`:
1. **Context-Aware Gemini AI Suggestions**:
   - The backend passes the customer's inquiry along with their specific `Q-` quote parameters (container size, origin/destination suburbs, pricing, and discount codes) to Gemini 3.8 Flash.
   - Generates three distinct, professional reply options in seconds.
2. **One-Click Composer Injection**:
   - Clicking any suggestion populates the response textarea where the agent can freely refine or edit text before dispatching.
3. **Dual-Channel Outbound Dispatch**:
   - Sends the message to the **Customer Portal** message thread so the customer sees it upon login.
   - Sends a direct **SMS** to the customer's mobile phone via the existing `/api/sms/send` route.
4. **Automated Follow-Up Logging**:
   - Updates the quote status in the 51-column Smartsheet CRM Phase I to keep all agents and Dan Harrington synchronized.

---

## 2. User Experience & Visual Design

### 1. In-App Response Modal (`AdminMessageResponseModal`)
- **Visual Stance**: Clean, high-density modal styled with deep navy accents (`#0b2942`) and emerald action indicators.
- **Header & Quote Snapshot**:
  - Displays customer name, phone, email, and clean `Q-` Quote ID badge.
  - Displays container size (e.g. `Large 25m³`), route (`Hyde Park SA 5061`), and the customer's original inquiry in an amber highlight block.
- **Gemini Smart Suggestions Deck**:
  - Three distinct cards with tone pills:
    - `[Friendly & Informative]`: Detailed answers regarding placement and booking.
    - `[Booking Incentive]`: Emphasizes `1st Month Free` or price freeze benefits.
    - `[Quick Callback]`: Crisp 1-2 sentence confirmation.
  - Clicking any card animates into the response editor with immediate preview.
- **Dual-Channel Controls**:
  - Checkboxes for `[x] Post to Customer Portal Thread` and `[x] Send SMS to 04xx xxx xxx`.
  - Checkbox for `[x] Update Smartsheet Status to Contacted (Cols 39-44)`.
- **Primary Action**: Single-click `"Dispatch Response (SMS & Portal)"` button with loading and success feedback.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Server-Side Gemini API Proxy (`/api/gemini/suggest-replies`)
- **Chosen Approach**: Route the AI suggestion request through Express in `server.ts` using `@google/genai` and `gemini-3.8-flash`.
- **Why**: Keeps the server API key secure, includes `User-Agent: aistudio-build`, and allows rich system instructions grounded in real Portabox rates and depot logistics.
- **Fallback**: Includes hardcoded rule-based smart templates if the Gemini API call encounters network latency or quota limits.

### Decision 2: Dual Channel Default (Portal + SMS)
- **Chosen Approach**: Enable both Portal and SMS checkboxes by default, allowing the agent to uncheck either if desired.
- **Why**: Customers frequently check SMS on their mobile phone while tracking the formal quote in the web portal, maximizing open rates and conversion speed.

---

## 4. Technical Architecture & Data Strategy

### Response & AI Data Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                   CALL CENTER RESPONSE & AI PIPELINE                   │
└────────────────────────────────────────────────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
┌───────────────────────┐             ┌──────────────────────────┐
│  AGENT NOTIFICATION   │             │   SMARTSHEET 51-COL      │
│  BELL & DRAWER        │             │   GRID TABLE             │
└───────────┬───────────┘             └────────────┬─────────────┘
            │                                      │
            └──────────────────┬───────────────────┘
                               │ Click "Reply"
                               ▼
            ┌──────────────────────────────────────┐
            │     AdminMessageResponseModal.tsx    │
            │  • Customer & Quote Details Snapshot │
            │  • Gemini 3 Tone Selector            │
            │  • Dual-Channel Dispatch (SMS+Chat)  │
            └──────────────────┬───────────────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         │ 1. Request AI       │ 2. Outbound SMS     │ 3. Sync CRM
         ▼                     ▼                     ▼
┌───────────────────┐ ┌─────────────────┐ ┌───────────────────────────┐
│ Express Server    │ │ Express Server  │ │ Express Server            │
│ /api/gemini/      │ │ /api/sms/send   │ │ /api/smartsheet/          │
│ suggest-replies   │ │                 │ │ sync-dan-rows             │
│ (gemini-3.8-flash)│ └─────────────────┘ └───────────────────────────┘
└───────────────────┘
```

### Components Created & Verified (Completed)
1. **Backend Server Endpoint (`server.ts`)** [Completed]:
   - `POST /api/gemini/suggest-replies`: Accepts customer inquiry, quote reference, container size, location, and generates 3 structured suggestions (`helpful`, `incentive`, `concise`) using `gemini-3.8-flash` with 5-second timeout race and intelligent fallback.
2. **Frontend Response Modal (`src/components/admin/AdminMessageResponseModal.tsx`)** [Completed]:
   - Interactive response dialog with customer snapshot, quote reference (`Q-`), Gemini smart reply tone cards, character and SMS counters, quick macro inserts, dual-channel dispatch checkboxes (Portal Chat + SMS), and Smartsheet auto-logging.
3. **Integration Points** [Completed]:
   - Connected **Reply** button directly on each alert card in `AgentNotificationBell.tsx` to launch `AdminMessageResponseModal`.
   - Verified that outbound dispatch triggers `/api/sms/send`, saves chat to the customer portal thread, and logs status to Smartsheet.
4. **Verification & Build** [Completed]:
   - Co-executed `compile_applet` and `lint_applet` with 0 build errors and 0 lint issues.
   - Tested `/api/gemini/suggest-replies` endpoint via HTTP with successful structured response.
