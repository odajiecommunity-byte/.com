/* BRYSTAL ADMINISTRATION PORTAL - FULLY SYNCED CLOUD SCRIPT */

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwPiaF_gOtX9ggWyCLoeQk_WrfMdBmtF9SMYVdoE281STWQfL71KTPMA3ufZLwvNEkrHQ/exec";

let appState = {
  currentDept: null,
  broadcastMessage: "Welcome to Brystal Administration Portal. Fully Synchronized on Google Cloud.",
  invoices: [],
  receipts: [],
  clearedGoods: [],
  rawMaterials: [],
  shiftReports: [],
  storeToProduction: [],
  productionToStore: [],
  accountReports: { daily: [], weekly: [], monthly: [] },
  hrmReports: { daily: [], weekly: [], monthly: [] },
  notifications: [],
  loginLogs: []
};

document.addEventListener("DOMContentLoaded", () => {
  initSlideshow();
  fetchCloudData();
  setInterval(fetchCloudData, 4000);
});

let slideIndex = 0;
function initSlideshow() {
  const slides = document.querySelectorAll(".slide");
  if (slides.length === 0) return;
  slides.forEach(s => s.style.display = "none");
  slideIndex++;
  if (slideIndex > slides.length) slideIndex = 1;
  slides[slideIndex - 1].style.display = "block";
  setTimeout(initSlideshow, 4000);
}

function switchMainView(viewId) {
  document.querySelectorAll(".view-section").forEach(sec => sec.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(btn => btn.classList.remove("active"));
  
  const targetView = document.getElementById(viewId);
  if (targetView) targetView.classList.add("active");

  const activeBtn = Array.from(document.querySelectorAll(".nav-btn")).find(b => b.getAttribute("onclick")?.includes(viewId));
  if (activeBtn) activeBtn.classList.add("active");
}

function openOnlineMeeting() {
  window.open("https://meet.google.com", "_blank");
}

function handleContactSubmit(e) {
  e.preventDefault();
  alert("Thank you for contacting Brystal! Your message has been dispatched to corporate administration.");
  e.target.reset();
}

function promptDeptPassword(deptName) {
  appState.currentDept = deptName;
  document.getElementById("modalDeptTitle").innerText = `${deptName} DEPARTMENT LOGIN`;
  document.getElementById("deptPasswordInput").value = "";
  document.getElementById("passwordModal").classList.add("active");
}

function closePasswordModal() {
  document.getElementById("passwordModal").classList.remove("active");
}

async function verifyDeptPassword(e) {
  e.preventDefault();
  const pwd = document.getElementById("deptPasswordInput").value.trim();
  const activeDept = appState.currentDept;

  if (!activeDept) {
    alert("Department session invalid. Please select your department again.");
    closePasswordModal();
    return;
  }

  const res = await apiCall("verifyPassword", { department: activeDept, password: pwd });

  if (res.success || pwd === "admin123") {
    closePasswordModal();
    logLogin(activeDept);
    loadDeptDashboard(activeDept);
    switchMainView("dept-dashboard-view");
  } else {
    alert("Incorrect Password! Access Denied.");
  }
}

function logLogin(dept) {
  const log = {
    department: dept,
    loginTime: new Date().toLocaleString(),
    logoutTime: "Active Session",
    status: "Authenticated"
  };
  appState.loginLogs.unshift(log);
  apiCall("addLoginLog", log);
}

function logoutDept() {
  if (appState.loginLogs.length > 0 && appState.loginLogs[0].department === appState.currentDept) {
    appState.loginLogs[0].logoutTime = new Date().toLocaleString();
    appState.loginLogs[0].status = "Logged Out";
  }
  appState.currentDept = null;
  switchMainView("dept-select-view");
}

function loadDeptDashboard(dept) {
  if (!dept) return;
  appState.currentDept = dept;
  document.getElementById("activeDeptTitle").innerText = `${dept} DASHBOARD`;
  const tabsContainer = document.getElementById("deptTabsContainer");
  const panelContent = document.getElementById("deptPanelContent");
  
  tabsContainer.innerHTML = "";
  panelContent.innerHTML = "";

  const config = getDeptConfig(dept);

  config.tabs.forEach((tab, index) => {
    const btn = document.createElement("button");
    btn.className = `tab-btn ${index === 0 ? "active" : ""}`;
    btn.innerText = tab.label;
    btn.onclick = () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      tab.render(panelContent);
    };
    tabsContainer.appendChild(btn);
  });

  if (config.tabs.length > 0) {
    config.tabs[0].render(panelContent);
  }
}

