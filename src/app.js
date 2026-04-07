import { BUILDINGS, BUILDING_LOCATIONS, ROUTES, TIMETABLES, USER_LOCATION,
         TIME_WALK_TO_STOP, TIME_BUS_PER_STOP, TIME_WALK_DIRECT } from "./data.js";

const sheetHeights = ["0vh", "16vh", "42vh", "74vh"];
const WALK_RADIUS  = 22; // map-unit radius within which a stop is "walkable"
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
  stopsSearch: "",
  showPlanner: false,
  plannerOriginValue: USER_LOCATION.label,
  plannerOriginQuery: "",
  plannerOriginEditorOpen: false,
  favoriteRouteOptionIds: new Set(["route-opt-Student Recreation Center-mixed"]),
  favoriteRoutes: new Set(["r1", "r5"]),
  alerts: [
    {
      id: "a1",
      routeId: "r5",
      stopId: "r5s2",
      timeRange: "0-5 min",
      days: ["Mon", "Wed", "Fri"],
      enabled: true,
      message: "Red Line arriving at Commons in 0 minutes"
    }
  ],
  alertsView: "list",
  alertForm: {
    routeId: "r1",
    stopId: "r1s1",
    timeRange: "5-15 min",
    days: ["Mon", "Wed", "Fri"]
  },
  busProgress: Object.fromEntries(ROUTES.map((route, index) => [route.id, (index * 0.17) % 1])),
  busPauseUntil: Object.fromEntries(ROUTES.map((route) => [route.id, 0])),
  openTimetable: null,
  routeDetailsBackScreen: "map"
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
  const journey = state.selectedRouteOptionId
    ? buildJourneyGeometry(getRouteOption(state.selectedRouteOptionId))
    : null;
  const highlightedRouteIds = journey
    ? journey.steps.filter(s => s.type === "bus-segment").map(s => s.route.id)
    : [selectedRoute.id];

  ROUTES.forEach((route) => {
    const bus = getBusPosition(route);
    const highlighted = highlightedRouteIds.includes(route.id);
    const dimmed = journey && !highlighted;

    // Move the bus marker (hidden when dimmed)
    const busEl = document.querySelector(`.bus-marker[data-open-route="${route.id}"]`);
    if (busEl) {
      busEl.style.left = `${bus.x}%`;
      busEl.style.top = `${bus.y}%`;
      busEl.classList.toggle("pulse", highlighted);
    }

    // Dim/undim the route SVG
    const routeSvg = document.querySelector(`.route-svg[data-route-id="${route.id}"]`);
    if (routeSvg) {
      routeSvg.classList.toggle("is-dimmed", !!dimmed);
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
      if (etaPill) etaPill.textContent = `${busStopIndex.nextEta} away`;
      const statusCopy = document.querySelector(".status-copy");
      if (statusCopy) statusCopy.textContent = `Bus is currently near ${busStopIndex.currentStop.name}`;

      // Update each stop row's status label and highlight
      const stopRows = document.querySelectorAll(".stop-row");
      route.stops.forEach((stop, index) => {
        const row = stopRows[index];
        if (!row) return;
        const status = getStopStatus(route, index);
        row.classList.toggle("is-bus-location", status.variant === "current");
        const iconEl = row.querySelector(".stop-icon");
        if (iconEl) iconEl.className = `stop-icon ${status.variant}`;
        const statusEl = row.querySelector(".stop-status");
        if (statusEl) statusEl.textContent = status.label;
      });
    }
  });
}

