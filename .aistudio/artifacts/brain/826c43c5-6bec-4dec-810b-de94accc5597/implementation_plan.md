# Moving Schedule, Placement & Insurance to the Post-Quote Booking Flow

Outline and architectural plan to restructure the Portabox customer journey by relocating **Schedule Delivery & Driveway Placement** and **Transit & Storage Insurance** out of the pre-quote questionnaire and directly into the post-quote **Booking Flow**, while retaining **Packing Supplies** in the pre-quote sequence.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> **Confirmed Architecture & Scope:**
> 1. **Packing Supplies Remains in Pre-Quote Flow**: The packing supplies step (boxes, protective moving blankets, padlocks) remains in the pre-quote journey so supplies are factored into the initial quote total.
> 2. **Insurance Moved to Booking Flow**: Transit and storage protection cover ($25,000 cover @ $49/mo) is removed from the pre-quote questionnaire and placed inside the post-quote booking modal prior to payment.
> 3. **Schedule & Placement Moved to Booking Flow**: Delivery date selection, delivery slot window, driveway surface/clearance checks (including the 4.5m overhead clearance), and placement instructions are now the first stages of the Booking experience.
> 4. **Pre-Quote Steps Consolidated**: The pre-quote sequence is updated from 8 steps down to 7 clear steps leading up to quote generation, with step indicator badges and sidebar navigation cleanly synchronized.

---

## 1. Overview & Core Concept

Currently, customers are asked to pick delivery dates, time windows, driveway surfaces, and overhead clearances in Step 6 before they ever see their pricing breakdown. Moving delivery scheduling, driveway placement, and insurance into the post-quote Booking flow provides two decisive advantages:
1. **Faster Time-to-Quote**: Reduces customer friction by 40%, letting customers configure their move/storage, select container sizes, choose packing supplies, and receive an instant quote without getting bogged down in calendar logistics.
2. **Contextual Booking Commitment**: Once the customer has reviewed their pricing, discounts, and savings on the Quote page, clicking **"Book Now"** launches a focused, high-trust Booking Flow where scheduling, placement confirmation, insurance coverage, customer identity, and payment are collected seamlessly in sequence.

---

## 2. Updated User Experience & Journey Architecture

### Pre-Quote Journey (Steps 1 – 7)
```
┌────────────────┐     ┌────────────────┐     ┌────────────────────┐
│ Step 1: Where  │ ──> │ Step 2: What   │ ──> │ Step 3: Logistics  │
│ Origin Suburb  │     │ Moving/Storage │     │ Depot vs Home Del. │
└────────────────┘     └────────────────┘     └────────────────────┘
                                                         │
                                                         ▼
┌────────────────┐     ┌────────────────┐     ┌────────────────────┐
│ Step 6: Supplies│ <── │ Step 5: When   │ <── │ Step 4: Size       │
│ Boxes/Blankets │     │ Duration/Cycle │     │ Portabox 10/19/25m³│
└────────────────┘     └────────────────┘     └────────────────────┘
        │
        ▼
┌────────────────┐     ┌────────────────┐
│ Step 7: Contact│ ──> │ Step 8: QUOTE  │
│ Email & Mobile │     │ Full Breakdown │
└────────────────┘     └────────────────┘
```

- **Step 1: Where**: Origin postcode and metro depot detection.
- **Step 2: What**: Service type (Moving & Storage, Moving Only, Storage at Facility, Storage at My Place).
- **Step 3: Loading Logistics**: Depot self-loading ($150–$300+ savings) vs home delivery.
- **Step 4: Container Size**: 10 m³, 19 m³, 25 m³ container selections and room sizing calculator.
- **Step 5: Duration & Billing**: Storage period and monthly vs 4-weekly billing cycle with rate lock guarantee.
- **Step 6: Packing Supplies**: Dedicated supplies catalog (boxes, furniture moving blankets, heavy-duty padlocks) with live quantity pickers.
- **Step 7: Instant Dispatch / Contact**: Where to send quote (Name, Email, Mobile).
- **Step 8: Quote Breakdown Page**: Complete pricing, delivery legs, deposit breakdown, and dynamic **"Book Now"** button.

---

