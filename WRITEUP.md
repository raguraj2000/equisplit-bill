# EquiSplit — Design Assessment & Rationale

**Target Users:** 20-35 year olds in India splitting everyday social expenses (Goa trips, Friday dinners, rent & maid bills).  
**Prototype Tech:** Vanilla HTML5, CSS3 (Apple iOS Design System), ES6 JS with local state persistence (`localStorage`).

---

## 1. Scope: What Was Built vs. Cut (And Why)

### What Was Built:
- **Zero-Friction Local State:** Instant usage without login, signup, or server delays. Fully persists across reloads.
- **Smart Debt Simplification Algorithm:** Greedy Graph Min-Cash-Flow reduction that consolidates multi-party debts into the absolute minimum number of direct transfers (e.g., 5 inter-person debts reduced to 2 direct settlements).
- **Edge-Case Split Engine:**
  - *Equal Split (÷)*
  - *Exact Amount Split (₹)*
  - *Percentage Split (%)*
  - *Exclusion Split (🚫)*: Handles "someone didn't eat/drink" edge cases in 2 seconds without entering items.
- **One-Tap WhatsApp & UPI Payment Reminders:** Pre-formats polite WhatsApp debt request messages with exact breakdown amounts and UPI settlement prompts.
- **Apple iOS Design System:** Glassmorphism, dynamic Light/Dark mode, SF Pro system typography, spring-like tactile micro-interactions, responsive mobile bottom-sheets.
- **Quick Test Presets:** "Goa Trip 2026" and "Flat Rent & Bills" for 1-click evaluator testing.

### What Was Cut:
- **OCR Receipt Scanning & Multi-Currency Conversion:**
  - *Why:* For everyday Indian social groups, camera OCR is error-prone on standard restaurant bills and creates UX friction. Multi-currency adds cognitive overhead for domestic spending. Ruthlessly focused on solving **awkward payment reminders** and **complex debt loops**.

---

## 2. Key Design Trade-Off & Decision

### The Dilemma: Itemized Line-by-Line Checklist vs. Fast Exclusion Checkbox
- **Exploration:** Considered forcing users to enter every item (e.g. 2 Pizzas, 4 Beers, 1 Salad) and check off who had what.
- **Trade-Off & Decision:** Abandoned full itemized checklists in favor of **Exclusion Mode + Percentage Split**. In real-world Indian group outings, people find line-by-line item logging tedious on phones. An exclusion toggle ("Sneha didn't drink alcohol") solves 90% of real disputes in under 5 seconds with zero clutter.

---

## 3. AI Tool Usage & Reflections

- **Prompting & Direction:** Instructed AI to construct an Apple-grade, zero-dependency front-end architecture using native CSS custom properties, blur backdrops (`backdrop-filter`), and clean ES6 class-based state management.
- **Where AI Got It Wrong / Hand Corrections:**
  - *Floating-Point Edge Cases:* Initial AI code produced long floating-point strings like `₹333.3333333333333` in debt settlements. Added explicit `Math.round(val * 100) / 100` rounding guards.
  - *Mobile Sheet UX:* Standard AI-generated modals filled the screen clumsily on mobile. Redesigned as an iOS-native drag-handle bottom sheet with fluid spring transitions.

---

## 4. Future Roadmap (What I'd Build Next)

1. **Native UPI Deep-Linking:** Direct `upi://pay?pa=receiver@upi&am=1500&tn=EquiSplit` integration to launch GPay/PhonePe directly.
2. **On-Screen QR Code Modal:** Generate dynamic UPI QR codes for instant face-to-face scanning.
3. **PWA (Progressive Web App):** Service Worker offline caching and add-to-home-screen installability.
