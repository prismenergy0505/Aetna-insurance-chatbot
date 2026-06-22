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
const providerCount = document.getElementById('providerCount');

// 국가 코드 → 데이터 파일 경로
const COUNTRY_FILES = {
  UK: 'providers/uk.json',
  SG: 'providers/sg.json',
  KR: 'providers/kr.json',
  US: 'providers/us.json',
};

let currentCountry = 'UK';
let currentCountryData = [];

countryTabs.querySelectorAll('.country-tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    countryTabs.querySelectorAll('.country-tab').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentCountry = btn.getAttribute('data-country');
    currentCountryData = [];
    loadCountry(currentCountry);
  });
});

async function loadCountry(countryCode) {
  providerCount.textContent = '불러오는 중…';
  providerList.innerHTML = '';
  cityFilter.innerHTML = '<option value="">전체 도시</option>';
  specialtyFilter.innerHTML = '<option value="">전체 전문분야</option>';

  const path = COUNTRY_FILES[countryCode];

  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error('not found');
    const data = await res.json();
    currentCountryData = data;
    populateFilters(data);
    renderProviders(data);
  } catch (err) {
    providerCount.textContent = '';
    providerList.innerHTML = `
      <div class="provider-empty">
        <p><strong>${countryCode}</strong> 데이터가 아직 준비되지 않았어요.</p>
        <p class="provider-empty-sub">관리자가 <code>providers/${countryCode.toLowerCase()}.json</code> 파일을 추가하면 여기에 표시됩니다.</p>
      </div>`;
  }
}

function populateFilters(data) {
  const cities = [...new Set(data.map((p) => p.city).filter(Boolean))].sort();
  const specialties = [...new Set(
    data.flatMap((p) => (p.specialty ? p.specialty.split('|') : [])).filter(Boolean)
  )].sort();

  cities.forEach((city) => {
    const opt = document.createElement('option');
    opt.value = city;
    opt.textContent = city;
    cityFilter.appendChild(opt);
  });

  specialties.forEach((sp) => {
    const opt = document.createElement('option');
    opt.value = sp;
    opt.textContent = formatSpecialty(sp);
    specialtyFilter.appendChild(opt);
  });
}

function renderProviders(data) {
  const query = providerSearch.value.trim().toLowerCase();
  const city = cityFilter.value;
  const specialty = specialtyFilter.value;

  const filtered = data.filter((p) => {
    const matchesQuery =
      !query ||
      (p.name && p.name.toLowerCase().includes(query)) ||
      (p.city && p.city.toLowerCase().includes(query)) ||
      (p.specialty && p.specialty.toLowerCase().includes(query));
    const matchesCity = !city || p.city === city;
    const matchesSpecialty = !specialty || (p.specialty && p.specialty.split('|').includes(specialty));
    return matchesQuery && matchesCity && matchesSpecialty;
  });

  providerCount.textContent = `${filtered.length.toLocaleString()}개 결과`;

  if (filtered.length === 0) {
    providerList.innerHTML = '<div class="provider-empty"><p>검색 결과가 없습니다.</p></div>';
    return;
  }

  // 너무 많으면 일부만 먼저 보여주고 "더 보기"로 확장 (렌더 성능 보호)
  const PAGE_SIZE = 100;
  const toShow = filtered.slice(0, PAGE_SIZE);

  providerList.innerHTML = toShow.map(renderCard).join('');

  if (filtered.length > PAGE_SIZE) {
    const moreBtn = document.createElement('button');
    moreBtn.className = 'provider-more-btn';
    moreBtn.textContent = `${(filtered.length - PAGE_SIZE).toLocaleString()}개 더 보기`;
    moreBtn.addEventListener('click', () => {
      providerList.innerHTML += filtered.slice(PAGE_SIZE).map(renderCard).join('');
    });
    providerList.appendChild(moreBtn);
  }
}

function renderCard(p) {
  const specialtyTags = p.specialty
    ? p.specialty.split('|').map((s) => `<span class="tag">${escapeHtml(formatSpecialty(s))}</span>`).join('')
    : '';

  return `
    <div class="provider-card">
      <div class="provider-card-head">
        <h3>${escapeHtml(p.name || '')}</h3>
        <span class="provider-type">${escapeHtml(p.type || '')}</span>
      </div>
      <p class="provider-address">${escapeHtml(p.address || '')}${p.city ? ', ' + escapeHtml(p.city) : ''}</p>
      <div class="provider-meta">
        ${p.contact ? `<a href="tel:${escapeAttr(p.contact)}" class="meta-link">📞 ${escapeHtml(p.contact)}</a>` : ''}
        ${p.website ? `<a href="${escapeAttr(p.website)}" target="_blank" rel="noopener" class="meta-link">🌐 웹사이트</a>` : ''}
      </div>
      ${specialtyTags ? `<div class="provider-tags">${specialtyTags}</div>` : ''}
    </div>`;
}

function formatSpecialty(s) {
  return s === 'General Practice' ? 'GP (General Practice)' : s;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(str) {
  return String(str).replace(/"/g, '&quot;');
}

providerSearch.addEventListener('input', () => renderProviders(currentCountryData));
cityFilter.addEventListener('change', () => renderProviders(currentCountryData));
specialtyFilter.addEventListener('change', () => renderProviders(currentCountryData));