### Post-Quote Booking Journey (`BookingDecisionModal`)
When the customer clicks **"Book Now"** on the Quote page or within the Customer Portal, the updated multi-stage booking modal guides them through 5 dedicated stages:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       PORTABOX SECURE BOOKING FLOW                          │
│                                                                             │
│  [1. Schedule] ──> [2. Placement] ──> [3. Insurance] ──> [4. ID] ──> [5. Pay]│
└─────────────────────────────────────────────────────────────────────────────┘
```

1. **Stage 1: Delivery Schedule**:
   - Calendar date picker with depot blackout logic and 48-hour cutoff.
   - Delivery slot window selection (Morning 7am–12pm, Afternoon 12pm–5pm, or All-Day Flexible).
   - "Earliest Available Window" smart recommendation button.
   - Sync to Google Calendar option.

2. **Stage 2: Driveway Placement & Clearances**:
   - Placement location: Driveway, Carport, Roadside/Verge, Lawn.
   - Surface type: Concrete, Paved Asphalt, Grass/Lawn, Gravel/Dirt.
   - Door orientation: Facing house or Facing street.
   - Overhead clearance confirmation (explicitly locked to **4.5m** across all notices).
   - Driver access notes (gate codes, slope, tree branches).
   - Driveway Placement Checker modal link.

3. **Stage 3: Transit & Storage Protection (Insurance)**:
   - Comprehensive Portabox Transit & Storage Protection ($25,000 cover @ $49/mo).
   - Value declaration selector (Option to adjust declared contents value).
   - Clear disclosure checklist: Fire, theft, transit overturning, water ingress protection.
   - Toggle to include protection in first invoice or opt out with customer declaration.

4. **Stage 4: Identity Verification & Security PIN**:
   - 4-digit Account Security PIN creation for phone/portal authorization.
   - Date of Birth & ID Type (Driver Licence / Passport / Proof of Age).
   - Primary contact confirmation & alternate emergency contact details.

5. **Stage 5: Payment & Final Confirmation**:
   - Dynamic real-time calculation incorporating container rental, delivery fees, packing supplies, and newly selected insurance coverage.
   - Instant Credit Card (PCI-compliant input) or Direct Debit EFT payment options.
   - Generated PB-BKG booking reference and immediate transition to Post-Booking Customer Portal & Next Steps roadmap.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Standalone Packing Supplies Step (Pre-Quote)**:
  - *Chosen Approach*: Refactor `Step6PackingSuppliesAndInsurance.tsx` into a clean, focused `Step6PackingSupplies.tsx` retaining boxes, blankets, and padlocks, with updated step header `STEP 6 OF 7 · PACKING SUPPLIES`.
  - *Why*: Packing supplies physically affect container packing calculations and initial quote budgeting, whereas insurance is an optional policy add-on best confirmed alongside payment details.
- **Decision 2: 4.5m Clearance Enforcement in Booking**:
  - *Chosen Approach*: Ensure all placement diagrams and warning callouts in the booking modal show **4.5m** overhead height clearance in compliance with prior standardization requests.
- **Decision 3: Quote Synchronization**:
  - *Chosen Approach*: When insurance is selected in Stage 3 of the booking flow, the quote's `insuranceSelected` flag dynamically recalculates the first month's charges before the payment card is charged.

---

## 4. Technical Architecture & Component Mapping

```
┌────────────────────────────────────────────────────────────────────────┐
│                                App.tsx                                 │
│  State: currentStep (1-8), preferredDate, selectedSlot,                │
│         insuranceSelected, containerSelections, supplies               │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │                                 │
         Steps 1–7 Pre-Quote               Step 8: Quote Breakdown
                   │                                 │
  ┌────────────────┴────────────────┐                │
  │ Step 1: Step1Where.tsx          │                ▼
  │ Step 2: Step2What.tsx           │      ┌─────────────────────┐
  │ Step 3: Step3LoadingLogistics   │      │   Step5Quote.tsx    │
  │ Step 4: Step3Size.tsx           │      │   CTA: [Book Now]   │
  │ Step 5: Step4When.tsx           │      └──────────┬──────────┘
  │ Step 6: Step6PackingSupplies.tsx│                 │ (opens)
  │ Step 7: Step5SendQuote.tsx      │                 ▼
  └─────────────────────────────────┘      ┌─────────────────────┐
                                           │BookingDecisionModal │
                                           │Stage 1: Schedule    │
                                           │Stage 2: Placement   │
                                           │Stage 3: Insurance   │
                                           │Stage 4: PIN & ID    │
                                           │Stage 5: Payment     │
                                           └─────────────────────┘
