import os
import io
import asyncio
import httpx
import edge_tts
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, StreamingResponse, FileResponse
from pydantic import BaseModel
from groq import Groq

load_dotenv()

app = FastAPI(title="A.R.I.S. // Master Tactical Command OS", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WEB_DIR = os.path.join(BASE_DIR, "web")
os.makedirs(WEB_DIR, exist_ok=True)

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

# Connected Sub-Nodes (Old repos stay 100% untouched)
NODES = {
    "friday": {"name": "F.R.I.D.A.Y.", "role": "Encrypted Vault & Comms", "url": "https://friday-aris.onrender.com/"},
    "omega": {"name": "OMEGA", "role": "Deep Neural & Physics Core", "url": "https://project-omega-m1.onrender.com/"},
    "alpha": {"name": "A.L.P.H.A.", "role": "Real-Time P2P & Sync", "url": "https://alpha-aris.onrender.com/"},
    "titan": {"name": "TITAN", "role": "Heavy Compute & Defense Aux", "url": "https://titan-aris.onrender.com/"},
}

AI_MODELS = ["openai/gpt-oss-120b", "qwen/qwen3.8-27b", "openai/gpt-oss-20b"]


class CommandPayload(BaseModel):
    prompt: str
    mode: str = "tactical"


class TTSPayload(BaseModel):
    text: str
    voice: str = "hi-IN-MadhurNeural"


@app.get("/", response_class=HTMLResponse)
async def serve_hud():
    path = os.path.join(WEB_DIR, "index.html")
    if not os.path.exists(path):
        return HTMLResponse("<h3>A.R.I.D.A.Y. / A.R.I.S. HUD Missing</h3>")
    with open(path, "r", encoding="utf-8") as f:
        return HTMLResponse(f.read())


@app.get("/style.css")
async def serve_css():
    return FileResponse(os.path.join(WEB_DIR, "style.css"), media_type="text/css")


@app.get("/app.js")
async def serve_js():
    return FileResponse(os.path.join(WEB_DIR, "app.js"), media_type="application/javascript")


@app.get("/api/nodes/status")
async def check_all_nodes():
    results = {}
    async with httpx.AsyncClient(timeout=4.0) as http:
        async def ping_node(key: str, info: dict):
            try:
                r = await http.get(info["url"])
                online = r.status_code < 500
            except Exception:
                online = False
            results[key] = {**info, "online": online}

        await asyncio.gather(*(ping_node(k, v) for k, v in NODES.items()))
    return {"nodes": results}


@app.post("/api/command")
async def process_aris_command(payload: CommandPayload):
    raw = payload.prompt.strip()
    low = raw.lower()

    routed_node = "A.R.I.S. MASTER CORE"
    open_url = ""
    if "@friday" in low or "private message" in low or "vault" in low:
        routed_node = "F.R.I.D.A.Y. COMMS NODE"
        open_url = NODES["friday"]["url"]
    elif "@omega" in low or "physics" in low or "derivation" in low:
        routed_node = "OMEGA NEURAL NODE"
        open_url = NODES["omega"]["url"]
    elif "@alpha" in low or "video call" in low or "room" in low:
        routed_node = "A.L.P.H.A. SYNC NODE"
        open_url = NODES["alpha"]["url"]
    elif "@titan" in low or "heavy" in low or "defense" in low:
        routed_node = "TITAN DEFENSE NODE"
        open_url = NODES["titan"]["url"]

    if not client:
        return {
            "reply": "Commander, GROQ_API_KEY Render environment mein set nahi hai. Tactical offline mode active.",
            "routed_node": routed_node,
            "open_url": open_url,
        }

    sys_prompt = (
        "You are A.R.I.S., an advanced Master Tactical AI Assistant built by Commander Mayank to assist soldiers "
        "like Piyush and coordinate sub-nodes (F.R.I.D.A.Y., OMEGA, A.L.P.H.A., TITAN). "
        "Speak naturally in crisp, confident Hinglish (mixing clear Hindi and English like an elite tactical co-pilot). "
        "Keep answers concise, sharp, and ready to be spoken aloud without markdown symbols like asterisks or hashes."
    )

    for model in AI_MODELS:
        try:
            res = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": sys_prompt},
                    {"role": "user", "content": raw},
                ],
                temperature=0.6,
                max_tokens=550,
            )
            clean_reply = res.choices[0].message.content.replace("*", "").replace("#", "").strip()
            return {"reply": clean_reply, "routed_node": routed_node, "open_url": open_url}
        except Exception:
            continue

    return {
        "reply": "Neural link momentarily busy hai Commander, dobara command dein.",
        "routed_node": routed_node,
        "open_url": open_url,
    }


@app.post("/api/tts")
async def generate_human_voice(payload: TTSPayload):
    clean = payload.text.replace("*", "").replace("#", "").strip()[:650]
    if not clean:
        clean = "Ready for command."
    comm = edge_tts.Communicate(clean, payload.voice, rate="+3%", pitch="-2Hz")
    buf = io.BytesIO()
    async for chunk in comm.stream():
        if chunk["type"] == "audio":
            buf.write(chunk["data"])
    buf.seek(0)
    return StreamingResponse(buf, media_type="audio/mpeg")
