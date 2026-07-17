# School Management Platform — Demo

A demo app with two separate portals — **Staff** and **Student** — scoped by department.

- Staff upload PDF/DOCX documents visible only to students in their own department.
- Students view/download those documents, and upload their own submissions.
- Staff can view every student in their department and each student's submitted files.
- **Assessments:** staff can mark a document (test questions, an assignment) as needing a submission back, with an optional due date. Staff then see, per assessment, who submitted on time, who was **late**, and who is **missing** entirely.
- Everything is isolated by department: staff/students only ever see their own department's people and files.

## Tech used (kept simple for a demo)
- **Backend:** Node.js, Express, SQLite (via `better-sqlite3` — no separate database server to install), JWT auth, Multer for file uploads.
- **Frontend:** React (Vite), React Router, Axios.

The SQLite database is a single file (`backend/school.db`) created automatically the first time you run the server — nothing to install or configure.

## Prerequisites
- Node.js v18 or later (includes npm) — check with `node -v`

## Project Structure
```
school-management-demo/
  backend/     → Express API + SQLite database + file storage
  frontend/    → React app (Vite)
```

## 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
npm start
```

You should see:
```
Seeded demo departments and demo staff/student accounts (password: password123)
Backend server running on http://localhost:5000
```

This automatically:
- Creates `school.db` (SQLite file)
- Seeds 4 departments: Computer Science, Mechanical, Commerce, Electronics
- Seeds one demo staff + one demo student account **per department**

### Demo login accounts (all use password: `password123`)
| Department        | Staff Email                          | Student Email                            |
|-------------------|---------------------------------------|-------------------------------------------|
| Computer Science  | staff.computerscience@school.com      | student.computerscience@school.com        |
| Mechanical        | staff.mechanical@school.com           | student.mechanical@school.com              |
| Commerce          | staff.commerce@school.com             | student.commerce@school.com                |
| Electronics       | staff.electronics@school.com          | student.electronics@school.com             |

You can also sign up new accounts from the app itself.

## 2. Frontend Setup

Open a **second terminal** (keep the backend running):

```bash
cd frontend
npm install
npm run dev
```

Vite will start on **http://localhost:5173** and proxy `/api` requests to the backend on port 5000 (already configured in `vite.config.js`).

## 3. Using the App

1. Go to `http://localhost:5173`
2. Sign up (or log in with a demo account above)
3. **As Staff:** Upload Document → My Documents → Students → click a student → view their submissions → All Submissions
4. **As Student:** View Documents (uploaded by your department's staff) → Upload Submission → My Submissions

### Assessments and due dates

To hand out test questions and track who has answered:

1. **Staff → Upload Document.** Attach the PDF, then tick **"Students must submit work for this"**. Optionally tick **"Set a due date"** and pick a date/time — leave it off and the assessment simply has no deadline, so nobody is ever marked late.
2. **Student → View Documents** shows the assessment with its due date and their own status. **Submit** opens the upload form with that assessment already selected.
3. **Staff → My Documents → Status** opens the assessment, showing every student as:

   | Status | Meaning |
   |-----------|--------------------------------------------------|
   | On time | Submitted before the due date (or no due date set) |
   | Late | Submitted, but after the due date |
   | Missing | Nothing submitted and the due date has passed |
   | Pending | Nothing submitted yet, deadline not reached |

   **Late + Missing = delayed.** Delayed students sort to the top, and *Show only delayed* filters to just them.

Students can still make a **General submission** that isn't tied to any assessment, and late submissions are always accepted — they're just flagged as Late.

Open two different browsers (or one normal + one incognito window) to be logged in as staff and student at the same time, to see both sides of the flow.

## How Department Isolation Works
- Every user picks a department at signup (from a fixed dropdown — no free text).
- The backend embeds `department_id` in the JWT token at login.
- Every staff/student API route filters all database queries by `req.user.department_id` — so a Computer Science staff member can never see Mechanical students' data, and vice versa.

## File Storage (Demo Note)
Uploaded files are stored directly on disk:
- Staff uploads → `backend/uploads/staff/`
- Student uploads → `backend/uploads/student/`

This works well for a local demo. If deploying to free hosting (Render/Railway), note that disk storage may be wiped on redeploy/restart — for anything beyond a demo, swap this for persistent storage (e.g., Cloudinary, Supabase Storage, or S3).

## Showing the Demo

The two-terminal setup above is for *developing*. To **show** it, build the frontend once and let the backend serve everything on a single URL — one terminal, one port, no Vite:

```bash
npm run build     # from the project root: builds the React app
npm start         # serves the app + API on http://localhost:5000
```

Open **http://localhost:5000**. That's the whole demo.

### Showing it on another device (same Wi-Fi)
The server already listens on all interfaces, so after `npm run build` others on your network can open:

```
http://<your-computer-ip>:5000
```

Find your IP with `hostname -I` (Linux) or `ipconfig getifaddr en0` (Mac). No deploy needed — good for a projector, a phone, or a colleague's laptop.

### Showing it to someone remote (temporary public link)
Point a tunnel at the same port — the URL lives only while the command runs:

```bash
npx cloudflared tunnel --url http://localhost:5000
```

### Putting it on the internet properly
`better-sqlite3` is a compiled native module, so **Vercel and Netlify functions won't run this backend**. Use a host that runs a real Node process — Render, Railway, or Fly.io. On Render, create a **Web Service** from the repo:

| Setting | Value |
|--------------|--------------------------|
| Build Command | `npm run build` |
| Start Command | `npm start` |
| Environment | `NODE_ENV` = `production` |
| Environment | `JWT_SECRET` = *(a long random string)* |

Generate the secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

The server **refuses to start in production without `JWT_SECRET`** — the dev fallback is in this repo, so anyone could use it to forge a staff login.

Two things to expect on a free tier:
- **Data resets.** `school.db` and `uploads/` live on disk, which free tiers wipe on every redeploy/restart. The demo accounts reseed automatically, but uploaded files and new signups disappear. Attach a persistent disk/volume (paid) to keep them.
- **Cold starts.** A sleeping free service takes ~30s to answer the first request. Load it once before you present.

Also note signup is open — anyone with the link can create a **staff** account and see that department's files. Fine for a demo, not for real data.

## Resetting the Demo
To wipe all data and start fresh:
```bash
cd backend
rm school.db
rm uploads/staff/* uploads/student/* 2>/dev/null
npm start
```
This recreates the database and reseeds the demo accounts.

## API Overview

**Auth** (`/api/auth`)
- `GET /departments` — list departments for signup dropdown
- `POST /signup` — create account
- `POST /login` — returns JWT + user info

**Staff** (`/api/staff`, requires staff JWT)
- `POST /documents` — upload a document (multipart, field name `file`). Optional `requires_submission` (`"true"`/`"false"`) and `due_date` (ISO 8601; must be in the future)
- `GET /documents` — list own department's uploaded documents, with `submitted_count` / `student_count` for assessments
- `GET /documents/:id/status` — per-student progress on one assessment: `{ document, rows[{ student, status, submission }], summary }`. `status` is `submitted` | `late` | `missing` | `pending`; `summary.delayed` = late + missing. 400s for a document that expects no submissions
- `DELETE /documents/:id` — remove a document (student submissions survive; their link is set to NULL)
- `GET /documents/:id/download` — download own uploaded document
- `GET /students` — list students in own department
- `GET /students/:id/submissions` — a specific student's submissions
- `GET /submissions` — all submissions in own department, each with `document_title` and `is_late`
- `GET /submissions/:id/download` — download a student's submitted file

**Student** (`/api/student`, requires student JWT)
- `GET /documents` — list documents shared by own department's staff, each with `due_date` and the caller's own `my_status`
- `GET /documents/:id/download` — download a staff document
- `POST /submissions` — upload own submission (multipart, field name `file`). Optional `document_id` attaches it to an assessment; `title` then defaults to the assessment's title
- `GET /submissions` — own submission history, with `document_title` and `is_late`

### A note on timestamps
All timestamps are stored **UTC** in SQLite's `YYYY-MM-DD HH:MM:SS` format, so "was this late?" is a plain string comparison against `due_date`. The frontend (`src/utils/date.js`) marks them as UTC before formatting — `new Date("2026-07-17 07:26:18")` would otherwise be read as *local* time and shift every timestamp by your UTC offset.

## Notes / Next Steps for a Production Version
- Add file size/type validation feedback in the UI (backend already rejects non-PDF/DOCX)
- Add pagination for large document/submission lists
- Add an approval step for staff signups (currently open signup for demo simplicity)
- Move file storage to cloud storage before deploying publicly
- Add password reset flow
- Email/notify students when an assessment is published or a deadline is close
- Let staff edit an assessment's due date after publishing (currently set once at upload)
- Grade/feedback on a submission, so the loop closes back to the student
