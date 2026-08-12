import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import {
  Plus, X, Edit2, Trash2, Settings, Users, ArrowRight
} from "lucide-react";
import "./index.css";

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   CONSTANTS & HELPERS
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

// localStorage key for persisting the entire app state
const STORAGE_KEY = "equisplit_v3";

// Consistent avatar colors assigned by member index
const AVATAR_COLORS = [
  "#4F46E5", "#059669", "#EA580C", "#DC2626", "#7C3AED",
  "#0891B2", "#D97706", "#BE185D", "#065F46", "#6D28D9"
];

// Emoji icons mapped to expense categories for visual distinction
const EXPENSE_ICONS = {
  food: "🍕", drinks: "🍺", transport: "🚕", stay: "🏨",
  groceries: "🛒", entertainment: "🎬", rent: "🏠", other: "📦"
};

// Default state used on first visit (no localStorage data)
const DEFAULT_STATE = {
  groupName: "Weekend Trip",
  groupDesc: "Goa with friends",
  members: ["Rahul", "Priya", "Amit"],
  expenses: []
};

/**
 * Round to 2 decimal places.
 * Prevents floating-point drift like ₹333.3333333333 in debt calculations.
 */
const round = (n) => Math.round(n * 100) / 100;

/** Get a stable color for a member based on their index in the members array */
const getColor = (index) => AVATAR_COLORS[index % AVATAR_COLORS.length];

/** Get first letter of name for circular avatar display */
const getInitial = (name) => name.charAt(0).toUpperCase();

/**
 * Format currency for Indian Rupees.
 * - ≥1L shows as "₹1.5L"
 * - ≥1000 uses Indian locale formatting (₹1,667)
 * - <1000 shows exact amount (₹250 or ₹33.50)
 */
