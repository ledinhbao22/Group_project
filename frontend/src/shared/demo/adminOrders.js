import { demoMembers } from "./members.js";
import { demoPackages } from "./packages.js";
export function adminDemoOrders() {
  return Array.from({ length: 48 }, (_, i) => {
    const member = demoMembers[i % demoMembers.length],
      plan = demoPackages[i % 3],
      date = new Date();
    date.setDate(date.getDate() - (i < 8 ? Math.floor(i / 3) : i * 3));
    return {
      id: 8000 + i,
      reference: "OG-" + (1048 - i),
      member_id: member.id,
      member_name: member.name,
      member_code: "OG-" + String(member.id).padStart(8, "0"),
      package_id: plan.id,
      package_name: plan.name,
      package_days: plan.duration_days,
      package_price: plan.price,
      total: plan.price,
      status: i === 1 || i === 4 ? "SUBMITTED" : i === 7 ? "CANCELLED" : "PAID",
      created_at: date.toISOString(),
    };
  });
}
