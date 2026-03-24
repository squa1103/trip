/**
 * OpenWeather：Geocoding + Current weather + 5 Day / 3h Forecast，
 * 一次快取「當前氣象」與「48 小時預報（16 筆）」至 localStorage，30 分鐘失效。
 * 需設定 import.meta.env.VITE_WEATHER_API_KEY
 */

const CACHE_PREFIX = 'weatherBundleCache_v1:';
const CACHE_TTL_MS = 30 * 60 * 1000;
const FORECAST_STEPS = 16; // 3h * 16 = 48h

export function getWeatherApiKey(): string | null {
  const k = (import.meta.env.VITE_WEATHER_API_KEY as string | undefined)?.trim();
  return k && k.length > 0 ? k : null;
}

export function normalizeCityKey(name: string): string {
  return name.trim().toLowerCase();
}

export interface GeoCityHit {
  name: string;
  country: string;
  state?: string;
  lat: number;
  lon: number;
}

export interface CurrentWeatherPayload {
  name: string;
  country?: string;
  /** 與追蹤清單 key 一致時用於對照 */
  queryKey: string;
  tempC: number;
  description: string;
  iconCode: string;
  iconUrl: string;
}

export interface ForecastHourItem {
  dt: number;
  tempC: number;
  description: string;
  iconCode: string;
  iconUrl: string;
}

export interface WeatherBundle {
  current: CurrentWeatherPayload;
  /** 未來 48 小時，每 3 小時一筆，共 16 筆 */
  forecast48h: ForecastHourItem[];
}

interface CacheEnvelope {
  ts: number;
  data: WeatherBundle;
}

function isWeatherBundle(x: unknown): x is WeatherBundle {
  if (typeof x !== 'object' || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    Array.isArray(o.forecast48h) &&
    typeof o.current === 'object' &&
    o.current !== null
  );
}

function readCache(cityKey: string): CacheEnvelope | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CACHE_PREFIX + normalizeCityKey(cityKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEnvelope;
    if (!parsed || typeof parsed.ts !== 'number' || !isWeatherBundle(parsed.data)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(cityKey: string, data: WeatherBundle): void {
  if (typeof window === 'undefined') return;
  const env: CacheEnvelope = { ts: Date.now(), data };
  window.localStorage.setItem(CACHE_PREFIX + normalizeCityKey(cityKey), JSON.stringify(env));
}

function mapWeatherResponse(json: Record<string, unknown>, queryKey: string): CurrentWeatherPayload {
  const name = typeof json.name === 'string' ? json.name : queryKey;
  const main = json.main as { temp?: number } | undefined;
  const weatherArr = json.weather as Array<{ description?: string; icon?: string }> | undefined;
  const w0 = weatherArr?.[0];
  const tempC = typeof main?.temp === 'number' ? main.temp : NaN;
  const description = typeof w0?.description === 'string' ? w0.description : '';
  const iconCode = typeof w0?.icon === 'string' ? w0.icon : '01d';
  const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  const sys = json.sys as { country?: string } | undefined;
  return {
    name,
    country: typeof sys?.country === 'string' ? sys.country : undefined,
    queryKey,
    tempC,
    description,
    iconCode,
    iconUrl,
  };
}

function mapForecastList(list: unknown[]): ForecastHourItem[] {
  const out: ForecastHourItem[] = [];
  for (let i = 0; i < Math.min(FORECAST_STEPS, list.length); i++) {
    const item = list[i] as Record<string, unknown>;
    const dt = typeof item.dt === 'number' ? item.dt : 0;
    const main = item.main as { temp?: number } | undefined;
    const weatherArr = item.weather as Array<{ description?: string; icon?: string }> | undefined;
    const w0 = weatherArr?.[0];
    const tempC = typeof main?.temp === 'number' ? main.temp : NaN;
    const description = typeof w0?.description === 'string' ? w0.description : '';
    const iconCode = typeof w0?.icon === 'string' ? w0.icon : '01d';
    out.push({
      dt,
      tempC,
      description,
      iconCode,
      iconUrl: `https://openweathermap.org/img/wn/${iconCode}@2x.png`,
    });
  }
  return out;
}

async function fetchCurrentAndForecast(
  key: string,
  params: { q?: string; lat?: number; lon?: number },
): Promise<WeatherBundle | null> {
  const apiKey = getWeatherApiKey();
  if (!apiKey) return null;

  const weatherUrl = new URL('https://api.openweathermap.org/data/2.5/weather');
  const forecastUrl = new URL('https://api.openweathermap.org/data/2.5/forecast');
  for (const u of [weatherUrl, forecastUrl]) {
    u.searchParams.set('units', 'metric');
    u.searchParams.set('lang', 'zh_tw');
    u.searchParams.set('appid', apiKey);
    if (params.q !== undefined) {
      u.searchParams.set('q', params.q);
    } else if (params.lat !== undefined && params.lon !== undefined) {
      u.searchParams.set('lat', String(params.lat));
      u.searchParams.set('lon', String(params.lon));
    }
  }

  const [weatherRes, forecastRes] = await Promise.all([
    fetch(weatherUrl.toString()),
    fetch(forecastUrl.toString()),
  ]);

  if (!weatherRes.ok) return null;
  const weatherJson = (await weatherRes.json()) as Record<string, unknown>;
  const current = mapWeatherResponse(weatherJson, key);

  let forecast48h: ForecastHourItem[] = [];
  if (forecastRes.ok) {
    const forecastJson = (await forecastRes.json()) as { list?: unknown[] };
    const list = Array.isArray(forecastJson.list) ? forecastJson.list : [];
    forecast48h = mapForecastList(list);
  }

  return { current, forecast48h };
}

/**
 * 依城市字串抓取當前天氣 + 48h 預報；快取 30 分鐘內直接回傳整包。
 */
export async function fetchWeatherWithCache(cityName: string): Promise<WeatherBundle | null> {
  const key = getWeatherApiKey();
  if (!key) return null;

  const trimmed = cityName.trim();
  if (!trimmed) return null;

  const cached = readCache(trimmed);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.data;
  }

  const bundle = await fetchCurrentAndForecast(trimmed, { q: trimmed });
  if (!bundle) return null;
  writeCache(trimmed, bundle);
  return bundle;
}

/** Geocoding：預覽用，Enter 後呼叫 */
export async function searchCityPreview(query: string): Promise<GeoCityHit[]> {
  const apiKey = getWeatherApiKey();
  if (!apiKey) return [];

  const q = query.trim();
  if (!q) return [];

  const url = new URL('https://api.openweathermap.org/geo/1.0/direct');
  url.searchParams.set('q', q);
  url.searchParams.set('limit', '5');
  url.searchParams.set('appid', apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) return [];

  const arr = (await res.json()) as Array<{
    name: string;
    country: string;
    state?: string;
    lat: number;
    lon: number;
  }>;

  return arr.map((r) => ({
    name: r.name,
    country: r.country,
    state: r.state,
    lat: r.lat,
    lon: r.lon,
  }));
}

/** 用座標拉天氣 + 預報（加入追蹤時） */
export async function fetchWeatherByCoordsWithCache(
  lat: number,
  lon: number,
  cacheKey: string,
): Promise<WeatherBundle | null> {
  const apiKey = getWeatherApiKey();
  if (!apiKey) return null;

  const trimmed = cacheKey.trim();
  if (!trimmed) return null;

  const cached = readCache(trimmed);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.data;
  }

  const bundle = await fetchCurrentAndForecast(trimmed, { lat, lon });
  if (!bundle) return null;
  writeCache(trimmed, bundle);
  return bundle;
}

