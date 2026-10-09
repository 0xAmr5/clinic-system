import { 
  db, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  query, 
  where 
} from "../firebase-config.js";

const LAB_SERVICES = {
  LAB: [
    { name: "صورة دم كاملة (CBC)", price: 150 },
    { name: "وظائف كبد وكلى شاملة (LFT & KFT)", price: 280 },
    { name: "تحليل سكر تراكمي (HbA1c)", price: 180 },
    { name: "تحليل دهون ثلاثية وكوليسترول (Lipid Profile)", price: 220 },
    { name: "تحليل سرعة ترسيب وبروتين التهابي (ESR & CRP)", price: 160 }
  ],
  RAD: [
    { name: "أشعة سينية ديجيتال (Digital X-Ray)", price: 250 },
    { name: "سونار بطن وحوض (Abdominal Ultrasound)", price: 350 },
    { name: "أشعة مقطعية متقدمة (CT Scan)", price: 850 },
    { name: "رنين مغناطيسي (MRI)", price: 1400 }
  ]
};

let currentUser = JSON.parse(sessionStorage.getItem("bm_active_user")) || null;

document.addEventListener("DOMContentLoaded", () => {
  if (!currentUser) {
    alert("يرجى تسجيل الدخول أولاً.");
    location.href = "../auth/auth.html";
    return;
  }

  document.getElementById("userNameDisplay").innerText = currentUser.name;
  document.getElementById("userBadge").innerText = `فصيلة (${currentUser.bloodType || 'مريض'})`;

  filterDoctors();
  loadTestOptions();
  loadMyPrescriptions();
  loadMyLabResults();
  loadBloodEligibility();
  loadActiveBloodRequests();
});

// التنقل بين التبويبات
window.switchTab = function(tab) {
  document.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".tab-pane").forEach(p => p.classList.add("hidden"));

  if (tab === "clinic-book") {
    document.getElementById("tabClinicBook").classList.remove("hidden");
    filterDoctors();
  } else if (tab === "ai-triage") {
    document.getElementById("tabAiTriage").classList.remove("hidden");
  } else if (tab === "lab-book") {
    document.getElementById("tabLabBook").classList.remove("hidden");
    loadTestOptions();
  } else if (tab === "my-records") {
    document.getElementById("tabMyRecords").classList.remove("hidden");
    loadMyPrescriptions();
    loadMyLabResults();
  } else if (tab === "blood-bank") {
    document.getElementById("tabBloodBank").classList.remove("hidden");
    loadActiveBloodRequests();
  }
  
  if (event && event.target) {
    event.target.classList.add("active");
  }
};

