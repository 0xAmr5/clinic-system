global.appointments = global.appointments || [
  { id: "apt1", patientId: "pat1", patientName: "محمد محمود", doctorId: "doc1", date: "2026-10-15 06:00 PM", status: "PENDING" }
];

export default function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  if (req.method === "GET") {
    const { doctorId, patientId } = req.query;
    let list = global.appointments;
    if (doctorId) list = list.filter(a => a.doctorId === doctorId);
    if (patientId) list = list.filter(a => a.patientId === patientId);
    return res.status(200).json(list);
  }

  if (req.method === "POST") {
    const { patientId, patientName, doctorId, date } = req.body;
    const newApt = {
      id: "apt_" + Date.now(),
      patientId,
      patientName,
      doctorId,
      date,
      status: "CONFIRMED"
    };
    global.appointments.push(newApt);
    return res.status(201).json(newApt);
  }

  res.status(405).json({ message: "Method not allowed" });
}