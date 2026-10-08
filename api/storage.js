// ذاكرة سحابية عالمية على سيرفر Vercel Serverless
global.medDB = global.medDB || {
  users: [
    { name: "د. عمرو عثمان", phone: "01018622861", password: "Amr307&&", role: "DOCTOR", clinic: "عظام" },
    { name: "د. ملك محسن", phone: "01012006904", password: "Malak136&&", role: "DOCTOR", clinic: "أطفال" },
    { name: "د. ملك صلاح", phone: "01107677972", password: "Malak136@@", role: "DOCTOR", clinic: "باطنة" },
    { name: "أحمد محمود عثمان", phone: "01009694831", password: "123", role: "PATIENT", bloodType: "O-", gender: "MALE", weight: 75, lastDonationDate: null }
  ],
  appointments: [],
  prescriptions: [],
  blood_requests: []
};

export default function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  const { type } = req.query;

  if (req.method === "GET") {
    return res.status(200).json(global.medDB[type] || []);
  }

  if (req.method === "POST") {
    if (type === "update_user") {
      const idx = global.medDB.users.findIndex(u => u.phone === req.body.phone);
      if (idx !== -1) global.medDB.users[idx] = req.body;
      return res.status(200).json(req.body);
    }

    if (!global.medDB[type]) global.medDB[type] = [];
    global.medDB[type].push(req.body);
    return res.status(201).json(req.body);
  }

  res.status(405).json({ message: "Method not allowed" });
}