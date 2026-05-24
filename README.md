# DependGuard

DependGuard is a full-stack Flask and React security dashboard for scanning dependency manifest files, fetching live OSV.dev vulnerability intelligence, calculating a risk score, and generating safer manifest files.

It now also includes advanced supply-chain features: GitHub repository scanning, dependency attack graphs, CI/CD config generation, license compliance analysis, package-level supply-chain scoring, AI-style vulnerability explanations, and PDF security reports.

## Project Structure

```text
DependGuard/
  backend/
    app.py
    scanner.py
    models.py
    routes/
    services/
    requirements.txt
    .env.example
  frontend/
    src/
      pages/
      components/
      context/
      api/
    package.json
    .env.example
  login.html
```

The original `login.html` has been kept at the project root as a reference. The React login page is in `frontend/src/pages/Login.jsx`.

## Backend Setup

```bash
cd backend
copy .env.example .env
pip install -r requirements.txt
python app.py
```

The Flask API runs on `http://localhost:5000` and creates `backend/dependguard.db` automatically.

Live OSV CVE lookups are enabled by default:

```text
USE_LIVE_CVE=true
```

Set `USE_LIVE_CVE=false` in `backend/.env` if you want the original mock demo scanner for offline testing.

If port `5000` is already busy, set another port before starting Flask:

```bash
set PORT=5001
python app.py
```

Then update `frontend/.env` to match, for example `VITE_API_BASE_URL=http://localhost:5001/api`.

Optional GitHub repository scanning can use unauthenticated GitHub REST API calls. For higher limits or private repositories, add a GitHub token:

```text
GITHUB_API_TOKEN=github_pat_or_token_here
```

Security explanations use a beginner-friendly template fallback by default:

```text
AI_SECURITY_API_KEY=
```

## Frontend Setup

```bash
cd frontend
copy .env.example .env
npm install
npm run dev
```

The React app runs on `http://localhost:5173`.

The frontend uses `@xyflow/react` for the attack graph UI.

Frontend API configuration:

```text
VITE_API_BASE_URL=http://localhost:5000/api
```

`VITE_BACKEND_URL` is optional. If it is omitted, OAuth and password-reset pages derive the backend origin from `VITE_API_BASE_URL`.

## Login Page Placement

Your screenshot-matched login design has been converted from `login.html` into `frontend/src/pages/Login.jsx`.

If you want to paste a newer version of your login page:

1. Open `frontend/src/pages/Login.jsx`.
2. Find the comment that starts with `Existing login page design lives here`.
3. Replace the markup inside that section with your JSX version.
4. Keep these connection points:
   - The form must call `onSubmit={handleSubmit}`.
   - The email input should use `name="email"`, `value={form.email}`, and `onChange={updateField}`.
   - The password input should use `name="password"`, `value={form.password}`, and `onChange={updateField}`.
   - The submit button can use `disabled={loading}`.
   - The status message can render `{message}`.

`handleSubmit` calls `login()` from `frontend/src/context/AuthContext.jsx`. That function uses Axios from `frontend/src/api/client.js` to call:

```text
POST http://localhost:5000/api/auth/login
```

After a successful login, the JWT token is saved in `localStorage` under `dependguard_token`, Axios attaches it as a Bearer token, and the user is redirected to `/dashboard`.

## OAuth Setup

DependGuard supports email/password login plus Google, GitHub, and GitLab OAuth through Flask/Authlib. OAuth client secrets stay in the backend only.

Add provider credentials to `backend/.env`:

```text
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

GITLAB_CLIENT_ID=
GITLAB_CLIENT_SECRET=

FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:5000
JWT_SECRET_KEY=change-this-jwt-secret
```

Configure these callback URLs in each provider console:

```text
Google: http://localhost:5000/auth/google/callback
GitHub: http://localhost:5000/auth/github/callback
GitLab: http://localhost:5000/auth/gitlab/callback
```

Frontend OAuth redirects start at:

```text
http://localhost:5000/auth/google/login
http://localhost:5000/auth/github/login
http://localhost:5000/auth/gitlab/login
```

After a successful provider login, Flask creates or updates the user, generates the DependGuard JWT, and redirects to:

```text
http://localhost:5173/oauth-success?token=<JWT_TOKEN>
```

## Password Reset Email Setup

DependGuard supports a 15-minute password reset link flow. Configure SMTP in `backend/.env`:

```text
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=true
MAIL_USERNAME=your_email@gmail.com
MAIL_PASSWORD=your_gmail_app_password
MAIL_DEFAULT_SENDER=your_email@gmail.com
PASSWORD_RESET_TOKEN_MINUTES=15
FRONTEND_URL=http://localhost:5173
```

Routes:

```text
POST /auth/forgot-password
POST /auth/reset-password/<token>
```

The forgot-password endpoint always returns:

```text
If an account exists, a reset link has been sent.
```

This avoids revealing whether an email is registered.

## Production Deployment

Production target:

- Frontend: Vercel
- Backend: Render Web Service
- Database: Render PostgreSQL

### Render PostgreSQL

1. Create a PostgreSQL database in Render.
2. Copy the external or internal database URL from Render.
3. Add it to the backend environment as:

```text
DATABASE_URL=postgresql://...
```

If Render provides a URL beginning with `postgres://`, DependGuard converts it to `postgresql://` automatically for SQLAlchemy.

### Render Backend

Create a Render Web Service from the `backend` directory.

Build command:

```bash
pip install -r requirements.txt
```

Start command:

```bash
gunicorn app:app
```

The backend also includes `backend/Procfile`:

```text
web: gunicorn app:app
```

Set these Render environment variables:

