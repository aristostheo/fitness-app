import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { subscribeFoodsByDate, subscribeExerciseByDate } from "../services/nutrition";
import { ensureProfile, subscribeProfile } from "../services/profile";

const todayStr = () => new Date().toISOString().slice(0,10);

const Card = ({ title, desc, to }) => (
  <Link to={to} className="block border rounded-2xl p-5 bg-white hover:shadow-md transition">
    <h3 className="text-lg font-semibold mb-1">{title}</h3>
    <p className="text-sm text-gray-600">{desc}</p>
  </Link>
);

function ProgressBar({ label, value, target, unit = "", color = "bg-blue-600" }) {
  const pct = Math.max(0, Math.min(100, target > 0 ? (value / target) * 100 : 0));
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-700">{label}</span>
        <span className="text-sm font-medium">{Math.round(value)} / {Math.round(target)} {unit}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div className={`${color} h-3`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [date] = useState(todayStr());
  const [foods, setFoods] = useState([]);
  const [exercise, setExercise] = useState([]);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!user) return;
    const unsubs = [];
    unsubs.push(subscribeFoodsByDate(user.uid, date, setFoods));
    unsubs.push(subscribeExerciseByDate(user.uid, date, setExercise));
    (async () => {
      await ensureProfile(user.uid);
      unsubs.push(subscribeProfile(user.uid, setProfile));
    })();
    return () => { for (const u of unsubs) { try { typeof u === "function" && u(); } catch {} } };
  }, [user, date]);

  const totals = useMemo(() => {
    const t = { calories:0, protein:0 };
    foods.forEach(f => {
      t.calories += f.calories || 0;
      t.protein  += f.protein  || 0;
    });
    const burned = exercise.reduce((s, e) => s + (e.calories || 0), 0);
    return { ...t, burned, net: t.calories - burned };
  }, [foods, exercise]);

  const targets = {
    kcal: profile?.dailyCaloriesTarget ?? 2200,
    protein: profile?.dailyProteinTarget ?? 130,
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Welcome back 👋</h1>
        <p className="text-gray-600">Today: {date}</p>
      </header>

      {/* Goal quick view */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ProgressBar label="Net Calories" value={totals.net} target={targets.kcal} unit="kcal" />
        <ProgressBar label="Protein" value={totals.protein} target={targets.protein} unit="g" color="bg-emerald-600" />
      </div>

      {/* Quick nav */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Workouts"  desc="Log sets, reps, weight. View progress charts." to="/dashboard" />
        <Card title="Nutrition"  desc="Track meals & macros, quick-add from history." to="/nutrition" />
        <Card title="Settings"   desc="Set your daily goals and preferences." to="/settings" />
      </section>
    </div>
  );
}