export function formatTrackedCityLabel(hit: GeoCityHit): string {
  return `${hit.name}, ${hit.country}`;
}

/** 解析追蹤字串「城市, 國碼」供標題顯示 */
export function parseTrackedCityLabel(queryKey: string): { cityName: string; countryCode: string } {
  const trimmed = queryKey.trim();
  const lastComma = trimmed.lastIndexOf(',');
  if (lastComma <= 0) return { cityName: trimmed, countryCode: '' };
  return {
    cityName: trimmed.slice(0, lastComma).trim(),
    countryCode: trimmed.slice(lastComma + 1).trim(),
  };
}

function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * 將 48h 預報列按「本地日期」分組，並產生分割標題（今天 / 明天 / 後天 / n月n日）
 */
export function groupForecastByDay(
  items: ForecastHourItem[],
  now: Date = new Date(),
): { dayKey: string; label: string; items: ForecastHourItem[] }[] {
  if (items.length === 0) return [];

  const todayStart = startOfLocalDay(now);
  const dayMs = 24 * 60 * 60 * 1000;

  const groups = new Map<string, ForecastHourItem[]>();
  const order: string[] = [];

  for (const it of items) {
    const d = new Date(it.dt * 1000);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!groups.has(key)) {
      order.push(key);
      groups.set(key, []);
    }
    groups.get(key)!.push(it);
  }

  return order.map((dayKey) => {
    const first = groups.get(dayKey)![0];
    const thatDay = new Date(first.dt * 1000);
    const thatStart = startOfLocalDay(thatDay);
    const diffDays = Math.round((thatStart - todayStart) / dayMs);

    let label: string;
    const md = `${thatDay.getMonth() + 1}月${thatDay.getDate()}日`;
    if (diffDays === 0) label = `今天 · ${md}`;
    else if (diffDays === 1) label = `明天 · ${md}`;
    else if (diffDays === 2) label = `後天 · ${md}`;
    else label = md;

    return { dayKey, label, items: groups.get(dayKey)! };
  });
}

/** 單列時間顯示（例如 15:00） */
export function formatForecastTime(dtSeconds: number): string {
  const d = new Date(dtSeconds * 1000);
  return d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false });
}
