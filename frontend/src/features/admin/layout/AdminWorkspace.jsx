import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  Clock,
  UserCheck,
  Calendar,
  Receipt,
  Dumbbell,
  Tag,
  ShieldCheck,
  Settings,
  TrendingUp,
  Search,
  Radio,
  LogOut,
  CalendarDays,
  Menu,
  X,
  Package,
  Flame,
  CheckCircle2,
  RefreshCw,
  Wrench,
} from "lucide-react";
import "../admin-figma.css";
import { AdminDashboardView } from "../AdminDashboardView.jsx";
import { AdminReportsView } from "../AdminReportsView.jsx";
import { AdminHeatmapView } from "../AdminHeatmapView.jsx";
import { PagesView } from "../../../app/PagesView.jsx";
import { Loading } from "../../../shared/ui/Loading.jsx";
import { initials } from "../../../shared/lib/format.js";

export function AdminWorkspace({
  ctx,
  page,
  logout,
  loading,
  loadErrors,
  toast,
  setToast,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [reportTab, setReportTab] = useState("members");
  const [reportPeriod, setReportPeriod] = useState("week");

  const todayStr = new Date().toLocaleDateString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
  });

  const getPageTitle = () => {
    switch (page) {
      case "home":
      case "dashboard":
        return { title: "Bảng điều khiển", icon: LayoutDashboard };
      case "members":
        return { title: "Quản lý hội viên", icon: Users };
      case "checkin":
        return { title: "Điểm danh & Check-in", icon: Clock };
      case "staff":
      case "trainers":
        return { title: "Quản lý nhân sự & HLV", icon: UserCheck };
      case "schedule":
        return { title: "Lịch tập & Lớp học", icon: Calendar };
      case "billing":
      case "revenue":
        return { title: "Hóa đơn & Doanh thu", icon: Receipt };
      case "packages":
        return { title: "Quản lý gói tập", icon: Dumbbell };
      case "sales":
        return { title: "Chương trình ưu đãi", icon: Tag };
      case "assignments":
        return { title: "Vai trò & phân quyền", icon: ShieldCheck };
      case "equipment":
        return { title: "Thiết bị & Phòng tập", icon: Wrench };
      case "settings":
        return { title: "Cài đặt hệ thống", icon: Settings };
      case "heatmap":
        return { title: "Mật độ phòng tập (Heatmap)", icon: Flame };
      case "reports":
        return { title: "Báo cáo & phân tích", icon: TrendingUp };
      default:
        return { title: "Bảng điều khiển", icon: LayoutDashboard };
    }
  };

  const { title: currentTitle, icon: CurrentIcon } = getPageTitle();

  const handleNavClick = (targetPage, options = {}) => {
    setSidebarOpen(false);
    if (options?.tab) {
      setReportTab(options.tab);
    }
    if (options?.period) {
      setReportPeriod(options.period);
    }
    const destination = options?.tab ? "reports" : targetPage;
    if (ctx.go) {
      ctx.go(destination);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const normalizedSearch = searchQuery.trim().toLocaleLowerCase("vi");
  const showNav = (label) =>
    !normalizedSearch || label.toLocaleLowerCase("vi").includes(normalizedSearch);

  return (
    <div className="og-admin-root">
      {/* Mobile Drawer Backdrop Overlay */}
      <div
        className={`og-admin-overlay ${sidebarOpen ? "open" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      <div className="og-admin-container">
        {/* Dark Left Sidebar */}
        <aside className={`og-admin-sidebar ${sidebarOpen ? "open" : ""}`}>
          <div className="og-admin-sidebar-header">
            <div className="og-admin-logo" onClick={() => handleNavClick("home")}>
              <div className="og-admin-logo-icon">++</div>
              <span className="og-admin-logo-text">OptiGym</span>
            </div>
            <button
              type="button"
              className="og-admin-hamburger"
              style={{ display: sidebarOpen ? "flex" : "none", color: "#fff" }}
              onClick={() => setSidebarOpen(false)}
            >
              <X size={18} />
            </button>
          </div>

          <div className="og-admin-search-wrapper">
            <div className="og-admin-search-input-box">
              <Search size={14} />
              <input
                type="text"
                className="og-admin-search-input"
                placeholder="Tìm kiếm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="og-admin-nav-body">
            {/* TỔNG QUAN */}
            {showNav("Bảng điều khiển") && (
              <>
                <div className="og-admin-nav-group-title">TỔNG QUAN</div>
                <button
                  type="button"
                  className={`og-admin-nav-item ${page === "home" ? "active" : ""}`}
                  onClick={() => handleNavClick("home")}
                >
                  <LayoutDashboard size={16} />
                  <span>Bảng điều khiển</span>
                </button>
              </>
            )}

            {/* QUẢN LÝ HỘI VIÊN */}
            {(showNav("Hội viên") || showNav("Điểm danh") || showNav("Mật độ phòng (Heatmap)")) && (
              <div className="og-admin-nav-group-title">QUẢN LÝ HỘI VIÊN</div>
            )}
            {showNav("Hội viên") && (
              <button
                type="button"
                className={`og-admin-nav-item ${page === "members" ? "active" : ""}`}
                onClick={() => handleNavClick("members")}
              >
                <Users size={16} />
                <span>Hội viên</span>
              </button>
            )}
            {showNav("Điểm danh") && (
              <button
                type="button"
                className={`og-admin-nav-item ${page === "checkin" ? "active" : ""}`}
                onClick={() => handleNavClick("checkin")}
              >
                <Clock size={16} />
                <span>Điểm danh</span>
              </button>
            )}
            {showNav("Mật độ phòng (Heatmap)") && (
              <button
                type="button"
                className={`og-admin-nav-item ${page === "heatmap" ? "active" : ""}`}
                onClick={() => handleNavClick("heatmap")}
              >
                <Flame size={16} />
                <span>Mật độ phòng (Heatmap)</span>
              </button>
            )}

            {/* QUẢN LÝ NHÂN SỰ */}
            {(showNav("Nhân sự") || showNav("Lịch tập")) && (
              <div className="og-admin-nav-group-title">QUẢN LÝ NHÂN SỰ</div>
            )}
            {showNav("Nhân sự") && (
              <button
                type="button"
                className={`og-admin-nav-item ${page === "trainers" || page === "staff" ? "active" : ""}`}
                onClick={() => handleNavClick("trainers")}
              >
                <UserCheck size={16} />
                <span>Nhân sự</span>
              </button>
            )}
            {showNav("Lịch tập") && (
              <button
                type="button"
                className={`og-admin-nav-item ${page === "schedule" ? "active" : ""}`}
                onClick={() => handleNavClick("schedule")}
              >
                <Calendar size={16} />
                <span>Lịch tập</span>
              </button>
            )}

            {/* TÀI CHÍNH & GÓI TẬP */}
            {(showNav("Hóa đơn") || showNav("Quản lý gói tập")) && (
              <div className="og-admin-nav-group-title">TÀI CHÍNH & GÓI TẬP</div>
            )}
            {showNav("Hóa đơn") && (
              <button
                type="button"
                className={`og-admin-nav-item ${page === "billing" || page === "revenue" ? "active" : ""}`}
                onClick={() => handleNavClick("billing")}
              >
                <Receipt size={16} />
                <span>Hóa đơn</span>
              </button>
            )}
            {showNav("Quản lý gói tập") && (
              <button
                type="button"
                className={`og-admin-nav-item ${page === "packages" ? "active" : ""}`}
                onClick={() => handleNavClick("packages")}
              >
                <Dumbbell size={16} />
                <span>Quản lý gói tập</span>
              </button>
            )}

            {/* QUẢN TRỊ HỆ THỐNG */}
            {(showNav("Thiết bị & Phòng tập") || showNav("Ưu đãi") || showNav("Vai trò & phân quyền") || showNav("Cài đặt") || showNav("Báo cáo & phân tích")) && (
              <div className="og-admin-nav-group-title">QUẢN TRỊ HỆ THỐNG</div>
            )}
            {showNav("Thiết bị & Phòng tập") && (
              <button
                type="button"
                className={`og-admin-nav-item ${page === "equipment" ? "active" : ""}`}
                onClick={() => handleNavClick("equipment")}
              >
                <Wrench size={16} />
                <span>Thiết bị & Phòng tập</span>
              </button>
            )}
            {showNav("Ưu đãi") && (
              <button
                type="button"
                className={`og-admin-nav-item ${page === "sales" ? "active" : ""}`}
                onClick={() => handleNavClick("sales")}
              >
                <Tag size={16} />
                <span>Ưu đãi</span>
              </button>
            )}
            {showNav("Vai trò & phân quyền") && (
              <button
                type="button"
                className={`og-admin-nav-item ${page === "assignments" || page === "users" ? "active" : ""}`}
                onClick={() => handleNavClick("assignments")}
              >
                <ShieldCheck size={16} />
                <span>Vai trò & phân quyền</span>
              </button>
            )}
            {showNav("Cài đặt") && (
              <button
                type="button"
                className={`og-admin-nav-item ${page === "settings" ? "active" : ""}`}
                onClick={() => handleNavClick("settings")}
              >
                <Settings size={16} />
                <span>Cài đặt</span>
              </button>
            )}
            {showNav("Báo cáo & phân tích") && (
              <button
                type="button"
                className={`og-admin-nav-item ${page === "reports" ? "active" : ""}`}
                onClick={() => handleNavClick("reports")}
              >
                <TrendingUp size={16} />
                <span>Báo cáo & phân tích</span>
              </button>
            )}
          </div>
        </aside>

        {/* Right Main Content Area */}
        <main className="og-admin-main">
          {/* Topbar */}
          <div className="og-admin-topbar">
            <div className="og-admin-topbar-left">
              <button
                type="button"
                className="og-admin-hamburger"
                onClick={() => setSidebarOpen(true)}
                title="Mở menu quản trị"
              >
                <Menu size={20} />
              </button>

              <div className="og-admin-page-title">
                <CurrentIcon size={20} color="#0f172a" />
                <span>{currentTitle}</span>
              </div>
            </div>

            <div className="og-admin-topbar-right">
              <button
                type="button"
                className="og-admin-date-btn"
                onClick={() => ctx.flash && ctx.flash(`Bộ lọc ngày: ${todayStr}`)}
              >
                <span>Ngày</span>
                <CalendarDays size={14} color="#64748b" />
              </button>

              <button
                type="button"
                className="og-admin-icon-btn"
                title="Hệ thống truyền thông tin trực tiếp (Live Sync)"
                onClick={() => ctx.flash && ctx.flash("Hệ thống kết nối trực tiếp đang hoạt động ổn định.")}
              >
                <Radio size={16} />
              </button>

              <div
                className="og-admin-profile-pill"
                onClick={() => handleNavClick("settings")}
                title="Xem hồ sơ quản trị viên"
              >
                <div className="og-admin-avatar">
                  {initials(ctx.user?.name)}
                </div>
                <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                  <div
                    className="og-admin-profile-name"
                    style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    title={ctx.user?.name || "Quản trị viên"}
                  >
                    {ctx.user?.name || "Quản trị viên"}
                  </div>
                  <div className="og-admin-profile-role">Quản trị viên</div>
                </div>
              </div>

              <button
                type="button"
                onClick={logout}
                className="og-admin-icon-btn"
                title="Đăng xuất khỏi hệ thống"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>

          {/* View Body */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
            {loadErrors?.length > 0 && (
              <div className="g-load-error" role="alert" style={{ margin: "12px 24px 0" }}>
                <div>
                  <b>Chưa tải được một phần dữ liệu.</b>
                  <p>{loadErrors.map((x) => x.message).join(" / ")}</p>
                </div>
                <button
                  type="button"
                  onClick={ctx.reload}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 6, border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer", fontWeight: 600 }}
                >
                  <RefreshCw size={14} /> Thử lại
                </button>
              </div>
            )}
            {loading ? (
              <Loading />
            ) : page === "home" || page === "dashboard" ? (
              <AdminDashboardView ctx={ctx} onNavigate={handleNavClick} />
            ) : page === "heatmap" ? (
              <AdminHeatmapView ctx={ctx} />
            ) : page === "reports" ? (
              <AdminReportsView
                ctx={ctx}
                onNavigate={handleNavClick}
                initialTab={reportTab}
                initialPeriod={reportPeriod}
              />
            ) : (
              <div style={{ padding: "20px 24px", maxWidth: 1400, width: "100%", margin: "0 auto" }}>
                <PagesView page={page} ctx={ctx} />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Visible on mobile web) */}
      <nav className="og-admin-bottom-nav">
        <button
          type="button"
          className={`og-admin-bottom-nav-btn ${page === "home" ? "active" : ""}`}
          onClick={() => handleNavClick("home")}
        >
          <LayoutDashboard size={18} />
          <span>Tổng quan</span>
        </button>
        <button
          type="button"
          className={`og-admin-bottom-nav-btn ${page === "members" ? "active" : ""}`}
          onClick={() => handleNavClick("members")}
        >
          <Users size={18} />
          <span>Hội viên</span>
        </button>
        <button
          type="button"
          className={`og-admin-bottom-nav-btn ${page === "schedule" ? "active" : ""}`}
          onClick={() => handleNavClick("schedule")}
        >
          <Calendar size={18} />
          <span>Buổi tập</span>
        </button>
        <button
          type="button"
          className={`og-admin-bottom-nav-btn ${page === "packages" ? "active" : ""}`}
          onClick={() => handleNavClick("packages")}
        >
          <Package size={18} />
          <span>Gói tập</span>
        </button>
        <button
          type="button"
          className={`og-admin-bottom-nav-btn ${page === "settings" ? "active" : ""}`}
          onClick={() => handleNavClick("settings")}
        >
          <Settings size={18} />
          <span>Cài đặt</span>
        </button>
      </nav>

      {toast && (
        <div className="g-toast" role="status">
          <CheckCircle2 size={20} />
          <span>{toast}</span>
          <button
            type="button"
            aria-label="Đóng thông báo"
            onClick={() => setToast?.("")}
            style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", display: "inline-flex", padding: 4 }}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
