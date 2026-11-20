import React from "react";
import { renderToString } from "react-dom/server";
import { AuthView } from "../src/features/auth/AuthView.jsx";
import { AdminWorkspace } from "../src/features/admin/layout/AdminWorkspace.jsx";
import { PtWorkspace } from "../src/features/pt/PtWorkspace.jsx";
import { MemberWorkspace } from "../src/features/member/experience/MemberWorkspace.jsx";
import { SettingsView } from "../src/features/account/SettingsView.jsx";
import { AdminUsersView } from "../src/features/admin/AdminUsersView.jsx";
import { AdminEquipmentView } from "../src/features/admin/AdminEquipmentView.jsx";
import { AdminPackagesView } from "../src/features/admin/AdminPackagesView.jsx";
import { AdminPromotionsView } from "../src/features/admin/AdminPromotionsView.jsx";
import { AdminDashboardView } from "../src/features/admin/AdminDashboardView.jsx";
import { AdminInvoicesView } from "../src/features/admin/AdminInvoicesView.jsx";
import { AdminScheduleView } from "../src/features/admin/AdminScheduleView.jsx";
import { AdminAttendanceView } from "../src/features/admin/AdminAttendanceView.jsx";
import { AdminHeatmapView } from "../src/features/admin/AdminHeatmapView.jsx";
import { AdminReportsView } from "../src/features/admin/AdminReportsView.jsx";
import { freshDemoData } from "../src/shared/demo/freshDemoData.js";
import { demoAccounts } from "../src/shared/demo/accounts.js";

const demoCtx = {
  user: { ...demoAccounts.ADMIN },
  data: freshDemoData(),
  setData: () => {},
  updateUser: () => {},
  go: () => {},
  flash: () => {},
  api: async () => ({}),
  reload: () => {},
};

const memberCtx = {
  ...demoCtx,
  user: { id: 101, name: "Nguyễn Khánh Linh", email: "linh@example.test", role: "MEMBER", member_code: "OG-00000101" },
};

const views = [
  ["AuthView", <AuthView onLogin={() => {}} onDemo={() => {}} />],
  ["AdminWorkspace", <AdminWorkspace ctx={demoCtx} page="home" logout={() => {}} loading={false} loadErrors={[]} toast="" setToast={() => {}} />],
  ["PtWorkspace", <PtWorkspace ctx={{ ...demoCtx, user: { id: 201, name: "Lê Quốc Bảo", email: "bao@example.test", role: "PT", specialty: "GYM", demo: true } }} page="home" logout={() => {}} toast="" setToast={() => {}} />],
  ["MemberWorkspace:home", <MemberWorkspace ctx={memberCtx} page="home" logout={() => {}} loading={false} toast="" setToast={() => {}} />],
  ["MemberWorkspace:workout", <MemberWorkspace ctx={memberCtx} page="workout" logout={() => {}} loading={false} toast="" setToast={() => {}} />],
  ["MemberWorkspace:schedule", <MemberWorkspace ctx={memberCtx} page="schedule" logout={() => {}} loading={false} toast="" setToast={() => {}} />],
  ["MemberWorkspace:trainers", <MemberWorkspace ctx={memberCtx} page="trainers" logout={() => {}} loading={false} toast="" setToast={() => {}} />],
  ["MemberWorkspace:progress", <MemberWorkspace ctx={memberCtx} page="progress" logout={() => {}} loading={false} toast="" setToast={() => {}} />],
  ["MemberWorkspace:membership", <MemberWorkspace ctx={memberCtx} page="membership" logout={() => {}} loading={false} toast="" setToast={() => {}} />],
  ["MemberWorkspace:notifications", <MemberWorkspace ctx={memberCtx} page="notifications" logout={() => {}} loading={false} toast="" setToast={() => {}} />],
  ["MemberWorkspace:settings", <MemberWorkspace ctx={memberCtx} page="settings" logout={() => {}} loading={false} toast="" setToast={() => {}} />],
  ["AdminUsersView", <AdminUsersView ctx={demoCtx} initialRoleFilter="ALL" />],
  ["AdminEquipmentView", <AdminEquipmentView ctx={demoCtx} />],
  ["AdminPackagesView", <AdminPackagesView ctx={demoCtx} />],
  ["AdminPromotionsView", <AdminPromotionsView ctx={demoCtx} />],
  ["AdminDashboardView", <AdminDashboardView ctx={demoCtx} />],
  ["AdminInvoicesView", <AdminInvoicesView ctx={demoCtx} />],
  ["AdminScheduleView", <AdminScheduleView ctx={demoCtx} />],
  ["AdminAttendanceView", <AdminAttendanceView ctx={demoCtx} />],
  ["AdminHeatmapView", <AdminHeatmapView ctx={demoCtx} />],
  ["AdminReportsView", <AdminReportsView ctx={demoCtx} />],
  ["SettingsView", <SettingsView ctx={demoCtx} />],
];

for (const [name, el] of views) {
  const html = renderToString(el);
  if (!html || html.length < 20) {
    throw new Error(`SSR render check failed for ${name}`);
  }
  console.log(`SSR OK: ${name} (${html.length} bytes)`);
}
