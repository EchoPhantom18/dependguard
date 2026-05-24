import {
  FileText,
  GitBranch,
  Github,
  History,
  LayoutDashboard,
  Radar,
  ScanLine,
  Settings,
  Shield,
  ShieldCheck,
  Scale,
  WandSparkles,
  Workflow,
  X,
} from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router-dom";

import SidebarItem from "./SidebarItem.jsx";


const links = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/new-scan", label: "New Scan", icon: ScanLine },
  { to: "/repo-scanner", label: "Repo Scanner", icon: Github },
  { to: "/safe-manifest", label: "Safe Manifest", icon: WandSparkles },
  { to: "/attack-graph", label: "Attack Graph", icon: GitBranch },
  { to: "/ci-cd", label: "CI/CD", icon: Workflow },
  { to: "/licenses", label: "Licenses", icon: Scale },
  { to: "/supply-chain", label: "Supply Chain", icon: ShieldCheck },
  { to: "/intelligence", label: "Intelligence", icon: Radar },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/history", label: "History", icon: History },
  { to: "/settings", label: "Settings", icon: Settings },
];


function LogoBlock({ isExpanded, isMobile = false, onClose }) {
  const showText = isExpanded || isMobile;

  return (
    <div className="mb-8 flex items-center justify-between gap-3">
      <NavLink
        to="/dashboard"
        onClick={onClose}
        aria-label="DependGuard dashboard"
        className={[
          "flex w-full min-w-0 items-center transition-all duration-300 ease-in-out",
          showText ? "gap-3 px-2" : "justify-center px-0",
        ].join(" ")}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-200 ring-1 ring-cyan-300/30">
          <Shield size={20} />
        </span>
        <span
          className={[
            "overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out",
            showText ? "max-w-44 opacity-100" : "max-w-0 opacity-0",
          ].join(" ")}
        >
          <span className="theme-heading block text-lg font-bold">DependGuard</span>
          <span className="theme-muted text-xs">Dependency security</span>
        </span>
      </NavLink>

      {isMobile && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close sidebar"
          className="theme-button inline-flex h-9 w-9 items-center justify-center rounded-lg border lg:hidden"
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
}


function SidebarContent({ isExpanded, isMobile = false, onNavigate }) {
  return (
    <>
      <LogoBlock isExpanded={isExpanded} isMobile={isMobile} onClose={onNavigate} />

      <nav className="space-y-1">
        {links.map((item) => (
          <SidebarItem
            key={item.to}
            item={item}
            isExpanded={isExpanded}
            isMobile={isMobile}
            onNavigate={onNavigate}
          />
        ))}
      </nav>
    </>
  );
}


export default function Sidebar({ isMobileOpen = false, onMobileClose = () => {} }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <aside
        className={[
          "sidebar-shell hidden shrink-0 overflow-visible border-r py-5 backdrop-blur-xl transition-all duration-300 ease-in-out lg:block",
          isExpanded ? "w-72 px-4" : "w-20 px-3",
        ].join(" ")}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        <SidebarContent isExpanded={isExpanded} />
      </aside>

      <div
        className={[
          "fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm transition-opacity duration-300 ease-in-out lg:hidden",
          isMobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
        onClick={onMobileClose}
        aria-hidden="true"
      />

      <aside
        className={[
          "sidebar-shell fixed inset-y-0 left-0 z-50 w-72 border-r px-4 py-5 backdrop-blur-xl transition-transform duration-300 ease-in-out lg:hidden",
          isMobileOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <SidebarContent isExpanded isMobile onNavigate={onMobileClose} />
      </aside>
    </>
  );
}
