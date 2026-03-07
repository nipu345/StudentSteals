# DormDeal — Setup Guide

## Backend Setup (do this first)

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Fill in your API keys in .env
python app.py
```

Backend runs on http://localhost:5000

## Frontend Setup

```bash
cd frontend
npm install
npm start
```

Make sure BACKEND_URL in DormDeal.jsx points to http://localhost:5000

## API Keys You Need

1. ANTHROPIC_API_KEY → console.anthropic.com
2. GOOGLE_API_KEY → console.cloud.google.com
   - Enable: Places API, Geolocation API

## Endpoints

| Method | Route | What it does |
|--------|-------|--------------|
| POST | /deals | Get nearby student deals via Google Places |
| POST | /coach | Ask the AI financial coach anything |
| POST | /swaps | Get AI-powered money saving swaps |
| GET | /health | Check if backend is running |

## Deploy to Railway (free)

1. Push backend folder to GitHub
2. Go to railway.app → New Project → Deploy from GitHub
3. Add environment variables in Railway dashboard
4. Update BACKEND_URL in frontend to your Railway URL
