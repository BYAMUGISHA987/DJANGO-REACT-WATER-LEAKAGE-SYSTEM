# Deployment Guide

## One-container deployment

The project can run as a single deployed service that serves the application and its static assets.

## Docker

Build and run:

```bash
docker compose up --build
```

The app will be available on `http://127.0.0.1:8000/`.

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