const fmt = (n) => {
  const abs = Math.abs(n);
  if (abs >= 100000) return `₹${(abs / 100000).toFixed(1)}L`;
  if (abs >= 1000) return `₹${abs.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  return `₹${abs.toFixed(abs % 1 === 0 ? 0 : 2)}`;
};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   BALANCE & SETTLEMENT ENGINE
   
   The balance engine computes each member's net position:
     positive = they are owed money (they overpaid)
     negative = they owe money (they underpaid)
   
   The settlement engine uses a greedy min-cash-flow algorithm to minimize
   the total number of transactions needed to settle all debts.
   e.g., if A owes B ₹500 and B owes C ₹500, it simplifies to: A pays C ₹500.
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function computeBalances(members, expenses) {
  // Initialize all balances to 0
  const bal = {};
  members.forEach((m) => (bal[m] = 0));

  expenses.forEach((exp) => {
    // Credit: the person who paid gets credited the full amount
    if (bal[exp.paidBy] !== undefined) {
      bal[exp.paidBy] = round(bal[exp.paidBy] + exp.amount);
    }

    // Debit: each person's share is deducted based on split type
    if (exp.splitType === "exact") {
      // Exact split: each person owes their specified custom amount
      Object.entries(exp.customAmounts || {}).forEach(([person, amt]) => {
        if (bal[person] !== undefined) {
          bal[person] = round(bal[person] - amt);
        }
      });
    } else {
      // Equal split with optional exclusions
      // If splitType is "exclude", filter out excluded members
      const excluded = exp.excludedMembers || [];
      const included = members.filter((m) => !excluded.includes(m));
      if (included.length === 0) return; // safety: avoid division by zero
      const share = round(exp.amount / included.length);
      included.forEach((person) => {
        if (bal[person] !== undefined) {
          bal[person] = round(bal[person] - share);
        }
      });
    }
  });

  return bal;
}

/**
 * Greedy min-cash-flow settlement algorithm.
 * Separates members into debtors (negative balance) and creditors (positive).
 * Repeatedly matches the largest debtor with the largest creditor until settled.
 */
function computeSettlements(balances) {
  const debtors = [];   // people who owe money (negative balance)
  const creditors = []; // people who are owed money (positive balance)

  Object.entries(balances).forEach(([person, bal]) => {
    const rounded = round(bal);
    if (rounded < -0.01) debtors.push({ person, amount: Math.abs(rounded) });
    else if (rounded > 0.01) creditors.push({ person, amount: rounded });
  });

  // Sort descending so we match largest amounts first (greedy approach)
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const settlements = [];
  let i = 0, j = 0;

  while (i < debtors.length && j < creditors.length) {
    const transfer = round(Math.min(debtors[i].amount, creditors[j].amount));
    if (transfer > 0.01) {
      settlements.push({
        from: debtors[i].person,
        to: creditors[j].person,
        amount: transfer
      });
    }
    debtors[i].amount = round(debtors[i].amount - transfer);
    creditors[j].amount = round(creditors[j].amount - transfer);
    if (debtors[i].amount < 0.01) i++;
    if (creditors[j].amount < 0.01) j++;
  }

  return settlements;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   FRAMER MOTION ANIMATION VARIANTS
   Defined centrally so animations are consistent across the app.
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

// Fade-up entrance for cards and list items
const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }
};

// Spring animation for modal bottom-sheet entrance
const sheetVariants = {
  initial: { opacity: 0, y: 60 },
  animate: { opacity: 1, y: 0, transition: { type: "spring", damping: 28, stiffness: 340 } },
  exit: { opacity: 0, y: 40, transition: { duration: 0.2 } }
};

// Simple fade for modal backdrop overlay
const overlayVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } }
};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   MAIN APP COMPONENT
   
   Single source of truth: all state lives in one `state` object.
   React useState provides optimistic UI updates — the UI re-renders
   instantly on state change, then localStorage syncs in the background
   via useEffect. No loading spinners needed.
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

export default function App() {
  // ── Core State ─────────────────────────────────────────────────────────
  // Lazy initializer: reads from localStorage on first render only
  const [state, setState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_STATE;
    } catch {
      return DEFAULT_STATE;
    }
  });

  // Modal state: null (closed), "expense" (add/edit expense), "group" (edit group)
  const [modal, setModal] = useState(null);
  // Tracks which expense is being edited (null = adding new)
  const [editingExpense, setEditingExpense] = useState(null);

  // ── Persist to localStorage on every state change ─────────────────────
  // This runs after every render where `state` changed.
  // Because useState updates are synchronous in the UI, the user sees
  // the change instantly (optimistic), and persistence happens right after.
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // ── Derived data (computed on every render from state) ─────────────────
  const { groupName, groupDesc, members, expenses } = state;
  const balances = computeBalances(members, expenses);
  const settlements = computeSettlements(balances);
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

  // ── State update actions (wrapped in useCallback to prevent re-renders) ─
  const updateState = useCallback((patch) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  /** Add a new expense to the top of the list (most recent first) */
  const addExpense = useCallback((expense) => {
    setState((prev) => ({
      ...prev,
      expenses: [{ ...expense, id: Date.now().toString() }, ...prev.expenses]
    }));
    setModal(null);
  }, []);

  /** Update an existing expense by ID */
  const updateExpense = useCallback((updated) => {
    setState((prev) => ({
      ...prev,
      expenses: prev.expenses.map((e) => (e.id === updated.id ? updated : e))
    }));
    setModal(null);
    setEditingExpense(null);
  }, []);

  /** Delete an expense by ID — optimistic removal, no confirmation */
  const deleteExpense = useCallback((id) => {
    setState((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((e) => e.id !== id)
    }));
  }, []);

  /** Open the expense modal in "edit" mode with pre-filled data */
  const openEditExpense = useCallback((expense) => {
    setEditingExpense(expense);
    setModal("expense");
  }, []);

  /** Close any open modal and clear editing state */
  const closeModal = useCallback(() => {
    setModal(null);
    setEditingExpense(null);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="app">
      {/* ─── Sticky Header Bar ─────────────────────────────────────────── */}
      <header className="app-header">
        <h1>EquiSplit</h1>
        <button
          className="btn-icon"
          onClick={() => setModal("group")}
          aria-label="Edit group settings"
        >
          <Settings size={20} />
        </button>
      </header>

      <main className="main">
        {/* ─── Group Info Card ─────────────────────────────────────────── */}
        <motion.div className="group-header" {...fadeUp}>
          <div>
            <h2>{groupName}</h2>
            {groupDesc && <p className="group-desc">{groupDesc}</p>}
            <p className="group-meta">
              <Users size={14} />
              {members.length} members · {expenses.length} expenses · Total {fmt(totalSpent)}
            </p>
          </div>
          <button className="btn-edit-group" onClick={() => setModal("group")}>
            <Edit2 size={14} /> Edit
          </button>
        </motion.div>

        {/* ─── Balance Cards Grid ─────────────────────────────────────── */}
        {/* Wrapping grid instead of horizontal scroll — all members visible */}
        <h3 className="section-title">Balances</h3>
        <div className="balance-cards">
          {members.map((member, idx) => {
            const bal = round(balances[member] || 0);
            const isPositive = bal >= 0;
            return (
              <motion.div
                key={member}
                className={`balance-card ${isPositive ? "positive" : "negative"}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05, duration: 0.3 }}
              >
                <div className="avatar" style={{ background: getColor(idx) }}>
                  {getInitial(member)}
                </div>
                <div className="name">{member}</div>
                <div className="amount">
                  {isPositive ? "+" : "−"}{fmt(bal)}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ─── Settlements Section ────────────────────────────────────── */}
        {/* Only shown when there are actual debts to settle */}
        {settlements.length > 0 && (
          <>
            <h3 className="section-title">Settle Up</h3>
            <div className="settlements">
              <AnimatePresence>
                {settlements.map((s, i) => (
                  <motion.div
                    key={`${s.from}-${s.to}`}
                    className="settlement-item"
                    {...fadeUp}
                    transition={{ delay: i * 0.05 }}
                  >
                    <span className="settlement-from">{s.from}</span>
                    <span className="arrow"><ArrowRight size={16} /></span>
                    <span className="settlement-to">{s.to}</span>
                    <span className="settlement-amount">{fmt(s.amount)}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        )}

        {/* All settled message — shown when expenses exist but all balanced */}
        {settlements.length === 0 && expenses.length > 0 && (
          <div className="settlement-empty">✅ All settled up!</div>
        )}

        {/* ─── Expenses Section ───────────────────────────────────────── */}
        <div className="expenses-header">
          <h3 className="section-title">Expenses</h3>
          {/* Inline add button — only shown when expenses exist */}
          {expenses.length > 0 && (
            <button
              className="btn-primary btn-inline-add"
              onClick={() => { setEditingExpense(null); setModal("expense"); }}
            >
              <Plus size={14} /> Add
            </button>
          )}
        </div>

        <div className="expense-list">
          <LayoutGroup>
            <AnimatePresence mode="popLayout">
              {expenses.length === 0 ? (
                /* Empty state — shown when no expenses have been added yet */
                <motion.div className="empty-state" key="empty" {...fadeUp}>
                  <div className="empty-icon">🧾</div>
                  <p>No expenses yet</p>
                  <button
                    className="btn-primary"
                    onClick={() => { setEditingExpense(null); setModal("expense"); }}
                  >
                    <Plus size={16} /> Add First Expense
                  </button>
                </motion.div>
              ) : (
                expenses.map((expense) => {
                  // Build human-readable split description for the meta line
                  const splitLabel =
                    expense.splitType === "exact"
                      ? "Exact split"
                      : expense.excludedMembers?.length > 0
                        ? `Excludes ${expense.excludedMembers.join(", ")}`
                        : "Split equally";

                  return (
                    <motion.div
                      key={expense.id}
                      className="expense-item"
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="expense-icon">
                        {EXPENSE_ICONS[expense.category] || "📦"}
                      </div>
                      <div className="expense-info">
                        <div className="desc">{expense.description}</div>
                        <div className="meta">
                          Paid by {expense.paidBy} · {splitLabel}
                        </div>
                      </div>
                      <div className="expense-amount">{fmt(expense.amount)}</div>
                      <div className="expense-actions">
                        <button
                          className="btn-icon"
                          onClick={() => openEditExpense(expense)}
                          aria-label="Edit expense"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          className="btn-icon danger"
                          onClick={() => deleteExpense(expense.id)}
                          aria-label="Delete expense"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </LayoutGroup>
        </div>
      </main>

      {/* ─── Floating Action Button (Mobile Add) ─────────────────────── */}
      {/* Fixed position button for quick expense creation on mobile */}
      <button
        className="btn-add-fab"
        onClick={() => { setEditingExpense(null); setModal("expense"); }}
        aria-label="Add expense"
      >
        <Plus size={24} />
      </button>

      {/* ─── Modal Layer ─────────────────────────────────────────────── */}
      {/* AnimatePresence handles mount/unmount animations for modals */}
      <AnimatePresence>
        {modal === "expense" && (
          <ExpenseModal
            key="expense-modal"
            members={members}
            expense={editingExpense}
            onSave={editingExpense ? updateExpense : addExpense}
            onClose={closeModal}
          />
        )}
        {modal === "group" && (
          <GroupModal
            key="group-modal"
            groupName={groupName}
            groupDesc={groupDesc}
            members={members}
            onSave={(data) => { updateState(data); setModal(null); }}
            onClose={closeModal}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   EXPENSE MODAL — Add / Edit an expense
   
   Features:
   - Pre-fills form when editing an existing expense
   - Three split types: Equal (default), Exclude, Exact
   - Validates that exact amounts sum to the total before saving
   - Smooth spring animation for entrance/exit
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function ExpenseModal({ members, expense, onSave, onClose }) {
  const isEditing = !!expense;

  // Form state — pre-filled if editing, empty defaults if adding new
  const [form, setForm] = useState({
    description: expense?.description || "",
    amount: expense?.amount || "",
    paidBy: expense?.paidBy || members[0],
    category: expense?.category || "food",
    splitType: expense?.splitType || "equal",       // equal | exclude | exact
    excludedMembers: expense?.excludedMembers || [], // only used when splitType="exclude"
    customAmounts: expense?.customAmounts || {}      // only used when splitType="exact"
  });

  /** Shorthand to update a single form field */
  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  /** Toggle a member in/out of the excluded list */
  const toggleExclude = (member) => {
    setForm((f) => ({
      ...f,
      excludedMembers: f.excludedMembers.includes(member)
        ? f.excludedMembers.filter((m) => m !== member)
        : [...f.excludedMembers, member]
    }));
  };

  /** Update the custom amount for a specific member (exact split) */
  const setCustomAmount = (member, value) => {
    setForm((f) => ({
      ...f,
      customAmounts: { ...f.customAmounts, [member]: value }
    }));
  };

  /** Validate and save the expense */
  const handleSubmit = (e) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!form.description.trim() || isNaN(amount) || amount <= 0) return;

    // For exact split: validate that custom amounts add up to the total
    if (form.splitType === "exact") {
      const total = Object.values(form.customAmounts).reduce(
        (s, v) => s + (parseFloat(v) || 0), 0
      );
      if (Math.abs(total - amount) > 0.01) {
        alert(`Amounts must add up to ₹${amount}. Currently ₹${round(total)}.`);
        return;
      }
    }

    // Build the expense data object
    const data = {
      ...(isEditing ? { id: expense.id } : {}),
      description: form.description.trim(),
      amount: round(amount),
      paidBy: form.paidBy,
      category: form.category,
      splitType: form.splitType,
      // Only include relevant split data based on type
      excludedMembers: form.splitType === "exclude" ? form.excludedMembers : [],
      customAmounts: form.splitType === "exact"
        ? Object.fromEntries(
            Object.entries(form.customAmounts).map(([k, v]) => [k, round(parseFloat(v) || 0)])
          )
        : {}
    };

    onSave(data);
  };

  // Calculate remaining amount for exact split validation indicator
  const exactTotal = Object.values(form.customAmounts).reduce(
    (s, v) => s + (parseFloat(v) || 0), 0
  );
  const exactRemaining = round((parseFloat(form.amount) || 0) - exactTotal);

  return (
    <motion.div className="modal-overlay" {...overlayVariants} onClick={onClose}>
      <motion.div
        className="modal-sheet"
        {...sheetVariants}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle — cosmetic, signals "bottom sheet" on mobile */}
        <div className="modal-handle" />
        <div className="modal-header">
          <h3>{isEditing ? "Edit Expense" : "New Expense"}</h3>
          <button className="close-btn btn-icon" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {/* Description & Amount — side by side to save vertical space */}
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label htmlFor="exp-desc">What for?</label>
              <input
                id="exp-desc"
                type="text"
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="e.g. Dinner at Thalassa"
                autoFocus
                required
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="exp-amount">Amount (₹)</label>
              <input
                id="exp-amount"
                type="number"
                step="0.01"
                min="0.01"
                value={form.amount}
                onChange={(e) => update("amount", e.target.value)}
                placeholder="0"
                required
              />
            </div>
          </div>

          {/* Paid By & Category selects */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="exp-paidby">Paid by</label>
              <select
                id="exp-paidby"
                value={form.paidBy}
                onChange={(e) => update("paidBy", e.target.value)}
              >
                {members.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="exp-category">Category</label>
              <select
                id="exp-category"
                value={form.category}
                onChange={(e) => update("category", e.target.value)}
              >
                {Object.entries(EXPENSE_ICONS).map(([key, icon]) => (
                  <option key={key} value={key}>{icon} {key.charAt(0).toUpperCase() + key.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Split Type Segmented Control */}
          <div className="form-group">
            <label>How to split?</label>
            <div className="split-type-tabs">
              {[
                { key: "equal", label: "Equal" },
                { key: "exclude", label: "Exclude" },
                { key: "exact", label: "Exact" }
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  className={`tab ${form.splitType === key ? "active" : ""}`}
                  onClick={() => update("splitType", key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Conditional Split Options — animated expand/collapse */}
          <AnimatePresence mode="wait">
            {form.splitType === "exclude" && (
              <motion.div
                key="exclude"
                className="split-options"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <label className="sub-label">Who didn't participate?</label>
                {members.map((m) => (
                  <div className="checkbox-row" key={m}>
                    <input
                      type="checkbox"
                      id={`excl-${m}`}
                      checked={form.excludedMembers.includes(m)}
                      onChange={() => toggleExclude(m)}
                    />
                    <label htmlFor={`excl-${m}`}>{m}</label>
                  </div>
                ))}
              </motion.div>
            )}

            {form.splitType === "exact" && (
              <motion.div
                key="exact"
                className="split-options"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <label className="sub-label">
                  Enter each person's share
                  {/* Live validation indicator: shows remaining or ✓ when balanced */}
                  {form.amount && (
                    <span style={{
                      float: "right",
                      color: Math.abs(exactRemaining) < 0.01 ? "#059669" : "#DC2626"
                    }}>
                      {Math.abs(exactRemaining) < 0.01 ? "✓ Balanced" : `₹${exactRemaining} left`}
                    </span>
                  )}
                </label>
                {members.map((m) => (
                  <div className="amount-row" key={m}>
                    <span>{m}</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0"
                      value={form.customAmounts[m] || ""}
                      onChange={(e) => setCustomAmount(m, e.target.value)}
                    />
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons — sticky at bottom of modal */}
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">{isEditing ? "Update" : "Add Expense"}</button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   GROUP MODAL — Edit group name, description, and members
   
   Features:
   - Edit group name and description
   - Add new members (input is shown FIRST, above existing list)
   - Remove members (minimum 2 required)
   - Enter key support for adding members
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function GroupModal({ groupName, groupDesc, members, onSave, onClose }) {
  const [name, setName] = useState(groupName);
  const [desc, setDesc] = useState(groupDesc);
  const [memberList, setMemberList] = useState(members);
  const [newMember, setNewMember] = useState("");

  /** Add a new member to the list (prevents duplicates and empty names) */
  const addMember = () => {
    const trimmed = newMember.trim();
    if (trimmed && !memberList.includes(trimmed)) {
      setMemberList([...memberList, trimmed]);
      setNewMember(""); // Clear input after adding
    }
  };

  /** Remove a member (enforces minimum of 2 for bill splitting to work) */
  const removeMember = (m) => {
    if (memberList.length <= 2) {
      alert("You need at least 2 members to split bills.");
      return;
    }
    setMemberList(memberList.filter((x) => x !== m));
  };

  /** Save group changes back to parent */
  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      groupName: name.trim(),
      groupDesc: desc.trim(),
      members: memberList
    });
  };

  return (
    <motion.div className="modal-overlay" {...overlayVariants} onClick={onClose}>
      <motion.div
        className="modal-sheet"
        {...sheetVariants}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-handle" />
        <div className="modal-header">
          <h3>Edit Group</h3>
          <button className="close-btn btn-icon" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>

        <div className="modal-body">
          {/* Group Name */}
          <div className="form-group">
            <label htmlFor="grp-name">Group Name</label>
            <input
              id="grp-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Weekend Trip"
            />
          </div>

          {/* Group Description */}
          <div className="form-group">
            <label htmlFor="grp-desc">Description</label>
            <input
              id="grp-desc"
              type="text"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="e.g. Goa with friends"
            />
          </div>

          {/* Members Section */}
          <div className="form-group">
            <label>Members ({memberList.length})</label>

            {/* BUG FIX: Add member input is FIRST — user expectation is to
                add at top, not scroll down to find the input */}
            <div className="add-member-row">
              <input
                type="text"
                value={newMember}
                onChange={(e) => setNewMember(e.target.value)}
                placeholder="Add member name"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addMember();
                  }
                }}
              />
              <button type="button" className="btn-primary" onClick={addMember}>
                <Plus size={16} />
              </button>
            </div>

            {/* Existing members list */}
            <div className="member-list">
              <AnimatePresence>
                {memberList.map((m, i) => (
                  <motion.div
                    key={m}
                    className="member-row"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                  >
                    <div
                      className="avatar"
                      style={{ background: getColor(i) }}
                    >
                      {getInitial(m)}
                    </div>
                    <span className="member-name-text">{m}</span>
                    <button
                      className="remove-btn"
                      type="button"
                      onClick={() => removeMember(m)}
                      aria-label={`Remove ${m}`}
                    >
                      <X size={14} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Save / Cancel */}
          <div className="form-actions">
            <button className="btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn-primary" onClick={handleSave}>Save Group</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
