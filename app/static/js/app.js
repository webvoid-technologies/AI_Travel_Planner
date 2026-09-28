/* AI Travel Planner Frontend */

const form = document.getElementById('travelForm');
const resultsContainer = document.getElementById('resultsContainer');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingText = document.getElementById('loadingText');
const generateBtn = document.getElementById('generateBtn');
const loadingIcon = document.getElementById('loadingIcon');
const generateBtnText = document.getElementById('generateBtnText');
const clearFormBtn = document.getElementById('clearFormBtn');
const navBtns = document.querySelectorAll('.nav-btn');

let currentItineraryMarkdown = '';
let currentTripData = {};

const ENDPOINTS = {
  itinerary: '/generate-itinerary',
  places: '/places',
  budget: '/budget',
  schedule: '/schedule',
  packing: '/packing',
  food: '/food',
  tips: '/tips',
  alternatives: '/alternatives',
};

function getFormData() {
  const formData = new FormData(form);
  const interests = [];
  formData.getAll('interests').forEach(value => interests.push(value));
  if (interests.length === 0) interests.push('General sightseeing');
  return {
    destination: formData.get('destination')?.trim() || '',
    starting_city: formData.get('starting_city')?.trim() || '',
    days: parseInt(formData.get('days'), 10) || 3,
    travelers: parseInt(formData.get('travelers'), 10) || 1,
    budget: formData.get('budget') || 'Medium',
    transportation: formData.get('transportation') || 'Car',
    accommodation: formData.get('accommodation') || 'Budget Hotel',
    food: formData.get('food') || 'Mixed',
    special_requirements: formData.get('special_requirements') || 'None',
    interests,
  };
}

function setLoading(isLoading, text = 'AI is planning your trip...') {
  if (isLoading) {
    loadingOverlay.classList.remove('hidden');
    loadingOverlay.classList.add('flex');
    loadingText.textContent = text;
    generateBtn.disabled = true;
    loadingIcon.classList.remove('hidden');
    generateBtnText.textContent = 'Generating...';
  } else {
    loadingOverlay.classList.add('hidden');
    loadingOverlay.classList.remove('flex');
    generateBtn.disabled = false;
    loadingIcon.classList.add('hidden');
    generateBtnText.textContent = 'Generate Full Plan';
  }
}

async function postData(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }
  return response.json();
}

function parseMarkdown(md) {
  if (typeof marked !== 'undefined') {
    marked.setOptions({ gfm: true, breaks: true });
    const raw = marked.parse(md || '');
    return typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(raw) : raw;
  }
  return '<p>' + (md || '').replace(/\n/g, '<br>') + '</p>';
}

function renderItinerary(itinerary) {
  currentItineraryMarkdown = itinerary || '';
  document.getElementById('itineraryContent').innerHTML = parseMarkdown(currentItineraryMarkdown);
}

function renderPlaces(places) {
  const container = document.getElementById('placesContent');
  container.innerHTML = '';
  if (!places || typeof places !== 'object') {
    container.innerHTML = '<p class="text-slate-500">No place recommendations available.</p>';
    return;
  }
  const categories = [
    { key: 'top_attractions', title: 'Top Attractions', icon: '🏛️', color: 'bg-blue-100 text-blue-700' },
    { key: 'hidden_gems', title: 'Hidden Gems', icon: '💎', color: 'bg-purple-100 text-purple-700' },
    { key: 'museums', title: 'Museums', icon: '🎨', color: 'bg-orange-100 text-orange-700' },
    { key: 'parks', title: 'Parks & Nature', icon: '🌳', color: 'bg-green-100 text-green-700' },
    { key: 'religious_places', title: 'Religious Places', icon: '🙏', color: 'bg-amber-100 text-amber-700' },
    { key: 'shopping_areas', title: 'Shopping Areas', icon: '🛍️', color: 'bg-pink-100 text-pink-700' },
    { key: 'cafes_restaurants', title: 'Cafes & Restaurants', icon: '☕', color: 'bg-indigo-100 text-indigo-700' },
  ];

  categories.forEach(cat => {
    const items = Array.isArray(places[cat.key]) ? places[cat.key] : [];
    if (items.length === 0) return;

    const card = document.createElement('div');
    card.className = 'bg-white/60 rounded-2xl p-5 border border-white/60 card-lift';
    let listHtml = items.map(item => {
      const name = item.name || item;
      const desc = item.description || '';
      return `<li class="mb-2"><span class="font-semibold text-slate-800">${name}</span>${desc ? `: <span class="text-slate-600">${desc}</span>` : ''}</li>`;
    }).join('');
    card.innerHTML = `
      <div class="flex items-center gap-2 mb-3">
        <span class="w-8 h-8 rounded-lg ${cat.color} flex items-center justify-center text-lg">${cat.icon}</span>
        <h4 class="font-bold text-slate-800">${cat.title}</h4>
      </div>
      <ul class="text-sm text-slate-700 list-disc pl-4">${listHtml}</ul>
    `;
    container.appendChild(card);
  });
}

