import { enrichMemberDemo } from "./memberData.js";
import { demoClubData } from "../api/clubData.js";
import { daysFromNow } from "../lib/date.js";
import { demoMembers } from "./members.js";
import { demoTrainers } from "./trainers.js";
import { demoPackages } from "./packages.js";
import { demoStaff } from "./staff.js";
import { adminDemoOrders } from "./adminOrders.js";
import { ptDemoData } from "./ptData.js";

export function freshDemoData() {
  return enrichMemberDemo(
    structuredClone({
      ...demoClubData(),
      orders: adminDemoOrders(),
      members: demoMembers.map((m, idx) => {
        const daysLeft = idx === 1 ? 3 : idx === 2 ? 1 : idx === 3 ? -2 : 45;
        const endsOn = daysFromNow(daysLeft);
        return {
          ...m,
          member_code: "OG-" + String(m.id).padStart(8, "0"),
          package_name: idx === 1 ? "Gym 3 tháng" : idx === 2 ? "Yoga 1 tháng" : idx === 3 ? "Boxing 1 tháng" : "Gym 3 tháng",
          ends_on: endsOn,
          days_left: daysLeft,
          reminded: idx === 2,
        };
      }),
      trainers: demoTrainers,
      staff: demoStaff,
      packages: demoPackages,
      assignments: [
        {
          pt_id: 201,
          member_id: 101,
          pt_name: demoTrainers[0].name,
          member_name: demoMembers[0].name,
        },
        {
          pt_id: 202,
          member_id: 103,
          pt_name: demoTrainers[1].name,
          member_name: demoMembers[2].name,
        },
      ],
      ...ptDemoData(),
      overview: {
        subscriptions: [
          {
            id: 501,
            name: "Gym 3 tháng",
            category: "GYM",
            starts_on: daysFromNow(-28),
            ends_on: daysFromNow(62),
          },
        ],
        trainers: [demoTrainers[0]],
      },
    }),
  );
}
