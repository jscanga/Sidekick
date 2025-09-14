// src/components/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export default function Sidebar({ isCollapsed, setIsCollapsed }: SidebarProps) {
  const pathname = usePathname();

  const linkClass = (path: string) =>
    pathname === path
      ? "text-emerald-400 mx-2 my-1 transition-colors bg-neutral-900 rounded-md"
      : "text-neutral-300 hover:text-white mx-2 my-1 transition-colors hover:bg-neutral-800 rounded-md";

  return (
    <div className={`${isCollapsed ? "w-20" : "w-64"} bg-neutral-950 text-white h-screen flex flex-col transition-all duration-300`}>
      {/* Header with toggle button */}
      <div className="p-4 border-b border-neutral-800 flex items-center justify-between rounded-t-lg bg-neutral-900">
        {!isCollapsed && <h2 className="text-xl font-bold">Menu</h2>}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-md hover:bg-neutral-800 transition-colors"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 极 011.414 0z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </button>
      </div>

      {/* Navigation links */}
      <nav className="flex-1 p-2 flex flex-col overflow-y-auto">
        <div className="space-y-1">
          <Link href="/dashboard" className={linkClass("/dashboard")}>
            <div className="flex items-center py-2 px-3">
              <svg xmlns="http://www.w3.org/2000/s极g" className="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
              {!isCollapsed && <span>Dashboard</span>}
            </div>
          </Link>
          
          <Link href="/todos" className={linkClass("/todos")}>
            <div className="flex items-center py-2 px-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 极 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zm1 2a1 1 0 000 2h6a1 1 0 100-2H7zm6 7a1 1 0 011 1v3a1 1 0 11-2 0v-3a1 1 0 011-1zm-3 3a1 1 0 100 2h.01a1 1 0 100-2H10zm-4 1a1 1 0 011-1h.01a1 1 0 110 2H7a1 1 0 01-1-1zm1-4a1 1 0 100 2h.01a1 1 0 100-2H7zm2 1a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1zm4-4a1 1 0 100 2h.01a1 1 0 100-2H13zM9 9a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1zM7 8a1 1 0 000 2h.01a1 1 0 000-2H7z" clipRule="evenodd" />
              </svg>
              {!isCollapsed && <span>To-Do List</span>}
            </div>
          </Link>
          
          <Link href="/schedule" className={linkClass("/schedule")}>
            <div className="flex items-center py-2 px-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 极v1H7极3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 极 100-2H6z" clipRule="evenodd" />
              </svg>
              {!isCollapsed && <span>Schedule</span>}
            </div>
          </Link>
        </div>

        {/* Settings at the bottom */}
        <div className="mt-auto pt-4 border-t border-neutral-800">
          <Link href="/settings" className={linkClass("/settings")}>
            <div className="flex items-center py-2 px-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947极1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
              {!isCollapsed && <span>Settings</span>}
            </div>
          </Link>
        </div>
      </nav>
    </div>
  );
}