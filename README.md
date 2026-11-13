# Problem2Solution

Describe a real-world problem → get a project plan, cost, skills needed, and **people from the database who can build it**.

- Restart only the backend: `start-backend.bat`
- Manual: `npm run server` and `npm run dev` in two terminals

## Folder structure

```
problem2solution/
├── start.bat                ← run the project
├── .env                     ← keys (Supabase URL/key, Gemini key)
│
├── backend/
│   └── server.js            ← Gemini AI calls (key stays on the server)
│
├── database/
│   └── profiles_backup_2026-11-13.json
│
└── src/
    ├── main.jsx             ← starts the app
    ├── App.jsx              ← navbar + which page to show + who is logged in
    │
    ├── pages/
    │   ├── HomePage.jsx         ← landing + type your problem
    │   ├── AnalysisPage.jsx     ← AI result + matched people
    │   ├── TeamProjectPage.jsx  ← build team + project plan
    │   ├── DirectoryPage.jsx    ← browse problems / people / projects
    │   ├── LoginPage.jsx        ← login / sign up
    │   ├── AdminPage.jsx        ← admin: manage people, problems, projects, users
    │   ├── TalentPage.jsx       ← talent: my profile, skills, works
    │   └── UserPage.jsx         ← user: my problems, messages
    │
    ├── components.jsx       ← shared popups and cards
    ├── database.js          ← all Supabase code (login + data)
    ├── ai.js                ← calls the backend + instant matching
    ├── peopleSeed.js        ← sample data
    └── styles.css
```

## How it works
1. **Start:** `start.bat` runs `backend/server.js` (port 5000) and the website (port 5173).
2. **Type a problem:** on `HomePage.jsx`.
3. **Instant result (no AI):** `ai.js` guesses the skills needed and ranks people in milliseconds.
4. **AI result:** `ai.js` sends the problem to `backend/server.js`, which asks Gemini
   (`gemini-3.5-flash-lite` first, `gemini-3.8-flash` as backup) for the full solution, cost and plan.
   If Gemini is down, the instant result stays on screen.
5. **Analysis → Team → Project:** `AnalysisPage.jsx` and `TeamProjectPage.jsx`.
6. **Login:** `LoginPage.jsx` signs in through Supabase. `App.jsx` reads the role and opens
   `AdminPage.jsx`, `TalentPage.jsx` or `UserPage.jsx`.
7. **Data:** every page reads and saves data only through `database.js`.

## Setup
1. Copy `.env.example` → `.env`, fill in Supabase URL/anon key and `GEMINI_API_KEY`.
2. Set up the Supabase tables in the Supabase SQL Editor.
