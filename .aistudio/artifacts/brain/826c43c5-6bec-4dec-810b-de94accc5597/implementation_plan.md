# Streamline "My Place" Storage Flow: Bypass Depot Loading

Automatically skip Step 3 (Depot Loading Logistics) when a customer chooses on-site storage at "My Place", locking the delivery logistics to full-service driveway delivery and end-of-storage collection.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> **Summary of Confirmed Decisions from Phase 1:**
> - **Skip Step 3 for "My Place"**: Customers selecting *"My place"* on Step 2 skip Step 3 entirely and proceed directly to **Step 4 (Which Size)**.
> - **Locked Logistics**: Delivery logistics are locked to `home_delivery` for both origin delivery and eventual collection when storage is completed (eliminating contradictory depot loading options).
> - **Bi-Directional Navigation**: Clicking **"Previous"** on Step 4 (Container Size) returns smoothly to **Step 2 (What do you need)** when *My Place* is active.
> - **Tracker Alignment**: The Right Sidebar tracker accurately labels this step as *"Driveway Delivery & Collection"* without broken jump links.

---

## 1. Overview & Core Concept

### The Problem
When storing a container on-site at "My Place" (e.g., in a driveway for home renovations or decluttering), offering the customer an option to *"Bring your stuff to the Portabox depot to load"* creates customer confusion because the physical container lives on their private property.

### The Solution
Streamline the checkout journey for all on-site storage customers:
- **Step 2 ➔ Step 4**: Selecting *Storage* + *My place* skips Step 3.
- **Step 4 ➔ Step 2**: Clicking *Previous* on Step 4 returns to Step 2.
- **Logistics Default**: Auto-locks `originLogisticsMethod = 'home_delivery'` and `destinationLogisticsMethod = 'home_delivery'`.
- **Facility Storage & Moving Untouched**: Customers selecting *Portabox facility* or *Moving* continue to see the full Step 3 loading options (with depot load savings).

```
┌────────────────────────────────────────────────────────────────────────┐
│ On-Site Storage Flow ("My Place")                                      │
│                                                                        │
│  [Step 1: Where] ──▶ [Step 2: What] ───────(Skip Step 3)──────▶ [Step 4: Size]
│                           │                                         │  
│                           └── "My place" selected                   │  
│                               (Logistics locked to home delivery)   │  
│                               ◀─────────── "Previous" ──────────────┘  
│                                                                        │
│ Facility Storage & Moving Flow                                         │
│                                                                        │
│  [Step 1: Where] ──▶ [Step 2: What] ──▶ [Step 3: Logistics] ──▶ [Step 4: Size]
│                           │             (Depot vs Home)                │
│                           └── "Facility" or "Moving"                   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Technical Implementation Details

### File Modifications

1. **`src/App.tsx`**:
   - Define helper flag:
     ```ts
     const isMyPlaceStorage = serviceType === 'storage_at_place' || (serviceType !== 'moving' && serviceType !== 'moving_storage' && storagePlacement === 'my_place');
     ```
   - In Step 2 `onContinue`:
     ```ts
     if (isMyPlaceStorage) {
       setOriginLogisticsMethod('home_delivery');
       setDestinationLogisticsMethod('home_delivery');
       setCurrentStep(4);
     } else {
       setCurrentStep(3);
     }
     ```
   - In `handleBack`:
     ```ts
     if (currentStep === 4 && isMyPlaceStorage) {
       setCurrentStep(2);
     } else if (currentStep > 1) {
       setCurrentStep((prev) => prev - 1);
     }
     ```
   - In Step 4 `onBack`:
     Ensure calling `handleBack` smoothly routes to Step 2 when `isMyPlaceStorage` is active.
   - Guard against direct URL/state arrival at Step 3 if `isMyPlaceStorage` is true.

2. **`src/components/RightSidebar.tsx`**:
   - In Step 3 row of tracker:
     - When `storagePlacement === 'my_place'` / `serviceType === 'storage_at_place'`, display:
       - Title: *"Driveway Delivery"*
       - Description: *"Delivered to your driveway & collected when done"*
       - Jump button: calls `onJumpToStep(2)` so the user can easily re-toggle to *Portabox facility* if desired.

---

## 3. Verification Checklist

- [x] Select *Storage* ➔ *My place* on Step 2 and click *Continue*; verify it lands directly on Step 4 (Container Size).
- [x] On Step 4, click *Previous*; verify it navigates cleanly back to Step 2.
- [x] Verify logistics methods in `activeQuote` remain locked to `home_delivery`.
- [x] Verify *Portabox facility* still presents Step 3 with depot loading and home delivery options.
- [x] Verify *Moving* still presents Step 3 with depot loading and home delivery options.
- [x] Verify Right Sidebar tracker displays clean, contextual copy for *My Place* without broken jump links.
- [x] Run `lint_applet` and `compile_applet` to confirm 0 errors.

---

## 4. Competitor Pricing Benchmark Engine & Admin Portal Editor

### Implemented Updates
- [x] **Verified Australian Market Rates**: Updated `src/services/competitorPricingService.ts` from $99 delivery to verified Australian metro rate ($149 AUD) and monthly modular rate to $18.60 AUD/m³ (~$148.80/mo per 8 m³ box, aligned with TAXIBOX, gobox Adelaide, and PODS).
- [x] **Pre-Configured Competitor Profiles**: Integrated 4 verified presets (Modular Industry Standard, TAXIBOX Direct, gobox Adelaide Marleston, and PODS Australia).
- [x] **Full Interactive Admin Portal Editor**: Created `src/components/admin/CompetitorPricingWorkspace.tsx` with live parameter controls, custom override saving, reset to defaults, and live 10m³/19m³/25m³ customer savings simulation.
- [x] **Admin Navigation**: Added dedicated `Competitor Rates & Benchmarks` tab under `PRICING & REVENUE` in `AdminSidebar.tsx` and quick shortcut in the Tariff Matrix tab.
- [x] **Dynamic Reactive Quotes**: Replaced hardcoded text in `Step5Quote.tsx` and `RightSidebar.tsx` with dynamic properties from `comp.benchmark` and added cross-component reactive synchronization (`portabox:competitor-rates-updated`).
- [x] **Verified Compilation**: Built with 0 TypeScript/compilation errors.
