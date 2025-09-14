"use client";

import Sidebar from "./Sidebar";
import { useState } from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const sidebarWidth = isCollapsed ? 80 : 256; // matches w-20 / w-64 in px

  return (
    <div>
      {/* Fixed sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen transition-all duration-300 bg-neutral-950`}
        style={{ width: sidebarWidth }}
      >
        <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      </aside>

      {/* Main content */}
      <main
        className="transition-all duration-300"
        style={{ marginLeft: sidebarWidth }}
      >
        {children}
      </main>
    </div>
  );
}
