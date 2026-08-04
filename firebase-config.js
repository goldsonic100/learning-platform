/* ============================================================
   Firebase Configuration & Initialization
   Syncs classroom data (classes, courses, assignments, grades, messages)
   across devices in real-time.
============================================================ */

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDemoKey123456789",
  authDomain: "pebblio-academy.firebaseapp.com",
  projectId: "pebblio-academy",
  storageBucket: "pebblio-academy.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// Initialize Firebase (if not already initialized)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.database();

/* ============================================================
   SYNC MODE: Choose where data is stored
   'local' = localStorage only (original, works on same device)
   'firebase' = Firebase Realtime DB (works across devices)
============================================================ */

let SYNC_MODE = 'firebase';

function setSyncMode(mode) {
  if (['local', 'firebase'].includes(mode)) {
    SYNC_MODE = mode;
    console.log(`Sync mode set to: ${SYNC_MODE}`);
  }
}

function getSyncMode() {
  return SYNC_MODE;
}

/* ============================================================
   FIREBASE SYNC FUNCTIONS
   These replace/supplement the localStorage-only functions
============================================================ */

const FIREBASE_PATHS = {
  classes: 'classes',
  courses: 'courses',
  assignments: 'assignments',
  grades: 'grades',
  messages: 'messages',
  users: 'users'
};

// Read from Firebase
async function firebaseRead(path) {
  try {
    const snapshot = await db.ref(path).once('value');
    return snapshot.val() || [];
  } catch (error) {
    console.error(`Firebase read error at ${path}:`, error);
    return [];
  }
}

// Write to Firebase
async function firebaseWrite(path, data) {
  try {
    await db.ref(path).set(data);
    return true;
  } catch (error) {
    console.error(`Firebase write error at ${path}:`, error);
    return false;
  }
}

// Merge data (for appending to arrays)
async function firebaseUpdate(path, data) {
  try {
    await db.ref(path).update(data);
    return true;
  } catch (error) {
    console.error(`Firebase update error at ${path}:`, error);
    return false;
  }
}

// Real-time listener for a path
function onFirebaseChange(path, callback) {
  return db.ref(path).on('value', (snapshot) => {
    callback(snapshot.val() || []);
  });
}

// Remove listener
function offFirebaseChange(path) {
  db.ref(path).off();
}