// ==========================================
// 1. محرك الذكاء الطبي وتوجيه الطوارئ الفوري
// ==========================================
window.handleAnalyzeSymptoms = function(e) {
  e.preventDefault();
  const symptoms = document.getElementById("aiSymptomsInput").value.trim().toLowerCase();
  const duration = document.getElementById("aiDuration").value;
  const pain = parseInt(document.getElementById("aiPainLevel").value);

  const resultBox = document.getElementById("aiResultBox");
  const title = document.getElementById("aiResultTitle");
  const badge = document.getElementById("aiSeverityBadge");
  const explanation = document.getElementById("aiExplanation");
  const actionBox = document.getElementById("aiRecommendedAction");

  resultBox.classList.remove("hidden");

  // فحص علامات الخطورة الطارئة (Emergency Red Flags)
  const redFlags = ["صدر", "ضيق تنفس", "اغماء", "نزيف", "تشنج", "شلل", "جلطة", "طوارئ", "حادث"];
  const isEmergency = redFlags.some(k => symptoms.includes(k)) || (pain >= 9 && duration.includes("ساعات"));

  if (isEmergency) {
    title.innerText = "🚨 حالة طوارئ محتملة - توجيه فوري";
    badge.innerText = "عالية الخطورة (Emergency)";
    badge.className = "badge badge-blood";
    explanation.innerHTML = `
      الأعراض المدخلة تتضمن مؤشرات حرجة تتطلب تدخلاً طبياً عاجلاً وفحص العلامات الحيوية فوراً دون انتظار حجز العيادات الخارجية.<br>
      <strong>التوصية:</strong> تم توجيه الحالة لغرفة عمليات استقبال وطوارئ مستشفى بني مزار (د. حازم القاضي).
    `;
    
    actionBox.innerHTML = `
      <div class="flex-between">
        <div>
          <strong>قسم الطوارئ والاستقبال جاهز:</strong><br>
          <small class="text-muted">اضغط للتحويل الفوري وإرسال بياناتك لشاشة طبيب الطوارئ</small>
        </div>
        <button class="btn btn-danger btn-sm" onclick="sendDirectToEmergency('${encodeURIComponent(symptoms)}', ${pain})">
          🚨 تحويل فوري لغرفة عمليات الطوارئ
        </button>
      </div>
    `;
    window.scrollTo({ top: resultBox.offsetTop - 80, behavior: "smooth" });
    return;
  }

  // التوجيه للعيادات العادية
  let matchedSpecialty = "باطنة";
  let recommendedDoctor = "د. ملك صلاح";
  let reason = "";

  if (symptoms.includes("عظام") || symptoms.includes("كسر") || symptoms.includes("ركب") || symptoms.includes("مفصل") || symptoms.includes("ظهر") || symptoms.includes("كاحل") || symptoms.includes("التواء") || symptoms.includes("فقرات")) {
    matchedSpecialty = "عظام";
    recommendedDoctor = "د. عمرو عثمان (أخصائي جراحة العظام)";
    reason = "الأعراض تشير إلى إجهاد حركي، التواء بالأربطة، أو التهاب غضروفي بمفصل/عظام الهيكل العظمي.";
  } else if (symptoms.includes("طفل") || symptoms.includes("رضيع") || symptoms.includes("سخونة للطفل") || symptoms.includes("تطعيم") || symptoms.includes("ترجيع للطفل")) {
    matchedSpecialty = "أطفال";
    recommendedDoctor = "د. ملك محسن (أخصائية طب الأطفال)";
    reason = "الشكوى تخص مرحلة الطفولة وحديثي الولادة وتتطلب بروتوكول علاج وجرعات أطفال مخصصة.";
  } else if (symptoms.includes("عين") || symptoms.includes("رؤية") || symptoms.includes("زغللة") || symptoms.includes("حكة بالعين") || symptoms.includes("قرنية")) {
    matchedSpecialty = "رمد";
    recommendedDoctor = "عيادة الرمد وجراحة العيون";
    reason = "الأعراض تشير إلى التهاب سطحي بالملتحمة أو إجهاد بصري يتطلب فحص قاع العين.";
  } else {
    matchedSpecialty = "باطنة";
    recommendedDoctor = "د. ملك صلاح (أخصائية الأمراض الباطنية)";
    reason = "الأعراض ترجح اضطراباً بالجهاز الهضمي، القولون، أو ارتفاع سكر وضغط يتطلب فحصاً باطنياً شاملاً.";
  }

  title.innerText = `التشخيص الموجه: عيادة ${matchedSpecialty}`;
  badge.innerText = "حالة روتينية (Clinic Visit)";
  badge.className = "badge badge-success";

  explanation.innerHTML = `
    <strong>تحليل الشكوى:</strong> ${reason}<br>
    <strong>شدة الألم المسجلة:</strong> ${pain}/10 | <strong>المدة:</strong> ${duration}.
  `;

  actionBox.innerHTML = `
    <div class="flex-between">
      <div>
        <strong>الطبيب المقترح لمتابعة حالتك:</strong> ${recommendedDoctor}<br>
        <small class="text-muted">عيادة ${matchedSpecialty} بمستشفى بني مزار التخصصي</small>
      </div>
      <button class="btn btn-primary btn-sm" onclick="directBookSpecialty('${matchedSpecialty}')">
        حجز موعد بالعيادة فوراً 👈
      </button>
    </div>
  `;

  window.scrollTo({ top: resultBox.offsetTop - 80, behavior: "smooth" });
};

