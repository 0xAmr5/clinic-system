let users = [
  { id: "doc1", name: "د. أحمد علي", role: "DOCTOR", specialty: "باطنة وعناية" },
  { id: "pat1", name: "محمد محمود", role: "PATIENT", phone: "01000000001" }
];

export default function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  if (req.method === "GET") {
    const doctors = users.filter(u => u.role === "DOCTOR");
    return res.status(200).json(doctors);
  }

  if (req.method === "POST") {
    const { name, role, specialty, phone } = req.body;
    const newUser = {
      id: "usr_" + Date.now(),
      name,
      role: role || "PATIENT",
      specialty: specialty || null,
      phone: phone || null
    };
    users.push(newUser);
    return res.status(201).json(newUser);
  }

  res.status(405).json({ message: "Method not allowed" });
}