// ── Shared stops ──────────────────────────────────────────────
// Real lat/lng embedded directly so toLatLng() uses them without
// going through the affine projection (which can't reconcile the
// schematic x,y layout with real UA campus geography).

const STOP_CENTRAL_HUB = { id: "central-hub", name: "Central Hub",  x: 48, y: 42, lat: 33.2099, lng: -87.5430 };
const STOP_MAIN_PLAZA  = { id: "the-quad",    name: "The Quad",     x: 50, y: 62, lat: 33.2065, lng: -87.5410 };
const STOP_SOUTH_HUB   = { id: "south-hub",   name: "South Hub",    x: 17, y: 80, lat: 33.2040, lng: -87.5475 };
const STOP_NORTH_HUB   = { id: "north-hub",   name: "North Hub",    x: 71, y:  9, lat: 33.2185, lng: -87.5395 };

export const ROUTES = [
  // ── Green Loop (G1) ─────────────────────────────────────────
  {
    id: "r1", shortName: "G1", name: "Green Loop",
    color: "#35d07f", glow: "rgba(53,208,127,0.35)",
    activeHours: "7:00 AM - 11:00 PM", durationLabel: "14-18 min", loop: true,
    stops: [
      { id: "r1s1", name: "Cyber Hall",               x: 18, y: 20, lat: 33.2196, lng: -87.5362 },
      { id: "r1s2", name: "West Commuter Parking",    x: 10, y: 38, lat: 33.2127, lng: -87.5516 },
      { id: "r1s3", name: "Shelby Quad",              x: 18, y: 54, lat: 33.2090, lng: -87.5455 },
      STOP_MAIN_PLAZA,
      STOP_CENTRAL_HUB,
      { id: "r1s6", name: "Math and Science Building",x: 34, y: 28, lat: 33.2123, lng: -87.5423 },
    ]
  },

  // ── Blue Loop (B2) ───────────────────────────────────────────
  {
    id: "r2", shortName: "B2", name: "Blue Loop",
    color: "#3ba7ff", glow: "rgba(59,167,255,0.35)",
    activeHours: "7:30 AM - 10:30 PM", durationLabel: "16-20 min", loop: true,
    stops: [
      STOP_NORTH_HUB,
      { id: "r2s2", name: "Welcome Center",           x: 58, y: 22, lat: 33.2160, lng: -87.5383 },
      { id: "r2s3", name: "Bruno Library",            x: 64, y: 38, lat: 33.2111, lng: -87.5493 },
      STOP_CENTRAL_HUB,
      { id: "r2s5", name: "Rec Center",               x: 58, y: 54, lat: 33.2120, lng: -87.5322 },
      { id: "r2s6", name: "Woods Quad",               x: 78, y: 46, lat: 33.2133, lng: -87.5458 },
      { id: "r2s7", name: "Natural History Museum",   x: 82, y: 30, lat: 33.2119, lng: -87.5439 },
    ]
  },

  // ── Red Line (R9) ────────────────────────────────────────────
  {
    id: "r5", shortName: "R9", name: "Red Line",
    color: "#ff5f6d", glow: "rgba(255,95,109,0.35)",
    activeHours: "6:30 AM - 12:00 AM", durationLabel: "18-24 min", loop: true,
    stops: [
      STOP_SOUTH_HUB,
      { id: "r5s2", name: "President's Mansion",      x: 32, y: 70, lat: 33.2088, lng: -87.5465 },
      STOP_MAIN_PLAZA,
      { id: "r5s4", name: "East Village",             x: 84, y: 64, lat: 33.2070, lng: -87.5345 },
      { id: "r5s5", name: "Gorgas Library",           x: 62, y: 72, lat: 33.2118, lng: -87.5460 },
      { id: "r5s6", name: "Law School",               x: 76, y: 78, lat: 33.2039, lng: -87.5354 },
    ]
  },

  // ── Sunset Express (S7) ──────────────────────────────────────
  {
    id: "r3", shortName: "S7", name: "Sunset Express",
    color: "#ff8a3d", glow: "rgba(255,138,61,0.35)",
    activeHours: "8:00 AM - 9:30 PM", durationLabel: "10-14 min", loop: true,
    stops: [
      { id: "r3s1", name: "Honors Hall",              x: 30, y: 16, lat: 33.2102, lng: -87.5440 },
      { id: "r3s2", name: "Russell Hall",             x: 46, y: 10, lat: 33.2096, lng: -87.5424 },
      STOP_NORTH_HUB,
      { id: "r3s4", name: "Rec Fields",               x: 90, y: 22, lat: 33.2155, lng: -87.5280 },
      { id: "r3s5", name: "Tutwiler",                 x: 92, y: 40, lat: 33.2044, lng: -87.5498 },
      { id: "r3s6", name: "Parking Deck",             x: 50, y: 30, lat: 33.2155, lng: -87.5475 },
    ]
  },

  // ── Purple Connector (P4) ────────────────────────────────────
  {
    id: "r4", shortName: "P4", name: "Purple Connector",
    color: "#b86dff", glow: "rgba(184,109,255,0.35)",
    activeHours: "7:00 AM - 8:00 PM", durationLabel: "16-22 min", loop: true,
    stops: [
      { id: "r4s1", name: "Faculty Lot",                     x:  7, y: 55, lat: 33.2120, lng: -87.5570 },
      { id: "r4s2", name: "West Commuter Parking",           x:  9, y: 65, lat: 33.2085, lng: -87.5565 },
      STOP_SOUTH_HUB,
      { id: "r4s4", name: "Publix",                          x: 45, y: 92, lat: 33.2121, lng: -87.5535 },
      { id: "r4s5", name: "Moody Music Hall",                x: 90, y: 85, lat: 33.2074, lng: -87.5382 },
      { id: "r4s6", name: "South Lawn",                      x: 92, y: 65, lat: 33.2041, lng: -87.5327 },
      STOP_CENTRAL_HUB,
      { id: "r4s8", name: "Saban Catholic Student Center",   x: 22, y: 42, lat: 33.2075, lng: -87.5418 },
    ]
  }
];

