(() => {
  'use strict';

  let vehicles = [];
  let activeFilters = { model: [], category: [], price: [] };

  // Price tier labels
  function priceTierLabel(low, high) {
    return `$${low.toFixed(2)} to $${high.toFixed(2)} / week`;
  }

  // Unique price tiers from data
  function getPriceTiers(data) {
    const seen = new Map();
    data.forEach(v => {
      const key = `${v.price_low}-${v.price_high}`;
      if (!seen.has(key)) {
        seen.set(key, { low: v.price_low, high: v.price_high, label: priceTierLabel(v.price_low, v.price_high) });
      }
    });
    return Array.from(seen.values()).sort((a, b) => a.low - b.low);
  }

  // Count items per filter value
  function countByField(data, field) {
    const counts = {};
    data.forEach(v => {
      const val = v[field];
      counts[val] = (counts[val] || 0) + 1;
    });
    return counts;
  }

  // Build dropdown panel HTML
  function buildDropdown(panelId, headerLabel, items) {
    const panel = document.getElementById(panelId);
    const searchId = `search-${panelId}`;

    let html = `
      <div class="dropdown-header">
        <span>${headerLabel}</span>
        <span>Count</span>
      </div>
      <div class="dropdown-search">
        <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
        <input type="text" id="${searchId}" placeholder="Type to search">
      </div>
    `;

    items.forEach(item => {
      html += `
        <div class="dropdown-item selected" data-value="${item.value}">
          <div class="checkbox"></div>
          <span class="item-label">${item.label}</span>
          <span class="item-count">${item.count}</span>
        </div>
      `;
    });

    panel.innerHTML = html;

    // Search filtering within dropdown
    const searchInput = document.getElementById(searchId);
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      panel.querySelectorAll('.dropdown-item').forEach(el => {
        const label = el.querySelector('.item-label').textContent.toLowerCase();
        el.style.display = label.includes(query) ? '' : 'none';
      });
    });

    // Toggle item selection
    panel.querySelectorAll('.dropdown-item').forEach(el => {
      el.addEventListener('click', () => {
        el.classList.toggle('selected');
        updateFiltersFromUI();
        renderVehicles();
      });
    });
  }

  // Read active filters from UI
  function updateFiltersFromUI() {
    ['model', 'category', 'price'].forEach(filterType => {
      const panel = document.getElementById(`panel-${filterType}`);
      const selected = panel.querySelectorAll('.dropdown-item.selected');
      activeFilters[filterType] = Array.from(selected).map(el => el.dataset.value);

      // Update count badge
      const total = panel.querySelectorAll('.dropdown-item').length;
      const count = selected.length;
      const countEl = document.querySelector(`#filter-${filterType} .filter-count`);
      if (count < total) {
        countEl.textContent = `(${count})`;
      } else {
        countEl.textContent = `(${total})`;
      }
    });
  }

  // Filter vehicles based on active selections
  function getFilteredVehicles() {
    return vehicles.filter(v => {
      const modelMatch = activeFilters.model.length === 0 || activeFilters.model.includes(v.model);
      const catMatch = activeFilters.category.length === 0 || activeFilters.category.includes(v.category);
      const priceKey = `${v.price_low}-${v.price_high}`;
      const priceMatch = activeFilters.price.length === 0 || activeFilters.price.includes(priceKey);
      return modelMatch && catMatch && priceMatch;
    });
  }

  // Render vehicle cards
  function renderVehicles() {
    const list = document.getElementById('vehicle-list');
    const filtered = getFilteredVehicles();

    if (filtered.length === 0) {
      list.innerHTML = '<div class="no-results">No vehicles match your filters. Try adjusting your selection.</div>';
      return;
    }

    list.innerHTML = filtered.map((v, i) => `
      <div class="vehicle-card">
        <div class="vehicle-model">
          <span class="vehicle-number">${i + 1}.</span>
          <span class="vehicle-name">${v.model}</span>
        </div>
        <div class="vehicle-image">
          <img src="${v.image}" alt="${v.model}" loading="lazy"
               onerror="this.outerHTML='<div class=\\'img-placeholder\\'>${v.make} ${v.model.split(' ').slice(1).join(' ')}</div>'">
        </div>
        <div class="vehicle-price">
          <span class="price-range">$${v.price_low.toFixed(2)} to $${v.price_high.toFixed(2)}</span>
          <span class="price-period"> / ${v.period}</span>
        </div>
      </div>
    `).join('');
  }

  // Toggle dropdown open/close
  function setupDropdownToggles() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const dropdown = btn.closest('.filter-dropdown');
        const wasOpen = dropdown.classList.contains('open');

        // Close all dropdowns
        document.querySelectorAll('.filter-dropdown').forEach(d => d.classList.remove('open'));

        // Toggle clicked one
        if (!wasOpen) {
          dropdown.classList.add('open');
        }
      });
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.filter-dropdown')) {
        document.querySelectorAll('.filter-dropdown').forEach(d => d.classList.remove('open'));
      }
    });
  }

  // Initialize
  async function init() {
    try {
      const res = await fetch('data.json');
      vehicles = await res.json();
    } catch {
      // Fallback: inline data if fetch fails (e.g., file:// protocol)
      vehicles = [
        { id: 1, model: "2025 Tucson Hybrid N Line", make: "Hyundai", category: "SUV", image: "../Cars/tucson-hybrid-n-line.png", price_low: 154.40, price_high: 168.57, period: "week", year: 2025 },
        { id: 2, model: "2025 Sonata Preferred-Trend", make: "Hyundai", category: "Sedan", image: "../Cars/sonata-preferred-trend.png", price_low: 154.40, price_high: 168.57, period: "week", year: 2025 },
        { id: 3, model: "2025 Santa Cruz Preferred", make: "Hyundai", category: "Truck", image: "../Cars/santa-cruz-preferred.png", price_low: 136.08, price_high: 148.57, period: "week", year: 2025 },
        { id: 4, model: "2025 Santa Cruz Preferred", make: "Hyundai", category: "Truck", image: "../Cars/santa-cruz-preferred-2.png", price_low: 136.08, price_high: 148.57, period: "week", year: 2025 },
        { id: 5, model: "2025 MazdaCX-5 Kuro", make: "Mazda", category: "SUV", image: "../Cars/mazda-cx5-kuro.png", price_low: 198.89, price_high: 217.14, period: "week", year: 2025 },
        { id: 6, model: "2025 IONIQ 6 Preferred Long Range", make: "Hyundai", category: "Sedan", image: "../Cars/ioniq-6-preferred.png", price_low: 154.40, price_high: 168.57, period: "week", year: 2025 },
        { id: 7, model: "2025 Hyundai Tucson", make: "Hyundai", category: "SUV", image: "../Cars/tucson.png", price_low: 154.40, price_high: 168.57, period: "week", year: 2025 },
        { id: 8, model: "2025 Hyundai Santa Fe", make: "Hyundai", category: "SUV", image: "../Cars/santa-fe.png", price_low: 154.40, price_high: 168.57, period: "week", year: 2025 },
        { id: 9, model: "2025 Hyundai Palisade", make: "Hyundai", category: "SUV", image: "../Cars/palisade.png", price_low: 272.17, price_high: 297.14, period: "week", year: 2025 },
        { id: 10, model: "2025 Hyundai Kona Electric", make: "Hyundai", category: "SUV", image: "../Cars/kona-electric.png", price_low: 272.17, price_high: 297.14, period: "week", year: 2025 },
        { id: 11, model: "2025 Hyundai Kona", make: "Hyundai", category: "SUV", image: "../Cars/kona.png", price_low: 154.40, price_high: 168.57, period: "week", year: 2025 }
      ];
    }

    // Build model filter
    const modelCounts = countByField(vehicles, 'model');
    const modelItems = Object.entries(modelCounts).map(([name, count]) => ({ value: name, label: name, count }));
    buildDropdown('panel-model', 'Model', modelItems);

    // Build category filter
    const catCounts = countByField(vehicles, 'category');
    const catItems = Object.entries(catCounts).map(([name, count]) => ({ value: name, label: name, count }));
    buildDropdown('panel-category', 'Categories', catItems);

    // Build price filter
    const priceTiers = getPriceTiers(vehicles);
    const priceItems = priceTiers.map(tier => {
      const key = `${tier.low}-${tier.high}`;
      const count = vehicles.filter(v => `${v.price_low}-${v.price_high}` === key).length;
      return { value: key, label: tier.label, count };
    });
    buildDropdown('panel-price', 'Price', priceItems);

    // Initialize active filters (all selected by default)
    updateFiltersFromUI();
    setupDropdownToggles();
    renderVehicles();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
