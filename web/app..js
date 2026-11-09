let voiceEnabled = true;
let activeAudio = null;

// Elements
const feed = document.getElementById("feed");
const cmdInput = document.getElementById("cmdInput");
const sendBtn = document.getElementById("sendBtn");
const micBtn = document.getElementById("micBtn");
const ttsToggle = document.getElementById("ttsToggle");
const themeToggle = document.getElementById("themeToggle");
const sosBtn = document.getElementById("sosBtn");
const voicePicker = document.getElementById("voicePicker");

// Toggle Natural Voice Output
ttsToggle.addEventListener("click", () => {
  voiceEnabled = !voiceEnabled;
  ttsToggle.textContent = voiceEnabled ? "🔊 VOICE: ON" : "🔇 VOICE: OFF";
  ttsToggle.classList.toggle("active", voiceEnabled);
  if (!voiceEnabled && activeAudio) {
    activeAudio.pause();
    activeAudio = null;
  }
});

// Toggle NVG Green / Amber Tactical Theme
themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("amber-mode");
});

// Visual SOS Beacon Flasher
sosBtn.addEventListener("click", () => {
  let count = 0;
  const flash = setInterval(() => {
    document.body.style.background = count % 2 === 0 ? "#ffffff" : "";
    count++;
    if (count > 10) {
      clearInterval(flash);
      document.body.style.background = "";
    }
  }, 200);
});

// Play Real Human Neural Voice from /api/tts
async function speakHinglish(text) {
  if (!voiceEnabled || !text) return;
  if (activeAudio) {
    activeAudio.pause();
    activeAudio = null;
  }
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice: voicePicker.value })
    });
    if (!res.ok) return;
    const blob = await res.blob();
    activeAudio = new Audio(URL.createObjectURL(blob));
    activeAudio.play();
  } catch (err) {
    console.warn("TTS link offline:", err);
  }
}

// Add Message Bubble to HUD
function addBubble(who, text, routeLabel = "") {
  const div = document.createElement("div");
  div.className = `msg ${who}`;
  div.innerHTML =
    (routeLabel ? `<div class="route-tag">⚡ ${routeLabel}</div>` : "") +
    text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  feed.appendChild(div);
  feed.scrollTop = feed.scrollHeight;
}

// Send Typed or Spoken Command to A.R.I.S. Master Core
async function sendCommand() {
  const prompt = cmdInput.value.trim();
  if (!prompt) return;
  cmdInput.value = "";
  addBubble("user", prompt);

  try {
    const res = await fetch("/api/command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });
    const data = await res.json();
    addBubble("aris", data.reply, data.routed_node);
    speakHinglish(data.reply);

    if (data.open_url) {
      window.open(data.open_url, "_blank");
    }
  } catch (err) {
    addBubble(
      "aris",
      "Offline Tactical Mode active: Network weak hai Commander, par local survival aur Morse protocols ready hain.",
      "OFFLINE CORE"
    );
  }
}

sendBtn.addEventListener("click", sendCommand);
cmdInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendCommand();
});

// Speech-to-Text Mic Input (Hindi + English)
const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null;

if (SpeechRec) {
  rec = new SpeechRec();
  rec.lang = "en-IN";
  rec.interimResults = false;

  rec.onresult = (e) => {
    cmdInput.value = e.results[0][0].transcript;
    sendCommand();
  };

  rec.onend = () => {
    micBtn.textContent = "🎙️ SPEAK";
    micBtn.classList.remove("listening");
  };
}

micBtn.addEventListener("click", () => {
  if (!rec) {
    alert("Voice input ke liye Chrome ya Edge browser use karein.");
    return;
  }
  micBtn.textContent = "🔴 LISTENING...";
  micBtn.classList.add("listening");
  rec.start();
});

// Live Health Ping for F.R.I.D.A.Y., OMEGA, A.L.P.H.A., TITAN
async function refreshNodeHealth() {
  try {
    const res = await fetch("/api/nodes/status");
    const data = await res.json();
    Object.keys(data.nodes).forEach((key) => {
      const dot = document.getElementById(`dot-${key}`);
      if (dot) dot.classList.toggle("online", data.nodes[key].online);
    });
  } catch (err) {}
}

refreshNodeHealth();
setInterval(refreshNodeHealth, 30000);
