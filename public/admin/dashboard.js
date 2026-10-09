import { 
  db, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where 
} from "../firebase-config.js";

let currentUser = JSON.parse(sessionStorage.getItem("bm_active_user")) || null;

document.addEventListener("DOMContentLoaded", () => {
  if (!currentUser || currentUser.role !== "ADMIN") {
    alert("هذه اللوحة مخصصة لإدارة مستشفى بني مزار التخصصي فقط.");
    location.href = "../index.html";
    return;
  }

  document.getElementById("userNameDisplay").innerText = currentUser.name;
  loadFinancialReport();
});

async function loadFinancialReport() {
  const aptsSnap = await getDocs(collection(db, "appointments"));
  const labsSnap = await getDocs(collection(db, "lab_requests"));
  const usersSnap = await getDocs(collection(db, "users"));

  let totalRevenue = 0;
  let clinicCases = 0;
  let labCases = 0;
  let staffCount = 0;

  usersSnap.forEach(d => {
    if (d.data().role === "DOCTOR") staffCount++;
  });

  let auditRows = [];

  aptsSnap.forEach(d => {
    const a = d.data();
    clinicCases++;
    const fee = a.fee || 200; // القيمة الافتراضية للكشف الطبي
    if (a.status === "COMPLETED") totalRevenue += fee;
    auditRows.push({
      patient: a.patientName,
      service: `كشف عيادة (${a.clinic}) - ${a.doctorName}`,
      date: a.date,
      amount: fee,
      status: a.status === "COMPLETED" ? "محصل ومكتمل ✓" : "في الانتظار"
    });
  });

  labsSnap.forEach(d => {
    const l = d.data();
    labCases++;
    const price = l.price || 150;
    if (l.status === "COMPLETED") totalRevenue += price;
    auditRows.push({
      patient: l.patientName,
      service: `${l.department === "LAB" ? "معمل" : "أشعة"}: ${l.testName}`,
      date: l.date,
      amount: price,
      status: l.status === "COMPLETED" ? "محصل ومكتمل ✓" : "في الانتظار"
    });
  });

  document.getElementById("statRevenue").innerText = totalRevenue.toLocaleString() + " ج.م";
  document.getElementById("statClinicsCount").innerText = clinicCases;
  document.getElementById("statLabsCount").innerText = labCases;
  document.getElementById("statStaffCount").innerText = staffCount;

  renderAuditTable(auditRows);
}

function renderAuditTable(rows) {
  const container = document.getElementById("financialAuditTable");
  if (!rows.length) {
    container.innerHTML = `<p class="text-muted p-2">لا توجد معاملات مسجلة حتى الآن.</p>`;
    return;
  }

  let html = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>المريض</th>
          <th>الخدمة الطبية</th>
          <th>التاريخ</th>
          <th>المبلغ</th>
          <th>حالة السداد والخدمة</th>
        </tr>
      </thead>
      <tbody>
  `;

  rows.forEach(r => {
    html += `
      <tr>
        <td><strong>${r.patient}</strong></td>
        <td>${r.service}</td>
        <td>${r.date}</td>
        <td><strong>${r.amount} ج.م</strong></td>
        <td><span class="badge ${r.status.includes('محصل') ? 'badge-success' : 'badge-admin'}">${r.status}</span></td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  container.innerHTML = html;
}

// إضافة طبيب جديد
window.handleAddNewDoctor = async function(e) {
  e.preventDefault();
  const name = document.getElementById("newDocName").value.trim();
  const phone = document.getElementById("newDocPhone").value.trim();
  const clinic = document.getElementById("newDocClinic").value;
  const fee = parseInt(document.getElementById("newDocFee").value);
  const password = document.getElementById("newDocPass").value;
  const schedule = document.getElementById("newDocSchedule").value.trim();

  const userRef = doc(db, "users", phone);
  const check = await getDoc(userRef);

  if (check.exists()) {
    alert("رقم الهاتف هذا مسجل بالفعل لطبيب أو مستخدم آخر!");
    return;
  }

  const newDoctor = {
    name,
    phone,
    password,
    role: "DOCTOR",
    clinic,
    fee,
    schedule,
    createdAt: Date.now()
  };

  await setDoc(userRef, newDoctor);
  alert(`تم اعتماد إضافة (${name}) كطبيب في عيادة/قسم (${clinic}) بنجاح!`);
  location.reload();
};

window.logout = function() {
  sessionStorage.removeItem("bm_active_user");
  location.href = "../index.html";
};