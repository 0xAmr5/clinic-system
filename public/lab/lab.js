import { 
  db, 
  collection, 
  doc, 
  getDocs, 
  updateDoc, 
  query, 
  where 
} from "../firebase-config.js";

let currentUser = JSON.parse(sessionStorage.getItem("bm_active_user")) || null;
let currentUploadedBase64 = null;

document.addEventListener("DOMContentLoaded", () => {
  if (!currentUser || (currentUser.role !== "ADMIN" && currentUser.clinic !== "معمل")) {
    alert("هذه اللوحة مخصصة لمعمل التحاليل (د. نورهان البدري) فقط.");
    location.href = "../auth/auth.html";
    return;
  }

  document.getElementById("userNameDisplay").innerText = currentUser.name;
  loadLabRequests();
});

async function loadLabRequests() {
  const q = query(collection(db, "lab_requests"), where("department", "==", "LAB"));
  const snap = await getDocs(q);
  const container = document.getElementById("labRequestsTable");

  if (snap.empty) {
    container.innerHTML = "<p class='text-muted p-2'>لا توجد طلبات تحاليل مسجلة حالياً.</p>";
    return;
  }

  let html = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>المريض</th>
          <th>التحليل المطلوب</th>
          <th>الموعد</th>
          <th>الرسوم</th>
          <th>الحالة</th>
          <th>إجراء</th>
        </tr>
      </thead>
      <tbody>
  `;

  snap.forEach(d => {
    const item = d.data();
    const isDone = item.status === "COMPLETED";
    html += `
      <tr>
        <td><strong>${item.patientName}</strong><br><small class="text-muted">${item.patientPhone}</small></td>
        <td><strong>${item.testName}</strong><br><small class="text-muted">${item.notes || ''}</small></td>
        <td>${item.date}</td>
        <td>${item.price} ج.م</td>
        <td><span class="badge ${isDone ? 'badge-success' : 'badge-admin'}">${isDone ? 'معتمد ✓' : 'قيد الفحص'}</span></td>
        <td>
          <button class="btn btn-primary btn-sm" onclick="openLabModal('${d.id}', '${item.patientName}', '${item.testName}', '${item.report ? encodeURIComponent(item.report) : ''}')">
            ${isDone ? 'تعديل النتيجة' : 'تسجيل النتيجة'}
          </button>
        </td>
      </tr>
    `;
  });

  html += "</tbody></table>";
  container.innerHTML = html;
}

window.previewLabFile = function(e) {
  const file = e.target.files[0];
  if (!file) {
    currentUploadedBase64 = null;
    return;
  }

  if (file.size > 1.5 * 1024 * 1024) {
    alert("حجم الملف كبير، يرجى اختيار صورة أقل من 1.5 ميجابايت.");
    e.target.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = function(evt) {
    currentUploadedBase64 = evt.result;
    document.getElementById("labFilePreviewBox").classList.remove("hidden");
    document.getElementById("labImgPreview").src = currentUploadedBase64;
    document.getElementById("labFileNamePreview").innerText = `مرفق: ${file.name}`;
  };
  reader.readAsDataURL(file);
};

window.openLabModal = function(id, name, test, encodedReport) {
  const modal = document.getElementById("labModal");
  modal.classList.remove("hidden");
  document.getElementById("labModalTitle").innerText = `تسجيل نتيجة (${test}) للمريض: ${name}`;
  document.getElementById("currentLabId").value = id;
  document.getElementById("labReportText").value = encodedReport ? decodeURIComponent(encodedReport) : "";
  currentUploadedBase64 = null;
  document.getElementById("labFilePreviewBox").classList.add("hidden");
  document.getElementById("labAttachmentFile").value = "";
  window.scrollTo({ top: modal.offsetTop - 80, behavior: "smooth" });
};

window.closeLabModal = function() {
  document.getElementById("labModal").classList.add("hidden");
};

window.handleSaveLabReport = async function(e) {
  e.preventDefault();
  const id = document.getElementById("currentLabId").value;
  const text = document.getElementById("labReportText").value.trim();

  const updateData = {
    report: text,
    status: "COMPLETED",
    certifiedBy: "د. نورهان البدري"
  };

  if (currentUploadedBase64) {
    updateData.attachment = currentUploadedBase64;
  }

  await updateDoc(doc(db, "lab_requests", id), updateData);

  alert("تم اعتماد نتيجة التحليل وربطها بملف المريض بنجاح!");
  closeLabModal();
  loadLabRequests();
};

window.logout = function() {
  sessionStorage.removeItem("bm_active_user");
  location.href = "../index.html";
};