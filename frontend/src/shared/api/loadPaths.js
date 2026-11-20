export const loadPaths = {
  ADMIN: {
    classes: "/classes",
    rooms: "/rooms",
    checkins: "/checkins",
    equipment: "/admin/equipment",
    orders: "/orders",
    members: "/admin/users?role=MEMBER",
    trainers: "/admin/users?role=PT",
    packages: "/admin/packages",
  },
  PT: {
    classes: "/classes",
    rooms: "/rooms",
  },
  MEMBER: {},
};
