/* Anstoß – Vanilla-JS: Suche, Regionsfilter, Favoriten-Verein, Listenfilter.
   Alles progressive enhancement; die Seite funktioniert auch ohne JS. */
(function () {
  "use strict";
  var base = document.body.dataset.base || "";
  var LS_REGION = "anstoss.region";
  var LS_FAV = "anstoss.fav";

  /* ---------- Datenstand (nicht in jede Seite gebacken, damit unveraenderte Seiten stabil bleiben) ---------- */
  var stand = document.querySelector("[data-stand]");
  var STALE_MIN = 30;
  function fmtTime(d) { return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" }); }
  function markStaleLive(generatedAt) {
    // Eingebackene "Live"-Zustaende sind nach 30 Minuten nur noch ein alter Zwischenstand
    var age = (Date.now() - new Date(generatedAt).getTime()) / 60000;
    if (age < STALE_MIN) return;
    var label = "Stand " + fmtTime(new Date(generatedAt));
    document.querySelectorAll(".match-live:not(.is-fresh)").forEach(function (card) {
      card.classList.add("is-stale");
      var pill = card.querySelector(".pill-live");
      if (pill) { pill.textContent = label; pill.classList.remove("pill-live"); pill.classList.add("pill-stale"); }
    });
    var note = document.querySelector("[data-live-note]");
    if (note) note.textContent = "(" + label + " – kein Live-Ticker aktiv)";
    document.querySelectorAll(".live-dot").forEach(function (d) { d.classList.add("is-stale"); });
  }
  fetch(base + "/assets/meta.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (m) {
    if (stand && m.stand_label) stand.textContent = m.stand_label + " \u00b7 Zeiten in Europe/Berlin";
    if (m.generated_at) markStaleLive(m.generated_at);
    // Ehrlicher Hinweis, wenn die Daten deutlich aelter sind als der 4-Stunden-Rhythmus
    var ageH = (Date.now() - new Date(m.generated_at).getTime()) / 3600000;
    var main = document.querySelector(".main");
    if (main && ageH > 12) {
      var b = document.createElement("div");
      b.className = "stale-banner";
      b.textContent = "Hinweis: Die Daten wurden zuletzt vor " + (ageH < 48 ? Math.round(ageH) + " Stunden" : Math.round(ageH / 24) + " Tagen") + " aktualisiert. Ergebnisse und Termine k\u00f6nnen veraltet sein.";
      main.insertBefore(b, main.firstChild);
    }
  }).catch(function () {});

  /* ---------- Live-Ticker (optional): assets/live.json aktualisiert Karten in place ---------- */
  var cards = document.querySelectorAll("[data-fixture]");
  if (cards.length) {
    fetch(base + "/assets/live.json", { cache: "no-cache" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (live) {
      if (!live || !live.matches) return;
      // Zwischenstaende nur wenn frisch (<25 min); Endstaende sind endgueltig und gelten immer
      var fresh = (Date.now() - new Date(live.generated_at).getTime()) / 60000 < 25;
      var byId = {};
      live.matches.forEach(function (m) { byId[m.fixture_id] = m; });
      var anyLive = false;
      cards.forEach(function (card) {
        var m = byId[card.dataset.fixture];
        if (!m) return;
        var isLive = fresh && ["1H", "2H", "HT", "ET", "BT", "P", "LIVE", "INT"].indexOf(m.status) !== -1;
        var isFinished = ["FT", "AET", "PEN"].indexOf(m.status) !== -1;
        if (!isLive && !isFinished) return;
        anyLive = anyLive || isLive;
        card.classList.remove("match-scheduled", "match-live", "match-finished", "is-stale");
        card.classList.add(isLive ? "match-live" : "match-finished", "is-fresh");
        var score = card.querySelector("[data-score]");
        if (score && m.gh !== null && m.gh !== undefined) {
          var hw = isFinished && m.gh > m.ga ? " win" : "", aw = isFinished && m.ga > m.gh ? " win" : "";
          score.innerHTML = '<span class="score"><b class="' + hw + '">' + m.gh + '</b><b class="' + aw + '">' + m.ga + "</b></span>";
        }
        var pill = card.querySelector("[data-pill]");
        if (pill) {
          var txt = isFinished ? "Beendet" : m.status === "HT" ? "Halbzeit" : m.elapsed ? m.elapsed + "'" : "Live";
          pill.innerHTML = '<span class="pill ' + (isLive ? "pill-live" : "pill-finished") + '">' + txt + "</span>";
        }
      });
      var note = document.querySelector("[data-live-note]");
      if (note && anyLive) note.textContent = "(Live-Stand " + fmtTime(new Date(live.generated_at)) + ")";
      if (anyLive) document.querySelectorAll(".live-dot").forEach(function (d) { d.classList.remove("is-stale"); });
    }).catch(function () {});
  }

  /* ---------- Regionsfilter (Chips) ---------- */
  var chips = document.querySelectorAll("[data-region-filter]");
  function applyRegion(region) {
    chips.forEach(function (c) { c.setAttribute("aria-pressed", String(c.dataset.regionFilter === region)); });
    document.querySelectorAll("[data-region]").forEach(function (el) {
      var show = region === "alle" || el.dataset.region === region;
      el.classList.toggle("is-hidden", !show);
    });
    // Leere Tages-/Sektionen ausblenden, wenn alles gefiltert ist
    document.querySelectorAll(".day-title").forEach(function (h) {
      var next = h.nextElementSibling, anyVisible = false;
      while (next && !next.classList.contains("day-title")) {
        if (next.matches("[data-region]") && !next.classList.contains("is-hidden")) anyVisible = true;
        next = next.nextElementSibling;
      }
      h.style.display = anyVisible ? "" : "none";
    });
    // Kalender: Tage ohne sichtbare Spiele samt Sprungmarke ausblenden
    document.querySelectorAll(".day[id]").forEach(function (sec) {
      var any = sec.querySelector("[data-region]:not(.is-hidden)");
      sec.style.display = any ? "" : "none";
      var link = document.querySelector('.day-nav a[href="#' + sec.id + '"]');
      if (link) link.style.display = any ? "" : "none";
    });
  }
  if (chips.length) {
    var saved = localStorage.getItem(LS_REGION);
    var initial = saved || (document.querySelector('[data-region-filter][aria-pressed="true"]') || {}).dataset;
    applyRegion(saved || (initial && initial.regionFilter) || "de");
    chips.forEach(function (c) {
      c.addEventListener("click", function () {
        localStorage.setItem(LS_REGION, c.dataset.regionFilter);
        applyRegion(c.dataset.regionFilter);
      });
    });
  }

  /* ---------- Favoriten-Verein ---------- */
  var favBtn = document.querySelector("[data-fav]");
  var fav = localStorage.getItem(LS_FAV);
  var LS_AUTOSTART = "anstoss.autostart";

  // Direkteinstieg: Wer von aussen (Lesezeichen, Homescreen) auf die Startseite kommt und es eingeschaltet hat,
  // landet direkt bei seinem Verein. Navigation innerhalb der Seite ist davon nie betroffen.
  var favSlot = document.querySelector("[data-fav-slot]");
  if (favSlot && fav && localStorage.getItem(LS_AUTOSTART) === "1" && !location.hash) {
    var ref = document.referrer;
    var external = !ref || (function () { try { return new URL(ref).origin !== location.origin; } catch (e) { return true; } })();
    if (external) {
      fetch(base + "/assets/clubs.json").then(function (r) { return r.json(); }).then(function (clubs) {
        if (clubs[fav]) location.replace(clubs[fav].url);
      }).catch(function () {});
    }
  }
  if (favBtn) {
    var mine = favBtn.dataset.fav === fav;
    favBtn.setAttribute("aria-pressed", String(mine));
    favBtn.textContent = mine ? "★ Mein Verein" : "☆ Mein Verein";
    favBtn.addEventListener("click", function () {
      if (localStorage.getItem(LS_FAV) === favBtn.dataset.fav) {
        localStorage.removeItem(LS_FAV); favBtn.setAttribute("aria-pressed", "false"); favBtn.textContent = "☆ Mein Verein";
      } else {
        localStorage.setItem(LS_FAV, favBtn.dataset.fav); favBtn.setAttribute("aria-pressed", "true"); favBtn.textContent = "★ Mein Verein";
      }
    });
  }
  var autoBox = document.querySelector("[data-autostart]");
  if (autoBox && favBtn) {
    function syncAuto() {
      var mineNow = localStorage.getItem(LS_FAV) === favBtn.dataset.fav;
      autoBox.hidden = !mineNow;
      autoBox.querySelector("input").checked = localStorage.getItem(LS_AUTOSTART) === "1";
    }
    syncAuto();
    favBtn.addEventListener("click", syncAuto);
    autoBox.querySelector("input").addEventListener("change", function (ev) {
      if (ev.target.checked) localStorage.setItem(LS_AUTOSTART, "1"); else localStorage.removeItem(LS_AUTOSTART);
    });
  }
  if (favSlot && fav) {
    fetch(base + "/assets/clubs.json").then(function (r) { return r.json(); }).then(function (clubs) {
      var c = clubs[fav];
      if (!c) return;
      var logo = c.logo ? '<img class="logo" src="' + c.logo + '" alt="" width="36" height="36">' : "";
      favSlot.innerHTML = '<a class="fav-card" href="' + c.url + '">' + logo + '<span>' + c.name + '<small>Mein Verein · zur Vereinsseite →</small></span></a>';
      favSlot.hidden = false;
    }).catch(function () {});
  }

  /* ---------- Listenfilter (Vereine-Seite) ---------- */
  document.querySelectorAll("[data-filter]").forEach(function (input) {
    var items = document.querySelectorAll(input.dataset.filter);
    input.addEventListener("input", function () {
      var q = input.value.trim().toLowerCase();
      items.forEach(function (el) { el.classList.toggle("is-hidden", q && el.dataset.club.indexOf(q) === -1); });
    });
  });

  /* ---------- Globale Suche ---------- */
  var layer = document.querySelector(".search-layer");
  var input = document.querySelector("[data-search-input]");
  var results = document.querySelector("[data-search-results]");
  var index = null, active = -1;

  function norm(s) { return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
  function openSearch() {
    layer.hidden = false; input.value = ""; results.innerHTML = ""; input.focus();
    if (!index) fetch(base + "/assets/search-index.json").then(function (r) { return r.json(); }).then(function (d) { index = d; });
  }
  function closeSearch() { layer.hidden = true; }
  function render(q) {
    if (!index) return;
    var nq = norm(q);
    var hits = nq ? index.filter(function (it) { return norm(it.n).indexOf(nq) !== -1 || norm(it.s).indexOf(nq) !== -1; }) : [];
    hits.sort(function (a, b) {
      var sa = norm(a.n).indexOf(nq) === 0 ? 0 : 1, sb = norm(b.n).indexOf(nq) === 0 ? 0 : 1;
      return sa - sb || (a.t === "comp" ? -1 : 1) - (b.t === "comp" ? -1 : 1) || a.n.localeCompare(b.n, "de");
    });
    active = -1;
    results.innerHTML = hits.slice(0, 12).map(function (it) {
      var logo = it.l ? '<img class="logo" src="' + it.l + '" alt="" width="24" height="24" loading="lazy">' : '<span class="kind">' + (it.t === "comp" ? "Liga" : "Verein") + "</span>";
      return '<li><a href="' + it.u + '">' + logo + "<span>" + it.n + "</span><small>" + it.s + "</small></a></li>";
    }).join("") || (nq ? '<li class="empty-hit"><a>Nichts gefunden.</a></li>' : "");
  }
  if (layer && input) {
    document.querySelectorAll("[data-open-search]").forEach(function (b) { b.addEventListener("click", openSearch); });
    document.querySelector("[data-close-search]").addEventListener("click", closeSearch);
    layer.addEventListener("click", function (ev) { if (ev.target === layer) closeSearch(); });
    input.addEventListener("input", function () { render(input.value); });
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "/" && layer.hidden && !/input|textarea/i.test(document.activeElement.tagName)) { ev.preventDefault(); openSearch(); }
      if (layer.hidden) return;
      var items = results.querySelectorAll("li");
      if (ev.key === "Escape") closeSearch();
      if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
        ev.preventDefault();
        active = (active + (ev.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
        items.forEach(function (li, i) { li.classList.toggle("is-active", i === active); });
      }
      if (ev.key === "Enter" && active >= 0) { var a = items[active].querySelector("a"); if (a && a.href) location.href = a.href; }
    });
  }
})();