export const BUILDINGS = [
  "Student Recreation Center",
  "Bryant Denny Stadium",
  "North Lawn",
  "Shelby Quad",
  "The Quad",
  "Science and Engineering Complex",
  "Gorgas Library",
  "Business School",
  "Student Health Center",
  "Hewson Hall",
  "Student Recreation Center - Pool",
  "Moody Music Hall"
];

export const USER_LOCATION = { x: 21, y: 15, label: "Current Location", lat: 33.2196, lng: -87.5362 };

export const BUILDING_LOCATIONS = {
  "Student Recreation Center":        { x: 58, y: 54, lat: 33.2120, lng: -87.5322 },
  "Bryant Denny Stadium":             { x: 46, y: 26, lat: 33.2082, lng: -87.5507 },
  "North Lawn":                       { x: 34, y: 28, lat: 33.2123, lng: -87.5423 },
  "Shelby Quad":                      { x: 28, y: 68, lat: 33.2090, lng: -87.5455 },
  "The Quad":                         { x: 18, y: 54, lat: 33.2065, lng: -87.5410 },
  "Science and Engineering Complex":  { x: 62, y: 72, lat: 33.2118, lng: -87.5460 },
  "Gorgas Library":                   { x: 58, y: 22, lat: 33.2118, lng: -87.5460 },
  "Business School":                  { x: 64, y: 38, lat: 33.2111, lng: -87.5493 },
  "Student Health Center":            { x: 72, y: 18, lat: 33.2134, lng: -87.5409 },
  "Hewson Hall":                      { x: 18, y: 20, lat: 33.2196, lng: -87.5362 },
  "Student Recreation Center - Pool": { x: 80, y: 88, lat: 33.2120, lng: -87.5322 },
  "Moody Music Hall":                 { x: 78, y: 46, lat: 33.2074, lng: -87.5382 }
};

// ── Real map calibration data ────────────────────────────────
// Used as a fallback affine projection for points without direct lat/lng.
// Source: verified real-world coordinates for each named building.
export const REAL_MAP_CENTER = [33.2100, -87.5430];
export const REAL_MAP_ZOOM = 15;

