// Sample history is used only by the explicitly labelled demo account.
export function enrichMemberDemo(data) {
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
  });
  const shift = (key, n) => {
    const d = new Date(key + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  const week = shift(
    today,
    -((new Date(today + "T12:00:00Z").getUTCDay() + 6) % 7),
  );
  const offsets = [
    -49, -45, -42, -38, -35, -31, -28, -24, -21, -19, -17, -14, -12, -10, -7,
    -5, -3, 0, 2,
  ];
  const days = offsets.map((n) => shift(week, n)).filter((d) => d < today);
  data.checkins = [
    ...data.checkins.filter((c) => c.member_code !== "OG-00000101"),
    ...days.map((d, i) => ({
      id: 10000 + i,
      member_code: "OG-00000101",
      room_id: 1,
      room: "Phòng Gym",
      checked_in_at: d + "T17:00:00+07:00",
    })),
  ];
  const program = data.programs.find((p) => p.member_id === 101);
  if (program) {
    const completed = days.filter((_, i) => i % 2 === 0);
    data.results = [
      ...data.results.filter((r) => r.program_id !== program.id),
      ...completed.map((d, i) => ({
        id: 11000 + i,
        program_id: program.id,
        member_id: 101,
        member_name: program.member_name,
        program_name: program.name,
        completed_at: d + "T18:00:00+07:00",
        feedback:
          i % 2
            ? "Hoàn thành đủ các hiệp, hôm nay giữ nhịp tốt hơn."
            : "Đã hoàn thành buổi tập. Muốn cùng PT xem lại kỹ thuật ở buổi tiếp theo.",
      })),
    ];
    program.completed_count = completed.length;
  }
  data.wellness = {
    measurements: [67.2, 67, 66.8, 66.9, 66.7, 66.6].map((weight, i) => ({
      id: 13000 + i,
      measured_on: shift(today, -35 + i * 7),
      weight,
      height: 170,
      waist: 78 - i * 0.3,
      body_fat: null,
    })),
  };
  return data;
}
