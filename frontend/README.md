# Aqual Sentinel Frontend

React frontend for the Aqual Sentinel website, connected to a Django backend.

## Run locally

1. Install dependencies with `npm install`.
2. Start Django in `backend/` with `python manage.py migrate` and `python manage.py runserver`.
3. Start the dev server with `npm run dev`.

## API behavior

- The launch form posts to `/api/launch-requests/`.
- In local development, Vite proxies `/api` requests to `http://127.0.0.1:8000`.
- If your backend is hosted elsewhere, set `VITE_API_BASE_URL` in `.env.local`.
