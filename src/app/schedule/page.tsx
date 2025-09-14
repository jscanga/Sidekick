"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";

export default function SchedulePage() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="flex">
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      <div className="flex-1 p-8">
        <h1 className="text-2xl font-bold mb-4">Schedule</h1>
        <p>Your schedule will go here.</p>
      </div>
    </div>
  );
}
