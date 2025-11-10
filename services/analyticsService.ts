// services/analyticsService.ts
import { doc, setDoc, addDoc, collection, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';

let heartbeatTimer: any = null;

export const initTelemetry = async (language: string) => {
  try {
    // Anonymous visitor id persisted in localStorage
    let anonId = localStorage.getItem('anonId');
    if (!anonId) {
      anonId = `anon_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem('anonId', anonId);
      await setDoc(doc(db, 'anon_users', anonId), {
        firstSeen: serverTimestamp(),
      }, { merge: true });
    }

    // Create session doc
    const sessionRef = await addDoc(collection(db, 'sessions'), {
      anonId,
      userId: auth.currentUser?.uid || null,
      userEmail: auth.currentUser?.email || null,
      ua: navigator.userAgent,
      lang: language,
      startAt: serverTimestamp(),
      lastActive: serverTimestamp(),
      durationSecs: 0,
    });

    const sessionId = sessionRef.id;
    // Save in memory to update
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    const startMs = Date.now();
    heartbeatTimer = setInterval(async () => {
      try {
        const dur = Math.floor((Date.now() - startMs) / 1000);
        await updateDoc(sessionRef, { lastActive: serverTimestamp(), durationSecs: dur });
      } catch {}
    }, 15000);

    // On unload, try a last update
    const onUnload = () => {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
    };
    window.addEventListener('beforeunload', onUnload);
  } catch (e) {
    console.warn('Telemetry init failed', e);
  }
};
