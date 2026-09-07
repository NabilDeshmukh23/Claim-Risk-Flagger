# Claims Fraud Risk Flagger

An automated motor claims triage dashboard combining deterministic SQL feature engineering with Google Gemini semantic reasoning to flag suspicious claims before settlement.

---

## ⚡ Architecture & Pipeline

The system uses a two-tier triage pipeline to eliminate LLM hallucinations while avoiding the rigidity of legacy black-box rule engines:

1. **Tier 1: Deterministic SQL Feature Extraction**
   * **Peer Cost Outlier Ratio:** Current claim amount divided by historical peer average for that incident type.
   * **Inception Fraud Gap:** Exact days elapsed between policy purchase date and incident date.
   * **Claim Velocity:** Total claims submitted by the policyholder in a rolling 180-day window.

2. **Tier 2: Gemini Semantic Reasoning (1.5 Flash)**
   * Ingests the computed signals alongside the unstructured incident description.
   * Outputs a validated JSON assessment (`Low`, `Medium`, `High` risk) paired with an auditable explanation for adjusters and SIU teams.

---

## 🛠 Tech Stack

* **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons
* **Backend:** Node.js, Express (RESTful API)
* **Database:** Supabase (PostgreSQL)
* **AI Layer:** Google Gemini 1.5 Flash (`@google/genai` with strict JSON mode)

---

## ✨ Key UX Patterns

* **Optimistic Retention Queue:** Analyzed claims remain visually pinned in the current reviewer workspace with an active status badge rather than unmounting unexpectedly.
* **Audit Signal Drawer:** Adjusters can expand any row to inspect underlying mathematical telemetry (baseline benchmarks, deviation multipliers, inception intervals).
* **Tiered Workflow Tabs:** Immediate queue filtering across `Pending Review`, `High Risk`, `Medium Risk`, `Low Risk`, and the complete database ledger.

---

## 🚀 One-Shot Setup & Run

Run these commands from your root project directory to install dependencies, generate all environment configurations, and launch both servers:

```bash
# 1. Install dependencies for both services
cd server && npm install && cd ../client && npm install && cd ..

# 2. Generate both environment config files in one shot
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

# 3. Start services
# Terminal 1:
cd server && npm start

# Terminal 2:
cd client && npm run dev
