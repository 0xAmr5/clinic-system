// ==========================================
// 1. محرك إرسال واتساب المباشر والتوافق الطبي
// ==========================================
function sendWhatsAppAlert(phoneNumber, messageText) {
  if (!phoneNumber) return;

  let cleanNumber = phoneNumber.replace(/\D/g, "");
  if (cleanNumber.startsWith("0")) {
    cleanNumber = "2" + cleanNumber;
  } else if (!cleanNumber.startsWith("20") && cleanNumber.length === 10) {
    cleanNumber = "20" + cleanNumber;
  }

  const encodedMsg = encodeURIComponent(messageText);
  const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodedMsg}`;
  window.open(whatsappUrl, "_blank");
}

const BLOOD_COMPATIBILITY = {
  "O-": ["O-"],
  "O+": ["O-", "O+"],
  "A-": ["O-", "A-"],
  "A+": ["O-", "O+", "A-", "A+"],
  "B-": ["O-", "B-"],
  "B+": ["O-", "O+", "B-", "B+"],
  "AB-": ["O-", "A-", "B-", "AB-"],
  "AB+": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"]
};

// ==========================================
// 2. إدارة التخزين السحابي الدائم عبر Serverless API
// ==========================================
async function apiGet(collection) {
  try {
    const res = await fetch(`/api/storage?type=${collection}`);
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
  } catch (err) {
    console.warn("السيرفر المحلي أو Vercel API غير متاح، التحويل للتخزين المؤقت.");
  }
  return JSON.parse(localStorage.getItem("bm_" + collection) || "[]");
}

async function apiSave(collection, item) {
  try {
    const res = await fetch(`/api/storage?type=${collection}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item)
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn("حفظ محلي بديل.");
  }
  let list = JSON.parse(localStorage.getItem("bm_" + collection) || "[]");
  list.push(item);
  localStorage.setItem("bm_" + collection, JSON.stringify(list));
  return item;
}

let currentUser = JSON.parse(sessionStorage.getItem("bm_active_user")) || null;

document.addEventListener("DOMContentLoaded", () => {
  if (currentUser) {
    showPortalView();
  } else {
    goHome();
  }
});

function goHome() {
  document.getElementById("homeSection").classList.remove("hidden");
  document.getElementById("authSection").classList.add("hidden");
  document.getElementById("patientPortal").classList.add("hidden");
  document.getElementById("doctorPortal").classList.add("hidden");
}

function showAuthView(tab = 'login') {
  document.getElementById("homeSection").classList.add("hidden");
  document.getElementById("authSection").classList.remove("hidden");
  switchAuthTab(tab);
}

function switchAuthTab(type) {
  document.getElementById("tabLogin").classList.toggle("active", type === 'login');
  document.getElementById("tabRegister").classList.toggle("active", type === 'register');
  document.getElementById("loginForm").classList.toggle("hidden", type !== 'login');
  document.getElementById("registerForm").classList.toggle("hidden", type !== 'register');
}

function fillLogin(phone, pass) {
  showAuthView('login');
  document.getElementById("loginPhone").value = phone;
  document.getElementById("loginPass").value = pass;
}

function toggleRoleFields() {
  const isDoc = document.getElementById("regRole").value === "DOCTOR";
  document.getElementById("doctorFields").classList.toggle("hidden", !isDoc);
  document.getElementById("donorFields").classList.toggle("hidden", isDoc);
}

async function handleLogin(e) {
  e.preventDefault();
  const phone = document.getElementById("loginPhone").value.trim();
  const pass = document.getElementById("loginPass").value;

  const users = await apiGet("users");
  const user = users.find(u => u.phone === phone && u.password === pass);

  if (!user) return alert("خطأ: رقم الهاتف أو كلمة المرور غير صحيحة!");

  currentUser = user;
  sessionStorage.setItem("bm_active_user", JSON.stringify(user));
  showPortalView();
}

async function handleRegister(e) {
  e.preventDefault();
  const phone = document.getElementById("regPhone").value.trim();
  const role = document.getElementById("regRole").value;
  const users = await apiGet("users");

  if (users.some(u => u.phone === phone)) return alert("رقم الهاتف مسجل بالفعل!");

  const newUser = {
    id: "usr_" + Date.now(),
    name: document.getElementById("regName").value.trim(),
    phone,
    password: document.getElementById("regPass").value,
    role
  };

  if (role === "DOCTOR") {
    newUser.clinic = document.getElementById("regClinic").value;
  } else {
    newUser.bloodType = document.getElementById("regBloodType").value;
    newUser.gender = document.getElementById("regGender").value;
    newUser.weight = parseFloat(document.getElementById("regWeight").value);
    newUser.lastDonationDate = null;
  }

  await apiSave("users", newUser);
  currentUser = newUser;
  sessionStorage.setItem("bm_active_user", JSON.stringify(newUser));
  showPortalView();
}

