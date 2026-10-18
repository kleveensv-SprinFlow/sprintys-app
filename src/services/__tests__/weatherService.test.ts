jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn() },
}));

import {
  parseWeather,
  getWeatherCondition,
  getWeatherConditionLabel,
  next24h,
  isTrackWet,
  rainChanceNext,
  getTrainingVerdict,
  localHourIso,
  WeatherData,
} from '../weatherService';

const hours = (day: string, from: number, count: number, over: Record<number, any> = {}) =>
  Array.from({ length: count }, (_, k) => {
    const h = from + k;
    const o = over[h] || {};
    return { hour: h, time: `${day}T${String(h).padStart(2, '0')}:00`, ...o };
  });

function payload(opts: { now?: string; cur?: any; over?: Record<number, any> } = {}) {
  const day = '2026-10-18';
  const hs = hours(day, 0, 24, opts.over);
  return {
    current: {
      time: opts.now ?? `${day}T14:15`,
      temperature_2m: 15.4,
      apparent_temperature: 13.6,
      wind_speed_10m: 14.2,
      wind_gusts_10m: 29.6,
      precipitation: 0,
      weather_code: 1,
      is_day: 1,
      ...opts.cur,
    },
    hourly: {
      time: hs.map((h) => h.time),
      temperature_2m: hs.map(() => 15),
      weather_code: hs.map((h: any) => h.code ?? 1),
      precipitation: hs.map((h: any) => h.precip ?? 0),
      precipitation_probability: hs.map((h: any) => h.prob ?? 0),
      is_day: hs.map((h) => (h.hour >= 7 && h.hour <= 19 ? 1 : 0)),
    },
    daily: {
      time: [day, '2026-10-19', '2026-10-20'],
      weather_code: [1, 61, 0],
      temperature_2m_max: [17, 14, 16],
      temperature_2m_min: [8, 9, 7],
      sunset: [`${day}T18:24`, '2026-10-19T18:22', '2026-10-20T18:20'],
      precipitation_probability_max: [10, 80, 0],
    },
  };
}

const parse = (p: any): WeatherData => parseWeather(p, 0);
const NOW = '2026-10-18T14:00';

describe('états du ciel', () => {
  it('traite chaque code, sans retomber sur « ensoleillé »', () => {
    expect(getWeatherCondition(0)).toBe('clear');
    expect(getWeatherCondition(1)).toBe('partly');
    expect(getWeatherCondition(3)).toBe('cloudy');
    expect(getWeatherCondition(85)).toBe('snowy');
    expect(getWeatherCondition(56)).toBe('rainy');
    expect(getWeatherCondition(99)).toBe('stormy');
    expect(getWeatherCondition(1234)).toBe('cloudy');
  });
  it('dit « Ciel dégagé » la nuit', () => {
    expect(getWeatherConditionLabel('clear', false)).toBe('Ciel dégagé');
    expect(getWeatherConditionLabel('clear', true)).toBe('Ensoleillé');
  });
});

describe('parseWeather', () => {
  it('lit le ressenti, les rafales, et n’expose plus la direction du vent', () => {
    const w = parse(payload());
    expect(w.feelsLike).toBe(14);
    expect(w.windSpeed).toBe(14);
    expect(w.windGust).toBe(30);
    expect(w).not.toHaveProperty('windDirection');
    expect(w.sunset).toBe('18:24');
    expect(w.daily[0].displayDay).toBe("Aujourd'hui");
    expect(w.daily[1].displayDay).toBe('Demain');
    expect(w.daily[1].rainChance).toBe(80);
  });
  it('refuse une réponse sans mesure actuelle', () => {
    expect(() => parseWeather({})).toThrow();
  });
});

describe('heure locale (pas UTC)', () => {
  it('next24h commence à l’heure locale en cours', () => {
    const w = parse(payload());
    const list = next24h(w.hourly, NOW);
    expect(list[0].datetime).toBe('2026-10-18T14:00');
    expect(list).toHaveLength(10); // jusqu'à 23 h, le reste n'est pas dans la réponse du test
  });
  it('localHourIso formate l’heure locale de l’appareil', () => {
    expect(localHourIso(new Date(2026, 9, 18, 14, 37))).toBe('2026-10-18T14:00');
  });
});

describe('piste mouillée', () => {
  it('sèche sans pluie récente', () => {
    expect(isTrackWet(parse(payload()), NOW)).toBe(false);
  });
  it('mouillée si de la pluie est tombée dans les 3 dernières heures', () => {
    expect(isTrackWet(parse(payload({ over: { 12: { precip: 0.6 } } })), NOW)).toBe(true);
  });
  it('mouillée s’il pleut à l’instant', () => {
    expect(isTrackWet(parse(payload({ cur: { precipitation: 0.3 } })), NOW)).toBe(true);
  });
  it('rainChanceNext prend le maximum des prochaines heures', () => {
    expect(rainChanceNext(parse(payload({ over: { 15: { prob: 70 } } })), NOW, 3)).toBe(70);
  });
});

describe('phrase du jour', () => {
  it('bonnes conditions par défaut', () => {
    expect(getTrainingVerdict(parse(payload()), NOW)).toMatch(/Bonnes conditions/);
  });
  it('annonce la pluie à venir avec l’heure', () => {
    const w = parse(payload({ over: { 17: { prob: 80 }, 18: { prob: 80 } } }));
    expect(getTrainingVerdict(w, NOW)).toBe("Pluie probable vers 17 h : mieux vaut s'entraîner avant.");
  });
  it('signale la pluie en cours et l’accalmie', () => {
    const w = parse(payload({ cur: { precipitation: 1 }, over: { 14: { precip: 1, prob: 90 }, 15: { prob: 80 } } }));
    expect(getTrainingVerdict(w, NOW)).toBe('Il pleut en ce moment. Accalmie prévue vers 16 h.');
  });
  it('l’orage passe avant la pluie', () => {
    const w = parse(payload({ over: { 16: { code: 95 }, 17: { prob: 90 } } }));
    expect(getTrainingVerdict(w, NOW)).toMatch(/Orage possible vers 16 h/);
  });
  it('rafales, chaleur et froid', () => {
    expect(getTrainingVerdict(parse(payload({ cur: { wind_gusts_10m: 52 } })), NOW)).toMatch(/Rafales jusqu'à 52 km\/h/);
    expect(getTrainingVerdict(parse(payload({ cur: { apparent_temperature: 33 } })), NOW)).toMatch(/Chaleur \(ressenti 33°\)/);
    expect(getTrainingVerdict(parse(payload({ cur: { apparent_temperature: 1 } })), NOW)).toMatch(/Froid \(ressenti 1°\)/);
  });
  it('ne conseille jamais d’arrêter ni ne pose d’avis médical', () => {
    const texts = [
      getTrainingVerdict(parse(payload({ cur: { apparent_temperature: 33 } })), NOW),
      getTrainingVerdict(parse(payload({ cur: { apparent_temperature: 1 } })), NOW),
    ].join(' ');
    expect(texts).not.toMatch(/danger|médecin|malaise|interdit/i);
  });
});
