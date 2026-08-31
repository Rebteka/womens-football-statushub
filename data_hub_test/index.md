---
layout: default
title: "Datenhub (Test)"
---

# Datenhub (Test)

**Abzugsdatum:** 2026-08-28T21:30:40Z

Statischer Testbereich mit 3 Ligen / 3 Vereinen ueber 2 Kontinentalverbaende,
um die Navigation zu pruefen, bevor der volle Datenabzug (36 Ligen/407 Vereine)
freigegeben wird. Wird nicht durch die laufende Pipeline veraendert.

## Schnellsuche

<input list="datahub-search" id="datahub-search-input" placeholder="Liga oder Verein suchen...">
<datalist id="datahub-search">
  <option value="A-League Women">
  <option value="2. Frauen Bundesliga">
  <option value="Frauen Bundesliga">
  <option value="Sydney FC W">
  <option value="Turbine Potsdam W">
  <option value="Nürnberg W">
</datalist>
<script>
  var datahubSearchMap = {"A-League Women": "leagues/australia_190.md", "2. Frauen Bundesliga": "leagues/germany_1034.md", "Frauen Bundesliga": "leagues/germany_82.md", "Sydney FC W": "clubs/1968.md", "Turbine Potsdam W": "clubs/1869.md", "Nürnberg W": "clubs/20487.md"};
  document.getElementById('datahub-search-input').addEventListener('change', function () {
    var url = datahubSearchMap[this.value];
    if (url) { window.location.href = url.replace('.md', '.html'); }
  });
</script>

## Nach Kontinentalverband durchklicken

- [UEFA (Europa)](confederations/uefa.md)
- [AFC (Asien)](confederations/afc.md)

