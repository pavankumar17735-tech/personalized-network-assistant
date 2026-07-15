# Personalized Networking Assistant

### 🚀 SmartBridge Capstone Project Showcase
An AI-powered full-stack application designed to help professional speakers, academic researchers, and event attendees conquer "networking anxiety" by generating context-aware icebreakers, elevator pitches, and tactical guidelines. It also features real-time voice-dictated inputs with dynamic decibel visualization and an authoritative Wikipedia-backed fact-checking engine to verify claims in real time.

---

## 🎨 Design Concept & Visuals
- **Cosmic Slate Theme**: Designed with a sleek, high-contrast dark slate (`#0b0f19`) and emerald aesthetic, incorporating ample white space and dynamic bounding borders.
- **Micro-interactions & Spring Motion**: Leverage custom physical spring transitions (via `motion/react`) for cards, alert prompts, and indicators.
- **GPU-Accelerated Soundwave Visualizer**: When voice dictation is active, a real-time canvas-based decibel visualizer processes audio tracks (Web Audio API) and renders waves at a smooth 60fps using double-buffered offscreen canvas operations.

---

## 📁 Repository Structure
```
project/
├── data/                               # Persistent Storage Directory
│   ├── history.json                    # Saved networking sessions
│   ├── feedback.json                   # User feedback surveys
│   └── logs.json                       # Server transaction log ledger
├── server/
│   └── services/
│       ├── geminiService.ts            # Fast consolidated pipeline & verification LLM services
│       ├── wikipediaService.ts         # Wikipedia Search API connector
│       └── storageService.ts           # Disk-persisted storage utility
├── src/
│   ├── components/
│   │   └── AudioVolumeVisualizer.tsx   # Canvas-based real-time voice decibel visualizer
│   ├── types.ts                        # Unified TypeScript types
│   ├── App.tsx                         # Multi-tab modern React frontend
│   ├── data.ts                         # Preset profiles & demo test claims
│   ├── index.css                       # Font pairings, base canvas rules, and Tailwind imports
│   └── main.tsx                        # Frontend mount entry point
├── .env.example                        # Documented environment configurations
├── index.html                          # Primary single page application root template
├── metadata.json                       # Frame permissions & capabilities manifest
├── package.json                        # Dependencies, build scripts, and engine directives
├── server.ts                           # Express Server & REST API Router
└── tsconfig.json                       # Strong type compiler options
```

---

## 🛠️ Technology Stack
* **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide React Icons
* **Animations**: motion (framer-motion)
* **Charts & Telemetry**: Recharts
* **Backend Server**: Node.js, Express
* **AI & NLP Model**: Gemini 3.5 Flash (via `@google/genai` TypeScript SDK)
* **External Integrations**: Wikipedia Search API, Web Speech API (native browser translation), Web Audio API (real-time stream calculations)
* **Durable Storage**: JSON-based file persistence with auto-compilation

---

## 🚀 Installation & Local Execution Guide

### Prerequisites
- Node.js (v18 or higher)
- npm (v9 or higher)

### Step 1: Clone and Extract
Extract the downloaded project folder and navigate to the directory:
```bash
cd Personalized-Networking-Assistant
```

### Step 2: Install Dependencies
Run the package manager to install all production and development dependencies:
```bash
npm install
```

### Step 3: Configure Secrets
Create a `.env` file in the root directory (matching `.env.example`) and append your Gemini API Key:
```env
GEMINI_API_KEY="YOUR_ACTUAL_GEMINI_API_KEY_HERE"
```

### Step 4: Run in Development
Start the full-stack server locally (runs on port `3000` by default):
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to run the application.

### Step 5: Build for Production
To compile and bundle both static client assets and the Express backend server:
```bash
npm run build
```
Start the production server:
```bash
npm start
```

---

## 📡 API Documentation

### 1. `POST /api/pipeline`
Executes the consolidated fast-pipeline. It parses the profile details and event description, returning the extracted metadata, 10 starters, scenarios, elevator pitches, and tactical guidelines in a single round-trip.
- **Request Body**:
  ```json
  {
    "profile": {
      "name": "Dr. Elena Rostova",
      "role": "Senior Research Scientist",
      "professionalInterests": ["Generative AI", "Deep Learning"],
      "personalInterests": ["Hiking", "Classical Piano"],
      "bio": "Elena focuses on multi-modal vision-language models."
    },
    "eventDescription": "Ethics and Safe AI panel and Industry Networking hour."
  }
  ```
