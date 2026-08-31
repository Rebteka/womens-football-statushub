---
layout: default
title: "Datenhub (Test)"
---

# Datenhub (Test)

**Abzugsdatum:** 2026-08-28T21:30:40Z

Statischer Testbereich mit 3 Ligen / 3 Vereinen ueber 2 Kontinentalverbaende,
um die Navigation zu pruefen, bevor der volle Datenabzug (36 Ligen/407 Vereine)
freigegeben wird. Wird nicht durch die laufende Pipeline veraendert.

## Nach Kontinentalverband durchklicken

- [UEFA (Europa)](confederations/uefa.md)
- [AFC (Asien)](confederations/afc.md)

## Schnellsuche

<input type="text" id="datahub-search-input" placeholder="Liga oder Verein suchen..." autocomplete="off">
<ul id="datahub-search-results"></ul>
<script>
  var datahubSearchMap = {"A-League Women": "leagues/australia_190.md", "2. Frauen Bundesliga": "leagues/germany_1034.md", "Frauen Bundesliga": "leagues/germany_82.md", "Sydney FC W": "clubs/1968.md", "Turbine Potsdam W": "clubs/1869.md", "Nürnberg W": "clubs/20487.md"};
  var datahubSearchNames = Object.keys(datahubSearchMap);
  var datahubSearchInput = document.getElementById('datahub-search-input');
  var datahubSearchResults = document.getElementById('datahub-search-results');
  datahubSearchInput.addEventListener('input', function () {
    var query = this.value.trim().toLowerCase();
    datahubSearchResults.innerHTML = '';
    if (!query) { return; }
    datahubSearchNames
      .filter(function (name) { return name.toLowerCase().indexOf(query) !== -1; })
      .slice(0, 10)
      .forEach(function (name) {
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.href = datahubSearchMap[name].replace('.md', '.html');
        a.textContent = name;
        li.appendChild(a);
        datahubSearchResults.appendChild(li);
      });
  });
</script>

