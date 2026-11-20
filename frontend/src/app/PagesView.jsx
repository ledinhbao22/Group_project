import React from "react";
import { AdminUsersView } from "../features/admin/AdminUsersView.jsx";
import { AdminAttendanceView } from "../features/admin/AdminAttendanceView.jsx";
import { AdminScheduleView } from "../features/admin/AdminScheduleView.jsx";
import { AdminInvoicesView } from "../features/admin/AdminInvoicesView.jsx";
import { AdminPackagesView } from "../features/admin/AdminPackagesView.jsx";
import { AdminPromotionsView } from "../features/admin/AdminPromotionsView.jsx";
import { AdminEquipmentView } from "../features/admin/AdminEquipmentView.jsx";
import { SettingsView } from "../features/account/SettingsView.jsx";

export function PagesView({ page, ctx }) {
  if (page === "members") return <AdminUsersView key="members" ctx={ctx} initialRoleFilter="MEMBER" />;
  if (["trainers", "staff"].includes(page))
    return <AdminUsersView key="trainers" ctx={ctx} initialRoleFilter="PT" />;
  if (["assignments", "users"].includes(page))
    return <AdminUsersView key="all-users" ctx={ctx} initialRoleFilter="ALL" />;
  if (page === "checkin") return <AdminAttendanceView ctx={ctx} />;
  if (page === "packages") return <AdminPackagesView ctx={ctx} />;
  if (page === "equipment") return <AdminEquipmentView ctx={ctx} />;
  if (["billing", "revenue"].includes(page)) return <AdminInvoicesView ctx={ctx} />;
  if (page === "sales") return <AdminPromotionsView ctx={ctx} />;
  if (page === "schedule") return <AdminScheduleView ctx={ctx} />;
  return <SettingsView ctx={ctx} />;
}