// تسجيل الحالة فوراً في غرفة عمليات الطوارئ (emergency_cases)
window.sendDirectToEmergency = async function(encodedSymptoms, painLevel) {
  const symptomsText = decodeURIComponent(encodedSymptoms);

  const emergencyCase = {
    patientName: currentUser.name,
    patientPhone: currentUser.phone,
    triageLevel: "RED", // كود أحمر مباشر
    condition: `أعراض حرجة عبر المساعد الذكي: ${symptomsText} (شدة الألم: ${painLevel}/10)`,
    vitals: { bp: "قيد القياس", pulse: "قيد القياس", o2: "قيد القياس" },
    status: "ACTIVE",
    doctorName: "د. حازم القاضي (طوارئ)",
    time: new Date().toLocaleTimeString("ar-EG"),
    createdAt: Date.now()
  };

  try {
    await addDoc(collection(db, "emergency_cases"), emergencyCase);
    alert("🚨 تم تسجيل حالتك فوراً في غرفة عمليات الطوارئ بكود أحمر! تم إخطار د. حازم القاضي والاستقبال بالوصول.");
    location.href = "../emergency/emergency.html";
  } catch (err) {
    alert("خطأ أثناء إرسال البلاغ: " + err.message);
  }
};

window.directBookSpecialty = function(specialty) {
  switchTab("clinic-book");
  selectClinic(specialty);
};

// ==========================================
// 2. حجز العيادات الخارجية
// ==========================================
window.selectClinic = function(clinicName) {
  const select = document.getElementById("clinicSelect");
  if (select) {
    select.value = clinicName;
    filterDoctors();
    window.scrollTo({ top: select.offsetTop - 80, behavior: "smooth" });
  }
};

window.filterDoctors = async function() {
  const clinic = document.getElementById("clinicSelect").value;
  const docSelect = document.getElementById("doctorSelect");
  const feeDisplay = document.getElementById("clinicFeeDisplay");

  const q = query(collection(db, "users"), where("role", "==", "DOCTOR"), where("clinic", "==", clinic));
  const snap = await getDocs(q);

  docSelect.innerHTML = "";
  snap.forEach(d => {
    const docData = d.data();
    const fee = docData.fee || 200;
    docSelect.innerHTML += `<option value="${docData.phone}" data-fee="${fee}">${docData.name}</option>`;
  });

  if (docSelect.options.length > 0) {
    feeDisplay.value = (docSelect.options[0].dataset.fee || 200) + " ج.م";
  } else {
    docSelect.innerHTML = `<option value="">لا يوجد أطباء متاحين حالياً</option>`;
  }

  docSelect.onchange = () => {
    const opt = docSelect.options[docSelect.selectedIndex];
    if (opt && opt.dataset.fee) {
      feeDisplay.value = opt.dataset.fee + " ج.م";
    }
  };
};

window.handleBookClinic = async function(e) {
  e.preventDefault();
  const clinic = document.getElementById("clinicSelect").value;
  const docPhone = document.getElementById("doctorSelect").value;
  const date = document.getElementById("clinicDate").value;

  if (!docPhone) {
    alert("يرجى اختيار الطبيب المعالج أولاً.");
    return;
  }

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
  alert(`تم حجز موعد الكشف بنجاح مع ${doctor.name} بعيادة ${clinic}! القيمة: ${doctor.fee || 200} ج.م`);
  switchTab("my-records");
};

// ==========================================
// 3. حجز التحاليل والأشعة
// ==========================================
window.selectLabDept = function(dept) {
  const deptSelect = document.getElementById("labDeptSelect");
  if (deptSelect) {
    deptSelect.value = dept;
    loadTestOptions();
    window.scrollTo({ top: deptSelect.offsetTop - 80, behavior: "smooth" });
  }
};

window.loadTestOptions = function() {
  const dept = document.getElementById("labDeptSelect").value || "LAB";
  const testSelect = document.getElementById("testNameSelect");
  const priceDisplay = document.getElementById("labPriceDisplay");
  const list = LAB_SERVICES[dept];

  if (!list || !testSelect) return;

  testSelect.innerHTML = list.map(item => `
    <option value="${item.name}" data-price="${item.price}">${item.name} (${item.price} ج.م)</option>
  `).join("");

  priceDisplay.value = list[0].price + " ج.م";

  testSelect.onchange = () => {
    const opt = testSelect.options[testSelect.selectedIndex];
    if (opt && opt.dataset.price) {
      priceDisplay.value = opt.dataset.price + " ج.م";
    }
  };
};

