/* ==========================================================================
   FARM HOUSE EXPENSE TRACKER - JAVASCRIPT APP CONTROLLER ENGINE
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  
  // --- Constants for Default Seeding ---
  const DEFAULT_DATE = '2026-05-22'; // Eid Day 02
  const INITIAL_TRANSACTIONS = [
    {
      id: 'init-farmhouse-booking',
      type: 'expense',
      category: 'Farm House',
      description: 'Farm House Rental Booking',
      amount: 40000,
      date: DEFAULT_DATE
    }
  ];

  const EXPENSE_CATEGORIES = ['Farm House', 'Transport', 'Foods', 'Miscellaneous', 'Custom Expense'];
  const INFLOW_CATEGORIES = ['Contributions', 'Cash received', 'Deposits', 'Custom Inflow'];

  // --- Core Application State ---
  let transactions = [];
  let currentEditingId = null;

  // --- UI Elements Selectors ---
  const tabButtons = document.querySelectorAll('.nav-btn');
  const tabViews = document.querySelectorAll('.tab-view');
  const pageTitle = document.getElementById('page-title');

  // Stats Dashboard
  const dashInflows = document.getElementById('dash-total-inflows');
  const dashExpenses = document.getElementById('dash-total-expenses');
  const dashBalance = document.getElementById('dash-net-balance');
  const dashBalanceSub = document.getElementById('dash-balance-sub');
  const balanceCardContainer = document.getElementById('balance-card-container');
  const dashCategoryBars = document.getElementById('dashboard-category-bars');
  const recentTransactionsTimeline = document.getElementById('recent-transactions-timeline');
  const totalCategoriesCountEl = document.getElementById('total-categories-count');

  // Expenses Tab Elements
  const expensesTableBody = document.getElementById('expenses-table-body');
  const expenseSearch = document.getElementById('expense-search');
  const expenseCategoryFilter = document.getElementById('expense-category-filter');
  const expensesCategoryCards = document.getElementById('expenses-category-cards');
  const expensesEmptyState = document.getElementById('expenses-empty-state');

  // Inflows Tab Elements
  const inflowsTableBody = document.getElementById('inflows-table-body');
  const inflowSearch = document.getElementById('inflow-search');
  const inflowCategoryFilter = document.getElementById('inflow-category-filter');
  const inflowBannerTotal = document.getElementById('inflow-banner-total');
  const inflowsEmptyState = document.getElementById('inflows-empty-state');

  // Modal Dialog Forms
  const modalBackdrop = document.getElementById('transaction-modal-backdrop');
  const modalContainer = document.getElementById('transaction-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const transactionForm = document.getElementById('transaction-form');
  const formTransIdInput = document.getElementById('form-transaction-id');
  const formTypeExpenseBtn = document.getElementById('form-type-expense');
  const formTypeInflowBtn = document.getElementById('form-type-inflow');
  const formDescInput = document.getElementById('form-desc');
  const formAmountInput = document.getElementById('form-amount');
  const formCategorySelect = document.getElementById('form-category');
  const customCategoryGroup = document.getElementById('custom-category-group');
  const formCustomCategoryInput = document.getElementById('form-custom-category');
  const formDateInput = document.getElementById('form-date');
  const formCancelBtn = document.getElementById('form-cancel-btn');
  const globalAddBtn = document.getElementById('global-add-btn');

  // Action Buttons in Sidebar / Header
  const exportJsonBtn = document.getElementById('export-json-btn');
  const importTriggerBtn = document.getElementById('import-trigger-btn');
  const importJsonFileInput = document.getElementById('import-json-file');
  const resetAppBtn = document.getElementById('reset-app-btn');
  const exportCsvBtn = document.getElementById('export-csv-btn');
  const viewAllActivityBtn = document.getElementById('view-all-activity-btn');
  const toastContainer = document.getElementById('toast-container');

  // --- Initializer Function ---
  function initApp() {
    // 1. Read from LocalStorage or seed defaults
    const storedData = localStorage.getItem('farmhouse_transactions');
    if (storedData) {
      try {
        transactions = JSON.parse(storedData);
      } catch (e) {
        showToast('Corrupted database detected. Seeding defaults.', 'error');
        transactions = [...INITIAL_TRANSACTIONS];
        saveToLocalStorage();
      }
    } else {
      transactions = [...INITIAL_TRANSACTIONS];
      saveToLocalStorage();
    }

    // 2. Setup Even Listeners
    setupEventListeners();

    // 3. Render View Elements
    renderAllViews();
    
    showToast('Dashboard initialized! Preloaded with Eid Day 02 Farm House budget.', 'info');
  }

  // --- State Persistence & Mutators ---
  function saveToLocalStorage() {
    localStorage.setItem('farmhouse_transactions', JSON.stringify(transactions));
  }

  // --- Global Render Coordinator ---
  function renderAllViews() {
    updateDynamicCalculations();
    renderDashboard();
    renderExpenses();
    renderInflows();
  }

  // --- Toast Notification System ---
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Choose icon depending on type
    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else if (type === 'error') {
      iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
    } else {
      iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    toast.innerHTML = `
      <div class="toast-icon">${iconSvg}</div>
      <span class="toast-message">${message}</span>
    `;

    toastContainer.appendChild(toast);

    // Remove notification after 3.5 seconds
    setTimeout(() => {
      toast.classList.add('removing');
      toast.addEventListener('animationend', () => {
        toast.remove();
      });
    }, 3500);
  }

  // --- Shared Calculation logic ---
  let totals = { inflows: 0, expenses: 0, balance: 0 };
  
  function updateDynamicCalculations() {
    let inflowSum = 0;
    let expenseSum = 0;

    transactions.forEach(t => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'inflow') {
        inflowSum += amt;
      } else {
        expenseSum += amt;
      }
    });

    totals.inflows = inflowSum;
    totals.expenses = expenseSum;
    totals.balance = inflowSum - expenseSum;
  }

  // Format currency helpers
  function formatPKR(val) {
    return 'PKR ' + Number(val).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  // --- View Render: Dashboard (Home) ---
  function renderDashboard() {
    // Update numerical cards
    dashInflows.textContent = formatPKR(totals.inflows);
    dashExpenses.textContent = formatPKR(totals.expenses);
    dashBalance.textContent = formatPKR(totals.balance);
    
    // Set dynamic text and styles for the net balance indicator
    balanceCardContainer.classList.remove('healthy', 'deficit', 'in-debt');
    if (totals.balance >= 0) {
      balanceCardContainer.classList.add('healthy');
      dashBalanceSub.textContent = 'Budget Covered: You have a healthy surplus!';
    } else if (totals.balance >= -40000) {
      balanceCardContainer.classList.add('deficit');
      dashBalanceSub.textContent = 'Deficit: Cover remaining costs with contributions.';
    } else {
      balanceCardContainer.classList.add('in-debt');
      dashBalanceSub.textContent = 'High Debt: Outstanding expenses exceed contributions!';
    }

    // Inflow gauge banner
    inflowBannerTotal.textContent = formatPKR(totals.inflows);

    // Category allocation progress bars
    // Collect all expenses categories (including custom ones)
    const expenseDataMap = {};
    // Seed default categories first
    EXPENSE_CATEGORIES.forEach(c => {
      if (c !== 'Custom Expense') expenseDataMap[c] = 0;
    });

    transactions.forEach(t => {
      if (t.type === 'expense') {
        const cat = t.category;
        expenseDataMap[cat] = (expenseDataMap[cat] || 0) + Number(t.amount);
      }
    });

    const categoryKeys = Object.keys(expenseDataMap);
    totalCategoriesCountEl.textContent = `${categoryKeys.length} Categories`;

    dashCategoryBars.innerHTML = '';
    
    categoryKeys.forEach(cat => {
      const amt = expenseDataMap[cat];
      const pct = totals.expenses > 0 ? Math.round((amt / totals.expenses) * 100) : 0;
      
      const dotClass = `dot-${cat.toLowerCase().replace(/\s+/g, '-')}`;
      
      // Determine bar colors depending on category
      let barBg = 'var(--gradient-neutral)';
      if (cat === 'Farm House') barBg = 'var(--gradient-balance)';
      if (cat === 'Foods') barBg = 'var(--gradient-expense)';
      if (cat === 'Transport') barBg = 'var(--gradient-neutral)';
      if (cat === 'Miscellaneous') barBg = 'linear-gradient(135deg, #84cc16 0%, #4d7c0f 100%)';

      const itemHtml = `
        <div class="category-progress-item">
          <div class="progress-details">
            <div class="cat-label">
              <span class="dot ${dotClass}" style="color: ${getColorToken(cat)}; background-color: ${getColorToken(cat)};"></span>
              <strong>${cat}</strong>
            </div>
            <span class="progress-val">${formatPKR(amt)} (${pct}%)</span>
          </div>
          <div class="progress-track">
            <div class="progress-bar" style="width: ${pct}%; background: ${barBg};"></div>
          </div>
        </div>
      `;
      dashCategoryBars.insertAdjacentHTML('beforeend', itemHtml);
    });

    // Recent activities list (take top 5 sorted by date or entry order)
    const recent = [...transactions]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);

    recentTransactionsTimeline.innerHTML = '';
    
    if (recent.length === 0) {
      recentTransactionsTimeline.innerHTML = `
        <div class="empty-widget">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          <p>No transactions logged. Use the header button to start!</p>
        </div>
      `;
      return;
    }

    recent.forEach(t => {
      const isExpense = t.type === 'expense';
      const typeClass = isExpense ? 'expense' : 'inflow';
      const icon = isExpense 
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>`;

      const itemHtml = `
        <div class="timeline-item">
          <div class="item-icon ${typeClass}">${icon}</div>
          <div class="item-details">
            <span class="item-desc">${t.description}</span>
            <div class="item-meta">
              <span class="category-badge-micro" style="color: ${getColorToken(t.category)}">${t.category}</span>
              <span class="bullet-sep">•</span>
              <span>${formatShortDate(t.date)}</span>
            </div>
          </div>
          <span class="item-amt ${typeClass}">${isExpense ? '-' : '+'}${formatPKR(t.amount)}</span>
        </div>
      `;
      recentTransactionsTimeline.insertAdjacentHTML('beforeend', itemHtml);
    });
  }

  function getColorToken(category) {
    if (category === 'Farm House') return 'var(--color-balance)';
    if (category === 'Foods') return 'var(--color-expense)';
    if (category === 'Transport') return 'var(--color-neutral)';
    if (category === 'Miscellaneous') return '#84cc16';
    if (category === 'Contributions') return 'var(--color-inflow)';
    if (category === 'Cash received') return '#06b6d4';
    if (category === 'Deposits') return '#8b5cf6';
    return '#f43f5e';
  }

  function formatShortDate(dateStr) {
    if (!dateStr) return '';
    try {
      const options = { month: 'short', day: 'numeric' };
      const dateObj = new Date(dateStr);
      return dateObj.toLocaleDateString('en-US', options);
    } catch (e) {
      return dateStr;
    }
  }

  // --- View Render: Expenses Tab ---
  function renderExpenses() {
    const filter = expenseCategoryFilter.value;
    const searchVal = expenseSearch.value.toLowerCase().trim();

    // Sum category details
    const summaryMap = {
      'Farm House': { total: 0, count: 0 },
      'Foods': { total: 0, count: 0 },
      'Transport': { total: 0, count: 0 },
      'Miscellaneous': { total: 0, count: 0 }
    };

    transactions.forEach(t => {
      if (t.type === 'expense') {
        const cat = t.category;
        if (summaryMap[cat]) {
          summaryMap[cat].total += Number(t.amount);
          summaryMap[cat].count++;
        } else {
          // Dynamic category sums (optional)
          summaryMap['Miscellaneous'].total += Number(t.amount);
          summaryMap['Miscellaneous'].count++;
        }
      }
    });

    // Populate the Category Summary Cards Row
    expensesCategoryCards.innerHTML = '';
    Object.keys(summaryMap).forEach(cat => {
      const details = summaryMap[cat];
      let colorClass = 'farm-house';
      let svgIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>';
      
      if (cat === 'Foods') {
        colorClass = 'foods';
        svgIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>';
      } else if (cat === 'Transport') {
        colorClass = 'transport';
        svgIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="22" height="13" rx="2" ry="2"></rect><line x1="12" y1="21" x2="12" y2="16"></line><line x1="8" y1="21" x2="16" y2="21"></line></svg>';
      } else if (cat === 'Miscellaneous') {
        colorClass = 'miscellaneous';
        svgIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
      }

      const cardHtml = `
        <div class="category-tile" style="color: ${getColorToken(cat)}" onclick="filterExpenseCategory('${cat}')">
          <div class="tile-icon-row">
            <span class="tile-label">${cat}</span>
            <div class="tile-icon">${svgIcon}</div>
          </div>
          <span class="tile-amt">${formatPKR(details.total)}</span>
          <span class="tile-count">${details.count} entries</span>
        </div>
      `;
      expensesCategoryCards.insertAdjacentHTML('beforeend', cardHtml);
    });

    // Populate Ledger Table
    expensesTableBody.innerHTML = '';
    const filtered = transactions.filter(t => {
      if (t.type !== 'expense') return false;
      if (filter !== 'all' && t.category !== filter) return false;
      if (searchVal !== '') {
        const matchesDesc = t.description.toLowerCase().includes(searchVal);
        const matchesCat = t.category.toLowerCase().includes(searchVal);
        return matchesDesc || matchesCat;
      }
      return true;
    });

    if (filtered.length === 0) {
      expensesEmptyState.style.display = 'flex';
      return;
    }
    expensesEmptyState.style.display = 'none';

    // Sort matching expenses descending by date
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    filtered.forEach(t => {
      const catClass = ['Farm House', 'Transport', 'Foods', 'Miscellaneous'].includes(t.category)
        ? t.category.toLowerCase().replace(/\s+/g, '-')
        : 'custom';
      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="description-col">${t.description}</td>
        <td><span class="category-badge ${catClass}">${t.category}</span></td>
        <td class="date-col">${t.date}</td>
        <td class="amount-col expense">${formatPKR(t.amount)}</td>
        <td class="actions-col">
          <div class="row-actions">
            <button class="row-btn edit-btn tooltip" title="Edit Entry" data-id="${t.id}">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
            <button class="row-btn delete-btn tooltip" title="Delete Entry" data-id="${t.id}">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </td>
      `;
      expensesTableBody.appendChild(row);
    });

    // Wire up dynamic action click events inside table rows
    setupTableActionListeners(expensesTableBody);
  }

  // Global helper for clickable category summary tiles
  window.filterExpenseCategory = function(catName) {
    expenseCategoryFilter.value = catName;
    renderExpenses();
    showToast(`Filtering expenses by category: ${catName}`, 'info');
  };

  // --- View Render: Inflows Tab ---
  function renderInflows() {
    const filter = inflowCategoryFilter.value;
    const searchVal = inflowSearch.value.toLowerCase().trim();

    inflowsTableBody.innerHTML = '';
    const filtered = transactions.filter(t => {
      if (t.type !== 'inflow') return false;
      if (filter !== 'all') {
        if (filter === 'Custom Inflow') {
          // If custom, match anything NOT in standard inflows
          return !['Contributions', 'Cash received', 'Deposits'].includes(t.category);
        }
        return t.category === filter;
      }
      if (searchVal !== '') {
        const matchesDesc = t.description.toLowerCase().includes(searchVal);
        const matchesCat = t.category.toLowerCase().includes(searchVal);
        return matchesDesc || matchesCat;
      }
      return true;
    });

    if (filtered.length === 0) {
      inflowsEmptyState.style.display = 'flex';
      return;
    }
    inflowsEmptyState.style.display = 'none';

    // Sort inflows by date descending
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    filtered.forEach(t => {
      const catClass = ['Contributions', 'Cash received', 'Deposits'].includes(t.category)
        ? t.category.toLowerCase().replace(/\s+/g, '-')
        : 'custom';
        
      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="description-col">${t.description}</td>
        <td><span class="category-badge ${catClass}">${t.category}</span></td>
        <td class="date-col">${t.date}</td>
        <td class="amount-col inflow">${formatPKR(t.amount)}</td>
        <td class="actions-col">
          <div class="row-actions">
            <button class="row-btn edit-btn tooltip" title="Edit Entry" data-id="${t.id}">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
            <button class="row-btn delete-btn tooltip" title="Delete Entry" data-id="${t.id}">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </td>
      `;
      inflowsTableBody.appendChild(row);
    });

    setupTableActionListeners(inflowsTableBody);
  }

  // Row Edit / Delete click wires
  function setupTableActionListeners(tableBody) {
    tableBody.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        openEditModal(id);
      });
    });

    tableBody.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        deleteTransactionEntry(id);
      });
    });
  }

  // --- Modal Operations ---
  
  function openAddModal(defaultType = 'expense') {
    currentEditingId = null;
    formTransIdInput.value = '';
    modalTitle.textContent = 'Add Budget Entry';
    
    // Set default fields
    formDescInput.value = '';
    formAmountInput.value = '';
    formCustomCategoryInput.value = '';
    customCategoryGroup.style.display = 'none';
    
    // Default to current local date
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    formDateInput.value = `${yyyy}-${mm}-${dd}`;

    setModalType(defaultType);
    
    // Reset invalid flags
    transactionForm.querySelectorAll('.form-group').forEach(fg => fg.classList.remove('invalid'));

    modalBackdrop.classList.add('active');
  }

  function openEditModal(id) {
    const t = transactions.find(item => item.id === id);
    if (!t) return;

    currentEditingId = id;
    formTransIdInput.value = id;
    modalTitle.textContent = 'Edit Budget Entry';
    
    formDescInput.value = t.description;
    formAmountInput.value = t.amount;
    formDateInput.value = t.date;

    setModalType(t.type);

    // Categories logic
    const list = t.type === 'expense' ? EXPENSE_CATEGORIES : INFLOW_CATEGORIES;
    const isCustom = !list.slice(0, -1).includes(t.category);

    if (isCustom) {
      formCategorySelect.value = t.type === 'expense' ? 'Custom Expense' : 'Custom Inflow';
      formCustomCategoryInput.value = t.category;
      customCategoryGroup.style.display = 'block';
    } else {
      formCategorySelect.value = t.category;
      formCustomCategoryInput.value = '';
      customCategoryGroup.style.display = 'none';
    }

    // Reset invalid flags
    transactionForm.querySelectorAll('.form-group').forEach(fg => fg.classList.remove('invalid'));

    modalBackdrop.classList.add('active');
  }

  function closeModal() {
    modalBackdrop.classList.remove('active');
    currentEditingId = null;
  }

  function setModalType(type) {
    if (type === 'expense') {
      formTypeExpenseBtn.classList.add('active');
      formTypeInflowBtn.classList.remove('active');
      populateModalCategories('expense');
    } else {
      formTypeInflowBtn.classList.add('active');
      formTypeExpenseBtn.classList.remove('active');
      populateModalCategories('inflow');
    }
  }

  function populateModalCategories(type) {
    formCategorySelect.innerHTML = '';
    const list = type === 'expense' ? EXPENSE_CATEGORIES : INFLOW_CATEGORIES;
    
    list.forEach(c => {
      const option = document.createElement('option');
      option.value = c;
      option.textContent = c;
      formCategorySelect.appendChild(option);
    });
  }

  // --- CRUD Logic Handlers ---

  function deleteTransactionEntry(id) {
    const item = transactions.find(t => t.id === id);
    if (!item) return;

    // Prevent deletion of initial farmhouse expense without a friendly confirmation
    if (id === 'init-farmhouse-booking') {
      if (!confirm('This is the primary preloaded Farm House booking of 40,000. Are you sure you want to remove it?')) {
        return;
      }
    }

    transactions = transactions.filter(t => t.id !== id);
    saveToLocalStorage();
    renderAllViews();
    showToast(`Removed entry: "${item.description}"`, 'success');
  }

  function handleFormSubmit(e) {
    e.preventDefault();

    // Manual Validation Check
    let isValid = true;

    // Type Check
    const isExpense = formTypeExpenseBtn.classList.contains('active');
    const type = isExpense ? 'expense' : 'inflow';

    // Description
    const desc = formDescInput.value.trim();
    const descGroup = formDescInput.closest('.form-group');
    if (!desc) {
      descGroup.classList.add('invalid');
      isValid = false;
    } else {
      descGroup.classList.remove('invalid');
    }

    // Amount
    const amt = Number(formAmountInput.value);
    const amtGroup = formAmountInput.closest('.form-group');
    if (isNaN(amt) || amt <= 0) {
      amtGroup.classList.add('invalid');
      isValid = false;
    } else {
      amtGroup.classList.remove('invalid');
    }

    // Category Choice
    let category = formCategorySelect.value;
    const catGroup = formCategorySelect.closest('.form-group');
    const customGroup = formCustomCategoryInput.closest('.form-group');

    if (!category) {
      catGroup.classList.add('invalid');
      isValid = false;
    } else {
      catGroup.classList.remove('invalid');
    }

    // Custom Category Input check
    if (category === 'Custom Expense' || category === 'Custom Inflow') {
      const customVal = formCustomCategoryInput.value.trim();
      if (!customVal) {
        customGroup.classList.add('invalid');
        isValid = false;
      } else {
        customGroup.classList.remove('invalid');
        category = customVal; // Bind actual custom input text
      }
    } else {
      customGroup.classList.remove('invalid');
    }

    // Date
    const date = formDateInput.value;
    const dateGroup = formDateInput.closest('.form-group');
    if (!date) {
      dateGroup.classList.add('invalid');
      isValid = false;
    } else {
      dateGroup.classList.remove('invalid');
    }

    if (!isValid) {
      showToast('Validation failed. Please correct form errors.', 'error');
      return;
    }

    // Save state logic
    if (currentEditingId) {
      // EDIT existing transaction
      const index = transactions.findIndex(t => t.id === currentEditingId);
      if (index !== -1) {
        transactions[index] = {
          ...transactions[index],
          type,
          description: desc,
          amount: amt,
          category,
          date
        };
        showToast('Budget entry updated successfully!', 'success');
      }
    } else {
      // ADD new transaction
      const newEntry = {
        id: 'trans-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        type,
        description: desc,
        amount: amt,
        category,
        date
      };
      transactions.push(newEntry);
      showToast('New entry logged successfully!', 'success');
    }

    saveToLocalStorage();
    closeModal();
    renderAllViews();
  }

  // --- Setup Even Listeners ---
  function setupEventListeners() {
    
    // Tab switching controls
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabName = btn.getAttribute('data-tab');
        
        tabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        tabViews.forEach(view => view.classList.remove('active'));
        document.getElementById(`tab-${tabName}`).classList.add('active');

        // Capitalize title
        pageTitle.textContent = btn.querySelector('span').textContent;
        
        // Scroll main to top
        document.querySelector('.main-content').scrollTop = 0;
      });
    });

    // Global Add Button Action (Header)
    globalAddBtn.addEventListener('click', () => {
      // Determine what modal default to use depending on active tab view
      const activeTab = document.querySelector('.nav-btn.active').getAttribute('data-tab');
      if (activeTab === 'inflows') {
        openAddModal('inflow');
      } else {
        openAddModal('expense');
      }
    });

    // Specific Ledger Section Add Buttons
    document.getElementById('add-expense-btn').addEventListener('click', () => openAddModal('expense'));
    document.getElementById('add-inflow-btn').addEventListener('click', () => openAddModal('inflow'));

    // Modal Close Triggers
    modalCloseBtn.addEventListener('click', closeModal);
    formCancelBtn.addEventListener('click', closeModal);
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) closeModal();
    });

    // Modal Switch toggles (Expense/Inflow toggle)
    formTypeExpenseBtn.addEventListener('click', () => setModalType('expense'));
    formTypeInflowBtn.addEventListener('click', () => setModalType('inflow'));

    // Custom Category Display trigger
    formCategorySelect.addEventListener('change', () => {
      const val = formCategorySelect.value;
      if (val === 'Custom Expense' || val === 'Custom Inflow') {
        customCategoryGroup.style.display = 'block';
        formCustomCategoryInput.focus();
      } else {
        customCategoryGroup.style.display = 'none';
      }
    });

    // Form submission submit
    transactionForm.addEventListener('submit', handleFormSubmit);

    // Ledger Search / Filter listeners
    expenseSearch.addEventListener('input', renderExpenses);
    expenseCategoryFilter.addEventListener('change', renderExpenses);

    inflowSearch.addEventListener('input', renderInflows);
    inflowCategoryFilter.addEventListener('change', renderInflows);

    // Back-to-List from dashboard recent timelines
    viewAllActivityBtn.addEventListener('click', () => {
      // Fire Expenses Tab Click
      document.getElementById('tab-btn-expenses').click();
    });

    // --- sidebar buttons ---
    
    // JSON Export trigger
    exportJsonBtn.addEventListener('click', () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(transactions, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href",     dataStr);
      downloadAnchor.setAttribute("download", `farm_house_budget_backup_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('Exported backup database successfully!', 'success');
    });

    // JSON Import trigger
    importTriggerBtn.addEventListener('click', () => {
      importJsonFileInput.click();
    });

    importJsonFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function(event) {
        try {
          const parsed = JSON.parse(event.target.result);
          if (Array.isArray(parsed)) {
            // Basic structure checking
            const isValid = parsed.every(t => t.id && t.type && t.category && t.description && t.amount && t.date);
            if (isValid) {
              transactions = parsed;
              saveToLocalStorage();
              renderAllViews();
              showToast('Backup restored successfully!', 'success');
            } else {
              showToast('Invalid backup file structure.', 'error');
            }
          } else {
            showToast('JSON file is not a valid list.', 'error');
          }
        } catch (error) {
          showToast('Failed to parse backup. Check file structure.', 'error');
        }
        importJsonFileInput.value = ''; // Reset input selection
      };
      reader.readAsText(file);
    });

    // CSV Export trigger
    exportCsvBtn.addEventListener('click', () => {
      let csvContent = 'ID,Type,Description,Category,Amount (PKR),Date\r\n';
      
      transactions.forEach(t => {
        // Escape strings quotes
        const desc = `"${t.description.replace(/"/g, '""')}"`;
        const cat = `"${t.category.replace(/"/g, '""')}"`;
        csvContent += `${t.id},${t.type},${desc},${cat},${t.amount},${t.date}\r\n`;
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `farm_house_expense_ledger_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast('Exported CSV spreadsheet successfully!', 'success');
    });

    // Reset Application data
    resetAppBtn.addEventListener('click', () => {
      if (confirm('CAUTION: This will clear all inflows and expenses and restore original default settings. Are you sure you want to proceed?')) {
        transactions = [...INITIAL_TRANSACTIONS];
        saveToLocalStorage();
        renderAllViews();
        showToast('All transaction records have been reset.', 'info');
      }
    });

  }

  // Start the application
  initApp();

});
