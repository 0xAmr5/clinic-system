import { 
  db, 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  query, 
  where 
} from "../firebase-config.js";

let currentUser = JSON.parse(sessionStorage.getItem("bm_active_user")) || null;

document.addEventListener("DOMContentLoaded", () => {
  if (!currentUser) {
    alert("يرجى تسجيل الدخول أولاً.");
    location.href = "../auth/auth.html";
    return;
  }

  document.getElementById("userNameDisplay").innerText = currentUser.name;

  const isEmergencyDoc = currentUser.role === "DOCTOR" && currentUser.clinic === "طوارئ";
  const isAdmin = currentUser.role === "ADMIN";

  if (isEmergencyDoc || isAdmin) {
    document.getElementById("userBadge").innerText = "طوارئ واستقبال";
    document.getElementById("doctorEmergencyView").classList.remove("hidden");
    loadEmergencyCases();
  } else {
    document.getElementById("userBadge").innerText = `فصيلة (${currentUser.bloodType || 'مريض'})`;
    document.getElementById("patientEmergencyView").classList.remove("hidden");
  }
});

window.toggleNewEmergencyModal = function() {
  document.getElementById("newEmergencyModal").classList.toggle("hidden");
};

// ==========================================
// 1. لوحة طبيب الطوارئ (د. حازم القاضي)
// ==========================================
async function loadEmergencyCases() {
  const snap = await getDocs(collection(db, "emergency_cases"));
  const container = document.getElementById("emergencyCasesTable");

  let redCount = 0;
  let yellowCount = 0;
  let greenCount = 0;

  if (snap.empty) {
    container.innerHTML = "<p class='text-muted p-2'>لا توجد حالات مسجلة بقسم الاستقبال حالياً.</p>";
    updateStatsDisplay(0, 0, 0);
    return;
  }

  let html = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>كود الفرز (MTS)</th>
          <th>المريض</th>
          <th>التشخيص والدخول</th>
          <th>العلامات الحيوية (Vitals)</th>
          <th>الحالة</th>
          <th>الإجراء الطبي</th>
        </tr>
      </thead>
      <tbody>
  `;

  snap.forEach(d => {
    const c = d.data();
    const isActive = c.status === "ACTIVE";

    if (isActive) {
      if (c.triageLevel === "RED") redCount++;
      else if (c.triageLevel === "YELLOW") yellowCount++;
      else greenCount++;
    }

    let badgeClass = "badge-blood";
    let badgeText = "🔴 إنعاش فوري (RED)";
    if (c.triageLevel === "YELLOW") {
      badgeClass = "badge-admin";
      badgeText = "🟡 عاجل (YELLOW)";
    } else if (c.triageLevel === "GREEN") {
      badgeClass = "badge-success";
      badgeText = "🟢 مستقر (GREEN)";
    }

    html += `
      <tr style="${c.triageLevel === 'RED' && isActive ? 'background:#fff1f2;' : ''}">
        <td><span class="badge ${badgeClass}">${badgeText}</span></td>
        <td><strong>${c.patientName}</strong><br><small class="text-muted">${c.patientPhone}</small></td>
        <td><strong>${c.condition}</strong><br><small class="text-muted">${c.time}</small></td>
        <td>
          <small>ضغط: ${c.vitals?.bp || '--'} | نبض: ${c.vitals?.pulse || '--'} | أكسجين: ${c.vitals?.o2 || '--'}%</small>
        </td>
        <td>
          <span class="badge ${isActive ? 'badge-blood' : 'badge-success'}">
            ${isActive ? 'تحت الملاحظة ⏳' : 'تم استقرار الحالة ✓'}
          </span>
        </td>
        <td>
          ${isActive ? `
            <button class="btn btn-success btn-sm" onclick="markCaseStabilized('${d.id}', '${c.patientName}')">
              استقرار وتخريج ✓
            </button>
          ` : `
            <small class="text-muted">مكتمل</small>
          `}
        </td>
      </tr>
    `;
  });

  html += "</tbody></table>";
  container.innerHTML = html;
  updateStatsDisplay(redCount, yellowCount, greenCount);
}

function updateStatsDisplay(red, yellow, green) {
  document.getElementById("statRedCases").innerText = red;
  document.getElementById("statYellowCases").innerText = yellow;
  document.getElementById("statGreenCases").innerText = green;
}

window.handleSaveEmergencyCase = async function(e) {
  e.preventDefault();
  const patientName = document.getElementById("emPatientName").value.trim();
  const patientPhone = document.getElementById("emPatientPhone").value.trim();
  const triageLevel = document.getElementById("emTriageLevel").value;
  const condition = document.getElementById("emCondition").value.trim();
  
  const bp = document.getElementById("emVitalsBP").value.trim() || "120/80";
  const pulse = document.getElementById("emVitalsPulse").value.trim() || "80";
  const o2 = document.getElementById("emVitalsOxygen").value.trim() || "98";

  const newCase = {
    patientName,
    patientPhone,
    triageLevel,
    condition,
    vitals: { bp, pulse, o2 },
    status: "ACTIVE",
    doctorName: currentUser.name,
    time: new Date().toLocaleTimeString("ar-EG"),
    createdAt: Date.now()
  };

  await addDoc(collection(db, "emergency_cases"), newCase);
  alert(`تم تسجيل الحالة (${patientName}) في قسم الطوارئ بكود فرز [${triageLevel}] بنجاح!`);
  
  toggleNewEmergencyModal();
  loadEmergencyCases();
};

window.markCaseStabilized = async function(caseId, patientName) {
  await updateDoc(doc(db, "emergency_cases", caseId), {
    status: "STABILIZED",
    dischargedAt: Date.now()
  });

  alert(`تم استقرار حالة المريض (${patientName}) وتحديث سجله الطبي!`);
  loadEmergencyCases();
};

// ==========================================
// 2. استغاثة المريض السريعة (SOS Button)
// ==========================================
window.triggerPatientEmergencySOS = async function() {
  const confirmSOS = confirm("هل أنت متأكد من إرسال بلاغ طوارئ عاجل لطاقم استقبال مستشفى بني مزار التخصصي؟");
  if (!confirmSOS) return;

  const emergencyAlert = {
    patientName: currentUser.name,
    patientPhone: currentUser.phone,
    triageLevel: "RED", // استغاثة المريض تسجل كود أحمر افتراضياً لفحصها فوراً
    condition: "استغاثة طارئة عاجلة من المريض عبر المنصة الرقمية (Emergency SOS)",
    vitals: { bp: "غير مسجل", pulse: "غير مسجل", o2: "غير مسجل" },
    status: "ACTIVE",
    doctorName: "طاقم الاستقبال والطوارئ",
    time: new Date().toLocaleTimeString("ar-EG"),
    createdAt: Date.now()
  };

  await addDoc(collection(db, "emergency_cases"), emergencyAlert);
  alert("🚨 تم إرسال نداء الاستغاثة لغرفة عمليات طوارئ مستشفى بني مزار التخصصي بنجاح! طاقم الإنعاش في انتظارك الآن.");
};

window.logout = function() {
  sessionStorage.removeItem("bm_active_user");
  location.href = "../index.html";
};