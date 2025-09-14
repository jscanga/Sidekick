// src/app/schedule/page.tsx
"use client";

import Sidebar from "@/components/Sidebar";

export default function SchedulePage() {
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 p-8">
        <h1 className="text-2xl font-bold mb-4">Schedule</h1>
        <p>Your schedule will go here.</p>
      </div>
    </div>
  );
}