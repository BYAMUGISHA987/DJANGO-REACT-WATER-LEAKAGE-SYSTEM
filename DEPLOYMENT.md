# Deployment Guide

## One-container deployment

The project can run as a single deployed service that serves the application and its static assets.

## Docker

Build and run:

```bash
docker compose up --build
```

The app will be available on `http://127.0.0.1:8000/`.

## GitHub Pages for the frontend

GitHub Pages can host the React frontend only. The Django backend must be deployed
to a public host first because the site loads live content, authentication,
uploads, announcements, products, and workspace data from the API.

### 1. Deploy the backend on Render

This repo includes [render.yaml](/home/byamugisha-octavious/Desktop/aqual_sentinel_system/render.yaml) for a Docker-based Render web service with:

- a persistent disk for the SQLite database and uploaded media
- secure cross-site cookie settings for the GitHub Pages frontend
- a health check at `/api/auth/session/`

Important: Render's docs say persistent disks are available on paid services, and
this app needs persistence because it stores SQLite data and uploaded files on the
filesystem.

To create the backend service:

1. Push this repo to GitHub.
2. In Render, choose `New` > `Blueprint`.
3. Connect this GitHub repository.
4. Render will detect `render.yaml` and propose the `aqual-sentinel-api` service.
5. Create the service and wait for the first deploy to finish.

If `aqual-sentinel-api` is already taken in your Render workspace or globally,
rename it in Render and use the actual generated `onrender.com` URL in step 2 below.

The backend URL will usually look like:

```text
https://aqual-sentinel-api.onrender.com
```

If you deploy the backend somewhere other than Render, set these equivalent
environment variables there:

```bash
DJANGO_ALLOWED_HOSTS=your-backend-hostname
DJANGO_CORS_ALLOWED_ORIGINS=https://BYAMUGISHA987.github.io
DJANGO_CSRF_TRUSTED_ORIGINS=https://BYAMUGISHA987.github.io
DJANGO_SESSION_COOKIE_SAMESITE=None
DJANGO_SESSION_COOKIE_SECURE=True
DJANGO_CSRF_COOKIE_SAMESITE=None
DJANGO_CSRF_COOKIE_SECURE=True
SQLITE_PATH=/var/data/db.sqlite3
DJANGO_MEDIA_ROOT=/var/data/media
```

Use your real GitHub Pages origin if it differs. For this repository, the Pages URL
will normally be `https://BYAMUGISHA987.github.io/DJANGO-REACT-WATER-LEAKAGE-SYSTEM/`.

### 2. Configure the GitHub repository

In the GitHub repository:

1. Open `Settings` > `Pages` and set the source to `GitHub Actions`.
2. Open `Settings` > `Secrets and variables` > `Actions` > `Variables`.
3. Add a repository variable named `VITE_API_BASE_URL` with your backend URL, for
   example `https://aqual-sentinel-api.onrender.com`.

### 3. Push to `main`

The workflow in `.github/workflows/deploy-pages.yml` builds the frontend, sets the
correct GitHub Pages base path, adds an SPA fallback page, and deploys `frontend/dist`
to Pages automatically on every push to `main`.

### 4. Open the deployed URLs

- Frontend: `https://BYAMUGISHA987.github.io/DJANGO-REACT-WATER-LEAKAGE-SYSTEM/`
- Backend API: your Render `onrender.com` URL

## Environment variables

Use [backend/.env.example](/home/byamugisha-octavious/Desktop/aqual_sentinel_system/backend/.env.example) as the starting point, along with the variables required for your deployment environment.

## Manual release steps

```bash
cd frontend
npm install
npm run build
mkdir -p ../backend/frontend_dist
cp -r dist/* ../backend/frontend_dist/

cd ../backend
venv/bin/pip install -r requirements.txt
venv/bin/python manage.py migrate --noinput
venv/bin/python manage.py collectstatic --noinput
venv/bin/gunicorn --bind 0.0.0.0:8000 config.wsgi:application
```
