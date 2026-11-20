import { useState } from "react";
import { api } from "../../shared/api/client.js";
export function useAuth(onLogin) {
  const [mode, setMode] = useState("login"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [visible, setVisible] = useState(false),
    [confirm, setConfirm] = useState(""),
    [resetToken, setResetToken] = useState(""),
    [cv, setCv] = useState(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "MEMBER",
    specialty: "GYM",
    code: "",
  });
  const patch = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  function changeMode(next) {
    if (next === "reset" && !resetToken) return;
    setMode(next);
    setError("");
    setMessage("");
    setVisible(false);
    if (next === "forgot" || next === "login") {
      setResetToken("");
      patch("password", "");
      patch("code", "");
      setConfirm("");
    }
  }
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (mode === "login") {
        onLogin(
          await api("/auth/login", {
            method: "POST",
            body: JSON.stringify({
              email: form.email,
              password: form.password,
            }),
          }),
        );
        return;
      }
      if (["register", "reset"].includes(mode) && form.password !== confirm)
        throw Error("Mật khẩu nhập lại chưa khớp.");
      let body = { email: form.email },
        path = mode;
      if (mode === "register") {
        body = { ...form };
        if (form.role === "PT") {
          if (!cv) throw Error("Vui lòng tải CV của bạn lên.");
          if (cv.size > 5 * 1024 * 1024) throw Error("CV tối đa 5 MB.");
          if (!/\.(pdf|doc|docx)$/i.test(cv.name))
            throw Error("Chọn CV định dạng PDF, DOC hoặc DOCX.");
          body.cv_name = cv.name;
          body.cv_data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result).split(",")[1]);
            reader.onerror = () => reject(Error("Không đọc được CV."));
            reader.readAsDataURL(cv);
          });
        }
      }
      if (mode === "verify") body.code = form.code;
      if (mode === "forgot") path = "forgot-password";
      if (mode === "reset-code") {
        path = "verify-reset-code";
        body.code = form.code;
      }
      if (mode === "reset") {
        path = "reset-password";
        body = { email: form.email, resetToken, password: form.password };
      }
      const result = await api("/auth/" + path, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (mode === "reset-code") setResetToken(result.resetToken);
      if (mode === "reset") setResetToken("");
      setMode(
        {
          register: "verify",
          verify: "login",
          forgot: "reset-code",
          "reset-code": "reset",
          reset: "login",
        }[mode],
      );
      setMessage(result.message || "Đã hoàn tất.");
      patch("password", "");
      patch("code", "");
      setConfirm("");
    } catch (e) {
      setError(e.message);
      if (mode === "login" && e.message.includes("chưa xác thực"))
        setMode("verify");
    } finally {
      setBusy(false);
    }
  }
  async function resend() {
    setBusy(true);
    setError("");
    try {
      const res = await api("/auth/resend", {
        method: "POST",
        body: JSON.stringify({ email: form.email }),
      });
      setMessage(res.message);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const titles = {
    login: "Chào mừng trở lại",
    register: "Tạo tài khoản Optigym",
    verify: "Xác thực email.",
    forgot: "Lấy lại mật khẩu.",
    "reset-code": "Nhập mã xác thực.",
    reset: "Đặt mật khẩu mới.",
  };
  const descriptions = {
    login: "Mở lịch, nhắn PT và tiếp tục giáo án của bạn.",
    register: "Tạo tài khoản để chuẩn bị buổi tập đầu tiên.",
    verify: "Nhập mã 6 chữ số đã gửi tới email. Mã có hiệu lực 10 phút.",
    forgot: "Nhập email của bạn. Chúng mình sẽ gửi mã xác thực.",
    "reset-code": "Xác thực mã 6 chữ số trước khi đặt mật khẩu mới.",
    reset: "Email đã xác thực. Chọn mật khẩu mới có tối thiểu 6 ký tự.",
  };
  return {
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
    cv,
    setCv,
  };
}
