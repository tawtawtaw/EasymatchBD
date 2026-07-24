# EasymatchBD — QA Test Matrix (External Testers)

Use this document to test **web**, **mobile (Android preview APK)**, and **staff portals**. Mark each row: **Pass / Fail / Blocked / N/A** and note device, locale, and steps to reproduce for failures.

---

## 1. Before you start

### URLs & apps

| Surface | How to access |
|---------|----------------|
| **Web (EN)** | `https://easymatchbd.ngrok.dev/en` |
| **Web (BN)** | `https://easymatchbd.ngrok.dev/bn` |
| **Mobile** | EAS preview APK install link (from project owner) |
| **Staff login** | Web `/auth` → **Staff** OTP mode |

> **Important:** Remote testing only works while the project owner keeps **API + web + ngrok** running.

### Test data you need (ask project owner)

| Persona | Purpose |
|---------|---------|
| **Member A** (paid, verified, complete profile) | Primary happy-path tester |
| **Member B** (paid, verified) | Second side of connection / chat / video |
| **Member C** (free, verified) | Paid-feature gates |
| **Member D** (unverified, profile incomplete) | Onboarding & verification |
| **Parent/guardian account** | On-behalf profile + creator NID |
| **Verification officer** | Staff queue |
| **Marriage consultant** | Consultant cases |
| **Super admin** | Admin portal |

### Priority

| Priority | Meaning |
|----------|---------|
| **P0** | Must work for launch — block release if broken |
| **P1** | Important — fix before wider rollout |
| **P2** | Nice to have / edge cases |

### Platforms column

- **W** = Web member
- **M** = Mobile Android
- **S** = Staff web (officer / consultant / admin)
- **P** = Public (no login)

### OTP (dev / staging)

In non-production builds, OTP may appear on screen after **Send OTP** (mobile) or in the API response (web dev tools). Use the shown code if SMS is not configured.

### Payments (SSLCommerz sandbox)

Use sandbox test cards from SSLCommerz docs. Confirm success, cancel, and fail return URLs land correctly and membership/consultant status updates.

---

## 2. Persona × feature matrix (smoke level)

| Domain | Guest | Free verified | Paid verified | Parent on-behalf | Officer | Consultant | Admin |
|--------|:-----:|:-------------:|:-------------:|:----------------:|:-------:|:----------:|:-----:|
| Public browse | P0 | — | — | — | — | — | — |
| OTP auth | — | P0 | P0 | P0 | P0 | P0 | P0 |
| Terms & onboarding | — | P0 | — | P0 | — | — | — |
| Profile biodata | — | P1 | P1 | P0 | — | — | P1 |
| Verification submit | — | P0 | — | P0 | — | — | — |
| Verification review | — | — | — | — | P0 | — | — |
| Discovery & filters | P1 | P0 | P0 | P0 | — | — | — |
| Interests & connections | — | P1 | P0 | P0 | — | — | P1 |
| Privacy upgrades L1→L3 | — | — | P0 | P0 | — | — | — |
| Messaging | — | P1 | P0 | P0 | — | P1 | — |
| Video calls | — | P1 | P0 | P0 | — | P1 | — |
| Guest video invite | — | — | P1 | — | — | — | — |
| Membership purchase | — | P0 | P1 | P0 | — | — | P1 |
| Consultant purchase | — | — | P1 | P0 | — | P0 | P1 |
| Complaints | — | P1 | P1 | P1 | — | P1 | P1 |
| Admin operations | — | — | — | — | P1 | — | P0 |
| EN / BN locale | P1 | P0 | P0 | P0 | P1 | P1 | P1 |

---

## 3. Detailed test cases

### A. Authentication & session

| ID | P | W | M | Steps | Expected |
|----|---|---|---|-------|----------|
| AUTH-01 | P0 | ✓ | ✓ | Enter valid BD mobile → Send OTP → Enter OTP | Logged in; lands on terms or main app |
| AUTH-02 | P0 | ✓ | ✓ | Enter invalid OTP | Clear error; no login |
| AUTH-03 | P0 | ✓ | ✓ | Request OTP 4+ times quickly | Rate-limit message |
| AUTH-04 | P1 | ✓ | ✓ | Login with **Remember device** → close app → reopen | Restored session without OTP |
| AUTH-05 | P1 | ✓ | ✓ | Sign out → reopen | Login screen shown |
| AUTH-06 | P1 | — | ✓ | Allow notification permission on login | Push token registers (no crash) |
| AUTH-07 | P0 | ✓ | — | Staff mode: send OTP as verification officer | Redirect to verification home |
| AUTH-08 | P0 | ✓ | — | Staff mode: consultant / super admin | Correct staff home |

