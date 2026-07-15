# Python-Based Personalized Networking Assistant (Local Setup Guide)

This directory contains the fully-implemented, highly optimized **Python-based FastAPI + Streamlit** architecture matching your Technical Architecture Diagram and requested project structure.

## 📐 Project Architecture Matching Your Diagram

1. **User Interface (Streamlit):** Located in `frontend/streamlit_app.py`. A beautiful dashboard allowing you to manage inputs, generate strategic icebreakers, check claims, and see deep theme extraction.
2. **API Layer (FastAPI):** Located in `backend/main.py`. Standardized REST API exposing:
   - `POST /api/v1/generate`: Receives profile data and event description, processes double AI models, and yields playbooks.
   - `POST /api/v1/verify`: Searches Wikipedia API and returns truth/confidence analysis.
3. **AI Inference (Local Transformers):** Real Python implementations of:
   - **DistilBERT** Zero-shot classification for event classification.
   - **GPT-2** Text generation for dynamic starter wording creation.
   - **Wikipedia Search API** client logic for real-time validation.
4. **Data & Storage Layer:** Fully integrated request audit log output with JSON structures.

---

## 🚀 How to Run Locally

Since this Python stack requires local model weights (DistilBERT + GPT-2) and dual-port networking (Port 3000 is used by the sandbox's live-preview server), it is optimized to run on your local laptop with full GPU/CPU hardware acceleration!

### Step 1: Install Python Dependencies
Open your terminal in this directory and create a virtual environment:

```bash
# Create a virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # On Windows, use `venv\Scripts\activate`

# Install required packages
pip install -r requirements.txt
```

### Step 2: Start the FastAPI Backend
Start the backend server on port 8000:

```bash
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```
*You will see the console log indicating Hugging Face is fetching and caching the `typeform/distilbert-base-uncased-mnli` and `gpt2` models locally.*

### Step 3: Start the Streamlit Frontend
In a new terminal window (with the virtual environment activated), start the Streamlit web app:

```bash
streamlit run frontend/streamlit_app.py
```

Streamlit will automatically open a browser window at `http://localhost:8501` where you can interact with the app locally!

---

## 🛠️ Folder Structure Map

```text
python-version/
├── backend/
│   └── main.py              # FastAPI controller, routes, lazy NLP & Wikipedia service
├── frontend/
│   └── streamlit_app.py     # Streamlit modern theme web application
├── requirements.txt         # Package dependencies (FastAPI, Streamlit, PyTorch, Transformers)
└── README.md                # This manual
```
