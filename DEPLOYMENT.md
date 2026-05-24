# Deployment Guide — Render (Backend) & Vercel (Frontend)

## Overview

| Layer    | Service         | Notes                              |
|----------|-----------------|------------------------------------|
| Database | Render Postgres | Managed PostgreSQL                 |
| Backend  | Render Web      | Node/Express, entry: `server.js`   |
| Frontend | Vercel          | React/Vite static build            |

---

## 1. Database — Render PostgreSQL

1. In the [Render dashboard](https://dashboard.render.com), click **New → PostgreSQL**.
2. Set a name (e.g. `hms-db`), choose a region, and select the free or paid plan.
3. Click **Create Database** and wait for it to provision.
4. From the database detail page, copy the **Internal Database URL** — you will use it for the backend service running on the same Render network. Copy the **External Database URL** as well — you will need it to run migrations from your local machine.

### Run migrations

From your local machine, with `psql` installed:

```bash
# Load the base schema
psql "<EXTERNAL_DATABASE_URL>" -f hms-backend/database/schema.sql

# Then run each migration in order
psql "<EXTERNAL_DATABASE_URL>" -f hms-backend/database/migration_001_users.sql
psql "<EXTERNAL_DATABASE_URL>" -f hms-backend/database/migration_receptionist_role.sql
psql "<EXTERNAL_DATABASE_URL>" -f hms-backend/database/migration_staff_invites.sql
psql "<EXTERNAL_DATABASE_URL>" -f hms-backend/database/migration_drug_inventory.sql
psql "<EXTERNAL_DATABASE_URL>" -f hms-backend/database/migration_phase3_inpatient_orders.sql
```

---

## 2. Backend — Render Web Service

### 2a. Create the service

1. In Render, click **New → Web Service**.
2. Connect your GitHub repository.
3. Configure the service:
   - **Name**: `hms-backend` (or any name)
   - **Root Directory**: `hms-backend`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Click **Create Web Service**.

### 2b. Set environment variables

Go to **Environment** in the service settings and add:

| Key           | Value                                                                  |
|---------------|------------------------------------------------------------------------|
| `DATABASE_URL`| *(paste the Internal Database URL from step 1)*                        |
| `DB_HOST`     | *(from Internal Database URL — the host segment)*                      |
| `DB_PORT`     | `5432`                                                                 |
| `DB_NAME`     | *(database name from Render)*                                          |
| `DB_USER`     | *(database user from Render)*                                          |
| `DB_PASSWORD` | *(database password from Render)*                                      |
| `JWT_SECRET`  | *(generate a long random string, e.g. `openssl rand -hex 32`)*         |
| `NODE_ENV`    | `production`                                                           |

> **Tip:** Render's Internal Database URL format is  
> `postgres://USER:PASSWORD@HOST:5432/DBNAME` — you can parse the individual fields from it.

After saving, Render will deploy automatically. The backend will be reachable at a URL like:

```
https://hms-backend.onrender.com
```

Keep this URL — you need it in the next step.

---

## 3. Frontend — Vercel

### 3a. Add a `vercel.json` rewrite

The frontend uses `baseURL: '/api'` internally. Vercel needs to know to proxy those calls to your Render backend. Create this file in the **`frontend/`** directory:

**`frontend/vercel.json`**
```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://hms-backend.onrender.com/api/:path*"
    }
  ]
}
```

Replace `https://hms-backend.onrender.com` with your actual Render backend URL.

Commit and push this file before deploying.

### 3b. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and click **Add New → Project**.
2. Import your GitHub repository.
3. Configure the project:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Vite *(Vercel usually detects this automatically)*
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Click **Deploy**.

Vercel will build and deploy the frontend. The app will be live at a URL like:

```
https://hms-frontend.vercel.app
```

---

## 4. CORS — Update Backend for Production

The backend currently has `app.use(cors())` which allows all origins. In production, restrict it to your Vercel domain. In `hms-backend/server.js`, update the cors setup:

```js
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));
```

Then add a new environment variable in Render:

| Key            | Value                              |
|----------------|------------------------------------|
| `FRONTEND_URL` | `https://hms-frontend.vercel.app`  |

---

## 5. Post-Deployment Checklist

- [ ] Database migrations ran without errors
- [ ] Backend `/health` endpoint returns `{ "status": "ok" }`
- [ ] Frontend loads and the login page appears
- [ ] Login works end-to-end (JWT issued and stored)
- [ ] At least one protected route (e.g. `/patients`) returns data
- [ ] No CORS errors in the browser console

---

## Environment Variable Summary

### Render (backend)

```
DB_HOST=
DB_PORT=5432
DB_NAME=
DB_USER=
DB_PASSWORD=
JWT_SECRET=
NODE_ENV=production
FRONTEND_URL=https://<your-vercel-domain>.vercel.app
```

### Vercel (frontend)

No environment variables required — the API proxy is handled via `vercel.json`.

---

## Redeployment

- **Backend**: Render redeploys automatically on every push to the connected branch.
- **Frontend**: Vercel redeploys automatically on every push to the connected branch.
- **Migrations**: Must be run manually via `psql` each time a new migration file is added.
