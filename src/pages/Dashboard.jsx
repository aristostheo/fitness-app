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
import {
  addWorkoutPreset,
  subscribeWorkoutPresets,
  deleteWorkoutPreset,
} from "../services/presets";
import VolumeChart from "../components/VolumeChart";
import { ensureProfile, subscribeProfile, updateProfile } from "../services/profile";


// (Optional) If you added the weekly chart earlier:
// import WeeklyWorkoutsChart from "../components/WeeklyWorkoutsChart";

// --- date helpers ---
const kgToLb = (kg) => (kg ?? 0) * 2.2046226218;
const lbToKg = (lb) => (lb ?? 0) / 2.2046226218;

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

  // workout presets
  const [workoutPresets, setWorkoutPresets] = useState([]);
  const [newWOPresetName, setNewWOPresetName] = useState("");

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

  // guard
  useEffect(() => {
    if (from && to && from > to) setTo("");
  }, [from, to]);

  const [profile, setProfile] = useState(null);
  const unit = profile?.weightUnit === "lb" ? "lb" : "kg";

  useEffect(() => {
    if (!user) return;
    const unsubs = [];
    (async () => {
      await ensureProfile(user.uid);
      unsubs.push(subscribeProfile(user.uid, setProfile));
    })();
    return () => { for (const u of unsubs) try { typeof u === "function" && u(); } catch {} };
  }, [user]);


  // subscribe (workouts + presets) with bullet-proof cleanup
  useEffect(() => {
    if (!user) return;
    const unsubs = [];
    unsubs.push(subscribeWorkouts(user.uid, setWorkouts, { from, to }));
    unsubs.push(subscribeWorkoutPresets(user.uid, setWorkoutPresets));
    return () => {
      for (const u of unsubs) {
        try {
          typeof u === "function" && u();
        } catch {}
      }
    };
  }, [user, from, to]);

  const onAdd = async (e) => {
    e.preventDefault();
    if (!user) return;
    const weightKg = unit === "lb" ? lbToKg(Number(weight || 0)) : Number(weight || 0);
    await addWorkout(user.uid, {
      date, exercise,
      sets: Number(sets || 0),
      reps: Number(reps || 0),
      weight: weightKg, // ← store kg
      notes,
    });
    setExercise(""); setSets(""); setReps(""); setWeight(""); setNotes("");
  };


    const startEdit = (w) => {
      setEditId(w.id);
      setEditData({
        date: w.date || "",
        exercise: w.exercise || "",
        sets: w.sets ?? "",
        reps: w.reps ?? "",
        weight: unit === "lb" ? Math.round(kgToLb(w.weight) * 100) / 100 : (w.weight ?? ""),
        notes: w.notes || "",
      });
    };


  const saveEdit = async (e) => {
    e.preventDefault();
    await updateWorkout(user.uid, editId, {
      ...editData,
      sets: Number(editData.sets || 0),
      reps: Number(editData.reps || 0),
      weight: unit === "lb" ? lbToKg(Number(editData.weight || 0)) : Number(editData.weight || 0),
    });

    setEditId(null);
  };

  const cancelEdit = () => setEditId(null);

  const logout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  // chart data
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
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold">Workouts</h1>
              <p className="text-sm text-gray-600">Signed in as <b>{user?.email}</b></p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Weight:</span>
              <button
                type="button"
                className="px-3 py-1.5 rounded border bg-white hover:bg-gray-50"
                onClick={() => updateProfile(user.uid, { weightUnit: unit === "kg" ? "lb" : "kg" })}
                title="Toggle weight unit"
              >
                {unit.toUpperCase()}
              </button>
            </div>
            <input className="border rounded px-3 py-2" type="date" value={date} onChange={e=>setDate(e.target.value)} />
            <button onClick={logout} className="px-4 py-2 rounded bg-gray-800 text-white">Log out</button>
          </div>
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
              placeholder={`Weight (${unit})`}
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

            {/* Save current form as preset */}
            <div className="md:col-span-6 flex gap-2 items-center">
              <input
                className="border rounded px-3 py-2"
                placeholder="Preset name (e.g., Bench 5x5)"
                value={newWOPresetName}
                onChange={(e) => setNewWOPresetName(e.target.value)}
              />
              <button
                type="button"
                className="px-3 py-2 rounded bg-gray-700 text-white"
                onClick={async () => {
                  if (!user || !newWOPresetName.trim() || !exercise.trim()) return;
                  await addWorkoutPreset(user.uid, {
                    exercise: newWOPresetName.trim(), // display name for the preset
                    sets: Number(sets || 0),
                    reps: Number(reps || 0),
                    weight: Number(weight || 0),
                    notes,
                  });
                  setNewWOPresetName("");
                }}
              >
                Save as Preset
              </button>
            </div>

            {/* Quick add from presets */}
            <div className="md:col-span-6">
              <h3 className="text-sm font-medium mb-2">Quick add from presets</h3>
              {workoutPresets.length === 0 ? (
                <p className="text-sm text-gray-600">No workout presets yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {workoutPresets.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-2 border rounded-xl px-3 py-1.5 bg-white"
                    >
                      <button
                        type="button"
                        className="text-blue-600 hover:underline"
                        onClick={async () => {
                          if (!user) return;
                          await addWorkout(user.uid, {
                            date,
                            exercise: p.exercise,
                            sets: Number(p.sets || 0),
                            reps: Number(p.reps || 0),
                            weight: Number(p.weight || 0),
                            notes: p.notes || "",
                          });
                        }}
                      >
                        + {p.exercise}
                      </button>
                      <button
                        type="button"
                        className="text-red-600 hover:underline"
                        onClick={() => deleteWorkoutPreset(user.uid, p.id)}
                        aria-label={`Delete preset ${p.exercise}`}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
                        onChange={(e) =>
                          setEditData((v) => ({ ...v, date: e.target.value }))
                        }
                      />
                      <input
                        className="border rounded px-3 py-2 md:col-span-2"
                        value={editData.exercise}
                        onChange={(e) =>
                          setEditData((v) => ({ ...v, exercise: e.target.value }))
                        }
                      />
                      <input
                        className="border rounded px-3 py-2"
                        value={editData.sets}
                        onChange={(e) =>
                          setEditData((v) => ({ ...v, sets: e.target.value }))
                        }
                        inputMode="numeric"
                      />
                      <input
                        className="border rounded px-3 py-2"
                        value={editData.reps}
                        onChange={(e) =>
                          setEditData((v) => ({ ...v, reps: e.target.value }))
                        }
                        inputMode="numeric"
                      />
                      <input
                        className="border rounded px-3 py-2"
                        value={editData.weight}
                        onChange={(e) =>
                          setEditData((v) => ({ ...v, weight: e.target.value }))
                        }
                        inputMode="numeric"
                      />
                      <input
                        className="border rounded px-3 py-2 md:col-span-5"
                        value={editData.notes}
                        onChange={(e) =>
                          setEditData((v) => ({ ...v, notes: e.target.value }))
                        }
                      />
                      <div className="flex gap-2 md:col-span-1">
                        <button className="px-4 py-2 rounded bg-blue-600 text-white">
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="px-4 py-2 rounded bg-gray-200"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {w.exercise} • {w.sets || 0} x {w.reps || 0} @ {Math.round((unit==="lb" ? kgToLb(w.weight) : w.weight) || 0)}{unit}
                        </p>
                        <p className="text-sm text-gray-600">
                          {w.date}
                          {w.notes ? ` — ${w.notes}` : ""}
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => startEdit(w)}
                          className="text-blue-600 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteWorkout(user.uid, w.id)}
                          className="text-red-600 hover:underline"
                        >
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

        {/* Charts */}
        <VolumeChart data={volumeByDate} />
        {/* If you added the weekly chart earlier: */}
        {/* <WeeklyWorkoutsChart data={workoutsPerWeek} /> */}
      </div>
    </div>
  );
}
