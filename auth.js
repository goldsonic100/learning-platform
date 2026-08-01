/* ============================================================
   Pebblio account system
   Runs entirely in the browser using localStorage — there is no
   backend/database yet, so accounts only exist on the device/
   browser that created them. Good enough for a demo, not for a
   real multi-device product.
   ============================================================ */

const USERS_KEY = 'pebblio_users';
const SESSION_KEY = 'pebblio_current_user';

/* ---------- low level storage ---------- */

function getUsers(){
  try{
    return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
  }catch(e){
    return [];
  }
}

function saveUsers(users){
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getCurrentUser(){
  const uid = localStorage.getItem(SESSION_KEY);
  if(!uid) return null;
  return getUsers().find(u => u.userId === uid) || null;
}

function setCurrentUser(userId){
  localStorage.setItem(SESSION_KEY, userId);
}

function logout(){
  localStorage.removeItem(SESSION_KEY);
  window.location.href = 'index.html';
}

function dashboardUrlFor(role){
  if(role === 'teacher') return 'teacher.html';
  if(role === 'parent') return 'parent.html';
  return 'dashboard.html';
}

function saveUser(updatedUser, previousUserId = null){
  const matchId = previousUserId || updatedUser.userId;
  const users = getUsers().map(u => u.userId === matchId ? updatedUser : u);
  saveUsers(users);
}

/* ---------- password hashing (real SHA-256, done client-side) ----------
   This is a real cryptographic hash using the browser's built-in
   Web Crypto API — no fake string. That said, since it's stored in
   localStorage (readable via dev tools), this is still only a demo
   of the concept, not production-grade auth security. */

async function sha256Hex(message){
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/* ---------- user ID rules ----------
   lowercase letters, numbers, underscores only. No spaces, no
   punctuation, no emoji "shenanigans". */

function isValidUserIdFormat(id){
  return /^[a-z0-9_]+$/.test(id);
}

function isUserIdTaken(id, exceptUserId = null){
  return getUsers().some(u => u.userId === id && u.userId !== exceptUserId);
}

function isEmailTaken(email){
  const normalized = email.trim().toLowerCase();
  return getUsers().some(u => u.email.trim().toLowerCase() === normalized);
}

function slugifyUserId(base){
  let slug = base.toLowerCase().trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
  if(!slug) slug = 'user';
  let candidate = slug;
  let n = 1;
  while(isUserIdTaken(candidate)){
    n++;
    candidate = `${slug}_${n}`;
  }
  return candidate;
}

/* ---------- account creation ---------- */

async function createAccount({ username, email, password, role, firstName, lastName, schoolOrg }){
  if(isEmailTaken(email)){
    throw new Error('EMAIL_TAKEN');
  }

  const userId = slugifyUserId(username);
  const passwordHash = await sha256Hex(password);
  const today = new Date().toISOString();

  const user = {
    userId,
    username,
    email,
    passwordHash,
    role,
    createdAt: today,
    verified: true,          // true because they completed the email code step
    profilePicture: '',      // optional image URL, empty = show initials avatar
    status: 'Active',

    firstName: firstName || '',
    lastName: lastName || '',
    schoolOrg: schoolOrg || '',
    birthday: '',            // optional, added later from the dashboard

    xp: 0,
    level: 1,
    coins: 0,
    streak: 0,
    lastActiveDate: '',      // yyyy-mm-dd of last completed activity
    totalLearningMinutes: 0,
    recentActivity: []       // log of completed demo/real lessons, newest first
  };

  const users = getUsers();
  users.push(user);
  saveUsers(users);
  setCurrentUser(userId);
  return user;
}

/* ---------- gamification ---------- */

function levelFromXP(xp){
  return Math.floor(xp / 100) + 1;
}

function xpIntoLevel(xp){
  return xp % 100;
}

function todayString(){
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function yesterdayString(){
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

/* Call this whenever a user genuinely finishes a course / trainer / test.
   It's the only thing that should ever add XP, coins, learning time,
   or move the streak — nothing here should fire just for visiting a page. */
function completeActivity(user, { minutes = 15, xpGain = 25, coinGain = 10 } = {}){
  user.xp += xpGain;
  user.level = levelFromXP(user.xp);
  user.coins += coinGain;
  user.totalLearningMinutes += minutes;

  const today = todayString();
  if(user.lastActiveDate === today){
    // already completed something today — streak doesn't change again
  } else if(user.lastActiveDate === yesterdayString()){
    user.streak += 1;
  } else {
    user.streak = 1; // missed a day (or first ever activity) — restart streak
  }
  user.lastActiveDate = today;

  saveUser(user);
  return user;
}

/* ---------- nav bar swap ----------
   On pages with the normal Log In / Sign Up buttons, call this on
   load. If someone's logged in, it swaps those buttons for
   Dashboard / Logout instead. */

function wireAuthNav(){
  const user = getCurrentUser();
  if(!user) return;

  document.querySelectorAll('[data-auth-actions]').forEach(container => {
    container.innerHTML = `
      <a href="dashboard.html" class="btn btn--ghost">Dashboard</a>
      <button class="btn btn--solid" id="navLogoutBtn">Logout</button>
    `;
    const btn = container.querySelector('#navLogoutBtn');
    if(btn) btn.addEventListener('click', logout);
  });
}

document.addEventListener('DOMContentLoaded', wireAuthNav);
