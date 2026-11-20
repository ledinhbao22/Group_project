import { MemberWorkspace } from "../features/member/experience/MemberWorkspace.jsx";
import { PtWorkspace } from "../features/pt/PtWorkspace.jsx";
import { useEffect, useState, useRef } from "react";
import { Dumbbell } from "lucide-react";
import { AuthView } from "../features/auth/AuthView.jsx";
import { Loading } from "../shared/ui/Loading.jsx";
import { api } from "../shared/api/client.js";
import { demoAccounts } from "../shared/demo/accounts.js";
import { freshDemoData } from "../shared/demo/freshDemoData.js";
import { freshRealData } from "../shared/api/initialData.js";
import { loadPaths } from "../shared/api/loadPaths.js";
import { allowedPages } from "../shared/config/navigation.js";
import { readRole } from "../shared/demo/readRole.js";
import React from "react";
import { AdminWorkspace } from "../features/admin/layout/AdminWorkspace.jsx";

function requestedPage() {
  return location.pathname === "/progress"
    ? "progress"
    : location.pathname === "/training"
      ? "workout"
      : new URLSearchParams(location.search).get("page") || "home";
}
class WorkspaceErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.warn("Workspace Error caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const { user, logout } = this.props;
      const roleName =
        user?.role === "PT"
          ? "Huấn luyện viên PT"
          : user?.role === "MEMBER"
          ? "Hội viên"
          : "Người dùng";
      return (
        <div
          style={{
            minHeight: "100vh",
            background: "#f8fafc",
            padding: "40px 20px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          <div
            style={{
              maxWidth: 520,
              width: "100%",
              background: "#ffffff",
              borderRadius: 12,
              padding: 32,
              boxShadow: "0 10px 25px rgba(0,0,0,0.06)",
              border: "1px solid #e2e8f0",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                background: "rgba(220, 38, 38, 0.1)",
                color: "#dc2626",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <Dumbbell size={28} />
            </div>
            <h2
              style={{
                fontSize: "1.35rem",
                fontWeight: 800,
                color: "#0f172a",
                margin: "0 0 8px",
              }}
            >
              Không gian {roleName}
            </h2>
            <p
              style={{
                color: "#64748b",
                fontSize: "0.9rem",
                lineHeight: 1.6,
                margin: "0 0 20px",
              }}
            >
              Xin chào <strong>{user?.name || "Bạn"}</strong> ({user?.email}).
              Giao diện không gian {roleName} đang được tải và tối ưu dữ liệu.
            </p>
            <div
              style={{
                display: "flex",
                gap: 10,
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false });
                  window.location.reload();
                }}
                style={{
                  padding: "10px 20px",
                  borderRadius: 8,
                  background: "#0f172a",
                  color: "#ffffff",
                  border: "none",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                Tải lại giao diện
              </button>
              <button
                type="button"
                onClick={logout}
                style={{
                  padding: "10px 20px",
                  borderRadius: 8,
                  background: "#ffffff",
                  color: "#dc2626",
                  border: "1px solid #dc2626",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function App() {
  const [user, setUser] = useState(() =>
    readRole()
      ? {
          ...demoAccounts[readRole()],
        }
      : null,
  );
  const [boot, setBoot] = useState(() => !readRole());
  const [page, setPage] = useState(requestedPage),
    [data, setData] = useState(() =>
      readRole() ? freshDemoData() : freshRealData(),
    ),
    [loading, setLoading] = useState(false),
    [loadErrors, setLoadErrors] = useState([]),
    [revision, setRevision] = useState(0),
    [toast, setToast] = useState("");
  const toastTimer = useRef();

  useEffect(() => {
    if (!boot) return;
    let active = true;
    api("/auth/me")
      .then((u) => {
        if (active && u && u.id) setUser(u);
        else if (active) setUser(null);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setBoot(false);
      });
    return () => {
      active = false;
    };
  }, [boot]);

  useEffect(() => {
    const back = () =>
      setPage(
        user?.role && allowedPages[user.role]?.includes(requestedPage())
          ? requestedPage()
          : "home",
      );
    window.addEventListener("popstate", back);
    return () => window.removeEventListener("popstate", back);
  }, [user?.role]);
  useEffect(() => {
    if (user && user.role && !allowedPages[user.role]?.includes(page)) setPage("home");
  }, [user?.role, page]);
  useEffect(() => {
    if (!user || user.demo) return;
    let active = true;
    setLoading(revision === 0);
    setLoadErrors([]);
    const paths = Object.entries(loadPaths[user.role] || {});
    Promise.allSettled(
      paths.map(async ([key, path]) => ({
        key,
        path,
        value: await api(path),
      })),
    ).then((results) => {
      if (!active) return;
      const next = freshRealData(),
        errors = [];
      results.forEach((r, i) => {
        if (r.status === "fulfilled") next[r.value.key] = r.value.value;
        else
          errors.push({
            key: paths[i][0],
            message: r.reason.message,
          });
      });
      setData(next);
      setLoadErrors(errors);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [user?.id, user?.role, user?.demo, revision]);
  useEffect(() => {
    document.documentElement.dataset.gTheme = "light";
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  function flash(message) {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 5500);
  }
  function go(next) {
    if (!allowedPages[user?.role]?.includes(next)) return;
    const url = new URL(location.href);
    url.pathname =
      next === "progress"
        ? "/progress"
        : next === "workout"
          ? "/training"
          : "/";
    if (["progress", "workout", "home"].includes(next))
      url.searchParams.delete("page");
    else url.searchParams.set("page", next);
    history.pushState(null, "", url.pathname + url.search);
    setPage(next);
    window.scrollTo({
      top: 0,
      behavior: "instant",
    });
  }
  function demo(role) {
    history.replaceState(null, "", location.pathname + "?demo=" + role);
    setUser({
      ...demoAccounts[role],
    });
    if (!user?.demo) {
      setData(freshDemoData());
    }
    setLoadErrors([]);
    setLoading(false);
    setPage("home");
    setBoot(false);
    setToast("");
  }
  function login(u) {
    setRevision(0);
    setData(freshRealData());
    setUser(u);
    setPage(
      allowedPages[u?.role]?.includes(requestedPage()) ? requestedPage() : "home",
    );
    setLoadErrors([]);
  }
  async function logout() {
    if (user?.demo) {
      setUser(null);
      setData(freshRealData());
      setPage("home");
      history.replaceState(null, "", location.pathname);
      return;
    }
    try {
      await api("/auth/logout", {
        method: "POST",
      });
    } catch (e) {
      console.warn("Logout error:", e);
    } finally {
      setUser(null);
      setData(freshRealData());
      setPage("home");
      history.replaceState(null, "", location.pathname);
    }
  }
  const ctx = {
    updateUser: (profile) => setUser((current) => ({ ...current, ...profile })),
    user,
    data,
    setData,
    go,
    flash,
    api,
    reload: () => setRevision((v) => v + 1),
  };
  if (boot)
    return (
      <div className="g-app" data-theme="light">
        <Loading />
      </div>
    );
  if (!user)
    return (
      <div className="g-app" data-theme="light">
        <AuthView onLogin={login} onDemo={demo} />
      </div>
    );
  if (user.role === "ADMIN")
    return (
      <AdminWorkspace
        ctx={ctx}
        page={page}
        logout={logout}
        loading={loading}
        loadErrors={loadErrors}
        toast={toast}
        setToast={setToast}
      />
    );
  if (user.role === "PT")
    return (
      <WorkspaceErrorBoundary user={user} logout={logout}>
        <PtWorkspace
          ctx={ctx}
          page={page}
          logout={logout}
          loading={loading}
          loadErrors={loadErrors}
          toast={toast}
          setToast={setToast}
        />
      </WorkspaceErrorBoundary>
    );
  if (user.role === "MEMBER")
    return (
      <WorkspaceErrorBoundary user={user} logout={logout}>
        <MemberWorkspace
          ctx={ctx}
          page={page}
          logout={logout}
          loading={loading}
          loadErrors={loadErrors}
          toast={toast}
          setToast={setToast}
        />
      </WorkspaceErrorBoundary>
    );
  return (
    <div className="g-app" data-theme="light">
      <AuthView onLogin={login} onDemo={demo} />
    </div>
  );
}
