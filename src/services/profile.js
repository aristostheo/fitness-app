import { doc, getDoc, setDoc, onSnapshot, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

const profileDoc = (uid) => doc(db, "users", uid, "meta", "profile");

export async function ensureProfile(uid) {
  const ref = profileDoc(uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      dailyCaloriesTarget: 2200,
      dailyProteinTarget: 130,
      weightUnit: "kg",   // ← default
    });
  }
}

export function subscribeProfile(uid, cb) {
  return onSnapshot(profileDoc(uid), (snap) => cb(snap.exists() ? { id: snap.id, ...snap.data() } : null));
}

export async function updateProfile(uid, patch) {
  return updateDoc(profileDoc(uid), { ...patch, updatedAt: serverTimestamp() });
}
