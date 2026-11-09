let voiceEnabled = true;
let activeAudio = null;
let isSpeaking = false;
let themeIdx = 0;
const themes = ["", "theme-nvg", "theme-stark"];

const feed = document.getElementById("feed");
const cmdInput = document.getElementById("cmdInput");
const sendBtn = document.getElementById("sendBtn");
const micBtn = document.getElementById("micBtn");
const ttsToggle = document.getElementById("ttsToggle");
const themeToggle = document.getElementById("themeToggle");
const sosBtn = document.getElementById("sosBtn");
const voicePicker = document.getElementById("voicePicker");
const reactorStage = document.getElementById("reactorStage");
const coreStatus = document.getElementById("coreStatus");

// Live Digital HUD Clock
setInterval(() => {
  const el = document.getElementById("hudClock");
  if (el) el.textContent = new Date().toLocaleTimeString("en-IN", { hour12: false });
}, 1000);

// 3-Mode Hologram Theme Switcher (JARVIS Cyan -> NVG Green -> Stark Gold/Red)
themeToggle.addEventListener("click", () => {
  themeIdx = (themeIdx + 1) % themes.length;
  document.body.className = themes[themeIdx];
});

// Audio Toggle
ttsToggle.addEventListener("click", () => {
  voiceEnabled = !voiceEnabled;
  ttsToggle.textContent = voiceEnabled ? "🔊 AUDIO: LIVE" : "🔇 AUDIO: MUTE";
  ttsToggle.classList.toggle("active", voiceEnabled);
  if (!voiceEnabled && activeAudio) {
    activeAudio.pause();
    setSpeakingState(false);
  }
});

// SOS Flasher
sosBtn.addEventListener("click", () => {
  let c = 0;
  const t = setInterval(() => {
    document.body.style.background = c % 2 === 0 ? "#ffffff" : "";
    c++;
    if (c > 10) { clearInterval(t); document.body.style.background = ""; }
  }, 190);
});

function setSpeakingState(state) {
  isSpeaking = state;
  reactorStage.classList.toggle("speaking", state);
  coreStatus.textContent = state ? "SPEAKING" : "A.R.I.S.";
}

// Lightweight 60fps Canvas Voice Waveform
const canvas = document.getElementById("voiceWave");
const ctx = canvas.getContext("2d");
let phase = 0;

function drawWave() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const accent = getComputedStyle(document.body).getPropertyValue("--accent").trim() || "#00f0ff";
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.beginPath();

  const amp = isSpeaking ? 22 : 3;
  for (let x = 0; x < canvas.width; x += 4) {
    const env = Math.sin((x / canvas.width) * Math.PI);
    const y = canvas.height / 2 + Math.sin(x * 0.06 + phase) * amp * env;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  phase += isSpeaking ? 0.28 : 0.06;
  requestAnimationFrame(drawWave);
}
drawWave();

// Neural Voice Output
async function speakHinglish(text) {
  if (!voiceEnabled || !text) return;
  if (activeAudio) activeAudio.pause();
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice: voicePicker.value })
    });
    if (!res.ok) return;
    const blob = await res.blob();
    activeAudio = new Audio(URL.createObjectURL(blob));
    activeAudio.onplay = () => setSpeakingState(true);
    activeAudio.onended = () => setSpeakingState(false);
    activeAudio.onerror = () => setSpeakingState(false);
    activeAudio.play();
  } catch (e) {
    setSpeakingState(false);
  }
}

function addBubble(who, text, routeLabel = "") {
  const div = document.createElement("div");
  div.className = `msg ${who}`;
  div.innerHTML =
    (routeLabel ? `<div class="route-tag">◈ ${routeLabel}</div>` : "") +
    text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  feed.appendChild(div);
  feed.scrollTop = feed.scrollHeight;
}

function quickCmd(txt) {
  cmdInput.value = txt;
  sendCommand();
}

async function sendCommand() {
  const prompt = cmdInput.value.trim();
  if (!prompt) return;
  cmdInput.value = "";
  addBubble("user", prompt);
  coreStatus.textContent = "THINKING";

  try {
    const res = await fetch("/api/command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });
    const data = await res.json();
    coreStatus.textContent = "A.R.I.S.";
    addBubble("aris", data.reply, data.routed_node);
    speakHinglish(data.reply);
    if (data.open_url) window.open(data.open_url, "_blank");
  } catch (e) {
    coreStatus.textContent = "OFFLINE";
    addBubble("aris", "Tactical Offline Mode: Local protocols active.", "LOCAL CORE");
  }
}

sendBtn.addEventListener("click", sendCommand);
cmdInput.addEventListener("keydown", (e) => { if (e.key === "Enter") sendCommand(); });

// Mic Input
const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRec) {
  const rec = new SpeechRec();
  rec.lang = "en-IN";
  micBtn.addEventListener("click", () => {
    micBtn.textContent = "🔴 LISTENING";
    micBtn.classList.add("listening");
    coreStatus.textContent = "MIC LIVE";
    rec.start();
  });
  rec.onresult = (e) => {
    cmdInput.value = e.results[0][0].transcript;
    sendCommand();
  };
  rec.onend = () => {
    micBtn.textContent = "🎙️ VOICE";
    micBtn.classList.remove("listening");
    if (!isSpeaking) coreStatus.textContent = "A.R.I.S.";
  };
}

// 4-Node Live Ping Matrix
async function refreshNodeHealth() {
  try {
    const res = await fetch("/api/nodes/status");
    const data = await res.json();
    Object.keys(data.nodes).forEach((k) => {
      const online = data.nodes[k].online;
      const pingEl = document.getElementById(`ping-${k}`);
      const barEl = document.getElementById(`bar-${k}`);
      if (pingEl) {
        pingEl.textContent = online ? "ONLINE // LINKED" : "STANDBY";
        pingEl.classList.toggle("online", online);
      }
      if (barEl) barEl.classList.toggle("online", online);
    });
  } catch (e) {}
}
refreshNodeHealth();
setInterval(refreshNodeHealth, 30000);
