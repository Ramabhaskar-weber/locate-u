(() => {
  const csrf = document.querySelector('meta[name="csrf-token"]')?.content || '';
  const themeToggle = document.querySelector('.theme-toggle');
  const savedTheme = localStorage.getItem('locateu-theme');
  if (savedTheme === 'dark') document.documentElement.dataset.theme = 'dark';
  themeToggle?.addEventListener('click', () => {
    const dark = document.documentElement.dataset.theme !== 'dark';
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    localStorage.setItem('locateu-theme', dark ? 'dark' : 'light');
  });

  window.locateUApi = async (url, options = {}) => {
    const headers = new Headers(options.headers || {});
    headers.set('X-CSRFToken', csrf);
    if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
    const response = await fetch(url, { ...options, headers, credentials: 'same-origin' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401 || response.status === 403 && data.error === 'Unauthorized') throw new Error('Sign in to save places or manage trips.');
      throw new Error(data.error || 'That request could not be completed.');
    }
    return data;
  };

  function announce(message, kind = 'success') {
    let region = document.querySelector('.toast-region');
    if (!region) {
      region = document.createElement('div');
      region.className = 'toast-region';
      region.setAttribute('role', 'status');
      document.body.append(region);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${kind}`;
    toast.textContent = message;
    region.append(toast);
    window.setTimeout(() => toast.remove(), 3600);
  }
  window.locateUAnnounce = announce;

  document.querySelectorAll('[data-favorite-id]').forEach((button) => {
    button.addEventListener('click', async () => {
      const id = button.dataset.favoriteId;
      try {
        const result = await window.locateUApi(`/api/favorites/${encodeURIComponent(id)}`, {
          method: button.classList.contains('is-saved') ? 'DELETE' : 'POST'
        });
        button.classList.toggle('is-saved', result.saved);
        button.setAttribute('aria-pressed', String(result.saved));
        button.textContent = result.saved ? '♥' : '♡';
        if (button.classList.contains('remove-favorite')) button.closest('.saved-row')?.remove();
        announce(result.saved ? 'Saved to your favorites.' : 'Removed from your favorites.');
      } catch (error) {
        announce(error.message, 'error');
      }
    });
  });

  const searchForm = document.querySelector('#discovery-search');
  const resultsRegion = document.querySelector('#search-results');
  document.querySelector('#destination-search')?.addEventListener('input', () => {
    window.locateUSelectedPlace = null;
    const routeButton = document.querySelector('#route-selected-destination');
    if (routeButton) routeButton.disabled = true;
  });
  searchForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const typed = document.querySelector('#destination-search')?.value?.trim() || '';
    const selected = window.locateUSelectedPlace;
    const showSelectedPlace = (place) => {
      const summary = document.createElement('p');
      summary.className = 'loading-note';
      summary.textContent = `${place.name || place.address} · ${Number(place.latitude).toFixed(5)}, ${Number(place.longitude).toFixed(5)}`;
      resultsRegion.replaceChildren(summary);
    };
    if (selected && Number.isFinite(Number(selected.latitude)) && Number.isFinite(Number(selected.longitude))) {
      window.dispatchEvent(new CustomEvent('locateu:place-selected', { detail: selected }));
      showSelectedPlace(selected);
      return;
    }
    if (!typed) return;
    resultsRegion.replaceChildren(Object.assign(document.createElement('p'), { className: 'loading-note', textContent: 'Finding places…' }));
    let lookupWarning = '';
    try {
      const location = await window.locateUApi('/api/geocode', { method: 'POST', body: JSON.stringify({ address: typed }) });
      const place = {
        name: location.address,
        address: location.address,
        latitude: location.latitude,
        longitude: location.longitude,
        addressComponents: location.address_components || [],
      };
      window.locateUSelectedPlace = place;
      window.dispatchEvent(new CustomEvent('locateu:place-selected', { detail: place }));
      showSelectedPlace(place);
      return;
    } catch (error) {
      lookupWarning = error.message;
    }
    const params = new URLSearchParams({ q: typed });
    try {
      const data = await window.locateUApi(`/api/search?${params}`);
      resultsRegion.replaceChildren();
      const heading = document.createElement('h2');
      heading.textContent = `${data.count} curated result${data.count === 1 ? '' : 's'}`;
      resultsRegion.append(heading);
      if (lookupWarning) {
        const note = document.createElement('p');
        note.className = 'loading-note';
        note.textContent = `Global place lookup is unavailable (${lookupWarning}). Showing curated records only.`;
        resultsRegion.append(note);
      }
      if (!data.places.length) {
        const note = document.createElement('p');
        note.textContent = 'No local match yet. Try a broader destination or use the Google map search when configured.';
        resultsRegion.append(note);
        return;
      }
      data.places.forEach((place) => {
        const link = document.createElement('a');
        link.className = 'search-result-row';
        link.href = `/places/${encodeURIComponent(place.id)}`;
        const title = document.createElement('strong');
        title.textContent = place.name;
        const address = document.createElement('span');
        address.textContent = `${place.address}${place.rating ? ` · ★ ${place.rating}` : ' · Not rated'}`;
        link.append(title, address);
        resultsRegion.append(link);
      });
    } catch (error) {
      resultsRegion.textContent = error.message;
    }
  });

  const categoryFilter = document.querySelector('#category-filter');
  const sortFilter = document.querySelector('#sort-filter');
  async function refreshDestinations() {
    const grid = document.querySelector('#destination-grid');
    if (!grid) return;
    const category = categoryFilter?.value || '';
    const sort = sortFilter?.value || 'recommended';
    let coords = null;
    if (sort === 'nearest' && navigator.geolocation) {
      coords = await new Promise((resolve) => navigator.geolocation.getCurrentPosition(
        (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
        () => resolve(null), { timeout: 6000, maximumAge: 300000 }
      ));
      if (!coords) announce('Location permission was not available; showing recommended places.', 'error');
    }
    const params = new URLSearchParams({ category, sort: coords ? 'nearest' : sort });
    if (coords) { params.set('lat', coords.lat); params.set('lng', coords.lng); }
    try {
      const data = await window.locateUApi(`/api/search?${params}`);
      grid.replaceChildren();
      data.places.forEach((place, index) => {
        const article = document.createElement('article');
        article.className = 'destination-card';
        const link = document.createElement('a');
        link.className = `place-visual visual-${index % 5}`;
        link.href = `/places/${encodeURIComponent(place.id)}`;
        const tag = document.createElement('span'); tag.className = 'visual-tag'; tag.textContent = place.category.replaceAll('_', ' ');
        const glyph = document.createElement('span'); glyph.className = 'visual-glyph'; glyph.textContent = '✳';
        link.append(tag, glyph);
        const body = document.createElement('div'); body.className = 'destination-content';
        const titleRow = document.createElement('div'); titleRow.className = 'destination-title';
        const title = document.createElement('h2'); const titleLink = document.createElement('a'); titleLink.href = link.href; titleLink.textContent = place.name; title.append(titleLink);
        const rating = document.createElement('span'); rating.className = 'rating'; rating.textContent = place.rating ? `★ ${place.rating}` : 'Unrated';
        titleRow.append(title, rating);
        const description = document.createElement('p'); description.textContent = place.description;
        const meta = document.createElement('div'); meta.className = 'destination-meta';
        const address = document.createElement('span'); address.textContent = place.distance_km == null ? place.address : `${place.distance_km} km · ${place.address}`;
        const save = document.createElement('button'); save.type = 'button'; save.className = 'save-place'; save.dataset.favoriteId = place.id; save.setAttribute('aria-label', `Save ${place.name}`); save.title = 'Save to favorites'; save.textContent = '♡';
        save.addEventListener('click', async () => {
          try { const result = await window.locateUApi(`/api/favorites/${encodeURIComponent(place.id)}`, { method: 'POST' }); save.classList.toggle('is-saved', result.saved); save.textContent = result.saved ? '♥' : '♡'; announce('Saved to your favorites.'); }
          catch (error) { announce(error.message, 'error'); }
        });
        meta.append(address, save); body.append(titleRow, description, meta); article.append(link, body); grid.append(article);
      });
      const count = document.querySelector('.listing-count'); if (count) count.textContent = `${data.count} places`;
    } catch (error) { announce(error.message, 'error'); }
  }
  categoryFilter?.addEventListener('change', refreshDestinations);
  sortFilter?.addEventListener('change', refreshDestinations);
  function updateCurrentLocationSummary(location) {
    const region = document.querySelector('#current-location-summary');
    if (!region) return;
    const heading = document.createElement('strong');
    heading.textContent = location.city || location.name || 'Current location';
    const address = document.createElement('span');
    address.textContent = location.address || 'Address could not be resolved';
    const coordinates = document.createElement('small');
    coordinates.textContent = `${Number(location.latitude).toFixed(5)}, ${Number(location.longitude).toFixed(5)}`;
    region.replaceChildren(heading, address, coordinates);
  }

  async function requestCurrentLocation() {
    if (!navigator.geolocation) {
      announce('Location is not supported by this browser.', 'error');
      return;
    }
    const buttons = document.querySelectorAll('[data-current-location]');
    buttons.forEach((button) => { button.disabled = true; });
    navigator.geolocation.getCurrentPosition(async (position) => {
      const current = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        name: 'Resolving your current location…',
        address: 'Location shared with permission',
      };
      window.locateUCurrentLocation = current;
      updateCurrentLocationSummary(current);
      window.dispatchEvent(new CustomEvent('locateu:location', { detail: current }));
      try {
        const result = await window.locateUApi('/api/reverse-geocode', {
          method: 'POST', body: JSON.stringify({ lat: current.lat, lng: current.lng })
        });
        const resolved = { ...current, address: result.address, addressComponents: result.address_components || [] };
        window.locateUCurrentLocation = resolved;
        updateCurrentLocationSummary(resolved);
        window.dispatchEvent(new CustomEvent('locateu:current-location-updated', { detail: resolved }));
        announce('Current location found. Nearby places are ready.');
      } catch {
        current.name = 'Current location';
        current.address = 'Address unavailable; coordinates are shown.';
        updateCurrentLocationSummary(current);
        window.locateUCurrentLocation = current;
        announce('Location found, but its address could not be resolved.', 'error');
      } finally {
        buttons.forEach((button) => { button.disabled = false; });
      }
    }, () => {
      buttons.forEach((button) => { button.disabled = false; });
      announce('Location permission was not available. You can still search for a destination.', 'error');
    }, { timeout: 10000, maximumAge: 300000 });
  }
  document.querySelectorAll('[data-current-location]').forEach((button) => {
    button.addEventListener('click', requestCurrentLocation);
  });
  document.querySelector('#map-fullscreen')?.addEventListener('click', async () => {
    const frame = document.querySelector('.map-frame');
    try { if (!document.fullscreenElement) await frame.requestFullscreen(); else await document.exitFullscreen(); }
    catch { announce('Fullscreen is not available in this browser.', 'error'); }
  });
  document.querySelectorAll('[data-map-view]').forEach((button) => {
    button.addEventListener('click', () => {
      const showMap = button.dataset.mapView === 'map';
      document.querySelector('#map-frame')?.toggleAttribute('hidden', !showMap);
      document.querySelector('#nearby-results')?.toggleAttribute('hidden', showMap);
      document.querySelectorAll('[data-map-view]').forEach((viewButton) => {
        const selected = viewButton === button;
        viewButton.classList.toggle('is-active', selected);
        viewButton.setAttribute('aria-pressed', String(selected));
      });
    });
  });
  document.querySelectorAll('.map-category-toggle').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.map-category-toggle').forEach((toggle) => {
        const selected = toggle === button;
        toggle.classList.toggle('is-active', selected);
        toggle.setAttribute('aria-pressed', String(selected));
      });
      window.locateUMapFilter?.(button.dataset.mapCategory || '');
    });
  });

  document.querySelector('#admin-place-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form).entries());
    try {
      await window.locateUApi('/api/admin/places', { method: 'POST', body: JSON.stringify(body) });
      announce('Destination added.');
      window.location.reload();
    } catch (error) { announce(error.message, 'error'); }
  });
  document.querySelectorAll('.delete-place').forEach((button) => {
    button.addEventListener('click', async () => {
      if (!window.confirm('Remove this destination? Saved favorites will also be removed.')) return;
      try {
        await window.locateUApi(`/api/admin/places/${encodeURIComponent(button.dataset.id)}`, { method: 'DELETE' });
        button.closest('tr')?.remove();
        announce('Destination removed.');
      } catch (error) { announce(error.message, 'error'); }
    });
  });
})();
