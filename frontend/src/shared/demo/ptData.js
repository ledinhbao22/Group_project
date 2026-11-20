import { demoMembers } from "./members.js";
export function ptDemoData() {
  const when = (day, hour) => {
    const d = new Date();
    d.setDate(d.getDate() + day);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };
  const clients = demoMembers
    .slice(0, 6)
    .map((m) => ({ ...m, member_code: "OG-" + String(m.id).padStart(8, "0") }));
  const sessions = [
    [-3, 8, 0, "COMPLETED"],
    [-2, 16, 1, "COMPLETED"],
    [-1, 9, 2, "COMPLETED"],
    [0, 8, 0, "CONFIRMED"],
    [0, 16, 1, "CONFIRMED"],
    [0, 18, 3, "REQUESTED"],
    [1, 9, 2, "CONFIRMED"],
    [1, 17, 4, "CONFIRMED"],
    [2, 16, 5, "REQUESTED"],
    [3, 9, 0, "CONFIRMED"],
  ].map(([day, hour, who, status], i) => ({
    id: 700 + i,
    pt_id: 201,
    member_id: clients[who].id,
    pt_name: "Lê Quốc Bảo",
    member_name: clients[who].name,
    room_id: 1,
    room: "Phòng Gym",
    starts_at: when(day, hour),
    duration_minutes: 60,
    status,
    note: [
      "Sức mạnh thân dưới · kỹ thuật squat",
      "Thân trên · đẩy và kéo",
      "Sức bền toàn thân",
    ][who % 3],
  }));
  const programs = clients.slice(0, 4).map((s, i) => ({
    id: 800 + i,
    pt_id: 201,
    member_id: s.id,
    pt_name: "Lê Quốc Bảo",
    member_name: s.name,
    name: [
      "Sức mạnh nền tảng",
      "Thân trên & core",
      "Toàn thân",
      "Kỹ thuật thân dưới",
    ][i],
    exercises: [
      { id: 1, name: "Squat", sets: 3, reps: "10", weight: "10 kg" },
      { id: 2, name: "Plank", sets: 3, reps: "30 giây", weight: "" },
    ],
    notes: "Theo dõi kỹ thuật và điều chỉnh tải theo từng buổi.",
    created_at: when(-7, 9),
    completed_count: i < 3 ? 1 : 0,
  }));
  const results = programs
    .slice(0, 3)
    .map((p, i) => ({
      id: 900 + i,
      program_id: p.id,
      member_id: p.member_id,
      member_name: p.member_name,
      program_name: p.name,
      feedback: [
        "Hoàn thành đủ 3 hiệp. Muốn xem lại kỹ thuật squat ở buổi tới.",
        "Mức tạ vừa sức, phần vai cảm thấy ổn.",
        "Đã hoàn thành buổi tập. Bài plank vẫn hơi khó.",
      ][i],
      completed_at: when(-i, 10),
    }));
  return { clients, coachSessions: sessions, programs, results };
}
