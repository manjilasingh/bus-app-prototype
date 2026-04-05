import { BUILDINGS, ROUTES, TIMETABLES, USER_LOCATION } from "./data.js";

const sheetHeights = ["0vh", "16vh", "42vh", "74vh"];
const initialOptionCatalog = Object.fromEntries(
  generateRouteOptions("Student Recreation Center").map((option) => [option.id, option])
);

const state = {
  screen: "map",
  sheetState: 2,
  routeVisibility: Object.fromEntries(ROUTES.map((route) => [route.id, true])),
  selectedRouteId: "r5",
  selectedRouteOptionId: null,
  activeSearch: "",
  draftSearch: "",
  routingResults: [],
  routeOptionCatalog: initialOptionCatalog,
  showFilters: false,
  filterSearch: "",
  showPlanner: false,
  favoriteRouteOptionIds: new Set(["route-opt-Student Recreation Center-mixed"]),
  favoriteRoutes: new Set(["r1", "r5"]),
  alerts: [
    {
      id: "a1",
      routeId: "r5",
      stopId: "r5s2",
      message: "Red Line arriving at Law School in 2 minutes"
    }
  ],
  alertForm: {
    routeId: "r1",
    stopId: "r1s1",
    timeRange: "5-15 min",
    days: ["Mon", "Wed", "Fri"]
  },
  busProgress: Object.fromEntries(ROUTES.map((route, index) => [route.id, (index * 0.17) % 1])),
  busPauseUntil: Object.fromEntries(ROUTES.map((route) => [route.id, 0])),
  openTimetable: null
};

const app = document.querySelector("#app");

function init() {
  attachGlobalStyles();
  bindSimulation();
  render();
}

function attachGlobalStyles() {
  document.documentElement.style.setProperty("--sheet-height", sheetHeights[state.sheetState]);
}

function bindSimulation() {
  setInterval(() => {
    const now = Date.now();

    ROUTES.forEach((route, index) => {
      if (state.busPauseUntil[route.id] > now) {
        return;
      }

      const step = 0.014 + index * 0.0012;
      let next = state.busProgress[route.id] + step;

      if (next >= 1) {
        next -= 1;
      }

      const wasNearStop = nearStop(route, state.busProgress[route.id]);
      const isNearStop = nearStop(route, next);

      state.busProgress[route.id] = next;

      if (!wasNearStop && isNearStop) {
        state.busPauseUntil[route.id] = now + 2200;
      }
    });

    updateMapOnly();
  }, 3600);
}

// Surgically updates only the moving bus markers and stop statuses on the map,
// leaving the rest of the DOM (inputs, scroll position, sheet) completely untouched.
function updateMapOnly() {
  const selectedRoute = getSelectedRoute();
  const highlightedRouteIds = state.selectedRouteOptionId
    ? getHighlightedRoutesFromOption(state.selectedRouteOptionId)
    : [selectedRoute.id];

  ROUTES.forEach((route) => {
    const bus = getBusPosition(route);
    const highlighted = highlightedRouteIds.includes(route.id);

    // Move the bus marker
    const busEl = document.querySelector(`.bus-marker[data-open-route="${route.id}"]`);
    if (busEl) {
      busEl.style.left = `${bus.x}%`;
      busEl.style.top = `${bus.y}%`;
      busEl.classList.toggle("pulse", highlighted);
    }

    // Update stop statuses if the route detail sheet is open for this route
    if (state.screen === "routeDetails" && state.selectedRouteId === route.id) {
      route.stops.forEach((stop, index) => {
        const stopEl = document.querySelector(`.stop-marker[data-open-route="${route.id}"][style*="left:${stop.x}%"]`);
        const status = getStopStatus(route, index);
        if (stopEl) {
          stopEl.classList.toggle("is-current", status.variant === "current");
        }
      });

      // Update the ETA pill and status copy in the sheet
      const busStopIndex = getCurrentStopIndex(route);
      const etaPill = document.querySelector(".eta-pill");
      if (etaPill) {
        etaPill.textContent = `${busStopIndex.nextEta} away`;
      }
      const statusCopy = document.querySelector(".status-copy");
      if (statusCopy) {
        statusCopy.textContent = `Bus is currently near ${busStopIndex.currentStop.name}`;
      }

      // Update each stop row's status label and highlight
      const stopRows = document.querySelectorAll(".stop-row");
      route.stops.forEach((stop, index) => {
        const row = stopRows[index];
        if (!row) return;
        const status = getStopStatus(route, index);
        row.classList.toggle("is-bus-location", status.variant === "current");
        const iconEl = row.querySelector(".stop-icon");
        if (iconEl) {
          iconEl.className = `stop-icon ${status.variant}`;
        }
        const statusEl = row.querySelector(".stop-status");
        if (statusEl) {
          statusEl.textContent = status.label;
        }
      });
    }
  });
}