function nearStop(route, progress) {
  const segCount = route.loop ? route.stops.length : route.stops.length - 1;
  const segment  = progress * segCount;
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

// ── Path planner ─────────────────────────────────────────────
//
// Uses Dijkstra over a graph of stop-nodes and location-nodes.
//
// Node IDs:
//   "loc:<name>"   – a named building or USER_LOCATION
//   "stop:<stopId>:<routeId>" – a stop as visited on a specific route
//     (same physical stop on different routes = different nodes,
//      connected by free transfer edges)
//
// Edges:
//   loc  → stop-node        TIME_WALK_TO_STOP   (if stop within WALK_RADIUS)
//   stop-node → loc         TIME_WALK_TO_STOP   (walk to destination)
//   stop-node → next stop   TIME_BUS_PER_STOP   (along route, both directions for loops)
//   stop-node → same-stop other route  0        (free transfer at shared stop)
//
// Routes are treated as loops: after the last stop, wraps to the first.
// Both clockwise and counter-clockwise directions are explored.

function getLocationPoint(name) {
  if (!name || name === USER_LOCATION.label) return { x: USER_LOCATION.x, y: USER_LOCATION.y };
  if (BUILDING_LOCATIONS[name]) return BUILDING_LOCATIONS[name];
  const random = seeded(name);
  return { x: 15 + Math.floor(random() * 70), y: 15 + Math.floor(random() * 70) };
}

function stopNodeId(stopId, routeId) { return `stop:${stopId}:${routeId}`; }

// Build the full graph and run Dijkstra from originName to destName.
// Returns { cost, segments } where segments is an array ready for a route option,
// or null if no route found.
function dijkstraPlanner(originName, destName) {
  const originPt = getLocationPoint(originName);
  const destPt   = getLocationPoint(destName);
  const originId = `loc:${originName}`;
  const destId   = `loc:${destName}`;

  const dist = {};   // nodeId → best cost
  const prev = {};   // nodeId → { from, edgeType, routeId, stopId }
  // Min-heap via sorted array — graph is small enough
  const queue = [];

  function enqueue(nodeId, cost, fromId, edgeType, routeId, stopId) {
    if (dist[nodeId] !== undefined && dist[nodeId] <= cost) return;
    dist[nodeId] = cost;
    prev[nodeId] = { from: fromId, edgeType, routeId, stopId };
    queue.push({ nodeId, cost });
    queue.sort((a, b) => a.cost - b.cost);
  }

  enqueue(originId, 0, null, null, null, null);

  while (queue.length) {
    const { nodeId, cost } = queue.shift();
    if (dist[nodeId] < cost) continue; // stale entry

    if (nodeId === destId) break;

    if (nodeId.startsWith('loc:')) {
      // Walk to any nearby stop on any route
      for (const route of ROUTES) {
        for (const stop of route.stops) {
          if (dist2d(originPt, stop) <= WALK_RADIUS || dist2d(getLocationPoint(nodeId.slice(4)), stop) <= WALK_RADIUS) {
            // Use the actual location point for this loc node
            const locPt = nodeId === originId ? originPt : destPt;
            if (dist2d(locPt, stop) <= WALK_RADIUS) {
              enqueue(stopNodeId(stop.id, route.id), cost + TIME_WALK_TO_STOP,
                      nodeId, 'walk-to-stop', route.id, stop.id);
            }
          }
        }
      }
      // Direct walk to destination
      if (nodeId !== destId) {
        enqueue(destId, cost + TIME_WALK_DIRECT, nodeId, 'walk-direct', null, null);
      }
    } else {
      // It's a stop-node: "stop:<stopId>:<routeId>"
      const parts   = nodeId.split(':');
      const stopId  = parts[1];
      const routeId = parts[2];
      const route   = ROUTES.find(r => r.id === routeId);
      if (!route) continue;
      const idx     = route.stops.findIndex(s => s.id === stopId);
      const n       = route.stops.length;
      const isLoop  = route.loop;

      // Bus edges — forward and backward (both directions on a loop)
      const directions = isLoop ? [1, -1] : [1];
      for (const dir of directions) {
        const nextIdx = (idx + dir + n) % n;
        if (!isLoop && nextIdx < 0) continue;
        if (!isLoop && nextIdx >= n) continue;
        const nextStop = route.stops[nextIdx];
        enqueue(stopNodeId(nextStop.id, route.id), cost + TIME_BUS_PER_STOP,
                nodeId, 'bus', route.id, nextStop.id);
      }

      // Free transfer: same physical stop on other routes
      for (const otherRoute of ROUTES) {
        if (otherRoute.id === routeId) continue;
        const sameStop = otherRoute.stops.find(s => s.id === stopId);
        if (sameStop) {
          enqueue(stopNodeId(stopId, otherRoute.id), cost + 0,
                  nodeId, 'transfer', otherRoute.id, stopId);
        }
      }

      // Walk from this stop to the destination loc
      const stop = route.stops[idx];
      if (dist2d(stop, destPt) <= WALK_RADIUS) {
        enqueue(destId, cost + TIME_WALK_TO_STOP, nodeId, 'walk-from-stop', null, null);
      }
      // Also allow walking to destination even if not within radius (always valid, just costs more)
      // But we already have the direct walk-direct from origin; don't add walk-anywhere from stops
      // to keep routes sensible.
    }
  }

  if (dist[destId] === undefined) return null;

  // Reconstruct raw path
  const rawPath = [];
  let cur = destId;
  while (cur !== null) {
    const p = prev[cur] ?? {};
    rawPath.unshift({ nodeId: cur, edgeType: p.edgeType ?? null, routeId: p.routeId ?? null, stopId: p.stopId ?? null });
    cur = p.from ?? null;
  }

  // Condense into segments
  // Each node in rawPath has edgeType = how we ARRIVED at this node.
  // Node 0 is origin (edgeType null). Last node is destination.
  const segments = [];
  let i = 1; // skip origin node

  while (i < rawPath.length) {
    const node = rawPath[i];

    if (node.edgeType === 'walk-direct' || node.edgeType === 'walk-from-stop') {
      segments.push({ type: 'walk', label: 'Walk to destination', duration: TIME_WALK_TO_STOP });
      i++;
      continue;
    }

    if (node.edgeType === 'walk-to-stop') {
      segments.push({ type: 'walk', label: 'Walk to stop', duration: TIME_WALK_TO_STOP });
      i++;
      continue;
    }

    if (node.edgeType === 'bus' || node.edgeType === 'transfer') {
      // Collect all consecutive bus/transfer edges on the same route
      const routeId    = node.routeId;
      const route      = ROUTES.find(r => r.id === routeId);
      // Board stop is from the previous node
      const prevNode   = rawPath[i - 1];
      const boardStopId = prevNode.stopId ?? node.stopId;

      // If we arrived here via transfer, the board stop on THIS route is node.stopId
      const effectiveBoardStopId = node.edgeType === 'transfer' ? node.stopId : boardStopId;

      // Advance while same route bus edges (skip transfers as they don't add stops)
      let alightStopId = node.stopId;
      let j = i + 1;
      while (j < rawPath.length) {
        const next = rawPath[j];
        if (next.edgeType === 'bus' && next.routeId === routeId) {
          alightStopId = next.stopId;
          j++;
        } else {
          break;
        }
      }

      const boardIdx  = route.stops.findIndex(s => s.id === effectiveBoardStopId);
      const alightIdx = route.stops.findIndex(s => s.id === alightStopId);
      const n         = route.stops.length;
      // Compute stop count in the direction actually travelled
      let numStops;
      if (boardIdx === alightIdx) {
        numStops = 0;
      } else {
        // Forward distance
        const fwd = (alightIdx - boardIdx + n) % n;
        const bwd = (boardIdx - alightIdx + n) % n;
        numStops = Math.min(fwd, bwd);
      }

      segments.push({
        type: 'bus',
        label: route.shortName,
        routeId,
        boardStopId: effectiveBoardStopId,
        alightStopId,
        duration: numStops * TIME_BUS_PER_STOP
      });

      i = j;

      // Check if next is a transfer — if so consume it and continue with new route
      if (j < rawPath.length && rawPath[j].edgeType === 'transfer') {
        // Transfer node: free, just switch route — will be picked up as bus on next iteration
        i = j;
      }
      continue;
    }

    i++;
  }

  return { cost: dist[destId], segments };
}

function generateRouteOptions(destination, origin = USER_LOCATION.label) {
  const originName = origin || USER_LOCATION.label;

  // Walk-only fallback — always 20 min
  const walkOption = {
    id: `route-opt-${destination}-walk`,
    destination,
    label: 'Walk only',
    type: 'walk',
    total: TIME_WALK_DIRECT,
    eta: nextEta(TIME_WALK_DIRECT),
    segments: [{ type: 'walk', label: 'Campus walk', duration: TIME_WALK_DIRECT }]
  };

  const result = dijkstraPlanner(originName, destination);

  if (!result || !result.segments.some(s => s.type === 'bus')) {
    return [walkOption];
  }

  const total = Math.round(result.cost);
  const busOption = {
    id: `route-opt-${destination}-bus`,
    destination,
    label: result.segments.filter(s => s.type === 'bus').length > 1 ? 'Bus + Transfer' : 'Bus recommended',
    type: 'bus',
    total,
    eta: nextEta(total),
    segments: result.segments
  };

  return [busOption, walkOption].sort((a, b) => a.total - b.total);
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
  // For loops, the bus travels through all stops and back to first;
  // for linear routes, it travels stop[0] to stop[n-1] only.
  const segCount = route.loop ? route.stops.length : route.stops.length - 1;
  const scaled   = progress * segCount;
  const index    = Math.floor(scaled) % route.stops.length;
  const nextIndex = (index + 1) % route.stops.length;
  const local    = scaled - Math.floor(scaled);
  const start    = route.stops[index];
  const end      = route.stops[nextIndex];
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

// ── Journey geometry helpers ──────────────────────────────────

function dist2d(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}



// Returns an ordered list of draw steps for the selected option:
//   { type: "walk",        points: [{x,y}, …] }
//   { type: "bus-segment", route, stops: [{x,y}, …], color, glow }
//
// For loop routes, computes the shortest directional path between
// board and alight stops (may wrap around the end of the stops array).
function buildJourneyGeometry(option) {
  if (!option) return null;

  const originName = state.plannerOriginValue;
  const originPt   = getLocationPoint(originName);
  const destName   = option.destination;
  const destPt     = getLocationPoint(destName);
  const steps      = [];
  let   cursor     = { ...originPt };

  for (const seg of option.segments) {
    if (seg.type === 'walk') {
      // Find the next bus segment (if any) to know where this walk ends
      const segIdx  = option.segments.indexOf(seg);
      const nextBus = option.segments.slice(segIdx + 1).find(s => s.type === 'bus');
      if (nextBus) {
        const route     = ROUTES.find(r => r.id === nextBus.routeId);
        const boardStop = route && route.stops.find(s => s.id === nextBus.boardStopId);
        if (boardStop) {
          steps.push({ type: 'walk', points: [{ ...cursor }, { ...boardStop }] });
          cursor = { ...boardStop };
        }
      } else {
        steps.push({ type: 'walk', points: [{ ...cursor }, { ...destPt }] });
        cursor = { ...destPt };
      }
    } else if (seg.type === 'bus') {
      const route = ROUTES.find(r => r.id === seg.routeId);
      if (!route) continue;

      const boardStop  = route.stops.find(s => s.id === seg.boardStopId);
      const alightStop = route.stops.find(s => s.id === seg.alightStopId);
      if (!boardStop || !alightStop) continue;

      // Walk to board stop if not already there
      if (dist2d(cursor, boardStop) > 0.5) {
        steps.push({ type: 'walk', points: [{ ...cursor }, { ...boardStop }] });
      }
      cursor = { ...boardStop };

      // Determine ridden stops — for loops, pick the shorter direction
      const boardIdx  = route.stops.indexOf(boardStop);
      const alightIdx = route.stops.indexOf(alightStop);
      const n         = route.stops.length;
      let ridden;

      if (!route.loop || boardIdx === alightIdx) {
        // Linear route or same stop (shouldn't happen but guard anyway)
        const lo = Math.min(boardIdx, alightIdx);
        const hi = Math.max(boardIdx, alightIdx);
        ridden = route.stops.slice(lo, hi + 1);
      } else {
        // Forward (clockwise) distance
        const fwdSteps = (alightIdx - boardIdx + n) % n;
        const bwdSteps = (boardIdx - alightIdx + n) % n;
        if (fwdSteps <= bwdSteps) {
          // Go forward
          ridden = [];
          for (let k = 0; k <= fwdSteps; k++) {
            ridden.push(route.stops[(boardIdx + k) % n]);
          }
        } else {
          // Go backward
          ridden = [];
          for (let k = 0; k <= bwdSteps; k++) {
            ridden.push(route.stops[(boardIdx - k + n) % n]);
          }
        }
      }

      steps.push({ type: 'bus-segment', route, stops: ridden, color: route.color, glow: route.glow });
      cursor = { ...alightStop };
    }
  }

  // Final walk to destination if not already there
  if (dist2d(cursor, destPt) > 0.5) {
    steps.push({ type: 'walk', points: [{ ...cursor }, { ...destPt }] });
  }

  return { steps, destPt };
}

function renderMapLayer() {
  const selectedRoute = getSelectedRoute();
  const journey = state.selectedRouteOptionId
    ? buildJourneyGeometry(getRouteOption(state.selectedRouteOptionId))
    : null;

  // Which routes to show + which are highlighted
  let visibleRoutes, highlightedRouteIds;

  if (state.screen === "routeDetails") {
    visibleRoutes      = ROUTES.filter(r => r.id === selectedRoute.id);
    highlightedRouteIds = [selectedRoute.id];
  } else if (state.screen === "journeyDetails") {
    // Show all routes but highlight every route in the active journey
    const journeyRouteIds = journey
      ? journey.steps.filter(s => s.type === "bus-segment").map(s => s.route.id)
      : [selectedRoute.id];
    visibleRoutes       = ROUTES.filter(r => state.routeVisibility[r.id]);
    highlightedRouteIds = journeyRouteIds;
  } else if (journey) {
    // Only show routes that appear in the journey as bus segments; dim everything else
    const journeyRouteIds = journey.steps
      .filter(s => s.type === "bus-segment")
      .map(s => s.route.id);
    visibleRoutes       = ROUTES.filter(r => state.routeVisibility[r.id]);
    highlightedRouteIds = journeyRouteIds;
  } else {
    visibleRoutes       = ROUTES.filter(r => state.routeVisibility[r.id]);
    highlightedRouteIds = [selectedRoute.id];
  }

  return `
    <section class="map-canvas ${state.screen === "map" ? "is-home" : ""}">
      <div class="map-grid"></div>
      <div class="campus-glow campus-glow-a"></div>
      <div class="campus-glow campus-glow-b"></div>
      <!--<div class="campus-label label-a">Student Recreation Center</div>
      <div class="campus-label label-b">Bryant Denny Stadium</div>
      <div class="campus-label label-c">Main Library</div>-->
      ${visibleRoutes.map(route => renderRouteLayer(route, highlightedRouteIds, journey)).join("")}
      ${journey ? renderJourneyOverlay(journey) : ""}
      ${renderUserMarker()}
    </section>
  `;
}

function renderRouteLayer(route, highlightedRouteIds, journey) {
  const highlighted = highlightedRouteIds.includes(route.id);
  const dimmed      = journey && !highlighted;
  const bus         = getBusPosition(route);

  // When a journey is active, only draw the ridden portion of this route
  const journeyStep = journey?.steps.find(s => s.type === "bus-segment" && s.route.id === route.id);
  const riddenPoints = journeyStep
    ? journeyStep.stops.map(s => `${s.x},${s.y}`).join(" ")
    : null;

  return `
    <svg class="route-svg ${dimmed ? "is-dimmed" : ""}" viewBox="0 0 100 100" preserveAspectRatio="none" data-route-id="${route.id}">
      <polyline
        class="route-polyline ${highlighted && !riddenPoints ? "is-highlighted" : ""} ${riddenPoints ? "is-ridden-base" : ""}"
        points="${route.stops.map(s => `${s.x},${s.y}`).join(" ")}${route.loop ? ` ${route.stops[0].x},${route.stops[0].y}` : ''}"
        style="--route:${route.color}; --glow:${route.glow};"
      ></polyline>
      ${riddenPoints ? `
        <polyline
          class="route-polyline route-polyline--ridden"
          points="${riddenPoints}"
          style="--route:${route.color}; --glow:${route.glow};"
        ></polyline>` : ""}
    </svg>
    ${route.stops.map((stop, index) => renderStopMarker(route, stop, index, dimmed, journeyStep)).join("")}
    ${!dimmed ? `
      <button class="bus-marker ${highlighted ? "pulse" : ""}" data-open-route="${route.id}" style="left:${bus.x}%; top:${bus.y}%; --route:${route.color};">
        <span>🚌</span>
      </button>` : ""}
  `;
}

function renderStopMarker(route, stop, index, dimmed, journeyStep) {
  if (dimmed) return "";
  const details = state.screen === "routeDetails" && state.selectedRouteId === route.id;
  const status  = details ? getStopStatus(route, index) : "";
  const active  = details && status.variant === "current";
  const isRiddenStop = journeyStep?.stops.some(s => s.id === stop.id);
  return `
    <button class="stop-marker ${active ? "is-current" : ""} ${isRiddenStop ? "is-journey-stop" : ""}"
      data-open-route="${route.id}"
      style="left:${stop.x}%; top:${stop.y}%; --route:${route.color};">
      <span></span>
    </button>
  `;
}

function renderUserMarker() {
  const originName = state.plannerOriginValue;
  const isCustomOrigin = originName && originName !== USER_LOCATION.label;
  const originPt = isCustomOrigin
    ? getLocationPoint(originName)
    : { x: USER_LOCATION.x, y: USER_LOCATION.y };

  return `
    <div class="user-marker" style="left:${USER_LOCATION.x}%; top:${USER_LOCATION.y}%;">
      <div class="user-pulse"></div>
      <div class="user-dot"></div>
    </div>
    ${isCustomOrigin && state.selectedRouteOptionId ? `
      <div class="origin-pin" style="left:${originPt.x}%; top:${originPt.y}%;">
        <div class="origin-pin-dot"></div>
        <div class="origin-pin-label">${originName}</div>
      </div>` : ""}
  `;
}

function renderJourneyOverlay(journey) {
  const walkLines = journey.steps
    .filter(s => s.type === "walk")
    .map(s => `
      <polyline
        class="walk-leg"
        points="${s.points.map(p => `${p.x},${p.y}`).join(" ")}"
      />
    `).join("");

  const { destPt } = journey;

  return `
    <svg class="journey-overlay-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
      ${walkLines}
    </svg>
    <div class="dest-pin" style="left:${destPt.x}%; top:${destPt.y}%;">
      <div class="dest-pin-dot"></div>
      <div class="dest-pin-label">${getRouteOption(state.selectedRouteOptionId)?.destination ?? "Destination"}</div>
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

  if (state.screen === "stops") {
    return renderStopsPage();
  }

  if (state.screen === "routeDetails") {
    return renderRouteDetailsSheet();
  }

  if (state.screen === "journeyDetails") {
    return renderJourneyDetailsSheet();
  }

  return renderHomeSheet();
}

function renderHomeSheet() {
  const results = state.routingResults;
  const searchValue = state.draftSearch || state.activeSearch;
  const suggestions = getBuildingSuggestions(searchValue);

  return `
    <div class="top-search-stack">
      <div class="top-bar">
        <label class="search-shell">
          <input id="top-search-input" value="${searchValue}" placeholder="Where are you going?" />
          <button class="search-submit" data-submit-top-search aria-label="Search destination">⌕</button>
        </label>
        <button class="filter-button" data-toggle-filters>☰</button>
      </div>
      <div class="top-search-suggestions ${(state.showPlanner || !state.draftSearch || !suggestions.length) ? "is-hidden" : ""}" data-top-suggestions>
        ${renderTopSearchSuggestionItems(suggestions)}
      </div>
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

function getBuildingSuggestions(query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return [];
  }

  return BUILDINGS.filter((building) =>
    building.toLowerCase().startsWith(normalized)
  ).slice(0, 4);
}

function getOriginSuggestions(query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return [];
  }

  const suggestions = [USER_LOCATION.label];

  BUILDINGS.filter((building) => {
    if (!normalized) {
      return true;
    }

    return building.toLowerCase().startsWith(normalized);
  }).forEach((building) => {
    if (!suggestions.includes(building)) {
      suggestions.push(building);
    }
  });

  return suggestions.slice(0, 4);
}

function renderTopSearchSuggestionItems(suggestions) {
  return suggestions
    .map(
      (building) => `<button class="top-suggestion-item" data-top-suggestion="${building}">${building}</button>`
    )
    .join("");
}

function updateTopSearchSuggestions(query) {
  const listEl = document.querySelector("[data-top-suggestions]");
  if (!listEl) {
    return;
  }

  const suggestions = getBuildingSuggestions(query);
  const shouldShow = Boolean(query.trim()) && !state.showPlanner && suggestions.length > 0;

  if (!shouldShow) {
    listEl.classList.add("is-hidden");
    listEl.innerHTML = "";
    return;
  }

  listEl.classList.remove("is-hidden");
  listEl.innerHTML = renderTopSearchSuggestionItems(suggestions);
  bindTopSearchSuggestionEvents();
}

function bindTopSearchSuggestionEvents() {
  document.querySelectorAll("[data-top-suggestion]").forEach((button) => {
    button.addEventListener("click", () => {
      submitDestination(button.dataset.topSuggestion);
    });
  });
}

function focusInputById(inputId) {
  window.requestAnimationFrame(() => {
    const input = document.querySelector(`#${inputId}`);
    if (!input) {
      return;
    }

    input.focus();
    const cursor = input.value.length;
    input.setSelectionRange(cursor, cursor);
  });
}

function renderSearchInputs(suggestions) {
  const originValue = state.plannerOriginValue;
  const destinationValue = state.draftSearch || state.activeSearch;
  const originQuery = state.plannerOriginQuery;
  const originSuggestions = getOriginSuggestions(originQuery);

  return `
    <div class="routing-panel ${state.showPlanner ? "is-active" : ""}">
      <div class="search-stack">
        <div class="origin-stack">
          <span class="input-label">From</span>
          ${state.plannerOriginEditorOpen
            ? `<div class="origin-editor-wrap">
                <input
                  id="origin-input"
                  class="origin-editor-input"
                  value="${originQuery}"
                  placeholder="Type a start location"
                  autocomplete="off"
                />
                <div class="suggestion-list ${(originQuery.trim() && originSuggestions.length) ? "" : "is-hidden"}" data-origin-suggestions>
                  ${originSuggestions
                    .map(
                      (building) => `<button class="suggestion-item" data-origin-suggestion="${building}">${building}</button>`
                    )
                    .join("")}
                </div>
              </div>`
            : `<div class="origin-picker">
                <button class="origin-pill" data-toggle-origin-picker type="button">
                  <span class="origin-pill-value">${originValue || "Current Location"}</span>
                  <span class="origin-pill-hint">Change</span>
                </button>
              </div>`}
        </div>
        <div class="input-pill search-input">
          <span class="input-label">To</span>
          <input id="destination-input" value="${destinationValue}" placeholder="Search buildings" />
        </div>
      </div>
      <button class="select-route-button" data-search-routes>Update Routes</button>
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

// Renders a multi-leg journey detail sheet showing each bus leg in sequence,
// with its stops, current bus position, and ETAs.
function renderJourneyDetailsSheet() {
  const option = getRouteOption(state.selectedRouteOptionId);
  if (!option) return renderHomeSheet();

  const busSegs = option.segments.filter(s => s.type === "bus");

  const legsHtml = busSegs.map((seg, legIdx) => {
    const route = ROUTES.find(r => r.id === seg.routeId);
    if (!route) return "";

    const boardStop  = route.stops.find(s => s.id === seg.boardStopId);
    const alightStop = route.stops.find(s => s.id === seg.alightStopId);
    const boardIdx   = route.stops.indexOf(boardStop);
    const alightIdx  = route.stops.indexOf(alightStop);

    // Collect the ridden stops in order (shortest arc on a loop)
    const n = route.stops.length;
    let riddenStops;
    if (!route.loop || boardIdx === alightIdx) {
      const lo = Math.min(boardIdx, alightIdx);
      const hi = Math.max(boardIdx, alightIdx);
      riddenStops = route.stops.slice(lo, hi + 1);
    } else {
      const fwdSteps = (alightIdx - boardIdx + n) % n;
      const bwdSteps = (boardIdx - alightIdx + n) % n;
      riddenStops = [];
      if (fwdSteps <= bwdSteps) {
        for (let k = 0; k <= fwdSteps; k++) riddenStops.push(route.stops[(boardIdx + k) % n]);
      } else {
        for (let k = 0; k <= bwdSteps; k++) riddenStops.push(route.stops[(boardIdx - k + n) % n]);
      }
    }

    const busStopIndex = getCurrentStopIndex(route);

    return `
      <div class="journey-leg" style="--route:${route.color};">
        <div class="journey-leg-header">
          <div class="route-chip" style="--route:${route.color};">${route.shortName}</div>
          <div class="journey-leg-title">${route.name}</div>
          <div class="journey-leg-eta">${busStopIndex.nextEta} away</div>
        </div>
        <p class="status-copy" style="margin:6px 0 10px;">Bus near ${busStopIndex.currentStop.name}</p>
        <div class="stop-list">
          ${riddenStops.map((stop) => {
            const stopIdx = route.stops.indexOf(stop);
            const status  = getStopStatus(route, stopIdx);
            const isBoard  = stop.id === seg.boardStopId;
            const isAlight = stop.id === seg.alightStopId;
            return `
              <div class="stop-row ${status.variant === "current" ? "is-bus-location" : ""}">
                <div class="stop-icon ${status.variant}"></div>
                <div class="stop-copy">
                  <div class="stop-name">
                    ${stop.name}
                    ${isBoard  ? '<span class="stop-tag board-tag">Board</span>'  : ''}
                    ${isAlight ? '<span class="stop-tag alight-tag">Alight</span>' : ''}
                  </div>
                  <div class="stop-status">${status.label}</div>
                </div>
              </div>
            `;
          }).join("")}
        </div>
        ${legIdx < busSegs.length - 1 ? '<div class="journey-transfer-divider">🔄 Transfer to next route</div>' : ''}
      </div>
    `;
  }).join("");

  return `
    <section class="bottom-sheet route-details-sheet details-open ${state.sheetState === 0 ? "is-hidden" : ""}" data-sheet>
      <div class="sheet-handle" data-sheet-handle></div>
      <div class="sheet-header sheet-header--sticky">
        <button class="ghost-button" data-back-map>←</button>
        <div>
          <div class="eyebrow">Journey · ${busSegs.length} routes</div>
          <h2>to ${option.destination}</h2>
        </div>
        <div class="eta-pill">${option.total} min</div>
      </div>
      <div class="sheet-content">
        ${legsHtml}
      </div>
    </section>
  `;
}


// Builds a deduplicated, alphabetically-sorted list of every stop across all
// routes. Each stop shows a colour-coded chip for every route it belongs to —
// shared stops therefore display multiple chips side-by-side.
function buildAllStopsIndex() {
  // Map from stopId → { stop, routes[] }
  const index = new Map();
  for (const route of ROUTES) {
    for (const stop of route.stops) {
      if (!index.has(stop.id)) {
        index.set(stop.id, { stop, routes: [] });
      }
      // Avoid duplicating the same route for this stop (shouldn't happen, but guard)
      const entry = index.get(stop.id);
      if (!entry.routes.find(r => r.id === route.id)) {
        entry.routes.push(route);
      }
    }
  }
  // Sort alphabetically by stop name
  return Array.from(index.values()).sort((a, b) =>
    a.stop.name.localeCompare(b.stop.name)
  );
}

function renderStopsPage() {
  const allStops = buildAllStopsIndex();
  const query    = state.stopsSearch.trim().toLowerCase();
  const filtered = query
    ? allStops.filter(({ stop, routes }) =>
        stop.name.toLowerCase().includes(query) ||
        routes.some(r => r.name.toLowerCase().includes(query) || r.shortName.toLowerCase().includes(query))
      )
    : allStops;

  return `
    <section class="panel-page stops-page">
      <div class="page-head stops-head">
        <button class="ghost-button" data-back-map>←</button>
        <div class="stops-head-text">
          <div class="page-title">All Stops</div>
          <div class="page-subtitle">${allStops.length} stops · ${ROUTES.length} routes</div>
        </div>
      </div>
      <div class="stops-search-wrap">
        <input
          id="stops-search-input"
          class="stops-search-input"
          placeholder="Search stops or routes…"
          value="${state.stopsSearch}"
          autocomplete="off"
        />
        ${state.stopsSearch ? `<button class="stops-search-clear" data-clear-stops-search>✕</button>` : ""}
      </div>
      <div class="stops-list-scroll" data-stops-list>
        ${renderStopsListContent(filtered, query)}
      </div>
    </section>
  `;
}

function renderStopsListContent(entries, query = "") {
  if (!entries.length) {
    return `<div class="stops-empty">No stops match "<em>${query}</em>"</div>`;
  }

  // When searching, show a flat list with no section headers (order is already alpha)
  if (query) {
    return entries.map(({ stop, routes }) => renderStopRow(stop, routes)).join("");
  }

  // Browsing mode: group by first letter with sticky section headers
  const sections = [];
  let currentLetter = null;
  for (const entry of entries) {
    const letter = entry.stop.name[0].toUpperCase();
    if (letter !== currentLetter) {
      currentLetter = letter;
      sections.push({ letter, entries: [] });
    }
    sections[sections.length - 1].entries.push(entry);
  }

  return sections.map(section => `
    <div class="stops-section-letter">${section.letter}</div>
    ${section.entries.map(({ stop, routes }) => renderStopRow(stop, routes)).join("")}
  `).join("");
}

function renderStopRow(stop, routes) {
  const isShared  = routes.length > 1;
  const chipsHtml = routes.map(r =>
    `<span class="stop-route-chip" style="--route:${r.color}; --glow:${r.glow};">${r.shortName}</span>`
  ).join("");
  const dotStyle  = isShared ? buildSharedStopGradient(routes) : `background:${routes[0].color};`;
  return `
    <button class="stops-list-row" data-open-route="${routes[0].id}">
      <div class="stops-list-dot" style="${dotStyle}"></div>
      <div class="stops-list-copy">
        <div class="stops-list-name">${stop.name}</div>
        <div class="stops-list-chips">${chipsHtml}</div>
      </div>
      <span class="chevron">›</span>
    </button>
  `;
}

// Returns an inline style string for a conic-gradient dot
// that shows all route colours in equal segments.
function buildSharedStopGradient(routes) {
  const n    = routes.length;
  const step = 360 / n;
  const stops = routes.map((r, i) =>
    `${r.color} ${i * step}deg ${(i + 1) * step}deg`
  ).join(', ');
  return `background: conic-gradient(${stops});`;
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
  if (state.alertsView === "create") {
    return renderAlertCreatePage();
  }

  return renderAlertsListPage();
}

function renderAlertsListPage() {
  return `
    <section class="panel-page alerts-page">
      <div class="page-head">
        <div>
          <div class="page-title">Notifications</div>
          <div class="page-subtitle">View, pause, or remove saved bus alerts</div>
        </div>
        <button class="select-route-button compact-button" data-open-alert-create>Add</button>
      </div>
      <div class="panel-scroll">
        <div class="alert-feed">
          ${state.alerts.length
            ? state.alerts.map((alert) => renderAlertCard(alert)).join("")
            : `<div class="empty-state">No notifications yet. Add one to start tracking arrivals.</div>`}
        </div>
      </div>
    </section>
  `;
}

function renderAlertCreatePage() {
  const selectedRoute = ROUTES.find((route) => route.id === state.alertForm.routeId) ?? ROUTES[0];
  const stops = selectedRoute.stops;

  return `
    <section class="panel-page alerts-page">
      <div class="page-head">
        <button class="ghost-button" data-close-alert-create>←</button>
        <div>
          <div class="page-title">Add Notification</div>
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
      </div>
    </section>
  `;
}

function renderAlertCard(alert) {
  const route = ROUTES.find((item) => item.id === alert.routeId);
  const stop = route?.stops.find((item) => item.id === alert.stopId);
  const daysLabel = alert.days?.length ? alert.days.join(", ") : "No days selected";

  return `
    <article class="alert-card ${alert.enabled ? "" : "is-disabled"}">
      <div class="alert-card-top">
        <div>
          <div class="alert-card-title">${route?.name ?? "Route alert"}</div>
          <div class="alert-card-message">${alert.message}</div>
        </div>
        <span class="alert-status ${alert.enabled ? "is-enabled" : "is-disabled"}">
          ${alert.enabled ? "On" : "Off"}
        </span>
      </div>
      <div class="alert-card-meta">
        <span>${stop?.name ?? "Unknown stop"}</span>
        <span>${alert.timeRange}</span>
        <span>${daysLabel}</span>
      </div>
      <div class="alert-card-actions">
        <button class="ghost-action-button" data-toggle-alert="${alert.id}">
          ${alert.enabled ? "Turn Off" : "Turn On"}
        </button>
        <button class="ghost-action-button danger-button" data-delete-alert="${alert.id}">
          Delete
        </button>
      </div>
    </article>
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
        const shouldRender = state.showPlanner || state.routingResults.length > 0;
        state.activeSearch = "";
        state.showPlanner = false;
        state.routingResults = [];
        state.selectedRouteOptionId = null;

        if (shouldRender) {
          render();
          focusInputById("top-search-input");
        } else {
          updateTopSearchSuggestions("");
        }
        return;
      }

      updateTopSearchSuggestions(state.draftSearch);
    });

    topSearchInput.addEventListener("focus", () => {
      updateTopSearchSuggestions(topSearchInput.value);
    });

    topSearchInput.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") {
        return;
      }

      event.preventDefault();
      submitDestination(topSearchInput.value);
    });
  }

  bindTopSearchSuggestionEvents();

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

  const originInput = document.querySelector("#origin-input");
  if (originInput) {
    originInput.addEventListener("input", (event) => {
      state.plannerOriginQuery = event.target.value;
      state.plannerOriginEditorOpen = true;
      updateOriginSuggestions(state.plannerOriginQuery);
    });

    originInput.addEventListener("focus", () => {
      state.plannerOriginEditorOpen = true;
      updateOriginSuggestions(state.plannerOriginQuery);
    });

    originInput.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        state.plannerOriginEditorOpen = false;
        state.plannerOriginQuery = "";
        render();
        return;
      }

      if (event.key !== "Enter") {
        return;
      }

      event.preventDefault();
      submitRouteSearch();
    });
  }

  bindOriginSuggestionEvents();

  document.querySelector("[data-toggle-origin-picker]")?.addEventListener("click", () => {
    state.plannerOriginEditorOpen = true;
    state.plannerOriginQuery = state.plannerOriginValue === USER_LOCATION.label ? "" : state.plannerOriginValue;
    render();
    focusInputById("origin-input");
  });

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
        if (targetScreen === "alerts") {
          state.alertsView = "list";
        }
      }
      render();
    });
  });

  document.querySelectorAll("[data-open-route]").forEach((button) => {
    button.addEventListener("click", () => {
      openRouteDetails(button.dataset.openRoute, state.screen);
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
        state.routingResults = generateRouteOptions(option.destination, state.plannerOriginValue || USER_LOCATION.label);
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

  document.querySelector("[data-search-routes]")?.addEventListener("click", () => {
    submitRouteSearch();
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
    state.screen = "stops";
    render();
  });

  document.querySelector("[data-apply-option]")?.addEventListener("click", () => {
    const option = getRouteOption(state.selectedRouteOptionId);
    if (!option) return;
    const busSegs = option.segments.filter(s => s.type === "bus");
    // Favourite all bus routes in this journey
    busSegs.forEach(s => state.favoriteRoutes.add(s.routeId));
    if (busSegs.length > 1) {
      // Multi-leg journey: open the journey detail view
      state.screen = "journeyDetails";
      state.sheetState = 3;
    } else {
      // Single-leg: open the single route detail sheet as before
      const routeId = busSegs[0]?.routeId ?? "r1";
      openRouteDetails(routeId, "map");
    }
    render();
  });

  document.querySelector("[data-back-map]")?.addEventListener("click", () => {
    if (state.screen === "stops") {
      state.stopsSearch = "";
    }
    if (state.screen === "routeDetails") {
      state.screen = state.routeDetailsBackScreen;
      if (state.screen === "map") {
        state.sheetState = 2;
      }
    } else {
      state.screen = "map";
      state.sheetState = 2;
    }
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
      timeRange: state.alertForm.timeRange,
      days: [...state.alertForm.days],
      enabled: true,
      message: `${route.name} arriving at ${stop.name} in ${state.alertForm.timeRange.split("-")[0]} minutes`
    });
    state.alertsView = "list";
    render();
  });

  document.querySelector("[data-open-alert-create]")?.addEventListener("click", () => {
    state.alertsView = "create";
    render();
  });

  document.querySelector("[data-close-alert-create]")?.addEventListener("click", () => {
    state.alertsView = "list";
    render();
  });

  document.querySelectorAll("[data-toggle-alert]").forEach((button) => {
    button.addEventListener("click", () => {
      state.alerts = state.alerts.map((alert) =>
        alert.id === button.dataset.toggleAlert
          ? { ...alert, enabled: !alert.enabled }
          : alert
      );
      render();
    });
  });

  document.querySelectorAll("[data-delete-alert]").forEach((button) => {
    button.addEventListener("click", () => {
      state.alerts = state.alerts.filter((alert) => alert.id !== button.dataset.deleteAlert);
      render();
    });
  });

  // Stops page search
  const stopsSearchInput = document.querySelector("#stops-search-input");
  if (stopsSearchInput) {
    stopsSearchInput.focus();
    stopsSearchInput.addEventListener("input", (event) => {
      state.stopsSearch = event.target.value;
      const query    = state.stopsSearch.trim().toLowerCase();
      const allStops = buildAllStopsIndex();
      const filtered = query
        ? allStops.filter(({ stop, routes }) =>
            stop.name.toLowerCase().includes(query) ||
            routes.some(r => r.name.toLowerCase().includes(query) || r.shortName.toLowerCase().includes(query))
          )
        : allStops;
      // Surgically update the list without re-rendering the whole page
      const listEl = document.querySelector("[data-stops-list]");
      if (listEl) {
        listEl.innerHTML = renderStopsListContent(filtered, query);
        // Re-bind open-route events on the new rows
        listEl.querySelectorAll("[data-open-route]").forEach(btn => {
          btn.addEventListener("click", () => {
            openRouteDetails(btn.dataset.openRoute, "stops");
            render();
          });
        });
      }
      // Show/hide clear button without re-render
      const existingClear = document.querySelector("[data-clear-stops-search]");
      const wrap = document.querySelector(".stops-search-wrap");
      if (query && !existingClear && wrap) {
        const clearBtn = document.createElement("button");
        clearBtn.className = "stops-search-clear";
        clearBtn.dataset.clearStopsSearch = "";
        clearBtn.textContent = "✕";
        clearBtn.addEventListener("click", () => {
          state.stopsSearch = "";
          render();
        });
        wrap.appendChild(clearBtn);
      } else if (!query && existingClear) {
        existingClear.remove();
      }
    });
  }

  document.querySelector("[data-clear-stops-search]")?.addEventListener("click", () => {
    state.stopsSearch = "";
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

function openRouteDetails(routeId, originScreen = state.screen) {
  state.selectedRouteId = routeId;
  state.routeDetailsBackScreen = originScreen === "routeDetails" ? "map" : originScreen;
  state.screen = "routeDetails";
  state.sheetState = 3;
}

function submitDestination(value) {
  const destination = value.trim();
  if (!destination) {
    return;
  }

  state.activeSearch = destination;
  state.draftSearch = destination;
  state.showPlanner = true;
  state.routingResults = generateRouteOptions(destination, state.plannerOriginValue || USER_LOCATION.label);
  state.routingResults.forEach((option) => {
    state.routeOptionCatalog[option.id] = option;
  });
  state.selectedRouteOptionId = state.routingResults[0]?.id ?? null;
  state.sheetState = 3;
  render();
}

function submitRouteSearch() {
  const destination = (state.draftSearch || state.activeSearch).trim();
  if (!destination) {
    return;
  }

  const origin = (state.plannerOriginValue || USER_LOCATION.label).trim() || USER_LOCATION.label;
  state.plannerOriginValue = origin;
  state.activeSearch = destination;
  state.draftSearch = destination;
  state.showPlanner = true;
  state.routingResults = generateRouteOptions(destination, origin);
  state.routingResults.forEach((option) => {
    state.routeOptionCatalog[option.id] = option;
  });
  state.selectedRouteOptionId = state.routingResults[0]?.id ?? null;
  state.sheetState = 3;
  render();
}

function updateOriginSuggestions(query) {
  const listEl = document.querySelector("[data-origin-suggestions]");
  if (!listEl) {
    return;
  }

  const suggestions = getOriginSuggestions(query);
  listEl.classList.toggle("is-hidden", !suggestions.length);
  listEl.innerHTML = suggestions
    .map(
      (building) => `<button class="suggestion-item" data-origin-suggestion="${building}">${building}</button>`
    )
    .join("");
  bindOriginSuggestionEvents();
}

function bindOriginSuggestionEvents() {
  document.querySelectorAll("[data-origin-suggestion]").forEach((button) => {
    button.addEventListener("click", () => {
      state.plannerOriginValue = button.dataset.originSuggestion;
      state.plannerOriginQuery = "";
      state.plannerOriginEditorOpen = false;
      render();
    });
  });
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