### B. Terms, legal & onboarding

| ID | P | W | M | Steps | Expected |
|----|---|---|---|-------|----------|
| LEG-01 | P0 | ✓ | ✓ | New user: accept terms | Can proceed to profile setup |
| LEG-02 | P1 | ✓ | ✓ | Decline terms | Blocked state; can re-open terms |
| LEG-03 | P1 | ✓ | ✓ | View `/terms` and `/privacy` in EN and BN | Content loads; language correct |
| LEG-04 | P0 | ✓ | ✓ | Complete profile setup wizard (all sections) | Completion % increases; can submit verification |
| LEG-05 | P1 | ✓ | ✓ | Create profile **on behalf** of son/daughter | Relation captured; creator NID required |

### C. Profile & biodata

| ID | P | W | M | Steps | Expected |
|----|---|---|---|-------|----------|
| PROF-01 | P0 | ✓ | ✓ | Save personal section (name, DOB, religion, district…) | Saves; no validation errors on valid data |
| PROF-02 | P0 | ✓ | ✓ | Save family + marital + partner preference sections | Saves; compare matrix uses partner prefs |
| PROF-03 | P0 | ✓ | ✓ | Upload primary photo + gallery photo | Thumbnails show; primary marked |
| PROF-04 | P0 | ✓ | ✓ | Upload NID front/back | Upload succeeds |
| PROF-05 | P1 | ✓ | ✓ | Change dropdown fields (education, occupation…) | Labels match locale (EN/BN) |
| PROF-06 | P1 | ✓ | ✓ | Islam-specific fields (beard, hijab, prayer) show/hide correctly | Conditional fields match religion |
| PROF-07 | P1 | ✓ | ✓ | Paid member: export biodata PDF | PDF downloads/opens |
| PROF-08 | P1 | ✓ | ✓ | Free member: try biodata export | Upgrade / paid gate shown |

### D. Verification

| ID | P | W | M | S | Steps | Expected |
|----|---|---|---|---|-------|----------|
| VER-01 | P0 | ✓ | ✓ | — | Submit profile for verification | Status → pending |
| VER-02 | P0 | — | — | ✓ | Officer opens queue | Pending profile visible |
| VER-03 | P0 | — | — | ✓ | Approve photos + NID + biodata | Member becomes **verified** |
| VER-04 | P1 | — | — | ✓ | Reject with feedback | Member sees feedback; can resubmit |
| VER-05 | P0 | ✓ | ✓ | — | Unverified member tries paid feature | Blocked with clear message |
| VER-06 | P1 | ✓ | ✓ | — | Verified member lands on Home (not forced Discovery) | Correct initial tab/route |

### E. Discovery & matching

| ID | P | W | M | P | Steps | Expected |
|----|---|---|---|---|-------|----------|
| DISC-01 | P0 | ✓ | ✓ | — | Browse discovery list with filters | Results update; cards load |
| DISC-02 | P0 | ✓ | ✓ | — | Open profile detail | Only fields allowed at viewer’s stage shown |
| DISC-03 | P1 | ✓ | ✓ | — | Save/bookmark profile → Saved list | Appears in saved |
| DISC-04 | P1 | ✓ | ✓ | — | Compare two profiles | Compatibility matrix displays |
| DISC-05 | P0 | — | — | ✓ | Public `/browse` without login | Level-0 fields only; no PII leak |
| DISC-06 | P0 | ✓ | ✓ | — | **Free** member sends interest | Paid membership prompt |
| DISC-07 | P0 | ✓ | ✓ | — | **Paid** member sends interest | Interest sent; appears in outgoing |
| DISC-08 | P1 | ✓ | ✓ | — | Home dashboard suggestions | Loads for verified member |

### F. Connections, interests & privacy levels

| ID | P | W | M | Steps | Expected |
|----|---|---|---|-------|----------|
| CONN-01 | P0 | ✓ | ✓ | Member B accepts Member A’s interest | Mutual connection formed |
| CONN-02 | P0 | ✓ | ✓ | Decline incoming interest | No connection; sender notified appropriately |
| CONN-03 | P1 | ✓ | ✓ | Withdraw outgoing interest before accept | Interest removed |
| CONN-04 | P0 | ✓ | ✓ | View connected partner at **Level 1** | Limited fields per privacy rules |
| CONN-05 | P0 | ✓ | ✓ | Request upgrade to **Level 2** → partner accepts | More fields visible; video/consultant unlock |
| CONN-06 | P0 | ✓ | ✓ | Request upgrade to **Level 3** → partner accepts | Deepest shared biodata visible |
| CONN-07 | P1 | ✓ | ✓ | Decline privacy upgrade | Stays at current level |