function logout() {
  sessionStorage.removeItem("bm_active_user");
  location.reload();
}

function showPortalView() {
  document.getElementById("homeSection").classList.add("hidden");
  document.getElementById("authSection").classList.add("hidden");
  document.getElementById("navUser").classList.remove("hidden");
  document.getElementById("userNameDisplay").innerText = currentUser.name;

  if (currentUser.role === "DOCTOR") {
    document.getElementById("userBadge").innerText = `عيادة ${currentUser.clinic}`;
    document.getElementById("userBadge").className = "badge badge-success";
    document.getElementById("doctorPortal").classList.remove("hidden");
    document.getElementById("patientPortal").classList.add("hidden");
    loadDoctorPortal();
  } else {
    document.getElementById("userBadge").innerText = `فصيلة (${currentUser.bloodType || 'مريض'})`;
    document.getElementById("userBadge").className = "badge badge-blood";
    document.getElementById("patientPortal").classList.remove("hidden");
    document.getElementById("doctorPortal").classList.add("hidden");
    loadPatientPortal();
  }
}

// بوابة المريض
function switchPortalTab(tab) {
  document.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));
  document.getElementById("tabContentClinics").classList.toggle("hidden", tab !== 'clinics');
  document.getElementById("tabContentBlood").classList.toggle("hidden", tab !== 'blood');
  document.getElementById("tabContentPrescriptions").classList.toggle("hidden", tab !== 'prescriptions');
  event.target.classList.add("active");
}

function loadPatientPortal() {
  renderEligibility();
  renderBloodRequests();
  renderPatientPrescriptions();
  checkEmergencyAlert();
}

function checkEligibility(user) {
  if (user.role !== "PATIENT") return { ok: false, msg: "طبيب" };
  if (user.weight < 50) return { ok: false, msg: "الوزن أقل من 50 كجم" };
  if (user.lastDonationDate) {
    const diff = Math.floor((new Date() - new Date(user.lastDonationDate)) / (1000 * 60 * 60 * 24));
    const req = user.gender === "FEMALE" ? 120 : 90;
    if (diff < req) return { ok: false, msg: `متبقي ${req - diff} يوماً على موعد التبرع القادم` };
  }
  return { ok: true, msg: "مؤهل طبياً للتبرع بالدم الآن في حالات الطوارئ" };
}

function renderEligibility() {
  const el = checkEligibility(currentUser);
  const box = document.getElementById("donorEligibilityBox");
  box.innerHTML = `
    <div class="${el.ok ? 'status-eligible' : 'status-ineligible'}">${el.ok ? '✓ جاهز للتبرع' : '✕ غير مؤهل حالياً'}</div>
    <small class="text-muted">${el.msg} | الفصيلة: ${currentUser.bloodType}</small>
  `;
}

async function logSelfDonation() {
  const today = new Date().toISOString().split("T")[0];
  currentUser.lastDonationDate = today;
  await apiSave("update_user", currentUser);
  sessionStorage.setItem("bm_active_user", JSON.stringify(currentUser));
  alert("تم تسجيل تاريخ التبرع بمستشفى بني مزار.");
  renderEligibility();
  checkEmergencyAlert();
}

// طوارئ الدم
async function handleTriggerSOS(e) {
  e.preventDefault();
  const bloodType = document.getElementById("sosBloodType").value;
  const units = document.getElementById("sosUnits").value;
  const hospital = document.getElementById("sosHospital").value;

  const req = {
    id: "sos_" + Date.now(),
    bloodType,
    units,
    hospital,
    status: "ACTIVE",
    time: new Date().toLocaleTimeString("ar-EG")
  };

  await apiSave("blood_requests", req);

  const users = await apiGet("users");
  const compatibleUsers = users.filter(u => 
    u.role === "PATIENT" && (BLOOD_COMPATIBILITY[bloodType] || []).includes(u.bloodType)
  );

  if (compatibleUsers.length > 0) {
    const target = compatibleUsers[0];
    const msg = `🚨 *نداء استغاثة عاجل - بنك الدم بمستشفى بني مزار*\n\nمطلوب متبرعين فوراً لفصيلة: *${bloodType}*\n📦 الاحتياج: ${units} أكياس دم\n📍 الموقع: ${hospital}\n\nفصيلتك المسجلة (*${target.bloodType}*) متطابقة طبياً، حضورك يساهم في إنقاذ حياة مريض!`;
    sendWhatsAppAlert(target.phone, msg);
  }

  alert("تم إطلاق نداء الطوارئ وفتح محادثة واتساب لإخطار المتبرع المتوافق!");
  renderBloodRequests();
  checkEmergencyAlert();
}

