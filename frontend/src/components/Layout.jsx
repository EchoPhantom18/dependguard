import { Outlet } from "react-router-dom";
import { useState } from "react";

import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";


export default function Layout() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="app-shell min-h-screen">
      <div className="fixed inset-0 cyber-grid" aria-hidden="true" />
      <div className="relative flex min-h-screen">
        <Sidebar
          isMobileOpen={isMobileSidebarOpen}
          onMobileClose={() => setIsMobileSidebarOpen(false)}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onMenuClick={() => setIsMobileSidebarOpen(true)} />
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