export const MAP_CALIBRATION_POINTS = [
  { x: 18, y: 20, lat: 33.2196, lng: -87.5362 }, // Cyber Hall
  { x: 10, y: 38, lat: 33.2127, lng: -87.5516 }, // West Commuter Parking
  { x: 18, y: 54, lat: 33.2090, lng: -87.5455 }, // Shelby Quad
  { x: 50, y: 62, lat: 33.2065, lng: -87.5410 }, // The Quad
  { x: 48, y: 42, lat: 33.2099, lng: -87.5430 }, // Central Hub
  { x: 34, y: 28, lat: 33.2123, lng: -87.5423 }, // Math & Science Building
  { x: 71, y:  9, lat: 33.2185, lng: -87.5395 }, // North Hub
  { x: 58, y: 22, lat: 33.2160, lng: -87.5383 }, // Welcome Center
  { x: 64, y: 38, lat: 33.2111, lng: -87.5493 }, // Bruno Library
  { x: 58, y: 54, lat: 33.2120, lng: -87.5322 }, // Rec Center
  { x: 78, y: 46, lat: 33.2133, lng: -87.5458 }, // Woods Quad
  { x: 82, y: 30, lat: 33.2119, lng: -87.5439 }, // Natural History Museum
  { x: 17, y: 80, lat: 33.2040, lng: -87.5475 }, // South Hub
  { x: 32, y: 70, lat: 33.2088, lng: -87.5465 }, // President's Mansion
  { x: 84, y: 64, lat: 33.2070, lng: -87.5345 }, // East Village
  { x: 62, y: 72, lat: 33.2118, lng: -87.5460 }, // Gorgas Library
  { x: 76, y: 78, lat: 33.2039, lng: -87.5354 }, // Law School
  { x: 30, y: 16, lat: 33.2102, lng: -87.5440 }, // Honors Hall
  { x: 46, y: 10, lat: 33.2096, lng: -87.5424 }, // Russell Hall
  { x: 90, y: 22, lat: 33.2155, lng: -87.5280 }, // Rec Fields
  { x: 92, y: 40, lat: 33.2044, lng: -87.5498 }, // Tutwiler
  { x: 50, y: 30, lat: 33.2155, lng: -87.5475 }, // Parking Deck
  { x:  7, y: 55, lat: 33.2120, lng: -87.5570 }, // Faculty Lot
  { x: 45, y: 92, lat: 33.2121, lng: -87.5535 }, // Publix
  { x: 90, y: 85, lat: 33.2074, lng: -87.5382 }, // Moody Music Hall
  { x: 92, y: 65, lat: 33.2041, lng: -87.5327 }, // South Lawn
  { x: 22, y: 42, lat: 33.2075, lng: -87.5418 }  // Saban Catholic Student Center
];

// ── Routing time constants (minutes) ─────────────────────────
export const TIME_WALK_TO_STOP = 3;
export const TIME_BUS_PER_STOP = 2;
export const TIME_WALK_DIRECT  = 20;

// Timetables — null means continuous loop with no fixed schedule
export const TIMETABLES = {
  r1: null,
  r2: null,
  r3: null,
  r4: null,
  r5: [
    { stopName: "South Hub",          times: ["6:30 AM","7:00 AM","7:30 AM","8:00 AM","8:30 AM","9:00 AM","9:30 AM","10:00 AM"] },
    { stopName: "President's Mansion",times: ["6:33 AM","7:03 AM","7:33 AM","8:03 AM","8:33 AM","9:03 AM","9:33 AM","10:03 AM"] },
    { stopName: "The Quad",           times: ["6:37 AM","7:07 AM","7:37 AM","8:07 AM","8:37 AM","9:07 AM","9:37 AM","10:07 AM"] },
    { stopName: "East Village",       times: ["6:43 AM","7:13 AM","7:43 AM","8:13 AM","8:43 AM","9:13 AM","9:43 AM","10:13 AM"] },
    { stopName: "Gorgas Library",     times: ["6:39 AM","7:09 AM","7:39 AM","8:09 AM","8:39 AM","9:09 AM","9:39 AM","10:09 AM"] },
    { stopName: "Law School",         times: ["6:41 AM","7:11 AM","7:41 AM","8:11 AM","8:41 AM","9:11 AM","9:41 AM","10:11 AM"] }
  ],
  r6: null
};