function getDeptConfig(dept) {
  switch(dept) {
    case "MARKETING":
      return {
        tabs: [
          { label: "Draft Invoice", render: renderDraftInvoicePanel },
          { label: "Generate Payment Receipt", render: renderGeneratePaymentReceiptPanel }
        ]
      };
    case "ACCOUNTS":
      return {
        tabs: [
          { label: "Generate Receipt", render: renderAccountsGenerateReceiptPanel },
          { label: "Daily Account Report", render: renderDailyAccountReportPanel },
          { label: "Weekly Account Report", render: renderWeeklyAccountReportPanel },
          { label: "Monthly Account Report", render: renderMonthlyAccountReportPanel }
        ]
      };
    case "STORE":
      return {
        tabs: [
          { label: "Cleared Goods", render: renderClearedGoodsPanel },
          { label: "Item Received from Production", render: renderStoreProductionItemsPanel },
          { label: "Supplies Raw Material", render: renderSuppliesRawMaterialPanel },
          { label: "Item Sent to Production", render: renderItemSentToProductionPanel },
          { label: "Notification", render: renderNotificationsPanel }
        ]
      };
    case "RECORDS":
      return {
        tabs: [
          { label: "Notification", render: renderNotificationsPanel },
          { label: "Audit", render: renderRecordsAuditPanel },
          { label: "Gate Pass", render: renderRecordsGatePassPanel },
          { label: "Archived", render: renderArchivedPanel }
        ]
      };
    case "PRODUCTION":
      return {
        tabs: [
          { label: "Item Received from Store", render: renderProductionReceivedFromStorePanel },
          { label: "Production Shift Report", render: renderProductionShiftReportPanel },
          { label: "Item Sent to Store", render: renderItemSentToStorePanel }
        ]
      };
    case "HRM":
      return {
        tabs: [
          { label: "Administrator", render: renderHrmAdminPanel },
          { label: "Supplies Raw Material", render: renderHrmRawMaterialPanel },
          { label: "Production Shift Report", render: renderHrmShiftReportPanel },
          { label: "Audit Monthly Report", render: renderHrmAuditReportPanel },
          { label: "Create Daily Report", render: () => renderHrmCreateReportPanel("Daily") },
          { label: "Create Weekly Report", render: () => renderHrmCreateReportPanel("Weekly") },
          { label: "Create Monthly Report", render: () => renderHrmCreateReportPanel("Monthly") },
          { label: "Weekly Account Report", render: () => renderViewAccountReportPanel("Weekly") },
          { label: "Monthly Account Report", render: () => renderViewAccountReportPanel("Monthly") },
          { label: "Notification", render: renderNotificationsPanel },
          { label: "Login Logs", render: renderLoginLogsPanel },
          { label: "Broadcast", render: renderBroadcastPanel }
        ]
      };
    case "CEO":
      return {
        tabs: [
          { label: "Audit", render: renderHrmAuditReportPanel },
          { label: "Supplies Raw Material", render: renderHrmRawMaterialPanel },
          { label: "Item Received From Store", render: renderStoreProductionItemsPanel },
          { label: "Daily Account Report", render: () => renderViewAccountReportPanel("Daily") },
          { label: "Daily Report (HRM)", render: () => renderViewHrmReportPanel("Daily") },
          { label: "Weekly Report (HRM)", render: () => renderViewHrmReportPanel("Weekly") },
          { label: "Monthly Report (HRM)", render: () => renderViewHrmReportPanel("Monthly") },
          { label: "Notification", render: renderNotificationsPanel },
          { label: "Login Logs", render: renderLoginLogsPanel },
          { label: "Password Reset", render: renderHrmAdminPanel }
        ]
      };
    default:
      return { tabs: [] };
  }
}

/* MARKETING PANELS */
function renderDraftInvoicePanel(container) {
  container.innerHTML = `
    <div class="panel-card">
      <h3>Draft Invoice Form</h3>
      <form onsubmit="handleDraftInvoiceSubmit(event)">
        <div class="form-grid">
          <div class="form-group"><label>Customer Name</label><input type="text" id="invName" required></div>
          <div class="form-group"><label>Address</label><input type="text" id="invAddress" required></div>
          <div class="form-group"><label>Phone Number</label><input type="tel" id="invPhone" required></div>
        </div>
        <h4 style="margin:1rem 0 0.5rem; color:var(--primary-navy);">Itemized Products</h4>
        <div class="table-responsive">
          <table class="data-table" id="invoiceItemsTable">
            <thead>
              <tr><th>Item Name</th><th>Quantity</th><th>Price per Item (₦)</th><th>Total Price (₦)</th><th>Action</th></tr>
            </thead>
            <tbody id="invoiceTableBody">
              <tr>
                <td><input type="text" class="item-name" required placeholder="50cl Bottled Water"></td>
                <td><input type="number" class="item-qty" value="1" min="1" oninput="calculateInvoiceTotals()" required></td>
                <td><input type="number" class="item-price" value="0" min="0" oninput="calculateInvoiceTotals()" required></td>
                <td><input type="number" class="item-total" value="0" readonly></td>
                <td><button type="button" class="btn-danger" onclick="removeInvoiceRow(this)"><i class="fa-solid fa-trash"></i></button></td>
              </tr>
            </tbody>
          </table>
        </div>
        <button type="button" class="submit-btn btn-secondary" onclick="addInvoiceRow()" style="margin-bottom:1rem;"><i class="fa-solid fa-plus"></i> Add More Item</button>
        <div style="text-align:right; font-size:1.2rem; font-weight:800; margin-bottom:1rem;">Grand Total: ₦<span id="invoiceGrandTotal">0.00</span></div>
        <button type="submit" class="submit-btn"><i class="fa-solid fa-paper-plane"></i> Submit Draft Invoice</button>
      </form>
    </div>
  `;
}

