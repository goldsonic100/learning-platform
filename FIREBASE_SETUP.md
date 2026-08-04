# Firebase Setup Guide for Pebblio Academy

## Why Firebase?

The original system stored all data in browser localStorage, which only works on a single device. With Firebase Realtime Database, teachers can create classes on one device, and students can join from ANY device using the class code.

## Quick Setup (5 minutes)

### Step 1: Create a Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project"
3. Name it `pebblio-academy`
4. Click "Create Project"
5. Wait for the project to load

### Step 2: Enable Realtime Database
1. In the Firebase Console, go to **Build** → **Realtime Database**
2. Click **Create Database**
3. Choose location (closest to you)
4. Start in **Test Mode** (for development only — you'll need rules for production)
5. Click **Enable**

### Step 3: Get Your Configuration
1. Go to **Project Settings** (⚙️ icon, top-left)
2. Click **Your Apps** section
3. Click **Firebase SDK snippet**
4. Copy the config object

### Step 4: Update `firebase-config.js`
1. Open `firebase-config.js`
2. Replace this section with your config:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "1:YOUR_APP_ID:web:YOUR_WEB_APP_ID"
};
```

### Step 5: Add Firebase SDK to Your HTML

Add these lines to your `<head>` (already added to index.html):

```html
<script src="https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js"></script>
```

### Step 6: Update Your HTML Files

Add Firebase scripts to the `<head>` of these files:
- `index.html` ✓ (already updated)
- `login.html`
- `signup.html`
- `dashboard.html`
- `teacher.html`
- `parent.html`
- `admin.html`

Add this to each file's `<head>`:

```html
<script src="https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js"></script>
```

Add this to each file's `<body>` at the end (before closing `</body>`):

```html
<script src="firebase-config.js"></script>
<script src="classroom-sync.js"></script>
```

## How It Works

### Local Mode (Original)
```
Teacher (Device A) → localStorage → [Data only on Device A]
Student (Device B) → localStorage → [Can't see Teacher's data]
❌ Student can't join class
```

### Firebase Mode (New)
```
Teacher (Device A) → Firebase DB ← Student (Device B)
Teacher (Device C) → Firebase DB ← Student (Device D)
Everyone sees the same classes! ✓
```

## Using the System

### For Development

Data automatically syncs to Firebase Realtime Database. You don't need to change any code in `dashboard.html` or `teacher.html` — they work the same way!

The old localStorage functions are still there as a fallback. If Firebase is unavailable, the app will still work locally.

### Switching Between Modes

If you want to test in local-only mode:

```javascript
// In any JavaScript file:
setSyncMode('local');  // Use localStorage only
setSyncMode('firebase'); // Use Firebase (default)
```

## Production Security Rules

**WARNING**: Test Mode allows anyone to read/write all data. For production, set up proper security rules.

In Firebase Console → **Realtime Database** → **Rules**, replace with:

```json
{
  "rules": {
    "classes": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "courses": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "assignments": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "grades": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "messages": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

## Troubleshooting

### "Firebase is not defined"
- Make sure Firebase scripts are loaded BEFORE `firebase-config.js`
- Check browser console (F12) for errors

### Data not syncing
- Check that `SYNC_MODE` is set to `'firebase'`
- Open Firebase Console and look at the database — is data there?
- Check browser console for network errors

### Class code not found when joining
- Make sure the teacher's class is actually in Firebase
- Try refreshing the page
- Check that both users are using the same Firebase project

## Next Steps

1. ✓ Set up Firebase project
2. ✓ Update configuration
3. ✓ Add scripts to HTML files
4. ✓ Test: Teacher creates class → Student joins from different device
5. Test cross-browser sync (open two browser windows, one logged in as teacher, one as student)

## Questions?

Check the Firebase docs: https://firebase.google.com/docs/database/web/start
