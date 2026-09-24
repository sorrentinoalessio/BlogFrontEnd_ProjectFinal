const OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const OPEN_METEO_MARINE_URL = "https://marine-api.open-meteo.com/v1/marine";

const getDailyValue = (daily, key) => daily?.[key]?.[0] ?? null;

const getHourlyMiddayValue = (hourly, key) => {
  const values = hourly?.[key];
  if (!Array.isArray(values) || values.length === 0) return null;
  const middayIndex = values.length > 12 ? 12 : Math.floor(values.length / 2);
  return values[middayIndex] ?? values.find((value) => value !== null) ?? null;
};

const fetchDailyWeather = async (url, params) => {
  const query = new URLSearchParams({
    latitude: String(params.latitude),
    longitude: String(params.longitude),
    start_date: params.date,
    end_date: params.date,
    timezone: "auto",
    ...(params.daily ? { daily: params.daily } : {}),
    ...(params.hourly ? { hourly: params.hourly } : {}),
  });
  const response = await fetch(`${url}?${query.toString()}`);
  if (!response.ok) throw new Error(`Open-Meteo HTTP ${response.status}`);
  return response.json();
};

export const getWeatherForDate = async ({ latitude, longitude, date }) => {
  const weather = await fetchDailyWeather(OPEN_METEO_FORECAST_URL, {
      latitude,
      longitude,
      date,
      daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,wind_direction_10m_dominant",
  });

  let marine = null;
  try {
    marine = await fetchDailyWeather(OPEN_METEO_MARINE_URL, {
      latitude,
      longitude,
      date,
      daily: "wave_height_max,wave_period_max,wind_wave_height_max,swell_wave_height_max",
      hourly: "sea_surface_temperature",
    });
  } catch {
    // I dati marini non sono disponibili per le località interne.
  }

  return {
    date,
    timezone: weather.timezone ?? marine?.timezone ?? null,
    coordinates: { latitude, longitude },
    atmospheric: {
      weatherCode: getDailyValue(weather.daily, "weather_code"),
      temperatureMax: getDailyValue(weather.daily, "temperature_2m_max"),
      temperatureMin: getDailyValue(weather.daily, "temperature_2m_min"),
      precipitationProbability: getDailyValue(weather.daily, "precipitation_probability_max"),
      windSpeedMax: getDailyValue(weather.daily, "wind_speed_10m_max"),
      windDirection: getDailyValue(weather.daily, "wind_direction_10m_dominant"),
    },
    marine: {
      waveHeightMax: getDailyValue(marine?.daily, "wave_height_max"),
      wavePeriodMax: getDailyValue(marine?.daily, "wave_period_max"),
      windWaveHeightMax: getDailyValue(marine?.daily, "wind_wave_height_max"),
      swellWaveHeightMax: getDailyValue(marine?.daily, "swell_wave_height_max"),
      seaSurfaceTemperature: getHourlyMiddayValue(marine?.hourly, "sea_surface_temperature"),
    },
    source: "Open-Meteo",
  };
};
