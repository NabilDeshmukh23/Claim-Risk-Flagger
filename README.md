# Claims Fraud Risk Flagger

A web dashboard that helps insurance teams catch fake or inflated car insurance claims before paying them out.

---

## What It Does

When an insurance claim comes in, the app checks for common signs of fraud:
* **Overpriced repairs:** Compares the repair bill against the real average cost for that type of accident.
* **New policy scams:** Checks if the accident happened just days after buying the insurance policy.
* **Repeat claimants:** Checks if the same customer has filed multiple claims in the last 6 months.

---

## How It Works (In 2 Simple Steps)

Instead of letting AI guess the math, the app splits the job:

1. **Step 1: The Database Does the Math (SQL)**
   Before calling any AI, the backend queries the database to calculate exact facts:
   * How much higher is this bill compared to the category average? (e.g., *14x higher*)
   * How many days has the policy been active? (e.g., *4 days*)
   * How many claims has this person filed recently? (e.g., *3 claims*)

2. **Step 2: The AI Explains the Problem (Gemini)**
   Gemini receives the exact math plus the driver's written story. It tags the claim as **Low**, **Medium**, or **High Risk** and writes a short explanation so an agent knows what to do in 5 seconds.

---

## Tech Stack

* **Frontend:** React, Vite, TypeScript, Tailwind CSS
* **Backend:** Node.js, Express
* **Database:** Supabase (PostgreSQL)
* **AI:** Google Gemini 1.5 Flash

---

## Setup & Run

Run these commands from your project root:

```bash
# 1. Install dependencies for both backend and frontend
cd server && npm install && cd ../client && npm install && cd ..

# 2. Set up environment variables
cat << 'EOF' > server/.env
PORT=3001
GEMINI_API_KEY=your_gemini_api_key
SUPABASE_URL=[https://your-project.supabase.co](https://your-project.supabase.co)
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
EOF

cat << 'EOF' > client/.env.local
VITE_SUPABASE_URL=[https://your-project.supabase.co](https://your-project.supabase.co)
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
EOF

# 3. Start the backend (Terminal 1)
cd server && npm start

# 4. Start the frontend (Terminal 2)
cd client && npm run dev