async function checkEmergencyAlert() {
  const all = await apiGet("blood_requests");
  const activeSOS = all.find(r => r.status === "ACTIVE");
  const banner = document.getElementById("emergencyBanner");

  if (!activeSOS || currentUser.role !== "PATIENT") {
    banner.classList.add("hidden");
    return;
  }

  const compatible = BLOOD_COMPATIBILITY[activeSOS.bloodType] || [];
  const el = checkEligibility(currentUser);

  if (compatible.includes(currentUser.bloodType) && el.ok) {
    banner.classList.remove("hidden");
    document.getElementById("sosTitle").innerText = `نداء استغاثة عاجل: مطلوب فصيلة (${activeSOS.bloodType}) فوراً!`;
    document.getElementById("sosDesc").innerText = `الموقع: ${activeSOS.hospital} | فصيلتك (${currentUser.bloodType}) متطابقة طبياً وجاهزة للتبرع!`;
  } else {
    banner.classList.add("hidden");
  }
}

function respondToEmergency() {
  alert("تم تأكيد حضورك، فريق بنك الدم في انتظارك بمستشفى بني مزار!");
  document.getElementById("emergencyBanner").classList.add("hidden");
}

async function renderBloodRequests() {
  const all = await apiGet("blood_requests");
  const container = document.getElementById("activeBloodRequestsList");
  if (!all.length) {
    container.innerHTML = `<p class="text-muted">لا توجد استغاثات نشطة حالياً.</p>`;
    return;
  }
  container.innerHTML = all.map(r => `
    <div class="record-box flex-between">
      <div>
        <strong style="color:var(--danger)">مطلوب فصيلة: ${r.bloodType}</strong> (${r.units} أكياس)<br>
        <small class="text-muted">${r.hospital} • ${r.time}</small>
      </div>
      <span class="badge ${r.status === 'ACTIVE' ? 'badge-blood' : 'badge-success'}">${r.status === 'ACTIVE' ? 'طوارئ جارية' : 'مكتمل'}</span>
    </div>
  `).join("");
}

// عيادات وحجوزات
function selectClinic(clinic) {
  document.getElementById("bookClinicSelect").value = clinic;
  filterDoctorsByClinic();
  window.scrollTo({ top: document.getElementById("bookClinicSelect").offsetTop - 80, behavior: "smooth" });
}

async function filterDoctorsByClinic() {
  const clinic = document.getElementById("bookClinicSelect").value;
  const users = await apiGet("users");
  const docs = users.filter(u => u.role === "DOCTOR" && u.clinic === clinic);
  const select = document.getElementById("bookDoctorSelect");

  if (!docs.length) {
    select.innerHTML = `<option value="">لا يوجد أطباء مسجلين</option>`;
    return;
  }
  select.innerHTML = docs.map(d => `<option value="${d.phone}">${d.name}</option>`).join("");
}

async function handleBookAppointment(e) {
  e.preventDefault();
  const clinic = document.getElementById("bookClinicSelect").value;
  const docPhone = document.getElementById("bookDoctorSelect").value;
  const date = document.getElementById("bookDate").value;
  const users = await apiGet("users");
  const doctor = users.find(u => u.phone === docPhone);

  const apt = {
    id: "apt_" + Date.now(),
    patientName: currentUser.name,
    patientPhone: currentUser.phone,
    doctorName: doctor.name,
    doctorPhone: doctor.phone,
    clinic,
    date
  };

  await apiSave("appointments", apt);

  const docMsg = `🏥 *مستشفى بني مزار التخصصي*\n👨‍⚕️ د. ${doctor.name}\n\n📌 تم تسجيل حجز كشف جديد بعيادتك (*${clinic}*)!\n👤 اسم المريض: ${currentUser.name}\n📞 هاتف المريض: ${currentUser.phone}\n🕒 الموعد: ${date}`;
  sendWhatsAppAlert(doctor.phone, docMsg);

  alert(`تم حفظ الحجز وفتح واتساب لتنبيه الدكتور (${doctor.name}) بالموعد!`);
}