```text
DATABASE_URL=
JWT_SECRET_KEY=
SECRET_KEY=
FRONTEND_URL=https://YOUR_VERCEL_FRONTEND_URL
FRONTEND_ORIGIN=https://YOUR_VERCEL_FRONTEND_URL
BACKEND_URL=https://YOUR_RENDER_BACKEND_URL
USE_LIVE_CVE=true
SEND_EMAILS=true
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_DEFAULT_SENDER=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITLAB_CLIENT_ID=
GITLAB_CLIENT_SECRET=
```

`FRONTEND_URL` is used for OAuth success redirects and password reset links. `FRONTEND_ORIGIN` is used by Flask-CORS. If you need multiple allowed frontend origins, separate them with commas.

Database tables are created automatically on first backend startup with `db.create_all()`. This project does not currently use Flask-Migrate, so there is no `flask db upgrade` step unless you add migrations later.

### Vercel Frontend

Create a Vercel project from the `frontend` directory.

Build command:

```bash
npm run build
```

Output directory:

```text
dist
```

Set this Vercel environment variable:

```text
VITE_API_BASE_URL=https://YOUR_RENDER_BACKEND_URL/api
```

The repository includes `frontend/.env.production` as a placeholder:

```text
VITE_API_BASE_URL=https://YOUR_RENDER_BACKEND_URL/api
```

### Production OAuth Callback URLs

Update each OAuth provider console to use your Render backend URL:

```text
Google: https://YOUR_RENDER_BACKEND_URL/auth/google/callback
GitHub: https://YOUR_RENDER_BACKEND_URL/auth/github/callback
GitLab: https://YOUR_RENDER_BACKEND_URL/auth/gitlab/callback
```

After successful OAuth login, Flask redirects to:

```text
https://YOUR_VERCEL_FRONTEND_URL/oauth-success?token=<JWT_TOKEN>
```

### Production Feature Checklist

After deploying:

1. Visit `https://YOUR_RENDER_BACKEND_URL/api/health`.
2. Open the Vercel frontend.
3. Test email/password signup and login.
4. Test Google/GitHub/GitLab OAuth using the production callback URLs.
5. Test forgot-password email delivery with production SMTP variables.
6. Run a manifest scan and confirm it saves in PostgreSQL.
7. Open history and reports to confirm saved data loads from PostgreSQL.
8. Download a PDF report to confirm ReportLab works on Render.

## Main API Routes

```text
POST /api/auth/signup
POST /api/auth/login
GET  /api/auth/me

POST /api/manifests/upload
POST /api/scan
POST /api/scans
POST /api/risk-score
GET  /api/scans/history
GET  /api/scans/<scan_id>
POST /api/manifests/safe
POST /api/reports
GET  /api/reports/<scan_id>
GET  /api/intelligence
GET  /api/dashboard/summary
GET  /api/settings
PUT  /api/settings

POST /api/repo/scan
GET  /api/attack-graph/<scan_id>
POST /api/explain-vulnerability
POST /api/licenses/analyze
POST /api/supply-chain/score
GET  /api/reports/pdf/<scan_id>
GET  /api/ci/config
POST /api/ci/config
```

## Vulnerability Intelligence

When `USE_LIVE_CVE=true`, the scanner calls:

```text
POST https://api.osv.dev/v1/query
```

Python manifests use the `PyPI` ecosystem and `package.json` manifests use the `npm` ecosystem. OSV responses are cached in the configured database for 24 hours in the `osv_cache` table.

If OSV is unavailable, DependGuard returns an empty vulnerability list for that package and adds the warning `Live CVE lookup failed` instead of crashing.

When `USE_LIVE_CVE=false`, DependGuard falls back to the local mock data for demos and offline testing.

## Advanced Feature Usage

### GitHub Repository Scanner

Open `/repo-scanner`, enter a GitHub repository URL, and DependGuard fetches supported root-level manifests through the GitHub REST API:

```text
requirements.txt
package.json
pom.xml
Pipfile
```

Each discovered manifest is scanned and saved to the normal scan history.

### Dependency Attack Graph

Open `/attack-graph` or click `Attack graph` from a scan result. The backend returns React Flow-compatible nodes and edges from:

- the scanned project
- direct dependencies
- mock transitive dependency hints when available
- vulnerable CVE/advisory nodes

Node colors:

```text
critical = red
high = orange
medium = yellow
low = green
safe = cyan
```

### AI Security Explanation

The vulnerability details panel calls:

```text
POST /api/explain-vulnerability
```

If no AI provider key is configured, DependGuard returns a template explanation covering what the CVE means, why it matters, how to fix it, and a beginner-friendly analogy.

### CI/CD Integration

Open `/ci-cd` to generate `dependguard-ci.yml` for GitHub Actions or GitLab CI. The generated pipeline finds a supported manifest and posts it to DependGuard on push or pull/merge request events.

Store a valid JWT as a CI secret named:

```text
DEPENDGUARD_TOKEN
```

### License Compliance

Open `/licenses` to analyze dependency licenses. DependGuard flags GPL, AGPL, LGPL, unknown, and uncommon licenses for review while treating MIT, Apache-2.0, BSD, and ISC as common safe licenses.

### Supply Chain Risk Score

Open `/supply-chain` to calculate package-level and project-level scores from CVE severity, version pinning, safe version availability, license risk, mock maintainer metadata, and typosquatting suspicion.

### PDF Security Reports

Open `/reports` or a scan result and click `PDF Report`. The backend uses ReportLab to generate a professional PDF with:

- project name and scan date
- security score and supply-chain score
- vulnerability summary and severity counts
- license risks
- recommended fixes
- safe manifest preview
