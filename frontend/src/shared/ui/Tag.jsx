import React from "react";

const KIND_STYLES = {
  danger: { background: "#fee2e2", color: "#b91c1c" },
  warning: { background: "#fef3c7", color: "#92400e" },
  success: { background: "#dcfce7", color: "#15803d" },
};

export function Tag({ children, active = false, kind = "default" }) {
  return (
    <span
      className={"g-tag " + (active ? "active" : "")}
      style={KIND_STYLES[kind] || undefined}
    >
      {children}
    </span>
  );
}
