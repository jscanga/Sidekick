// src/app/todos/page.tsx
"use client";

import ToDoList from "@/components/ToDoList";
import Layout from "@/components/Layout";
import type { AppProps } from "next/app";

export default function TodosPage() {
  return (
    <Layout>
    <div className="flex">
      <div className="flex-1 p-8">
        <h1 className="text-5xl font-bold font-mono mb-4"></h1>
        <ToDoList />
      </div>
    </div>
    </Layout>
  );
}