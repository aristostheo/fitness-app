import {
  collection, addDoc, onSnapshot, query, where, orderBy, deleteDoc, doc,
  serverTimestamp, updateDoc, limit, getDocs
} from "firebase/firestore";
import { db } from "../firebaseConfig";

// Flat collections make querying easy
const foodsCol     = (uid) => collection(db, "users", uid, "nutritionEntries"); // foods for a date
const exerciseCol  = (uid) => collection(db, "users", uid, "exerciseEntries");  // exercise for a date

// ---- FOOD ENTRIES ----
export async function addFood(uid, food) {
  // food: { date:'YYYY-MM-DD', meal:'breakfast|lunch|dinner|snacks', name, calories, protein, carbs, fat, sugar, fiber, qty, unit }
  return addDoc(foodsCol(uid), { ...food, createdAt: serverTimestamp() });
}

export async function updateFood(uid, id, patch) {
  return updateDoc(doc(db, "users", uid, "nutritionEntries", id), patch);
}

export async function deleteFood(uid, id) {
  return deleteDoc(doc(db, "users", uid, "nutritionEntries", id));
}

export function subscribeFoodsByDate(uid, date, cb) {
  const q = query(foodsCol(uid), where("date", "==", date), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}

// Recent distinct foods to power suggestions/autocomplete
export async function getRecentFoods(uid, take = 25) {
  const q = query(foodsCol(uid), orderBy("createdAt", "desc"), limit(take));
  const snap = await getDocs(q);
  // dedupe by name
  const seen = new Set();
  const items = [];
  snap.forEach(docu => {
    const f = docu.data();
    if (!seen.has(f.name)) { seen.add(f.name); items.push(f); }
  });
  return items;
}

// ---- EXERCISE ENTRIES ----
export async function addExercise(uid, entry) {
  // entry: { date:'YYYY-MM-DD', name, calories }  // calories burned (we'll subtract from net)
  return addDoc(exerciseCol(uid), { ...entry, createdAt: serverTimestamp() });
}

export function subscribeExerciseByDate(uid, date, cb) {
  const q = query(exerciseCol(uid), where("date","==",date), orderBy("createdAt","desc"));
  return onSnapshot(q, (snap) => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}

export async function deleteExercise(uid, id) {
  return deleteDoc(doc(db, "users", uid, "exerciseEntries", id));
}
