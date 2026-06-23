(function () {
  const API = ""; // same origin

  const promptEl = document.getElementById("prompt");
  const sendBtn = document.getElementById("send-btn");
  const voiceBtn = document.getElementById("voice-btn");
  const voiceStatus = document.getElementById("voice-status");
  const chatLog = document.getElementById("chat-log");
  const traceEl = document.getElementById("agent-trace");
  const metricsEl = document.getElementById("metrics-used");
  const followUpsEl = document.getElementById("follow-ups");
  const guardrailEl = document.getElementById("guardrail");
  const uploadForm = document.getElementById("upload-form");
  const fileInput = document.getElementById("metrics-file");
  const pickFileBtn = document.getElementById("pick-file-btn");
  const uploadBtn = document.getElementById("upload-btn");
  const sampleBtn = document.getElementById("sample-btn");
  const fileStatus = document.getElementById("file-status");
  const uploadZone = document.getElementById("upload-zone");
  const loadingEl = document.getElementById("loading");
  const resetBtn = document.getElementById("reset-btn");
  const stepUpload = document.getElementById("step-upload");
  const stepAsk = document.getElementById("step-ask");
  const stepOutput = document.getElementById("step-output");

  let fileLoaded = window.COPILOT_FILE_LOADED === true;
  let hasOutput = false;
  let voiceSendPending = false;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const synth = window.speechSynthesis;
  let recognition = null;

  function setLoading(on) {
    loadingEl.classList.toggle("hidden", !on);
    sendBtn.disabled = on || !fileLoaded;
    voiceBtn.disabled = on || !fileLoaded;
    sampleBtn.disabled = on;
    uploadBtn.disabled = on || !fileInput.files.length;
  }

  function updateSteps() {
    stepUpload.classList.toggle("done", fileLoaded);
    stepUpload.classList.toggle("active", !fileLoaded);
    stepAsk.classList.toggle("active", fileLoaded && !hasOutput);
    stepAsk.classList.toggle("done", hasOutput);
    stepOutput.classList.toggle("active", hasOutput);
    stepOutput.classList.toggle("done", hasOutput);
  }

  function enableInput(enabled) {
    fileLoaded = enabled;
    promptEl.disabled = !enabled;
    sendBtn.disabled = !enabled;
    voiceBtn.disabled = !enabled;
    updateSteps();
  }

  function formatAnswer(text) {
    const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return escaped
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/^(\d+\.\s.+)$/gm, "<li>$1</li>")
      .replace(/^-\s(.+)$/gm, "<li>$1</li>")
      .replace(/(<li>.*<\/li>\n?)+/g, function (block) { return "<ul>" + block + "</ul>"; })
      .replace(/\n\n/g, "<br><br>")
      .replace(/\n/g, "<br>");
  }

  function appendMessage(role, text, html) {
    const div = document.createElement("div");
    div.className = "msg " + role;
    if (html) div.innerHTML = html;
    else div.textContent = text;
    chatLog.appendChild(div);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  function renderTrace(steps) {
    traceEl.innerHTML = "";
    (steps || []).forEach(function (step) {
      const row = document.createElement("div");
      row.className = "trace-step";
      row.innerHTML = '<span class="trace-badge">' + step.tool + '</span><span>' + step.detail + "</span>";
      traceEl.appendChild(row);
    });
  }

  function renderMetrics(metrics) {
    metricsEl.innerHTML = "";
    Object.keys(metrics || {}).forEach(function (name) {
      const m = metrics[name];
      const card = document.createElement("div");
      card.className = "metric-card";
      card.innerHTML = "<strong>" + name + "</strong>" + m.value + " " + m.unit +
        "<br><span style='color:#666'>" + m.tier + " tier</span>";
      metricsEl.appendChild(card);
    });
  }

  function renderFollowUps(items) {
    followUpsEl.innerHTML = "";
    (items || []).forEach(function (q) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = q;
      btn.addEventListener("click", function () { promptEl.value = q; sendMessage(); });
      followUpsEl.appendChild(btn);
    });
  }

  function setFileStatus(name, rows) {
    fileStatus.textContent = "✓ " + name + " (" + rows + " rows)";
    fileStatus.classList.add("loaded");
  }

  function speak(text) {
    if (!synth || !text) return;
    synth.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.95;
    synth.speak(utter);
  }

  async function loadFileResponse(res) {
    const data = await res.json();
    if (!res.ok) {
      appendMessage("system", data.error || "Upload failed.");
      return false;
    }
    enableInput(true);
    setFileStatus(data.file_name, data.row_count);
    appendMessage("system", data.message);
    promptEl.focus();
    return true;
  }

  async function sendMessage() {
    const message = (promptEl.value || "").trim();
    if (!message || !fileLoaded) return;

    setLoading(true);
    appendMessage("user", message);
    promptEl.value = "";

    try {
      const res = await fetch(API + "/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ message: message }),
      });
      const data = await res.json();
      if (!res.ok) {
        appendMessage("system", data.error || "Request failed.");
        return;
      }
      hasOutput = true;
      updateSteps();
      appendMessage("agent", data.answer, formatAnswer(data.answer));
      renderTrace(data.steps);
      renderMetrics(data.metrics_used);
      renderFollowUps(data.follow_ups);
      if (data.guardrail) guardrailEl.textContent = data.guardrail;
      speak(data.voice_summary);
    } catch (err) {
      appendMessage("system", "Network error: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  pickFileBtn.addEventListener("click", function () { fileInput.click(); });
  fileInput.addEventListener("change", function () {
    uploadBtn.disabled = !fileInput.files.length;
    if (fileInput.files.length) pickFileBtn.textContent = fileInput.files[0].name;
  });

  uploadZone.addEventListener("dragover", function (e) { e.preventDefault(); uploadZone.classList.add("dragover"); });
  uploadZone.addEventListener("dragleave", function () { uploadZone.classList.remove("dragover"); });
  uploadZone.addEventListener("drop", function (e) {
    e.preventDefault();
    uploadZone.classList.remove("dragover");
    if (e.dataTransfer.files.length) {
      fileInput.files = e.dataTransfer.files;
      uploadBtn.disabled = false;
      pickFileBtn.textContent = e.dataTransfer.files[0].name;
    }
  });

  uploadForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    if (!fileInput.files.length) return appendMessage("system", "Choose a CSV file first.");
    setLoading(true);
    const formData = new FormData();
    formData.append("file", fileInput.files[0]);
    try {
      await loadFileResponse(await fetch(API + "/api/upload", { method: "POST", body: formData, credentials: "same-origin" }));
    } finally {
      setLoading(false);
    }
  });

  sampleBtn.addEventListener("click", async function () {
    setLoading(true);
    try {
      await loadFileResponse(await fetch(API + "/api/sample", { method: "POST", credentials: "same-origin" }));
    } finally {
      setLoading(false);
    }
  });

  resetBtn.addEventListener("click", async function () {
    await fetch(API + "/api/reset", { method: "POST", credentials: "same-origin" });
    window.location.reload();
  });

  sendBtn.addEventListener("click", sendMessage);
  promptEl.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });

  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.onstart = function () {
      voiceStatus.textContent = "Listening…";
      voiceBtn.disabled = true;
    };
    recognition.onend = function () {
      voiceBtn.disabled = !fileLoaded;
    };
    recognition.onerror = function (event) {
      voiceBtn.disabled = !fileLoaded;
      voiceStatus.textContent = event.error === "not-allowed"
        ? "Microphone blocked — allow mic access for this site."
        : "Voice error: " + event.error;
    };
    recognition.onresult = function (event) {
      var transcript = "";
      for (var i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      promptEl.value = transcript.trim();
      voiceStatus.textContent = 'Heard: "' + promptEl.value + '"';
      if (event.results[event.results.length - 1].isFinal && !voiceSendPending) {
        voiceSendPending = true;
        setTimeout(function () { sendMessage(); voiceSendPending = false; }, 400);
      }
    };
    voiceBtn.addEventListener("click", function () {
      if (!fileLoaded) return voiceStatus.textContent = "Load data first.";
      try { recognition.start(); } catch (e) { voiceStatus.textContent = "Could not start voice."; }
    });
  } else {
    voiceBtn.disabled = true;
    voiceStatus.textContent = "Voice not supported in this browser.";
  }

  updateSteps();
})();
