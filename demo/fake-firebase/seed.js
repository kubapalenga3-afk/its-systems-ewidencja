// DEMO — przykładowa firma do nagrania filmu. Dane są generowane deterministycznie
// (ten sam wynik za każdym razem), za cały 2026 rok do „dziś” = pon. 23.11.2026.
// Zasady, żeby wszystko się zgadzało: wpisy pracy tylko w dni robocze (bez weekendów
// i świąt), urlop/L4 też tylko w dni robocze, jeden wpis na dzień na osobę.

const YEAR = 2026;
const LAST_WORK_DAY = '2026-11-20';   // pt — dziś (pon. rano) nikt jeszcze nie wpisał godzin
const PASSWORD = 'demo1234';

const OFFICE = 'Rybnik – biuro';
const FIELD_PLACES = [
  'Rybnik, ul. Kolejowa 5', 'Gliwice, ul. Zwycięstwa 12', 'Katowice, ul. Chorzowska 50',
  'Żory, os. Pawlikowskiego 3', 'Jastrzębie-Zdrój, al. Piłsudskiego 31',
  'Wodzisław Śl., ul. Radlińska 8', 'Racibórz, ul. Opawska 22'
];
const FIELD_NOTES = [
  'Konfiguracja sieci Wi-Fi', 'Montaż szafy RACK', 'Wdrożenie kamer CCTV', 'Przegląd serwerowni',
  'Wymiana UPS', 'Instalacja stanowisk komputerowych', 'Aktualizacja oprogramowania',
  'Okablowanie strukturalne', 'Serwis drukarek'
];
const OFFICE_NOTES = ['Obsługa zgłoszeń', 'Zamówienia sprzętu', 'Fakturowanie', 'Rozliczenia miesięczne', 'Wsparcie zdalne klienta'];

// role: 'field' = serwisant w terenie, 'office' = biuro
const PEOPLE = [
  { uid: 'u-piotr', name: 'Piotr Mazur', email: 'piotr.mazur@firma.pl', role: 'admin', pool: 26, logsTime: false },
  {
    uid: 'u-tomasz', name: 'Tomasz Wójcik', email: 'tomasz.wojcik@firma.pl', pool: 26, kind: 'field', tutorialSeen: false,
    vacation: [['2026-01-02', '2026-01-02'], ['2026-02-16', '2026-02-20'], ['2026-07-13', '2026-07-24'], ['2026-11-12', '2026-11-13']],
    sick: [['2026-03-09', '2026-03-11']],
    overrides: {
      '2026-11-20': { hours: 8,   place: 'Gliwice, ul. Zwycięstwa 12',  note: 'Przegląd serwerowni' },
      '2026-11-19': { hours: 9,   place: 'Katowice, ul. Chorzowska 50', note: 'Montaż szafy RACK + okablowanie' },
      '2026-11-18': { hours: 8,   place: OFFICE,                        note: '' },
      '2026-11-17': { hours: 8.5, place: 'Żory, os. Pawlikowskiego 3',  note: 'Konfiguracja sieci Wi-Fi' },
      '2026-11-16': { hours: 8,   place: 'Rybnik, ul. Kolejowa 5',      note: 'Wymiana UPS' },
      '2026-11-10': { hours: 7.5, place: OFFICE,                        note: 'Szkolenie BHP', type: 'other' }
    }
  },
  {
    uid: 'u-anna', name: 'Anna Kowalska', email: 'anna.kowalska@firma.pl', pool: 26, kind: 'office',
    vacation: [['2026-04-07', '2026-04-10'], ['2026-08-03', '2026-08-14'], ['2026-11-23', '2026-11-27']]
  },
  {
    uid: 'u-michal', name: 'Michał Lewandowski', email: 'michal.lewandowski@firma.pl', pool: 26, kind: 'field',
    vacation: [['2026-05-04', '2026-05-08'], ['2026-08-17', '2026-08-28']],
    sick: [['2026-02-02', '2026-02-06'], ['2026-11-19', '2026-11-25']]
  },
  {
    uid: 'u-karolina', name: 'Karolina Dąbrowska', email: 'karolina.dabrowska@firma.pl', pool: 20, kind: 'office',
    vacation: [['2026-06-05', '2026-06-05'], ['2026-07-27', '2026-08-07'], ['2026-10-12', '2026-10-16'], ['2026-11-02', '2026-11-02']]
  },
  {
    uid: 'u-pawel', name: 'Paweł Kamiński', email: 'pawel.kaminski@firma.pl', pool: 26, kind: 'field',
    vacation: [['2026-01-07', '2026-01-09'], ['2026-03-30', '2026-04-03'], ['2026-06-22', '2026-07-03'],
               ['2026-09-07', '2026-09-11'], ['2026-11-09', '2026-11-12']]
  },
  {
    uid: 'u-natalia', name: 'Natalia Szymańska', email: 'natalia.szymanska@firma.pl', pool: 20, kind: 'office',
    vacation: [['2026-09-21', '2026-09-25']],
    sick: [['2026-10-05', '2026-10-06']]
  },
  {
    uid: 'u-krzysztof', name: 'Krzysztof Zieliński', email: 'krzysztof.zielinski@firma.pl', pool: 26, kind: 'field',
    vacation: [['2026-02-09', '2026-02-13'], ['2026-07-06', '2026-07-10'], ['2026-12-28', '2026-12-31']]
  },
  {
    uid: 'u-marcin', name: 'Marcin Wróbel', email: 'marcin.wrobel@firma.pl', pool: 26, kind: 'field',
    lastDay: '2026-10-30',   // odszedł z firmy z końcem października
    vacation: [['2026-05-11', '2026-05-15'], ['2026-08-24', '2026-09-04']]
  }
];

