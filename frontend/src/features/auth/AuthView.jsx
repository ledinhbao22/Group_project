import React, { useState } from "react";
import { useAuth } from "./useAuth.js";
import {
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
  Dumbbell,
  Mail,
  Users,
  LockKeyhole,
  User,
  Phone,
  Check,
  UploadCloud,
  X,
  MapPin,
  Clock,
  Sparkles,
} from "lucide-react";
import "./auth.css";

const ZONES = [
  {
    badge: "KHÔNG GIAN #01",
    title: "Phòng Gym & Thể Hình",
    desc: "Hệ thống máy khối cao cấp, sàn nâng Free Weights thi đấu, tạ đĩa và thanh đòn chuẩn quốc tế.",
    main: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80",
    inset1: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=800&q=80",
    inset2: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80",
  },
  {
    badge: "KHÔNG GIAN #02",
    title: "Studio Yoga & Thiền",
    desc: "Không gian sàn gỗ tự nhiên thanh tịnh, thảm tập cao cấp, ánh sáng ấm áp nuôi dưỡng dẻo dai và tâm trí.",
    main: "https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&w=1200&q=80",
    inset1: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80",
    inset2: "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=800&q=80",
  },
  {
    badge: "KHÔNG GIAN #03",
    title: "Võ Đài Boxing & Đối Kháng",
    desc: "Sàn đấu đối kháng đạt chuẩn, hệ thống bao cát đa cự ly, trang bị bảo hộ hoàn chỉnh bứt phá phản xạ.",
    main: "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?auto=format&fit=crop&w=1200&q=80",
    inset1: "https://images.unsplash.com/photo-1552072805-2a9039d00e57?auto=format&fit=crop&w=800&q=80",
    inset2: "https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?auto=format&fit=crop&w=800&q=80",
  },
];