async function renderPatientPrescriptions() {
  const all = await apiGet("prescriptions");
  const myRx = all.filter(r => r.patientPhone === currentUser.phone);
  const c = document.getElementById("patientPrescriptionsList");
  if (!myRx.length) {
    c.innerHTML = `<p class="text-muted">لا توجد روشتات مسجلة لك حتى الآن.</p>`;
    return;
  }
  c.innerHTML = myRx.map(r => `
    <div class="record-box">
      <strong>العيادة:</strong> ${r.clinic} (${r.doctorName}) | <strong>التاريخ:</strong> ${r.date}<br>
      <strong>التشخيص:</strong> ${r.diagnosis}
      <div style="background:#f1f5f9; padding:8px; border-radius:6px; margin-top:6px;">
        <strong>العلاج الموصوف:</strong><br>${r.medications.replace(/\n/g, '<br>')}
      </div>
    </div>
  `).join("");
}

// بوابة الطبيب
function loadDoctorPortal() {
  document.getElementById("docClinicHeading").innerText = `عيادة: ${currentUser.clinic}`;
  document.getElementById("docDoctorName").innerText = currentUser.name;
  renderDoctorAppointments();
}

async function renderDoctorAppointments() {
  const all = await apiGet("appointments");
  const myApts = all.filter(a => a.doctorPhone === currentUser.phone);
  const c = document.getElementById("doctorAppointmentsList");
  if (!myApts.length) {
    c.innerHTML = `<p class="text-muted">لا توجد كشوفات مسجلة لعيادتك اليوم.</p>`;
    return;
  }
  c.innerHTML = myApts.map(a => `
    <div class="record-box flex-between">
      <div>
        <strong>المريض:</strong> ${a.patientName} (${a.patientPhone})<br>
        <small class="text-muted">الموعد: ${a.date}</small>
      </div>
      <button class="btn btn-primary btn-sm" onclick="openPrescription('${a.id}','${a.patientPhone}','${a.patientName}')">كتابة روشتة</button>
    </div>
  `).join("");
}

function openPrescription(aptId, phone, name) {
  document.getElementById("prescriptionModal").classList.remove("hidden");
  document.getElementById("prescTargetPatientTitle").innerText = `كتابة روشتة لـ: ${name}`;
  document.getElementById("currentAptId").value = aptId;
  document.getElementById("currentPatientPhone").value = phone;
  document.getElementById("currentPatientName").value = name;
  window.scrollTo({ top: document.getElementById("prescriptionModal").offsetTop - 80, behavior: "smooth" });
}

function closePrescriptionModal() {
  document.getElementById("prescriptionModal").classList.add("hidden");
}

async function handleSavePrescription(e) {
  e.preventDefault();
  const patientPhone = document.getElementById("currentPatientPhone").value;
  const patientName = document.getElementById("currentPatientName").value;
  const diagnosis = document.getElementById("prescDiagnosis").value;
  const medications = document.getElementById("prescMeds").value;

  const newRx = {
    id: "rx_" + Date.now(),
    patientPhone,
    doctorName: currentUser.name,
    clinic: currentUser.clinic,
    diagnosis,
    medications,
    date: new Date().toLocaleDateString("ar-EG")
  };

  await apiSave("prescriptions", newRx);

  const rxMsg = `🏥 *مستشفى بني مزار التخصصي*\nسلامتك يا أستاذ ${patientName}! 🌸\nقام الدكتور ${currentUser.name} (عيادة ${currentUser.clinic}) بإصدار روشتتك الطبية:\n\n📋 *التشخيص:* ${diagnosis}\n\n💊 *العلاج والجرعات:*\n${medications}\n\nنتمنى لك دوام الصحة والعافية!`;
  sendWhatsAppAlert(patientPhone, rxMsg);

  alert(`تم حفظ الروشتة بسجل المريض بنجاح، وجاري فتح واتساب لإرسالها له!`);
  closePrescriptionModal();
  document.getElementById("prescDiagnosis").value = "";
  document.getElementById("prescMeds").value = "";
}