import React from "react";
import { Link } from "react-router-dom";

const Card = ({ title, desc, to }) => (
  <Link to={to} className="block border rounded-2xl p-5 bg-white hover:shadow-md transition">
    <h3 className="text-lg font-semibold mb-1">{title}</h3>
    <p className="text-sm text-gray-600">{desc}</p>
  </Link>
);

export default function Home() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Welcome back 👋</h1>
        <p className="text-gray-600">Choose a section to get started.</p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card
          title="Workouts"
          desc="Log sets, reps, weight. Edit, filter, and view your progress charts."
          to="/dashboard"
        />
        <Card
          title="Nutrition"
          desc="Track meals and macros, quick-add from history, and net calories."
          to="/nutrition"
        />
        {/* Future features */}
        <div className="border rounded-2xl p-5 bg-gray-100 opacity-70">
          <h3 className="text-lg font-semibold mb-1">Goals (coming soon)</h3>
          <p className="text-sm text-gray-600">Daily protein & calorie targets, streaks, and habit nudges.</p>
        </div>
        <div className="border rounded-2xl p-5 bg-gray-100 opacity-70">
          <h3 className="text-lg font-semibold mb-1">Insights (coming soon)</h3>
          <p className="text-sm text-gray-600">Trends, PRs, PPC (protein-per-calorie) score, and more.</p>
        </div>
      </section>
    </div>
  );
}
