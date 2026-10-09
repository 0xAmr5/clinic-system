import { db, doc, setDoc, getDoc } from "../firebase-config.js";

// الحسابات الرسمية المعتمدة
const INITIAL_ACCOUNTS = [
  { name: "د. عبد الرحمن المنياوي", phone: "01025841963", password: "BaniMazarAdmin2026#", role: "ADMIN" },
  { name: "د. عمرو عثمان", phone: "01018622861", password: "Amr307&&", role: "DOCTOR", clinic: "عظام", fee: 200, schedule: "يومياً من 6 إلى 10 مساءً" },
  { name: "د. ملك محسن", phone: "01012006904", password: "Malak136&&", role: "DOCTOR", clinic: "أطفال", fee: 180, schedule: "السبت والإثنين والأربعاء 5 م" },
  { name: "د. ملك صلاح", phone: "01107677972", password: "Malak136@@", role: "DOCTOR", clinic: "باطنة", fee: 200, schedule: "الأحد والثلاثاء والخميس 6 م" },
  { name: "د. كريم الشريف", phone: "01065432198", password: "KarimRad2026!", role: "DOCTOR", clinic: "أشعة", fee: 250, schedule: "طوارئ 24 ساعة" },
  { name: "د. نورهان البدري", phone: "01143219876", password: "NourhanLab2026#", role: "DOCTOR", clinic: "معمل", fee: 150, schedule: "يومياً من 9 ص حتى 11 م" },
  { name: "د. مصطفى الجمال", phone: "01287654321", password: "GamalPharma2026$", role: "DOCTOR", clinic: "صيدلية", fee: 0, schedule: "يومياً 24 ساعة" },
  { name: "د. حازم القاضي", phone: "01033221100", password: "Emergency2026#", role: "DOCTOR", clinic: "طوارئ", fee: 0, schedule: "طوارئ 24 ساعة يومياً" },
  { name: "أحمد محمود عثمان", phone: "01009694831", password: "Ahmed123456#", role: "PATIENT", bloodType: "O-", gender: "MALE", weight: 75, lastDonationDate: null }
];

async function syncOfficialAccounts() {
  for (const acc of INITIAL_ACCOUNTS) {
    try {
      await setDoc(doc(db, "users", acc.phone), acc, { merge: true });
    } catch (e) {
      console.warn("Syncing error:", e.message);
    }
  }
}
syncOfficialAccounts();

document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("mode") === "register") {
    switchTab("register");
  }
});

window.switchTab = function(type) {
  document.getElementById("tabLogin").classList.toggle("active", type === 'login');
  document.getElementById("tabRegister").classList.toggle("active", type === 'register');
  document.getElementById("loginForm").classList.toggle("hidden", type !== 'login');
  document.getElementById("registerForm").classList.toggle("hidden", type !== 'register');
};

window.quickFill = function(phone, pass) {
  document.getElementById("loginPhone").value = phone;
  document.getElementById("loginPass").value = pass;
};

window.handleAuthLogin = async function(e) {
  e.preventDefault();
  const phone = document.getElementById("loginPhone").value.trim();
  const pass = document.getElementById("loginPass").value;

  try {
    const snap = await getDoc(doc(db, "users", phone));
    if (!snap.exists() || snap.data().password !== pass) {
      alert("رقم الهاتف أو كلمة المرور غير صحيحة! تأكد من إدخال البيانات المعتمدة.");
      return;
    }

    const user = snap.data();
    sessionStorage.setItem("bm_active_user", JSON.stringify(user));

    redirectUser(user);
  } catch (err) {
    alert("خطأ في الاتصال: " + err.message);
  }
};

window.handleAuthRegister = async function(e) {
  e.preventDefault();
  const phone = document.getElementById("regPhone").value.trim();
  const check = await getDoc(doc(db, "users", phone));
  if (check.exists()) {
    alert("رقم الهاتف مسجل بالفعل في المستشفى!");
    return;
  }

  const newUser = {
    name: document.getElementById("regName").value.trim(),
    phone,
    password: document.getElementById("regPass").value,
    role: "PATIENT",
    bloodType: document.getElementById("regBloodType").value,
    gender: document.getElementById("regGender").value,
    weight: parseFloat(document.getElementById("regWeight").value || "75"),
    lastDonationDate: null
  };

  await setDoc(doc(db, "users", phone), newUser);
  sessionStorage.setItem("bm_active_user", JSON.stringify(newUser));
  location.href = "../patients/portal.html";
};

function redirectUser(user) {
  if (user.role === "ADMIN") {
    location.href = "../admin/dashboard.html";
  } else if (user.role === "DOCTOR") {
    if (user.clinic === "أشعة") {
      location.href = "../radiology/radiology.html";
    } else if (user.clinic === "معمل") {
      location.href = "../lab/lab.html";
    } else if (user.clinic === "صيدلية") {
      location.href = "../pharmacy/pharmacy.html";
    } else if (user.clinic === "طوارئ") {
      location.href = "../emergency/emergency.html";
    } else {
      location.href = "../clinics/clinics.html";
    }
  } else {
    location.href = "../patients/portal.html";
  }
}