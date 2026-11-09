let voiceEnabled = true;
let activeAudio = null;

const feed = document.getElementById("feed");
const cmdInput = document.getElementById("cmdInput");
const sendBtn = document.getElementById("sendBtn");
const micBtn = document.getElementById("micBtn");
const ttsToggle = document.getElementById("ttsToggle");
const voicePicker = document.getElementById("voicePicker");

if (ttsToggle) {
  ttsToggle.addEventListener("click", () => {
    voiceEnabled = !voiceEnabled;
    ttsToggle.textContent = voiceEnabled ? "🔊 AUDIO: LIVE" : "🔇 AUDIO: MUTE";
    if (!voiceEnabled && activeAudio) activeAudio.pause();
  });
}

async function speakHinglish(text) {
  if (!voiceEnabled || !text) return;
  if (activeAudio) activeAudio.pause();
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: text,
        voice: voicePicker ? voicePicker.value : "hi-IN-MadhurNeural"
      })
    });
    if (!res.ok) return;
    const blob = await res.blob();
    activeAudio = new Audio(URL.createObjectURL(blob));
    activeAudio.play();
  } catch (e) {}
}

function addBubble(who, text, routeLabel = "") {
  const div = document.createElement("div");
  div.className = `msg ${who}`;
  div.innerHTML =
    (routeLabel ? `<div class="route-tag">⚡ ${routeLabel}</div>` : "") +
    text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  feed.appendChild(div);
  feed.scrollTop = feed.scrollHeight;
}

async function sendCommand() {
  const prompt = cmdInput.value.trim();
  if (!prompt) return;
  cmdInput.value = "";
  addBubble("user", prompt);

  try {
    const res = await fetch("/api/command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: prompt })
    });
    const data = await res.json();
    addBubble("aris", data.reply, data.routed_node || "A.R.I.S. CORE");
    speakHinglish(data.reply);
    if (data.open_url) window.open(data.open_url, "_blank");
  } catch (err) {
    addBubble("aris", "Server se connect nahi ho pa raha hai dost, Render logs check karo.", "ERROR");
  }
}

if (sendBtn) sendBtn.addEventListener("click", sendCommand);
if (cmdInput) {
  cmdInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendCommand();
  });
}

// Mic Input
const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRec && micBtn) {
  const rec = new SpeechRec();
  rec.lang = "en-IN";
  micBtn.addEventListener("click", () => {
    micBtn.textContent = "🔴 LISTENING";
    rec.start();
  });
  rec.onresult = (e) => {
    cmdInput.value = e.results[0][0].transcript;
    sendCommand();
  };
  rec.onend = () => {
    micBtn.textContent = "🎙️ VOICE";
  };
}