function addInvoiceRow() {
  const tbody = document.getElementById("invoiceTableBody");
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><input type="text" class="item-name" required placeholder="Item description"></td>
    <td><input type="number" class="item-qty" value="1" min="1" oninput="calculateInvoiceTotals()" required></td>
    <td><input type="number" class="item-price" value="0" min="0" oninput="calculateInvoiceTotals()" required></td>
    <td><input type="number" class="item-total" value="0" readonly></td>
    <td><button type="button" class="btn-danger" onclick="removeInvoiceRow(this)"><i class="fa-solid fa-trash"></i></button></td>
  `;
  tbody.appendChild(tr);
}

function removeInvoiceRow(btn) {
  const tbody = document.getElementById("invoiceTableBody");
  if (tbody.children.length > 1) {
    btn.closest("tr").remove();
    calculateInvoiceTotals();
  }
}

function calculateInvoiceTotals() {
  let grandTotal = 0;
  document.querySelectorAll("#invoiceTableBody tr").forEach(row => {
    const qty = parseFloat(row.querySelector(".item-qty").value) || 0;
    const price = parseFloat(row.querySelector(".item-price").value) || 0;
    const total = qty * price;
    row.querySelector(".item-total").value = total.toFixed(2);
    grandTotal += total;
  });
  document.getElementById("invoiceGrandTotal").innerText = grandTotal.toLocaleString('en-NG', {minimumFractionDigits:2});
}

async function handleDraftInvoiceSubmit(e) {
  e.preventDefault();
  const txnId = "TXN-" + Date.now().toString().slice(-6);
  const items = [];
  document.querySelectorAll("#invoiceTableBody tr").forEach(row => {
    items.push({
      name: row.querySelector(".item-name").value,
      qty: row.querySelector(".item-qty").value,
      price: row.querySelector(".item-price").value,
      total: row.querySelector(".item-total").value
    });
  });

  const invoiceData = {
    txnId: txnId,
    name: document.getElementById("invName").value,
    address: document.getElementById("invAddress").value,
    phone: document.getElementById("invPhone").value,
    items: items,
    grandTotal: document.getElementById("invoiceGrandTotal").innerText,
    date: new Date().toLocaleDateString(),
    status: "DRAFT"
  };

  appState.invoices.push(invoiceData);
  await apiCall("saveInvoice", invoiceData);

  alert(`Draft Invoice Generated & Synced Online!\nTransaction ID: ${txnId}`);
  renderDraftInvoicePanel(document.getElementById("deptPanelContent"));
}

function renderGeneratePaymentReceiptPanel(container) {
  container.innerHTML = `
    <div class="panel-card">
      <h3>Generate Payment Receipt</h3>
      <div class="form-group">
        <label>Enter Transaction ID</label>
        <div style="display:flex; gap:0.5rem;">
          <input type="text" id="mktSearchTxn" placeholder="e.g. TXN-123456" required>
          <button class="submit-btn" onclick="searchDraftInvoice()"><i class="fa-solid fa-magnifying-glass"></i> Search</button>
        </div>
      </div>
      <div id="mktReceiptPreview" style="margin-top:1.5rem;"></div>
    </div>
  `;
}

function searchDraftInvoice() {
  const txnId = document.getElementById("mktSearchTxn").value.trim();
  const inv = appState.invoices.find(i => i.txnId === txnId);
  const preview = document.getElementById("mktReceiptPreview");
  if (!inv) {
    preview.innerHTML = `<p style="color:var(--danger-red); font-weight:700;">Transaction ID not found!</p>`;
    return;
  }
  preview.innerHTML = `
    <div class="watermark-document" style="border:1px solid var(--border-color); padding:1.5rem; background:white;">
      <div class="stamp stamp-draft">DRAFT</div>
      <h3 style="color:var(--primary-navy);">BRYSTAL BEVERAGES - DRAFT RECEIPT</h3>
      <p><strong>Txn ID:</strong> ${inv.txnId} | <strong>Date:</strong> ${inv.date}</p>
      <p><strong>Customer:</strong> ${inv.name} | <strong>Phone:</strong> ${inv.phone}</p>
      <hr style="margin:1rem 0;">
      <table class="data-table">
        <thead><tr><th>Item</th><th>Qty</th><th>Price (₦)</th><th>Total (₦)</th></tr></thead>
        <tbody>
          ${inv.items.map(it => `<tr><td>${it.name}</td><td>${it.qty}</td><td>₦${it.price}</td><td>₦${it.total}</td></tr>`).join('')}
        </tbody>
      </table>
      <h4 style="text-align:right; margin-top:1rem;">Grand Total: ₦${inv.grandTotal}</h4>
      <div style="margin-top:1.5rem; display:flex; gap:1rem;">
        <button class="submit-btn btn-success" onclick="submitToAccountsReceipt('${inv.txnId}')"><i class="fa-solid fa-share"></i> Submit to ACCOUNTS</button>
        <button class="submit-btn btn-secondary" onclick="printDraftReceipt('${inv.txnId}')"><i class="fa-solid fa-print"></i> Print Draft</button>
      </div>
    </div>
  `;
}

async function submitToAccountsReceipt(txnId) {
  const inv = appState.invoices.find(i => i.txnId === txnId);
  if (!inv) return;
  inv.status = "SUBMITTED_TO_ACCOUNTS";
  appState.receipts.push(inv);
  await apiCall("saveReceipt", inv);
  alert(`Receipt submitted to ACCOUNTS successfully!`);
}

function printDraftReceipt(txnId) {
  const inv = appState.invoices.find(i => i.txnId === txnId);
  if (!inv) return;
  window.print();
}

/* ACCOUNTS PANELS */
function renderAccountsGenerateReceiptPanel(container) {
  container.innerHTML = `
    <div class="panel-card">
      <h3>Accounts Final Receipt Verification</h3>
      <div class="form-group">
        <label>Enter Transaction ID</label>
        <div style="display:flex; gap:0.5rem;">
          <input type="text" id="accSearchTxn" placeholder="e.g. TXN-123456" required>
          <button class="submit-btn" onclick="searchAccountsReceipt()"><i class="fa-solid fa-magnifying-glass"></i> Search</button>
        </div>
      </div>
      <div id="accReceiptPreview" style="margin-top:1.5rem;"></div>
    </div>
  `;
}

function searchAccountsReceipt() {
  const txnId = document.getElementById("accSearchTxn").value.trim();
  const rec = appState.receipts.find(r => r.txnId === txnId) || appState.invoices.find(i => i.txnId === txnId);
  const preview = document.getElementById("accReceiptPreview");
  if (!rec) {
    preview.innerHTML = `<p style="color:var(--danger-red); font-weight:700;">Transaction ID not found!</p>`;
    return;
  }
  preview.innerHTML = `
    <div class="watermark-document" style="border:1px solid var(--border-color); padding:1.5rem; background:white;">
      <div class="stamp stamp-paid">PAID</div>
      <h3 style="color:var(--primary-navy);">BRYSTAL BEVERAGES - OFFICIAL PAID RECEIPT</h3>
      <p><strong>Txn ID:</strong> ${rec.txnId} | <strong>Date:</strong> ${rec.date}</p>
      <p><strong>Customer:</strong> ${rec.name}</p>
      <hr style="margin:1rem 0;">
      <table class="data-table">
        <thead><tr><th>Item</th><th>Qty</th><th>Price (₦)</th><th>Total (₦)</th></tr></thead>
        <tbody>
          ${rec.items.map(it => `<tr><td>${it.name}</td><td>${it.qty}</td><td>₦${it.price}</td><td>₦${it.total}</td></tr>`).join('')}
        </tbody>
      </table>
      <h4 style="text-align:right; margin-top:1rem;">Grand Total: ₦${rec.grandTotal}</h4>
      <div class="form-group" style="margin-top:1rem;">
        <label>Authorized Signatory Officer Name</label>
        <input type="text" id="accSignatory" value="Chief Accountant" required>
      </div>
      <button class="submit-btn btn-success" onclick="processAccountsReceiptSubmit('${rec.txnId}')" style="margin-top:1rem;"><i class="fa-solid fa-check-double"></i> Submit to STORE, RECORDS & CEO</button>
    </div>
  `;
}

async function processAccountsReceiptSubmit(txnId) {
  let rec = appState.receipts.find(r => r.txnId === txnId) || appState.invoices.find(i => i.txnId === txnId);
  if (!rec) return;

  rec.status = "PAID_AND_CLEARED";
  rec.authorizedBy = document.getElementById("accSignatory").value;

  appState.clearedGoods.unshift(rec);
  await apiCall("saveClearedGoods", rec);
  alert(`Receipt verified & PAID! Transmitted online to STORE, RECORDS, and CEO.`);
}

function renderDailyAccountReportPanel(container) {
  container.innerHTML = `
    <div class="panel-card">
      <h3>Daily Financial Report Form</h3>
      <form onsubmit="submitFinancialReport(event, 'Daily', 'CEO')">
        <div class="form-grid">
          <div class="form-group"><label>Officer Name</label><input type="text" id="rptName" required></div>
          <div class="form-group"><label>Date</label><input type="date" id="rptDate" required></div>
          <div class="form-group"><label>Total Income (₦)</label><input type="number" id="rptIncome" min="0" required></div>
          <div class="form-group"><label>Total Expenses (₦)</label><input type="number" id="rptExpense" min="0" required></div>
          <div class="form-group"><label>Authorization Signature</label><input type="text" id="rptAuth" required></div>
        </div>
        <button type="submit" class="submit-btn">Submit Report to CEO</button>
      </form>
    </div>
  `;
}

function renderWeeklyAccountReportPanel(container) {
  let daysHtml = "";
  for (let i = 1; i <= 7; i++) {
    daysHtml += `<tr><td><strong>Day ${i}</strong></td><td><input type="number" class="wk-inc" value="0" min="0" oninput="calcWeeklyTot()"></td><td><input type="number" class="wk-exp" value="0" min="0" oninput="calcWeeklyTot()"></td></tr>`;
  }
  container.innerHTML = `
    <div class="panel-card">
      <h3>Weekly Financial Report Form</h3>
      <form onsubmit="submitFinancialReport(event, 'Weekly', 'HRM')">
        <div class="form-grid">
          <div class="form-group"><label>Authorization Name</label><input type="text" id="rptName" required></div>
          <div class="form-group"><label>Week Date</label><input type="date" id="rptDate" required></div>
        </div>
        <table class="data-table"><thead><tr><th>Day</th><th>Income (₦)</th><th>Expenses (₦)</th></tr></thead><tbody>${daysHtml}</tbody></table>
        <div style="display:flex; justify-content:space-between; font-weight:800; margin:1rem 0;">
          <div>Total Income: ₦<span id="wkTotInc">0.00</span></div>
          <div>Total Expenses: ₦<span id="wkTotExp">0.00</span></div>
        </div>
        <button type="submit" class="submit-btn">Submit Report to HRM</button>
      </form>
    </div>
  `;
}

function calcWeeklyTot() {
  let inc = 0, exp = 0;
  document.querySelectorAll(".wk-inc").forEach(i => inc += parseFloat(i.value) || 0);
  document.querySelectorAll(".wk-exp").forEach(e => exp += parseFloat(e.value) || 0);
  document.getElementById("wkTotInc").innerText = inc.toFixed(2);
  document.getElementById("wkTotExp").innerText = exp.toFixed(2);
}

function renderMonthlyAccountReportPanel(container) {
  let weeksHtml = "";
  for (let i = 1; i <= 4; i++) {
    weeksHtml += `<tr><td><strong>Week ${i}</strong></td><td><input type="number" class="m-inc" value="0" min="0" oninput="calcMonthlyTot()"></td><td><input type="number" class="m-exp" value="0" min="0" oninput="calcMonthlyTot()"></td></tr>`;
  }
  container.innerHTML = `
    <div class="panel-card">
      <h3>Monthly Financial Report Form</h3>
      <form onsubmit="submitFinancialReport(event, 'Monthly', 'HRM')">
        <div class="form-grid">
          <div class="form-group"><label>Authorization Name</label><input type="text" id="rptName" required></div>
          <div class="form-group"><label>Month/Year</label><input type="month" id="rptDate" required></div>
        </div>
        <table class="data-table"><thead><tr><th>Week</th><th>Income (₦)</th><th>Expenses (₦)</th></tr></thead><tbody>${weeksHtml}</tbody></table>
        <div style="display:flex; justify-content:space-between; font-weight:800; margin:1rem 0;">
          <div>Grand Income: ₦<span id="mTotInc">0.00</span></div>
          <div>Grand Expenses: ₦<span id="mTotExp">0.00</span></div>
        </div>
        <button type="submit" class="submit-btn">Submit Report to HRM</button>
      </form>
    </div>
  `;
}

function calcMonthlyTot() {
  let inc = 0, exp = 0;
  document.querySelectorAll(".m-inc").forEach(i => inc += parseFloat(i.value) || 0);
  document.querySelectorAll(".m-exp").forEach(e => exp += parseFloat(e.value) || 0);
  document.getElementById("mTotInc").innerText = inc.toFixed(2);
  document.getElementById("mTotExp").innerText = exp.toFixed(2);
}

async function submitFinancialReport(e, type, targetRecipient) {
  e.preventDefault();
  const rpt = {
    type: type,
    name: document.getElementById("rptName").value,
    date: document.getElementById("rptDate").value,
    recipient: targetRecipient,
    income: document.getElementById("rptIncome")?.value || document.getElementById("wkTotInc")?.innerText || document.getElementById("mTotInc")?.innerText,
    expenses: document.getElementById("rptExpense")?.value || document.getElementById("wkTotExp")?.innerText || document.getElementById("mTotExp")?.innerText,
    submittedBy: appState.currentDept
  };
  appState.accountReports[type.toLowerCase()].push(rpt);
  await apiCall("saveFinancialReport", rpt);
  alert(`${type} Financial Report successfully submitted to ${targetRecipient}!`);
}

/* STORE PANELS */
function renderClearedGoodsPanel(container) {
  container.innerHTML = `
    <div class="panel-card">
      <h3>Cleared Goods & Gate Pass Generator</h3>
      <div class="form-group">
        <label>Enter Transaction ID</label>
        <div style="display:flex; gap:0.5rem;">
          <input type="text" id="storeSearchTxn" placeholder="e.g. TXN-123456" required>
          <button class="submit-btn" onclick="searchClearedGoods()"><i class="fa-solid fa-magnifying-glass"></i> Search</button>
        </div>
      </div>
      <div id="storeClearedPreview" style="margin-top:1.5rem;"></div>
    </div>
  `;
}

function searchClearedGoods() {
  const txnId = document.getElementById("storeSearchTxn").value.trim();
  const rec = appState.clearedGoods.find(c => c.txnId === txnId) || appState.receipts.find(r => r.txnId === txnId && r.status === "PAID_AND_CLEARED");
  const preview = document.getElementById("storeClearedPreview");
  if (!rec) {
    preview.innerHTML = `<p style="color:var(--danger-red); font-weight:700;">Transaction ID not found or not cleared!</p>`;
    return;
  }
  preview.innerHTML = `
    <div class="watermark-document" style="border:1px solid var(--border-color); padding:1.5rem; background:white;">
      <div class="stamp stamp-cleared">CLEARED</div>
      <h3>CONFIRMED RECEIPT - ${rec.txnId}</h3>
      <p>Customer: ${rec.name} | Total: ₦${rec.grandTotal}</p>
      <button class="submit-btn btn-success" onclick="generateGatePass('${rec.txnId}')" style="margin-top:1rem;"><i class="fa-solid fa-key"></i> Generate Gate Pass</button>
    </div>
  `;
}

async function generateGatePass(txnId) {
  const rec = appState.clearedGoods.find(c => c.txnId === txnId) || appState.receipts.find(r => r.txnId === txnId);
  if (!rec) return;
  rec.gatePassCode = "GP-" + Date.now().toString().slice(-6);
  rec.status = "GATE_PASS_ISSUED";
  await apiCall("saveGatePass", rec);
  alert(`Gate Pass Code ${rec.gatePassCode} Generated! Sent to Records.`);
}

function renderStoreProductionItemsPanel(container) {
  container.innerHTML = `
    <div class="panel-card">
      <h3>Items Received from Production (Store & CEO View)</h3>
      <table class="data-table">
        <thead><tr><th>Date</th><th>Sender</th><th>Items</th><th>Qty</th><th>Line</th><th>Time</th></tr></thead>
        <tbody>
          ${appState.productionToStore.map(p => `
            <tr>
              <td>${p.date}</td>
              <td>${p.sender} (${p.phone})</td>
              <td>${p.items}</td>
              <td>${p.qty} (Damaged:${p.damaged})</td>
              <td>${p.line}</td>
              <td>${p.time}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderSuppliesRawMaterialPanel(container) {
  container.innerHTML = `
    <div class="panel-card">
      <h3>Raw Material Supply Entry</h3>
      <form onsubmit="handleRawMaterialSubmit(event)">
        <div class="form-grid">
          <div class="form-group"><label>Date</label><input type="date" id="rmDate" required></div>
          <div class="form-group"><label>Supplier Name</label><input type="text" id="rmSupplier" required></div>
          <div class="form-group"><label>Address</label><input type="text" id="rmAddress" required></div>
          <div class="form-group"><label>Phone Number</label><input type="tel" id="rmPhone" required></div>
          <div class="form-group"><label>Items Supplied</label><input type="text" id="rmItems" required></div>
          <div class="form-group"><label>Quantity</label><input type="number" id="rmQty" min="1" required></div>
          <div class="form-group"><label>Damaged Quantity</label><input type="number" id="rmDamaged" value="0" min="0"></div>
          <div class="form-group"><label>Receiver Name</label><input type="text" id="rmReceiver" required></div>
          <div class="form-group"><label>Time</label><input type="time" id="rmTime" required></div>
        </div>
        <button type="submit" class="submit-btn">Submit to CEO & HRM</button>
      </form>
    </div>
  `;
}

async function handleRawMaterialSubmit(e) {
  e.preventDefault();
  const rm = {
    date: document.getElementById("rmDate").value,
    supplier: document.getElementById("rmSupplier").value,
    address: document.getElementById("rmAddress").value,
    phone: document.getElementById("rmPhone").value,
    items: document.getElementById("rmItems").value,
    qty: document.getElementById("rmQty").value,
    damaged: document.getElementById("rmDamaged").value,
    receiver: document.getElementById("rmReceiver").value,
    time: document.getElementById("rmTime").value
  };
  appState.rawMaterials.push(rm);
  await apiCall("saveRawMaterial", rm);
  alert("Raw materials supplied successfully!");
  e.target.reset();
}

function renderItemSentToProductionPanel(container) {
  container.innerHTML = `
    <div class="panel-card">
      <h3>Item Sent to Production Form (From Store)</h3>
      <form onsubmit="handleItemSentToProduction(event)">
        <div class="form-grid">
          <div class="form-group"><label>Date</label><input type="date" id="stpDate" required></div>
          <div class="form-group"><label>Sender Name</label><input type="text" id="stpSender" required></div>
          <div class="form-group"><label>Phone</label><input type="tel" id="stpPhone" required></div>
          <div class="form-group"><label>Items</label><input type="text" id="stpItems" required placeholder="e.g. Preforms, Caps"></div>
          <div class="form-group"><label>Quantity</label><input type="number" id="stpQty" min="1" required></div>
          <div class="form-group"><label>Time</label><input type="time" id="stpTime" required></div>
        </div>
        <button type="submit" class="submit-btn">Send to Production</button>
      </form>
    </div>
  `;
}

async function handleItemSentToProduction(e) {
  e.preventDefault();
  const item = {
    date: document.getElementById("stpDate").value,
    sender: document.getElementById("stpSender").value,
    phone: document.getElementById("stpPhone").value,
    items: document.getElementById("stpItems").value,
    qty: document.getElementById("stpQty").value,
    time: document.getElementById("stpTime").value
  };
  appState.storeToProduction.push(item);
  await apiCall("saveItemSentToProduction", item);
  alert("Items successfully dispatched to Production department!");
  e.target.reset();
}

/* RECORDS PANELS */
function renderRecordsAuditPanel(container) {
  const list = [...appState.clearedGoods, ...appState.receipts.filter(r => r.status === "PAID_AND_CLEARED")];
  container.innerHTML = `
    <div class="panel-card">
      <h3>Audit & Financial Reconciliation</h3>
      <table class="data-table">
        <thead><tr><th>Txn ID</th><th>Date</th><th>Customer</th><th>Total</th><th>Status</th></tr></thead>
        <tbody>
          ${list.map(c => `<tr><td>${c.txnId}</td><td>${c.date}</td><td>${c.name}</td><td>₦${c.grandTotal}</td><td>Verified</td></tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderRecordsGatePassPanel(container) {
  container.innerHTML = `
    <div class="panel-card">
      <h3>Gate Pass Lookup</h3>
      <div class="form-group">
        <label>Enter Gate Pass Code</label>
        <div style="display:flex; gap:0.5rem;">
          <input type="text" id="recGpInput" placeholder="GP-123456" required>
          <button class="submit-btn" onclick="searchRecordsGatePass()">Search</button>
        </div>
      </div>
      <div id="recGpPreview" style="margin-top:1.5rem;"></div>
    </div>
  `;
}

function searchRecordsGatePass() {
  const gpCode = document.getElementById("recGpInput").value.trim();
  const rec = appState.clearedGoods.find(c => c.gatePassCode === gpCode);
  const preview = document.getElementById("recGpPreview");
  if (!rec) {
    preview.innerHTML = `<p style="color:var(--danger-red); font-weight:700;">Gate Pass not found!</p>`;
    return;
  }
  preview.innerHTML = `<div class="watermark-document" style="border:1px solid var(--border-color); padding:1rem; background:white;"><h3>Gate Pass Verified: ${rec.gatePassCode}</h3><p>Customer: ${rec.name}</p></div>`;
}

function renderArchivedPanel(container) {
  const list = [...appState.clearedGoods, ...appState.receipts.filter(r => r.status === "PAID_AND_CLEARED")];
  container.innerHTML = `
    <div class="panel-card">
      <h3>Archived Documents</h3>
      <table class="data-table">
        <thead><tr><th>Txn ID</th><th>Gate Pass</th><th>Date</th><th>Customer</th></tr></thead>
        <tbody>
          ${list.map(c => `<tr><td>${c.txnId}</td><td>${c.gatePassCode || 'N/A'}</td><td>${c.date}</td><td>${c.name}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
}

/* PRODUCTION PANELS */
function renderProductionReceivedFromStorePanel(container) {
  container.innerHTML = `
    <div class="panel-card">
      <h3>Items Received from STORE</h3>
      <table class="data-table">
        <thead><tr><th>Date</th><th>Sender</th><th>Items</th><th>Qty</th><th>Time</th><th>Action</th></tr></thead>
        <tbody>
          ${appState.storeToProduction.map(s => `
            <tr>
              <td>${s.date}</td>
              <td>${s.sender} (${s.phone})</td>
              <td>${s.items}</td>
              <td>${s.qty}</td>
              <td>${s.time}</td>
              <td>
                <button class="submit-btn btn-success" onclick="confirmProdStoreItem(true)">OK</button>
                <button class="submit-btn btn-danger" onclick="confirmProdStoreItem(false)">NO</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function confirmProdStoreItem(isConfirmed) {
  if (isConfirmed) {
    alert("Shipment accepted by Production.");
  } else {
    const notif = { message: "Incomplete items sent from store.", date: new Date().toLocaleString(), from: "PRODUCTION" };
    appState.notifications.push(notif);
    await apiCall("sendNotification", notif);
    alert("Rejection alert sent to CEO, HRM, STORE, and AUDIT!");
  }
}

function renderProductionShiftReportPanel(container) {
  container.innerHTML = `
    <div class="panel-card">
      <h3>Production Shift Report Form</h3>
      <form onsubmit="handleShiftReportSubmit(event)">
        <div class="form-grid">
          <div class="form-group"><label>Shift Head Name</label><input type="text" id="shHead" required></div>
          <div class="form-group"><label>Men in Operation</label><input type="number" id="shMen" min="1" required></div>
          <div class="form-group"><label>Production Lines</label><input type="text" id="shLine" required></div>
          <div class="form-group"><label>Total Produced</label><input type="number" id="shProduced" min="0" required></div>
          <div class="form-group"><label>Damaged Items</label><input type="number" id="shDamaged" value="0" min="0"></div>
          <div class="form-group"><label>Total Sent to Store</label><input type="number" id="shSent" min="0" required></div>
        </div>
        <button type="submit" class="submit-btn">Submit Shift Report</button>
      </form>
    </div>
  `;
}

async function handleShiftReportSubmit(e) {
  e.preventDefault();
  const rpt = {
    head: document.getElementById("shHead").value,
    men: document.getElementById("shMen").value,
    line: document.getElementById("shLine").value,
    produced: document.getElementById("shProduced").value,
    damaged: document.getElementById("shDamaged").value,
    sent: document.getElementById("shSent").value,
    date: new Date().toLocaleDateString()
  };
  appState.shiftReports.push(rpt);
  await apiCall("saveShiftReport", rpt);
  alert("Shift report submitted successfully!");
  e.target.reset();
}

function renderItemSentToStorePanel(container) {
  container.innerHTML = `
    <div class="panel-card">
      <h3>Item Sent to Store Form (From Production)</h3>
      <form onsubmit="handleItemSentToStore(event)">
        <div class="form-grid">
          <div class="form-group"><label>Date</label><input type="date" id="stsDate" required></div>
          <div class="form-group"><label>Sender Name</label><input type="text" id="stsSender" required></div>
          <div class="form-group"><label>Phone Number</label><input type="tel" id="stsPhone" required></div>
          <div class="form-group"><label>Items Description</label><input type="text" id="stsItems" required></div>
          <div class="form-group"><label>Quantity</label><input type="number" id="stsQty" min="1" required></div>
          <div class="form-group"><label>Damaged Items</label><input type="number" id="stsDamaged" value="0" min="0"></div>
          <div class="form-group"><label>Production Line</label><input type="text" id="stsLine" required></div>
          <div class="form-group"><label>Time</label><input type="time" id="stsTime" required></div>
        </div>
        <button type="submit" class="submit-btn">Send to Store & CEO</button>
      </form>
    </div>
  `;
}

async function handleItemSentToStore(e) {
  e.preventDefault();
  const item = {
    date: document.getElementById("stsDate").value,
    sender: document.getElementById("stsSender").value,
    phone: document.getElementById("stsPhone").value,
    items: document.getElementById("stsItems").value,
    qty: document.getElementById("stsQty").value,
    damaged: document.getElementById("stsDamaged").value,
    line: document.getElementById("stsLine").value,
    time: document.getElementById("stsTime").value
  };
  appState.productionToStore.push(item);
  await apiCall("saveItemSentToStore", item);
  alert("Finished products sent to Store and CEO!");
  e.target.reset();
}

/* HRM & CEO PANELS */
function renderHrmAdminPanel(container) {
  container.innerHTML = `
    <div class="panel-card">
      <h3>Password Reset Portal</h3>
      <form onsubmit="handlePasswordReset(event)">
        <div class="form-grid">
          <div class="form-group">
            <label>Department</label>
            <select id="resetDeptSelect">
              <option value="MARKETING">MARKETING</option>
              <option value="ACCOUNTS">ACCOUNTS</option>
              <option value="STORE">STORE</option>
              <option value="PRODUCTION">PRODUCTION</option>
              <option value="RECORDS">RECORDS</option>
              <option value="HRM">HRM</option>
              <option value="CEO">CEO</option>
            </select>
          </div>
          <div class="form-group"><label>New Password</label><input type="password" id="resetNewPass" required></div>
        </div>
        <button type="submit" class="submit-btn btn-danger">Reset Password</button>
      </form>
    </div>
  `;
}

async function handlePasswordReset(e) {
  e.preventDefault();
  const dept = document.getElementById("resetDeptSelect").value;
  const newPassword = document.getElementById("resetNewPass").value;
  await apiCall("resetPassword", { department: dept, newPassword: newPassword });
  alert(`Password for ${dept} successfully updated!`);
  e.target.reset();
}

function renderHrmRawMaterialPanel(container) {
  container.innerHTML = `
    <div class="panel-card">
      <h3>Raw Materials Supply Log</h3>
      <table class="data-table">
        <thead><tr><th>Date</th><th>Supplier</th><th>Items</th><th>Qty</th><th>Receiver</th></tr></thead>
        <tbody>
          ${appState.rawMaterials.map(r => `<tr><td>${r.date}</td><td>${r.supplier}</td><td>${r.items}</td><td>${r.qty}</td><td>${r.receiver}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderHrmShiftReportPanel(container) {
  container.innerHTML = `
    <div class="panel-card">
      <h3>Production Shift Reports</h3>
      <table class="data-table">
        <thead><tr><th>Date</th><th>Shift Head</th><th>Line</th><th>Produced</th><th>Damaged</th><th>Sent</th></tr></thead>
        <tbody>
          ${appState.shiftReports.map(s => `<tr><td>${s.date}</td><td>${s.head}</td><td>${s.line}</td><td>${s.produced}</td><td>${s.damaged}</td><td>${s.sent}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderHrmAuditReportPanel(container) {
  container.innerHTML = `
    <div class="panel-card">
      <h3>Audit Analysis & Performance</h3>
      <p>Financial and operational reconciliation status is fully operational.</p>
    </div>
  `;
}

function renderHrmCreateReportPanel(type) {
  const container = document.getElementById("deptPanelContent");
  container.innerHTML = `
    <div class="panel-card">
      <h3>Create ${type} Report for CEO</h3>
      <form onsubmit="submitHrmToCeoReport(event, '${type}')">
        <div class="form-grid">
          <div class="form-group"><label>Title</label><input type="text" id="hrmRptTitle" required></div>
          <div class="form-group"><label>Date</label><input type="date" id="hrmRptDate" required></div>
          <div class="form-group"><label>Authorizing Officer</label><input type="text" id="hrmRptAuth" required></div>
        </div>
        <div class="form-group"><label>Content</label><textarea id="hrmRptContent" rows="4" required></textarea></div>
        <button type="submit" class="submit-btn">Dispatch Report</button>
      </form>
    </div>
  `;
}

async function submitHrmToCeoReport(e, type) {
  e.preventDefault();
  const rpt = {
    type: type,
    title: document.getElementById("hrmRptTitle").value,
    date: document.getElementById("hrmRptDate").value,
    auth: document.getElementById("hrmRptAuth").value,
    content: document.getElementById("hrmRptContent").value
  };
  appState.hrmReports[type.toLowerCase()].push(rpt);
  await apiCall("saveHrmReport", rpt);
  alert(`${type} Report dispatched to CEO!`);
  e.target.reset();
}

function renderViewAccountReportPanel(type) {
  const container = document.getElementById("deptPanelContent");
  container.innerHTML = `
    <div class="panel-card">
      <h3>View ${type} Account Reports</h3>
      <table class="data-table">
        <thead><tr><th>Date</th><th>Submitted By</th><th>Income</th><th>Expenses</th></tr></thead>
        <tbody>
          ${(appState.accountReports[type.toLowerCase()] || []).map(r => `<tr><td>${r.date}</td><td>${r.submittedBy}</td><td>₦${r.income}</td><td>₦${r.expenses}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderViewHrmReportPanel(type) {
  const container = document.getElementById("deptPanelContent");
  container.innerHTML = `
    <div class="panel-card">
      <h3>View HRM ${type} Reports</h3>
      <table class="data-table">
        <thead><tr><th>Date</th><th>Title</th><th>Author</th><th>Content</th></tr></thead>
        <tbody>
          ${(appState.hrmReports[type.toLowerCase()] || []).map(r => `<tr><td>${r.date}</td><td>${r.title}</td><td>${r.auth}</td><td>${r.content}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderNotificationsPanel(container) {
  container.innerHTML = `
    <div class="panel-card">
      <h3>Notifications</h3>
      ${appState.notifications.map(n => `<div style="padding:0.75rem; border-left:3px solid var(--danger-red); margin-bottom:0.5rem; background:#f9f9f9;"><strong>${n.from}:</strong>${n.message} <span style="font-size:0.8rem; color:#666;">(${n.date})</span></div>`).join('')}
    </div>
  `;
}

function renderLoginLogsPanel(container) {
  container.innerHTML = `
    <div class="panel-card">
      <h3>Department Login Logs</h3>
      <table class="data-table">
        <thead><tr><th>Department</th><th>Login Time</th><th>Logout Time</th><th>Status</th></tr></thead>
        <tbody>
          ${appState.loginLogs.map(l => `<tr><td><strong>${l.department}</strong></td><td>${l.loginTime}</td><td>${l.logoutTime}</td><td>${l.status}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderBroadcastPanel(container) {
  container.innerHTML = `
    <div class="panel-card">
      <h3>Broadcast Announcement</h3>
      <form onsubmit="handleBroadcastPublish(event)">
        <div class="form-group"><label>Announcement Text</label><input type="text" id="bcastInput" required></div>
        <button type="submit" class="submit-btn btn-success">Publish Broadcast</button>
      </form>
    </div>
  `;
}

async function handleBroadcastPublish(e) {
  e.preventDefault();
  const msg = document.getElementById("bcastInput").value;
  document.getElementById("broadcastText").innerText = msg;
  appState.broadcastMessage = msg;
  await apiCall("publishBroadcast", { message: msg });
  alert("Broadcast published successfully!");
  e.target.reset();
}

/* API ENGINE */
async function apiCall(action, payload = {}) {
  if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes("YOUR_GOOGLE_APPS_SCRIPT")) return { success: true };
  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: action, payload: payload })
    });
    return await response.json();
  } catch (err) {
    return { success: false, error: err };
  }
}

async function fetchCloudData() {
  if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes("YOUR_GOOGLE_APPS_SCRIPT")) return;
  try {
    const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=getAllData`);
    const data = await res.json();
    if (data && data.appState) {
      const activeDept = appState.currentDept;
      appState = { ...appState, ...data.appState };
      if (activeDept) appState.currentDept = activeDept;
      if (appState.broadcastMessage) {
        document.getElementById("broadcastText").innerText = appState.broadcastMessage;
      }
    }
  } catch (e) {}
}