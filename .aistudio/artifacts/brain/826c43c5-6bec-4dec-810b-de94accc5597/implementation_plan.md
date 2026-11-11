# CEO Staff Provisioning & SMS MFA Authentication Flow

Comprehensive architectural plan to enable the CEO to provision staff accounts directly with roles, phone numbers, and initial passwords, paired with a discreet footer text link that leads staff through username/password authentication and ClickSend SMS Multi-Factor Authentication (MFA).

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions were confirmed during the planning phase:
> - **MFA Delivery Channel**: Direct Australian SMS one-time passcode (OTP) dispatched via ClickSend REST API v3 to the staff member's Australian mobile phone, with graceful local fallback if offline.
> - **CEO Staff Provisioning**: The CEO creates staff accounts directly within the Staff Governance workspace by specifying their name, email/username, role (Call Center Operative, Operations Manager, Driver, etc.), mobile number, and initial password.
> - **Footer Navigation**: A subtle, unadorned text hyperlink (not a button or capsule) labeled **"Staff Sign In"** positioned in the footer utility strip.

---

### 1. Overview & Core Concept

- **What It Does**: Provides an end-to-end identity and role-based access control (RBAC) lifecycle:
  1. The CEO manages staff access directly in the **Staff Governance & Access Control** workspace, creating new staff profiles with assigned roles, permissions, phone numbers, and initial passwords.
  2. Any staff operative clicks the discreet **"Staff Sign In"** text link at the base of the application.
  3. Staff enters their username/email and password on a dedicated credentials step.
  4. Upon password verification, the system generates a secure 6-digit numeric OTP and dispatches it in real time to the staff member's mobile phone via the integrated ClickSend SMS Gateway.
  5. Upon entering the correct OTP, the staff member is authenticated with a 2FA-verified session and granted access to their authorized workspaces (e.g., Call Center Phone Intake & Softphone, Dispatch Calendar, Driver Portal, or Full Admin).
- **Target Audience / Persona**: Portabox CEO (Dan Harrington), Call Center Operatives, Operations Managers, and Fleet Drivers.
- **Key Value**: Enforces enterprise-grade zero-trust security without cluttering the customer booking funnel, while giving the CEO complete autonomy over user onboarding and access control.

---

### 2. User Experience & Visual Design

#### Key User Flows

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. CEO PROVISIONING FLOW                                                    │
│ Admin Portal > Staff Governance > "Add New Staff Member" Modal              │
│ CEO inputs: Full Name, Email/Username, Role, Mobile Number, Initial Password│
│ System creates account with active 2FA SMS status & logs audit entry.       │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. STAFF DISCOVERY & LINK CLICK                                             │
│ Customer-facing website footer > Discreet text link: "Staff Sign In"        │
│ Smooth dialog reveal (dark backdrop scrim, centered card).                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. CREDENTIAL AUTHENTICATION STEP                                           │
│ Input: Email / Username + Password. Show/Hide password toggle.              │
│ Form validation checks active status and verifies password against store.   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 4. CLICKSEND SMS MFA OTP STEP                                               │
│ System generates 6-digit cryptographic challenge code.                      │
│ ClickSend API v3 dispatches: "Portabox Security: Your sign-in code is XXXXXX"│
│ Staff inputs 6-digit code. Resend countdown timer (30s) + Carrier status.  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 5. VERIFIED SESSION & RBAC ROUTING                                          │
│ Session created with 2FA token & expiration.                                │
│ Automatically routes user based on role (e.g. Call Center Hub vs Admin).   │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Visual Identity & Theme

