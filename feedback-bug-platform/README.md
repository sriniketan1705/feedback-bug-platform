# 🐞 AI-Powered Website Feedback & Bug Reporting Platform

A MERN mini project. Website owners add **one `<script>` line** to their site. Visitors can then send bug reports, feedback and feature requests with an automatic **screenshot** and **page details**. The team manages everything on a **React + Redux dashboard**, and **Generative AI** classifies each report, summarizes it and flags duplicates.

**Tech stack:** React.js · Redux Toolkit · Node.js · Express.js · JavaScript · MongoDB (Mongoose) · Generative AI API (Google Gemini) · REST APIs · JWT authentication

---

## ✨ Features

| Area | What it does |
| --- | --- |
| **Embeddable widget** | Floating "Feedback" button for any website. Collects message, type, optional name/email, a compressed screenshot (html2canvas) and page details (URL, title, browser, screen size, viewport, language, referrer). |
| **Issue tracking** | Status updates (open → in-progress → resolved → closed), severity, category, search and filters. |
| **Team assignment** | Assign any issue to a registered team member; "Assigned to me" filter. |
| **Feature voting** | Each team member can vote/un-vote once per issue; sort by most voted. |
| **Generative AI** | Classifies type / category / severity, writes a one-line summary, detects duplicate issues. Falls back to simple rules + text similarity when no API key is set, so the project always works. |
| **Secure auth** | Password hashing (bcrypt), JWT login, protected routes, admin-only delete, rate-limited public endpoint, input validation. |
| **Responsive dashboard** | Stat cards, filters, issue list, detail page with screenshot. Works on mobile. |
| **API testing** | `api-tests.http` (REST Client / Postman) + unit tests with Node's built-in test runner. |

---

## 📁 Project structure

```
feedback-bug-platform/
├── api-tests.http            # ready-made API requests for testing
├── server/                   # Node + Express + MongoDB API
│   ├── public/
│   │   ├── widget.js         # THE EMBEDDABLE WIDGET (vanilla JS)
│   │   └── demo.html         # page to try the widget
│   ├── src/
│   │   ├── config/db.js
│   │   ├── models/           # User.js, Issue.js
│   │   ├── middleware/       # auth.js (JWT), error.js
│   │   ├── routes/           # auth.js, users.js, issues.js
│   │   ├── services/         # ai.js (Gemini + fallback), similarity.js
│   │   ├── app.js
│   │   └── server.js
│   └── tests/ai.test.js
└── client/                   # React + Redux (Vite)
    └── src/
        ├── app/              # store.js, api.js (axios)
        ├── features/         # authSlice.js, issuesSlice.js
        ├── components/       # Navbar, Badge, StatCards
        └── pages/            # AuthPage, Dashboard, IssueDetail
```

---

## 🚀 Run locally

**Requirements:** Node.js 18+, and MongoDB (local install or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster).

```bash
# 1. Install everything
npm run install:all

# 2. Configure the server
cp server/.env.example server/.env
#    then edit server/.env  (MONGO_URI, JWT_SECRET, optional GEMINI_API_KEY)

# 3. Configure the client
cp client/.env.example client/.env

# 4. Start both (two terminals)
npm run server      # API on http://localhost:5000
npm run client      # Dashboard on http://localhost:5173
```

### Try it end to end
1. Open `http://localhost:5173/register` and create an account (**the first account becomes admin**).
2. Open `http://localhost:5000/demo.html`, click **Feedback**, and submit a report (keep the screenshot box ticked).
3. Submit a second, similar report → the AI flags it as a **possible duplicate**.
4. Go back to the dashboard: see the new issues, vote, change status, assign a teammate, and open one to see the screenshot and page details.

### Enable real Generative AI (optional)
1. Get a free key at <https://aistudio.google.com/apikey>.
2. Put it in `server/.env` as `GEMINI_API_KEY=...`.
3. Restart the server. The console prints `AI: Gemini enabled`.

> If you leave the key empty, or the AI call fails, the app automatically uses the rule-based fallback. If Google changes model names, update `GEMINI_MODEL` in `.env`.

---

## 🔌 Embed the widget on any website

```html
<script src="https://YOUR-API-URL/widget.js" defer></script>
```

Optional attributes: `data-api` (API origin), `data-color="#4f46e5"`, `data-title="Send feedback"`.

The widget uses a Shadow DOM, so your site's CSS cannot break it and it cannot break your site.

---

## 📡 REST API

Base URL: `/api`

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| GET | `/health` | – | Health check |
| POST | `/auth/register` | – | Create account (first user = admin) |
| POST | `/auth/login` | – | Login, returns JWT |
| GET | `/auth/me` | JWT | Current user |
| GET | `/users` | JWT | Team members (for assignment) |
| POST | `/issues/public` | – (rate limited) | Submit a report from the widget; AI analysis runs here |
| GET | `/issues` | JWT | List with filters: `status`, `type`, `severity`, `search`, `assigned=me`, `sort=votes` |
| GET | `/issues/stats` | JWT | Counts for dashboard cards |
| GET | `/issues/:id` | JWT | Issue details with screenshot |
| PATCH | `/issues/:id` | JWT | Update `status`, `assignedTo`, `severity`, `category` |
| POST | `/issues/:id/vote` | JWT | Toggle your vote |
| DELETE | `/issues/:id` | Admin | Delete issue |

Test all of these with `api-tests.http`.

### Run the unit tests
```bash
npm test
```

---

## ☁️ Deployment (Vercel + Render)

**Frontend → Vercel**
1. Push this repo to GitHub.
2. In Vercel: *New Project* → import the repo → set **Root Directory** to `client`.
3. Add environment variable `VITE_API_URL` = your deployed API URL.
4. Deploy. (`client/vercel.json` already handles React Router refreshes.)

**Backend → Render (or Railway)**
1. *New Web Service* → same repo → **Root Directory** `server`.
2. Build command `npm install`, start command `npm start`.
3. Add env vars from `server/.env.example` (use a MongoDB Atlas `MONGO_URI`).
4. After deploy, embed `https://your-api.onrender.com/widget.js` on any site.

---

## 🧠 How the AI part works

1. The widget sends a report to `POST /api/issues/public`.
2. The server loads the 25 most recent open issues as duplicate candidates.
3. **One Gemini call** returns JSON: `type`, `category`, `severity`, `summary`, `duplicateOf`.
4. The response is **validated** (`parseAiJson`) so a bad AI answer can never corrupt the database.
5. No key or API error → `ruleBasedAnalysis` (keywords + Jaccard text similarity) is used instead.

---

## 🔮 Ideas to extend

- Comments on issues, email notifications, real-time updates with Socket.IO
- Per-website API keys so each project has its own widget and issue board
- Store screenshots in Cloudinary/S3 instead of MongoDB
- Integration tests with Jest + Supertest

## 📄 License

MIT
