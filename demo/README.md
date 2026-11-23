# Film demo aplikacji

Skrypt nagrywa film MP4 (1920×1080, ok. 5 min) do prezentacji dla klienta: telefon z aplikacją
po prawej, a po lewej podpisy kroków. Najpierw widok pracownika, potem widok administratora.

```bash
cd demo
npm install
node record.cjs                 # → demo/out/IT-S_demo.mp4
DEMO_PREVIEW=1 node record.cjs  # szybki przebieg próbny, tylko zrzuty ekranu w demo/out/preview/
```

Potrzebne: Node 18+, Playwright z Chromium (globalnie albo w `NODE_PATH`), `ffmpeg`
i `pdftoppm` (poppler-utils).

## Jak to działa

- `../index.html` to **ta sama aplikacja, bez żadnych zmian**. Skrypt uruchamia lokalny serwer
  i przekierowuje w przeglądarce tylko adresy zewnętrzne:
  - `www.gstatic.com/firebasejs/*` → `fake-firebase/*`: Firebase trzymający dane w pamięci.
    **Prawdziwa baza i prawdziwe konta nie są w ogóle dotykane.**
  - `cdn.jsdelivr.net` (jsPDF, autotable, font Inter do PDF) → lokalne kopie z `node_modules`.
- `fake-firebase/seed.js` to przykładowa firma: 8 pracowników + szef, wpisy za cały 2026 rok
  do pon. 23.11.2026. Wpisy są tylko w dni robocze (bez weekendów i świąt), jeden na dzień,
  a urlopy i L4 są dobrane tak, żeby było widać każdy stan puli (dużo / mało / zero).
- Zegar przeglądarki jest ustawiony na 23.11.2026, godz. 9:14.
- `stage.html` to scena: ramka telefonu, podpisy, plansze, wskaźnik dotknięć i podgląd
  wygenerowanego PDF/CSV.
- `record.cjs` to scenariusz krok po kroku plus nagrywanie (CDP screencast → klatki JPG →
  ffmpeg H.264).

Konta demo (hasło `demo1234`): `tomasz.wojcik@firma.pl` (pracownik), `piotr.mazur@firma.pl` (szef).
