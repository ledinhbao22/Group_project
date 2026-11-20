import { emptyClubData } from "./clubData.js";
export function freshRealData() {
  return {
    ...emptyClubData(),
    members: [],
    trainers: [],
    staff: [],
    packages: [],
    assignments: [],
    clients: [],
    overview: {
      subscriptions: [],
      trainers: [],
    },
  };
}
