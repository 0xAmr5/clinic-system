import { 
  db, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  query, 
  where 
} from "../firebase-config.js";

let currentUser = JSON.parse(sessionStorage.getItem("bm_active_user")) || null;

document.addEventListener("DOMContentLoaded", () => {
  if (!currentUser) {
    location.href = "../auth/auth.html";
    return;
  }

  document.getElementById("userNameDisplay").innerText = currentUser.name;
  document.getElementById("userBadge").innerText = currentUser.clinic ? `عيادة ${currentUser.clinic}` : "مريض";

  if (currentUser.role === "DOCTOR" && ["عظام", "أطفال", "باطنة"].includes(currentUser.clinic)) {
    document.getElementById("doctorPortalView").classList.remove("hidden");
    document.getElementById("docClinicHeader").innerText = `عيادة ${currentUser.clinic}`;
    document.getElementById("docDoctorSub").innerText = `الطبيب المسؤول: ${currentUser.name}`;
    loadDoctorAppointments();
  } else {
    document.getElementById("patientBookingView").classList.remove("hidden");
    filterDoctorsByClinic();
  }
});

window.filterDoctorsByClinic = async function() {
  const clinic = document.getElementById("bookClinicSelect").value;
  const select = document.getElementById("bookDoctorSelect");
  const q = query(collection(db, "users"), where("role", "==", "DOCTOR"), where("clinic", "==", clinic));
  const snap = await getDocs(q);

  select.innerHTML = "";
  snap.forEach(d => {
    const docData = d.data();
    select.innerHTML += `<option value="${docData.phone}">${docData.name} (${docData.fee || 200} ج.م)</option>`;
  });
};

window.handleBookAppointment = async function(e) {
  e.preventDefault();
  const clinic = document.getElementById("bookClinicSelect").value;
  const docPhone = document.getElementById("bookDoctorSelect").value;
  const date = document.getElementById("bookDate").value;

  const docSnap = await getDoc(doc(db, "users", docPhone));
  const doctor = docSnap.data();

  const apt = {
    patientName: currentUser.name,
    patientPhone: currentUser.phone,
    doctorName: doctor.name,
    doctorPhone: doctor.phone,
    clinic,
    fee: doctor.fee || 200,
    date,
    status: "PENDING",
    createdAt: Date.now()
  };

  await addDoc(collection(db, "appointments"), apt);
  alert(`تم حجز موعدك بنجاح مع ${doctor.name}. ستجده في انتظارك!`);
  location.href = "../patients/portal.html";
};

async function loadDoctorAppointments() {
  const q = query(collection(db, "appointments"), where("doctorPhone", "==", currentUser.phone));
  const snap = await getDocs(q);
  const container = document.getElementById("doctorAppointmentsList");

  if (snap.empty) {
    container.innerHTML = `<p class="text-muted p-2">لا توجد حجوزات مسجلة لعيادتك اليوم.</p>`;
    return;
  }

  let html = "";
  snap.forEach(d => {
    const a = d.data();
    const isDone = a.status === "COMPLETED";
    html += `
      <div class="record-box flex-between">
        <div>
          <strong>${a.patientName}</strong> (${a.patientPhone})<br>
          <small class="text-muted">الموعد: ${a.date} | الكشف: ${a.fee || 200} ج.م</small>
          <span class="badge ${isDone ? 'badge-success' : 'badge-blood'}" style="margin-right:8px;">
            ${isDone ? 'تم الكشف ✓' : 'في الانتظار ⏳'}
          </span>
        </div>
        <button class="btn btn-primary btn-sm" onclick="openPrescription('${d.id}', '${a.patientPhone}', '${a.patientName}')">
          ${isDone ? 'تعديل الروشتة' : 'كشف وروشتة'}
        </button>
      </div>
    `;
  });
  container.innerHTML = html;
}

window.openPrescription = async function(aptId, phone, name) {
  const modal = document.getElementById("prescriptionModal");
  modal.classList.remove("hidden");
  document.getElementById("prescTargetPatientTitle").innerText = `كشف طبي لـ: ${name}`;
  document.getElementById("currentAptId").value = aptId;
  document.getElementById("currentPatientPhone").value = phone;
  document.getElementById("currentPatientName").value = name;

  // جلب التاريخ المرضي للمريض
  const histBox = document.getElementById("modalPatientHistory");
  histBox.innerHTML = "<p class='text-muted fs-small'>جاري جلب التاريخ الصحي...</p>";

  const q = query(collection(db, "prescriptions"), where("patientPhone", "==", phone));
  const snap = await getDocs(q);

  if (snap.empty) {
    histBox.innerHTML = "<p class='text-muted fs-small'>لا يوجد كشوفات أو روشتات سابقة مسجلة للمريض بالمستشفى.</p>";
  } else {
    let hHtml = "";
    snap.forEach(docSnap => {
      const p = docSnap.data();
      hHtml += `
        <div class="history-item">
          <strong>عيادة ${p.clinic} (${p.doctorName})</strong> - <small class="text-muted">${p.date}</small><br>
          <span><strong>التشخيص:</strong> ${p.diagnosis}</span><br>
          <span><strong>العلاج:</strong> ${p.medications}</span>
        </div>
      `;
    });
    histBox.innerHTML = hHtml;
  }

  window.scrollTo({ top: modal.offsetTop - 80, behavior: "smooth" });
};

window.closePrescriptionModal = function() {
  document.getElementById("prescriptionModal").classList.add("hidden");
};

window.handleSavePrescription = async function(e) {
  e.preventDefault();
  const aptId = document.getElementById("currentAptId").value;
  const patientPhone = document.getElementById("currentPatientPhone").value;
  const patientName = document.getElementById("currentPatientName").value;
  const diagnosis = document.getElementById("prescDiagnosis").value;
  const medications = document.getElementById("prescMeds").value;

  const newRx = {
    patientPhone,
    patientName,
    doctorName: currentUser.name,
    doctorPhone: currentUser.phone,
    clinic: currentUser.clinic,
    diagnosis,
    medications,
    date: new Date().toLocaleDateString("ar-EG"),
    createdAt: Date.now()
  };

  await addDoc(collection(db, "prescriptions"), newRx);
  if (aptId) {
    await updateDoc(doc(db, "appointments", aptId), { status: "COMPLETED" });
  }

  alert(`تم حفظ الروشتة في السجل الطبي الدائم للمريض (${patientName}) بنجاح!`);
  closePrescriptionModal();
  loadDoctorAppointments();
};

window.logout = function() {
  sessionStorage.removeItem("bm_active_user");
  location.href = "../index.html";
};