// src/pages/Dashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  addWorkout,
  subscribeWorkouts,
  deleteWorkout,
  updateWorkout,
} from "../services/workouts";
import VolumeChart from "../components/VolumeChart";
import WeeklyWorkoutsChart from "../components/WeeklyWorkoutsChart";

// --- date helpers ---
const pad = (n) => String(n).padStart(2, "0");
const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay() === 0 ? 7 : d.getDay(); // Sun=>7
  d.setDate(d.getDate() - (day - 1));
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function startOfMonth(date) {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfToday(date) {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [workouts, setWorkouts] = useState([]);

  // add form
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [exercise, setExercise] = useState("");
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");

  // filters
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  // preset quick filter
  const [preset, setPreset] = useState("all"); // 'week'|'7'|'month'|'30'|'all'|'custom'

  // editing
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({
    date: "",
    exercise: "",
    sets: "",
    reps: "",
    weight: "",
    notes: "",
  });
  const weekKey = (yyyyMmDd) => {
    const [y,m,d] = yyyyMmDd.split("-").map(Number);
    const dt = new Date(y, m-1, d);
    // ISO week (Mon-start)
    const day = (dt.getDay() + 6) % 7; // 0..6 Mon..Sun
    const thursday = new Date(dt); thursday.setDate(dt.getDate() - day + 3);
    const year = thursday.getFullYear();
    const jan4 = new Date(year, 0, 4);
    const week = Math.round((thursday - jan4) / 86400000 / 7) + 1;
    return `${year}-W${String(week).padStart(2,"0")}`;
  };

  const workoutsPerWeek = useMemo(() => {
    const map = {};
    workouts.forEach(w => {
      if (!w.date) return;
      const key = weekKey(w.date);
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a,b) => a[0].localeCompare(b[0]))
      .map(([week, count]) => ({ week, count }));
  }, [workouts]);


  // react to preset changes
  useEffect(() => {
    const today = endOfToday(new Date());
    if (preset === "all") {
      setFrom("");
      setTo("");
      return;
    }
    if (preset === "week") {
      const s = startOfWeek(today);
      setFrom(fmt(s));
      setTo(fmt(today));
      return;
    }
    if (preset === "7") {
      const s = new Date(today);
      s.setDate(s.getDate() - 6);
      setFrom(fmt(s));
      setTo(fmt(today));
      return;
    }
    if (preset === "month") {
      const s = startOfMonth(today);
      setFrom(fmt(s));
      setTo(fmt(today));
      return;
    }
    if (preset === "30") {
      const s = new Date(today);
      s.setDate(s.getDate() - 29);
      setFrom(fmt(s));
      setTo(fmt(today));
      return;
    }
  }, [preset]);

  // simple guard: if from > to, clear to
  useEffect(() => {
    if (from && to && from > to) setTo("");
  }, [from, to]);

  // // subscribe to Firestore (server-side filtering)
  // useEffect(() => {
  //   if (!user) return;
  //   const unsub = subscribeWorkouts(user.uid, setWorkouts, { from, to });
  //   return () => unsub && unsub();
  // }, [user, from, to]);

  useEffect(() => {
    if (!user) return;
    const unsubs = [];
    unsubs.push(subscribeWorkouts(user.uid, setWorkouts, { from, to }));
    return () => {
      for (const u of unsubs) { try { typeof u === "function" && u(); } catch {} }
    };
  }, [user, from, to]);

  const onAdd = async (e) => {
    e.preventDefault();
    if (!user) return;
    await addWorkout(user.uid, {
      date,
      exercise,
      sets: Number(sets || 0),
      reps: Number(reps || 0),
      weight: Number(weight || 0),
      notes,
    });
    setExercise("");
    setSets("");
    setReps("");
    setWeight("");
    setNotes("");
  };

  const startEdit = (w) => {
    setEditId(w.id);
    setEditData({
      date: w.date || "",
      exercise: w.exercise || "",
      sets: w.sets ?? "",
      reps: w.reps ?? "",
      weight: w.weight ?? "",
      notes: w.notes || "",
    });
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    await updateWorkout(user.uid, editId, {
      ...editData,
      sets: Number(editData.sets || 0),
      reps: Number(editData.reps || 0),
      weight: Number(editData.weight || 0),
    });
    setEditId(null);
  };

  const cancelEdit = () => setEditId(null);

  const logout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  // chart data (from filtered workouts)
  const volumeByDate = useMemo(() => {
    const map = {};
    workouts.forEach((w) => {
      const v = (w.sets || 0) * (w.reps || 0) * (w.weight || 0);
      map[w.date] = (map[w.date] || 0) + v;
    });
    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([d, v]) => ({ date: d, volume: v }));
  }, [workouts]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow p-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-sm text-gray-600">
              Signed in as <b>{user?.email}</b>
            </p>
          </div>
          <button onClick={logout} className="px-4 py-2 rounded bg-gray-800 text-white">
            Log out
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold mb-3">Filter by date</h2>

          {/* Presets */}
          <div className="flex flex-wrap gap-2 mb-3">
            {[
              { k: "week", label: "This Week" },
              { k: "7", label: "Last 7 days" },
              { k: "month", label: "This Month" },
              { k: "30", label: "Last 30 days" },
              { k: "all", label: "All Time" },
            ].map((p) => (
              <button
                key={p.k}
                type="button"
                onClick={() => setPreset(p.k)}
                className={`px-3 py-1.5 rounded border text-sm ${
                  preset === p.k
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Manual from/to */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              className="border rounded px-3 py-2"
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPreset("custom");
              }}
            />
            <input
              className="border rounded px-3 py-2"
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPreset("custom");
              }}
            />
            <button
              type="button"
              className="px-4 py-2 rounded bg-gray-200"
              onClick={() => {
                setFrom("");
                setTo("");
                setPreset("all");
              }}
            >
              Clear
            </button>
          </div>
        </div>

        {/* Add Workout */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Add Workout</h2>
          <form onSubmit={onAdd} className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <input
              className="border rounded px-3 py-2"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
            <input
              className="border rounded px-3 py-2 md:col-span-2"
              placeholder="Exercise"
              value={exercise}
              onChange={(e) => setExercise(e.target.value)}
              required
            />
            <input
              className="border rounded px-3 py-2"
              placeholder="Sets"
              value={sets}
              onChange={(e) => setSets(e.target.value)}
              inputMode="numeric"
            />
            <input
              className="border rounded px-3 py-2"
              placeholder="Reps"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              inputMode="numeric"
            />
            <input
              className="border rounded px-3 py-2"
              placeholder="Weight (kg)"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              inputMode="numeric"
            />
            <input
              className="border rounded px-3 py-2 md:col-span-5"
              placeholder="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <button className="px-4 py-2 rounded bg-blue-600 text-white md:col-span-1">
              Save
            </button>
          </form>
        </div>

        {/* List + Edit */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Workouts</h2>
          {workouts.length === 0 ? (
            <p className="text-sm text-gray-600">No workouts yet.</p>
          ) : (
            <ul className="space-y-3">
              {workouts.map((w) => (
                <li key={w.id} className="border rounded-lg p-4">
                  {editId === w.id ? (
                    <form onSubmit={saveEdit} className="grid grid-cols-1 md:grid-cols-6 gap-3">
                      <input
                        className="border rounded px-3 py-2"
                        type="date"
                        value={editData.date}
                        onChange={(e) => setEditData((v) => ({ ...v, date: e.target.value }))}
                      />
                      <input
                        className="border rounded px-3 py-2 md:col-span-2"
                        value={editData.exercise}
                        onChange={(e) => setEditData((v) => ({ ...v, exercise: e.target.value }))}
                      />
                      <input
                        className="border rounded px-3 py-2"
                        value={editData.sets}
                        onChange={(e) => setEditData((v) => ({ ...v, sets: e.target.value }))}
                        inputMode="numeric"
                      />
                      <input
                        className="border rounded px-3 py-2"
                        value={editData.reps}
                        onChange={(e) => setEditData((v) => ({ ...v, reps: e.target.value }))}
                        inputMode="numeric"
                      />
                      <input
                        className="border rounded px-3 py-2"
                        value={editData.weight}
                        onChange={(e) => setEditData((v) => ({ ...v, weight: e.target.value }))}
                        inputMode="numeric"
                      />
                      <input
                        className="border rounded px-3 py-2 md:col-span-5"
                        value={editData.notes}
                        onChange={(e) => setEditData((v) => ({ ...v, notes: e.target.value }))}
                      />
                      <div className="flex gap-2 md:col-span-1">
                        <button className="px-4 py-2 rounded bg-blue-600 text-white">Save</button>
                        <button type="button" onClick={cancelEdit} className="px-4 py-2 rounded bg-gray-200">
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {w.exercise} • {w.sets || 0} x {w.reps || 0} @ {w.weight || 0}kg
                        </p>
                        <p className="text-sm text-gray-600">
                          {w.date}
                          {w.notes ? ` — ${w.notes}` : ""}
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => startEdit(w)} className="text-blue-600 hover:underline">
                          Edit
                        </button>
                        <button onClick={() => deleteWorkout(user.uid, w.id)} className="text-red-600 hover:underline">
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Chart */}
        <VolumeChart data={volumeByDate} />
        <WeeklyWorkoutsChart data={workoutsPerWeek} />
      </div>
    </div>
  );
}
