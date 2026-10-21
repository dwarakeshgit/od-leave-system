# OD & Leave Desk

**Automated Student OD and Leave Approval with Attendance Integration** — a MERN web app that replaces WhatsApp-based OD/leave tracking with a proper request → approval → attendance pipeline.

A student applies for OD or leave. It goes to the class tutor, then the HOD. The moment the HOD approves, the attendance register updates itself: OD periods are credited as attended, leave is recorded as an excused absence. Every action is logged.

---

## What's inside

| Role | What they can do |
|---|---|
| **Student** | Apply for OD/leave (whole day or specific periods), attach proof, track the approval trail, see day-by-day attendance and their percentage |
| **Class tutor** | Approve or reject requests from their class, mark period-wise attendance, run class reports |
| **HOD** | Final approval for the department, see category-wise statistics |
| **Office (admin)** | Create accounts and classes, assign tutors, revert approved requests, read the activity log |

Key behaviours:

- **Approved requests lock the register.** A tutor cannot mark an OD student absent — those rows come in pre-filled and read-only.
- **Two percentages, always.** "With OD" (what students see) and "strict" (what a university audit wants).
- **Overlap protection.** A second request covering the same dates is rejected with the existing ticket number.
- **Reversible.** Cancelling an approved request cleanly removes the attendance entries it created.
- **Sundays are skipped** when counting working days.

---

## Tech stack

- **MongoDB** + Mongoose
- **Express** (REST API, JWT auth, multer file uploads)
- **React 18** + React Router + Axios
- **Vite** dev server with a proxy to the backend
- **Node.js** 18 or newer

---

## Setup on Windows (step by step)

### 1. Install Node.js

