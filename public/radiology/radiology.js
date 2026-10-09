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
let currentRadBase64 = null;

document.addEventListener("DOMContentLoaded", () => {
  if (!currentUser || (currentUser.role !== "ADMIN" && currentUser.clinic !== "أشعة")) {
    alert("هذه اللوحة مخصصة لقسم الأشعة (د. كريم الشريف) فقط.");
    location.href = "../auth/auth.html";
    return;
  }

  document.getElementById("userNameDisplay").innerText = currentUser.name;
  loadRadRequests();
});

async function loadRadRequests() {
  const q = query(collection(db, "lab_requests"), where("department", "==", "RAD"));
  const snap = await getDocs(q);
  const container = document.getElementById("radRequestsTable");

  if (snap.empty) {
    container.innerHTML = "<p class='text-muted p-2'>لا توجد فحوصات أشعة مسجلة حالياً.</p>";
    return;
  }

  let html = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>المريض</th>
          <th>الفحص الإشعاعي</th>
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
          <button class="btn btn-primary btn-sm" onclick="openRadModal('${d.id}', '${item.patientName}', '${item.testName}', '${item.report ? encodeURIComponent(item.report) : ''}')">
            ${isDone ? 'تعديل التقرير' : 'كتابة التقرير'}
          </button>
        </td>
      </tr>
    `;
  });

  html += "</tbody></table>";
  container.innerHTML = html;
}

window.previewRadFile = function(e) {
  const file = e.target.files[0];
  if (!file) {
    currentRadBase64 = null;
    return;
  }

  if (file.size > 1.5 * 1024 * 1024) {
    alert("حجم صورة الأشعة كبير، يرجى اختيار صورة أقل من 1.5 ميجابايت.");
    e.target.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = function(evt) {
    currentRadBase64 = evt.result;
    document.getElementById("radFilePreviewBox").classList.remove("hidden");
    document.getElementById("radImgPreview").src = currentRadBase64;
    document.getElementById("radFileNamePreview").innerText = `صورة الأشعة: ${file.name}`;
  };
  reader.readAsDataURL(file);
};

window.openRadModal = function(id, name, test, encodedReport) {
  const modal = document.getElementById("radModal");
  modal.classList.remove("hidden");
  document.getElementById("radModalTitle").innerText = `تقرير (${test}) للمريض: ${name}`;
  document.getElementById("currentRadId").value = id;
  document.getElementById("radReportText").value = encodedReport ? decodeURIComponent(encodedReport) : "";
  currentRadBase64 = null;
  document.getElementById("radFilePreviewBox").classList.add("hidden");
  document.getElementById("radAttachmentFile").value = "";
  window.scrollTo({ top: modal.offsetTop - 80, behavior: "smooth" });
};

window.closeRadModal = function() {
  document.getElementById("radModal").classList.add("hidden");
};

window.handleSaveRadReport = async function(e) {
  e.preventDefault();
  const id = document.getElementById("currentRadId").value;
  const text = document.getElementById("radReportText").value.trim();

  const updateData = {
    report: text,
    status: "COMPLETED",
    certifiedBy: "د. كريم الشريف"
  };

  if (currentRadBase64) {
    updateData.attachment = currentRadBase64;
  }

  await updateDoc(doc(db, "lab_requests", id), updateData);

  alert("تم حفظ التقرير وصورة الأشعة بنجاح واعتمادها للمريض!");
  closeRadModal();
  loadRadRequests();
};

window.logout = function() {
  sessionStorage.removeItem("bm_active_user");
  location.href = "../index.html";
};