function renderBudget(budget) {
  const tbody = document.getElementById('budgetTableBody');
  const tfoot = document.getElementById('budgetTableFoot');
  const notes = document.getElementById('budgetNotes');
  tbody.innerHTML = '';
  tfoot.innerHTML = '';
  notes.textContent = '';

  if (!budget || typeof budget !== 'object') {
    notes.textContent = 'Budget data unavailable.';
    return;
  }

  const daily = Array.isArray(budget.daily_breakdown) ? budget.daily_breakdown : [];
  daily.forEach(day => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-blue-50/50 transition';
    tr.innerHTML = `
      <td class="px-4 py-3 font-medium">Day ${day.day || 1}</td>
      <td class="px-4 py-3">${day.transportation ?? '-'}</td>
      <td class="px-4 py-3">${day.accommodation ?? '-'}</td>
      <td class="px-4 py-3">${day.food ?? '-'}</td>
      <td class="px-4 py-3">${day.entry_tickets ?? '-'}</td>
      <td class="px-4 py-3">${day.miscellaneous ?? '-'}</td>
      <td class="px-4 py-3 font-bold text-blue-700">${day.total ?? '-'}</td>
    `;
    tbody.appendChild(tr);
  });

  const summary = budget.summary || {};
  tfoot.innerHTML = `
    <tr>
      <td class="px-4 py-3">Total</td>
      <td class="px-4 py-3">${summary.transportation_total ?? '-'}</td>
      <td class="px-4 py-3">${summary.accommodation_total ?? '-'}</td>
      <td class="px-4 py-3">${summary.food_total ?? '-'}</td>
      <td class="px-4 py-3">${summary.entry_tickets_total ?? '-'}</td>
      <td class="px-4 py-3">${summary.miscellaneous_total ?? '-'}</td>
      <td class="px-4 py-3 text-blue-700">${summary.total_estimated_cost ?? '-'} ${summary.currency || ''}</td>
    </tr>
  `;
  notes.textContent = budget.notes || '';
}

function renderSchedule(schedule) {
  const container = document.getElementById('scheduleContent');
  container.innerHTML = '';
  if (!schedule || typeof schedule !== 'object') {
    container.innerHTML = '<p class="text-slate-500">Schedule unavailable.</p>';
    return;
  }

  const departure = schedule.departure || {};
  const arrival = schedule.arrival || {};
  const daily = Array.isArray(schedule.daily_schedule) ? schedule.daily_schedule : [];

  let html = '';
  if (Object.keys(departure).length) {
    html += `
      <div class="bg-white/60 rounded-2xl p-5 border border-white/60">
        <h4 class="font-bold text-slate-800 mb-2">Departure</h4>
        <p class="text-sm text-slate-600">From <strong>${departure.from || ''}</strong> to <strong>${departure.to || ''}</strong></p>
        <p class="text-sm text-slate-600">Mode: <strong>${departure.suggested_mode || ''}</strong></p>
        <p class="text-sm text-slate-600">Depart: ${departure.estimated_departure || ''} · Arrive: ${departure.estimated_arrival || ''}</p>
        ${departure.notes ? `<p class="text-sm text-slate-500 mt-1">${departure.notes}</p>` : ''}
      </div>
    `;
  }
  if (Object.keys(arrival).length) {
    html += `
      <div class="bg-white/60 rounded-2xl p-5 border border-white/60">
        <h4 class="font-bold text-slate-800 mb-2">Arrival & First Activity</h4>
        <p class="text-sm text-slate-600">Estimated arrival: ${arrival.estimated_arrival || ''}</p>
        <p class="text-sm text-slate-600">First activity: <strong>${arrival.first_activity || ''}</strong></p>
        ${arrival.notes ? `<p class="text-sm text-slate-500 mt-1">${arrival.notes}</p>` : ''}
      </div>
    `;
  }

  daily.forEach(day => {
    const visitOrder = Array.isArray(day.visit_order) ? day.visit_order : [];
    html += `
      <div class="bg-white/60 rounded-2xl p-5 border border-white/60">
        <div class="flex items-center justify-between mb-2">
          <h4 class="font-bold text-slate-800">Day ${day.day || 1}</h4>
          <span class="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded">${day.local_travel_timings || ''}</span>
        </div>
        <p class="text-sm text-slate-600 mb-1"><strong>Best times:</strong> ${day.best_times || ''}</p>
        <p class="text-sm text-slate-600 mb-2"><strong>Visit order:</strong> ${visitOrder.join(' → ') || ''}</p>
        ${day.notes ? `<p class="text-sm text-slate-500">${day.notes}</p>` : ''}
      </div>
    `;
  });

  container.innerHTML = html || '<p class="text-slate-500">Schedule data unavailable.</p>';
}

