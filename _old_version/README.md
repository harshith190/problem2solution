# Problem2Solution

Describe a real-world problem → get a project plan, cost, skills needed, and **people from the database who can build it**.

## Run it (Windows)
Double-click **`start.bat`** → opens the backend (port 5000) and website (port 5173).
Then open http://localhost:5173

- Restart only the backend: `start-backend.bat`
- Manual: `npm run server` and `npm run dev` in two terminals

## How analysis works
1. **Instant (no AI):** `src/matching.js` reads the problem, guesses the skills needed and ranks people in milliseconds.
2. **Gemini (a few seconds):** `server.js` sends the problem + the 12 most relevant people to Gemini
   (`gemini-3.5-flash-lite` first, `gemini-3.8-flash` as backup) for the full solution, cost, plan and skill gaps.
3. If Gemini is down, the instant skill-based result stays on screen with a notice.

## Setup
1. Copy `.env.example` → `.env`, fill in Supabase URL/anon key and `GEMINI_API_KEY`.
2. In Supabase → SQL Editor run, in order: `supabase_schema.sql`, `supabase_security.sql`, `seed_people.sql`.

## Key files
| File | What it does |
|---|---|
| `server.js` | Backend: Gemini calls (key stays on the server) |
| `src/main.jsx` | All pages (home, analysis, team, project, directory, dashboard) |
| `src/matching.js` | Instant skill extraction, people scoring and smart search |
| `src/geminiService.js` | Frontend → backend AI calls |
| `src/supabaseClient.js` | Database + auth |
| `src/peopleSeed.js` | The 47 sample people |
