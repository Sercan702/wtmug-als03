// ========================
// Uygulama Durumu ve Ayarlar
// ========================
const API_BASE = 'https://api.open-meteo.com/v1/forecast';
const GEO_API = 'https://geocoding-api.open-meteo.com/v1/search';

const state = {
  lastData: null,
  lastUpdate: null,
};

// ========================
// DOM Elementleri
// ========================
const $ = (id) => document.getElementById(id);
const cityInput = $('city-input');
const searchBtn = $('search-btn');
const locationBtn = $('location-btn');
const errorMsg = $('error-msg');
const weatherSection = $('weather-section');
const offlineBanner = $('offline-banner');
const themeToggle = $('theme-toggle');

// ========================
// Tema Yönetimi
// ========================
function initTheme() {
  const saved = localStorage.getItem('theme') || 'light';
  applyTheme(saved);
}
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
  themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
  localStorage.setItem('theme', theme);
}
themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

// ========================
// Çevrimiçi/Çevrimdışı Durumu
// ========================
function updateOnlineStatus() {
  if (!navigator.onLine) {
    offlineBanner.classList.remove('hidden');
  } else {
    offlineBanner.classList.add('hidden');
  }
}
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// ========================
// Hata Gösterimi
// ========================
function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.classList.remove('hidden');
}
function hideError() {
  errorMsg.classList.add('hidden');
  errorMsg.textContent = '';
}

// ========================
// Hava Durumu Kodu -> Açıklama ve İkon
// ========================
function getWeatherInfo(code) {
  const map = {
    0: { desc: 'Açık', icon: '☀️' },
    1: { desc: 'Az Bulutlu', icon: '🌤️' },
    2: { desc: 'Parçalı Bulutlu', icon: '⛅' },
    3: { desc: 'Kapalı', icon: '☁️' },
    45: { desc: 'Sisli', icon: '🌫️' },
    48: { desc: 'Kırağılı Sis', icon: '🌫️' },
    51: { desc: 'Hafif Çisenti', icon: '🌦️' },
    53: { desc: 'Çisenti', icon: '🌦️' },
    55: { desc: 'Yoğun Çisenti', icon: '🌧️' },
    61: { desc: 'Hafif Yağmurlu', icon: '🌦️' },
    63: { desc: 'Yağmurlu', icon: '🌧️' },
    65: { desc: 'Şiddetli Yağmurlu', icon: '🌧️' },
    71: { desc: 'Hafif Kar', icon: '🌨️' },
    73: { desc: 'Kar', icon: '🌨️' },
    75: { desc: 'Yoğun Kar', icon: '❄️' },
    77: { desc: 'Kar Taneleri', icon: '❄️' },
    80: { desc: 'Hafif Sağanak', icon: '🌦️' },
    81: { desc: 'Sağanak', icon: '🌧️' },
    82: { desc: 'Şiddetli Sağanak', icon: '⛈️' },
    85: { desc: 'Kar Sağanağı', icon: '🌨️' },
    86: { desc: 'Yoğun Kar Sağanağı', icon: '❄️' },
    95: { desc: 'Gök Gürültülü', icon: '⛈️' },
    96: { desc: 'Dolulu Fırtına', icon: '⛈️' },
    99: { desc: 'Şiddetli Dolulu Fırtına', icon: '⛈️' },
  };
  return map[code] || { desc: 'Bilinmiyor', icon: '❓' };
}