window.handleBookLab = async function(e) {
  e.preventDefault();
  const dept = document.getElementById("labDeptSelect").value;
  const testSelect = document.getElementById("testNameSelect");
  const testName = testSelect.value;
  const date = document.getElementById("labDate").value;
  const notes = document.getElementById("labNotes").value.trim() || "فحص اعتيادي";

  const selectedOpt = testSelect.options[testSelect.selectedIndex];
  const price = selectedOpt ? parseInt(selectedOpt.dataset.price) : (dept === "LAB" ? 150 : 250);
  const specialistName = dept === "LAB" ? "د. نورهان البدري" : "د. كريم الشريف";

  try {
    const req = {
      patientName: currentUser.name,
      patientPhone: currentUser.phone,
      department: dept,
      testName,
      price: Number(price) || 150,
      date,
      notes,
      specialistName,
      status: "PENDING",
      report: null,
      attachment: null,
      createdAt: Date.now()
    };

    await addDoc(collection(db, "lab_requests"), req);
    alert(`تم حجز الفحص بنجاح برعاية (${specialistName})! القيمة: ${price} ج.م`);
    
    document.getElementById("labNotes").value = "";
    switchTab("my-records");
    loadMyLabResults();
  } catch (err) {
    console.error("خطأ حجز التحليل:", err);
    alert("حدث خطأ أثناء حجز الفحص: " + err.message);
  }
};

// ==========================================
// 4. عرض الروشتات والتحاليل
// ==========================================
async function loadMyPrescriptions() {
  const q = query(collection(db, "prescriptions"), where("patientPhone", "==", currentUser.phone));
  const snap = await getDocs(q);
  const c = document.getElementById("patientPrescriptionsList");

  if (!c) return;

  if (snap.empty) {
    c.innerHTML = "<p class='text-muted p-2'>لا توجد روشتات مسجلة لك حتى الآن.</p>";
    return;
  }

  let html = "";
  snap.forEach(d => {
    const r = d.data();
    html += `
      <div class="record-box">
        <strong>العيادة:</strong> ${r.clinic} (${r.doctorName}) | <strong>التاريخ:</strong> ${r.date}<br>
        <strong>التشخيص:</strong> ${r.diagnosis}
        <div style="background:#f1f5f9; padding:8px; border-radius:6px; margin-top:8px;">
          <strong>العلاج الموصوف والجرعات:</strong><br>
          <span style="white-space:pre-line;">${r.medications}</span>
        </div>
      </div>
    `;
  });
  c.innerHTML = html;
}

async function loadMyLabResults() {
  const q = query(collection(db, "lab_requests"), where("patientPhone", "==", currentUser.phone));
  const snap = await getDocs(q);
  const c = document.getElementById("patientLabResultsList");

  if (!c) return;

  if (snap.empty) {
    c.innerHTML = "<p class='text-muted p-2'>لا توجد فحوصات معمل أو أشعة مسجلة لك حتى الآن.</p>";
    return;
  }

  let html = "";
  snap.forEach(d => {
    const l = d.data();
    const isDone = l.status === "COMPLETED";
    html += `
      <div class="record-box">
        <div class="flex-between">
          <strong>${l.testName} (${l.department === 'RAD' ? 'أشعة' : 'معمل'})</strong>
          <span class="badge ${isDone ? 'badge-success' : 'badge-admin'}">
            ${isDone ? 'التقرير جاهز ✓' : 'قيد الفحص والتحليل ⏳'}
          </span>
        </div>
        <small class="text-muted">المسؤول: ${l.specialistName} | الموعد: ${l.date} | الرسوم: ${l.price} ج.م</small>
        ${isDone ? `
          <div style="background:#f1f5f9; padding:12px; border-radius:8px; margin-top:8px; border-right:4px solid #10b981;">
            <strong>التقرير الطبي المعتمد (${l.certifiedBy || ''}):</strong><br>
            <p style="white-space:pre-line; margin:6px 0;">${l.report}</p>

            ${l.attachment ? `
              <div style="margin-top:10px; padding-top:10px; border-top:1px dashed var(--border);">
                <strong>📷 المرفق الطبي المعتمد:</strong><br>
                <img src="${l.attachment}" alt="مرفق الفحص" style="max-width:100%; max-height:260px; border-radius:6px; margin-top:6px; cursor:pointer; border:1px solid #cbd5e1;" onclick="window.open('${l.attachment}')">
              </div>
            ` : ''}

            <div style="margin-top:12px;">
              <button class="btn btn-outline-primary btn-sm" onclick="printMedicalReport('${l.testName}', '${l.specialistName}', '${l.date}', '${encodeURIComponent(l.report)}', '${l.attachment ? encodeURIComponent(l.attachment) : ''}')">
                🖨️ طباعة التقرير الطبي الرسمي (PDF)
              </button>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  });
  c.innerHTML = html;
}

