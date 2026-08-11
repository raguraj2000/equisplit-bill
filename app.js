/**
 * EquiSplit — World-Class Award Winning JS Application Logic
 * Full Editing Capabilities: Group Settings, Member Renaming, Expense Management, Mark as Settled
 */

class SplitBillApp {
  constructor() {
    this.storageKey = 'equisplit_app_state_v2';
    this.state = this.loadState() || this.getDefaultState();
    
    // UI State
    this.activeTab = 'summary'; // 'summary', 'expenses', 'settle'
    this.editingExpenseId = null;
    this.editingMemberName = null;
    this.currentSplitType = 'equal';
    
    this.init();
  }

  getDefaultState() {
    return {
      groupName: 'Goa Weekend Trip',
      currency: '₹',
      theme: 'dark',
      members: ['Rahul', 'Priya', 'Amit', 'Sneha'],
      expenses: [
        {
          id: 'exp_1',
          description: 'Beach Resort Villa (3 Nights)',
          amount: 12000,
          payer: 'Rahul',
          date: new Date(Date.now() - 172800000).toISOString(),
          splitType: 'equal',
          splits: { Rahul: 3000, Priya: 3000, Amit: 3000, Sneha: 3000 }
        },
        {
          id: 'exp_2',
          description: 'Friday Night Seafood & Cocktails',
          amount: 4800,
          payer: 'Priya',
          date: new Date(Date.now() - 86400000).toISOString(),
          splitType: 'equal',
          splits: { Rahul: 1200, Priya: 1200, Amit: 1200, Sneha: 1200 }
        },
        {
          id: 'exp_3',
          description: 'Craft Beers (Amit & Rahul only)',
          amount: 1500,
          payer: 'Amit',
          date: new Date().toISOString(),
          splitType: 'exclude',
          excludedMembers: ['Priya', 'Sneha'],
          splits: { Rahul: 750, Amit: 750, Priya: 0, Sneha: 0 }
        }
      ]
    };
  }