// Ten sam kalendarz świąt co w index.html (plHolidayKeys).
function easterDate(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4,
    f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30,
    i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
    month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, month - 1, day);
}
function holidays(y) {
  const set = new Set([[1, 1], [1, 6], [5, 1], [5, 3], [8, 15], [11, 1], [11, 11], [12, 24], [12, 25], [12, 26]]
    .map(([mo, da]) => iso(new Date(y, mo - 1, da))));
  const e = easterDate(y);
  const em = new Date(e); em.setDate(e.getDate() + 1); set.add(iso(em));
  const cc = new Date(e); cc.setDate(e.getDate() + 60); set.add(iso(cc));
  return set;
}
function iso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const HOLIDAYS = holidays(YEAR);
function isWorkday(ds) {
  const dow = new Date(ds + 'T00:00:00').getDay();
  return dow !== 0 && dow !== 6 && !HOLIDAYS.has(ds);
}
function workdaysBetween(from, to) {
  const out = [];
  for (let d = new Date(from + 'T00:00:00'); iso(d) <= to; d.setDate(d.getDate() + 1)) {
    if (isWorkday(iso(d))) out.push(iso(d));
  }
  return out;
}

// Prosty deterministyczny generator liczb losowych (mulberry32).
function rng(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function pickWeighted(r, options) {
  let x = r() * options.reduce((s, [, w]) => s + w, 0);
  for (const [value, w] of options) { if ((x -= w) < 0) return value; }
  return options[options.length - 1][0];
}

export function buildSeed() {
  const store = { users: {}, entries: {}, accounts: {}, seq: 0 };
  let n = 0;
  const add = (data) => { store.entries['e-' + String(++n).padStart(5, '0')] = data; };

  PEOPLE.forEach((p, idx) => {
    store.accounts[p.email] = { uid: p.uid, password: PASSWORD };
    store.users[p.uid] = {
      name: p.name, email: p.email, role: p.role || 'employee', active: true,
      poolVacation: p.pool, tutorialSeen: p.tutorialSeen ?? (p.role === 'admin' ? false : true)
    };
    if (p.logsTime === false) return;

    const r = rng(1000 + idx * 7919);
    const off = new Map();
    (p.vacation || []).forEach(([a, b]) => workdaysBetween(a, b).forEach(d => off.set(d, 'vacation')));
    (p.sick || []).forEach(([a, b]) => workdaysBetween(a, b).forEach(d => off.set(d, 'sick')));
    off.forEach((type, date) => add({ uid: p.uid, date, type, hours: 0, place: '', note: '' }));

    const last = p.lastDay && p.lastDay < LAST_WORK_DAY ? p.lastDay : LAST_WORK_DAY;
    workdaysBetween(`${YEAR}-01-01`, last).forEach(date => {
      if (off.has(date)) return;
      const o = p.overrides?.[date];
      if (o) { add({ uid: p.uid, date, type: o.type || 'work', hours: o.hours, place: o.place, note: o.note }); return; }
      const field = p.kind === 'field';
      const hours = pickWeighted(r, [[8, 62], [8.5, 10], [9, 10], [7.5, 8], [10, field ? 5 : 1], [7, 5]]);
      const place = field ? (r() < 0.2 ? OFFICE : FIELD_PLACES[Math.floor(r() * FIELD_PLACES.length)]) : OFFICE;
      const notes = field ? FIELD_NOTES : OFFICE_NOTES;
      const note = r() < 0.35 ? notes[Math.floor(r() * notes.length)] : '';
      add({ uid: p.uid, date, type: 'work', hours, place, note });
    });
  });
  return store;
}
