import { NavLink } from "react-router-dom";

import Tooltip from "./Tooltip.jsx";


export default function SidebarItem({ item, isExpanded, isMobile = false, onNavigate }) {
  const Icon = item.icon;
  const showLabel = isExpanded || isMobile;

  return (
    <NavLink
      to={item.to}
      aria-label={item.label}
      title={!showLabel ? item.label : undefined}
      onClick={onNavigate}
      className={({ isActive }) =>
        [
          "sidebar-link group relative flex min-h-11 items-center rounded-lg border text-sm font-medium transition-all duration-300 ease-in-out",
          showLabel ? "gap-3 px-3 py-2.5" : "justify-center px-0 py-2.5",
          isActive ? "sidebar-link-active" : "sidebar-link-idle",
        ].join(" ")
      }
    >
      <Icon size={18} className="shrink-0 transition-transform duration-200 ease-out group-hover:scale-110" />
      <span
        className={[
          "overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out",
          showLabel ? "max-w-44 translate-x-0 opacity-100" : "max-w-0 -translate-x-1 opacity-0",
        ].join(" ")}
      >
        {item.label}
      </span>
      {!showLabel && <Tooltip label={item.label} />}
    </NavLink>
  );
}
