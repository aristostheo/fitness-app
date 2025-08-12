import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  addFood, subscribeFoodsByDate, deleteFood, updateFood,
  getRecentFoods,
  addExercise, subscribeExerciseByDate, deleteExercise
} from "../services/nutrition";

const MEALS = ["breakfast","lunch","dinner","snacks"];
const todayStr = () => new Date().toISOString().slice(0,10);

export default function Nutrition() {
  const { user } = useAuth();
  const [date, setDate] = useState(todayStr());
  const [foods, setFoods] = useState([]);
  const [recent, setRecent] = useState([]);
  const [exercise, setExercise] = useState([]);

  // add food form
  const [meal, setMeal] = useState("breakfast");
  const [name, setName] = useState("");
  const [qty, setQty] = useState(1);
  const [unit, setUnit] = useState("serving");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [sugar, setSugar] = useState("");
  const [fiber, setFiber] = useState("");

  // edit state
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({ name:"", qty:1, unit:"serving", calories:"", protein:"", carbs:"", fat:"", sugar:"", fiber:"" });

  // exercise form
  const [exName, setExName] = useState("");
  const [exCalories, setExCalories] = useState("");

  useEffect(() => {
    if (!user) return;
    const unsubs = [];
    unsubs.push(subscribeFoodsByDate(user.uid, date, setFoods));
    unsubs.push(subscribeExerciseByDate(user.uid, date, setExercise));
    return () => {
    for (const u of unsubs) {
      try { typeof u === "function" && u(); } catch {}
    }
    };
  }, [user, date]);
  
  useEffect(() => {
    if (!user) return;
    getRecentFoods(user.uid, 40).then(setRecent);
  }, [user]);

  // Suggestions based on typing
  const suggestions = useMemo(() => {
    const q = name.trim().toLowerCase();
    if (!q) return [];
    return recent
      .filter(f => f.name && f.name.toLowerCase().includes(q))
      .slice(0,7);
  }, [name, recent]);

  const onPickSuggestion = (f) => {
    setName(f.name || "");
    setCalories(f.calories ?? "");
    setProtein(f.protein ?? "");
    setCarbs(f.carbs ?? "");
    setFat(f.fat ?? "");
    setSugar(f.sugar ?? "");
    setFiber(f.fiber ?? "");
    setQty(f.qty ?? 1);
    setUnit(f.unit ?? "serving");
  };

  const resetFoodForm = () => {
    setMeal("breakfast"); setName(""); setQty(1); setUnit("serving");
    setCalories(""); setProtein(""); setCarbs(""); setFat(""); setSugar(""); setFiber("");
  };

  const addFoodSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    await addFood(user.uid, {
      date, meal, name,
      qty: Number(qty || 1), unit,
      calories: Number(calories || 0),
      protein: Number(protein || 0),
      carbs: Number(carbs || 0),
      fat: Number(fat || 0),
      sugar: Number(sugar || 0),
      fiber: Number(fiber || 0),
    });
    resetFoodForm();
    // refresh suggestions in case it's new
    getRecentFoods(user.uid, 40).then(setRecent);
  };

  const mealsMap = useMemo(() => {
    const m = { breakfast:[], lunch:[], dinner:[], snacks:[] };
    foods.forEach(f => { (m[f.meal] ||= []).push(f); });
    return m;
  }, [foods]);

  const totals = useMemo(() => {
    const t = { calories:0, protein:0, carbs:0, fat:0, sugar:0, fiber:0 };
    foods.forEach(f => {
      t.calories += f.calories || 0;
      t.protein  += f.protein  || 0;
      t.carbs    += f.carbs    || 0;
      t.fat      += f.fat      || 0;
      t.sugar    += f.sugar    || 0;
      t.fiber    += f.fiber    || 0;
    });
    const ex = exercise.reduce((s,e)=> s + (e.calories || 0), 0);
    return { ...t, exercise: ex, net: t.calories - ex };
  }, [foods, exercise]);

  const onSaveEdit = async (e) => {
    e.preventDefault();
    await updateFood(user.uid, editId, {
      ...editData,
      qty: Number(editData.qty || 1),
      calories: Number(editData.calories || 0),
      protein: Number(editData.protein || 0),
      carbs: Number(editData.carbs || 0),
      fat: Number(editData.fat || 0),
      sugar: Number(editData.sugar || 0),
      fiber: Number(editData.fiber || 0),
    });
    setEditId(null);
  };

  const addExerciseSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    await addExercise(user.uid, {
      date, name: exName, calories: Number(exCalories || 0)
    });
    setExName(""); setExCalories("");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow p-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Nutrition</h1>
          <input className="border rounded px-3 py-2" type="date" value={date} onChange={e=>setDate(e.target.value)} />
        </div>

        {/* Day summary */}
        <div className="bg-white rounded-xl shadow p-6 grid grid-cols-2 md:grid-cols-6 gap-3">
          <SummaryCard label="Calories" value={totals.calories} />
          <SummaryCard label="Protein (g)" value={totals.protein} />
          <SummaryCard label="Carbs (g)" value={totals.carbs} />
          <SummaryCard label="Fat (g)" value={totals.fat} />
          <SummaryCard label="Exercise (-kcal)" value={totals.exercise} />
          <SummaryCard label="Net (kcal)" value={totals.net} />
        </div>

        {/* Add food */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Add Food</h2>
          <form onSubmit={addFoodSubmit} className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <select className="border rounded px-3 py-2" value={meal} onChange={e=>setMeal(e.target.value)}>
              {MEALS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <div className="md:col-span-2 relative">
              <input className="border rounded px-3 py-2 w-full" placeholder="Food name" value={name} onChange={e=>setName(e.target.value)} />
              {suggestions.length > 0 && (
                <div className="absolute z-10 bg-white border rounded mt-1 w-full max-h-48 overflow-auto">
                  {suggestions.map((s,i)=>(
                    <button
                      type="button"
                      key={i}
                      onClick={()=>onPickSuggestion(s)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50"
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input className="border rounded px-3 py-2" placeholder="Qty" value={qty} onChange={e=>setQty(e.target.value)} inputMode="numeric" />
            <input className="border rounded px-3 py-2" placeholder="Unit (g, ml, serving)" value={unit} onChange={e=>setUnit(e.target.value)} />
            <input className="border rounded px-3 py-2" placeholder="Calories" value={calories} onChange={e=>setCalories(e.target.value)} inputMode="numeric" />
            <input className="border rounded px-3 py-2" placeholder="Protein (g)" value={protein} onChange={e=>setProtein(e.target.value)} inputMode="numeric" />
            <input className="border rounded px-3 py-2" placeholder="Carbs (g)" value={carbs} onChange={e=>setCarbs(e.target.value)} inputMode="numeric" />
            <input className="border rounded px-3 py-2" placeholder="Fat (g)" value={fat} onChange={e=>setFat(e.target.value)} inputMode="numeric" />
            <input className="border rounded px-3 py-2" placeholder="Sugar (g)" value={sugar} onChange={e=>setSugar(e.target.value)} inputMode="numeric" />
            <input className="border rounded px-3 py-2" placeholder="Fiber (g)" value={fiber} onChange={e=>setFiber(e.target.value)} inputMode="numeric" />
            <button className="px-4 py-2 rounded bg-blue-600 text-white md:col-span-1">Add</button>
          </form>
        </div>

        {/* Meals */}
        {MEALS.map(m => (
          <MealSection
            key={m}
            title={m}
            items={(mealsMap[m] || [])}
            onEdit={(item)=>{ setEditId(item.id); setEditData({
              name: item.name || "", qty: item.qty ?? 1, unit: item.unit || "serving",
              calories: item.calories ?? "", protein: item.protein ?? "",
              carbs: item.carbs ?? "", fat: item.fat ?? "", sugar: item.sugar ?? "", fiber: item.fiber ?? ""
            });}}
            onDelete={(id)=>deleteFood(user.uid, id)}
            editingId={editId}
            editData={editData}
            setEditData={setEditData}
            onSaveEdit={onSaveEdit}
            onCancel={()=>setEditId(null)}
          />
        ))}

        {/* Exercise */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Exercise (calories burned)</h2>
          <form onSubmit={addExerciseSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <input className="border rounded px-3 py-2 md:col-span-2" placeholder="Exercise name (e.g., Running)" value={exName} onChange={e=>setExName(e.target.value)} />
            <input className="border rounded px-3 py-2" placeholder="Calories burned" value={exCalories} onChange={e=>setExCalories(e.target.value)} inputMode="numeric" />
            <button className="px-4 py-2 rounded bg-emerald-600 text-white">Add</button>
          </form>
          {exercise.length === 0 ? (
            <p className="text-sm text-gray-600">No exercise logged.</p>
          ) : (
            <ul className="space-y-2">
              {exercise.map(x => (
                <li key={x.id} className="flex items-center justify-between border rounded px-3 py-2">
                  <span>{x.name} — {x.calories} kcal</span>
                  <button onClick={()=>deleteExercise(user.uid, x.id)} className="text-red-600 hover:underline">Delete</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="border rounded-lg p-4">
      <p className="text-xs uppercase text-gray-500">{label}</p>
      <p className="text-xl font-semibold">{Math.round(value || 0)}</p>
    </div>
  );
}

function MealSection({ title, items, onEdit, onDelete, editingId, editData, setEditData, onSaveEdit, onCancel }) {
  const mealTotals = useMemo(() => {
    const t = { calories:0, protein:0, carbs:0, fat:0 };
    items.forEach(i => {
      t.calories += i.calories || 0;
      t.protein  += i.protein  || 0;
      t.carbs    += i.carbs    || 0;
      t.fat      += i.fat      || 0;
    });
    return t;
  }, [items]);

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold capitalize">{title}</h3>
        <div className="text-sm text-gray-600">
          {Math.round(mealTotals.calories)} kcal • P {Math.round(mealTotals.protein)} • C {Math.round(mealTotals.carbs)} • F {Math.round(mealTotals.fat)}
        </div>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-600">No items.</p>
      ) : (
        <ul className="space-y-2">
          {items.map(it => (
            <li key={it.id} className="border rounded px-3 py-2">
              {editingId === it.id ? (
                <form onSubmit={onSaveEdit} className="grid grid-cols-1 md:grid-cols-6 gap-2">
                  <input className="border rounded px-2 py-1 md:col-span-2" value={editData.name} onChange={e=>setEditData(v=>({...v, name:e.target.value}))} />
                  <input className="border rounded px-2 py-1" value={editData.qty} onChange={e=>setEditData(v=>({...v, qty:e.target.value}))} inputMode="numeric" />
                  <input className="border rounded px-2 py-1" value={editData.unit} onChange={e=>setEditData(v=>({...v, unit:e.target.value}))} />
                  <input className="border rounded px-2 py-1" placeholder="kcal" value={editData.calories} onChange={e=>setEditData(v=>({...v, calories:e.target.value}))} inputMode="numeric" />
                  <div className="md:col-span-6 grid grid-cols-3 gap-2">
                    <input className="border rounded px-2 py-1" placeholder="P" value={editData.protein} onChange={e=>setEditData(v=>({...v, protein:e.target.value}))} inputMode="numeric" />
                    <input className="border rounded px-2 py-1" placeholder="C" value={editData.carbs} onChange={e=>setEditData(v=>({...v, carbs:e.target.value}))} inputMode="numeric" />
                    <input className="border rounded px-2 py-1" placeholder="F" value={editData.fat} onChange={e=>setEditData(v=>({...v, fat:e.target.value}))} inputMode="numeric" />
                  </div>
                  <div className="md:col-span-6 grid grid-cols-2 gap-2">
                    <input className="border rounded px-2 py-1" placeholder="Sugar" value={editData.sugar} onChange={e=>setEditData(v=>({...v, sugar:e.target.value}))} inputMode="numeric" />
                    <input className="border rounded px-2 py-1" placeholder="Fiber" value={editData.fiber} onChange={e=>setEditData(v=>({...v, fiber:e.target.value}))} inputMode="numeric" />
                  </div>
                  <div className="flex gap-2 md:col-span-6">
                    <button className="px-3 py-1.5 rounded bg-blue-600 text-white">Save</button>
                    <button type="button" onClick={onCancel} className="px-3 py-1.5 rounded bg-gray-200">Cancel</button>
                  </div>
                </form>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{it.name} — {it.qty || 1} {it.unit || "serving"} • {Math.round(it.calories || 0)} kcal</div>
                    <div className="text-sm text-gray-600">P {Math.round(it.protein||0)} • C {Math.round(it.carbs||0)} • F {Math.round(it.fat||0)}</div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={()=>onEdit(it)} className="text-blue-600 hover:underline">Edit</button>
                    <button onClick={()=>onDelete(it.id)} className="text-red-600 hover:underline">Delete</button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
