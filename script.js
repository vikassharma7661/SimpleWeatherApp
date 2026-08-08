// ============================================
// 1. GEOAPIFY API KEY (your credentials)
// Docs: https://apidocs.geoapify.com/docs/geocoding/
// ============================================
const GEOAPIFY_API_KEY = "46dabca772634892aa72040b88fc9c4e";

const GEOAPIFY_GEOCODE_URL = "https://api.geoapify.com/v1/geocode/search";

// Open-Meteo is free and needs no API key — we use it for weather data
const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

// ============================================
// 2. GET ELEMENTS FROM THE HTML
// ============================================
const cityInput = document.getElementById("city-input");
const searchBtn = document.getElementById("search-btn");
const weatherInfo = document.getElementById("weather-info");
const errorMessage = document.getElementById("error-message");
const cityName = document.getElementById("city-name");
const temperature = document.getElementById("temperature");
const weatherCondition = document.getElementById("weather-condition");
const humidity = document.getElementById("humidity");
const windSpeed = document.getElementById("wind-speed");
const forecastSection = document.getElementById("forecast-section");
const forecastList = document.getElementById("forecast-list");

// ============================================
// 3. EVENT LISTENERS
// ============================================
searchBtn.addEventListener("click", handleSearch);

cityInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    handleSearch();
  }
});

// ============================================
// 4. MAIN SEARCH FUNCTION
// ============================================
async function handleSearch() {
  const city = cityInput.value.trim();

  if (city === "") {
    showError("Please enter a city name.");
    return;
  }

  hideError();
  setLoading(true);

  try {
    const location = await fetchLocation(city);
    const weatherData = await fetchWeather(location.lat, location.lon);
    displayWeather(location, weatherData);
    displayForecast(weatherData.daily);
  } catch (error) {
    showError(error.message);
    clearForecast();
  } finally {
    setLoading(false);
  }
}

// ============================================
// 5. STEP A — Geoapify: city name → coordinates
// ============================================
async function fetchLocation(city) {
  const url =
    GEOAPIFY_GEOCODE_URL +
    "?text=" +
    encodeURIComponent(city) +
    "&format=json" +
    "&apiKey=" +
    GEOAPIFY_API_KEY;

  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("Invalid Geoapify API key.");
    }

    throw new Error("Could not search for that city. Try again.");
  }

  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    throw new Error("City not found. Try another spelling.");
  }

  const place = data.results[0];

  return {
    name: place.formatted || place.city || city,
    lat: place.lat,
    lon: place.lon,
  };
}

// ============================================
// 6. STEP B — Open-Meteo: current + 10-day forecast
// ============================================
async function fetchWeather(lat, lon) {
  const url =
    OPEN_METEO_URL +
    "?latitude=" +
    lat +
    "&longitude=" +
    lon +
    "&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code" +
    "&daily=weather_code,temperature_2m_max,temperature_2m_min" +
    "&forecast_days=10" +
    "&timezone=auto" +
    "&wind_speed_unit=ms";

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Could not load weather data. Try again.");
  }

  return response.json();
}

// ============================================
// 7. SHOW CURRENT WEATHER ON THE PAGE
// ============================================
function displayWeather(location, data) {
  const current = data.current;

  cityName.textContent = location.name;
  temperature.textContent = Math.round(current.temperature_2m) + "°C";
  weatherCondition.textContent =
    getWeatherIcon(current.weather_code) +
    " " +
    getWeatherDescription(current.weather_code);
  humidity.textContent = current.relative_humidity_2m + "%";
  windSpeed.textContent = current.wind_speed_10m + " m/s";
}

// ============================================
// 8. SHOW 10-DAY FORECAST
// ============================================
function displayForecast(daily) {
  forecastList.innerHTML = "";

  for (let i = 0; i < daily.time.length; i++) {
    const code = daily.weather_code[i];
    const maxTemp = Math.round(daily.temperature_2m_max[i]);
    const minTemp = Math.round(daily.temperature_2m_min[i]);

    const dayCard = document.createElement("div");
    dayCard.className = "forecast-day";
    dayCard.innerHTML =
      '<p class="forecast-date">' +
      formatDayName(daily.time[i], i) +
      "</p>" +
      '<span class="forecast-icon">' +
      getWeatherIcon(code) +
      "</span>" +
      '<p class="forecast-label">' +
      getWeatherDescription(code) +
      "</p>" +
      '<p class="forecast-temp">' +
      maxTemp +
      "° <span>" +
      minTemp +
      "°</span></p>";

    forecastList.appendChild(dayCard);
  }

  forecastSection.hidden = false;
}

function clearForecast() {
  forecastList.innerHTML = "";
  forecastSection.hidden = true;
}

// ============================================
// 9. WEATHER CODE HELPERS — text + icons
// ============================================
function getWeatherDescription(code) {
  const descriptions = {
    0: "Clear",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Cloudy",
    45: "Foggy",
    48: "Foggy",
    51: "Drizzle",
    53: "Drizzle",
    55: "Drizzle",
    61: "Rainy",
    63: "Rainy",
    65: "Heavy rain",
    71: "Snowy",
    73: "Snowy",
    75: "Heavy snow",
    80: "Showers",
    81: "Showers",
    82: "Heavy showers",
    95: "Stormy",
    96: "Stormy",
    99: "Stormy",
  };

  return descriptions[code] || "Unknown";
}

function getWeatherIcon(code) {
  const icons = {
    0: "☀️",
    1: "🌤️",
    2: "⛅",
    3: "☁️",
    45: "🌫️",
    48: "🌫️",
    51: "🌦️",
    53: "🌦️",
    55: "🌧️",
    61: "🌧️",
    63: "🌧️",
    65: "🌧️",
    71: "🌨️",
    73: "🌨️",
    75: "❄️",
    80: "🌦️",
    81: "🌧️",
    82: "🌧️",
    95: "⛈️",
    96: "⛈️",
    99: "⛈️",
  };

  return icons[code] || "🌡️";
}

function formatDayName(dateString, index) {
  if (index === 0) {
    return "Today";
  }

  const date = new Date(dateString + "T00:00:00");
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

// ============================================
// 10. HELPER FUNCTIONS
// ============================================
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.hidden = false;
}

function hideError() {
  errorMessage.textContent = "";
  errorMessage.hidden = true;
}

function setLoading(isLoading) {
  weatherInfo.classList.toggle("is-loading", isLoading);

  if (isLoading) {
    cityName.textContent = "Loading...";
    temperature.textContent = "--°C";
    weatherCondition.textContent = "--";
    humidity.textContent = "--%";
    windSpeed.textContent = "-- m/s";
    clearForecast();
  }
}