// ========================
// Şehir Arama (Geocoding)
// ========================
async function searchCity(cityName) {
  const url = `${GEO_API}?name=${encodeURIComponent(cityName)}&count=1&language=tr&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Şehir araması başarısız.');
  const data = await res.json();
  if (!data.results || data.results.length === 0) {
    throw new Error(`"${cityName}" bulunamadı. Lütfen geçerli bir şehir adı girin.`);
  }
  const r = data.results[0];
  return {
    name: r.name,
    country: r.country || '',
    latitude: r.latitude,
    longitude: r.longitude,
  };
}

// ========================
// Hava Durumu Getir (Open-Meteo)
// ========================
async function fetchWeather(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: 'temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min',
    timezone: 'auto',
    forecast_days: 5,
    temperature_unit: 'celsius',
    wind_speed_unit: 'kmh',
  });
  const res = await fetch(`${API_BASE}?${params.toString()}`);
  if (!res.ok) throw new Error('Hava durumu verisi alınamadı.');
  return await res.json();
}

// ========================
// Arayüzü Güncelle
// ========================
function renderWeather(place, data) {
  $('city-name').textContent = place.country
    ? `${place.name}, ${place.country}`
    : place.name;

  const current = data.current;
  const info = getWeatherInfo(current.weather_code);

  $('current-temp').textContent = `${Math.round(current.temperature_2m)}°C`;
  $('weather-desc').textContent = `${info.icon} ${info.desc}`;
  $('humidity').textContent = `${current.relative_humidity_2m}%`;
  $('wind').textContent = `${current.wind_speed_10m} km/s`;

  // Forecast
  const forecastEl = $('forecast');
  forecastEl.innerHTML = '';
  const daily = data.daily;

  const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

  for (let i = 0; i < daily.time.length; i++) {
    const date = new Date(daily.time[i]);
    const dayName = i === 0 ? 'Bugün' : days[date.getDay()];
    const dayInfo = getWeatherInfo(daily.weather_code[i]);
    const min = Math.round(daily.temperature_2m_min[i]);
    const max = Math.round(daily.temperature_2m_max[i]);

    const div = document.createElement('div');
    div.className = 'forecast-day';
    div.innerHTML = `
      <div class="day-name">${dayName}</div>
      <div class="day-icon">${dayInfo.icon}</div>
      <div class="temps"><strong>${max}°</strong> / ${min}°</div>
    `;
    forecastEl.appendChild(div);
  }

  // Son güncelleme zamanı
  const now = new Date();
  const timeStr = now.toLocaleString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
  $('update-time').textContent = timeStr;

  state.lastUpdate = now.toISOString();
  state.lastData = { place, data };
  localStorage.setItem('lastWeather', JSON.stringify(state.lastData));

  weatherSection.classList.remove('hidden');
}

// ========================
// Arama İşlemleri
// ========================
async function handleSearch() {
  hideError();
  const city = cityInput.value.trim();
  if (!city) {
    showError('Lütfen bir şehir adı girin.');
    return;
  }
  if (!navigator.onLine) {
    showError('İnternet bağlantınız yok.');
    return;
  }

  searchBtn.disabled = true;
  searchBtn.textContent = '...';

  try {
    const place = await searchCity(city);
    const data = await fetchWeather(place.latitude, place.longitude);
    renderWeather(place, data);
  } catch (err) {
    showError(err.message || 'Bir hata oluştu.');
  } finally {
    searchBtn.disabled = false;
    searchBtn.textContent = 'Ara';
  }
}

// Konumla hava durumu
async function handleLocation() {
  hideError();
  if (!navigator.geolocation) {
    showError('Tarayıcınız konum servisini desteklemiyor.');
    return;
  }
  if (!navigator.onLine) {
    showError('İnternet bağlantınız yok.');
    return;
  }

  locationBtn.disabled = true;
  locationBtn.textContent = '📍 Konum alınıyor...';

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      try {
        const { latitude, longitude } = pos.coords;
        const data = await fetchWeather(latitude, longitude);
        renderWeather({ name: 'Mevcut Konum', country: '' }, data);
      } catch (err) {
        showError(err.message || 'Konum hava durumu alınamadı.');
      } finally {
        locationBtn.disabled = false;
        locationBtn.textContent = '📍 Konumumu Kullan';
      }
    },
    (err) => {
      let msg = 'Konum alınamadı.';
      if (err.code === err.PERMISSION_DENIED) msg = 'Konum izni verilmedi.';
      showError(msg);
      locationBtn.disabled = false;
      locationBtn.textContent = '📍 Konumumu Kullan';
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

// ========================
// Olay Dinleyiciler
// ========================
searchBtn.addEventListener('click', handleSearch);
cityInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') handleSearch();
});
locationBtn.addEventListener('click', handleLocation);

// ========================
// Service Worker Kaydı
// ========================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((err) => {
      console.warn('SW kaydedilemedi:', err);
    });
  });
}

// ========================
// Başlangıç
// ========================
initTheme();
updateOnlineStatus();

// Son kaydedilen hava durumunu yükle (çevrimdışı önizleme)
const cached = localStorage.getItem('lastWeather');
if (cached && !navigator.onLine) {
  try {
    const { place, data } = JSON.parse(cached);
    renderWeather(place, data);
  } catch (e) {}
}