# Aqual Sentinel

Aqual Sentinel is a water monitoring and response application for public reporting, operational updates, account management, and admin follow-up with users.

## Main capabilities

- Public pages for products, announcements, team information, and operations
- Leak reporting and launch request submission
- Contact inbox for administrator review
- Direct messaging between the system admin and signed-in users
- Frontend-first admin workspace for content, messaging, systems, and operations

## Run locally

1. Prepare the backend:

   ```bash
   cd backend
   python -m venv venv
   venv/bin/pip install -r requirements.txt
   cp .env.example .env
   venv/bin/python manage.py migrate
   ```

2. Start the application:

   ```bash
   cd backend
   venv/bin/python manage.py runserver 127.0.0.1:8000
   ```

3. Optional local frontend workflow:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. One-command live development workflow:

   ```bash
   npm run live
   ```

   This starts Django on `http://127.0.0.1:8000` and the Vite live server on
   `http://127.0.0.1:5173`.

5. Open:

   - `http://127.0.0.1:5173/` for the live frontend workspace
   - `http://127.0.0.1:8000/` for the Django-served app
   - `http://127.0.0.1:8000/admin/` for optional Django admin access

## Project structure

- `backend/` — backend service, APIs, media handling, and optional Django admin
- `frontend/` — public site and primary admin workspace
- `DEPLOYMENT.md` — deployment steps

## Deployment

Use `DEPLOYMENT.md` for container and manual release steps.

## GitHub Pages frontend

This repo now includes a GitHub Pages workflow for the React frontend in `frontend/`.
The Django backend still needs to be hosted separately because the public site,
workspace, login flow, uploads, and live content all use the API.