  loadState() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error('Failed to load state from localStorage', e);
      return null;
    }
  }

  saveState() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    } catch (e) {
      console.error('Failed to save state to localStorage', e);
    }
  }

  init() {
    document.documentElement.setAttribute('data-theme', this.state.theme || 'dark');
    this.attachEvents();
    this.render();
  }

  attachEvents() {
    // Theme Toggle
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        this.state.theme = this.state.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', this.state.theme);
        this.saveState();
        this.showToast(`Switched to ${this.state.theme.toUpperCase()} mode`);
      });
    }

    // Segmented Navigation Tabs
    document.querySelectorAll('.segment-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.segment-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.activeTab = e.target.dataset.tab;
        this.renderTabContent();
      });
    });

    // Add Member Form
    const addPersonForm = document.getElementById('addPersonForm');
    if (addPersonForm) {
      addPersonForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('newPersonName');
        const name = input.value.trim();
        if (name) {
          this.addMember(name);
          input.value = '';
        }
      });
    }

    // Expense Modal
    const openAddExpBtn = document.getElementById('openAddExpenseBtn');
    if (openAddExpBtn) {
      openAddExpBtn.addEventListener('click', () => this.openExpenseModal());
    }

    const closeExpModalBtn = document.getElementById('closeExpenseModalBtn');
    if (closeExpModalBtn) {
      closeExpModalBtn.addEventListener('click', () => this.closeExpenseModal());
    }

    const expenseForm = document.getElementById('expenseForm');
    if (expenseForm) {
      expenseForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleExpenseSubmit();
      });
    }

    // Group Settings Modal
    const editGroupBtn = document.getElementById('editGroupBtn');
    if (editGroupBtn) {
      editGroupBtn.addEventListener('click', () => this.openGroupModal());
    }

    const closeGroupModalBtn = document.getElementById('closeGroupModalBtn');
    if (closeGroupModalBtn) {
      closeGroupModalBtn.addEventListener('click', () => this.closeGroupModal());
    }

    const groupForm = document.getElementById('groupForm');
    if (groupForm) {
      groupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleGroupSubmit();
      });
    }

    // Member Edit Modal
    const closeMemberModalBtn = document.getElementById('closeMemberModalBtn');
    if (closeMemberModalBtn) {
      closeMemberModalBtn.addEventListener('click', () => this.closeMemberModal());
    }

    const memberEditForm = document.getElementById('memberEditForm');
    if (memberEditForm) {
      memberEditForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleMemberRenameSubmit();
      });
    }

    // Writeup Modal
    const openWriteupBtn = document.getElementById('openWriteupBtn');
    if (openWriteupBtn) {
      openWriteupBtn.addEventListener('click', () => {
        document.getElementById('writeupModal').classList.add('active');
      });
    }

    const closeWriteupBtn = document.getElementById('closeWriteupBtn');
    if (closeWriteupBtn) {
      closeWriteupBtn.addEventListener('click', () => {
        document.getElementById('writeupModal').classList.remove('active');
      });
    }

    // Reset Data
    const resetDataBtn = document.getElementById('resetDataBtn');
    if (resetDataBtn) {
      resetDataBtn.addEventListener('click', () => {
        if (confirm('Reset group data back to default preset?')) {
          this.state = this.getDefaultState();
          this.saveState();
          this.render();
          this.showToast('Reset to default preset');
        }
      });
    }

    // Presets
    document.querySelectorAll('.preset-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        const presetKey = e.currentTarget.dataset.preset;
        this.loadPreset(presetKey);
      });
    });
  }

  /* Member Editing & Management */
  addMember(name) {
    if (this.state.members.includes(name)) {
      this.showToast(`${name} is already in the group!`);
      return;
    }
    this.state.members.push(name);
    this.saveState();
    this.render();
    this.showToast(`Added ${name}`);
  }

  openEditMemberModal(name) {
    this.editingMemberName = name;
    document.getElementById('editMemberOldName').value = name;
    document.getElementById('editMemberNewName').value = name;
    document.getElementById('memberEditModal').classList.add('active');
  }

  closeMemberModal() {
    document.getElementById('memberEditModal').classList.remove('active');
    this.editingMemberName = null;
  }

  handleMemberRenameSubmit() {
    const oldName = this.editingMemberName;
    const newName = document.getElementById('editMemberNewName').value.trim();

    if (!newName) {
      this.showToast('Name cannot be empty!');
      return;
    }

    if (oldName === newName) {
      this.closeMemberModal();
      return;
    }

    if (this.state.members.includes(newName)) {
      this.showToast(`A member named "${newName}" already exists!`);
      return;
    }

    // Update member list
    const idx = this.state.members.indexOf(oldName);
    if (idx !== -1) this.state.members[idx] = newName;

    // Update all expense references
    this.state.expenses.forEach(exp => {
      if (exp.payer === oldName) exp.payer = newName;
      if (exp.splits && exp.splits[oldName] !== undefined) {
        exp.splits[newName] = exp.splits[oldName];
        delete exp.splits[oldName];
      }
      if (exp.excludedMembers) {
        exp.excludedMembers = exp.excludedMembers.map(m => m === oldName ? newName : m);
      }
    });

    this.saveState();
    this.closeMemberModal();
    this.render();
    this.showToast(`Renamed ${oldName} to ${newName}`);
  }

  removeMember(name) {
    if (this.state.members.length <= 2) {
      this.showToast('Minimum 2 members required to split bills!');
      return;
    }
    const hasExpenses = this.state.expenses.some(exp => exp.payer === name || (exp.splits && exp.splits[name] > 0));
    if (hasExpenses) {
      if (!confirm(`"${name}" is part of existing expenses. Remove member anyway?`)) return;
    }
    this.state.members = this.state.members.filter(m => m !== name);
    this.saveState();
    this.render();
    this.showToast(`Removed ${name}`);
  }

  /* Group Settings Editing */
  openGroupModal() {
    document.getElementById('groupNameInput').value = this.state.groupName || 'Goa Weekend Trip';
    document.getElementById('groupCurrencyInput').value = this.state.currency || '₹';
    document.getElementById('groupModal').classList.add('active');
  }

  closeGroupModal() {
    document.getElementById('groupModal').classList.remove('active');
  }

  handleGroupSubmit() {
    const name = document.getElementById('groupNameInput').value.trim();
    const curr = document.getElementById('groupCurrencyInput').value;

    if (name) this.state.groupName = name;
    if (curr) this.state.currency = curr;

    this.saveState();
    this.closeGroupModal();
    this.render();
    this.showToast('Group settings updated');
  }

  /* Core Calculation Engine & Greedy Debt Reduction */
  calculateBalances() {
    const balances = {};
    this.state.members.forEach(m => balances[m] = 0);

    this.state.expenses.forEach(exp => {
      const payer = exp.payer;
      const amount = parseFloat(exp.amount) || 0;
      
      if (balances[payer] !== undefined) {
        balances[payer] += amount;
      }

      if (exp.splits) {
        Object.entries(exp.splits).forEach(([member, share]) => {
          if (balances[member] !== undefined) {
            balances[member] -= parseFloat(share) || 0;
          }
        });
      }
    });

    return balances;
  }

  calculateSettlements() {
    const balances = this.calculateBalances();
    const debtors = [];
    const creditors = [];

    Object.entries(balances).forEach(([name, bal]) => {
      const roundedBal = Math.round(bal * 100) / 100;
      if (roundedBal < -0.01) {
        debtors.push({ name, amount: Math.abs(roundedBal) });
      } else if (roundedBal > 0.01) {
        creditors.push({ name, amount: roundedBal });
      }
    });

    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const transactions = [];
    let i = 0, j = 0;

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      const settleAmount = Math.min(debtor.amount, creditor.amount);
      const roundedSettle = Math.round(settleAmount * 100) / 100;

      if (roundedSettle > 0) {
        transactions.push({
          from: debtor.name,
          to: creditor.name,
          amount: roundedSettle
        });
      }

      debtor.amount -= settleAmount;
      creditor.amount -= settleAmount;

      if (Math.abs(debtor.amount) < 0.01) i++;
      if (Math.abs(creditor.amount) < 0.01) j++;
    }

    return transactions;
  }

  markAsSettled(from, to, amount) {
    // Add a settlement expense entry to balance out the debt
    const settlementExp = {
      id: 'exp_settle_' + Date.now(),
      description: `Payment: ${from} ➡️ ${to}`,
      amount: amount,
      payer: from,
      date: new Date().toISOString(),
      splitType: 'exact',
      splits: { [to]: amount }
    };

    this.state.expenses.unshift(settlementExp);
    this.saveState();
    this.render();
    this.showToast(`Marked ${this.state.currency}${amount} payment as settled! 🎉`);
  }

  /* Presets */
  loadPreset(key) {
    if (key === 'goa') {
      this.state = {
        groupName: 'Goa Weekend Trip 🏖️',
        currency: '₹',
        theme: this.state.theme,
        members: ['Rohan', 'Ananya', 'Karan', 'Pooja', 'Vikram'],
        expenses: [
          {
            id: 'exp_g1',
            description: 'Beach Resort Villa (3 Nights)',
            amount: 15000,
            payer: 'Rohan',
            date: new Date(Date.now() - 172800000).toISOString(),
            splitType: 'equal',
            splits: { Rohan: 3000, Ananya: 3000, Karan: 3000, Pooja: 3000, Vikram: 3000 }
          },
          {
            id: 'exp_g2',
            description: 'Scooter Rental & Fuel',
            amount: 2500,
            payer: 'Karan',
            date: new Date(Date.now() - 86400000).toISOString(),
            splitType: 'equal',
            splits: { Rohan: 500, Ananya: 500, Karan: 500, Pooja: 500, Vikram: 500 }
          },
          {
            id: 'exp_g3',
            description: 'Thalassa Dinner & Drinks',
            amount: 8400,
            payer: 'Ananya',
            date: new Date(Date.now() - 43200000).toISOString(),
            splitType: 'exclude',
            excludedMembers: ['Pooja'],
            splits: { Rohan: 2100, Ananya: 2100, Karan: 2100, Pooja: 0, Vikram: 2100 }
          }
        ]
      };
    } else if (key === 'rent') {
      this.state = {
        groupName: 'Flat 402 Rent & Utilities 🏠',
        currency: '₹',
        theme: this.state.theme,
        members: ['Aarav', 'Dev', 'Kabir'],
        expenses: [
          {
            id: 'exp_r1',
            description: 'Monthly Apartment Rent',
            amount: 36000,
            payer: 'Aarav',
            date: new Date().toISOString(),
            splitType: 'equal',
            splits: { Aarav: 12000, Dev: 12000, Kabir: 12000 }
          },
          {
            id: 'exp_r2',
            description: 'WiFi & Cook Salary',
            amount: 4500,
            payer: 'Dev',
            date: new Date().toISOString(),
            splitType: 'equal',
            splits: { Aarav: 1500, Dev: 1500, Kabir: 1500 }
          }
        ]
      };
    }
    this.saveState();
    this.render();
    this.showToast(`Loaded Preset: "${this.state.groupName}"`);
  }

  /* Expense Modal Logic */
  openExpenseModal(expenseToEdit = null) {
    const modal = document.getElementById('expenseModal');
    const title = document.getElementById('modalTitle');
    const payerSelect = document.getElementById('expensePayer');
    
    payerSelect.innerHTML = this.state.members.map(m => `<option value="${m}">${m}</option>`).join('');

    if (expenseToEdit) {
      this.editingExpenseId = expenseToEdit.id;
      title.innerText = 'Edit Expense';
      document.getElementById('expenseDesc').value = expenseToEdit.description;
      document.getElementById('expenseAmount').value = expenseToEdit.amount;
      payerSelect.value = expenseToEdit.payer;
      this.currentSplitType = expenseToEdit.splitType || 'equal';
    } else {
      this.editingExpenseId = null;
      title.innerText = 'Add Expense';
      document.getElementById('expenseDesc').value = '';
      document.getElementById('expenseAmount').value = '';
      this.currentSplitType = 'equal';
    }

    this.setupSplitTypeUI();
    modal.classList.add('active');
  }

  closeExpenseModal() {
    document.getElementById('expenseModal').classList.remove('active');
  }

  setupSplitTypeUI() {
    const container = document.getElementById('splitTypeOptions');
    const types = [
      { id: 'equal', label: 'Equal (÷)' },
      { id: 'exact', label: 'Exact (₹)' },
      { id: 'percent', label: 'Percent (%)' },
      { id: 'exclude', label: 'Exclude (🚫)' }
    ];

    container.innerHTML = types.map(t => `
      <button type="button" class="split-type-btn ${this.currentSplitType === t.id ? 'active' : ''}" data-type="${t.id}">
        ${t.label}
      </button>
    `).join('');

    container.querySelectorAll('.split-type-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        container.querySelectorAll('.split-type-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.currentSplitType = e.currentTarget.dataset.type;
        this.renderSplitInputs();
      });
    });

    const amountInput = document.getElementById('expenseAmount');
    amountInput.oninput = () => this.renderSplitInputs();

    this.renderSplitInputs();
  }

  renderSplitInputs() {
    const list = document.getElementById('splitPeopleList');
    const totalAmount = parseFloat(document.getElementById('expenseAmount').value) || 0;
    const numMembers = this.state.members.length;

    if (this.currentSplitType === 'equal') {
      const perPerson = numMembers > 0 ? (totalAmount / numMembers).toFixed(2) : 0;
      list.innerHTML = `
        <div style="font-size:0.88rem; color:var(--text-secondary); text-align:center; padding:14px; background:var(--bg-primary); border-radius:12px;">
          Split equally among ${numMembers} members: <strong style="color:var(--apple-blue); font-size:1.05rem;">${this.state.currency}${perPerson}</strong> each.
        </div>
      `;
    } else if (this.currentSplitType === 'exact') {
      list.innerHTML = this.state.members.map(m => `
        <div class="split-person-row">
          <div class="split-person-info">
            <div class="avatar">${m[0].toUpperCase()}</div>
            <span>${m}</span>
          </div>
          <input type="number" step="0.01" class="split-person-input exact-share-input" data-member="${m}" placeholder="0.00">
        </div>
      `).join('');
    } else if (this.currentSplitType === 'percent') {
      const defaultPct = (100 / numMembers).toFixed(1);
      list.innerHTML = this.state.members.map(m => `
        <div class="split-person-row">
          <div class="split-person-info">
            <div class="avatar">${m[0].toUpperCase()}</div>
            <span>${m}</span>
          </div>
          <div style="display:flex; align-items:center; gap:4px;">
            <input type="number" step="0.1" class="split-person-input pct-share-input" data-member="${m}" value="${defaultPct}">
            <span style="font-size:0.85rem; color:var(--text-secondary);">%</span>
          </div>
        </div>
      `).join('');
    } else if (this.currentSplitType === 'exclude') {
      list.innerHTML = `
        <div style="font-size:0.82rem; color:var(--text-secondary); margin-bottom:6px;">
          Uncheck members who didn't participate (e.g. didn't eat/drink):
        </div>
        ${this.state.members.map(m => `
          <div class="split-person-row">
            <div class="split-person-info">
              <div class="avatar">${m[0].toUpperCase()}</div>
              <span>${m}</span>
            </div>
            <input type="checkbox" class="split-person-checkbox include-checkbox" data-member="${m}" checked>
          </div>
        `).join('')}
      `;
    }
  }

  handleExpenseSubmit() {
    const desc = document.getElementById('expenseDesc').value.trim();
    const amount = parseFloat(document.getElementById('expenseAmount').value);
    const payer = document.getElementById('expensePayer').value;

    if (!desc || isNaN(amount) || amount <= 0) {
      this.showToast('Please enter a valid description and amount!');
      return;
    }

    const splits = {};
    const excludedMembers = [];

    if (this.currentSplitType === 'equal') {
      const share = amount / this.state.members.length;
      this.state.members.forEach(m => splits[m] = share);
    } else if (this.currentSplitType === 'exact') {
      let sum = 0;
      document.querySelectorAll('.exact-share-input').forEach(input => {
        const val = parseFloat(input.value) || 0;
        splits[input.dataset.member] = val;
        sum += val;
      });
      if (Math.abs(sum - amount) > 1) {
        this.showToast(`Exact shares sum (${this.state.currency}${sum}) must equal total (${this.state.currency}${amount})!`);
        return;
      }
    } else if (this.currentSplitType === 'percent') {
      let totalPct = 0;
      document.querySelectorAll('.pct-share-input').forEach(input => {
        const pct = parseFloat(input.value) || 0;
        totalPct += pct;
        splits[input.dataset.member] = (amount * pct) / 100;
      });
      if (Math.abs(totalPct - 100) > 1) {
        this.showToast(`Percentages total (${totalPct.toFixed(1)}%) must equal 100%!`);
        return;
      }
    } else if (this.currentSplitType === 'exclude') {
      const included = [];
      document.querySelectorAll('.include-checkbox').forEach(cb => {
        if (cb.checked) {
          included.push(cb.dataset.member);
        } else {
          excludedMembers.push(cb.dataset.member);
        }
      });
      if (included.length === 0) {
        this.showToast('At least one member must be included!');
        return;
      }
      const share = amount / included.length;
      this.state.members.forEach(m => {
        splits[m] = included.includes(m) ? share : 0;
      });
    }

    const expenseObj = {
      id: this.editingExpenseId || 'exp_' + Date.now(),
      description: desc,
      amount: amount,
      payer: payer,
      date: new Date().toISOString(),
      splitType: this.currentSplitType,
      excludedMembers,
      splits
    };

    if (this.editingExpenseId) {
      const idx = this.state.expenses.findIndex(e => e.id === this.editingExpenseId);
      if (idx !== -1) this.state.expenses[idx] = expenseObj;
    } else {
      this.state.expenses.unshift(expenseObj);
    }

    this.saveState();
    this.closeExpenseModal();
    this.render();
    this.showToast(this.editingExpenseId ? 'Expense updated!' : 'Expense added!');
  }

  deleteExpense(id) {
    if (confirm('Delete this expense?')) {
      this.state.expenses = this.state.expenses.filter(e => e.id !== id);
      this.saveState();
      this.render();
      this.showToast('Expense deleted');
    }
  }

  shareSettlementWhatsApp(settleObj) {
    const text = `Hey ${settleObj.from}! 👋\n` +
      `Regarding our *${this.state.groupName || 'Group'}* expenses:\n` +
      `💵 Please pay *${settleObj.to}*: *${this.state.currency}${settleObj.amount.toLocaleString('en-IN')}*\n\n` +
      `📲 Quick UPI / GPay / PhonePe / Paytm Settlement. Thanks!`;

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  }

  /* Render Logic */
  render() {
    this.renderSummaryHero();
    this.renderPeopleList();
    this.renderTabContent();
  }

  renderSummaryHero() {
    const totalSpent = this.state.expenses.reduce((acc, e) => acc + (parseFloat(e.amount) || 0), 0);
    const numMembers = this.state.members.length;
    const avgPerPerson = numMembers > 0 ? totalSpent / numMembers : 0;

    document.getElementById('groupNameHeader').innerText = this.state.groupName || 'Goa Weekend Trip';
    document.getElementById('totalSpentHero').innerText = `${this.state.currency}${Math.round(totalSpent).toLocaleString('en-IN')}`;
    document.getElementById('memberCountStat').innerText = numMembers;
    document.getElementById('avgSpentStat').innerText = `${this.state.currency}${Math.round(avgPerPerson).toLocaleString('en-IN')}`;
    document.getElementById('totalExpensesStat').innerText = this.state.expenses.length;

    // Render Spend Distribution Bar
    this.renderSpendDistributionBar(totalSpent);
  }

  renderSpendDistributionBar(totalSpent) {
    const track = document.getElementById('spendBarTrack');
    if (!track) return;

    if (totalSpent === 0) {
      track.innerHTML = `<div class="spend-bar-segment" style="width:100%; background:var(--bg-tertiary);"></div>`;
      return;
    }

    const paidByMember = {};
    this.state.members.forEach(m => paidByMember[m] = 0);
    this.state.expenses.forEach(e => {
      if (paidByMember[e.payer] !== undefined) {
        paidByMember[e.payer] += parseFloat(e.amount) || 0;
      }
    });

    const colors = ['#007AFF', '#34C759', '#FF9500', '#AF52DE', '#FF3B30', '#5856D6'];

    track.innerHTML = this.state.members.map((m, idx) => {
      const pct = ((paidByMember[m] / totalSpent) * 100).toFixed(1);
      const color = colors[idx % colors.length];
      return `<div class="spend-bar-segment" style="width:${pct}%; background:${color};" title="${m}: ${this.state.currency}${paidByMember[m]} (${pct}%)"></div>`;
    }).join('');
  }

  renderPeopleList() {
    const grid = document.getElementById('peopleGrid');
    if (!grid) return;

    grid.innerHTML = this.state.members.map(name => `
      <div class="person-chip">
        <div class="avatar">${name[0].toUpperCase()}</div>
        <span>${name}</span>
        <div class="chip-actions">
          <button class="chip-btn" onclick="window.app.openEditMemberModal('${name}')" title="Rename member">✏️</button>
          <button class="chip-btn delete" onclick="window.app.removeMember('${name}')" title="Remove member">✕</button>
        </div>
      </div>
    `).join('');
  }

  renderTabContent() {
    const summarySec = document.getElementById('summaryTabContent');
    const expensesSec = document.getElementById('expensesTabContent');
    const settleSec = document.getElementById('settleTabContent');

    if (this.activeTab === 'summary') {
      summarySec.style.display = 'block';
      expensesSec.style.display = 'none';
      settleSec.style.display = 'none';
      this.renderBalancesList();
    } else if (this.activeTab === 'expenses') {
      summarySec.style.display = 'none';
      expensesSec.style.display = 'block';
      settleSec.style.display = 'none';
      this.renderExpensesList();
    } else if (this.activeTab === 'settle') {
      summarySec.style.display = 'none';
      expensesSec.style.display = 'none';
      settleSec.style.display = 'block';
      this.renderSettlementsList();
    }
  }

  renderBalancesList() {
    const balances = this.calculateBalances();
    const container = document.getElementById('balancesList');
    if (!container) return;

    container.innerHTML = Object.entries(balances).map(([name, val]) => {
      const rounded = Math.round(val * 100) / 100;
      let statusClass = 'neutral';
      let text = 'Settled up';
      
      if (rounded > 0.01) {
        statusClass = 'positive';
        text = `gets back ${this.state.currency}${rounded.toLocaleString('en-IN')}`;
      } else if (rounded < -0.01) {
        statusClass = 'negative';
        text = `owes ${this.state.currency}${Math.abs(rounded).toLocaleString('en-IN')}`;
      }

      return `
        <div class="settlement-card">
          <div class="flow-user">
            <div class="avatar">${name[0].toUpperCase()}</div>
            <span>${name}</span>
          </div>
          <div class="stat-val ${statusClass}" style="font-size:0.95rem;">${text}</div>
        </div>
      `;
    }).join('');
  }

  renderExpensesList() {
    const container = document.getElementById('expensesList');
    if (!container) return;

    if (this.state.expenses.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">💸</div>
          <div>No expenses added yet! Tap "+ Add Expense" above.</div>
        </div>
      `;
      return;
    }

    container.innerHTML = this.state.expenses.map(exp => `
      <div class="expense-card">
        <div class="expense-top">
          <div>
            <div class="expense-title">${exp.description}</div>
            <div class="expense-subtitle">Paid by <strong>${exp.payer}</strong> • ${new Date(exp.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</div>
          </div>
          <div class="expense-amount">${this.state.currency}${parseFloat(exp.amount).toLocaleString('en-IN')}</div>
        </div>
        <div class="expense-tags">
          <span class="tag split-type">${(exp.splitType || 'equal').toUpperCase()} SPLIT</span>
          ${exp.excludedMembers && exp.excludedMembers.length > 0 ? `<span class="tag" style="background:var(--apple-orange-light); color:var(--apple-orange);">${exp.excludedMembers.length} Excluded</span>` : ''}
        </div>
        <div class="expense-actions">
          <button class="btn-ghost-sm" onclick="window.app.openExpenseModal(window.app.getExpenseById('${exp.id}'))">✏️ Edit</button>
          <button class="btn-ghost-sm delete" onclick="window.app.deleteExpense('${exp.id}')">🗑️ Delete</button>
        </div>
      </div>
    `).join('');
  }

  renderSettlementsList() {
    const settlements = this.calculateSettlements();
    const container = document.getElementById('settlementsList');
    if (!container) return;

    if (settlements.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🎉</div>
          <div style="font-weight:700; color:var(--apple-green);">Everyone is all settled up! No debts pending.</div>
        </div>
      `;
      return;
    }

    container.innerHTML = settlements.map((s, idx) => `
      <div class="settlement-card">
        <div class="debt-flow">
          <div class="flow-user">
            <div class="avatar" style="background:linear-gradient(135deg, #FF9500, #FF3B30);">${s.from[0].toUpperCase()}</div>
            <span>${s.from}</span>
          </div>
          <div class="flow-arrow">➡️</div>
          <div class="flow-user">
            <div class="avatar" style="background:linear-gradient(135deg, #34C759, #30D158);">${s.to[0].toUpperCase()}</div>
            <span>${s.to}</span>
          </div>
        </div>
        <div style="display:flex; flex-direction:column; align-items:flex-end; gap:6px;">
          <div class="flow-amount">${this.state.currency}${s.amount.toLocaleString('en-IN')}</div>
          <div class="settle-action-group">
            <button class="btn-action-sm" onclick="window.app.shareSettlementWhatsApp(window.app.calculateSettlements()[${idx}])">
              📲 Request UPI
            </button>
            <button class="btn-settle-mark" onclick="window.app.markAsSettled('${s.from}', '${s.to}', ${s.amount})" title="Record direct payment as settled">
              ✓ Settle
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  getExpenseById(id) {
    return this.state.expenses.find(e => e.id === id);
  }

  showToast(msg) {
    const container = document.getElementById('toastContainer') || this.createToastContainer();
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>✨ ${msg}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 2600);
  }

  createToastContainer() {
    const el = document.createElement('div');
    el.id = 'toastContainer';
    el.className = 'toast-container';
    document.body.appendChild(el);
    return el;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new SplitBillApp();
});
