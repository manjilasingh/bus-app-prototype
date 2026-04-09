# CampusFlow Prototype

CampusFlow is a frontend-only campus bus prototype that simulates a PassioGo-style transit experience on top of a real Leaflet map.

The app includes:

- live simulated bus movement across multiple campus routes
- route planning from a selected origin to a destination building
- bus, route, and stop interactions on the map
- a stop browser and route details sheets
- saved routes and favorited lines
- notification setup for route/stop ETA windows
- dark mode and light mode support

## Tech Stack

- plain HTML, CSS, and JavaScript
- [Leaflet](https://leafletjs.com/) for the real map and overlays
- mocked campus data in `src/data.js`

## Running Locally

This project is static and does not require a build step.

1. Start a local web server from the repo root.
2. Open the served URL in a browser.

Examples:

```bash
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000).

You can also use any equivalent static server, including VS Code Live Server.

## Current App Behavior

### Map and Navigation

- The main screen renders a Leaflet map centered on the University of Alabama area.
- Route polylines, stop markers, bus markers, the user pin, and planner walk segments are drawn as overlays.
- Clicking a stop on the map opens a stop card with the stop name.
- Clicking `View Route` from the stop card opens the route detail sheet.

### Search and Route Planning

- The top search bar shows destination suggestions.
- Selecting or submitting a destination generates route options from the current origin.
- Planner results support both bus-based trips and a walk-only fallback.
- Multi-route journeys can open a dedicated journey details sheet.

### Route and Stop Views

- The Routes page lists all routes, route status, and timetable information where available.
- The Stops page shows a deduplicated stop directory across all routes.
- Route details highlight the bus's current position and stop-by-stop status.

### Notifications

- Users can create notifications for a route, stop, ETA window, and selected weekdays.
- Enabled notifications are checked against the simulated bus positions.
- Matching notifications appear as in-app toast messages.
- Toasts are non-blocking, can be manually dismissed, and currently auto-dismiss after 30 seconds.

### Filters, Saved Items, and Themes

- Route visibility can be filtered from the filter modal.
- Favorite routes and saved trip options are persisted in app state for the session.
- Theme preference is stored in `localStorage`.

## Project Structure

- [`index.html`](/Users/khushimodi/Developer/School/bus-app-prototype/bus-app-prototype/index.html): app shell and external asset includes
- [`src/app.js`](/Users/khushimodi/Developer/School/bus-app-prototype/bus-app-prototype/src/app.js): application state, rendering, interactions, simulation, routing, and notifications
- [`src/data.js`](/Users/khushimodi/Developer/School/bus-app-prototype/bus-app-prototype/src/data.js): mocked routes, shared stops, buildings, map calibration points, and timetables
- [`src/styles.css`](/Users/khushimodi/Developer/School/bus-app-prototype/bus-app-prototype/src/styles.css): all visual styling for map overlays, sheets, lists, and themes

## Limitations

- There is no backend or persistence layer beyond browser-local theme preference.
- Route planning, ETAs, and bus movement are simulated from mocked data.
- Notifications are frontend-only toast messages and are not backed by any browser push or backend delivery system.
