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

## Stan na dziś (2026-09-20)

**Aplikacja jest podłączona do prawdziwego Firebase i działa na żywo.** Projekt
`its-systems-ewidencja` (Auth email/hasło + Firestore, region `eur3`/Europe) jest
utworzony, `firebaseConfig` w `index.html` ma prawdziwe dane (nie placeholdery),
`firestore.rules` opublikowane, pierwszy admin (`palengajakub4@gmail.com`) założony
i przetestowany end-to-end (logowanie, dashboard, kalendarz, panel admina).

**Netlify: live.** Osobny projekt `its-systems-ewidencja` (nie mieszany z `merckop-app`),
połączony z GitHub (`kubapalenga3-afk/its-systems-ewidencja`, branch `main`) — każdy push
na `main` automatycznie redeployuje. Bez build commandu, publish directory = root repo
(zwykły statyczny `index.html`, zgodnie z resztą stacku). Adres:
**https://its-systems-ewidencja.netlify.app**. Domena dodana do Firebase Auth →
Authorized domains (bez tego logowanie na żywej stronie kończyłoby się
`auth/unauthorized-domain`).

## Specyfikacja funkcji (ustalona z klientem)

Role: tylko `employee` i `admin` (bez trzeciej roli jak w MERCKOP).

**Pracownik:**
- dashboard: wpisywanie godzin + miejsce pracy, urlop, karta z paskami urlopu
- typy wpisu: Praca, Urlop wypoczynkowy, Zwolnienie L4, Inne
  (był też "Urlop na żądanie" z osobną pulą — **usunięty na życzenie klienta 2026-09-20**,
  patrz sekcja "Zmiany" niżej)
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

Zrobione 2026-09-20: projekt Firebase, `firebaseConfig`, `firestore.rules`, bootstrap
pierwszego admina, deploy na Netlify (osobny od `merckop-app`, połączony z GitHub) —
patrz "Stan na dziś" i "Zmiany" wyżej/niżej.

1. Ewentualnie podmienić ikony na prawdziwe logo klienta, jeśli inne niż monogram "ITS".
2. Przetestować na żywo dodawanie/edycję wpisu i eksport CSV/PDF — jedyne większe
   fragmenty, które w tej sesji nie były klikane na żywym Firebase (tworzenie pracownika
   i zmiana roli na admina **były** przetestowane end-to-end, patrz "Zmiany" niżej).

## Zmiany z 2026-09-20 (sesja na Macu, po sklonowaniu repo)

- **Firebase na żywo**: projekt `its-systems-ewidencja` utworzony w konsoli, web app
  zarejestrowana, `firebaseConfig` wklejony do `index.html`, Auth email/hasło włączone,
  Firestore (`eur3`) utworzone, `firestore.rules` opublikowane, pierwszy admin
  (`palengajakub4@gmail.com`) założony przez Authentication → Add user i podbity na
  `role:"admin"` ręcznie w Firestore.
- **Naprawiony bug w `createEmployee`** (dwuczęściowy, oba znalezione i przetestowane
  end-to-end na żywym Firebase — utworzenie testowego pracownika + podniesienie go na
  admina przyciskiem "Zmień rolę", potem posprzątane z Authentication/Firestore):
  1. `createUserWithEmailAndPassword` na głównym `auth` przełączało sesję na nowo
     tworzonego pracownika i wylogowywało admina (typowa pułapka Firebase SDK) — naprawione
     osobną instancją `secondaryApp`/`secondaryAuth` (linia ok. 1711), z `signOut(secondaryAuth)`
     po zapisie dokumentu.
  2. Sam zapis `setDoc` szedł przez główne `db` — ale to `db` jest uwierzytelnione jako
     admin, a reguła `create` na `users/{userId}` wymaga `request.auth.uid == userId`
     (czyli że dokument tworzy sam siebie). Efekt: "Missing or insufficient permissions."
     mimo poprawki #1. Naprawione dodaniem `secondaryDb = getFirestore(secondaryApp)` i
     użyciem go w `setDoc(doc(secondaryDb,'users',cred.user.uid), ...)` — zapis idzie
     wtedy uwierzytelniony jako nowo utworzony user, zgodnie z regułą.
  Przy okazji usunięta opcja "Administrator" z listy roli przy tworzeniu konta — reguły
  i tak wymagają `role:'employee'` przy `create`. Podnoszenie do admina tylko przez
  istniejący przycisk "Zmień rolę" (`changeRole`, `allow update`, działa poprawnie —
  to pre-istniejący kod, nie było go trzeba zmieniać).
