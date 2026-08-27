(function () {
  var state = { q: "", tier: "", grade: "", sort: "risk_score_desc", page: 1 };

  var qInput = document.getElementById("q");
  var tierSelect = document.getElementById("tier");
  var gradeSelect = document.getElementById("grade");
  var sortSelect = document.getElementById("sort");
  var rowsBody = document.getElementById("applicant-rows");
  var pageInfo = document.getElementById("page-info");
  var prevBtn = document.getElementById("prev-page");
  var nextBtn = document.getElementById("next-page");

  var debounceTimer = null;
  function debounce(fn, delay) {
    return function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(fn, delay);
    };
  }

  function cell(text) {
    var td = document.createElement("td");
    td.textContent = text;
    return td;
  }

  function renderRows(results) {
    rowsBody.innerHTML = "";
    if (!results.length) {
      var tr = document.createElement("tr");
      var td = document.createElement("td");
      td.colSpan = 10;
      td.className = "loading";
      td.textContent = "No applicants match these filters.";
      tr.appendChild(td);
      rowsBody.appendChild(tr);
      return;
    }
    results.forEach(function (r) {
      var tr = document.createElement("tr");
      tr.addEventListener("click", function () {
        window.location.href = "/applicant/" + encodeURIComponent(r.app_id);
      });

      tr.appendChild(cell(r.app_id));
      tr.appendChild(cell(r.risk_score));

      var badgeTd = document.createElement("td");
      var badge = document.createElement("span");
      badge.className = "badge badge-" + r.recommendation.toLowerCase();
      badge.textContent = r.recommendation.replace(/_/g, " ");
      badgeTd.appendChild(badge);
      tr.appendChild(badgeTd);

      tr.appendChild(cell(r.grade));
      tr.appendChild(cell((r.purpose || "").replace(/_/g, " ")));
      tr.appendChild(cell("$" + Number(r.loan_amnt).toLocaleString()));
      tr.appendChild(cell("$" + Number(r.annual_inc).toLocaleString()));
      tr.appendChild(cell(r.dti));
      tr.appendChild(cell(r.state || "—"));
      tr.appendChild(cell(r.actual_outcome));

      rowsBody.appendChild(tr);
    });
  }

  function load() {
    var params = new URLSearchParams({
      q: state.q,
      tier: state.tier,
      grade: state.grade,
      sort: state.sort,
      page: state.page,
      page_size: 25,
    });

    fetch("/api/applicants?" + params.toString())
      .then(function (res) { return res.json(); })
      .then(function (data) {
        renderRows(data.results);
        pageInfo.textContent = "Page " + data.page + " of " + data.total_pages + " · " + data.total.toLocaleString() + " applicants";
        prevBtn.disabled = data.page <= 1;
        nextBtn.disabled = data.page >= data.total_pages;
      })
      .catch(function () {
        rowsBody.innerHTML = "<tr><td colspan=\"10\" class=\"loading\">Couldn't load applicants.</td></tr>";
      });
  }

  qInput.addEventListener("input", debounce(function () {
    state.q = qInput.value;
    state.page = 1;
    load();
  }, 250));

  tierSelect.addEventListener("change", function () {
    state.tier = tierSelect.value;
    state.page = 1;
    load();
  });

  gradeSelect.addEventListener("change", function () {
    state.grade = gradeSelect.value;
    state.page = 1;
    load();
  });

  sortSelect.addEventListener("change", function () {
    state.sort = sortSelect.value;
    state.page = 1;
    load();
  });

  prevBtn.addEventListener("click", function () {
    if (state.page > 1) { state.page -= 1; load(); }
  });
  nextBtn.addEventListener("click", function () {
    state.page += 1; load();
  });

  load();
})();
