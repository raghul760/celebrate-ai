# CelebrateAI

A responsive AI-powered celebration planner for birthdays, weddings, and community events. Share the date, location, guest count, and budget to get a personalized theme, INR budget breakdown, preparation timeline, vendor checklist, catering ideas, and activities.

## Requirements

- Node.js 20.19+ (or 22.12+)
- npm
- A Gemini API key to generate plans

## Run locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a private environment file from the example:

   ```bash
   Copy-Item .env.example .env
   ```

   In `.env`, replace `your_server_side_api_key` with your Gemini API key and name the variable `GEMINI_API_KEY`. Keep the key on the backend—never use a `VITE_` variable for a secret. `.env` is excluded by `.gitignore`; do not commit or share it.

3. Start the backend in one terminal:

   ```bash
   npm run dev:server
   ```

   It listens on `127.0.0.1:3001`. The server reads the Gemini key and model from its environment and sends event details to Google's Gemini `generateContent` API. It validates inputs, limits request size and frequency, validates generated plans, and returns safe error messages.

4. Start the Vite frontend in another terminal:

   ```bash
   npm run dev
   ```

5. Open the local URL printed by Vite. Its `/api` proxy forwards requests to the backend. The AI planner displays a clear configuration or provider error if the backend or key is unavailable.

Optional environment settings:

| Variable | Default | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | — | Secret Gemini API key; backend only |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Gemini model used to create plans |
| `API_PORT` | `3001` | Local backend port |
| `API_HOST` | `127.0.0.1` | Backend bind address; keep local unless a protected reverse proxy requires otherwise |

## Build and lint

```bash
npm run build
npm run lint
```

## Production deployment

Deploy the React app and Node API behind the same origin, routing `/api/plan` and `/api/health` to the Node service. Configure `GEMINI_API_KEY`, `GEMINI_MODEL`, and (if needed) `API_PORT` in the hosting provider's server-side secret/environment settings. Do not put API keys in frontend code, browser storage, build-time `VITE_*` variables, screenshots, or source control. The API currently binds to localhost for local development; configure the host/bind address and reverse proxy for your chosen production platform.

## Notes

- Event suggestions and budget amounts are AI-generated estimates, not vendor quotes or availability guarantees. Confirm details with local providers.
- Fonts and the decorative hero photo load from Google Fonts and Unsplash.