function renderPacking(packing) {
  const container = document.getElementById('packingContent');
  container.innerHTML = '';
  if (!packing || typeof packing !== 'object') {
    container.innerHTML = '<p class="text-slate-500">Packing checklist unavailable.</p>';
    return;
  }

  const categories = [
    { key: 'clothing', title: 'Clothing', icon: '👕', color: 'bg-sky-100 text-sky-700' },
    { key: 'electronics', title: 'Electronics', icon: '🔌', color: 'bg-slate-100 text-slate-700' },
    { key: 'medicines', title: 'Medicines', icon: '💊', color: 'bg-red-100 text-red-700' },
    { key: 'documents', title: 'Documents', icon: '📄', color: 'bg-yellow-100 text-yellow-700' },
    { key: 'accessories', title: 'Accessories', icon: '🎒', color: 'bg-teal-100 text-teal-700' },
  ];

  categories.forEach(cat => {
    const items = Array.isArray(packing[cat.key]) ? packing[cat.key] : [];
    const card = document.createElement('div');
    card.className = 'bg-white/60 rounded-2xl p-5 border border-white/60 card-lift';
    card.innerHTML = `
      <div class="flex items-center gap-2 mb-3">
        <span class="w-8 h-8 rounded-lg ${cat.color} flex items-center justify-center text-lg">${cat.icon}</span>
        <h4 class="font-bold text-slate-800">${cat.title}</h4>
      </div>
      <ul class="space-y-2">
        ${items.map(item => `
          <li class="flex items-start gap-2 text-sm text-slate-700">
            <input type="checkbox" class="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" />
            <span>${item}</span>
          </li>
        `).join('')}
      </ul>
    `;
    container.appendChild(card);
  });

  if (packing.notes) {
    const note = document.createElement('p');
    note.className = 'md:col-span-2 lg:col-span-3 text-sm text-slate-600';
    note.textContent = packing.notes;
    container.appendChild(note);
  }
}

function renderFood(food) {
  const container = document.getElementById('foodContent');
  container.innerHTML = '';
  if (!food || typeof food !== 'object') {
    container.innerHTML = '<p class="text-slate-500">Food recommendations unavailable.</p>';
    return;
  }

  const sections = [
    { key: 'local_famous_dishes', title: 'Local Famous Dishes', icon: '🍲' },
    { key: 'street_food', title: 'Street Food', icon: '🥡' },
    { key: 'vegetarian_options', title: 'Vegetarian Options', icon: '🥗' },
    { key: 'non_vegetarian_options', title: 'Non-Vegetarian Options', icon: '🍗' },
    { key: 'desserts_and_beverages', title: 'Desserts & Beverages', icon: '🍰' },
  ];

  sections.forEach(sec => {
    const items = Array.isArray(food[sec.key]) ? food[sec.key] : [];
    const card = document.createElement('div');
    card.className = 'bg-white/60 rounded-2xl p-5 border border-white/60 card-lift';
    card.innerHTML = `
      <div class="flex items-center gap-2 mb-3">
        <span class="text-xl">${sec.icon}</span>
        <h4 class="font-bold text-slate-800">${sec.title}</h4>
      </div>
      <ul class="list-disc pl-4 text-sm text-slate-700 space-y-1">
        ${items.map(item => `<li>${typeof item === 'string' ? item : `${item.name || ''} ${item.highlight ? `- ${item.highlight}` : ''} ${item.cuisine ? `(${item.cuisine})` : ''}`}</li>`).join('')}
      </ul>
    `;
    container.appendChild(card);
  });

  if (food.best_restaurants && food.best_restaurants.length) {
    const card = document.createElement('div');
    card.className = 'bg-white/60 rounded-2xl p-5 border border-white/60 card-lift md:col-span-2';
    card.innerHTML = `
      <div class="flex items-center gap-2 mb-3">
        <span class="text-xl">🍽️</span>
        <h4 class="font-bold text-slate-800">Best Restaurants</h4>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        ${food.best_restaurants.map(r => `
          <div class="bg-white/80 rounded-xl p-3 border border-slate-100">
            <p class="font-semibold text-slate-800">${r.name || ''}</p>
            <p class="text-xs text-slate-500">${r.cuisine || ''}${r.highlight ? ` · ${r.highlight}` : ''}</p>
          </div>
        `).join('')}
      </div>
    `;
    container.appendChild(card);
  }

  if (food.notes) {
    const note = document.createElement('p');
    note.className = 'md:col-span-2 text-sm text-slate-600';
    note.textContent = food.notes;
    container.appendChild(note);
  }
}

