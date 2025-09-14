// src/app/wellness/page.tsx
"use client";

import Sidebar from "@/components/Sidebar";

export default function WellnessPage() {
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 p-8">
        <h1 className="text-2xl font-bold mb-4">Wellness</h1>
        <p>Wellness suggestions will go here.</p>
      </div>
    </div>
  );
}