import os
import time
import requests
from typing import List, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Initialize FastAPI App
app = FastAPI(
    title="Personalized Networking Assistant Backend",
    description="FastAPI Backend powering local AI model inference & external API integrations",
    version="1.0.0"
)

# Enable CORS for Streamlit frontend interaction
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Lazy-loaded NLP Pipelines (prevents slowing down server boot)
_classifier = None
_generator = None

def get_classifier():
    """Lazy loads DistilBERT Zero-Shot Classification pipeline"""
    global _classifier
    if _classifier is None:
        try:
            from transformers import pipeline
            print("Loading DistilBERT zero-shot classification model...")
            # Using 'typeform/distilbert-base-uncased-mnli' or standard zero-shot classifier
            _classifier = pipeline("zero-shot-classification", model="typeform/distilbert-base-uncased-mnli")
        except Exception as e:
            print(f"Error loading classifier: {e}")
            _classifier = "fallback"
    return _classifier

def get_generator():
    """Lazy loads GPT-2 Text Generation pipeline"""
    global _generator
    if _generator is None:
        try:
            from transformers import pipeline
            print("Loading GPT-2 text generation model...")
            _generator = pipeline("text-generation", model="gpt2")
        except Exception as e:
            print(f"Error loading generator: {e}")
            _generator = "fallback"
    return _generator


# --- Pydantic Schemas ---
class UserProfile(BaseModel):
    name: str
    role: str
    professionalInterests: List[str]
    personalInterests: List[str]
    bio: str

class GenerateRequest(BaseModel):
    profile: UserProfile
    eventDescription: str

class VerifyRequest(BaseModel):
    query: str


# --- Core Endpoints ---

@app.get("/api/v1/health")
def health_check():
    return {"status": "healthy", "timestamp": time.time()}


@app.post("/api/v1/generate")
def generate_strategy(payload: GenerateRequest):
    """
    Executes the double AI Inference pipeline:
    1. DistilBERT Zero-Shot Classification to extract topics & domains from the event description.
    2. GPT-2 to synthesize custom conversation starters matching the user's profile and the event.
    """
    start_time = time.time()
    
    # 1. DistilBERT zero-shot classification for theme extraction
    candidate_labels = ["Artificial Intelligence", "Web Development", "Cloud Computing", "Career Growth", "Business Strategy", "Marketing", "Entrepreneurship"]
    candidate_labels.extend(payload.profile.professionalInterests)
    candidate_labels = list(set(candidate_labels)) # deduplicate
    
    analyzed_themes = {
        "summary": payload.eventDescription[:250] + "...",
        "industries": ["Technology", "Information Services"],
        "skills": payload.profile.professionalInterests[:2],
        "topics": []
    }
    
    classifier = get_classifier()
    if classifier and classifier != "fallback":
        try:
            result = classifier(payload.eventDescription, candidate_labels=candidate_labels)
            # Take top 3 classified categories
            top_labels = result['labels'][:3]
            top_scores = result['scores'][:3]
            analyzed_themes["topics"] = [{"name": label, "confidence": float(score)} for label, score in zip(top_labels, top_scores)]
        except Exception as err:
            print(f"Classification error: {err}")
            analyzed_themes["topics"] = [{"name": "General Tech", "confidence": 0.85}]
    else:
        # Fallback if transformers is not installed or loading failed
        analyzed_themes["topics"] = [
            {"name": "Networking & Collaboration", "confidence": 0.90},
            {"name": "Industry Innovation", "confidence": 0.80}
        ]

    # 2. GPT-2 Text Generation for conversation starters & elevator pitches
    starters = []
    generator = get_generator()
    
    # We will generate 3 customized icebreakers
    categories = ["Technology", "Career", "Icebreaker"]
    
    for idx, category in enumerate(categories):
        topic_context = analyzed_themes["topics"][0]["name"] if analyzed_themes["topics"] else "modern innovation"
        prompt = (
            f"Topic: {topic_context}. "
            f"Professional role: {payload.profile.role}. "
            f"Interest: {payload.profile.professionalInterests[0] if payload.profile.professionalInterests else 'technology'}. "
            f"Icebreaker: "
        )
        
        generated_text = ""
        if generator and generator != "fallback":
            try:
                outputs = generator(prompt, max_length=60, num_return_sequences=1, pad_token_id=50256)
                generated_text = outputs[0]['generated_text'].replace(prompt, "").strip()
            except Exception as err:
                print(f"Generator error: {err}")
        
        # Clean or fallback
        if not generated_text or len(generated_text) < 10:
            if category == "Technology":
                generated_text = f"I noticed you mentioned working in {topic_context}. As a {payload.profile.role} focusing on {payload.profile.professionalInterests[0] if payload.profile.professionalInterests else 'systems'}, I'm curious about your perspective on where this field is heading next."
            elif category == "Career":
                generated_text = f"I've been heavily exploring {payload.profile.professionalInterests[0] if payload.profile.professionalInterests else 'new projects'} lately. Are there any major hurdles you've run into with it in your current team?"
            else:
                hobby = payload.profile.personalInterests[0] if payload.profile.personalInterests else "learning new things"
                generated_text = f"When I'm not working on engineering challenges, I spend a lot of time with {hobby}. It actually taught me a lot about patience, which helps a lot with complex architecture design!"

        starters.append({
            "id": f"starter-py-{idx}",
            "category": category,
            "title": f"Strategic {category}",
            "text": generated_text,
            "whyItWorks": f"Leverages common affinity in {topic_context} combined with your experience as a {payload.profile.role}."
        })

    # Generate an Elevator Pitch
    elevator_pitches = [{
        "id": "pitch-py-1",
        "title": "Default Context Elevator Pitch",
        "text": f"Hi, I'm {payload.profile.name}. I work as a {payload.profile.role}, and I'm really passionate about {', '.join(payload.profile.professionalInterests[:2])}. Lately I've been focusing on how {analyzed_themes['topics'][0]['name'] if analyzed_themes['topics'] else 'industry shifts'} affect developers, which is why I was so excited to join this event today.",
        "whenToUse": "Perfect for standard circle introductions or when a speaker asks what brings you to their talk."
    }]

    # Return structured Networking Session matching frontend TypeScript types
    return {
        "id": f"session-py-{int(time.time())}",
        "userProfile": payload.profile.dict(),
        "eventDescription": payload.eventDescription,
        "analyzedThemes": analyzed_themes,
        "starters": starters,
        "elevatorPitches": elevator_pitches,
        "tips": [
            "Maintain relaxed eye contact and ask open-ended follow-up questions.",
            "Active listening is your superpower. Let the other person speak 60% of the time.",
            "Always follow up within 24-48 hours on LinkedIn referencing your specific conversation topic."
        ],
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "durationMs": int((time.time() - start_time) * 1000)
    }


