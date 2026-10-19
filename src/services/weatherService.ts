import AsyncStorage from '@react-native-async-storage/async-storage';

export interface HourlyWeather {
  datetime: string; // heure locale du lieu, ex. 2026-10-18T14:00
  time: string;
  date: string;
  temperature: number;
  condition: string;
  isDay: boolean;
  precip: number; // mm
  rainChance: number; // %, 0 si inconnu
}

export interface DailyWeather {
  date: string;
  displayDay: string;
  tempMax: number;
  tempMin: number;
  condition: string;
  rainChance: number; // % maximal de la journée
}

export interface WeatherData {
  temperature: number;
  feelsLike: number;
  windSpeed: number; // km/h
  windGust: number; // km/h
  precipitation: number; // mm à l'instant
  sunset?: string; // ex: 19:24
  condition: string;
  conditionLabel: string;
  isDay: boolean;
  /** Heure locale du lieu au moment de la mesure, ex. 2026-10-18T14:15 */
  observedAt: string;
  timestamp: number;
  hourly: HourlyWeather[];
  daily: DailyWeather[];
}

const DAYS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

/** Code météo Open-Meteo (WMO) → état simple. Chaque code est traité, aucun ne retombe sur « dégagé » par défaut. */
export function getWeatherCondition(code: number): string {
  if (code === 0) return 'clear';
  if (code === 1 || code === 2) return 'partly';
  if (code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'foggy';
  if ((code >= 51 && code <= 57) || (code >= 61 && code <= 67)) return 'rainy';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snowy';
  if (code >= 80 && code <= 82) return 'showers';
  if (code >= 95 && code <= 99) return 'stormy';
  return 'cloudy';
}

export function getWeatherConditionLabel(condition: string, isDay = true): string {
  switch (condition) {
    case 'clear': return isDay ? 'Ensoleillé' : 'Ciel dégagé';
    case 'partly': return isDay ? 'Plutôt dégagé' : 'Quelques nuages';
    case 'cloudy': return 'Nuageux';
    case 'foggy': return 'Brumeux';
    case 'rainy': return 'Pluvieux';
    case 'snowy': return 'Neigeux';
    case 'showers': return 'Averses';
    case 'stormy': return 'Orageux';
    default: return 'Nuageux';
  }
}

const num = (v: unknown, fallback = 0): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/** Réponse brute Open-Meteo → données de l'app. Pure : testable sans réseau. */
export function parseWeather(data: any, nowMs: number = Date.now()): WeatherData {
  const c = data?.current;
  if (!c) throw new Error('Weather payload without current');

  const hourly: HourlyWeather[] = [];
  const h = data.hourly;
  if (h?.time) {
    for (let i = 0; i < h.time.length; i++) {
      const [date, time] = String(h.time[i]).split('T');
      hourly.push({
        datetime: h.time[i],
        time: time || '--:--',
        date,
        temperature: Math.round(num(h.temperature_2m?.[i])),
        condition: getWeatherCondition(num(h.weather_code?.[i])),
        isDay: h.is_day?.[i] !== 0,
        precip: num(h.precipitation?.[i]),
        rainChance: num(h.precipitation_probability?.[i]),
      });
    }
  }

  const daily: DailyWeather[] = [];
  let sunset: string | undefined;
  const d = data.daily;
  if (d?.time) {
    const todayStr = String(c.time || d.time[0]).slice(0, 10);
    const tomorrowStr = d.time[1];
    if (d.sunset?.[0]) sunset = String(d.sunset[0]).split('T')[1]?.slice(0, 5);
    for (let i = 0; i < d.time.length; i++) {
      const date = String(d.time[i]);
      const [y, m, day] = date.split('-').map(Number);
      let displayDay = DAYS_FR[new Date(y, m - 1, day).getDay()];
      if (date === todayStr) displayDay = "Aujourd'hui";
      else if (date === tomorrowStr) displayDay = 'Demain';
      daily.push({
        date,
        displayDay,
        tempMax: Math.round(num(d.temperature_2m_max?.[i])),
        tempMin: Math.round(num(d.temperature_2m_min?.[i])),
        condition: getWeatherCondition(num(d.weather_code?.[i])),
        rainChance: num(d.precipitation_probability_max?.[i]),
      });
    }
  }

  const condition = getWeatherCondition(num(c.weather_code));
  const isDay = c.is_day !== 0;
  return {
    temperature: Math.round(num(c.temperature_2m)),
    feelsLike: Math.round(num(c.apparent_temperature, num(c.temperature_2m))),
    windSpeed: Math.round(num(c.wind_speed_10m)),
    windGust: Math.round(num(c.wind_gusts_10m, num(c.wind_speed_10m))),
    precipitation: Math.round(num(c.precipitation) * 10) / 10,
    sunset,
    condition,
    conditionLabel: getWeatherConditionLabel(condition, isDay),
    isDay,
    observedAt: String(c.time || ''),
    timestamp: nowMs,
    hourly,
    daily,
  };
}

/** Heure locale « AAAA-MM-JJTHH:00 » d'un instant, pour la comparer aux heures de prévision (déjà locales). */
export function localHourIso(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:00`;
}

/** Index de l'heure en cours dans les prévisions (0 si introuvable). */
export function currentHourIndex(hourly: HourlyWeather[], nowIso: string): number {
  const idx = hourly.findIndex((h) => h.datetime >= nowIso);
  return idx === -1 ? 0 : idx;
}

/** Les 24 prochaines heures à partir de l'heure en cours. */
export function next24h(hourly: HourlyWeather[], nowIso: string): HourlyWeather[] {
  const i = currentHourIndex(hourly, nowIso);
  return hourly.slice(i, i + 24);
}

/** Piste mouillée : de la pluie à l'instant ou au cours des 3 dernières heures. */
export function isTrackWet(w: WeatherData, nowIso: string): boolean {
  if (w.precipitation > 0) return true;
  const i = currentHourIndex(w.hourly, nowIso);
  const recent = w.hourly.slice(Math.max(0, i - 3), i + 1);
  return recent.reduce((s, h) => s + h.precip, 0) >= 0.2;
}

/** Plus forte chance de pluie sur les n prochaines heures. */
export function rainChanceNext(w: WeatherData, nowIso: string, hours = 3): number {
  const i = currentHourIndex(w.hourly, nowIso);
  const slice = w.hourly.slice(i, i + hours);
  return slice.length ? Math.max(...slice.map((h) => h.rainChance)) : 0;
}

const hourLabel = (time: string) => `${parseInt(time.slice(0, 2), 10)} h`;

/**
 * Une phrase calme sur les conditions du jour, calculée sans IA. Jamais alarmiste, aucun conseil médical.
 * Fenêtre : de maintenant à 21 h (heure locale du lieu).
 */
export function getTrainingVerdict(w: WeatherData, nowIso: string): string {
  const i = currentHourIndex(w.hourly, nowIso);
  const ahead = w.hourly.slice(i, i + 12).filter((h) => parseInt(h.time.slice(0, 2), 10) <= 21 && h.date === nowIso.slice(0, 10));
  const isRainy = (h: HourlyWeather) => h.rainChance >= 60 || h.precip >= 0.5;

  const storm = ahead.find((h) => h.condition === 'stormy');
  if (storm) return `Orage possible vers ${hourLabel(storm.time)} : évite d'être dehors à ce moment-là.`;

  const raining = w.precipitation >= 0.2 || (ahead[0] && isRainy(ahead[0]));
  if (raining) {
    const dry = ahead.find((h) => !isRainy(h));
    return dry ? `Il pleut en ce moment. Accalmie prévue vers ${hourLabel(dry.time)}.` : 'Il pleut en ce moment et la pluie continue ce soir.';
  }
  const rain = ahead.find(isRainy);
  if (rain) return `Pluie probable vers ${hourLabel(rain.time)}.`;

  if (w.windGust >= 45) return `Rafales jusqu'à ${w.windGust} km/h : le vent sera gênant sur la piste.`;
  if (w.feelsLike >= 30) return `Chaleur (ressenti ${w.feelsLike}°) : pense à boire et garde un échauffement progressif.`;
  if (w.feelsLike <= 3) return `Froid (ressenti ${w.feelsLike}°) : prends plus de temps pour t'échauffer.`;
  return 'Bonnes conditions pour s\'entraîner dehors.';
}

// --- Réseau et mémoire ---------------------------------------------------------------------------------------------

const CACHE_KEY = 'weather-cache-v1';
export const WEATHER_FRESH_MS = 30 * 60 * 1000;

export interface CachedWeather {
  data: WeatherData;
  place?: string;
  at: number;
}

export const weatherCache = {
  read: async (): Promise<CachedWeather | null> => {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      const v = raw ? JSON.parse(raw) : null;
      return v?.data && typeof v.at === 'number' ? (v as CachedWeather) : null;
    } catch {
      return null;
    }
  },
  write: async (data: WeatherData, place?: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ data, place, at: Date.now() }));
    } catch {
      /* stockage indisponible : la météo reste affichée, sans mémoire */
    }
  },
};

export const weatherService = {
  fetchWeather: async (lat: number, lon: number): Promise<WeatherData> => {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,apparent_temperature,wind_speed_10m,wind_gusts_10m,precipitation,weather_code,is_day` +
      `&hourly=temperature_2m,weather_code,precipitation,precipitation_probability,is_day` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunset,precipitation_probability_max` +
      `&timezone=auto&forecast_days=7&past_hours=6`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error('Weather fetch failed');
      return parseWeather(await response.json());
    } finally {
      clearTimeout(timer);
    }
  },
};