function renderTips(tips) {
  const container = document.getElementById('tipsContent');
  container.innerHTML = '';
  if (!tips || typeof tips !== 'object') {
    container.innerHTML = '<p class="text-slate-500">Travel tips unavailable.</p>';
    return;
  }

  const sections = [
    { key: 'best_season', title: 'Best Season to Visit', icon: '🌤️' },
    { key: 'safety_tips', title: 'Safety Tips', icon: '🛡️' },
    { key: 'local_transport_tips', title: 'Local Transport Tips', icon: '🚌' },
    { key: 'cultural_etiquette', title: 'Cultural Etiquette', icon: '🤝' },
    { key: 'emergency_contacts_suggestions', title: 'Emergency Contacts', icon: '📞' },
    { key: 'money_saving_tips', title: 'Money-Saving Tips', icon: '💰' },
  ];

  sections.forEach(sec => {
    const value = tips[sec.key];
    if (!value) return;
    const items = Array.isArray(value) ? value : [value];
    const card = document.createElement('div');
    card.className = 'bg-white/60 rounded-2xl p-5 border border-white/60 card-lift';
    card.innerHTML = `
      <div class="flex items-center gap-2 mb-3">
        <span class="text-xl">${sec.icon}</span>
        <h4 class="font-bold text-slate-800">${sec.title}</h4>
      </div>
      <ul class="list-disc pl-4 text-sm text-slate-700 space-y-1">
        ${items.map(item => `<li>${item}</li>`).join('')}
      </ul>
    `;
    container.appendChild(card);
  });

  if (tips.general_notes) {
    const note = document.createElement('div');
    note.className = 'md:col-span-2 bg-blue-50/70 rounded-2xl p-5 border border-blue-100';
    note.innerHTML = `<p class="text-sm text-slate-700"><strong>General Notes:</strong> ${tips.general_notes}</p>`;
    container.appendChild(note);
  }
}

function renderAlternatives(alternatives) {
  const container = document.getElementById('alternativesContent');
  container.innerHTML = '';
  if (!alternatives || typeof alternatives !== 'object') {
    container.innerHTML = '<p class="text-slate-500">Alternate plans unavailable.</p>';
    return;
  }

  const sections = [
    { key: 'rainy_day_plan', title: 'Rainy Day Plan', icon: '🌧️', color: 'from-slate-500 to-slate-400' },
    { key: 'budget_friendly', title: 'Budget-Friendly Plan', icon: '💸', color: 'from-green-500 to-emerald-400' },
    { key: 'luxury_alternative', title: 'Luxury Alternative', icon: '✨', color: 'from-purple-500 to-pink-400' },
    { key: 'family_friendly', title: 'Family-Friendly Plan', icon: '👨‍👩‍👧‍👦', color: 'from-orange-500 to-amber-400' },
  ];

  sections.forEach(sec => {
    const plan = alternatives[sec.key];
    if (!plan || typeof plan !== 'object') return;
    const activities = Array.isArray(plan.activities) ? plan.activities : [];
    const card = document.createElement('div');
    card.className = 'bg-white/60 rounded-2xl overflow-hidden border border-white/60 card-lift';
    card.innerHTML = `
      <div class="bg-gradient-to-r ${sec.color} p-4 text-white">
        <div class="flex items-center gap-2">
          <span class="text-2xl">${sec.icon}</span>
          <h4 class="font-bold">${plan.title || sec.title}</h4>
        </div>
      </div>
      <div class="p-5">
        <ul class="list-disc pl-4 text-sm text-slate-700 space-y-1 mb-3">
          ${activities.map(a => `<li>${a}</li>`).join('')}
        </ul>
        ${plan.estimated_savings ? `<p class="text-xs font-semibold text-green-700">${plan.estimated_savings}</p>` : ''}
        ${plan.notes ? `<p class="text-xs text-slate-500 mt-2">${plan.notes}</p>` : ''}
      </div>
    `;
    container.appendChild(card);
  });
}