- **Nowość: podgląd "jako pracownik" dla admina** — ikona oka w topbarze dashboardu
  (obok wylogowania, `id="view-toggle-btn"`, funkcja `toggleViewMode()`) chowa zakładkę
  "Zespół" z nawigacji bez zmiany faktycznej roli w Firestore. Stan trzymany lokalnie
  (`isRealAdmin`, `previewAsEmployee`), resetuje się do widoku admina przy każdym
  ponownym `onAuthStateChanged` (czyli też po odświeżeniu/ponownym logowaniu).
- **Usunięty typ wpisu "Urlop na żądanie"** (`ondemand`) na życzenie klienta — całkowicie,
  ze wszystkich miejsc: przycisk w formularzu dodawania wpisu, pula/pasek na dashboardzie,
  kafelek w statystykach (dashboard + historia), legenda i kolorowanie kalendarza,
  pole `poolOnDemand` (domyślne wartości, edycja w panelu admina, zapis `savePools`),
  eksport CSV/PDF (linie podsumowania), stałe `TYPE_LABELS`/`TYPE_ICONS`/`DAY_TYPES`,
  zmienne CSS (`--ondemand`, `--ondemand-light` i klasy pochodne). Istniejące konta mają
  jeszcze pole `poolOnDemand` w Firestore (nieużywane, nieszkodliwe) — można je ręcznie
  wyczyścić, nie jest to konieczne.
- **Nowość: subtelny licznik dni roboczych** nad kartą "Twój urlop" na dashboardzie
  (`#workdays-hint`) — pokazuje `X / Y dni roboczych w tym miesiącu`, gdzie X to liczba
  osobistych wpisów typu praca/inne w danym miesiącu (ta sama wartość co kafelek
  "dni roboczych" niżej), a Y to łączna liczba dni Pn–Pt w miesiącu kalendarzowym
  (funkcja `countWorkingDaysInMonth`, nie uwzględnia świąt).
- **Naprawiony font na ekranie powitalnym (`#splash`, duży napis "IT-S" po zalogowaniu)**:
  `'Bebas Neue'` jest ładowana z Google Fonts, ale animacja (`showSplash()`) startowała
  natychmiast, nie czekając na jej pobranie — na szybkim połączeniu/z cache przeglądarki
  (typowo telefon właściciela, który już wcześniej otwierał podobną apkę np. MERCKOP)
  font zdążał się doładować, na wolniejszym/pierwszym połączeniu nie i napis leciał
  w domyślnym systemowym foncie. Naprawione przez `document.fonts.load(...)` z
  timeoutem 500ms przed startem animacji (`showSplash`, ok. linii 2685) — to samo
  ryzyko dotyczy najpewniej referencyjnej kopii MERCKOP, ale ta jest "nie do edycji",
  więc nie było ruszane.
- **Deploy na Netlify**: nowy projekt `its-systems-ewidencja` (team MERCKOP, ale osobny
  projekt/URL od `merckop-app`), połączony z GitHub zamiast CLI/drag-and-drop — logowanie
  GitHub→Netlify po stronie automatyzacji (klik przez rozszerzenie Chrome) wywalało się
  na `Failed to fetch` przy `/auth/complete` (najpewniej popup do OAuth blokowany dla
  syntetycznych kliknięć) — zadziałało dopiero po kliknięciu przez właściciela ręcznie.
  Bez build commandu, publish directory = root. Live: its-systems-ewidencja.netlify.app.
  Dodana ta domena do Firebase Auth → Authorized domains (inaczej logowanie na żywej
  stronie kończyłoby się `auth/unauthorized-domain`).

## Ważne przy dalszej pracy

- To jest **osobny produkt dla klienta**, nie kolejna wersja MERCKOP — nie mieszać baz danych,
  kont Firebase ani Netlify między tymi dwoma projektami.
- Kod jest jednym plikiem `index.html` celowo (ten sam wzorzec co MERCKOP) — właściciel edytuje
  też poza sesjami z Claude, więc przy każdej kolejnej sesji **warto sprawdzić `git log` /
  `git status`**, czy coś się zmieniło od strony, zanim się zacznie edytować.
