/**
 * Loads GoatCounter + optional subtle view count.
 * Depends on assets/analytics-config.js (window.PORTFOLIO_ANALYTICS).
 */
(function () {
  var cfg = window.PORTFOLIO_ANALYTICS || {};
  var code = (cfg.goatcounterCode || "").trim();
  if (!code) {
    return;
  }

  var host = window.location.hostname;
  var productionHosts = cfg.productionHosts || [];
  var isLocal =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "[::1]" ||
    host.endsWith(".local");
  var isProduction =
    productionHosts.length === 0 || productionHosts.indexOf(host) !== -1;

  // GoatCounter's built-in browser exclude (#toggle-goatcounter → localStorage "skipgc")
  var skipGc = false;
  try {
    skipGc = window.localStorage.getItem("skipgc") === "t";
  } catch (e) {
    /* private mode */
  }

  // Extra opt-out for this portfolio (set via ?skip_analytics=1 or localStorage)
  var skipPortfolio = false;
  try {
    var params = new URLSearchParams(window.location.search);
    if (params.get("skip_analytics") === "1") {
      window.localStorage.setItem("portfolio_skip_analytics", "1");
    }
    if (params.get("skip_analytics") === "0") {
      window.localStorage.removeItem("portfolio_skip_analytics");
    }
    skipPortfolio = window.localStorage.getItem("portfolio_skip_analytics") === "1";
  } catch (e) {
    /* ignore */
  }

  var shouldCount = isProduction && !isLocal && !skipGc && !skipPortfolio;
  var endpoint = "https://" + code + ".goatcounter.com/count";

  window.goatcounter = window.goatcounter || {};
  if (!shouldCount) {
    window.goatcounter.no_onload = true;
  } else {
    window.goatcounter.endpoint = endpoint;
  }

  function injectStyles() {
    if (document.getElementById("gc-views-style")) return;
    var style = document.createElement("style");
    style.id = "gc-views-style";
    style.textContent =
      ".gc-views{" +
      "display:block;margin:1.5rem auto 0;padding:0.75rem 1rem 1.25rem;" +
      "max-width:900px;text-align:center;font-family:Poppins,system-ui,sans-serif;" +
      "font-size:0.75rem;letter-spacing:0.04em;color:#8a8a8a;opacity:0.85;" +
      "}" +
      ".gc-views[hidden]{display:none!important}" +
      ".gc-views strong{font-weight:600;color:#666}";
    document.head.appendChild(style);
  }

  function formatViews(raw) {
    if (raw == null || raw === "") return null;
    var cleaned = String(raw).replace(/[^\d]/g, "");
    if (!cleaned) return null;
    var n = parseInt(cleaned, 10);
    if (!isFinite(n) || n < 1) return null;
    return n.toLocaleString();
  }

  function formatAsOfDate(date) {
    var months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    return date.getDate() + " " + months[date.getMonth()] + " " + date.getFullYear();
  }

  function renderViewCount(countText) {
    injectStyles();
    var el = document.getElementById("site-views") || document.querySelector("[data-gc-views]");
    if (!el) {
      el = document.createElement("p");
      el.id = "site-views";
      el.className = "gc-views";
      el.setAttribute("aria-live", "polite");
      document.body.appendChild(el);
    }
    el.classList.add("gc-views");
    el.hidden = false;
    el.innerHTML =
      "<strong>" +
      countText +
      "</strong> views · as of " +
      formatAsOfDate(new Date());
  }

  function fetchViewCount() {
    if (cfg.showViewCount === false) return;

    var path = window.location.pathname || "/";
    // Prefer GoatCounter's normalized path once count.js is ready
    try {
      if (window.goatcounter && typeof window.goatcounter.get_data === "function") {
        var data = window.goatcounter.get_data();
        if (data && data.p) path = data.p;
      }
    } catch (e) {
      /* use pathname */
    }

    var url =
      "https://" +
      code +
      ".goatcounter.com/counter/" +
      encodeURIComponent(path) +
      ".json";

    fetch(url, { credentials: "omit", mode: "cors" })
      .then(function (res) {
        if (!res.ok) return null;
        return res.json();
      })
      .then(function (json) {
        if (!json) return;
        var formatted = formatViews(json.count);
        if (formatted) renderViewCount(formatted);
      })
      .catch(function () {
        /* counter may be disabled until first hit / setting enabled */
      });
  }

  function loadGoatCounter() {
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://gc.zgo.at/count.js";
    if (shouldCount) {
      s.setAttribute("data-goatcounter", endpoint);
    }
    s.onload = function () {
      // Small delay so count.js can finish path normalization
      setTimeout(fetchViewCount, 200);
    };
    s.onerror = function () {
      fetchViewCount();
    };
    document.head.appendChild(s);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadGoatCounter);
  } else {
    loadGoatCounter();
  }
})();
