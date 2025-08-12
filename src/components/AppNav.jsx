import React from "react";
import { NavLink } from "react-router-dom";

export default function AppNav() {
  const link =
    "px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-100";
  const active =
    "bg-gray-900 text-white hover:bg-gray-900";

  return (
    <nav className="w-full bg-white border-b">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
        <div className="font-bold text-lg">FitnessApp</div>
        <div className="flex items-center gap-2">
          <NavLink to="/" end className={({isActive}) =>
            `${link} ${isActive ? active : "text-gray-800"}`
          }>Home</NavLink>
          <NavLink to="/dashboard" className={({isActive}) =>
            `${link} ${isActive ? active : "text-gray-800"}`
          }>Workouts</NavLink>
          <NavLink to="/nutrition" className={({isActive}) =>
            `${link} ${isActive ? active : "text-gray-800"}`
          }>Nutrition</NavLink>
        </div>
      </div>
    </nav>
  );
}