**Privacy level quick reference**

| Level | Name | Unlocks |
|-------|------|---------|
| 0 | Public | Anonymous browse only |
| 1 | Basic mutual interest | Default on new connection |
| 2 | Profile compatibility | **Video calls**, **consultant services** |
| 3 | Serious consideration | Full shared biodata |

### G. Messaging

| ID | P | W | M | Steps | Expected |
|----|---|---|---|-------|----------|
| MSG-01 | P0 | ✓ | ✓ | Paid connected pair: open thread | Messages load |
| MSG-02 | P0 | ✓ | ✓ | Send text message both directions | Delivered; appears in thread |
| MSG-03 | P1 | ✓ | ✓ | Send attachment (image/doc) | Upload + download works |
| MSG-04 | P1 | ✓ | ✓ | Edit / delete own message | Updates reflected |
| MSG-05 | P1 | ✓ | ✓ | Read receipt / unread badge | Badge clears after read |
| MSG-06 | P0 | ✓ | ✓ | Free member opens messages | Paid gate shown |
| MSG-07 | P1 | — | ✓ | Receive message while app backgrounded | Push notification (if enabled) |

### H. Video calls

| ID | P | W | M | Steps | Expected |
|----|---|---|---|-------|----------|
| VID-01 | P0 | ✓ | ✓ | At **L2+**, schedule instant call | Call created; partner alerted |
| VID-02 | P0 | ✓ | ✓ | Callee accepts | Both join; audio works |
| VID-03 | P0 | ✓ | ✓ | Toggle mic on/off | Mute/unmute works |
| VID-04 | P0 | ✓ | ✓ | Toggle camera on/off | Video starts/stops |
| VID-05 | P0 | ✓ | ✓ | End call from either side | Call ends; returns to chat/list |
| VID-06 | P1 | ✓ | ✓ | Schedule call for future time | Join window enforced (15 min before – 60 min after) |
| VID-07 | P1 | ✓ | ✓ | Cancel / reschedule call | Status updates for both |
| VID-08 | P1 | ✓ | ✓ | Invite family guest (both approve) | Guest link works on web |
| VID-09 | P0 | ✓ | ✓ | Try video at **Level 1** | Blocked or clear upgrade prompt |
| VID-10 | P1 | — | ✓ | Mobile: video layout not hidden under header | Video + guest panel fully visible |
| VID-11 | P1 | ✓ | — | Consultant joins member call (staff) | Third participant can connect |

### I. Membership & payments

| ID | P | W | M | Steps | Expected |
|----|---|---|---|-------|----------|
| PAY-01 | P0 | ✓ | ✓ | Verified member opens membership | Gold / Platinum plans shown with BDT prices |
| PAY-02 | P0 | ✓ | ✓ | Complete SSLCommerz **success** | Plan active; paid features unlock |
| PAY-03 | P1 | ✓ | ✓ | Cancel payment at gateway | Returns to cancel page; plan unchanged |
| PAY-04 | P1 | ✓ | ✓ | Failed payment | Fail page; no activation |
| PAY-05 | P1 | ✓ | ✓ | View payment history | Past payment listed |
| PAY-06 | P0 | ✓ | ✓ | Unverified member tries purchase | Verification required message |

### J. Marriage consultant services

| ID | P | W | M | S | Steps | Expected |
|----|---|---|---|---|-------|----------|
| CONS-01 | P1 | ✓ | ✓ | — | At L2+, open consultant services from connection | Service types listed |
| CONS-02 | P1 | ✓ | ✓ | — | Pay for a service (sandbox) | Case created after payment |
| CONS-03 | P1 | ✓ | ✓ | — | Member views consultant case | Status, messages visible |
| CONS-04 | P0 | — | — | ✓ | Consultant opens assigned case | Can message, diary, update status |
| CONS-05 | P1 | — | — | ✓ | Consultant completes case | Member sees completed state |

### K. Complaints

| ID | P | W | M | S | Steps | Expected |
|----|---|---|---|---|-------|----------|
| COMP-01 | P1 | ✓ | ✓ | — | File complaint by profile code | Complaint created |
| COMP-02 | P1 | ✓ | ✓ | ✓ | Reply in complaint thread | Messages sync all sides |
| COMP-03 | P1 | ✓ | ✓ | — | Cancel own open complaint | Status cancelled |
| COMP-04 | P1 | — | — | ✓ | Admin assigns / resolves | Status updates; audit trail |