window.printMedicalReport = function(testName, specialist, date, encodedReport, encodedAttachment) {
  const reportText = decodeURIComponent(encodedReport);
  const attachment = encodedAttachment ? decodeURIComponent(encodedAttachment) : null;

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>تقرير فحص طبي معتمد - مستشفى بني مزار التخصصي</title>
      <style>
        body { font-family: 'Cairo', sans-serif, Tahoma; padding: 30px; color: #1e293b; }
        .header { text-align: center; border-bottom: 2px solid #0284c7; padding-bottom: 15px; margin-bottom: 25px; }
        .header h1 { margin: 0; color: #0284c7; font-size: 22px; }
        .header p { margin: 5px 0 0; color: #64748b; font-size: 13px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 25px; font-size: 14px; }
        .report-body { border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; line-height: 1.8; margin-bottom: 25px; }
        .report-body h3 { margin-top: 0; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
        .image-box { text-align: center; margin-top: 20px; }
        .image-box img { max-width: 90%; max-height: 400px; border-radius: 6px; border: 1px solid #cbd5e1; }
        .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 13px; border-top: 1px solid #e2e8f0; padding-top: 15px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🏥 مستشفى بني مزار التخصصي</h1>
        <p>قسم المعامل والأشعة التشخيصية • تقرير فحص طبي معتمد</p>
      </div>

      <div class="info-grid">
        <div><strong>اسم المريض:</strong> ${currentUser.name}</div>
        <div><strong>رقم الهاتف:</strong> ${currentUser.phone}</div>
        <div><strong>نوع الفحص:</strong> ${testName}</div>
        <div><strong>تاريخ الإجراء:</strong> ${date}</div>
        <div><strong>الطبيب المسؤول:</strong> ${specialist}</div>
        <div><strong>حالة الاعتماد:</strong> معتمد إكلينيكياً ✓</div>
      </div>

      <div class="report-body">
        <h3>التقرير الفني والنتائج الإكلينيكية:</h3>
        <p style="white-space: pre-line;">${reportText}</p>
        
        ${attachment ? `
          <div class="image-box">
            <h4>صورة الفحص / الأشعة الملحقة:</h4>
            <img src="${attachment}" alt="صورة الفحص">
          </div>
        ` : ''}
      </div>

      <div class="footer">
        <div>ختم وتوقيع الطبيب المعتمد: ____________________</div>
        <div>تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}</div>
      </div>

      <script>
        window.onload = function() {
          window.print();
        };
      <\/script>
    </body>
    </html>
  `);
  printWindow.document.close();
};

function loadBloodEligibility() {
  const box = document.getElementById("donorEligibilityBox");
  if (box) {
    box.innerHTML = `
      <div class="status-eligible">✓ أنت مؤهل للتبرع بالدم في حالات الطوارئ</div>
      <small class="text-muted">فصيلتك: ${currentUser.bloodType || 'غير محدد'} | الوزن: ${currentUser.weight || 75} كجم</small>
    `;
  }
}

async function loadActiveBloodRequests() {
  const snap = await getDocs(collection(db, "blood_requests"));
  const container = document.getElementById("activeBloodList");

  if (!container) return;

  if (snap.empty) {
    container.innerHTML = "<p class='text-muted p-2'>لا توجد استغاثات دم نشطة حالياً.</p>";
    return;
  }

  let html = "";
  snap.forEach(d => {
    const r = d.data();
    html += `
      <div class="record-box flex-between">
        <div>
          <strong style="color:var(--danger)">مطلوب فصيلة: ${r.bloodType}</strong> (${r.units} أكياس)<br>
          <small class="text-muted">${r.hospital} • ${r.time}</small>
        </div>
        <span class="badge ${r.status === 'ACTIVE' ? 'badge-blood' : 'badge-success'}">
          ${r.status === 'ACTIVE' ? 'طوارئ جارية' : 'مكتمل'}
        </span>
      </div>
    `;
  });
  container.innerHTML = html;
}

window.logout = function() {
  sessionStorage.removeItem("bm_active_user");
  location.href = "../index.html";
};