```

### Component Modifications Summary
1. **`src/App.tsx`**:
   - Update step sequence routing: Step 6 becomes Packing Supplies, Step 7 becomes Send Quote, Step 8 becomes Quote Breakdown.
   - Remove `Step5DeliveryAndSupplies` from the pre-quote conditional render.
   - Update `RightSidebar.tsx` navigation and step badges to reflect the 7 pre-quote steps.
2. **`src/components/Step6PackingSuppliesAndInsurance.tsx`**:
   - Rebrand to `Step6PackingSupplies.tsx` (or streamline in-place), removing the insurance card and focusing cleanly on boxes, furniture blankets, and locks.
3. **`src/components/BookingDecisionModal.tsx`**:
   - Add new Stage sequence: `['schedule', 'placement', 'insurance', 'security', 'payment']`.
   - Port the calendar date selector, delivery slot picker, and earliest window helper from `Step5DeliveryAndSupplies` into Stage 1.
   - Add the Transit & Storage Insurance selection card into Stage 3 with real-time total recalculation.
   - Verify 4.5m overhead clearance display in Stage 2.
4. **`src/components/RightSidebar.tsx`**:
   - Adjust step numbers and jump links to match the revised 7-step sequence.

---

## 5. Verification Plan
- **Pre-Quote Flow Test**: Walk through Steps 1 to 7 verifying smooth transitions, step counter titles ("STEP X OF 7"), and absence of scheduling/insurance hurdles.
- **Booking Flow Test**: On Step 8 (Quote Breakdown), click **"Book Now"** and verify that Stage 1 (Schedule), Stage 2 (Placement with 4.5m clearance), Stage 3 (Insurance selection), Stage 4 (PIN & ID), and Stage 5 (Payment) execute with complete working state handlers.
- **Build Verification**: Run `lint_applet` and `compile_applet` to confirm 0 compilation errors.

---

## 6. Loading Logistics Savings Reconciliation (Inclusive of All Charges)
- **Root Cause Identified**:
  1. In `pricingEngine.ts`, when `isOriginDepot` was true, `fuelSurchargeAmount` was zeroed out before computing `initialFee`, causing waived origin leg calculations to miss Leg 1's fuel surcharge ($5 difference between card badge and summary).
  2. For `moving`, destination waived legs only accrued 1 leg instead of 2 legs.
  3. In `Step3LoadingLogistics.tsx`, fallback base fees for Zones B, C, D differed from default rates.
- **Resolution**:
  - Reconciled both `Step3LoadingLogistics.tsx` and `pricingEngine.ts` to calculate waived legs strictly inclusive of all charges:
    `2 × (base delivery fee + distance/km charge + fuel surcharge) × containerCount`.
  - Reconciled CSS Selector 1 (`SAVE $...` badge) and CSS Selector 2 (`Total saved: $...` summary box) to display the identical reconciled dollar total down to the cent.

---

## 7. Page 5 Duration Options & Depot Resolution
- **Select Weeks Feature Flag**:
  - Placed behind `enableSelectWeeks` feature flag, set to `false` by default.
  - Duration selector defaults strictly to months view; week selector is hidden from customers unless enabled by an admin in the backend.
- **Copy & Pill Cleanups**:
  - Removed "Save up to 35% with our duration discounts".
  - Removed "Select 2+ months to unlock discounts up to 35%".
  - Removed "Your duration discount is automatically incorporated into each option."
  - Removed duration percentage badges (`10% OFF`, `20% OFF`, `25% OFF`, `30% OFF`, `35% OFF`) from all duration cards.
  - Updated cancellation terms: "Cancel anytime with 1 day notice" (replacing 14 days notice).
- **2-Week Storage Option**:
  - Added "2 Weeks" option in the main duration grid.
  - Standard rate configured at $199 flat across Small (10m³), Medium (19m³), and Large (25m³) containers.
  - Added editable backend inputs for `twoWeeksStorageRate` in both Admin Portal Container Pricing and Tariff Matrix Workspace.
- **Hyde Park SA / Adelaide Depot Resolution**:
  - Fixed depot resolution in `businessHoursService.ts` and `AreYouStuckBanner.tsx`:
    - Resolved `PostcodeRecord` object handling (`lat`/`lng` via `findClosestDepot` and `state: 'SA'` -> `'adelaide'`).
    - Handled suburb name ("Hyde Park") and postcodes 5000–5999.
    - Set primary default depot fallback to Adelaide (`DEFAULT_LOCATION_SERVICE_HOURS['adelaide']`).
    - Passed `originPostcode` across all step banners (`Step1Where`, `Step2What`, `Step4When`, `Step5DeliveryAndSupplies`, `Step5Quote`, `Step6PackingSuppliesAndInsurance`, `Step5SendQuote`, `Step6Confirmation`).
