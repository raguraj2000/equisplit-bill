# EquiSplit — Design Assessment Write-Up

**Candidate:** Raguraj  
**Live URL:** [subtle-cassata-399394.netlify.app](http://subtle-cassata-399394.netlify.app)  
**Tech Stack:** React (Vite) + Framer Motion + Vanilla CSS  
**Target Users:** 20–35 year olds in India splitting everyday expenses

---

## 1. What I Built vs. Cut — and Why

**Built:**
- **Core bill splitting** with full CRUD (create, edit, delete expenses) — the primary user need.
- **Three split modes** — Equal, Exclude ("someone didn't drink"), and Exact amounts — covering the real-world edge cases that cause group payment disputes.
- **Greedy min-cash-flow settlements** — algorithmically reduces multi-person debts to the fewest possible direct transfers (e.g., 5 debts consolidated into 2 payments).
- **Editable group** — rename group, change description, add/remove members at any time.
- **Local persistence** — `localStorage` sync so data survives refreshes. Zero backend, zero login friction.
- **Mobile-first bottom-sheet modals** with Framer Motion spring animations for a native-feel UX.

**Cut (ruthless scoping):**
- **Itemized receipt scanning / OCR** — error-prone on Indian restaurant bills and adds complexity without proportional value. The Exclude toggle solves 90% of "who ate what" disputes in 2 seconds.
- **User authentication & backend** — not required for the core use case. Local-first means instant loading with zero onboarding friction.
- **Multi-currency support** — domestic Indian expenses are the target. Adding currency conversion is cognitive overhead with no value for the primary persona.

## 2. One Design Decision I Went Back and Forth On

**The Split Type UX: Tabbed toggle vs. always-visible inputs.**

I initially showed all split options (checkboxes + amount fields) on every expense form. This made the "Add Expense" flow feel heavy and intimidating on mobile — too many fields visible before the user even decides what kind of split they need.

**Decision:** I implemented a segmented tab toggle (`Equal | Exclude | Exact`). The form defaults to "Equal" — the most common case — keeping the form minimal (just description, amount, paid-by). Advanced options expand with a smooth spring animation only when the user explicitly chooses a different split type. This balances power with simplicity: 80% of expenses use equal split and see a clean 3-field form.

## 3. How I Used AI Tools

- **Scaffolding & Architecture:** I directed the AI to set up a Vite + React project and write the foundational component structure (App, ExpenseModal, GroupModal).
- **Debt Algorithm:** I prompted the AI to implement a greedy min-cash-flow settlement algorithm and then manually verified the math against edge cases (e.g., circular debts, single-person exclusions).
- **Where AI Got It Wrong:**
  - *Over-engineering:* The AI initially generated a complex SaaS dashboard with sidebars, hex dot matrices, and data visualizations — completely wrong for a simple mobile bill-splitting tool. I had to explicitly strip it back to a focused, single-column mobile layout.
  - *Floating-point precision:* The AI produced raw JS division results like `₹333.3333333333`. I added explicit `Math.round(val * 100) / 100` rounding guards throughout the balance engine.
  - *Form validation:* The AI's initial exact-split form didn't validate that custom amounts sum to the total. I added a real-time "₹X left" indicator and a submit-time validation alert.

## 4. What I'd Do Next

1. **UPI Deep Links** — Generate `upi://pay?pa=...&am=1500` URLs so users can settle directly via GPay/PhonePe with one tap.
2. **Share Summary** — Format the debt breakdown as a WhatsApp-friendly message for sending to the group.
3. **PWA Install** — Service Worker + Web App Manifest for offline-first usage and add-to-home-screen.
4. **Expense Categories & Filters** — Visual breakdown of spending by category (food, transport, stay).
