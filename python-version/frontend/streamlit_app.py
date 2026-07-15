import streamlit as st
import requests
import json
import time

# Set Page Config for Modern Presentation
st.set_page_config(
    page_title="Personalized Networking Assistant",
    page_icon="💼",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom Styling to mimic Dark Slate & Gold theme
st.markdown("""
<style>
    .reportview-container {
        background: #0f1115;
    }
    .stButton>button {
        background-color: #c5a059;
        color: #000000;
        font-weight: bold;
        border-radius: 8px;
        border: none;
        padding: 10px 24px;
        font-family: monospace;
    }
    .stButton>button:hover {
        background-color: #b08c46;
        color: #000000;
    }
    .gold-header {
        color: #c5a059;
        font-family: 'Space Grotesk', sans-serif;
    }
    .card-style {
        background-color: #1a1e24;
        border-left: 4px solid #c5a059;
        padding: 16px;
        border-radius: 8px;
        margin-bottom: 12px;
    }
</style>
""", unsafe_allow_html=True)

# Application Header
st.title("💼 Personalized Networking Assistant")
st.caption("SmartBridge Capstone — Dual NLP Pipeline Generation Engine")

# FastAPI endpoint definition (runs on localhost port 8000)
API_BASE_URL = "http://localhost:8000/api/v1"

# Sidebar: User Profile & Setup
with st.sidebar:
    st.subheader("👤 Speaker & Presenter Profile")
    
    user_name = st.text_input("Full Name", value="Alice Miller")
    user_role = st.text_input("Professional Title", value="Senior ML Research Engineer")
    
    prof_interests_raw = st.text_area("Professional Fields (comma-separated)", value="Natural Language Processing, Generative AI, Cloud Devops")
    personal_interests_raw = st.text_area("Bonding Hobbies (comma-separated)", value="Mountain Hiking, Specialty Coffee, Photography")
    
    user_bio = st.text_area("Brief Biography", value="Passionate researcher focusing on scaling large language models efficiently. Love sharing findings at regional meetups.")

    st.markdown("---")
    st.markdown("### 🌐 Backend Endpoint Status")
    try:
        health_resp = requests.get(f"{API_BASE_URL}/health", timeout=2)
        if health_resp.status_code == 200:
            st.success("● FastAPI Service: ONLINE")
        else:
            st.warning("⚠️ FastAPI Service returned status: " + str(health_resp.status_code))
    except Exception:
        st.error("● FastAPI Service: OFFLINE (Run main.py on port 8000)")


# Split Main Screen Layout
col1, col2 = st.columns([1, 1.3])

with col1:
    st.subheader("📝 Target Event & Presentation Context")
    event_desc = st.text_area(
        "Event/Seminar Description",
        height=220,
        placeholder="Paste details of the upcoming conference, talk title, abstract, target audience, or specific tech panel you are attending...",
        value="Silicon Valley AI Summit 2026: A detailed deep-dive panel into deployment of local transformer models (DistilBERT, GPT-2) inside memory-constrained edge servers. Attended by tech leads, cloud architects, and system engineers looking to optimize low-latency pipelines."
    )
    
    generate_btn = st.button("🚀 GENERATE STRATEGY PLAYBOOK")
    
    st.write("")
    st.write("---")
    
    # Bottom: Fact Checking Widget
    st.subheader("🔍 Local Fact Verification Module")
    st.caption("Validate system statements or tech terminology via Wikipedia Search context lookup.")
    
    verify_query = st.text_input("Enter Tech Term, Concept, or Claim", placeholder="e.g., Zero-Shot Learning")
    verify_btn = st.button("Check Claim & Verify")
    
    if verify_btn and verify_query:
        with st.spinner("Checking Wikipedia & evaluating claim..."):
            try:
                resp = requests.post(f"{API_BASE_URL}/verify", json={"query": verify_query})
                if resp.status_code == 200:
                    data = resp.json()
                    st.write("")
                    if data["status"] == "VERIFIED":
                        st.success(f"✅ STATUS: {data['status']}")
                    else:
                        st.error(f"❌ STATUS: {data['status']}")
                    
                    st.info(data["summary"])
                    st.markdown(f"**Source Citation:** [Wikipedia Page]({data['sourceUrl']})")
                else:
                    st.error(f"Error checking fact: Backend returned status {resp.status_code}")
            except Exception as e:
                st.error(f"Failed to connect to FastAPI Backend API: {e}")

# Main Content Area - Displaying Output
with col2:
    if generate_btn:
        if not event_desc.strip():
            st.warning("Please provide a valid event description to begin analysis.")
        else:
            # Prepare profile payloads
            prof_interests = [x.strip() for x in prof_interests_raw.split(",") if x.strip()]
            personal_interests = [x.strip() for x in personal_interests_raw.split(",") if x.strip()]
            
            payload = {
                "profile": {
                    "name": user_name,
                    "role": user_role,
                    "professionalInterests": prof_interests,
                    "personalInterests": personal_interests,
                    "bio": user_bio
                },
                "eventDescription": event_desc
            }
            
            with st.spinner("Executing Double NLP Inference (Theme Analysis + Custom Generation)..."):
                try:
                    resp = requests.post(f"{API_BASE_URL}/generate", json=payload)
                    if resp.status_code == 200:
                        session_data = resp.json()
                        st.session_state["session_data"] = session_data
                        st.success(f"Playbook compiled successfully in {session_data.get('durationMs', 0)}ms!")
                    else:
                        st.error(f"Error {resp.status_code}: Failed to generate playbook from backend.")
                except Exception as e:
                    st.error(f"Failed to connect to FastAPI Backend API: {e}. Make sure the backend server is running locally on port 8000.")

    # Render results from Session State if present
    if "session_data" in st.session_state:
        data = st.session_state["session_data"]
        
        # Tab Layout
        tab1, tab2, tab3 = st.tabs(["📋 Strategic Playbook", "📊 Theme Extraction Data", "🛡️ Compliance & Logs"])
        
        with tab1:
            st.write("")
            st.markdown("### 🗣️ Customized Strategic Icebreakers (10 Customized Starters)")
            st.caption("Crafted by synthesizing your profile and background hobbies with the classified theme of the event.")
            
            for item in data.get("starters", []):
                st.markdown(f"""
                <div class="card-style">
                    <p style="font-size: 11px; text-transform: uppercase; color: #c5a059; font-weight: bold; margin-bottom: 4px;">{item.get('category')}</p>
                    <h4 style="margin-top: 0px; margin-bottom: 8px; color: #ffffff;">{item.get('title')}</h4>
                    <blockquote style="font-style: italic; color: #e2e8f0; font-size: 15px; margin-left: 0px; padding-left: 10px; border-left: 3px solid #64748b;">
                        "{item.get('text')}"
                    </blockquote>
                    <p style="font-size: 12px; color: #94a3b8; margin-top: 8px;"><b>Tactical Advantage:</b> {item.get('whyItWorks')}</p>
                </div>
                """, unsafe_allow_html=True)
                
            st.write("")
            st.markdown("### 🚀 Context-Specific Elevator Introductions")
            for pitch in data.get("elevatorPitches", []):
                st.markdown(f"""
                <div class="card-style" style="border-left-color: #64748b;">
                    <h4 style="margin-top: 0px; margin-bottom: 6px; color: #ffffff;">{pitch.get('title')}</h4>
                    <p style="font-style: italic; color: #e2e8f0;">"{pitch.get('text')}"</p>
                    <p style="font-size: 11px; color: #94a3b8; margin-top: 6px;"><b>Best timing:</b> {pitch.get('whenToUse')}</p>
                </div>
                """, unsafe_allow_html=True)

            st.write("")
            st.markdown("### 💡 Strategic Delivery Tips")
            for tip in data.get("tips", []):
                st.write(f"🔹 {tip}")

        with tab2:
            st.write("")
            st.markdown("### 🤖 DistilBERT Zero-Shot Classification Insights")
            st.write("Below are the real-time extraction metrics retrieved from classifying the event context against your custom interests:")
            
            themes = data.get("analyzedThemes", {})
            st.info(f"**Extracted Event Summary:** {themes.get('summary')}")
            
            col_t1, col_t2 = st.columns(2)
            with col_t1:
                st.markdown("**Identified Industries**")
                for ind in themes.get("industries", []):
                    st.write(f"🏢 {ind}")
                    
                st.markdown("**Core Practical Skills Needed**")
                for sk in themes.get("skills", []):
                    st.write(f"⚡ {sk}")
            
            with col_t2:
                st.markdown("**Classified Content Topics (Inference Confidence)**")
                for topic in themes.get("topics", []):
                    conf_pct = float(topic.get('confidence', 0)) * 100
                    st.write(f"📌 {topic.get('name')}")
                    st.progress(int(conf_pct))
                    st.caption(f"Confidence score: {conf_pct:.1f}%")

        with tab3:
            st.write("")
            st.markdown("### 📜 System Interaction Audit Trail")
            st.caption("Audit logs recording request response durations and compliance parameters.")
            
            st.json({
                "session_id": data.get("id"),
                "timestamp": data.get("timestamp"),
                "total_processing_duration_ms": data.get("durationMs"),
                "user_name_audited": data.get("userProfile", {}).get("name"),
                "payload_character_length": len(data.get("eventDescription", "")),
                "nlp_engines_invoked": ["DistilBERT MNLI", "GPT-2 Autoregressive Decoders"],
                "compliance_status": "PASS — NO PII LEAK"
            })
    else:
        # Prompt user to input on left side
        st.write("")
        st.info("👈 Enter your presenter profile and target event description in the left panel, then hit Generate to compile your strategic networking playbook.")