Download the **LTS** installer from [nodejs.org](https://nodejs.org) and run it. Leave every option at its default — the installer adds Node to your PATH automatically.

Open **Command Prompt** (press `Win + R`, type `cmd`, press Enter) and check:

```cmd
node -v
npm -v
```

Both should print a version number. If you get `'node' is not recognized`, close and reopen Command Prompt — a fresh window is needed to pick up the new PATH.

### 2. Install MongoDB

Download **MongoDB Community Server** from [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community). During installation:

- Choose **Complete** setup.
- Leave **"Install MongoDB as a Service"** ticked. This is what makes MongoDB start on its own every time Windows boots.
- Installing MongoDB Compass alongside is optional but useful — it gives you a visual browser for the data.

To confirm the service is running, open Command Prompt and run:

```cmd
sc query MongoDB
```

Look for `STATE : 4 RUNNING`. If it says stopped, start it with:

```cmd
net start MongoDB
```

(If Windows refuses, right-click Command Prompt and choose **Run as administrator**.)

You do **not** need to create a database by hand — the app creates `od_leave_system` on first connection.

### 3. Set up the backend

```cmd
cd od-leave-system\backend
npm install
```

Now create the environment file. A template is already there, so just copy it:

```cmd
copy .env.example .env
```

Open `.env` in Notepad and change `JWT_SECRET` to any long random string:

```
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/od_leave_system
JWT_SECRET=put_a_long_random_string_here
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
PERIODS_PER_DAY=8
```

### 4. Load the demo data

```cmd
npm run seed
```

This ensures a CSE department, one class section with 20 demo students, two weeks of realistic period-wise attendance (ranging from 65% to 98%), and sample requests at different approval stages. It prints the demo logins and attendance report when it finishes.

> The seed script is idempotent: running it repeatedly safely updates/inserts records without deleting accounts.

### 5. Start the backend

```cmd
npm run dev
```

Leave this window open. You should see `API running on http://localhost:5000`.

### 6. Start the frontend

Open a **second** Command Prompt window:

```cmd
cd od-leave-system\frontend
npm install
npm run dev
```

Open <http://localhost:5173> in your browser.

Both windows need to stay open while you use the app. Press `Ctrl + C` in either window to stop that server.

---

## Demo logins

The login screen has buttons that fill these in for you.

| Role | Email | Password |
|---|---|---|
| Student | `21cs001@college.edu` | `student123` |
| Class tutor | `tutor@college.edu` | `tutor123` |
| HOD | `hod@college.edu` | `hod123` |
| Office | `admin@college.edu` | `admin123` |

Students `21cs001` through `21cs020` all exist with the password `student123`.

---

## Try the full flow in two minutes

1. Sign in as the **student** and apply for an OD — pick a symposium, tomorrow's date, whole day.
2. Sign out, sign in as the **tutor**. The request is in Approvals with a badge in the sidebar. Add a note and choose *Verify and send to HOD*.
3. Sign in as the **HOD** and approve it. The confirmation tells you how many days of attendance were updated.
4. Back as the **tutor**, open *Mark attendance*, pick that date. The student's row is locked and stamped "On duty (approved)" — you cannot mark them absent.
5. Sign in as the **student** again and open *My attendance*. The day shows `OD` in every period and the percentage has moved.

---

## Project structure

```
od-leave-system/
├── backend/
│   ├── src/
│   │   ├── config/db.js              MongoDB connection
│   │   ├── models/
│   │   │   ├── User.js               Students, tutors, HODs, admins
│   │   │   ├── Department.js
│   │   │   ├── ClassSection.js       Class, its tutor, periods/day, min %
│   │   │   ├── Request.js            OD/leave with a two-stage approval chain
│   │   │   ├── Attendance.js         One document per student per day
│   │   │   ├── Notification.js
│   │   │   └── AuditLog.js
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── requestController.js  Apply, approve, reject, withdraw
│   │   │   ├── attendanceController.js
│   │   │   ├── adminController.js
│   │   │   └── dashboardController.js
│   │   ├── middleware/               auth (JWT), upload (multer), error
│   │   ├── utils/
│   │   │   ├── attendanceSync.js     The engine: apply / revert / summarise
│   │   │   ├── dates.js              UTC day normalisation, working days
│   │   │   └── seed.js               Demo data
│   │   ├── routes/
│   │   └── server.js
│   └── uploads/                      Proof documents land here
└── frontend/
    ├── src/
    │   ├── api/client.js             Axios with the token interceptor
    │   ├── context/AuthContext.jsx
    │   ├── components/
    │   │   ├── Layout.jsx            Role-aware sidebar
    │   │   ├── RequestEntry.jsx      A request with its approval trail
    │   │   ├── AttendanceRuler.jsx   The percentage as a ruled scale
    │   │   ├── Stamp.jsx
    │   │   └── ProtectedRoute.jsx
    │   ├── pages/                    13 pages
    │   └── styles.css
    └── vite.config.js                Proxies /api and /uploads to :5000
```

---

## API reference

All routes are under `/api`. Everything except login needs `Authorization: Bearer <token>`.

### Auth
| Method | Route | Who | Purpose |
|---|---|---|---|
| POST | `/auth/login` | anyone | Sign in, returns a token |
| GET | `/auth/me` | any signed-in user | Current profile |
| PUT | `/auth/password` | any signed-in user | Change password |

### Requests
| Method | Route | Who | Purpose |
|---|---|---|---|
| POST | `/requests` | student | Apply (multipart, optional `attachment`) |
| GET | `/requests` | all | List, scoped by role. Filters: `status`, `type`, `from`, `to`, `q` |
| GET | `/requests/pending` | tutor, HOD | The approval inbox |
| GET | `/requests/:id` | all | One request |
| PUT | `/requests/:id/decision` | tutor, HOD, admin | `{ decision: "approved" \| "rejected", comment }` |
| PUT | `/requests/:id/cancel` | owner, admin | Withdraw; an admin doing this to an approved request also reverts the attendance |

### Attendance
| Method | Route | Who | Purpose |
|---|---|---|---|
| GET | `/attendance/me` | student | Own summary and daily register |
| GET | `/attendance/roster` | staff | Class list for one date + period, with locked rows flagged |
| POST | `/attendance/mark` | staff | Save a period. Auto entries are skipped and reported back |
| GET | `/attendance/student/:id` | staff | One student's record |
| GET | `/attendance/report` | staff | Class report |
| GET | `/attendance/report.csv` | staff | Same report as a CSV download |

### Admin
| Method | Route | Who |
|---|---|---|
| GET/POST/PUT/DELETE | `/admin/users` | admin (staff can read) |
| GET/POST | `/admin/departments` | admin |
| GET/POST/PUT | `/admin/classes` | admin (staff can read their own) |
| GET | `/admin/audit` | admin |

### Other
`GET /api/dashboard` returns role-specific statistics. `GET /api/notifications` and `PUT /api/notifications/read` handle in-app updates. `GET /api/health` is a plain uptime check.

---

## How the attendance integration works

The logic lives in `backend/src/utils/attendanceSync.js`.

Each period in an attendance document carries a `source` field:

- `faculty` — typed in by a teacher on the Mark attendance page.
- `auto` — written by an approved request, with a reference back to that request.

When a request is approved, `applyRequestToAttendance()` walks every working day in the range and writes `od` or `leave` into the chosen periods (or all periods, for a whole-day request), overwriting any faculty entry that was already there. The approved request is the higher authority.

Going the other way, `markAttendance` refuses to touch a period whose source is `auto`, and tells the caller how many students it skipped. That's the guarantee that an approved OD can never be silently turned into an absence.

`revertRequestFromAttendance()` finds every period tagged with the request's id and removes it, deleting the day's document if nothing is left.

`summarise()` produces both percentages: `percentageWithOd` counts `present + od` as attended, `percentageStrict` counts only `present`.

---

## Common problems

**`MongooseServerSelectionError` / "Could not connect to MongoDB"**
The MongoDB service isn't running. Run `net start MongoDB` in an administrator Command Prompt.

**Port 5000 is already in use**
Something else has the port. Change `PORT` in `.env` to `5001`, then update the two `target` values in `frontend/vite.config.js` to match.

**The frontend loads but every request fails**
The backend window probably isn't running, or it crashed. Check that window for a red error.

**`'npm' is not recognized`**
Node isn't on your PATH. Close Command Prompt and open a fresh one. If it still fails, reinstall Node.js with the default options.

**Uploaded proof won't open**
Files are served from `backend/uploads`. If you moved or deleted that folder, recreate it — the server makes it on startup, so restarting the backend also fixes this.

---

## Building for production

```cmd
cd od-leave-system\frontend
npm run build
```

This produces `frontend/dist`. Serve it with any static host, or add `express.static` to `server.js` pointing at that folder. Before deploying, set a strong `JWT_SECRET`, set `NODE_ENV=production` so stack traces stop leaking into API errors, and point `MONGO_URI` at your production database.
