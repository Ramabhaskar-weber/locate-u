(() => {
  const list = document.querySelector('#itinerary-list');
  if (!list || !window.locateUApi) return;
  const editor = document.querySelector('#planner-editor');
  const itemsRegion = document.querySelector('#planner-items');
  const activeId = document.querySelector('#active-itinerary-id');

  function distanceKm(start, end) {
    const radians = (value) => value * Math.PI / 180;
    const deltaLat = radians(end.latitude - start.latitude);
    const deltaLng = radians(end.longitude - start.longitude);
    const value = Math.sin(deltaLat / 2) ** 2 + Math.cos(radians(start.latitude)) * Math.cos(radians(end.latitude)) * Math.sin(deltaLng / 2) ** 2;
    return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(value)));
  }

  async function loadItems(id, title) {
    const data = await window.locateUApi('/api/itineraries');
    const itinerary = data.itineraries.find((entry) => String(entry.id) === String(id));
    if (!itinerary) throw new Error('This itinerary could not be found.');
    activeId.value = id;
    document.querySelector('#editor-title').textContent = title || itinerary.title;
    itemsRegion.replaceChildren();
    const byDay = new Map();
    itinerary.items.forEach((item) => {
      if (!byDay.has(item.day_number)) byDay.set(item.day_number, []);
      byDay.get(item.day_number).push(item);
    });
    if (!byDay.size) {
      const empty = document.createElement('p'); empty.className = 'muted'; empty.textContent = 'No stops yet. Add a place to begin your route.'; itemsRegion.append(empty);
    }
    [...byDay.entries()].sort((a, b) => a[0] - b[0]).forEach(([day, stops]) => {
      const section = document.createElement('section'); section.className = 'planner-day';
      const heading = document.createElement('h3'); heading.textContent = `Day ${day}`; section.append(heading);
      const locatedStops = stops.filter((stop) => Number.isFinite(Number(stop.latitude)) && Number.isFinite(Number(stop.longitude)));
      if (locatedStops.length) {
        const total = locatedStops.slice(1).reduce((sum, stop, index) => sum + distanceKm(locatedStops[index], stop), 0);
        const estimate = document.createElement('p'); estimate.className = 'route-estimate';
        estimate.textContent = locatedStops.length > 1 ? `About ${total.toFixed(1)} km between saved coordinates · straight-line estimate` : 'Route estimate needs at least two mapped stops.';
        section.append(estimate);
        const route = document.createElement('a'); route.className = 'day-route-link'; route.target = '_blank'; route.rel = 'noopener';
        const origin = `${locatedStops[0].latitude},${locatedStops[0].longitude}`;
        const destination = `${locatedStops[locatedStops.length - 1].latitude},${locatedStops[locatedStops.length - 1].longitude}`;
        const waypoints = locatedStops.slice(1, -1).map((stop) => `${stop.latitude},${stop.longitude}`).join('|');
        const parameters = new URLSearchParams({ api: '1', origin, destination, travelmode: 'driving' });
        if (waypoints) parameters.set('waypoints', waypoints);
        route.href = `https://www.google.com/maps/dir/?${parameters}`;
        route.textContent = 'Open day route in Google Maps ↗';
        section.append(route);
      }
      stops.forEach((stop) => {
        const row = document.createElement('div'); row.className = 'planner-stop';
        const titleNode = document.createElement('strong'); titleNode.textContent = stop.title;
        const note = document.createElement('span'); note.textContent = stop.notes || stop.place_name || '';
        row.append(titleNode, note);
        if (stop.latitude != null && stop.longitude != null) {
          const directions = document.createElement('a'); directions.className = 'text-action'; directions.target = '_blank'; directions.rel = 'noopener'; directions.href = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${stop.latitude},${stop.longitude}`)}`; directions.textContent = 'Directions ↗'; row.append(directions);
        }
        const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'icon-button'; remove.setAttribute('aria-label', `Remove ${stop.title}`); remove.textContent = '×';
        remove.addEventListener('click', async () => {
          try { await window.locateUApi(`/api/itineraries/${id}/items/${stop.id}`, { method: 'DELETE' }); await loadItems(id, title); }
          catch (error) { window.locateUAnnounce(error.message, 'error'); }
        });
        row.append(remove); section.append(row);
      });
      itemsRegion.append(section);
    });
    editor.hidden = false;
    editor.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  document.querySelector('#new-itinerary')?.addEventListener('click', async () => {
    const title = window.prompt('Name this trip');
    if (!title?.trim()) return;
    const destination = window.prompt('Where are you going? (optional)') || '';
    try {
      const created = await window.locateUApi('/api/itineraries', { method: 'POST', body: JSON.stringify({ title: title.trim(), destination: destination.trim() }) });
      const empty = document.querySelector('#empty-itineraries'); empty?.remove();
      const row = document.createElement('article'); row.className = 'itinerary-row'; row.dataset.itineraryId = created.id;
      row.innerHTML = `<div class="itinerary-index">NEW</div><div class="itinerary-summary"><h2></h2><p></p></div><button type="button" class="button button-quiet open-itinerary">Open plan ↗</button><button type="button" class="icon-button delete-itinerary" aria-label="Delete itinerary" title="Delete itinerary">×</button>`;
      row.querySelector('h2').textContent = created.title; row.querySelector('p').textContent = destination || 'Destination not set';
      row.querySelector('.open-itinerary').addEventListener('click', () => loadItems(created.id, created.title));
      row.querySelector('.delete-itinerary').addEventListener('click', async () => { if (!window.confirm('Delete this itinerary and its stops?')) return; await window.locateUApi(`/api/itineraries/${created.id}`, { method: 'DELETE' }); row.remove(); });
      list.prepend(row); await loadItems(created.id, created.title);
    } catch (error) { window.locateUAnnounce(error.message, 'error'); }
  });

  list.addEventListener('click', async (event) => {
    const open = event.target.closest('.open-itinerary');
    if (open) {
      const row = open.closest('[data-itinerary-id]');
      try { await loadItems(row.dataset.itineraryId, row.querySelector('h2')?.textContent); }
      catch (error) { window.locateUAnnounce(error.message, 'error'); }
    }
    const remove = event.target.closest('.delete-itinerary');
    if (remove) {
      const id = remove.dataset.id || remove.closest('[data-itinerary-id]')?.dataset.itineraryId;
      if (!window.confirm('Delete this itinerary and its stops?')) return;
      try { await window.locateUApi(`/api/itineraries/${id}`, { method: 'DELETE' }); remove.closest('[data-itinerary-id]')?.remove(); editor.hidden = true; }
      catch (error) { window.locateUAnnounce(error.message, 'error'); }
    }
  });

  document.querySelector('#add-itinerary-item')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const placeId = document.querySelector('#item-place').value;
    const day = Number(document.querySelector('#item-day').value);
    const notes = document.querySelector('#item-note').value.trim();
    try {
      await window.locateUApi(`/api/itineraries/${activeId.value}/items`, { method: 'POST', body: JSON.stringify({ place_id: placeId || null, day_number: day, notes }) });
      document.querySelector('#item-note').value = '';
      await loadItems(activeId.value, document.querySelector('#editor-title').textContent);
    } catch (error) { window.locateUAnnounce(error.message, 'error'); }
  });
  document.querySelector('#close-editor')?.addEventListener('click', () => { editor.hidden = true; });
  document.querySelector('#print-itinerary')?.addEventListener('click', () => window.print());
})();
