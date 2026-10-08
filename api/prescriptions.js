global.prescriptions = global.prescriptions || [];

export default function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  if (req.method === "GET") {
    const { patientId } = req.query;
    const userPrescriptions = global.prescriptions.filter(p => p.patientId === patientId);
    return res.status(200).json(userPrescriptions);
  }

  if (req.method === "POST") {
    const { appointmentId, patientId, doctorName, diagnosis, medicines } = req.body;

    const newPrescription = {
      id: "rx_" + Date.now(),
      appointmentId,
      patientId,
      doctorName,
      diagnosis,
      medicines,
      createdAt: new Date().toLocaleDateString("ar-EG")
    };

    global.prescriptions.push(newPrescription);
    return res.status(201).json({ success: true, prescription: newPrescription });
  }

  res.status(405).json({ message: "Method not allowed" });
}