### L. Public & marketing (web only)

| ID | P | W | Steps | Expected |
|----|---|-----|-------|----------|
| PUB-01 | P1 | ✓ | Landing `/` loads | Featured content, links work |
| PUB-02 | P1 | ✓ | About, Contact, Refund pages | Content loads EN + BN |
| PUB-03 | P0 | ✓ | Browse profile from public list | No login required; limited fields |
| PUB-04 | P1 | ✓ | Language switch EN ↔ BN | URL locale changes; UI translated |

### M. Admin & staff (web only)

| ID | P | Role | Steps | Expected |
|----|---|------|-------|----------|
| ADM-01 | P0 | Super admin | Open `/admin/home` + each main tab | All tabs load without error |
| ADM-02 | P1 | Super admin | Edit dropdown option (EN + BN label) | Saved; visible in member profile |
| ADM-03 | P1 | Super admin | Edit privacy field defaults | Saved |
| ADM-04 | P1 | Super admin | Edit membership tariff | Prices update on membership page |
| ADM-05 | P1 | Super admin | `/admin/payments` ledger | Transactions listed |
| ADM-06 | P1 | Super admin | Manual membership override on profile | Member gains/loses paid access |
| ADM-07 | P1 | Super admin | Profile deletion request flow | Approve/reject works |
| ADM-08 | P1 | Super admin | Audit log | Actions recorded |
| ADM-09 | P0 | Verification officer | Verification queue only (no full admin) | Cannot access restricted tabs |
| ADM-10 | P1 | Consultant | Complaint inbox + case video join | Works independently of member app |

### N. Cross-platform & regression

| ID | P | Steps | Expected |
|----|---|-------|----------|
| XPL-01 | P0 | Same account: login web + mobile | Same profile, connections, messages |
| XPL-02 | P1 | Send interest on web → accept on mobile | Connection syncs |
| XPL-03 | P1 | Start video on web → join on mobile (or reverse) | Call connects |
| XPL-04 | P1 | Switch mobile language EN ↔ BN in Settings | UI updates; persisted after restart |
| XPL-05 | P2 | Slow network / airplane mode toggle | Graceful errors, no white screen |
| XPL-06 | P1 | WhatsApp support button (web footer / mobile FAB) | Opens WhatsApp with correct number |

---

## 4. Locale matrix (repeat P0 flows)

Run **once in EN, once in BN** for each checked flow:

| Flow | Web EN | Web BN | Mobile EN | Mobile BN |
|------|:------:|:------:|:---------:|:---------:|
| OTP login | ☐ | ☐ | ☐ | ☐ |
| Terms accept | ☐ | ☐ | ☐ | ☐ |
| Profile save | ☐ | ☐ | ☐ | ☐ |
| Send / accept interest | ☐ | ☐ | ☐ | ☐ |
| Send message | ☐ | ☐ | ☐ | ☐ |
| Video call join | ☐ | ☐ | ☐ | ☐ |
| Membership checkout | ☐ | ☐ | ☐ | ☐ |
| Complaint file | ☐ | ☐ | ☐ | ☐ |

---

## 5. Suggested tester split (3–5 people)

| Tester | Focus |
|--------|--------|
| **Tester 1** | Mobile P0: auth, onboarding, discovery, interests |
| **Tester 2** | Mobile P0: messages, video calls, push notifications |
| **Tester 3** | Web member P0 + public browse + EN/BN |
| **Tester 4** | Payments (membership + consultant sandbox) + privacy levels |
| **Tester 5** | Staff: verification officer + consultant + admin smoke |

Pair **Tester 1 + 2** (or 3 + 4) for two-member connection flows.

---

## 6. Bug report template

```
ID: (e.g. VID-04)
Priority: P0 / P1 / P2
Platform: Web / Mobile APK / Staff
Locale: en / bn
Account: (test phone or role, no real PII)
Device: (e.g. Samsung A54, Android 14, Chrome 138)

Steps:
1.
2.
3.

Expected:
Actual:
Screenshots / screen recording:
```

---

## 7. Out of scope for this round

- iOS app (Android only for mobile preview)
- Production SSLCommerz live cards
- Real SMS OTP (use dev OTP when shown)
- Load / penetration testing

---

*Last updated: project preview testing phase. Adjust URLs if staging/production replaces ngrok.*