function updateNavActive(sectionId) {
  navBtns.forEach(btn => {
    const target = btn.dataset.section;
    if (target === sectionId) {
      btn.classList.add('bg-blue-600', 'text-white', 'shadow-md');
      btn.classList.remove('text-slate-600', 'hover:bg-blue-50');
    } else {
      btn.classList.remove('bg-blue-600', 'text-white', 'shadow-md');
      btn.classList.add('text-slate-600', 'hover:bg-blue-50');
    }
  });
}

function scrollToSection(sectionId) {
  const el = document.getElementById(sectionId);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    updateNavActive(sectionId);
  }
}

navBtns.forEach(btn => {
  btn.addEventListener('click', () => scrollToSection(btn.dataset.section));
});

clearFormBtn.addEventListener('click', () => {
  form.reset();
  resultsContainer.classList.add('hidden');
  currentItineraryMarkdown = '';
  updateNavActive('preferences');
});

document.getElementById('copyItineraryBtn').addEventListener('click', async () => {
  if (!currentItineraryMarkdown) return;
  try {
    await navigator.clipboard.writeText(currentItineraryMarkdown);
    const btn = document.getElementById('copyItineraryBtn');
    const original = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => (btn.textContent = original), 1500);
  } catch (err) {
    alert('Unable to copy itinerary.');
  }
});

document.getElementById('downloadItineraryBtn').addEventListener('click', () => {
  if (!currentItineraryMarkdown) return;
  const blob = new Blob([currentItineraryMarkdown], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const dest = (currentTripData.destination || 'trip').replace(/\s+/g, '_').toLowerCase();
  a.download = `${dest}_itinerary.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  currentTripData = getFormData();

  if (!currentTripData.destination) {
    alert('Please enter a destination.');
    return;
  }

  setLoading(true, 'Generating your personalized itinerary...');
  resultsContainer.classList.add('hidden');

  try {
    // Fetch itinerary first to show early feedback, then remaining modules in parallel.
    const itineraryRes = await postData(ENDPOINTS.itinerary, currentTripData);
    if (!itineraryRes.success) throw new Error(itineraryRes.error || 'Failed to generate itinerary');
    renderItinerary(itineraryRes.itinerary);

    setLoading(true, 'Gathering places, budget, schedule, packing & more...');
    const [placesRes, budgetRes, scheduleRes, packingRes, foodRes, tipsRes, alternativesRes] = await Promise.all([
      postData(ENDPOINTS.places, currentTripData),
      postData(ENDPOINTS.budget, currentTripData),
      postData(ENDPOINTS.schedule, currentTripData),
      postData(ENDPOINTS.packing, currentTripData),
      postData(ENDPOINTS.food, currentTripData),
      postData(ENDPOINTS.tips, currentTripData),
      postData(ENDPOINTS.alternatives, currentTripData),
    ]);

    renderPlaces(placesRes.places);
    renderBudget(budgetRes.budget);
    renderSchedule(scheduleRes.schedule);
    renderPacking(packingRes.packing);
    renderFood(foodRes.food);
    renderTips(tipsRes.tips);
    renderAlternatives(alternativesRes.alternatives);

    resultsContainer.classList.remove('hidden');
    scrollToSection('itinerary');
  } catch (err) {
    console.error(err);
    alert('Error: ' + err.message);
  } finally {
    setLoading(false);
  }
});

// Highlight nav on scroll
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        updateNavActive(entry.target.id);
      }
    });
  },
  { rootMargin: '-20% 0px -70% 0px', threshold: 0 }
);

document.querySelectorAll('.section').forEach(section => observer.observe(section));