export function AuthView({ onLogin, onDemo }) {
  const {
    cv,
    setCv,
    mode,
    busy,
    error,
    message,
    visible,
    setVisible,
    confirm,
    setConfirm,
    form,
    patch,
    changeMode,
    submit,
    resend,
    titles,
    descriptions,
  } = useAuth(onLogin);

  const [activeZone, setActiveZone] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  // If there's an error, success message, or special mode (verify/forgot/reset), keep modal open
  const isSpecialMode = !["login", "register"].includes(mode);
  const showModal = modalOpen || isSpecialMode || Boolean(error) || Boolean(message);

  function openAuth(targetMode) {
    changeMode(targetMode);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    if (isSpecialMode) {
      changeMode("login");
    }
  }

  const currentZone = ZONES[activeZone] || ZONES[0];

  return (
    <div className="og-editorial-root">
      {/* ====================================================================
          HEADER: SPORT-EDITORIAL NAVIGATION
          ==================================================================== */}
      <header className="og-ed-header">
        <a
          href="/"
          className="og-ed-brand"
          onClick={(e) => {
            e.preventDefault();
            closeModal();
          }}
        >
          <div className="og-ed-brand-title">
            OPTIGYM
          </div>
        </a>

        <nav className="og-ed-nav" aria-label="Điều hướng chính">
          <a href="#spaces" className="active">
            HỆ THỐNG PHÒNG TẬP
          </a>
          <a href="#about">VỀ CHÚNG TÔI</a>
        </nav>

        <div className="og-ed-auth-cta">
          <button
            type="button"
            className="og-ed-btn-ghost"
            onClick={() => openAuth("login")}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            className="og-ed-btn-volt"
            onClick={() => openAuth("register")}
          >
            <span>Đăng ký</span>
            <span>↗</span>
          </button>
        </div>
      </header>

      {/* ====================================================================
          HERO SECTION: REPLICATING THE MUGA ZERO / NIKE EDITORIAL COMPOSITION
          ==================================================================== */}
      <section className="og-ed-hero">
        {/* Left Column: Headlines & Call to Actions */}
        <div className="og-ed-hero-left">
          <div>
            <div className="og-ed-hero-tag">
              <span className="star-icon">✦</span>
              <span>ENGINEERED FOR MOTION. DESIGNED TO OUTLAST.</span>
            </div>

            <h1 className="og-ed-hero-headline">
              OPTI<br />
              <span className="zero-mark">GYM</span>
            </h1>

            <p className="og-ed-hero-subtext">
              PERFORMANCE GYM SYSTEMS.<br />
              BUILT FOR NOW.<br />
              READY FOR NEXT.
            </p>

            <button
              type="button"
              className="og-ed-explore-btn"
              onClick={() => openAuth("register")}
            >
              <span>KHÁM PHÁ SS—26</span>
              <span className="arrow">↗</span>
            </button>
          </div>

          <div className="og-ed-barcode-strip">
            <svg className="og-ed-barcode-svg" viewBox="0 0 100 40" aria-hidden="true">
              <rect x="0" y="0" width="3" height="40" fill="#0A0A0A" />
              <rect x="6" y="0" width="2" height="40" fill="#0A0A0A" />
              <rect x="12" y="0" width="5" height="40" fill="#0A0A0A" />
              <rect x="20" y="0" width="2" height="40" fill="#0A0A0A" />
              <rect x="25" y="0" width="4" height="40" fill="#0A0A0A" />
              <rect x="32" y="0" width="1" height="40" fill="#0A0A0A" />
              <rect x="36" y="0" width="6" height="40" fill="#0A0A0A" />
              <rect x="45" y="0" width="2" height="40" fill="#0A0A0A" />
              <rect x="50" y="0" width="4" height="40" fill="#0A0A0A" />
              <rect x="58" y="0" width="3" height="40" fill="#0A0A0A" />
              <rect x="64" y="0" width="1" height="40" fill="#0A0A0A" />
              <rect x="68" y="0" width="5" height="40" fill="#0A0A0A" />
              <rect x="76" y="0" width="2" height="40" fill="#0A0A0A" />
              <rect x="82" y="0" width="4" height="40" fill="#0A0A0A" />
              <rect x="89" y="0" width="2" height="40" fill="#0A0A0A" />
              <rect x="94" y="0" width="4" height="40" fill="#0A0A0A" />
            </svg>
            <div>
              <span>OPTIGYM PROTOCOL // 26-01</span>
              <br />
              <span>FLAGSHIP HUB &bull; DISTRICT 01</span>
            </div>
          </div>
        </div>

        {/* Right Column: Layered Editorial Photo Collage */}
        <div className="og-ed-hero-right">
          <div className="og-ed-main-photo-frame">
            <div className="crop-handle crop-tl" />
            <div className="crop-handle crop-tr" />
            <div className="crop-handle crop-bl" />
            <div className="crop-handle crop-br" />
            <div className="frame-label">FRAME_25A</div>
            <img
              src={currentZone.main}
              alt="OptiGym Athlete Training"
              loading="eager"
            />
          </div>

          <div className="og-ed-vertical-coords" aria-hidden="true">
            10.7769° N &bull; 106.6908° E // FLAGSHIP_01
          </div>

          <div className="og-ed-inset-photo-1">
            <img src={currentZone.inset1} alt="Runner" loading="lazy" />
          </div>

          <div className="og-ed-inset-photo-2">
            <img src={currentZone.inset2} alt="Intensity" loading="lazy" />
          </div>

          <div className="og-ed-volt-sticker">
            <svg
              className="og-ed-sticker-wireframe"
              viewBox="0 0 100 60"
              fill="none"
              stroke="#000"
              strokeWidth="1.2"
              aria-hidden="true"
            >
              <ellipse cx="50" cy="30" rx="45" ry="24" />
              <ellipse cx="50" cy="30" rx="28" ry="14" />
              <path d="M5 30 C 5 16, 95 16, 95 30" />
              <path d="M5 30 C 5 44, 95 44, 95 30" />
              <path d="M22 18 C 36 30, 64 30, 78 18" />
              <path d="M22 42 C 36 30, 64 30, 78 42" />
              <line x1="50" y1="6" x2="50" y2="54" />
            </svg>
            <div className="og-ed-sticker-text">
              BUILT ON DISCIPLINE.<br />
              DEFINED BY MOVEMENT.
            </div>
            <div className="og-ed-sticker-barcode">
              <svg height="18" viewBox="0 0 120 18" aria-hidden="true">
                <rect x="0" y="0" width="2" height="18" fill="#000" />
                <rect x="4" y="0" width="3" height="18" fill="#000" />
                <rect x="10" y="0" width="1" height="18" fill="#000" />
                <rect x="14" y="0" width="4" height="18" fill="#000" />
                <rect x="22" y="0" width="2" height="18" fill="#000" />
                <rect x="27" y="0" width="5" height="18" fill="#000" />
                <rect x="35" y="0" width="2" height="18" fill="#000" />
                <rect x="40" y="0" width="3" height="18" fill="#000" />
                <rect x="46" y="0" width="1" height="18" fill="#000" />
                <rect x="50" y="0" width="4" height="18" fill="#000" />
                <rect x="58" y="0" width="2" height="18" fill="#000" />
                <rect x="63" y="0" width="6" height="18" fill="#000" />
                <rect x="72" y="0" width="2" height="18" fill="#000" />
                <rect x="78" y="0" width="3" height="18" fill="#000" />
                <rect x="84" y="0" width="5" height="18" fill="#000" />
                <rect x="92" y="0" width="2" height="18" fill="#000" />
                <rect x="98" y="0" width="4" height="18" fill="#000" />
                <rect x="105" y="0" width="2" height="18" fill="#000" />
                <rect x="110" y="0" width="3" height="18" fill="#000" />
              </svg>
              <span>MT-08/26 // OPTIGYM</span>
            </div>
          </div>

          <div className="og-ed-system-ready">
            <span>SYSTEM READY</span>
            <span>✦</span>
          </div>
        </div>
      </section>

      {/* ====================================================================
          INTERACTIVE SPACE EXPLORER (3 ZONES)
          ==================================================================== */}
      <section className="og-ed-facilities" id="spaces">
        <div className="og-ed-facilities-top">
          <div className="og-ed-label">
            <Sparkles size={16} />
            <span>HỆ THỐNG KHÔNG GIAN TẬP LUYỆN CHUYÊN SÂU</span>
          </div>
          <div className="og-ed-zone-tabs" role="tablist">
            {ZONES.map((z, idx) => (
              <button
                key={z.title}
                type="button"
                role="tab"
                aria-selected={activeZone === idx}
                className={`og-ed-zone-tab ${activeZone === idx ? "active" : ""}`}
                onClick={() => setActiveZone(idx)}
              >
                ZONE 0{idx + 1}: {z.title.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="og-ed-zone-grid">
          {ZONES.map((z, idx) => (
            <div
              key={z.title}
              className={`og-ed-zone-card ${activeZone === idx ? "highlight" : ""}`}
              onClick={() => setActiveZone(idx)}
            >
              <div className="og-ed-zone-media">
                <span className="og-ed-zone-badge">{z.badge}</span>
                <img src={z.main} alt={z.title} loading="lazy" />
              </div>
              <div className="og-ed-zone-info">
                <div className="og-ed-zone-title">{z.title}</div>
                <p className="og-ed-zone-desc">{z.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ====================================================================
          FOOTER & ABOUT US
          ==================================================================== */}
      <footer className="og-ed-footer" id="about">
        <div className="og-ed-footer-grid">
          <div className="og-ed-footer-col">
            <h3>Về Chúng Tôi</h3>
            <p>
              OptiGym là nền tảng quản trị và trải nghiệm thể hình thế hệ mới,
              kết hợp kiến trúc tập luyện chuẩn vận động viên với hệ thống theo
              dõi tiến độ số hóa thông minh.
            </p>
            <p>
              Không thỏa hiệp với sự tầm thường — mỗi buổi tập là một bước tiến có
              đo lường và định lượng chính xác.
            </p>
          </div>

          <div className="og-ed-footer-col">
            <h3>Vị Trí & Liên Hệ</h3>
            <ul className="og-ed-footer-list">
              <li>
                <MapPin size={16} />
                <span>
                  <strong>TRỤ SỞ:</strong> 128 Nguyễn Trãi, P. Bến Thành, Quận 1,
                  TP. Hồ Chí Minh
                </span>
              </li>
              <li>
                <Phone size={16} />
                <span>
                  <strong>HOTLINE:</strong> +84 (0) 909 888 222
                </span>
              </li>
              <li>
                <Mail size={16} />
                <span>
                  <strong>EMAIL:</strong> contact@optigym.vn
                </span>
              </li>
              <li>
                <Clock size={16} />
                <span>
                  <strong>GIỜ MỞ CỬA:</strong> 05:30 — 23:00 (Thứ 2 — CN)
                </span>
              </li>
            </ul>
          </div>

          <div className="og-ed-footer-col">
            <h3>Dịch Vụ Huấn Luyện</h3>
            <ul className="og-ed-footer-list">
              <li>1-on-1 PT Coaching (CSCS Certified)</li>
              <li>InBody 770 Body Composition Audit</li>
              <li>Periodized Strength Programming</li>
              <li>Dinh dưỡng thể thao chuyên sâu</li>
            </ul>
          </div>

          <div className="og-ed-footer-col">
            <h3>Thành Viên</h3>
            <p>
              Tham gia cộng đồng OptiGym để nhận thẻ thành viên điện tử và truy cập
              hệ thống phòng tập không giới hạn.
            </p>
            <button
              type="button"
              className="og-ed-btn-volt"
              style={{ width: "100%", justifyContent: "center", marginTop: 10 }}
              onClick={() => openAuth("register")}
            >
              GIA NHẬP NGAY ↗
            </button>


          </div>
        </div>

        <div className="og-ed-footer-bottom">
          <div>&copy; 2026 OPTIGYM SYSTEMS. ALL RIGHTS RESERVED.</div>
          <div>LAT 10.7769° N &bull; LON 106.6908° E // ISO 9001:2015 CERTIFIED</div>
        </div>
      </footer>

      {/* ====================================================================
          RESPONSIVE AUTH OVERLAY
          - Desktop (>= 900px): Split-screen Editorial Modal (Nike Member Style)
          - Mobile (< 900px): Slide-up Touch Bottom Drawer
          ==================================================================== */}
      {showModal && (
        <div
          className="og-ed-auth-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            className="og-ed-auth-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Xác thực người dùng"
          >
            {/* Mobile Drag Indicator */}
            <div className="og-ed-drawer-handle" onClick={closeModal} />

            {/* Close Button */}
            <button
              type="button"
              className="og-ed-modal-close"
              onClick={closeModal}
              title="Đóng cửa sổ"
            >
              <X size={18} />
            </button>

            {/* Left Column (Desktop Only): Athletic Poster */}
            <div className="og-ed-poster-col">
              <img
                className="og-ed-poster-bg"
                src="https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=800&q=80"
                alt=""
              />
              <div className="og-ed-poster-content">
                <div>
                  <div className="og-ed-poster-tag">
                    <span>✦</span>
                    <span>
                      {mode === "register"
                        ? "NEW ATHLETE REGISTRATION"
                        : "MEMBER ACCESS GATE"}
                    </span>
                  </div>
                  <div className="og-ed-poster-title">
                    UNLEASH<br />
                    <span>POTENTIAL.</span>
                  </div>
                </div>
                <div>
                  <div className="og-ed-poster-quote">
                    "Kỷ luật không phải là sự giới hạn, đó là chìa khóa mở ra tiềm
                    năng tối thượng của cơ thể bạn."
                  </div>
                  <div className="og-ed-poster-stamp">
                    <span>AUTH_ID // OG-8829</span>
                    <span>SECURED SESSION</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Form Panel */}
            <div className="og-ed-form-col">
              {/* Tabs for Login / Register */}
              {["login", "register"].includes(mode) && (
                <div
                  className="og-ed-auth-tabs"
                  role="tablist"
                  aria-label="Chọn đăng nhập hoặc đăng ký"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === "login"}
                    className={`og-ed-tab-btn ${mode === "login" ? "active" : ""}`}
                    onClick={() => changeMode("login")}
                    disabled={busy}
                  >
                    Đăng nhập
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === "register"}
                    className={`og-ed-tab-btn ${mode === "register" ? "active" : ""}`}
                    onClick={() => changeMode("register")}
                    disabled={busy}
                  >
                    Đăng ký
                  </button>
                </div>
              )}

              {/* Headings */}
              <div className="og-ed-form-heading">
                <h2>{titles[mode]}</h2>
                <p>{descriptions[mode]}</p>
              </div>

              {/* Error & Success Alerts */}
              {error && (
                <div className="og-ed-alert error" role="alert">
                  {error}
                </div>
              )}
              {message && (
                <div className="og-ed-alert success" role="status">
                  {message}
                </div>
              )}

              {/* Form Element */}
              <form
                key={mode}
                onSubmit={submit}
                className="og-ed-form"
                aria-busy={busy}
              >
                {/* REGISTER: ROLE SELECTION (HỘI VIÊN VS HUẤN LUYỆN VIÊN PT) */}
                {mode === "register" && (
                  <>
                    <div style={{ marginBottom: 16 }}>
                      <div
                        style={{
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          color: "#64748b",
                          marginBottom: 8,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        Chọn vai trò đăng ký:
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 10,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => patch("role", "MEMBER")}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "flex-start",
                            padding: "10px 14px",
                            borderRadius: 8,
                            border:
                              form.role === "MEMBER"
                                ? "2px solid #0f172a"
                                : "1px solid #e2e8f0",
                            background:
                              form.role === "MEMBER"
                                ? "rgba(204, 255, 0, 0.12)"
                                : "#ffffff",
                            cursor: "pointer",
                            textAlign: "left",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              width: "100%",
                              justifyContent: "space-between",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <Dumbbell size={16} color="#0f172a" />
                              <span
                                style={{
                                  fontSize: "0.88rem",
                                  fontWeight: 800,
                                  color: "#0f172a",
                                }}
                              >
                                Hội viên
                              </span>
                            </div>
                            {form.role === "MEMBER" && (
                              <span
                                style={{
                                  width: 18,
                                  height: 18,
                                  borderRadius: "50%",
                                  background: "#0f172a",
                                  color: "#ccff00",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "0.65rem",
                                  fontWeight: 900,
                                }}
                              >
                                ✓
                              </span>
                            )}
                          </div>
                          <span
                            style={{
                              fontSize: "0.74rem",
                              color: "#64748b",
                              marginTop: 4,
                            }}
                          >
                            Tập luyện cùng OptiGym
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => patch("role", "PT")}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "flex-start",
                            padding: "10px 14px",
                            borderRadius: 8,
                            border:
                              form.role === "PT"
                                ? "2px solid #0f172a"
                                : "1px solid #e2e8f0",
                            background:
                              form.role === "PT"
                                ? "rgba(204, 255, 0, 0.12)"
                                : "#ffffff",
                            cursor: "pointer",
                            textAlign: "left",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              width: "100%",
                              justifyContent: "space-between",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <Users size={16} color="#0f172a" />
                              <span
                                style={{
                                  fontSize: "0.88rem",
                                  fontWeight: 800,
                                  color: "#0f172a",
                                }}
                              >
                                Huấn luyện viên PT
                              </span>
                            </div>
                            {form.role === "PT" && (
                              <span
                                style={{
                                  width: 18,
                                  height: 18,
                                  borderRadius: "50%",
                                  background: "#0f172a",
                                  color: "#ccff00",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "0.65rem",
                                  fontWeight: 900,
                                }}
                              >
                                ✓
                              </span>
                            )}
                          </div>
                          <span
                            style={{
                              fontSize: "0.74rem",
                              color: "#64748b",
                              marginTop: 4,
                            }}
                          >
                            Đăng ký HLV chuyên nghiệp
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* PT ONLY: CHUYÊN MÔN HUẤN LUYỆN */}
                    {form.role === "PT" && (
                      <div style={{ marginBottom: 14 }}>
                        <span
                          style={{
                            fontSize: "0.82rem",
                            fontWeight: 600,
                            color: "#334155",
                            display: "block",
                            marginBottom: 6,
                          }}
                        >
                          Chuyên môn huấn luyện *
                        </span>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(3, 1fr)",
                            gap: 8,
                          }}
                        >
                          {[
                            { id: "GYM", label: "Gym & Thể hình" },
                            { id: "YOGA", label: "Yoga & Pilates" },
                            { id: "BOXING", label: "Boxing & Combat" },
                          ].map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => patch("specialty", s.id)}
                              style={{
                                padding: "8px 10px",
                                borderRadius: 6,
                                fontSize: "0.8rem",
                                fontWeight: 700,
                                cursor: "pointer",
                                border:
                                  form.specialty === s.id
                                    ? "2px solid #0f172a"
                                    : "1px solid #cbd5e1",
                                background:
                                  form.specialty === s.id ? "#0f172a" : "#f8fafc",
                                color:
                                  form.specialty === s.id ? "#ffffff" : "#334155",
                                transition: "all 0.15s ease",
                              }}
                            >
                              {s.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* PT ONLY: TẢI LÊN CV / HỒ SƠ */}
                    {form.role === "PT" && (
                      <div style={{ marginBottom: 16 }}>
                        <span
                          style={{
                            fontSize: "0.82rem",
                            fontWeight: 600,
                            color: "#334155",
                            display: "block",
                            marginBottom: 6,
                          }}
                        >
                          Hồ sơ năng lực / CV (PDF, DOC, DOCX tối đa 5MB) *
                        </span>
                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "10px 14px",
                            borderRadius: 6,
                            border: cv ? "1.5px solid #16a34a" : "1.5px dashed #94a3b8",
                            background: cv ? "#f0fdf4" : "#f8fafc",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <UploadCloud size={18} color={cv ? "#16a34a" : "#64748b"} />
                            <div>
                              <div
                                style={{
                                  fontSize: "0.82rem",
                                  fontWeight: 700,
                                  color: cv ? "#15803d" : "#0f172a",
                                }}
                              >
                                {cv ? cv.name : "Nhấp để chọn tệp CV của bạn"}
                              </div>
                              <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                                {cv
                                  ? `${(cv.size / 1024 / 1024).toFixed(2)} MB - Đã chọn`
                                  : "Hỗ trợ tệp định dạng .pdf, .doc, .docx"}
                              </div>
                            </div>
                          </div>
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx"
                            style={{ display: "none" }}
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                setCv(e.target.files[0]);
                              }
                            }}
                          />
                          <span
                            style={{
                              fontSize: "0.76rem",
                              fontWeight: 700,
                              padding: "4px 8px",
                              borderRadius: 4,
                              background: cv ? "#16a34a" : "#0f172a",
                              color: "#ffffff",
                            }}
                          >
                            {cv ? "Đổi tệp" : "Tải lên"}
                          </span>
                        </label>
                      </div>
                    )}

                    {/* NAME & PHONE */}
                    <div className="og-ed-row">
                      <label className="og-ed-field">
                        <span>Họ và tên *</span>
                        <div className="og-ed-input-wrap">
                          <User size={16} />
                          <input
                            required
                            minLength={2}
                            maxLength={120}
                            autoComplete="name"
                            placeholder="Nguyễn Minh Anh"
                            value={form.name}
                            onChange={(e) => patch("name", e.target.value)}
                          />
                        </div>
                      </label>

                      <label className="og-ed-field">
                        <span>Điện thoại (tùy chọn)</span>
                        <div className="og-ed-input-wrap">
                          <Phone size={16} />
                          <input
                            type="tel"
                            maxLength={30}
                            autoComplete="tel"
                            placeholder="09xx xxx xxx"
                            value={form.phone}
                            onChange={(e) => patch("phone", e.target.value)}
                          />
                        </div>
                      </label>
                    </div>
                  </>
                )}

                {/* COMMON: EMAIL */}
                <label className="og-ed-field">
                  <span>Địa chỉ Email *</span>
                  <div className="og-ed-input-wrap">
                    <Mail size={16} />
                    <input
                      type="email"
                      required
                      maxLength={255}
                      autoComplete="email"
                      value={form.email}
                      onChange={(e) => patch("email", e.target.value)}
                      placeholder="ban@example.com"
                      readOnly={["reset-code", "reset"].includes(mode)}
                    />
                  </div>
                </label>

                {/* OTP CODE FOR VERIFY / RESET-CODE */}
                {["verify", "reset-code"].includes(mode) && (
                  <label className="og-ed-field">
                    <span>Mã xác thực 6 số *</span>
                    <div className="og-ed-input-wrap">
                      <ShieldCheck size={16} />
                      <input
                        required
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        pattern="[0-9]{6}"
                        maxLength={6}
                        value={form.code}
                        onChange={(e) =>
                          patch("code", e.target.value.replace(/\D/g, ""))
                        }
                        placeholder="6 chữ số OTP"
                      />
                    </div>
                  </label>
                )}

                {/* PASSWORDS */}
                {["login", "register", "reset"].includes(mode) && (
                  <>
                    <label className="og-ed-field">
                      <span>{mode === "reset" ? "Mật khẩu mới *" : "Mật khẩu *"}</span>
                      <div className="og-ed-input-wrap">
                        <LockKeyhole size={16} />
                        <input
                          required
                          type={visible ? "text" : "password"}
                          minLength={mode === "login" ? 1 : 6}
                          maxLength={128}
                          placeholder={
                            mode === "login"
                              ? "Nhập mật khẩu của bạn"
                              : "Tối thiểu 6 ký tự"
                          }
                          autoComplete={
                            mode === "login" ? "current-password" : "new-password"
                          }
                          value={form.password}
                          onChange={(e) => patch("password", e.target.value)}
                        />
                        <button
                          type="button"
                          className="og-ed-pwd-toggle"
                          onClick={() => setVisible(!visible)}
                          aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                        >
                          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </label>

                    {["register", "reset"].includes(mode) && (
                      <label className="og-ed-field">
                        <span>
                          {mode === "reset"
                            ? "Nhập lại mật khẩu mới *"
                            : "Nhập lại mật khẩu *"}
                        </span>
                        <div className="og-ed-input-wrap">
                          <LockKeyhole size={16} />
                          <input
                            type={visible ? "text" : "password"}
                            required
                            minLength={6}
                            maxLength={128}
                            autoComplete="new-password"
                            placeholder="Nhập lại mật khẩu"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                          />
                          <button
                            type="button"
                            className="og-ed-pwd-toggle"
                            onClick={() => setVisible(!visible)}
                            tabIndex={-1}
                            aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                          >
                            {visible ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </label>
                    )}
                  </>
                )}

                {/* LOGIN: FORGOT PASSWORD */}
                {mode === "login" && (
                  <div style={{ textAlign: "right", marginTop: -4, marginBottom: 16 }}>
                    <button
                      type="button"
                      className="og-ed-inline-link"
                      onClick={() => changeMode("forgot")}
                    >
                      Quên mật khẩu?
                    </button>
                  </div>
                )}

                {/* SUBMIT BUTTON */}
                <button
                  type="submit"
                  disabled={busy}
                  className="og-ed-submit-btn"
                >
                  <span>
                    {busy
                      ? "Đang xử lý..."
                      : {
                          login: "Đăng nhập",
                          register: "Tạo tài khoản",
                          verify: "Xác thực email",
                          forgot: "Gửi mã xác thực",
                          reset: "Đổi mật khẩu",
                          "reset-code": "Xác thực mã",
                        }[mode]}
                  </span>
                  <ArrowRight size={18} />
                </button>
              </form>

              {/* AUXILIARY LINKS */}
              <div className="og-ed-aux-links">
                {mode === "verify" && (
                  <button
                    type="button"
                    className="og-ed-inline-link"
                    disabled={busy}
                    onClick={resend}
                  >
                    Gửi lại mã xác thực
                  </button>
                )}
                {["reset", "reset-code"].includes(mode) && (
                  <button
                    type="button"
                    className="og-ed-inline-link"
                    onClick={() => changeMode("forgot")}
                  >
                    Yêu cầu mã mới
                  </button>
                )}
                {!["login", "register"].includes(mode) && (
                  <button
                    type="button"
                    className="og-ed-inline-link"
                    onClick={() => changeMode("login")}
                  >
                    Quay lại đăng nhập
                  </button>
                )}
                {mode === "login" && (
                  <button
                    type="button"
                    className="og-ed-inline-link"
                    onClick={() => changeMode("verify")}
                  >
                    Xác thực email đã đăng ký
                  </button>
                )}
                <div className="og-ed-terms-note">
                  Bằng việc tham gia, bạn đồng ý với Điều khoản Dịch vụ và Chính sách Bảo mật của OptiGym.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
