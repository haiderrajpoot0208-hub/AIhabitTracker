# Deploy AI Habit Tracker (Vercel + Render + MongoDB Atlas)

Use this guide after pushing the project to **GitHub**. Replace placeholder URLs with your real URLs after each step.

| Service | URL (replace after deploy) |
|---------|----------------------------|
| **Frontend (Vercel)** | `https://YOUR-PROJECT.vercel.app` |
| **Backend (Render)** | `https://ai-habit-tracker-api.onrender.com` |
| **API base (for Vercel env)** | `https://ai-habit-tracker-api.onrender.com/api` |

---

## Part 1 — MongoDB Atlas (already in use)

1. Open [MongoDB Atlas](https://cloud.mongodb.com/) → your cluster **AIHABITTRACKER**.
2. **Network Access** → **Add IP Address** → **Allow Access from Anywhere** (`0.0.0.0/0`).  
   Required because Render uses dynamic IPs.
3. **Database Access** → confirm DB user password matches `MONGO_URI` in Render.
4. Copy connection string: **Connect** → **Drivers** → Node.js → copy `mongodb+srv://...` URI.

---

## Part 2 — Backend on Render

### 2.1 Push code to GitHub

```powershell
cd c:\Users\Admin\Desktop\AIhabitTracker
git init
git add .
git commit -m "Prepare for production deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/AIhabitTracker.git
git push -u origin main
```

Do **not** commit `Backend/.env` (it is gitignored).

### 2.2 Create Web Service

1. Go to [render.com](https://render.com) → **Sign in** → **New +** → **Web Service**.
2. Connect your **GitHub** repo `AIhabitTracker`.
3. Configure:

| Field | Value |
|-------|--------|
| **Name** | `ai-habit-tracker-api` (this becomes your URL slug) |
| **Region** | closest to you |
| **Root Directory** | `Backend` |
| **Runtime** | Node |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance type** | Free (or paid for no cold start) |

4. **Advanced** → **Health Check Path**: `/api/health`

### 2.3 Environment variables (Render → Environment)

Add each key (paste your real secrets):

| Key | Value |
|-----|--------|
| `NODE_ENV` | `production` |
| `MONGO_URI` | your Atlas `mongodb+srv://...` connection string |
| `JWT_SECRET` | long random string (64+ chars; generate: `openssl rand -hex 64`) |
| `JWT_EXPIRES_IN` | `30d` |
| `GEMINI_API_KEY` | from [Google AI Studio](https://aistudio.google.com/apikey) |
| `GEMINI_MODEL` | `gemini-2.5-flash` |
| `CLIENT_URL` | `https://YOUR-PROJECT.vercel.app` (set after Vercel deploy; update if you add a custom domain) |

`PORT` is set automatically by Render — do not override.

5. Click **Create Web Service** → wait until status is **Live**.
6. Open `https://ai-habit-tracker-api.onrender.com/api/health` — expect `{"status":"ok",...}`.

### 2.4 Seed production DB (optional, one time)

Locally, with production URI (or Render Shell):

```powershell
cd Backend
$env:MONGO_URI="your_atlas_uri"
$env:NODE_ENV="development"
npm run seed
```

Demo login: `alex@timetoprogram.com` / `password123`

---

## Part 3 — Frontend on Vercel

### 3.1 Import project

1. Go to [vercel.com](https://vercel.com) → **Add New…** → **Project**.
2. Import the same **GitHub** repo.
3. Configure:

| Field | Value |
|-------|--------|
| **Framework Preset** | Vite |
| **Root Directory** | `frontend/ai-habit-tracker-ui-boilerplate-code` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |

### 3.2 Environment variables (Vercel → Settings → Environment Variables)

Add for **Production**, **Preview**, and **Development**:

| Key | Value |
|-----|--------|
| `VITE_API_URL` | `https://ai-habit-tracker-api.onrender.com/api` |

Use your **exact** Render URL if the service name differs.

### 3.3 Deploy

1. Click **Deploy**.
2. Copy your Vercel URL, e.g. `https://ai-habit-tracker-abc123.vercel.app`.

### 3.4 Update Render CORS

1. Render → your service → **Environment**.
2. Set `CLIENT_URL` to your Vercel URL (no trailing slash):

   `https://ai-habit-tracker-abc123.vercel.app`

3. Multiple origins (custom domain + Vercel):

   `https://ai-habit-tracker-abc123.vercel.app,https://www.yourdomain.com`

4. **Save** → Render redeploys automatically.

Preview deployments on `*.vercel.app` are allowed by backend CORS without listing every preview URL.

---

## Part 4 — Verify production

1. **API**: `https://ai-habit-tracker-api.onrender.com/api/health`
2. **Register** a new user on Vercel site (or use seed credentials).
3. **Login** → Dashboard → toggle a habit.
4. **AI** → Insights → Generate weekly report (needs valid `GEMINI_API_KEY`).
5. **Mobile**: open Vercel URL on phone; layout uses responsive Tailwind (`sm:`, `md:`, `lg:`).

---

## Part 5 — Final production URLs

After deploy, your live URLs are:

```
Frontend:  https://<your-vercel-project>.vercel.app
Backend:   https://ai-habit-tracker-api.onrender.com
API:       https://ai-habit-tracker-api.onrender.com/api
Health:    https://ai-habit-tracker-api.onrender.com/api/health
```

Custom domain (optional):

- Vercel: Project → **Domains** → add domain.
- Add that domain to Render `CLIENT_URL`.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| CORS error in browser | Set `CLIENT_URL` on Render to exact Vercel URL; redeploy Render. |
| 401 on all routes | Clear site localStorage; log in again (JWT from production backend). |
| API network error | Confirm `VITE_API_URL` ends with `/api`; redeploy Vercel after changing env. |
| Render 503 / slow first request | Free tier cold start (~30s); wait and retry. |
| MongoDB timeout | Atlas → Network Access → `0.0.0.0/0`. |
| AI not working | Check `GEMINI_API_KEY` on Render; view Render logs for "AI error". |
| React routes 404 on refresh | `vercel.json` rewrites are included — redeploy Vercel. |

---

## What was configured in code

- `Backend/config/cors.js` — production CORS + `*.vercel.app`
- `Backend/server.js` — `0.0.0.0` bind, env validation, health route
- `Backend/render.yaml` — optional Render blueprint
- `frontend/.../vercel.json` — SPA routing for React Router
- `frontend/.../src/api/axios.js` — `VITE_API_URL` for production API
