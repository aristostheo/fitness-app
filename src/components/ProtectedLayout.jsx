import React from "react";
import { Outlet } from "react-router-dom";
import AppNav from "./AppNav";

export default function ProtectedLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav />
      <main className="max-w-5xl mx-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
