import { 
  db, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs 
} from "./firebase-config.js";

const OFFICIAL_USERS = [
  { name: "د. عبد الرحمن المنياوي", phone: "01025841963", password: "BaniMazarAdmin2026#", role: "ADMIN" },
  { name: "د. عمرو عثمان", phone: "01018622861", password: "Amr307&&", role: "DOCTOR", clinic: "عظام", fee: 200, schedule: "يومياً من 6 إلى 10 مساءً" },
  { name: "د. ملك محسن", phone: "01012006904", password: "Malak136&&", role: "DOCTOR", clinic: "أطفال", fee: 180, schedule: "السبت والإثنين والأربعاء 5 م" },
  { name: "د. ملك صلاح", phone: "01107677972", password: "Malak136@@", role: "DOCTOR", clinic: "باطنة", fee: 200, schedule: "الأحد والثلاثاء والخميس 6 م" },
  { name: "د. كريم الشريف", phone: "01065432198", password: "KarimRad2026!", role: "DOCTOR", clinic: "أشعة", fee: 250, schedule: "يومياً على مدار 24 ساعة" },
  { name: "د. نورهان البدري", phone: "01143219876", password: "NourhanLab2026#", role: "DOCTOR", clinic: "معمل", fee: 150, schedule: "يومياً من 9 ص حتى 11 م" },
  { name: "أحمد محمود عثمان", phone: "01009694831", password: "Ahmed123456#", role: "PATIENT", bloodType: "O-", gender: "MALE", weight: 75, lastDonationDate: null }
];

async function seedSystemUsers() {
  for (const u of OFFICIAL_USERS) {
    try {
      const userRef = doc(db, "users", u.phone);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        await setDoc(userRef, u);
      }
    } catch (e) {
      console.warn("Seeding notice:", e.message);
    }
  }
}
seedSystemUsers();

let currentUser = JSON.parse(sessionStorage.getItem("bm_active_user")) || null;

document.addEventListener("DOMContentLoaded", () => {
  if (currentUser) {
    const navUser = document.getElementById("navUser");
    const nameDisplay = document.getElementById("userNameDisplay");
    const userBadge = document.getElementById("userBadge");
    
    if (navUser) navUser.classList.remove("hidden");
    if (nameDisplay) nameDisplay.innerText = currentUser.name;
    if (userBadge) {
      userBadge.innerText = currentUser.role === "ADMIN" ? "مدير المستشفى" : (currentUser.clinic || "مريض");
    }
  }
});

window.goToModule = function(moduleName) {
  if (!currentUser) {
    alert("يرجى تسجيل الدخول أولاً للوصول إلى هذا القسم.");
    window.showAuthView('login');
    return;
  }
  if (moduleName === "admin" && currentUser.role !== "ADMIN") {
    alert("هذا القسم مخصص لإدارة المستشفى فقط.");
    return;
  }
  location.href = `${moduleName}/${moduleName === 'admin' ? 'dashboard' : (moduleName === 'labs' ? 'labs' : 'portal')}.html`;
};

window.showAuthView = function(tab) {
  document.getElementById("homeSection")?.classList.add("hidden");
  document.getElementById("authSection")?.classList.remove("hidden");
  window.switchAuthTab(tab);
};

window.switchAuthTab = function(type) {
  document.getElementById("tabLogin")?.classList.toggle("active", type === 'login');
  document.getElementById("tabRegister")?.classList.toggle("active", type === 'register');
  document.getElementById("loginForm")?.classList.toggle("hidden", type !== 'login');
  document.getElementById("registerForm")?.classList.toggle("hidden", type !== 'register');
};

window.fillLogin = function(phone, pass) {
  window.showAuthView('login');
  const phoneInput = document.getElementById("loginPhone");
  const passInput = document.getElementById("loginPass");
  if (phoneInput && passInput) {
    phoneInput.value = phone;
    passInput.value = pass;
  }
};

window.handleLogin = async function(e) {
  e.preventDefault();
  const phone = document.getElementById("loginPhone")?.value.trim();
  const pass = document.getElementById("loginPass")?.value;

  try {
    const snap = await getDoc(doc(db, "users", phone));
    if (!snap.exists() || snap.data().password !== pass) {
      alert("رقم الهاتف أو كلمة المرور غير صحيحة!");
      return;
    }

    currentUser = snap.data();
    sessionStorage.setItem("bm_active_user", JSON.stringify(currentUser));

    if (currentUser.role === "ADMIN") {
      location.href = "admin/dashboard.html";
    } else if (currentUser.clinic === "معمل" || currentUser.clinic === "أشعة") {
      location.href = "labs/labs.html";
    } else {
      location.reload();
    }
  } catch (err) {
    console.error(err);
    alert("حدث خطأ أثناء تسجيل الدخول: " + err.message);
  }
};

window.handleRegister = async function(e) {
  e.preventDefault();
  const phone = document.getElementById("regPhone")?.value.trim();

  try {
    const check = await getDoc(doc(db, "users", phone));
    if (check.exists()) {
      alert("رقم الهاتف مسجل بالفعل!");
      return;
    }

    const newUser = {
      name: document.getElementById("regName")?.value.trim(),
      phone,
      password: document.getElementById("regPass")?.value,
      role: "PATIENT",
      bloodType: document.getElementById("regBloodType")?.value,
      gender: document.getElementById("regGender")?.value,
      weight: parseFloat(document.getElementById("regWeight")?.value || "75"),
      lastDonationDate: null
    };

    await setDoc(doc(db, "users", phone), newUser);
    currentUser = newUser;
    sessionStorage.setItem("bm_active_user", JSON.stringify(newUser));
    location.reload();
  } catch (err) {
    console.error(err);
    alert("حدث خطأ أثناء إنشاء الحساب: " + err.message);
  }
};

window.logout = function() {
  sessionStorage.removeItem("bm_active_user");
  location.href = "index.html";
};