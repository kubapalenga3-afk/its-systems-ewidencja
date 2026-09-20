# IT-S Systems — Ewidencja czasu pracy — kontekst projektu

Ten plik istnieje, żeby przy kontynuacji pracy na innym urządzeniu (np. iMac) nie trzeba było
od nowa tłumaczyć Claude'owi, o co chodzi w tym projekcie. Jeśli czytasz to jako Claude:
przeczytaj cały plik przed pierwszą zmianą w kodzie.

## Co to jest

Aplikacja do ewidencji czasu pracy dla klienta **IT-S Systems**, zbudowana na wzór wcześniejszej
apki "MERCKOP – Ewidencja czasu pracy" (ten sam właściciel projektu ma też tamtą apkę, osobny
projekt, osobna baza danych — **nie mieszać**). Referencyjna kopia kodu MERCKOP (do wglądu,
NIE do edycji) leży w `baza/merckop-index-2026-09-20.html`.

Stack: Firebase (Auth + Firestore) + jeden plik `index.html` (HTML/CSS/JS inline, bez buildu,
bez frameworka). Hosting docelowo: Netlify, osobny site od MERCKOP.

## Stan na dziś

Frontend + cała logika JS są **gotowe i zweryfikowane wizualnie** w lokalnym podglądzie
(login, formularz dodawania wpisu, panel admina, dashboard z paskami urlopu — wszystko
renderuje się poprawnie, zero błędów w konsoli).

**Aplikacja NIE jest jeszcze podłączona do żadnej bazy danych.** W `index.html` w sekcji
`firebaseConfig` są placeholdery `"TODO_..."` — trzeba je podmienić na dane prawdziwego
projektu Firebase, zanim cokolwiek zadziała na żywo.

## Specyfikacja funkcji (ustalona z klientem)

Role: tylko `employee` i `admin` (bez trzeciej roli jak w MERCKOP).

**Pracownik:**
- dashboard: wpisywanie godzin + miejsce pracy, urlop, karta z paskami urlopu
- typy wpisu: Praca, Urlop wypoczynkowy, Urlop na żądanie (osobna pula), Zwolnienie L4, Inne
- edycja własnych wpisów (godziny, notatka)
- historia wpisów, rozwijalna notatka w formularzu (żeby nie zaśmiecać UI)
- kalendarz obecności (kopiowany wzorem z MERCKOP)

**Administrator:**
- tworzy konta, zmienia role (employee/admin)
- zakładka "Pracownicy": rozwijana karta każdego — dzienny wykaz wpisów za wybrany miesiąc,
  edycja puli dni urlopowych (wypoczynkowy + na żądanie, domyślnie 26/4 dni/rok), licznik L4
- eksport CSV **i PDF**, pojedynczo dla pracownika oraz zbiorczo dla całej firmy naraz

**Inne ustalenia:**
- urlopy/L4 zapisują się od razu, bez etapu akceptacji (świadoma decyzja klienta — prościej)
- samoobsługowy reset hasła ("Zapomniałeś hasła?" na ekranie logowania, Firebase Auth)
- kolorystyka: niebieska (`--accent: #2563EB` i pochodne w CSS, zamiast pomarańczowej z MERCKOP)

## Celowe różnice względem MERCKOP (uproszczenia i poprawki)

- Usunięta rola `prezes`, ogłoszenia, cała zakładka "Wpisy" (feed) — nie było w specyfikacji.
- Usunięty system poziomów/gamifikacji (LVL) z MERCKOP — nie było proszone.
- **Naprawiony realny bug z MERCKOP**: tam przycisk "Usuń pracownika" woła `deleteEmployee(...)`,
  funkcja której nigdzie nie ma w JS — klik rzuca błędem w konsoli, nic się nie dzieje.
  Tu zastąpione działającą blokadą dostępu (flaga `active:false` na dokumencie usera w
  Firestore — realne skasowanie konta Auth wymagałoby Admin SDK / Cloud Function, a samo
  skasowanie dokumentu Firestore i tak nie zablokowałoby logowania, bo `onAuthStateChanged`
  w MERCKOP automatycznie odtwarza dokument przy jego braku).
- Zakładki admina "Wszystkie wpisy" i "Wpisy" w MERCKOP się dublowały — tu połączone w jedną.
- Nowe: pule urlopowe z licznikiem, typ "Urlop na żądanie", edycja własnych wpisów,
  rozwijalna notatka, reset hasła, eksport PDF (przez `jspdf` + `jspdf-autotable` z CDN,
  dynamiczny `import()` w JS — bez tego apka nie potrzebuje żadnego buildu).

## Pliki w tym repo

- `index.html` — cała aplikacja
- `manifest.json` — manifest PWA (branding IT-S Systems, niebieski `theme_color`)
- `icon-192.png` / `icon-512.png` / `icon-maskable.png` — proste wygenerowane monogramy
  "ITS" na niebieskim tle (PIL/Python) — **do podmiany na prawdziwe logo klienta**, jeśli
  klient ma inne
- `firestore.rules` — reguły bezpieczeństwa Firestore, gotowe do wdrożenia. Kluczowe:
  nowe konto zawsze tworzy się z rolą `employee` (nie da się samemu ustawić `admin` przy
  rejestracji — to zamyka lukę bezpieczeństwa, na którą MERCKOP jest podatny), na `admin`
  podnosi tylko istniejący administrator.
- `baza/merckop-index-2026-09-20.html` — referencyjna kopia kodu MERCKOP (tylko do wglądu)

## Co zostało do zrobienia

1. **Założyć nowy projekt Firebase** (Auth + Firestore) dla IT-S Systems i wkleić prawdziwy
   `firebaseConfig` w `index.html` (obecnie tam są placeholdery `TODO_...`).
2. **Wdrożyć `firestore.rules`** w konsoli/CLI Firebase.
3. **Bootstrap pierwszego admina** — pierwsze logowanie na nowe konto samo utworzy dokument
   w Firestore z rolą `employee` (fallback w `onAuthStateChanged`); trzeba wtedy ręcznie
   podbić rolę na `admin` w konsoli Firestore (bo reguły blokują samodzielne ustawienie roli
   `admin` przy rejestracji — to celowe, patrz wyżej).
4. **Założyć nowy site na Netlify** (osobny od `merckop-app`) i zrobić pierwszy deploy:
   `npx netlify-cli deploy --prod --dir <katalog> --site <nowy-siteID> --auth <token>`
5. Ewentualnie podmienić ikony na prawdziwe logo klienta, jeśli inne niż monogram "ITS".
6. Docelowo przetestować cały przepływ (logowanie, dodawanie wpisu, edycja, panel admina,
   eksport CSV/PDF) na żywo z prawdziwym Firebase — do tej pory testowane było tylko
   wizualnie/statycznie, bez backendu.

## Ważne przy dalszej pracy

- To jest **osobny produkt dla klienta**, nie kolejna wersja MERCKOP — nie mieszać baz danych,
  kont Firebase ani Netlify między tymi dwoma projektami.
- Kod jest jednym plikiem `index.html` celowo (ten sam wzorzec co MERCKOP) — właściciel edytuje
  też poza sesjami z Claude, więc przy każdej kolejnej sesji **warto sprawdzić `git log` /
  `git status`**, czy coś się zmieniło od strony, zanim się zacznie edytować.