@app.post("/api/v1/verify")
def verify_claim(payload: VerifyRequest):
    """
    Fact Verification Module:
    Searches the Wikipedia Lookup API for a specific claim or keyword,
    and returns verified status data.
    """
    query = payload.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query string cannot be empty.")
    
    # 1. Search Wikipedia API
    wiki_url = f"https://en.wikipedia.org/w/api.php"
    params = {
        "action": "query",
        "list": "search",
        "srsearch": query,
        "format": "json",
        "utf8": 1
    }
    
    snippet = "No matching context found."
    source_url = "https://en.wikipedia.org"
    
    try:
        response = requests.get(wiki_url, params=params, timeout=5)
        if response.status_code == 200:
            data = response.json()
            search_results = data.get("query", {}).get("search", [])
            if search_results:
                top_result = search_results[0]
                snippet = top_result.get("snippet", "").replace("<span class=\"searchmatch\">", "").replace("</span>", "")
                page_id = top_result.get("pageid")
                source_url = f"https://en.wikipedia.org/?curid={page_id}"
    except Exception as e:
        print(f"Wikipedia search failed: {e}")

    # 2. Simulated verification reasoning
    status = "VERIFIED"
    summary = f"Based on Wikipedia records, there is active documentation regarding '{query}'. Records indicate: {snippet}"
    
    if "No matching context found" in snippet:
        status = "UNVERIFIED"
        summary = f"We could not locate reliable, verified documentation for '{query}' on Wikipedia. Please exercise caution when citing or referencing this topic."

    return {
        "id": f"factcheck-py-{int(time.time())}",
        "query": query,
        "status": status,
        "summary": summary,
        "sourceUrl": source_url,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }


# To execute locally:
if __name__ == "__main__":
    import uvicorn
    # Bound to port 8000 for internal local API services
    uvicorn.run(app, host="0.0.0.0", port=8000)
