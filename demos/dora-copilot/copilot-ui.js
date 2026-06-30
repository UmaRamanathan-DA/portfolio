(function () {
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
  const stepUpload = document.getElementById("step-upload");
  const stepAsk = document.getElementById("step-ask");
  const stepOutput = document.getElementById("step-output");

  let metricRows = [];
  let sessionContext = {};
  let fileLoaded = false;
  let hasOutput = false;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const synth = window.speechSynthesis;
  let recognition = null;
  let voiceSendPending = false;

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
    if (!steps || !steps.length) {
      traceEl.innerHTML = '<div class="empty-state">No tools called.</div>';
      return;
    }
    steps.forEach(function (step) {
      const row = document.createElement("div");
      row.className = "trace-step";
      row.innerHTML = '<span class="trace-badge">' + step.tool + '</span><span>' + step.detail + "</span>";
      traceEl.appendChild(row);
    });
  }

  function renderMetrics(metrics) {
    metricsEl.innerHTML = "";
    const keys = Object.keys(metrics || {});
    if (!keys.length) {
      metricsEl.innerHTML = '<div class="empty-state">No metrics parsed.</div>';
      return;
    }
    keys.forEach(function (name) {
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
      btn.addEventListener("click", function () {
        promptEl.value = q;
        sendMessage();
      });
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

  function loadMetrics(content, fileName) {
    metricRows = DoraAgent.parseMetricsFile(content);
    if (!metricRows.length) {
      appendMessage("system", "Could not parse CSV. Check column format.");
      return false;
    }
    sessionContext = {};
    enableInput(true);
    setFileStatus(fileName, metricRows.length);
    appendMessage("system", "Loaded " + metricRows.length + " rows from " + fileName + ". Ask a question.");
    promptEl.focus();
    return true;
  }

  function sendMessage() {
    const message = (promptEl.value || "").trim();
    if (!message || !fileLoaded || !metricRows.length) return;

    setLoading(true);
    appendMessage("user", message);
    promptEl.value = "";

    try {
      const data = DoraAgent.runAgent(message, metricRows, sessionContext);
      sessionContext = { last_intent: data.intent, last_message: message, last_metric: data.last_metric };
      hasOutput = true;
      updateSteps();
      appendMessage("agent", data.answer, formatAnswer(data.answer));
      renderTrace(data.steps);
      renderMetrics(data.metrics_used);
      renderFollowUps(data.follow_ups);
      if (data.guardrail) guardrailEl.textContent = data.guardrail;
      speak(data.voice_summary);
    } catch (err) {
      appendMessage("system", "Error: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  pickFileBtn.addEventListener("click", function () { fileInput.click(); });

  fileInput.addEventListener("change", function () {
    uploadBtn.disabled = !fileInput.files.length;
    if (fileInput.files.length) pickFileBtn.textContent = fileInput.files[0].name;
  });

  uploadZone.addEventListener("dragover", function (e) {
    e.preventDefault();
    uploadZone.classList.add("dragover");
  });
  uploadZone.addEventListener("dragleave", function () {
    uploadZone.classList.remove("dragover");
  });
  uploadZone.addEventListener("drop", function (e) {
    e.preventDefault();
    uploadZone.classList.remove("dragover");
    if (e.dataTransfer.files.length) {
      fileInput.files = e.dataTransfer.files;
      uploadBtn.disabled = false;
      pickFileBtn.textContent = e.dataTransfer.files[0].name;
    }
  });

  uploadForm.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!fileInput.files.length) {
      appendMessage("system", "Choose a CSV file first.");
      return;
    }
    setLoading(true);
    const reader = new FileReader();
    reader.onload = function () {
      loadMetrics(reader.result, fileInput.files[0].name);
      setLoading(false);
    };
    reader.onerror = function () {
      appendMessage("system", "Could not read file.");
      setLoading(false);
    };
    reader.readAsText(fileInput.files[0]);
  });

  sampleBtn.addEventListener("click", function () {
    setLoading(true);
    fetch("sample_dora_metrics.csv")
      .then(function (res) { return res.text(); })
      .then(function (text) {
        loadMetrics(text, "sample_dora_metrics.csv");
      })
      .catch(function () {
        appendMessage("system", "Could not load sample data.");
      })
      .finally(function () { setLoading(false); });
  });

  sendBtn.addEventListener("click", sendMessage);
  promptEl.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    function setVoiceStatus(msg) {
      voiceStatus.textContent = msg;
    }

    recognition.onstart = function () {
      setVoiceStatus("Listening… speak your question.");
      voiceBtn.textContent = "Listening…";
      voiceBtn.disabled = true;
    };
    recognition.onend = function () {
      voiceBtn.textContent = "Voice";
      voiceBtn.disabled = !fileLoaded;
      if (voiceStatus.textContent.indexOf("Listening") >= 0) {
        setVoiceStatus("Voice ready — click Voice and speak (works best in Chrome, in a new tab)");
      }
    };
    recognition.onerror = function (event) {
      voiceBtn.textContent = "Voice";
      voiceBtn.disabled = !fileLoaded;
      var msg = "Voice error: ";
      if (event.error === "not-allowed") {
        msg = "Microphone blocked. Open demo in a new tab (not embedded) and allow mic access.";
      } else if (event.error === "no-speech") {
        msg = "No speech detected. Try again.";
      } else {
        msg += event.error;
      }
      setVoiceStatus(msg);
    };
    recognition.onresult = function (event) {
      var transcript = "";
      for (var i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      promptEl.value = transcript.trim();
      setVoiceStatus('Heard: "' + promptEl.value + '"');
      var last = event.results[event.results.length - 1];
      if (last.isFinal && !voiceSendPending) {
        voiceSendPending = true;
        setVoiceStatus('Heard: "' + promptEl.value + '" — sending…');
        setTimeout(function () {
          sendMessage();
          voiceSendPending = false;
        }, 400);
      }
    };

    voiceBtn.addEventListener("click", function () {
      if (!fileLoaded) {
        setVoiceStatus("Load sample data or upload a CSV first.");
        return;
      }
      try {
        recognition.start();
      } catch (err) {
        setVoiceStatus("Could not start voice — try again or type your question.");
      }
    });
  } else {
    voiceBtn.disabled = true;
    voiceStatus.textContent = "Web Speech API not supported here.";
  }

  updateSteps();
})();
