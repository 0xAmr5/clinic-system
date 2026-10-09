import { 
  db, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  query, 
  where 
} from "../firebase-config.js";

// بذر أدوية المستشفى الأساسية
const DEFAULT_DRUGS = [
  { name: "Cataflam 50mg", category: "مسكنات وعظام", qty: 35, price: 45 },
  { name: "Janumet 50/1000mg", category: "سكر وغدد", qty: 15, price: 165 },
  { name: "Concor 5mg", category: "ضغط وقلب", qty: 25, price: 58 },
  { name: "Curam 457mg شراب", category: "مضادات حيوية", qty: 20, price: 62 },
  { name: "Controloc 40mg", category: "أخرى", qty: 30, price: 90 },
  { name: "Lantus SoloStar (أنسولين)", category: "سكر وغدد", qty: 4, price: 210 }
];

async function seedPharmacyDrugs() {
  const snap = await getDocs(collection(db, "pharmacy_stock"));
  if (snap.empty) {
    for (const d of DEFAULT_DRUGS) {
      await addDoc(collection(db, "pharmacy_stock"), d);
    }
  }
}
seedPharmacyDrugs();

let currentUser = JSON.parse(sessionStorage.getItem("bm_active_user")) || null;

document.addEventListener("DOMContentLoaded", () => {
  if (!currentUser) {
    alert("يرجى تسجيل الدخول أولاً.");
    location.href = "../auth/auth.html";
    return;
  }

  document.getElementById("userNameDisplay").innerText = currentUser.name;

  const isPharmacist = currentUser.role === "DOCTOR" && currentUser.clinic === "صيدلية";
  const isAdmin = currentUser.role === "ADMIN";

  if (isPharmacist || isAdmin) {
    document.getElementById("userBadge").innerText = "مدير الصيدلية";
    document.getElementById("pharmacistView").classList.remove("hidden");
    loadPharmacistDashboard();
  } else {
    document.getElementById("userBadge").innerText = `فصيلة (${currentUser.bloodType || 'مريض'})`;
    document.getElementById("patientPharmacyView").classList.remove("hidden");
    loadPatientPharmacyDashboard();
  }
});

// ==========================================
// 1. شاشة الصيدلي (د. مصطفى الجمال)
// ==========================================
window.toggleAddDrugForm = function() {
  document.getElementById("addDrugBox").classList.toggle("hidden");
};

window.handleAddNewDrug = async function(e) {
  e.preventDefault();
  const name = document.getElementById("newDrugName").value.trim();
  const category = document.getElementById("newDrugCategory").value;
  const qty = parseInt(document.getElementById("newDrugQty").value);
  const price = parseFloat(document.getElementById("newDrugPrice").value);

  await addDoc(collection(db, "pharmacy_stock"), {
    name,
    category,
    qty,
    price
  });

  alert(`تمت إضافة الدواء (${name}) للمخزون بنجاح!`);
  document.getElementById("newDrugName").value = "";
  toggleAddDrugForm();
  loadPharmacyStock();
};

async function loadPharmacistDashboard() {
  await loadShortageRequests();
  await loadPharmacyStock();
}

async function loadShortageRequests() {
  const snap = await getDocs(collection(db, "drug_shortages"));
  const container = document.getElementById("shortageRequestsTable");

  if (snap.empty) {
    container.innerHTML = "<p class='text-muted p-2'>لا توجد طلبات نواقص مسجلة حالياً.</p>";
    return;
  }

  let html = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>المريض</th>
          <th>الدواء المطلوب</th>
          <th>التصنيف والملاحظات</th>
          <th>الحالة</th>
          <th>إجراء</th>
        </tr>
      </thead>
      <tbody>
  `;

  snap.forEach(d => {
    const r = d.data();
    const isAvail = r.status === "AVAILABLE";
    html += `
      <tr>
        <td><strong>${r.patientName}</strong><br><small class="text-muted">${r.patientPhone}</small></td>
        <td><strong style="color:var(--primary);">${r.drugName}</strong></td>
        <td>${r.category}<br><small class="text-muted">${r.notes || ''}</small></td>
        <td>
          <span class="badge ${isAvail ? 'badge-success' : 'badge-blood'}">
            ${isAvail ? 'تم التوفير والإشعار ✓' : 'غير متوفر (ناقص) ⏳'}
          </span>
        </td>
        <td>
          <button class="btn btn-sm ${isAvail ? 'btn-outline-primary' : 'btn-success'}" onclick="markDrugAvailable('${d.id}', '${r.patientName}', '${r.drugName}')">
            ${isAvail ? 'إعادة الإشعار' : 'توفير الدواء وتنبيه المريض 🔔'}
          </button>
        </td>
      </tr>
    `;
  });

  html += "</tbody></table>";
  container.innerHTML = html;
}

window.markDrugAvailable = async function(requestId, patientName, drugName) {
  await updateDoc(doc(db, "drug_shortages", requestId), {
    status: "AVAILABLE",
    notifiedAt: Date.now()
  });

  alert(`تم تحديث حالة الدواء (${drugName}) إلى متوفر! تم إرسال إشعار فوري لملف المريض (${patientName}) ليتوجه للاستلام.`);
  loadShortageRequests();
};

async function loadPharmacyStock() {
  const snap = await getDocs(collection(db, "pharmacy_stock"));
  const container = document.getElementById("pharmacyStockTable");

  if (snap.empty) {
    container.innerHTML = "<p class='text-muted p-2'>المخزون فارغ.</p>";
    return;
  }

  let html = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>اسم الدواء</th>
          <th>التصنيف</th>
          <th>الكمية المتاحة</th>
          <th>السعر الرسمي</th>
          <th>تعديل الكمية</th>
        </tr>
      </thead>
      <tbody>
  `;

  snap.forEach(d => {
    const drug = d.data();
    html += `
      <tr>
        <td><strong>${drug.name}</strong></td>
        <td>${drug.category}</td>
        <td><strong>${drug.qty}</strong> عبوة</td>
        <td>${drug.price} ج.م</td>
        <td>
          <button class="btn btn-outline-primary btn-sm" onclick="quickUpdateQty('${d.id}', ${drug.qty + 10})">+10 عبوات</button>
        </td>
      </tr>
    `;
  });

  html += "</tbody></table>";
  container.innerHTML = html;
}