- **Aesthetic Direction**: Professional, secure Australian enterprise portal adhering to Portabox brand guidelines (#0b2942 deep navy, #00c0f3 cyan accent, neutral white/slate surfaces).
- **Footer Text Link (Zero-Pill Discipline)**:
  - Formatted as an inline anchor element (`<a>`), unboxed, with no border, background, or button styling:
    `text-xs text-slate-500 hover:text-slate-800 underline-offset-4 hover:underline transition-colors`
  - Positioned alongside standard legal text (Privacy Policy, Terms of Service).
- **Authentication Modal**:
  - Crisp single-elevation card (`bg-white rounded-3xl p-8 border border-slate-200 shadow-2xl max-w-md w-full`).
  - Clear 2-step indicator: `1. Credentials` → `2. SMS Verification`.
  - Step 1: Input fields for Username/Email and Password with eye toggle and secure password masking.
  - Step 2: 6-digit split OTP input boxes (`tabular-nums font-mono text-center text-lg font-bold`) with masked mobile preview (e.g., `Sent to +61 4•• ••• 456 via ClickSend`).
- **Typography & Formatting**:
  - Headings and body set in `Plus Jakarta Sans`.
  - Passcode digits and mobile numbers enforce `font-mono tabular-nums`.

---

### 3. Key Product Decisions & Trade-Offs

#### Decision 1: Password-Protected Staff Accounts with CEO Provisioning
- *Chosen Approach*: Expand `StaffMember` entity with a `password` field (with default secure passwords for initial seed accounts) and add password entry fields to the CEO's **Create Staff Member** modal and **Edit Staff Member** drawer.
- *Why*: Ensures staff cannot merely click their name from a list to log in; real authentication requires knowing the password provisioned by the CEO.
- *Alternative Considered*: Magic login links sent via email. Rejected because call center operatives need immediate access during shift starts without checking an external inbox.

#### Decision 2: Real ClickSend Australian SMS Gateway for MFA
- *Chosen Approach*: Route the generated 6-digit MFA challenge code through `/api/clicksend/sms/send` to the staff member's mobile phone, displaying carrier delivery confirmation, with simulated on-screen fallback if credentials are unset.
- *Why*: ClickSend has direct SS7 connections to Telstra, Optus, and TPG Vodafone with sub-second delivery, ensuring operatives receive passcodes instantaneously.
- *Alternative Considered*: Authenticator App (TOTP). Kept as a secondary option, but SMS was explicitly chosen by the user for frictionless onboarding.

#### Decision 3: Text Link vs Button Presentation
- *Chosen Approach*: Render an unstyled HTML anchor `<a>` tag with subtle hover underline in the footer.
- *Why*: Meets the user's explicit requirement: "the staff can click on a link (not a button) on the bottom of the application". Completely removes any visual clutter from customer-facing viewport zones.

---

### 4. Technical Architecture & Data Strategy

#### Component Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Footer (`src/App.tsx`)                                                      │
│  └── Discreet Text Link: <a onClick={...}>Staff Sign In</a>                 │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Opens
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ StaffLoginModal (`src/components/auth/AdminLoginModal.tsx`)                 │
│  ├── Step 1: Credentials Form (Username/Email + Password)                   │
│  │    └── Validates against `adminAuthService.verifyStaffCredentials()`      │
│  │                                                                          │
│  └── Step 2: ClickSend SMS OTP Form                                         │
│       ├── Dispatches OTP via `sendClickSendSms({ to, message })`            │
│       ├── Live countdown timer (30s resend)                                 │
│       └── Verifies code via `verifyStaff2FACode()`                          │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ On Success
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Session Creation & Role-Based Routing                                       │
│  ├── `setStaffSession(user, '2fa_sms')` stored in localStorage              │
│  ├── Call Center Staff -> Opens Call Center Telephony Hub / Softphone       │
│  └── CEO / Managers -> Opens Daily Operations Admin Portal                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                       ▲
                                       │ Managed by CEO
┌─────────────────────────────────────────────────────────────────────────────┐
│ Staff Governance Workspace (`StaffPermissionsWorkspace.tsx`)               │
│  ├── CEO "Add Staff Member" Modal with Password, Role & Mobile Fields       │
│  ├── Reset Staff Password action                                            │
│  └── Custom Permissions & Individual Role Overrides Matrix                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Data Schema Updates

```typescript
export interface StaffMember {
  id: string;
  name: string;
  email: string;
  password?: string;            // Plaintext or hashed password credential set by CEO
  role: StaffRole;              // 'ceo' | 'manager' | 'call_center' | 'driver' | ...
  title: string;
  mobile: string;               // Australian mobile (+614... or 04...) for ClickSend SMS
  depotLocation: string;
  twoFactorEnabled: boolean;    // Enforced true
  twoFactorMethod: 'sms';       // SMS OTP primary
  status: 'active' | 'suspended';
  customPermissions?: Partial<Record<StaffPermissionKey, boolean>>;
  lastLogin?: string;
  createdAt: string;
}
```

#### Seed Account Credentials for Verification

| Name | Role | Email / Username | Default Password | Mobile |
| :--- | :--- | :--- | :--- | :--- |
| **Dan Harrington** | CEO & Director | `dan.ceo@portabox.com.au` | `Portabox2026!` | `0488 123 456` |
| **Sarah Collins** | Ops Manager | `sarah.ops@portabox.com.au` | `Portabox2026!` | `0412 889 001` |
| **Chloe Davis** | Call Center Lead | `chloe.agent@portabox.com.au` | `Portabox2026!` | `0433 555 782` |
| **Dave Miller** | Driver | `dave.driver@portabox.com.au` | `Portabox2026!` | `0422 400 901` |

---

### Implementation Stages (Upon Approval)

1. **Auth Service Updates (`src/services/adminAuthService.ts`)**:
   - Add `password` property to `StaffMember` interface and initial seed records.
   - Implement `verifyStaffCredentials(emailOrUsername, password)` returning the matched staff member or specific error reasons (invalid password, suspended, not found).
   - Implement `updateStaffPassword(staffId, newPassword)` callable by the CEO.

2. **CEO Staff Management UI (`StaffPermissionsWorkspace.tsx`)**:
   - Update **Add New Staff Member** modal to include the `Password` field (with a 1-click "Generate Random Password" helper).
   - Add a "Reset Password" action button in the staff member detail row.

3. **Login Modal Overhaul (`src/components/auth/AdminLoginModal.tsx`)**:
   - Remove demo persona selection shortcuts from the default view so users must authenticate with their real credentials.
   - Wire Step 1: Username/Email and Password input fields with error feedback.
   - Wire Step 2: Trigger real ClickSend SMS dispatch via `sendClickSendSms()` sending the 6-digit OTP to the user's mobile number, with on-screen carrier receipt details.

4. **Footer Presentation (`src/App.tsx`)**:
   - In the footer navigation bar, replace any button element with a discreet text hyperlink:
     `<a href="#staff-login" onClick={...} className="text-slate-500 hover:text-slate-700 text-xs underline-offset-4 hover:underline">Staff Sign In</a>`
