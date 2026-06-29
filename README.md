# FinKid: Kids' Financial Literacy RAG Chatbot

An educational, AI-powered Retrieval-Augmented Generation (RAG) chatbot designed to teach children and teenagers (ages 8–16) personal finance, saving, budgeting, and investing basics in a fun, simple, and age-appropriate manner.

---

## 1. Monorepo Structure

This project is organized as a monorepo containing three core components:

```
FinKid/
├── backend/            # FastAPI Backend (Python)
│   ├── data_ingestion/ # RAG ingestion pipeline scripts
│   ├── main.py         # App entry point & HTTP router
│   ├── requirements.txt# Backend dependencies
│   └── .env.example    # Environment configurations for keys
│
├── web/                # Next.js Web Frontend (Tailwind CSS)
│   ├── src/            # Next.js page components and state
│   ├── package.json    # Frontend dependency mappings
│   └── .env.example    # Next.js public environment vars
│
├── mobile/             # Expo React Native App (Mobile UI)
│   ├── src/            # Screen designs & navigation
│   ├── package.json    # Expo dependencies
│   └── .env.example    # Expo environment configuration
│
└── data/               # Shared repository for raw PDFs and Kaggle CSV datasets
```

---

## 2. Prerequisites & Installation

To run this project locally, ensure you have the following installed:
- **Node.js** (v18 or higher) & **npm** (or pnpm/yarn)
- **Python** (3.10 or higher)
- **Supabase Account** (for Authentication & PostgreSQL Database)
- **Pinecone Account** (for Vector Store)
- **API Keys** for:
  - **Anthropic Claude API** (for kid-safe generating agent)
  - **OpenAI API** (for `text-embedding-3-small` vector generation)

---

## 3. Getting Started

### Step A: Configure Environment Variables
You must create a `.env` file in each application directory using the provided `.env.example` templates:
1. Copy `backend/.env.example` to `backend/.env` and add your keys.
2. Copy `web/.env.example` to `web/.env` and configure your Supabase public keys.
3. Copy `mobile/.env.example` to `mobile/.env` and configure your Expo endpoint variables.

### Step B: Run the Backend (FastAPI)
```bash
cd backend
python -m venv .venv
# On Windows (PowerShell):
.venv\Scripts\Activate.ps1
# On macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
API Documentation will be available locally at `http://localhost:8000/docs`.

### Step C: Run the Web App (Next.js)
```bash
cd web
npm install
npm run dev
```
Open `http://localhost:3000` to interact with the web interface.

### Step D: Run the Mobile App (Expo)
```bash
cd mobile
npm install
npx expo start
```
Use the Expo Go app on your phone to scan the generated QR code and test the app.