function nearStop(route, progress) {
  const stops = route.stops.length;
  const segment = progress * (stops - 1);
  return Math.abs(segment - Math.round(segment)) < 0.08;
}

function seeded(seed) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash +=
      (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return () => {
    hash += 0x6d2b79f5;
    let value = Math.imul(hash ^ (hash >>> 15), 1 | hash);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function generateRouteOptions(destination) {
  const random = seeded(destination);
  const routePool = ["r1", "r3", "r5"];
  const pickRoute = (offset) => ROUTES.find((route) => route.id === routePool[offset]);
  const duration = () => 2 + Math.floor(random() * 14);
  const walkTime = duration();
  const busTime = duration();
  const mixedWalkTime = duration();
  const mixedBusTime = duration();

  return [
    {
      id: `route-opt-${destination}-bus`,
      destination,
      label: "Bus recommended",
      type: "bus",
      total: busTime + 3,
      eta: nextEta(busTime + 3),
      segments: [
        { type: "bus", label: pickRoute(0).shortName, duration: busTime + 3, routeId: pickRoute(0).id }
      ]
    },
    {
      id: `route-opt-${destination}-mixed`,
      destination,
      label: "Walk + Bus",
      type: "mixed",
      total: mixedWalkTime + mixedBusTime,
      eta: nextEta(mixedWalkTime + mixedBusTime),
      segments: [
        { type: "walk", label: "Walk to stop", duration: mixedWalkTime },
        { type: "bus", label: pickRoute(1).shortName, duration: mixedBusTime, routeId: pickRoute(1).id }
      ]
    },
    {
      id: `route-opt-${destination}-walk`,
      destination,
      label: "Walk only",
      type: "walk",
      total: walkTime + 6,
      eta: nextEta(walkTime + 6),
      segments: [{ type: "walk", label: "Campus walk", duration: walkTime + 6 }]
    }
  ].sort((left, right) => left.total - right.total);
}

function nextEta(totalMinutes) {
  const date = new Date();
  date.setMinutes(date.getMinutes() + totalMinutes);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function getRoutePath(route) {
  return route.stops.map((stop) => `${stop.x}% ${stop.y}%`).join(", ");
}

function getBusPosition(route) {
  const progress = state.busProgress[route.id];
  const scaled = progress * (route.stops.length - 1);
  const index = Math.floor(scaled);
  const nextIndex = (index + 1) % route.stops.length;
  const local = scaled - index;
  const start = route.stops[index];
  const end = route.stops[nextIndex];
  return {
    x: start.x + (end.x - start.x) * local,
    y: start.y + (end.y - start.y) * local
  };
}

function getSelectedRoute() {
  return ROUTES.find((route) => route.id === state.selectedRouteId) ?? ROUTES[0];
}

function render() {
  document.documentElement.style.setProperty("--sheet-height", sheetHeights[state.sheetState]);
  app.innerHTML = `
    <div class="shell">
      <div class="screen stage">
        ${renderMapLayer()}
        ${renderScreenOverlay()}
        ${renderNav()}
      </div>
    </div>
  `;

  bindEvents();
}

function renderMapLayer() {
  const selectedRoute = getSelectedRoute();
  const highlightedRouteIds = state.selectedRouteOptionId
    ? getHighlightedRoutesFromOption(state.selectedRouteOptionId)
    : [selectedRoute.id];
  const visibleRoutes =
    state.screen === "routeDetails"
      ? ROUTES.filter((route) => route.id === selectedRoute.id)
      : ROUTES.filter((route) => state.routeVisibility[route.id]);

  return `
    <section class="map-canvas ${state.screen === "map" ? "is-home" : ""}">
      <div class="map-grid"></div>
      <div class="campus-glow campus-glow-a"></div>
      <div class="campus-glow campus-glow-b"></div>
      <div class="campus-label label-a">Student Recreation Center</div>
      <div class="campus-label label-b">Bryant Denny Stadium</div>
      <div class="campus-label label-c">Main Library</div>
      ${visibleRoutes.map((route) => renderRouteLayer(route, highlightedRouteIds)).join("")}
      ${renderUserMarker()}
      ${state.screen === "routeDetails" ? "" : ""}
    </section>
  `;
}

function renderRouteLayer(route, highlightedRouteIds) {
  const highlighted = highlightedRouteIds.includes(route.id);
  const bus = getBusPosition(route);
  return `
    <div class="route-line ${highlighted ? "is-highlighted" : ""}" style="--route:${route.color}; --glow:${route.glow}; clip-path: polygon(${getRoutePath(route)});"></div>
    <svg class="route-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
      <polyline
        class="route-polyline ${highlighted ? "is-highlighted" : ""}"
        points="${route.stops.map((stop) => `${stop.x},${stop.y}`).join(" ")}"
        style="--route:${route.color}; --glow:${route.glow};"
      ></polyline>
    </svg>
    ${route.stops.map((stop, index) => renderStopMarker(route, stop, index)).join("")}
    <button class="bus-marker ${highlighted ? "pulse" : ""}" data-open-route="${route.id}" style="left:${bus.x}%; top:${bus.y}%; --route:${route.color};">
      <span>🚌</span>
    </button>
  `;
}

function renderStopMarker(route, stop, index) {
  const details = state.screen === "routeDetails" && state.selectedRouteId === route.id;
  const status = details ? getStopStatus(route, index) : "";
  const active = details && status.variant === "current";
  return `
    <button class="stop-marker ${active ? "is-current" : ""}" data-open-route="${route.id}" style="left:${stop.x}%; top:${stop.y}%; --route:${route.color};">
      <span></span>
    </button>
  `;
}

function renderUserMarker() {
  return `
    <div class="user-marker" style="left:${USER_LOCATION.x}%; top:${USER_LOCATION.y}%;">
      <div class="user-pulse"></div>
      <div class="user-dot"></div>
    </div>
  `;
}

function renderRouteHeroCard(route) {
  return `
    <div class="route-hero">
      <button class="ghost-button" data-back-map>←</button>
      <div>
        <div class="route-hero-title">${route.name}</div>
        <div class="route-hero-subtitle">${route.shortName} servicing campus loop</div>
      </div>
    </div>
  `;
}

function renderScreenOverlay() {
  if (state.screen === "saved") {
    return renderSavedPage();
  }

  if (state.screen === "alerts") {
    return renderAlertsPage();
  }

  if (state.screen === "routes") {
    return renderRoutesPage();
  }

  if (state.screen === "routeDetails") {
    return renderRouteDetailsSheet();
  }

  return renderHomeSheet();
}

function renderHomeSheet() {
  const results = state.routingResults;
  const searchValue = state.draftSearch || state.activeSearch;
  const suggestions = BUILDINGS.filter((building) =>
    building.toLowerCase().includes(searchValue.toLowerCase())
  ).slice(0, 4);

  return `
    <div class="top-bar">
      <label class="search-shell">
        <input id="top-search-input" value="${searchValue}" placeholder="Where are you going?" />
        <button class="search-submit" data-submit-top-search aria-label="Search destination">⌕</button>
      </label>
      <button class="filter-button" data-toggle-filters>☰</button>
    </div>
    ${renderFilterModal()}
    <section class="bottom-sheet ${state.sheetState === 0 ? "is-hidden" : ""}" data-sheet>
      <div class="sheet-handle" data-sheet-handle></div>
      <div class="sheet-content">
        <div class="sheet-header">
          <div>
            <div class="eyebrow">Campus shuttle</div>
            <h2>${results.length ? "Suggested Routes" : "Recent Routes"}</h2>
          </div>
          <button class="text-action" data-sheet-action>${results.length ? "Clear" : "See All"}</button>
        </div>
        ${state.showPlanner || results.length ? renderSearchInputs(suggestions) : ""}
        ${results.length ? renderRoutingResults(results) : renderRecentRoutes()}
        ${!results.length ? renderQuickActions() : ""}
      </div>
    </section>
  `;
}

function renderSearchInputs(suggestions) {
  return `
    <div class="routing-panel ${state.showPlanner ? "is-active" : ""}">
      <div class="search-stack">
        <div class="input-pill">
          <span class="input-label">From</span>
          <span>${USER_LOCATION.label}</span>
        </div>
        <div class="input-pill search-input">
          <span class="input-label">To</span>
          <input id="destination-input" value="${state.draftSearch || state.activeSearch}" placeholder="Search buildings" />
        </div>
      </div>
      ${suggestions.length && (state.draftSearch || state.activeSearch)
        ? `<div class="suggestion-list">${suggestions
            .map(
              (building) => `<button class="suggestion-item" data-destination="${building}">${building}</button>`
            )
            .join("")}</div>`
        : ""}
    </div>
  `;
}

function renderRecentRoutes() {
  const items = [ROUTES[4], ROUTES[1]];
  return `
    <div class="recent-list">
      ${items
        .map(
          (route) => `
            <button class="recent-card" data-open-route="${route.id}">
              <div class="route-chip" style="--route:${route.color};">${route.shortName}</div>
              <div class="recent-meta">
                <div class="recent-title">${route.name}</div>
                <div class="recent-subtitle">To ${route.stops.at(-1).name} • ${route.durationLabel}</div>
              </div>
              <span class="chevron">›</span>
            </button>
          `
        )
        .join("")}
    </div>
  `;
}

function renderQuickActions() {
  return `
    <div class="quick-actions">
      <button class="quick-card" data-open-routes>
        <span>🚌</span>
        <strong>Bus Routes</strong>
      </button>
      <button class="quick-card" data-show-stops>
        <span>📍</span>
        <strong>Stops</strong>
      </button>
    </div>
  `;
}

function renderRoutingResults(results) {
  return `
    <div class="route-option-list">
      ${results
        .map((option) => {
          const segments = option.segments
            .map((segment) =>
              segment.type === "walk"
                ? `<span class="seg">🚶 ${segment.duration} min</span>`
                : `<span class="seg">🚌 ${segment.label}</span>`
            )
            .join("<span class='seg-arrow'>›</span>");
          const favorited = state.favoriteRouteOptionIds.has(option.id);
          return `
            <div class="route-option ${state.selectedRouteOptionId === option.id ? "is-selected" : ""}" data-select-option="${option.id}">
              <div class="route-option-top">
                <div>
                  <div class="route-option-time">${option.total} min</div>
                  <div class="route-option-eta">Arrive at ${option.eta}</div>
                </div>
                <button class="favorite-toggle" data-favorite-option="${option.id}">${favorited ? "★" : "☆"}</button>
              </div>
              <div class="route-option-legs">${segments}</div>
              <div class="route-option-label">${option.label}</div>
            </div>
          `;
        })
        .join("")}
      <button class="select-route-button" data-apply-option>Select Route</button>
    </div>
  `;
}

function renderRouteDetailsSheet() {
  const route = getSelectedRoute();
  const busStopIndex = getCurrentStopIndex(route);

  return `
    <section class="bottom-sheet route-details-sheet details-open ${state.sheetState === 0 ? "is-hidden" : ""}" data-sheet>
      <div class="sheet-handle" data-sheet-handle></div>
      <div class="sheet-header sheet-header--sticky">
        <button class="ghost-button" data-back-map>←</button>
        <div>
          <div class="eyebrow">Route Stops</div>
          <h2>${route.name}</h2>
        </div>
        <div class="eta-pill">${busStopIndex.nextEta} away</div>
      </div>
      <div class="sheet-content">
        <p class="status-copy" style="margin-top:0;">Bus is currently near ${busStopIndex.currentStop.name}</p>
        <div class="stop-list">
          ${route.stops
            .map((stop, index) => {
              const status = getStopStatus(route, index);
              return `
                <div class="stop-row ${status.variant === "current" ? "is-bus-location" : ""}">
                  <div class="stop-icon ${status.variant}"></div>
                  <div class="stop-copy">
                    <div class="stop-name">${stop.name}</div>
                    <div class="stop-status">${status.label}</div>
                  </div>
                </div>
              `;
            })
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function renderRoutesPage() {
  return `
    <section class="panel-page routes-page">
      <div class="page-head green-head">
        <button class="ghost-button" data-back-map>←</button>
        <div>
          <div class="page-title">Bus Routes</div>
          <div class="page-subtitle">${ROUTES.length} routes available</div>
        </div>
      </div>
      <div class="routes-kicker">All bus routes in your area</div>
      <div class="route-list-page">
        ${ROUTES.map((route, index) => renderRouteListCard(route, index)).join("")}
      </div>
    </section>
  `;
}

function renderRouteListCard(route, index) {
  const active = index !== 3;
  const timetable = TIMETABLES[route.id]; // array of {stopName, times[]} or null
  const isOpen = state.openTimetable === route.id;

  return `
    <article class="list-card ${isOpen ? "is-timetable-open" : ""}" data-route-id="${route.id}">
      <button class="route-badge" data-open-route="${route.id}" style="--route:${route.color};">${route.shortName}</button>
      <div class="list-copy" data-open-route="${route.id}">
        <div class="list-title">${route.name}</div>
        <div class="list-window">${route.activeHours}</div>
        <div class="list-meta">⏱ ${route.durationLabel} • 📍 ${route.stops.length} stops</div>
      </div>
      <div class="status-stack">
        <span class="status-pill ${active ? "active" : "inactive"}">${active ? "Active" : "Inactive"}</span>
        <button class="calendar-button ${isOpen ? "is-active" : ""}" data-toggle-timetable="${route.id}" aria-label="View schedule" title="View schedule">🗓</button>
      </div>
      ${isOpen ? renderTimetablePanel(route, timetable) : ""}
    </article>
  `;
}

function renderTimetablePanel(route, timetable) {
  if (!timetable) {
    return `
      <div class="timetable-panel" style="--route:${route.color};">
        <div class="timetable-loop-notice">
          <span class="timetable-loop-icon">🔄</span>
          <div>
            <div class="timetable-loop-title">Continuous Loop</div>
            <div class="timetable-loop-body">The ${route.name} runs on a continuous loop with no fixed departure schedule. Buses arrive approximately every ${route.durationLabel}.</div>
          </div>
        </div>
      </div>
    `;
  }

  return `
    <div class="timetable-panel" style="--route:${route.color};">
      <div class="timetable-header">
        <span class="timetable-label">Schedule</span>
        <span class="timetable-note">Showing morning departures · times may vary</span>
      </div>
      <div class="timetable-stops">
        ${timetable.map((entry, i) => `
          <div class="timetable-stop-row">
            <div class="timetable-stop-name">
              <span class="timetable-stop-dot ${i === 0 ? "is-first" : i === timetable.length - 1 ? "is-last" : ""}"></span>
              ${entry.stopName}
            </div>
            <div class="timetable-times-scroll">
              <div class="timetable-times">
                ${entry.times.map((t) => `<span class="timetable-time">${t}</span>`).join("")}
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderSavedPage() {
  const options = Array.from(state.favoriteRouteOptionIds)
    .map((id) => state.routeOptionCatalog[id])
    .filter(Boolean);
  const routeCards = ROUTES.filter((route) => state.favoriteRoutes.has(route.id));

  return `
    <section class="panel-page saved-page">
      <div class="page-head">
        <div>
          <div class="page-title">Saved Routes</div>
          <div class="page-subtitle">Quick access to favorite trips and bus lines</div>
        </div>
      </div>
      <div class="panel-scroll saved-grid">
        ${routeCards
          .map(
            (route) => `
              <button class="saved-card" data-open-route="${route.id}">
                <div class="saved-chip" style="--route:${route.color};">${route.shortName}</div>
                <div class="saved-name">${route.name}</div>
                <div class="saved-meta">${route.durationLabel} • View on map</div>
              </button>
            `
          )
          .join("")}
        ${options.length
          ? options
              .map(
                (option) => `
                  <button class="saved-card soft" data-select-option="${option.id}">
                    <div class="saved-name">${option.label}</div>
                    <div class="saved-meta">${option.total} min • ${option.eta}</div>
                  </button>
                `
              )
              .join("")
          : `<div class="empty-state">Favorite a suggested route to pin it here.</div>`}
      </div>
    </section>
  `;
}

function renderAlertsPage() {
  const selectedRoute = ROUTES.find((route) => route.id === state.alertForm.routeId) ?? ROUTES[0];
  const stops = selectedRoute.stops;

  return `
    <section class="panel-page alerts-page">
      <div class="page-head">
        <div>
          <div class="page-title">Notifications</div>
          <div class="page-subtitle">Create simulated bus arrival alerts</div>
        </div>
      </div>
      <div class="panel-scroll">
        <div class="alert-form">
          <label>
            <span>Route</span>
            <select data-alert-route>
              ${ROUTES.map((route) => `<option value="${route.id}" ${route.id === selectedRoute.id ? "selected" : ""}>${route.name}</option>`).join("")}
            </select>
          </label>
          <label>
            <span>Stop</span>
            <select data-alert-stop>
              ${stops.map((stop) => `<option value="${stop.id}" ${stop.id === state.alertForm.stopId ? "selected" : ""}>${stop.name}</option>`).join("")}
            </select>
          </label>
          <label>
            <span>Time range</span>
            <select data-alert-time>
              ${["0-5 min", "5-15 min", "15-30 min"].map((value) => `<option value="${value}" ${value === state.alertForm.timeRange ? "selected" : ""}>${value}</option>`).join("")}
            </select>
          </label>
          <fieldset>
            <legend>Days</legend>
            <div class="day-row">
              ${["Mon", "Tue", "Wed", "Thu", "Fri"].map((day) => `<button class="day-pill ${state.alertForm.days.includes(day) ? "is-selected" : ""}" data-day="${day}">${day}</button>`).join("")}
            </div>
          </fieldset>
          <button class="select-route-button" data-create-alert>Create Alert</button>
        </div>
        <div class="alert-feed">
          ${state.alerts.map((alert) => `<div class="alert-card">${alert.message}</div>`).join("")}
        </div>
      </div>
    </section>
  `;
}

function renderFilterModal() {
  if (!state.showFilters) return "";

  const query = state.filterSearch.toLowerCase();
  const visibleCount = Object.values(state.routeVisibility).filter(Boolean).length;
  const filtered = ROUTES.filter(
    (route) =>
      route.name.toLowerCase().includes(query) ||
      route.shortName.toLowerCase().includes(query)
  );

  return `
    <div class="filter-backdrop" data-close-filters></div>
    <div class="filter-modal" role="dialog" aria-modal="true" aria-label="Filter routes">
      <div class="filter-modal-header">
        <span class="filter-modal-title">Filter Routes</span>
        <div class="filter-modal-actions">
          <button class="filter-action-link" data-filter-all>All</button>
          <button class="filter-action-link" data-filter-none>None</button>
          <button class="filter-modal-close" data-close-filters aria-label="Close">✕</button>
        </div>
      </div>
      <div class="filter-search-wrap">
        <input
          id="filter-search-input"
          class="filter-search-input"
          placeholder="Search routes…"
          value="${state.filterSearch}"
          autocomplete="off"
        />
      </div>
      <div class="filter-route-list">
        ${filtered.length ? filtered.map((route) => {
          const on = state.routeVisibility[route.id];
          return `
            <label class="filter-route-row" style="--route:${route.color};">
              <input type="checkbox" class="filter-checkbox" data-toggle-route="${route.id}" ${on ? "checked" : ""} />
              <span class="filter-route-badge">${route.shortName}</span>
              <span class="filter-route-name">${route.name}</span>
              <span class="filter-route-meta">${route.stops.length} stops · ${route.durationLabel}</span>
            </label>
          `;
        }).join("") : `<div class="filter-empty">No routes match "<em>${state.filterSearch}</em>"</div>`}
      </div>
      <div class="filter-modal-footer">
        <span class="filter-count">${visibleCount} of ${ROUTES.length} shown</span>
        <button class="filter-done-button" data-close-filters>Done</button>
      </div>
    </div>
  `;
}

function renderNav() {
  return `
    <nav class="nav-bar">
      <button class="nav-item ${state.screen === "map" || state.screen === "routes" || state.screen === "routeDetails" ? "active" : ""}" data-screen="map">Map</button>
      <button class="nav-item ${state.screen === "saved" ? "active" : ""}" data-screen="saved">Saved</button>
      <button class="nav-item ${state.screen === "alerts" ? "active" : ""}" data-screen="alerts">Alerts</button>
    </nav>
  `;
}

function bindEvents() {
  const topSearchInput = document.querySelector("#top-search-input");
  if (topSearchInput) {
    topSearchInput.addEventListener("input", (event) => {
      state.draftSearch = event.target.value;
      if (!state.draftSearch) {
        state.activeSearch = "";
        state.showPlanner = false;
        state.routingResults = [];
        state.selectedRouteOptionId = null;
        render();
      }
    });

    topSearchInput.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") {
        return;
      }

      event.preventDefault();
      submitDestination(topSearchInput.value);
    });
  }

  const input = document.querySelector("#destination-input");
  if (input) {
    input.addEventListener("input", (event) => {
      state.draftSearch = event.target.value;
      if (!state.draftSearch) {
        state.activeSearch = "";
        state.showPlanner = false;
        state.routingResults = [];
        state.selectedRouteOptionId = null;
        render();
      }
    });

    input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") {
        return;
      }

      event.preventDefault();
      submitDestination(input.value);
    });
  }

  document.querySelectorAll("[data-screen]").forEach((button) => {
    button.addEventListener("click", () => {
      const targetScreen = button.dataset.screen;

      if (targetScreen === "map") {
        if (state.screen === "map") {
          state.sheetState = state.sheetState === 0 ? 2 : 0;
        } else {
          state.screen = "map";
          if (state.sheetState === 0) {
            state.sheetState = 2;
          }
        }
      } else {
        state.screen = targetScreen;
      }
      render();
    });
  });

  document.querySelectorAll("[data-open-route]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedRouteId = button.dataset.openRoute;
      state.screen = "routeDetails";
      state.sheetState = 3;
      render();
    });
  });

  document.querySelectorAll("[data-destination]").forEach((button) => {
    button.addEventListener("click", () => {
      submitDestination(button.dataset.destination);
    });
  });

  document.querySelectorAll("[data-select-option]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedRouteOptionId = button.dataset.selectOption;
      const option = getRouteOption(button.dataset.selectOption);
      if (state.screen === "saved" && option) {
        state.activeSearch = option.destination;
        state.draftSearch = option.destination;
        state.showPlanner = true;
        state.routingResults = generateRouteOptions(option.destination);
        state.routingResults.forEach((item) => {
          state.routeOptionCatalog[item.id] = item;
        });
        state.screen = "map";
        state.sheetState = 3;
      }
      render();
    });
  });

  document.querySelector("[data-submit-top-search]")?.addEventListener("click", () => {
    submitDestination(topSearchInput?.value || state.draftSearch);
  });

  document.querySelectorAll("[data-favorite-option]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const id = button.dataset.favoriteOption;
      if (state.favoriteRouteOptionIds.has(id)) {
        state.favoriteRouteOptionIds.delete(id);
      } else {
        state.favoriteRouteOptionIds.add(id);
      }
      render();
    });
  });

  document.querySelectorAll("[data-toggle-route]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const routeId = checkbox.dataset.toggleRoute;
      state.routeVisibility[routeId] = checkbox.checked;
      // Update the visible count in the footer without full re-render
      const countEl = document.querySelector(".filter-count");
      if (countEl) {
        const visibleCount = Object.values(state.routeVisibility).filter(Boolean).length;
        countEl.textContent = `${visibleCount} of ${ROUTES.length} shown`;
      }
    });
  });

  document.querySelector("[data-toggle-filters]")?.addEventListener("click", () => {
    state.showFilters = !state.showFilters;
    state.filterSearch = "";
    render();
  });

  document.querySelectorAll("[data-close-filters]").forEach((el) => {
    el.addEventListener("click", () => {
      state.showFilters = false;
      state.filterSearch = "";
      render();
    });
  });

  document.querySelector("[data-filter-all]")?.addEventListener("click", () => {
    ROUTES.forEach((route) => { state.routeVisibility[route.id] = true; });
    render();
  });

  document.querySelector("[data-filter-none]")?.addEventListener("click", () => {
    ROUTES.forEach((route) => { state.routeVisibility[route.id] = false; });
    render();
  });

  const filterSearchInput = document.querySelector("#filter-search-input");
  if (filterSearchInput) {
    filterSearchInput.focus();
    filterSearchInput.addEventListener("input", (event) => {
      state.filterSearch = event.target.value;
      // Re-render just the route list rows without closing the modal
      const query = state.filterSearch.toLowerCase();
      const filtered = ROUTES.filter(
        (route) =>
          route.name.toLowerCase().includes(query) ||
          route.shortName.toLowerCase().includes(query)
      );
      const listEl = document.querySelector(".filter-route-list");
      if (listEl) {
        listEl.innerHTML = filtered.length
          ? filtered.map((route) => {
              const on = state.routeVisibility[route.id];
              return `
                <label class="filter-route-row" style="--route:${route.color};">
                  <input type="checkbox" class="filter-checkbox" data-toggle-route="${route.id}" ${on ? "checked" : ""} />
                  <span class="filter-route-badge">${route.shortName}</span>
                  <span class="filter-route-name">${route.name}</span>
                  <span class="filter-route-meta">${route.stops.length} stops · ${route.durationLabel}</span>
                </label>
              `;
            }).join("")
          : `<div class="filter-empty">No routes match "<em>${state.filterSearch}</em>"</div>`;
        // Re-bind checkboxes in the freshly injected rows
        listEl.querySelectorAll("[data-toggle-route]").forEach((checkbox) => {
          checkbox.addEventListener("change", () => {
            state.routeVisibility[checkbox.dataset.toggleRoute] = checkbox.checked;
            const countEl = document.querySelector(".filter-count");
            if (countEl) {
              const visibleCount = Object.values(state.routeVisibility).filter(Boolean).length;
              countEl.textContent = `${visibleCount} of ${ROUTES.length} shown`;
            }
          });
        });
      }
    });
  }

  document.querySelector("[data-sheet-action]")?.addEventListener("click", () => {
    if (state.routingResults.length) {
      state.activeSearch = "";
      state.draftSearch = "";
      state.showPlanner = false;
      state.routingResults = [];
      state.selectedRouteOptionId = null;
      state.sheetState = 2;
    } else {
      state.screen = "routes";
    }
    render();
  });

  document.querySelectorAll("[data-open-routes]").forEach((button) => {
    button.addEventListener("click", () => {
      state.screen = "routes";
      render();
    });
  });

  document.querySelector("[data-show-stops]")?.addEventListener("click", () => {
    state.selectedRouteId = "r1";
    state.screen = "routeDetails";
    state.sheetState = 3;
    render();
  });

  document.querySelector("[data-apply-option]")?.addEventListener("click", () => {
    const option = getRouteOption(state.selectedRouteOptionId);
    const routeId = option?.segments.find((segment) => segment.routeId)?.routeId ?? "r1";
    state.selectedRouteId = routeId;
    state.favoriteRoutes.add(routeId);
    state.screen = "routeDetails";
    state.sheetState = 3;
    render();
  });

  document.querySelector("[data-back-map]")?.addEventListener("click", () => {
    state.screen = "map";
    state.sheetState = 2;
    render();
  });

  document.querySelectorAll("[data-toggle-timetable]").forEach((button) => {
    button.addEventListener("click", () => {
      const routeId = button.dataset.toggleTimetable;
      const wasOpen = state.openTimetable === routeId;

      // Close any previously open timetable in the DOM without re-rendering
      if (state.openTimetable) {
        const prevCard = document.querySelector(`.list-card[data-route-id="${state.openTimetable}"]`);
        if (prevCard) {
          prevCard.classList.remove("is-timetable-open");
          prevCard.querySelector(".timetable-panel")?.remove();
          prevCard.querySelector(".calendar-button")?.classList.remove("is-active");
        }
      }

      state.openTimetable = wasOpen ? null : routeId;

      // Open the new timetable in the DOM without re-rendering
      if (state.openTimetable) {
        const card = document.querySelector(`.list-card[data-route-id="${routeId}"]`);
        const route = ROUTES.find((r) => r.id === routeId);
        if (card && route) {
          card.classList.add("is-timetable-open");
          card.querySelector(".calendar-button")?.classList.add("is-active");
          const panel = document.createElement("div");
          panel.innerHTML = renderTimetablePanel(route, TIMETABLES[routeId]);
          card.appendChild(panel.firstElementChild);
        }
      }
    });
  });

  document.querySelector("[data-alert-route]")?.addEventListener("change", (event) => {
    state.alertForm.routeId = event.target.value;
    state.alertForm.stopId = ROUTES.find((route) => route.id === event.target.value).stops[0].id;
    render();
  });

  document.querySelector("[data-alert-stop]")?.addEventListener("change", (event) => {
    state.alertForm.stopId = event.target.value;
  });

  document.querySelector("[data-alert-time]")?.addEventListener("change", (event) => {
    state.alertForm.timeRange = event.target.value;
  });

  document.querySelectorAll("[data-day]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      const day = button.dataset.day;
      if (state.alertForm.days.includes(day)) {
        state.alertForm.days = state.alertForm.days.filter((item) => item !== day);
      } else {
        state.alertForm.days = [...state.alertForm.days, day];
      }
      render();
    });
  });

  document.querySelector("[data-create-alert]")?.addEventListener("click", () => {
    const route = ROUTES.find((item) => item.id === state.alertForm.routeId);
    const stop = route.stops.find((item) => item.id === state.alertForm.stopId);
    state.alerts.unshift({
      id: `${route.id}-${stop.id}-${Date.now()}`,
      routeId: route.id,
      stopId: stop.id,
      message: `${route.name} arriving at ${stop.name} in ${state.alertForm.timeRange.split("-")[0]} minutes`
    });
    render();
  });

  bindSheetDrag();
}

function bindSheetDrag() {
  const handle = document.querySelector("[data-sheet-handle]");
  const sheet = document.querySelector("[data-sheet]");
  if (!handle || !sheet) {
    return;
  }

  let startY = 0;
  let startState = state.sheetState;
  let dragging = false;

  const onPointerMove = (event) => {
    if (!dragging) {
      return;
    }

    const delta = startY - event.clientY;
    const stepDelta = Math.round(delta / 90);
    state.sheetState = Math.max(0, Math.min(3, startState + stepDelta));
    document.documentElement.style.setProperty("--sheet-height", sheetHeights[state.sheetState]);
  };

  const onPointerUp = () => {
    dragging = false;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerUp);
    render();
  };

  const onPointerDown = (event) => {
    if (event.button !== 0) {
      return;
    }

    const interactive = event.target.closest(
      "input, button, select, option, a, [data-select-option], [data-favorite-option]"
    );
    if (interactive && !event.target.closest("[data-sheet-handle]")) {
      return;
    }

    const rect = sheet.getBoundingClientRect();
    const dragFromTopZone = event.clientY - rect.top <= 120;
    if (!dragFromTopZone && !event.target.closest("[data-sheet-handle]")) {
      return;
    }

    dragging = true;
    startY = event.clientY;
    startState = state.sheetState;
    event.currentTarget?.setPointerCapture?.(event.pointerId);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  };

  handle.onpointerdown = onPointerDown;
  sheet.addEventListener("pointerdown", onPointerDown);
}

function getHighlightedRoutesFromOption(optionId) {
  const option = getRouteOption(optionId);
  const routeIds = option?.segments.map((segment) => segment.routeId).filter(Boolean) ?? [];
  return routeIds.length ? routeIds : [getSelectedRoute().id];
}

function getRouteOption(optionId) {
  return state.routeOptionCatalog[optionId] ?? state.routingResults.find((item) => item.id === optionId);
}

function submitDestination(value) {
  const destination = value.trim();
  if (!destination) {
    return;
  }

  state.activeSearch = destination;
  state.draftSearch = destination;
  state.showPlanner = true;
  state.routingResults = generateRouteOptions(destination);
  state.routingResults.forEach((option) => {
    state.routeOptionCatalog[option.id] = option;
  });
  state.selectedRouteOptionId = state.routingResults[0]?.id ?? null;
  state.sheetState = 3;
  render();
}

function getCurrentStopIndex(route) {
  const progress = state.busProgress[route.id] * (route.stops.length - 1);
  const currentIndex = Math.min(route.stops.length - 1, Math.round(progress));
  return {
    currentIndex,
    currentStop: route.stops[currentIndex],
    nextEta: `${Math.max(2, 6 - currentIndex)} min`
  };
}

function getStopStatus(route, stopIndex) {
  const { currentIndex } = getCurrentStopIndex(route);
  if (stopIndex < currentIndex) {
    return { label: "Departed 2 min ago", variant: "departed" };
  }
  if (stopIndex === currentIndex) {
    return { label: "Bus location", variant: "current" };
  }
  if (stopIndex === currentIndex + 1) {
    return { label: "Approaching now", variant: "approaching" };
  }
  return { label: `ETA ${2 + (stopIndex - currentIndex) * 2} min`, variant: "upcoming" };
}

init();