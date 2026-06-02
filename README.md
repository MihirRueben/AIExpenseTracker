# AI Expense Tracker

A full-stack personal finance and budgeting platform built to simplify transaction tracking and automate financial intelligence. Beyond standard logging, this application integrates the **Google Gen AI SDK (Gemini 2.5 Flash)** to analyze spending behaviors, flag anomalies, and provide contextual, on-demand budgeting insights.

## 🚀 Core Features

* **Transaction Management:** Complete logging of income and expenses, tracked by date, description, amount, and custom categories.
* **Intelligent AI Summaries:** Analyzes historic transaction histories to highlight spending patterns, major cost spikes, and positive behavioral trends.
* **Smart Budget Forecasting:** Cross-references user spending velocities against active categorical budgets to proactively flag threshold overruns.
* **Secure Authentication:** State-based user session handling powered by JWT (JSON Web Tokens) and secure password hashing.
* **Responsive Architecture:** Clean, responsive UI built for both desktop and mobile dashboards.

---

## 🛠️ Tech Stack

### Frontend
* **Framework:** React.js (via Vite)
* **Styling:** Tailwind CSS
* **State Management & Routing:** React Router DOM / Fetch API

### Backend
* **Runtime Environment:** Node.js
* **Server Framework:** Express.js
* **Database Engine:** PostgreSQL (Hosted via Neon Postgres)
* **AI Engine:** Google Gemini 2.5 Flash (`@google/genai`)

---

## 📂 Project Structure

The project is structured as a monorepo workspace for straightforward local development:

```text
AIExpenseTracker/
├── backend/               # Express.js REST API server & database pool
│   ├── config/            # DB client configurations
│   ├── controllers/       # Route business logic (Transactions, Insights)
│   ├── middleware/        # Authentication and validation layers
│   ├── utils/             # Gemini API initialization and prompting logic
│   
│
└── frontend/
    └── AIExpenseTracker/  # React deployment client application
        ├── src/           # Components, Pages, and Layout contexts
        ├── public/        # Static asset assets


## Prerequisites
## Node.js (v18+ recommended)
## A Neon PostgreSQL database instance
A Google AI Studio Gemini API Key


1. Clone the Repository
git clone [https://github.com/YOUR_USERNAME/AIExpenseTracker.git](https://github.com/YOUR_USERNAME/AIExpenseTracker.git)
cd AIExpenseTracker

2. Configuring the backend 
cd backend
npm install
# Create your environment file from the mock template
cp .env.example .env

3. Add the env file for backend
PORT=8000
DATABASE_URL=your_neon_postgresql_connection_string
JWT_SECRET=your_custom_jwt_secret_signing_key
GEMINI_API_KEY=your_google_ai_studio_api_key

4. Start the backend
npm run dev

5. COnfigure the frontend
cd frontend/AIExpenseTracker
npm install

6. Add the frontend Env
VITE_API_BASE_URL=Your_base_url

7. Launch
Npm run dev
