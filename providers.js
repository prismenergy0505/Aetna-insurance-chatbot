// providers.js
// 탭 전환(챗봇 ↔ 병원 찾기) + 국가별 Provider 검색/필터 기능

// ---------- 탭 전환 ----------
const tabChatBtn = document.getElementById('tabChatBtn');
const tabProvidersBtn = document.getElementById('tabProvidersBtn');
const chatView = document.getElementById('chatView');
const providersView = document.getElementById('providersView');

tabChatBtn.addEventListener('click', () => {
  tabChatBtn.classList.add('active');
  tabProvidersBtn.classList.remove('active');
  chatView.style.display = '';
  providersView.style.display = 'none';
});

tabProvidersBtn.addEventListener('click', () => {
  tabProvidersBtn.classList.add('active');
  tabChatBtn.classList.remove('active');
  chatView.style.display = 'none';
  providersView.style.display = '';
  if (!currentCountryData.length) {
    loadCountry(currentCountry);
  }
});

// ---------- Provider 데이터 로딩 ----------
const countryTabs = document.getElementById('countryTabs');
const providerSearch = document.getElementById('providerSearch');
const cityFilter = document.getElementById('cityFilter');
const specialtyFilter = document.getElementById('specialtyFilter');
const providerList = document.getElementById('providerList');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const resultCount = document.getElementById('resultCount');

let currentCountry = 'sg';
let currentCountryData = [];
let filteredData = [];
let displayCount = 100;

const countryFiles = {
  uk: 'providers/uk.json',
  sg: 'providers/sg.json',
  kr: 'providers/kr.json'
};

const countryNames = {
  uk: '🇬🇧 영국',
  sg: '🇸🇬 싱가포르',
  kr: '🇰🇷 한국'
};

countryTabs.addEventListener('click', (e) => {
  const btn = e.target.closest('.country-tab');
  if (!btn) return;
  const country = btn.dataset.country;
  if (country === currentCountry) return;

  document.querySelectorAll('.country-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  currentCountry = country;
  currentCountryData = [];
  displayCount = 100;
  providerSearch.value = '';
  loadCountry(country);
});

async function loadCountry(country) {
  providerList.innerHTML = '<p class="loading-msg">불러오는 중...</p>';
  try {
    const res = await fetch(countryFiles[country]);
    if (!res.ok) throw new Error('파일을 찾을 수 없습니다');
    const data = await res.json();
    currentCountryData = data;
    populateFilters(data);
    applyFilters();
  } catch (err) {
    providerList.innerHTML = `<p class="loading-msg">${countryNames[country]} 데이터를 아직 준비 중입니다. 인사팀(경영지원팀)에 문의해주세요.</p>`;
    resultCount.textContent = '';
  }
}

function populateFilters(data) {
  const cities = [...new Set(data.map(p => p.city).filter(Boolean))].sort();
  const specialties = [...new Set(
    data.flatMap(p => (p.specialty || '').split('|').map(s => s.trim()).filter(Boolean))
  )].sort();

  cityFilter.innerHTML = '<option value="">모든 도시</option>' +
    cities.map(c => `<option value="${c}">${c}</option>`).join('');

  specialtyFilter.innerHTML = '<option value="">모든 전문분야</option>' +
    specialties.map(s => `<option value="${s}">${s}</option>`).join('');
}

function applyFilters() {
  const q = providerSearch.value.trim().toLowerCase();
  const city = cityFilter.value;
  const specialty = specialtyFilter.value;

  filteredData = currentCountryData.filter(p => {
    if (q && !(p.name || '').toLowerCase().includes(q)) return false;
    if (city && p.city !== city) return false;
    if (specialty && !(p.specialty || '').includes(specialty)) return false;
    return true;
  });

  displayCount = 100;
  renderList();
}

function renderList() {
  const toShow = filteredData.slice(0, displayCount);
  resultCount.textContent = `총 ${filteredData.length}개 중 ${toShow.length}개 표시`;

  if (toShow.length === 0) {
    providerList.innerHTML = '<p class="loading-msg">검색 결과가 없습니다.</p>';
    loadMoreBtn.style.display = 'none';
    return;
  }

  providerList.innerHTML = toShow.map(p => `
    <div class="provider-card">
      <h3>${escapeHtml(p.name || '')}</h3>
      ${p.type ? `<span class="provider-type">${escapeHtml(p.type)}</span>` : ''}
      ${p.address ? `<p class="provider-address">📍 ${escapeHtml(p.address)}${p.city ? ', ' + escapeHtml(p.city) : ''}</p>` : ''}
      ${p.specialty ? `<p class="provider-specialty">🩺 ${escapeHtml(p.specialty.split('|').join(', '))}</p>` : ''}
      ${p.contact ? `<p class="provider-contact">📞 ${escapeHtml(p.contact)}</p>` : ''}
      ${p.website ? `<p class="provider-website">🔗 <a href="${escapeHtml(p.website)}" target="_blank" rel="noopener">웹사이트</a></p>` : ''}
    </div>
  `).join('');

  loadMoreBtn.style.display = displayCount < filteredData.length ? 'block' : 'none';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

providerSearch.addEventListener('input', applyFilters);
cityFilter.addEventListener('change', applyFilters);
specialtyFilter.addEventListener('change', applyFilters);

loadMoreBtn.addEventListener('click', () => {
  displayCount += 100;
  renderList();
});
