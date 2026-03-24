import { render, screen, act } from '@testing-library/react';
import Background from './Background';

// ── Wetter-Mock-Daten ────────────────────────────────────────────────────────
const WEATHER_SCENARIOS = [
  { name: 'Sonnig / Klar',        code: 113, desc: 'Sunny',             temp: '22' },
  { name: 'Leicht bewölkt',       code: 116, desc: 'Partly cloudy',     temp: '18' },
  { name: 'Bewölkt',              code: 119, desc: 'Cloudy',            temp: '14' },
  { name: 'Bedeckt',              code: 122, desc: 'Overcast',          temp: '12' },
  { name: 'Nebel',                code: 143, desc: 'Mist',              temp: '9'  },
  { name: 'Leichter Regen',       code: 296, desc: 'Light rain',        temp: '11' },
  { name: 'Starker Regen',        code: 308, desc: 'Heavy rain',        temp: '10' },
  { name: 'Starkregen',           code: 356, desc: 'Torrential rain',   temp: '8'  },
  { name: 'Schnee',               code: 227, desc: 'Blizzard',          temp: '-2' },
  { name: 'Leichter Schneefall',  code: 368, desc: 'Light snow showers',temp: '0'  },
  { name: 'Gewitter',             code: 389, desc: 'Thunderstorm',      temp: '13' },
];

// ── Tageszeiten ──────────────────────────────────────────────────────────────
const TIME_SCENARIOS = [
  { name: 'Nacht (02:00)',        hour: 2,  minute: 0  },
  { name: 'Sonnenaufgang (06:30)',hour: 6,  minute: 30 },
  { name: 'Morgen (09:00)',       hour: 9,  minute: 0  },
  { name: 'Mittag (12:00)',       hour: 12, minute: 0  },
  { name: 'Nachmittag (15:30)',   hour: 15, minute: 30 },
  { name: 'Sonnenuntergang (19:00)', hour: 19, minute: 0 },
];

// ── Hilfsfunktion: wttr.in API mocken ────────────────────────────────────────
function mockWeatherFetch(code, desc, temp) {
  global.fetch = jest.fn().mockResolvedValue({
    json: async () => ({
      current_condition: [{
        weatherCode: String(code),
        weatherDesc: [{ value: desc }],
        temp_C: temp,
      }],
    }),
  });
}

function buildDate(hour, minute) {
  const d = new Date(2024, 2, 24, hour, minute, 0);
  return d;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Background – verschiedene Wetterbedingungen', () => {
  afterEach(() => jest.clearAllMocks());

  WEATHER_SCENARIOS.forEach(({ name, code, desc, temp }) => {
    test(`rendert korrekt bei: ${name} (Code ${code})`, async () => {
      mockWeatherFetch(code, desc, temp);
      const now = buildDate(12, 0); // Mittags für gute Sichtbarkeit

      await act(async () => {
        render(<Background now={now} />);
      });

      // Wetter-Badge mit Temperatur und Beschreibung sichtbar
      const badge = await screen.findByText(new RegExp(`${temp}.*°C`, 'i'));
      expect(badge).toBeInTheDocument();
      expect(badge.textContent).toContain(desc);

      // Hintergrund-Element vorhanden
      const bg = document.querySelector('.bg');
      expect(bg).toBeInTheDocument();

      // Himmel-Element vorhanden
      const sky = document.querySelector('.bg-sky');
      expect(sky).toBeInTheDocument();
    });
  });
});

describe('Background – verschiedene Tageszeiten', () => {
  afterEach(() => jest.clearAllMocks());

  TIME_SCENARIOS.forEach(({ name, hour, minute }) => {
    test(`rendert korrekt bei: ${name}`, async () => {
      mockWeatherFetch(113, 'Sunny', '20'); // Klarer Himmel für alle Tageszeiten
      const now = buildDate(hour, minute);

      await act(async () => {
        render(<Background now={now} />);
      });

      const bg = document.querySelector('.bg');
      expect(bg).toBeInTheDocument();

      // Nachts: Sterne sichtbar
      if (hour < 5 || hour >= 21) {
        const stars = document.querySelectorAll('.bg-star');
        expect(stars.length).toBeGreaterThan(0);
      }

      // Tags: Keine Sterne
      if (hour >= 7 && hour < 18) {
        const stars = document.querySelectorAll('.bg-star');
        expect(stars.length).toBe(0);
      }
    });
  });
});

describe('Background – Wolken und Niederschlag', () => {
  afterEach(() => jest.clearAllMocks());

  test('zeigt keine Wolken bei klarem Wetter', async () => {
    mockWeatherFetch(113, 'Sunny', '25');
    await act(async () => render(<Background now={buildDate(12, 0)} />));
    const clouds = document.querySelectorAll('.bg-cloud');
    expect(clouds.length).toBe(0);
  });

  test('zeigt Wolken bei bewölktem Wetter', async () => {
    mockWeatherFetch(119, 'Cloudy', '14');
    await act(async () => render(<Background now={buildDate(12, 0)} />));
    await screen.findByText(/14.*°C/);
    const clouds = document.querySelectorAll('.bg-cloud');
    expect(clouds.length).toBeGreaterThan(0);
  });

  test('zeigt Regen bei Regencode', async () => {
    mockWeatherFetch(296, 'Light rain', '11');
    await act(async () => render(<Background now={buildDate(12, 0)} />));
    await screen.findByText(/11.*°C/);
    const rain = document.querySelectorAll('.bg-rain');
    expect(rain.length).toBeGreaterThan(0);
  });

  test('zeigt Schnee bei Schneecode', async () => {
    mockWeatherFetch(227, 'Blizzard', '-2');
    await act(async () => render(<Background now={buildDate(12, 0)} />));
    await screen.findByText(/-2.*°C/);
    const snow = document.querySelectorAll('.bg-snow');
    expect(snow.length).toBeGreaterThan(0);
  });

  test('zeigt keine Regen-Elemente bei klarem Wetter', async () => {
    mockWeatherFetch(113, 'Sunny', '22');
    await act(async () => render(<Background now={buildDate(12, 0)} />));
    const rain = document.querySelectorAll('.bg-rain');
    const snow = document.querySelectorAll('.bg-snow');
    expect(rain.length).toBe(0);
    expect(snow.length).toBe(0);
  });
});

describe('Background – Fallback bei Netzwerkfehler', () => {
  test('rendert trotzdem wenn API nicht erreichbar', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    await act(async () => render(<Background now={buildDate(12, 0)} />));

    // App crasht nicht – Hintergrund ist trotzdem da
    const bg = document.querySelector('.bg');
    expect(bg).toBeInTheDocument();

    // Kein Badge ohne Daten
    const badge = document.querySelector('.bg-badge');
    expect(badge).toBeNull();
  });
});
