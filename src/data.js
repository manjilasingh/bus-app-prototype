// ── Shared stops ──────────────────────────────────────────────
// These stop objects are referenced by multiple routes, enabling
// transfers between routes at these locations without walking.
//
//  "central-hub"  shared by Green Loop (G1) + Blue Loop (B2)
//  "main-plaza"   shared by Red Line (R9) + Teal Crosstown (T3)

const STOP_CENTRAL_HUB = { id: "central-hub", name: "Central Hub", x: 48, y: 42 };
const STOP_MAIN_PLAZA  = { id: "main-plaza",  name: "Main Plaza",  x: 50, y: 62 };
const STOP_SOUTH_HUB   = { id: "south-hub",   name: "South Hub",   x: 17, y: 80 };
const STOP_NORTH_HUB =   { id: "north-hub",   name: "North Hub",   x: 71, y: 9  };

export const ROUTES = [
  // ── Green Loop (G1) ─────────────────────────────────────────
  // NW campus loop. Shares Central Hub with Blue Loop.
  {
    id: "r1",
    shortName: "G1",
    name: "Green Loop",
    color: "#35d07f",
    glow: "rgba(53, 208, 127, 0.35)",
    activeHours: "7:00 AM - 11:00 PM",
    durationLabel: "14-18 min",
    loop: true,
    stops: [
      { id: "r1s1", name: "Innovation Hub", x: 18, y: 20 },
      { id: "r1s2", name: "West Deck",      x: 10, y: 38 },
      { id: "r1s3", name: "Engineering",    x: 18, y: 54 },
      STOP_MAIN_PLAZA,
      STOP_CENTRAL_HUB,
      { id: "r1s6", name: "Science Hall",   x: 34, y: 28 },
    ]
  },

  // ── Blue Loop (B2) ───────────────────────────────────────────
  // NE campus loop. Shares Central Hub with Green Loop.
  {
    id: "r2",
    shortName: "B2",
    name: "Blue Loop",
    color: "#3ba7ff",
    glow: "rgba(59, 167, 255, 0.35)",
    activeHours: "7:30 AM - 10:30 PM",
    durationLabel: "16-20 min",
    loop: true,
    stops: [
      STOP_NORTH_HUB,
      { id: "r2s2", name: "North Quad",      x: 58, y: 22 },
      { id: "r2s3", name: "Business School", x: 64, y: 38 },
      STOP_CENTRAL_HUB,
      { id: "r2s5", name: "Student Rec",     x: 58, y: 54 },
      { id: "r2s6", name: "Arts Commons",    x: 78, y: 46 },
      { id: "r2s7", name: "Museum Walk",     x: 82, y: 30 },
    ]
  },

  // ── Red Line (R9) ────────────────────────────────────────────
  // South corridor loop. Shares Main Plaza with Teal Crosstown.
  {
    id: "r5",
    shortName: "R9",
    name: "Red Line",
    color: "#ff5f6d",
    glow: "rgba(255, 95, 109, 0.35)",
    activeHours: "6:30 AM - 12:00 AM",
    durationLabel: "18-24 min",
    loop: true,
    stops: [
      STOP_SOUTH_HUB,
      { id: "r5s2", name: "Commons",        x: 32, y: 70 },
      STOP_MAIN_PLAZA,
      { id: "r5s4", name: "East Village",   x: 84, y: 64 },
      { id: "r5s5", name: "Main Library",   x: 62, y: 72 },
      { id: "r5s6", name: "Law School",     x: 76, y: 78 },
    ]
  },


  // ── Sunset Express (S7) ──────────────────────────────────────
  // Northern express loop (standalone).
  {
    id: "r3",
    shortName: "S7",
    name: "Sunset Express",
    color: "#ff8a3d",
    glow: "rgba(255, 138, 61, 0.35)",
    activeHours: "8:00 AM - 9:30 PM",
    durationLabel: "10-14 min",
    loop: true,
    stops: [
      { id: "r3s1", name: "Honors Hall",     x: 30, y: 16 },
      { id: "r3s2", name: "Stadium Gate N",  x: 46, y: 10 },
      STOP_NORTH_HUB,
      { id: "r3s4", name: "Rec Fields",      x: 90, y: 22 },
      { id: "r3s5", name: "Bryant Transit",  x: 92, y: 40 },
      { id: "r3s6", name: "Parking Deck",    x: 50, y: 30 },
    ]
  },

  // ── Purple Connector (P4) ────────────────────────────────────
  // West-side connector loop (standalone).
  {
    id: "r4",
    shortName: "P4",
    name: "Purple Connector",
    color: "#b86dff",
    glow: "rgba(184, 109, 255, 0.35)",
    activeHours: "7:00 AM - 8:00 PM",
    durationLabel: "16-22 min",
    loop: true,
    stops: [
      { id: "r4s1", name: "Faculty Lot",     x: 7, y: 55 },
      { id: "r4s2", name: "West Commons",    x: 9, y: 65 },
      STOP_SOUTH_HUB,
      { id: "r4s4", name: "Try Again",       x: 45, y: 92},
      { id: "r4s5", name: "Performing Arts", x: 90, y: 85 },
      { id: "r4s6", name: "Dont Care",       x: 92, y: 65},
      STOP_CENTRAL_HUB,
      { id: "r4s8", name: "Chapel Hill",     x: 22, y: 42 },
    ]
  }
];

