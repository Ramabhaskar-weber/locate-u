(() => {
  let map;
  let clusterer;
  let directionsRenderer;
  let userMarker;
  let selectedMarker;
  let activeCategory = '';
  const markers = [];
  const defaultCenter = { lat: 20, lng: 0 };
  let searchCenter = defaultCenter;

  function componentName(components, types) {
    const component = (components || []).find((item) => types.some((type) => item.types?.includes(type)));
    return component?.longText || component?.long_name || '';
  }

  function getLocationParts(location) {
    const components = location.addressComponents || location.address_components || [];
    return {
      city: location.city || componentName(components, ['locality', 'postal_town', 'sublocality_level_1']),
      state: location.state || componentName(components, ['administrative_area_level_1']),
      country: location.country || componentName(components, ['country']),
      district: componentName(components, ['administrative_area_level_2']),
    };
  }

  function updateDestinationIntro(location) {
    const parts = getLocationParts(location);
    const latitude = Number(location.latitude ?? location.lat);
    const longitude = Number(location.longitude ?? location.lng);
    const cityNode = document.querySelector('#destination-city');
    const regionNode = document.querySelector('#destination-region');
    const countryNode = document.querySelector('#destination-country');
    const coordinatesNode = document.querySelector('#destination-coordinates');
    if (cityNode) cityNode.textContent = parts.city || location.name || location.address || 'Selected location';
    if (regionNode) regionNode.textContent = parts.state || parts.district || 'State or province not provided';
    if (countryNode) countryNode.textContent = parts.country || 'Country not provided by geocoder';
    if (coordinatesNode) coordinatesNode.textContent = Number.isFinite(latitude) && Number.isFinite(longitude)
      ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}` : 'Coordinates unavailable';
  }

  function updateRouteButton() {
    const button = document.querySelector('#route-selected-destination');
    if (button) button.disabled = !(window.locateUCurrentLocation && window.locateUSelectedPlace);
  }

  function approximateDistanceKm(from, to) {
    const radians = (degrees) => degrees * Math.PI / 180;
    const deltaLat = radians(to.lat - from.lat);
    const deltaLng = radians(to.lng - from.lng);
    const value = Math.sin(deltaLat / 2) ** 2
      + Math.cos(radians(from.lat)) * Math.cos(radians(to.lat)) * Math.sin(deltaLng / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
  }

  function hasCoordinates(place) {
    return place.latitude != null && place.longitude != null
      && Number.isFinite(Number(place.latitude)) && Number.isFinite(Number(place.longitude));
  }

  function markerGlyph(category) {
    if (category === 'hotel' || category === 'lodging') return '⌂';
    if (category === 'restaurant' || category === 'cafe') return '◉';
    if (['transport', 'airport', 'bus_station', 'train_station', 'subway_station', 'transit_station'].includes(category)) return '⇄';
    if (category === 'health' || category === 'hospital' || category === 'pharmacy') return '+';
    if (['public_services', 'public_bathroom', 'atm', 'police', 'gas_station', 'parking', 'drinking_water'].includes(category)) return 'i';
    return '✳';
  }

  function showSelectedLocation(location) {
    const region = document.querySelector('#selected-place-summary');
    if (!region) return;
    const parts = getLocationParts(location);
    region.replaceChildren();
    const name = document.createElement('strong');
    name.textContent = parts.city || location.name || 'Selected location';
    const address = document.createElement('span');
    address.textContent = [parts.state, parts.country].filter(Boolean).join(', ') || location.address || 'Map point selected manually';
    const coordinates = document.createElement('small');
    coordinates.textContent = `${Number(location.latitude ?? location.lat).toFixed(5)}, ${Number(location.longitude ?? location.lng).toFixed(5)}`;
    region.append(name, address, coordinates);
  }

  function showCurrentLocation(location) {
    const region = document.querySelector('#current-location-summary');
    if (!region) return;
    const parts = getLocationParts(location);
    const heading = document.createElement('strong');
    heading.textContent = parts.city || location.name || 'Current location';
    const address = document.createElement('span');
    address.textContent = [parts.state, parts.country].filter(Boolean).join(', ') || location.address || 'Address could not be resolved';
    const coordinates = document.createElement('small');
    coordinates.textContent = `${Number(location.latitude ?? location.lat).toFixed(5)}, ${Number(location.longitude ?? location.lng).toFixed(5)}`;
    region.replaceChildren(heading, address, coordinates);
  }

  function renderNearbyList(places, center, warning) {
    const region = document.querySelector('#nearby-results');
    if (!region) return;
    region.replaceChildren();
    if (!places.length) {
      const empty = document.createElement('p');
      empty.className = 'map-results-empty';
      empty.textContent = warning || 'No nearby places were returned for this search.';
      region.append(empty);
      return;
    }
    places.forEach((place) => {
      const row = document.createElement('article');
      row.className = 'map-result-row';
      const heading = document.createElement('div');
      heading.className = 'map-result-heading';
      const name = document.createElement('strong');
      name.textContent = place.name || 'Nearby place';
      const rating = document.createElement('span');
      rating.textContent = place.rating == null ? 'Not rated' : `★ ${place.rating}${place.review_count ? ` · ${place.review_count}` : ''}`;
      heading.append(name, rating);
      const address = document.createElement('p');
      address.textContent = place.address || 'Address not provided';
      const details = document.createElement('small');
      const distance = hasCoordinates(place)
        ? approximateDistanceKm(center, { lat: Number(place.latitude), lng: Number(place.longitude) })
        : null;
      details.textContent = `${place.source || 'Place provider'}${distance == null ? '' : ` · About ${distance.toFixed(1)} km straight-line`}`;
      row.append(heading, address, details);
      if (place.opening_hours) {
        const hours = document.createElement('details');
        const summary = document.createElement('summary');
        summary.textContent = 'Opening hours';
        const hoursText = document.createElement('p');
        hoursText.textContent = place.opening_hours;
        hours.append(summary, hoursText);
        row.append(hours);
      }
      const contactActions = document.createElement('div');
      contactActions.className = 'map-result-actions';
      if (place.phone) {
        const phone = document.createElement('a');
        phone.href = `tel:${encodeURIComponent(String(place.phone))}`;
        phone.textContent = `Call ${place.phone}`;
        contactActions.append(phone);
      }
      if (typeof place.website === 'string' && place.website.startsWith('https://')) {
        const website = document.createElement('a');
        website.href = place.website;
        website.target = '_blank';
        website.rel = 'noopener';
        website.textContent = 'Website ↗';
        contactActions.append(website);
      }
      if (contactActions.childElementCount) row.append(contactActions);
      if (hasCoordinates(place)) {
        const directions = document.createElement('a');
        directions.href = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${place.latitude},${place.longitude}`)}`;
        directions.target = '_blank';
        directions.rel = 'noopener';
        directions.textContent = 'Directions ↗';
        row.append(directions);
      }
      region.append(row);
    });
  }

  function setSelectedPoint(location, point) {
    window.locateUSelectedPlace = {
      name: location.name || 'Selected map point',
      address: location.address || '',
      latitude: point.lat,
      longitude: point.lng,
      addressComponents: location.addressComponents || location.address_components || [],
      city: getLocationParts(location).city,
      state: getLocationParts(location).state,
      country: getLocationParts(location).country,
    };
    updateDestinationIntro(window.locateUSelectedPlace);
    showSelectedLocation(window.locateUSelectedPlace);
    updateRouteButton();
    searchCenter = point;
    if (!map) return;
    map.setCenter(point);
    map.setZoom(14);
    if (selectedMarker) selectedMarker.map = null;
    const pin = document.createElement('div');
    pin.className = 'selected-map-pin';
    pin.setAttribute('aria-label', 'Selected location');
    selectedMarker = new google.maps.marker.AdvancedMarkerElement({ map, position: point, title: location.name || 'Selected location', content: pin });
    showNearby(point, activeCategory);
  }

  window.addEventListener('locateu:place-selected', (event) => {
    const place = event.detail;
    const point = { lat: Number(place.latitude), lng: Number(place.longitude) };
    if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return;
    setSelectedPoint(place, point);
  });

  window.addEventListener('locateu:location', (event) => {
    const current = event.detail;
    window.locateUCurrentLocation = current;
    showCurrentLocation(current);
    updateRouteButton();
    if (!map) return;
    const point = { lat: Number(current.lat ?? current.latitude), lng: Number(current.lng ?? current.longitude) };
    map.setCenter(point);
    map.setZoom(14);
    if (userMarker) userMarker.map = null;
    const dot = document.createElement('div');
    dot.className = 'user-map-pin';
    dot.setAttribute('aria-label', 'Your current location');
    userMarker = new google.maps.marker.AdvancedMarkerElement({ map, position: point, title: 'Your current location', content: dot });
    searchCenter = point;
    showNearby(point, activeCategory);
  });

  window.addEventListener('locateu:current-location-updated', (event) => {
    window.locateUCurrentLocation = event.detail;
    showCurrentLocation(event.detail);
    updateRouteButton();
  });

  document.querySelector('#route-selected-destination')?.addEventListener('click', () => {
    const current = window.locateUCurrentLocation;
    const destination = window.locateUSelectedPlace;
    if (!current || !destination) return;
    window.locateUShowRoute(
      { lat: Number(current.lat ?? current.latitude), lng: Number(current.lng ?? current.longitude) },
      { lat: Number(destination.latitude), lng: Number(destination.longitude) },
    );
  });

  document.querySelector('#map-radius')?.addEventListener('change', () => {
    if (map) showNearby(searchCenter, activeCategory);
  });

  function setStatus(message) {
    const status = document.querySelector('#map-status');
    if (status) status.textContent = message;
    const fallbackNote = document.querySelector('#map .map-fallback p');
    if (fallbackNote && !map) fallbackNote.textContent = message;
  }

  const apiScript = document.querySelector('#google-maps-api');
  apiScript?.addEventListener('error', () => {
    setStatus('Google Maps could not load. Check the browser key, Maps JavaScript API, billing, referrer restrictions, and network access.');
  });
  window.gm_authFailure = () => {
    setStatus('Google Maps rejected the browser key. Check that Maps JavaScript API is enabled, billing is active, and HTTP referrer restrictions allow this site.');
  };

  function escapeText(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }

  async function showNearby(center, category = '') {
    if (!map) return;
    activeCategory = category;
    searchCenter = center;
    setStatus('Searching nearby places…');
    try {
      const radius = Number(document.querySelector('#map-radius')?.value) || 15000;
      const data = await window.locateUApi('/api/places/nearby', { method: 'POST', body: JSON.stringify({ ...center, category, radius }) });
      markers.forEach((marker) => { marker.map = null; });
      markers.length = 0;
      clusterer?.clearMarkers();
      const bounds = new google.maps.LatLngBounds();
      data.places.forEach((place) => {
        if (!hasCoordinates(place)) return;
        const position = { lat: Number(place.latitude), lng: Number(place.longitude) };
        const markerCategory = place.category || category;
        const markerClass = String(markerCategory).replace(/[^a-z0-9_-]/gi, '');
        const pin = document.createElement('div'); pin.className = `map-pin map-pin-${markerClass}`; pin.textContent = markerGlyph(markerCategory); pin.setAttribute('aria-label', place.name);
        const marker = new google.maps.marker.AdvancedMarkerElement({ map, position, title: place.name, content: pin });
        marker.addListener('click', () => {
          const routeId = `route-${Math.random().toString(36).slice(2)}`;
          const distanceKm = approximateDistanceKm(center, position);
          const photo = place.photo_url ? `<img class="map-info-photo" src="${escapeText(place.photo_url)}" alt="Photo of ${escapeText(place.name)}" loading="lazy">` : '';
          const attributions = (place.photo_attributions || []).map((author) => {
            const name = escapeText(author.displayName || 'Photo contributor');
            const href = String(author.uri || '').startsWith('//') ? `https:${author.uri}` : String(author.uri || '');
            return href.startsWith('https://') ? `<a target="_blank" rel="noopener" href="${escapeText(href)}">${name}</a>` : name;
          }).join(', ');
          const attribution = attributions ? `<small>Photo: ${attributions}</small>` : '';
          const hours = place.opening_hours ? `<details><summary>Opening hours</summary><span>${escapeText(place.opening_hours)}</span></details>` : '';
          const phone = place.phone ? `<a href="tel:${encodeURIComponent(String(place.phone))}">Call ${escapeText(place.phone)}</a>` : '';
          const website = typeof place.website === 'string' && place.website.startsWith('https://')
            ? `<a target="_blank" rel="noopener" href="${escapeText(place.website)}">Website ↗</a>` : '';
          const detail = new google.maps.InfoWindow({ content: `<div class="map-info">${photo}<strong>${escapeText(place.name)}</strong><span>${escapeText(place.address)}</span><span>About ${distanceKm.toFixed(1)} km straight-line from this search point</span>${place.rating ? `<span>★ ${escapeText(place.rating)}${place.review_count ? ` · ${escapeText(place.review_count)} reviews` : ''}</span>` : ''}${hours}${phone}${website}${attribution}<button type="button" id="${routeId}">Route from my location</button><a target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(position.lat + ',' + position.lng)}">Open directions ↗</a></div>` });
          detail.addListener('domready', () => document.getElementById(routeId)?.addEventListener('click', () => {
            if (!window.locateUCurrentLocation) {
              setStatus('Choose “Use my location” first to draw an in-app route.');
              return;
            }
            window.locateUShowRoute(window.locateUCurrentLocation, position);
            detail.close();
          }));
          detail.open({ map, anchor: marker });
        });
        markers.push(marker); bounds.extend(position);
      });
      if (window.markerClusterer?.MarkerClusterer) clusterer = new window.markerClusterer.MarkerClusterer({ map, markers });
      if (markers.length) map.fitBounds(bounds);
      renderNearbyList(data.places, center, data.warning);
      setStatus(data.warning || `${markers.length} places in this search. Ratings are shown only when provided.`);
    } catch (error) {
      setStatus(error.message || 'Nearby places could not be loaded.');
    }
  }

  async function installAutocomplete() {
    const original = document.querySelector('#destination-search');
    if (!original || !google.maps.importLibrary) return;
    const { PlaceAutocompleteElement } = await google.maps.importLibrary('places');
    const autocomplete = new PlaceAutocompleteElement();
    autocomplete.className = 'place-autocomplete';
    autocomplete.placeholder = 'Where would you like to go?';
    autocomplete.setAttribute('aria-label', 'Search a place or destination');
    autocomplete.addEventListener('input', () => {
      window.locateUSelectedPlace = null;
      updateRouteButton();
    });
    original.replaceWith(autocomplete);
    autocomplete.addEventListener('gmp-select', async (event) => {
      try {
        const place = event.placePrediction.toPlace();
        await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location', 'addressComponents'] });
        if (place.location) {
          const point = { lat: place.location.lat(), lng: place.location.lng() };
          setSelectedPoint({
            name: place.displayName || place.formattedAddress,
            address: place.formattedAddress,
            addressComponents: place.addressComponents || [],
          }, point);
        }
      } catch {
        setStatus('Could not load that place. Try a different search.');
      }
    });
  }

  window.initLocateUMap = async function initLocateUMap() {
    const target = document.querySelector('#map');
    if (!target) return;
    if (map) return;
    if (!window.google?.maps) {
      setStatus('Google Maps loaded without its API. Check the browser key and Maps JavaScript API configuration.');
      return;
    }
    try {
      const { Map, InfoWindow } = await google.maps.importLibrary('maps');
      const { AdvancedMarkerElement } = await google.maps.importLibrary('marker');
      void AdvancedMarkerElement; void InfoWindow;
      map = new Map(target, {
        center: defaultCenter, zoom: 2, mapId: 'DEMO_MAP_ID',
        mapTypeControl: true, fullscreenControl: true, streetViewControl: true,
        mapTypeControlOptions: {
          mapTypeIds: [google.maps.MapTypeId.ROADMAP, google.maps.MapTypeId.SATELLITE,
            google.maps.MapTypeId.TERRAIN, google.maps.MapTypeId.HYBRID],
        },
        zoomControl: true, gestureHandling: 'cooperative',
      });
      directionsRenderer = new google.maps.DirectionsRenderer({ map, suppressMarkers: false, preserveViewport: false });
      await installAutocomplete();
      map.addListener('click', (event) => {
        if (!event.latLng) return;
        const point = { lat: event.latLng.lat(), lng: event.latLng.lng() };
        setSelectedPoint({ name: 'Selected map point', address: 'Manually selected on map' }, point);
        window.locateUApi('/api/reverse-geocode', { method: 'POST', body: JSON.stringify(point) })
          .then((result) => {
            const selected = { ...window.locateUSelectedPlace, name: result.address, address: result.address };
            selected.addressComponents = result.address_components || [];
            selected.city = getLocationParts(selected).city;
            selected.state = getLocationParts(selected).state;
            selected.country = getLocationParts(selected).country;
            window.locateUSelectedPlace = selected;
            updateDestinationIntro(selected);
            showSelectedLocation(selected);
          })
          .catch(() => setStatus('Point selected. An address could not be resolved; coordinates remain available.'));
      });
      setStatus('Map ready · Google Places results depend on key restrictions and quota.');
    } catch (error) {
      setStatus(`Map could not be loaded: ${error.message}`);
    }
  };

  if (apiScript) {
    window.setTimeout(() => {
      if (!window.google?.maps && document.querySelector('#map-status')?.textContent === 'Connecting to Google Maps…') {
        setStatus('Google Maps did not initialize. Check the browser key, enabled APIs, billing, HTTP referrer restrictions, and browser network errors.');
      }
    }, 10000);
  }

  window.locateUMapFilter = (category) => {
    if (!map) return;
    const center = map.getCenter();
    if (center) showNearby({ lat: center.lat(), lng: center.lng() }, category);
  };

  window.locateUShowRoute = (origin, destination) => {
    if (!map || !directionsRenderer) {
      setStatus('Directions require the Google Maps browser key and a successfully loaded map.');
      return;
    }
    new google.maps.DirectionsService().route({ origin, destination, travelMode: google.maps.TravelMode.DRIVING }, (result, status) => {
      if (status === 'OK') {
        directionsRenderer.setDirections(result);
        const leg = result.routes[0]?.legs[0];
        if (leg?.distance?.text && leg?.duration?.text) setStatus(`Driving route: ${leg.distance.text} · about ${leg.duration.text}.`);
      }
      else setStatus('Route could not be calculated. Open directions in Google Maps instead.');
    });
  };
})();
