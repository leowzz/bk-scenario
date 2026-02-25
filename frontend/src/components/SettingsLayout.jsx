import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, SlidersHorizontal, PlugZap } from "lucide-react";

const navItems = [
  {
    key: "general",
    label: "General",
    icon: SlidersHorizontal,
    to: "/settings",
    matches: (pathname) => pathname === "/settings",
  },
  {
    key: "connections",
    label: "Connections",
    icon: PlugZap,
    to: "/settings/connections",
    matches: (pathname) => pathname.startsWith("/settings/connections"),
  },
];

export function SettingsLayout({ title, children }) {
  const location = useLocation();

  return (
    <div className="settings-page">
      <div className="settings-header">
        <div className="settings-header-left">
          <Link to="/" className="btn-icon" title="Back to home">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="logo-title settings-title">{title}</h1>
        </div>
      </div>

      <div className="settings-shell">
        <aside className="settings-sidebar">
          <div className="settings-sidebar-title">Settings</div>
          <nav className="settings-nav">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = item.matches(location.pathname);
              return (
                <Link key={item.key} to={item.to} className={`settings-nav-item ${active ? "active" : ""}`}>
                  <Icon size={16} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="settings-content">{children}</main>
      </div>
    </div>
  );
}
