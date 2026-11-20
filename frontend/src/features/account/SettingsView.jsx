import { ShieldCheck, KeyRound } from "lucide-react";
import { PageTitle } from "../../shared/ui/PageTitle.jsx";
import { Section } from "../../shared/ui/Section.jsx";
import { Sample } from "../../shared/ui/Sample.jsx";
import { Avatar } from "../../shared/ui/Avatar.jsx";
import { roleNames } from "../../shared/config/roles.js";
import React, { useState } from "react";
import { Button } from "../../shared/ui/Button.jsx";
import { Field } from "../../shared/ui/Field.jsx";

export function SettingsView({ ctx }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(ctx.user?.name || "");
  const [phone, setPhone] = useState(ctx.user?.phone || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Change password state
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState("");

  async function saveProfile(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const profile = ctx.user.demo
        ? { name: name.trim(), phone: phone.trim() }
        : await ctx.api("/account/profile", {
            method: "PATCH",
            body: JSON.stringify({ name: name.trim(), phone: phone.trim() }),
          });
      ctx.updateUser?.(profile);
      setEditing(false);
      ctx.flash(ctx.user.demo ? "Đã sửa trong phiên xem thử." : "Đã cập nhật hồ sơ cá nhân.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitPassword(e) {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPwdError("Mật khẩu mới tối thiểu 6 ký tự.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError("Mật khẩu xác nhận không khớp.");
      return;
    }
    setPwdBusy(true);
    setPwdError("");
    setPwdSuccess("");
    try {
      if (ctx.user.demo) {
        setPwdSuccess("Đổi mật khẩu thành công trong phiên demo.");
      } else {
        await ctx.api("/account/change-password", {
          method: "POST",
          body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword,
          }),
        });
        setPwdSuccess("Đã cập nhật mật khẩu mới thành công.");
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setChangingPassword(false), 2000);
    } catch (e) {
      setPwdError(e.message || "Không thể đổi mật khẩu.");
    } finally {
      setPwdBusy(false);
    }
  }

  return (
    <>
      <PageTitle
        title="Tài khoản của bạn"
        description="Thông tin đăng nhập, hồ sơ cá nhân và phân quyền bảo mật trong OptiGym."
      />
      <div className="g-settings-layout">
        <section>
          <Avatar name={ctx.user.name} size="large" />
          <h2>{ctx.user.name}</h2>
          <p>{roleNames[ctx.user.role] || ctx.user.role}</p>
          {ctx.user.demo && <Sample>Tài khoản xem thử</Sample>}
        </section>

        <Section title="Thông tin tài khoản">
          <dl className="g-account-details">
            <div>
              <dt>Họ và tên</dt>
              <dd>{ctx.user.name}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{ctx.user.email}</dd>
            </div>
            <div>
              <dt>Số điện thoại</dt>
              <dd>{ctx.user.phone || "Chưa cập nhật"}</dd>
            </div>
            <div>
              <dt>Vai trò & Phân quyền</dt>
              <dd>
                <strong>{roleNames[ctx.user.role] || ctx.user.role}</strong>
              </dd>
            </div>
            {ctx.user.member_code && (
              <div>
                <dt>Mã định danh</dt>
                <dd><code>{ctx.user.member_code}</code></dd>
              </div>
            )}
            {ctx.user.specialty && (
              <div>
                <dt>Chuyên môn huấn luyện</dt>
                <dd>{ctx.user.specialty}</dd>
              </div>
            )}
            <div>
              <dt>Trạng thái xác thực</dt>
              <dd>{ctx.user.email_verified !== false ? "✓ Đã xác thực email" : "Chưa xác thực"}</dd>
            </div>
            <div>
              <dt>Phiên đăng nhập</dt>
              <dd>{ctx.user.demo ? "Bản xem thử" : "Đang hoạt động (Session HttpOnly)"}</dd>
            </div>
          </dl>

          {editing ? (
            <form onSubmit={saveProfile}>
              <Field
                label="Họ và tên"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                maxLength={120}
              />
              <Field
                label="Số điện thoại"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={30}
                placeholder="09xx xxx xxx"
              />
              {error && <p role="alert" style={{ color: "var(--danger, #ef4444)", marginTop: 8 }}>{error}</p>}
              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <Button disabled={busy} type="submit">
                  {busy ? "Đang lưu…" : "Lưu hồ sơ"}
                </Button>
                <Button
                  quiet
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setName(ctx.user.name);
                    setPhone(ctx.user.phone || "");
                    setEditing(false);
                  }}
                >
                  Hủy
                </Button>
              </div>
            </form>
          ) : (
            <Button
              quiet
              onClick={() => {
                setName(ctx.user.name);
                setPhone(ctx.user.phone || "");
                setError("");
                setEditing(true);
              }}
            >
              Chỉnh sửa thông tin
            </Button>
          )}

          <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--border, #e5e7eb)" }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <KeyRound size={18} /> Đổi mật khẩu
            </h3>

            {changingPassword ? (
              <form onSubmit={submitPassword} style={{ maxWidth: 420 }}>
                <Field
                  label="Mật khẩu hiện tại"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
                <Field
                  label="Mật khẩu mới (tối thiểu 6 ký tự)"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <Field
                  label="Nhập lại mật khẩu mới"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
                {pwdError && <p role="alert" style={{ color: "var(--danger, #ef4444)", marginTop: 8 }}>{pwdError}</p>}
                {pwdSuccess && <p role="status" style={{ color: "var(--success, #22c55e)", marginTop: 8 }}>{pwdSuccess}</p>}
                <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                  <Button disabled={pwdBusy} type="submit">
                    {pwdBusy ? "Đang cập nhật…" : "Cập nhật mật khẩu"}
                  </Button>
                  <Button
                    quiet
                    type="button"
                    disabled={pwdBusy}
                    onClick={() => {
                      setChangingPassword(false);
                      setPwdError("");
                      setPwdSuccess("");
                    }}
                  >
                    Hủy
                  </Button>
                </div>
              </form>
            ) : (
              <Button quiet onClick={() => setChangingPassword(true)}>
                Đổi mật khẩu tài khoản
              </Button>
            )}
          </div>

          <div className="g-account-security" style={{ marginTop: 24 }}>
            <ShieldCheck size={21} />
            <p>
              Tài khoản được bảo vệ bằng cơ chế Session Security chống giả mạo Origin và Cookie HttpOnly.
              Nếu quên mật khẩu, bạn có thể đặt lại qua mã xác thực OTP gửi về email đăng ký.
            </p>
          </div>
        </Section>
      </div>
    </>
  );
}