- **Response**: Returns a complete `NetworkingSession` object populated with analyzed topics, starters, elevator pitches, tips, unique IDs, and an audit timestamp.

### 2. `POST /api/factcheck`
Queries the Wikipedia Search API, extracts the top snippets, and runs a fact-verification prompt through Gemini to determine the truth level.
- **Request Body**: `{"query": "Guido van Rossum invented Python"}`
- **Response**:
  ```json
  {
    "id": "factcheck-16892371",
    "query": "Guido van Rossum invented Python",
    "status": "Verified",
    "summary": "Guido van Rossum is best known as the creator of the Python programming language.",
    "sourceUrl": "https://en.wikipedia.org/wiki/Guido_van_Rossum",
    "explanation": "Wikipedia records confirm Guido van Rossum designed and released Python in 1991.",
    "confidence": 1.0
  }
  ```

### 3. `POST /api/feedback`
Submits feedback rating and comments, storing it under `/data/feedback.json`.
- **Request Body**:
  ```json
  {
    "sessionId": "session-123",
    "rating": 5,
    "comments": "Excellent icebreakers!",
    "likedStarters": ["What recent Generative AI advancements excite you most?"]
  }
  ```

### 4. `GET /api/metrics`
Aggregates logs, history sessions, and feedback records into dynamic coordinates for Recharts rendering (Rating distributions, action frequencies, latency distributions, and starter category ratios).

---

## 🧪 Test Cases & Verification Checklist

| Test ID | Module | Action | Expected Outcome | Status |
|---|---|---|---|---|
| TC-01 | Presets | Click "Dr. Elena Rostova" Preset | Form inputs are instantly populated with Dr. Elena's background. | ✅ Pass |
| TC-02 | Voice Dictation | Click "Dictate Bio" & grant microphone | Active indicator turns crimson and volume bars animate inside canvas based on real audio input. Speeches append to bio. | ✅ Pass |
| TC-03 | Fast-Pipeline | Click "Analyze & Generate Strategy" | Shows loading state, completes consolidated single-request LLM execution, and switches to Playbook Tab displaying 10 starters, pitches, and tips. | ✅ Pass |
| TC-04 | Fact Verification | Type a claim and click "Verify" | Sends query to Wikipedia API, processes through Gemini, and renders Status Badge (e.g., Verified/Disputed) along with explanation and wiki hyperlink. | ✅ Pass |
| TC-05 | Saved History | Navigate to History tab, click session card | Reloads the selected historical session into the main active dashboard. | ✅ Pass |
| TC-06 | Telemetry Metrics | Navigate to Metrics & Logs tab | Renders responsive recharts displaying ratings, latency, and outputs live terminal stream logs retrieved from Express backend. | ✅ Pass |

---

## 💻 How to Push this Project to GitHub (Submission Guide)

If you have an early Capstone submission deadline, follow this guide to quickly publish your code:

### Step 1: Export Project ZIP
1. In your Google AI Studio interface, open the **Settings Menu** (represented by a gear icon or settings tab).
2. Click on **Export as ZIP** (or Download Codebase) to download the clean codebase.
3. Extract the ZIP file locally on your computer.

### Step 2: Initialize Git and Push
Open your terminal (macOS/Linux) or Command Prompt/Git Bash (Windows) inside your project folder and execute these commands:
```bash
# 1. Initialize local repository
git init

# 2. Add all project files (except node_modules and builds which are ignored)
git add .

# 3. Create your first commit
git commit -m "feat: complete Personalized Networking Assistant capstone project"

# 4. Rename default branch to main
git branch -M main

# 5. Link to your empty GitHub Repository (replace with your actual GitHub URL)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY_NAME.git

# 6. Push to GitHub
git push -u origin main
```
Once complete, reload your GitHub page to see your beautifully formatted code and this professional README documentation! Excellent luck with your capstone presentation!