export const BUILDINGS = [
  "Student Recreation Center",
  "Bryant Denny Stadium",
  "Science Hall",
  "North Quad",
  "Union Plaza",
  "Engineering Complex",
  "Main Library",
  "Business School",
  "Health Center",
  "Innovation Hub",
  "Aquatics Center",
  "Arts Commons"
];

export const USER_LOCATION = { x: 21, y: 15, label: "Current Location" };

export const BUILDING_LOCATIONS = {
  "Student Recreation Center": { x: 58, y: 54 },
  "Bryant Denny Stadium":      { x: 46, y: 26 },
  "Science Hall":              { x: 34, y: 28 },
  "North Quad":                { x: 58, y: 22 },
  "Union Plaza":               { x: 28, y: 68 },
  "Engineering Complex":       { x: 18, y: 54 },
  "Main Library":              { x: 62, y: 72 },
  "Business School":           { x: 64, y: 38 },
  "Health Center":             { x: 72, y: 18 },
  "Innovation Hub":            { x: 18, y: 20 },
  "Aquatics Center":           { x: 80, y: 88 },
  "Arts Commons":              { x: 78, y: 46 }
};

// ── Routing time constants (minutes) ─────────────────────────
export const TIME_WALK_TO_STOP   = 3;
export const TIME_BUS_PER_STOP   = 2;
export const TIME_WALK_DIRECT    = 20;

// Timetables — null means continuous loop with no fixed schedule
export const TIMETABLES = {
  r1: null,
  r2: null,
  r3: null,
  r4: null,
  r5: [
    { stopName: "Transit Center", times: ["6:30 AM","7:00 AM","7:30 AM","8:00 AM","8:30 AM","9:00 AM","9:30 AM","10:00 AM"] },
    { stopName: "Commons",        times: ["6:33 AM","7:03 AM","7:33 AM","8:03 AM","8:33 AM","9:03 AM","9:33 AM","10:03 AM"] },
    { stopName: "Main Plaza",     times: ["6:37 AM","7:07 AM","7:37 AM","8:07 AM","8:37 AM","9:07 AM","9:37 AM","10:07 AM"] },
    { stopName: "Main Library",   times: ["6:39 AM","7:09 AM","7:39 AM","8:09 AM","8:39 AM","9:09 AM","9:39 AM","10:09 AM"] },
    { stopName: "Law School",     times: ["6:41 AM","7:11 AM","7:41 AM","8:11 AM","8:41 AM","9:11 AM","9:41 AM","10:11 AM"] },
    { stopName: "East Village",   times: ["6:43 AM","7:13 AM","7:43 AM","8:13 AM","8:43 AM","9:13 AM","9:43 AM","10:13 AM"] }
  ],
  r6: null
};