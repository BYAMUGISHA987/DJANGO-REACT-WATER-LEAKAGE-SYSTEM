# Aqual Sentinel

Aqual Sentinel is a water monitoring and response application for public reporting, operational updates, account management, and admin follow-up with users.

## Main capabilities

- Public pages for products, announcements, team information, and operations
- Leak reporting and launch request submission
- Contact inbox for administrator review
- Direct messaging between the system admin and signed-in users
- Administrative content management through the admin panel

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

4. Open:

   - `http://127.0.0.1:8000/`
   - `http://127.0.0.1:8000/admin/`

## Project structure

- `backend/` — backend service, admin panel, APIs, and media handling
- `frontend/` — user-facing application source
- `DEPLOYMENT.md` — deployment steps

## Deployment

Use `DEPLOYMENT.md` for container and manual release steps.