window.quickUpdateQty = async function(id, newQty) {
  await updateDoc(doc(db, "pharmacy_stock", id), { qty: newQty });
  loadPharmacyStock();
};

// ==========================================
// 2. شاشة المريض (طلب دواء ناقص وتلقي التنبيه)
// ==========================================
async function loadPatientPharmacyDashboard() {
  checkDrugAlerts();
  loadMyShortages();
  loadPatientStockView();
}

window.handleRequestShortageDrug = async function(e) {
  e.preventDefault();
  const drugName = document.getElementById("reqDrugName").value.trim();
  const category = document.getElementById("reqDrugCategory").value;
  const notes = document.getElementById("reqDrugNotes").value.trim() || "طلب اعتيادي";

  const req = {
    patientName: currentUser.name,
    patientPhone: currentUser.phone,
    drugName,
    category,
    notes,
    status: "SHORTAGE", // في حالة النقص
    createdAt: Date.now()
  };

  await addDoc(collection(db, "drug_shortages"), req);
  alert(`تم تسجيل طلبك لدواء (${drugName}) بنجاح! سيتم إخطارك فور وصوله للصيدلية.`);
  document.getElementById("reqDrugName").value = "";
  document.getElementById("reqDrugNotes").value = "";
  loadMyShortages();
};

async function checkDrugAlerts() {
  const q = query(collection(db, "drug_shortages"), where("patientPhone", "==", currentUser.phone), where("status", "==", "AVAILABLE"));
  const snap = await getDocs(q);
  const banner = document.getElementById("drugAlertBanner");

  if (!banner) return;

  if (snap.empty) {
    banner.classList.add("hidden");
    return;
  }

  let firstDrug = null;
  snap.forEach(d => { firstDrug = d.data(); });

  banner.classList.remove("hidden");
  document.getElementById("drugAlertTitle").innerText = `🎉 تم توفير دوائك: (${firstDrug.drugName})!`;
  document.getElementById("drugAlertDesc").innerText = `قامت صيدلية مستشفى بني مزار بتوفير الدواء الذي طلبته. يمكنك التوجه لشباك الصيدلية للاستلام.`;
}

window.markDrugReceived = function() {
  alert("حمداً لله على سلامتك! تم تأكيد إشعار الاستلام.");
  document.getElementById("drugAlertBanner").classList.add("hidden");
};

async function loadMyShortages() {
  const q = query(collection(db, "drug_shortages"), where("patientPhone", "==", currentUser.phone));
  const snap = await getDocs(q);
  const container = document.getElementById("myShortageRequestsList");

  if (snap.empty) {
    container.innerHTML = "<p class='text-muted p-2'>لم تسجل أي طلبات أدوية ناقصة حتى الآن.</p>";
    return;
  }

  let html = "";
  snap.forEach(d => {
    const r = d.data();
    const isAvail = r.status === "AVAILABLE";
    html += `
      <div class="record-box flex-between">
        <div>
          <strong>${r.drugName}</strong> (${r.category})<br>
          <small class="text-muted">ملاحظات: ${r.notes || 'لا توجد'}</small>
        </div>
        <span class="badge ${isAvail ? 'badge-success' : 'badge-blood'}">
          ${isAvail ? 'متوفر الآن بالصيدلية ✓' : 'جاري التوفير من الموردين ⏳'}
        </span>
      </div>
    `;
  });
  container.innerHTML = html;
}

async function loadPatientStockView() {
  const snap = await getDocs(collection(db, "pharmacy_stock"));
  const container = document.getElementById("patientStockViewList");

  if (snap.empty) {
    container.innerHTML = "<p class='text-muted p-2'>لا توجد أدوية مسجلة.</p>";
    return;
  }

  let html = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>اسم الدواء</th>
          <th>القسم العلاجي</th>
          <th>الحالة والمخزون</th>
          <th>السعر الرسمي</th>
        </tr>
      </thead>
      <tbody>
  `;

  snap.forEach(d => {
    const dr = d.data();
    const isAvailable = dr.qty > 0;
    html += `
      <tr>
        <td><strong>${dr.name}</strong></td>
        <td>${dr.category}</td>
        <td>
          <span class="badge ${isAvailable ? 'badge-success' : 'badge-blood'}">
            ${isAvailable ? `متوفر (${dr.qty} عبوة)` : 'غير متوفر'}
          </span>
        </td>
        <td><strong>${dr.price} ج.م</strong></td>
      </tr>
    `;
  });

  html += "</tbody></table>";
  container.innerHTML = html;
}

window.logout = function() {
  sessionStorage.removeItem("bm_active_user");
  location.href = "../index.html";
};