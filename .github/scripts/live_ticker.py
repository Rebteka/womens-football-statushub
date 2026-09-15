#!/usr/bin/env python3
"""Anstoss Live-Ticker – laeuft als Cron im oeffentlichen Ergebnis-Repo.

Ablauf pro Lauf (alle 15 Minuten):
  1. assets/schedule.json lesen (Anstosszeiten der Kernwettbewerbe, vom Hauptrepo alle 4 h erzeugt).
  2. Liegt kein Spiel im Fenster [Anstoss - 5 min, Anstoss + 2 h 20], sofort beenden – KEIN API-Aufruf.
  3. Sonst EIN Aufruf fixtures?ids=... (max. 20 IDs pro Aufruf) fuer genau diese Spiele.
  4. assets/live.json schreiben und pushen. Bei API-Fehlern wird nichts ueberschrieben.

Nur Standardbibliothek, kein pip. Der API-Key kommt aus der Umgebung und wird nie ausgegeben.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCHEDULE = ROOT / "assets" / "schedule.json"
LIVE = ROOT / "assets" / "live.json"
API = "https://v3.football.api-sports.io/fixtures"
BEFORE = timedelta(minutes=5)
AFTER = timedelta(hours=2, minutes=20)


def log(msg: str) -> None:
    print(msg, flush=True)


def parse(ts: str) -> datetime:
    return datetime.fromisoformat(ts.replace("Z", "+00:00"))


def api_get(ids: list[int], key: str) -> list[dict]:
    req = urllib.request.Request(f"{API}?ids={'-'.join(map(str, ids))}", headers={"x-apisports-key": key, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        payload = json.load(resp)
    if payload.get("errors") and not payload.get("response"):
        raise RuntimeError(f"API-Fehler: {payload['errors']}")
    return payload.get("response") or []


def main() -> int:
    now = datetime.now(timezone.utc)
    if not SCHEDULE.exists():
        log("Kein schedule.json – nichts zu tun.")
        return 0
    schedule = json.loads(SCHEDULE.read_text(encoding="utf-8"))
    active = [m for m in schedule.get("matches", []) if parse(m["kickoff_utc"]) - BEFORE <= now <= parse(m["kickoff_utc"]) + AFTER]
    if not active:
        log(f"{now:%H:%M} UTC: kein Kernspiel im Fenster – kein API-Aufruf.")
        return 0

    key = os.environ.get("API_SPORTS_KEY", "").strip()
    if not key:
        log("API_SPORTS_KEY fehlt – Abbruch ohne Aufruf.")
        return 1

    ids = [m["fixture_id"] for m in active]
    rows: list[dict] = []
    calls = 0
    try:
        for i in range(0, len(ids), 20):
            calls += 1
            for fx in api_get(ids[i:i + 20], key):
                f, t, g, lg = fx.get("fixture", {}), fx.get("teams", {}), fx.get("goals", {}), fx.get("league", {})
                rows.append({
                    "fixture_id": f.get("id"), "league_id": lg.get("id"),
                    "status": (f.get("status") or {}).get("short"), "elapsed": (f.get("status") or {}).get("elapsed"),
                    "gh": g.get("home"), "ga": g.get("away"),
                    "home": (t.get("home") or {}).get("name"), "away": (t.get("away") or {}).get("name"),
                })
    except (urllib.error.URLError, RuntimeError, json.JSONDecodeError) as exc:
        log(f"Abruf fehlgeschlagen ({type(exc).__name__}) – alter Stand bleibt.")
        return 0

    live_now = sum(1 for r in rows if r["status"] in {"1H", "2H", "HT", "ET", "BT", "P", "LIVE", "INT"})
    payload = {"generated_at": now.strftime("%Y-%m-%dT%H:%M:%SZ"), "api_calls": calls, "matches": rows}
    LIVE.parent.mkdir(parents=True, exist_ok=True)
    LIVE.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    log(f"{len(rows)} Spiele im Fenster, {live_now} live, {calls} API-Aufruf(e).")

    git = lambda *a: subprocess.run(["git", *a], cwd=ROOT, check=False, capture_output=True, text=True)  # noqa: E731
    git("config", "user.name", "anstoss-live-ticker[bot]")
    git("config", "user.email", "anstoss-live-ticker@users.noreply.github.com")
    git("add", "assets/live.json")
    if git("diff", "--staged", "--quiet").returncode == 0:
        log("Keine Aenderung.")
        return 0
    git("commit", "-q", "-m", f"live: {live_now} live · {len(rows)} im Fenster · {now:%Y-%m-%dT%H:%MZ}")
    for attempt in range(3):
        if git("push", "-q").returncode == 0:
            log("Gepusht.")
            return 0
        git("pull", "--rebase", "-q")
    log("Push nach 3 Versuchen fehlgeschlagen.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
