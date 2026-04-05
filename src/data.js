export const ROUTES = [
  {
    id: "r1",
    shortName: "G1",
    name: "Green Loop",
    color: "#35d07f",
    glow: "rgba(53, 208, 127, 0.35)",
    activeHours: "7:00 AM - 11:00 PM",
    durationLabel: "12-16 min",
    stops: [
      { id: "r1s1", name: "Union Plaza", x: 13, y: 78 },
      { id: "r1s2", name: "Science Hall", x: 23, y: 66 },
      { id: "r1s3", name: "Library East", x: 31, y: 49 },
      { id: "r1s4", name: "Stadium Gate", x: 43, y: 33 },
      { id: "r1s5", name: "North Quad", x: 59, y: 18 }
    ]
  },
  {
    id: "r2",
    shortName: "B2",
    name: "Blue Ridge",
    color: "#3ba7ff",
    glow: "rgba(59, 167, 255, 0.35)",
    activeHours: "7:30 AM - 10:30 PM",
    durationLabel: "14-19 min",
    stops: [
      { id: "r2s1", name: "Health Center", x: 74, y: 20 },
      { id: "r2s2", name: "Arts Commons", x: 83, y: 37 },
      { id: "r2s3", name: "Bryant Transit", x: 68, y: 49 },
      { id: "r2s4", name: "Student Rec", x: 52, y: 46 },
      { id: "r2s5", name: "South Village", x: 40, y: 56 }
    ]
  },
  {
    id: "r3",
    shortName: "S7",
    name: "Sunset Express",
    color: "#ff8a3d",
    glow: "rgba(255, 138, 61, 0.35)",
    activeHours: "8:00 AM - 9:30 PM",
    durationLabel: "10-14 min",
    stops: [
      { id: "r3s1", name: "West Deck", x: 12, y: 30 },
      { id: "r3s2", name: "Engineering", x: 25, y: 37 },
      { id: "r3s3", name: "Student Center", x: 39, y: 41 },
      { id: "r3s4", name: "Business School", x: 56, y: 42 },
      { id: "r3s5", name: "Museum Walk", x: 71, y: 35 }
    ]
  },
  {
    id: "r4",
    shortName: "P4",
    name: "Purple Connector",
    color: "#b86dff",
    glow: "rgba(184, 109, 255, 0.35)",
    activeHours: "7:00 AM - 8:00 PM",
    durationLabel: "16-22 min",
    stops: [
      { id: "r4s1", name: "Innovation Hub", x: 20, y: 18 },
      { id: "r4s2", name: "Honors Hall", x: 34, y: 26 },
      { id: "r4s3", name: "Central Lawn", x: 49, y: 35 },
      { id: "r4s4", name: "Rec Fields", x: 58, y: 57 }
    ]
  },
  {
    id: "r5",
    shortName: "R9",
    name: "Red Line",
    color: "#ff5f6d",
    glow: "rgba(255, 95, 109, 0.35)",
    activeHours: "6:30 AM - 12:00 AM",
    durationLabel: "18-24 min",
    stops: [
      { id: "r5s1", name: "East Village", x: 80, y: 63 },
      { id: "r5s2", name: "Law School", x: 73, y: 73 },
      { id: "r5s3", name: "Main Library", x: 57, y: 78 },
      { id: "r5s4", name: "Commons", x: 39, y: 73 },
      { id: "r5s5", name: "Transit Center", x: 25, y: 82 }
    ]
  },
  {
    id: "r6",
    shortName: "T3",
    name: "Teal Crosstown",
    color: "#17d4c5",
    glow: "rgba(23, 212, 197, 0.35)",
    activeHours: "8:00 AM - 10:00 PM",
    durationLabel: "11-15 min",
    stops: [
      { id: "r6s1", name: "Aquatics Center", x: 76, y: 84 },
      { id: "r6s2", name: "South Quad", x: 63, y: 70 },
      { id: "r6s3", name: "Dining Hall", x: 50, y: 58 },
      { id: "r6s4", name: "Music Building", x: 35, y: 50 }
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

export const USER_LOCATION = { x: 28, y: 61, label: "Current Location" };

// Each route has either a per-stop schedule or null (continuous loop, no fixed times).
// Each stop entry is { stopName, times[] }.
export const TIMETABLES = {
  r1: [
    { stopName: "Union Plaza",   times: ["7:00 AM","7:30 AM","8:00 AM","8:30 AM","9:00 AM","9:30 AM","10:00 AM","10:30 AM"] },
    { stopName: "Science Hall",  times: ["7:03 AM","7:33 AM","8:03 AM","8:33 AM","9:03 AM","9:33 AM","10:03 AM","10:33 AM"] },
    { stopName: "Library East",  times: ["7:07 AM","7:37 AM","8:07 AM","8:37 AM","9:07 AM","9:37 AM","10:07 AM","10:37 AM"] },
    { stopName: "Stadium Gate",  times: ["7:11 AM","7:41 AM","8:11 AM","8:41 AM","9:11 AM","9:41 AM","10:11 AM","10:41 AM"] },
    { stopName: "North Quad",    times: ["7:16 AM","7:46 AM","8:16 AM","8:46 AM","9:16 AM","9:46 AM","10:16 AM","10:46 AM"] }
  ],
  r2: [
    { stopName: "Health Center",  times: ["7:30 AM","8:00 AM","8:30 AM","9:00 AM","9:30 AM","10:00 AM","10:30 AM"] },
    { stopName: "Arts Commons",   times: ["7:35 AM","8:05 AM","8:35 AM","9:05 AM","9:35 AM","10:05 AM","10:35 AM"] },
    { stopName: "Bryant Transit", times: ["7:41 AM","8:11 AM","8:41 AM","9:11 AM","9:41 AM","10:11 AM","10:41 AM"] },
    { stopName: "Student Rec",    times: ["7:46 AM","8:16 AM","8:46 AM","9:16 AM","9:46 AM","10:16 AM","10:46 AM"] },
    { stopName: "South Village",  times: ["7:49 AM","8:19 AM","8:49 AM","9:19 AM","9:49 AM","10:19 AM","10:49 AM"] }
  ],
  r3: [
    { stopName: "West Deck",       times: ["8:00 AM","8:20 AM","8:40 AM","9:00 AM","9:20 AM","9:40 AM","10:00 AM","10:20 AM"] },
    { stopName: "Engineering",     times: ["8:04 AM","8:24 AM","8:44 AM","9:04 AM","9:24 AM","9:44 AM","10:04 AM","10:24 AM"] },
    { stopName: "Student Center",  times: ["8:08 AM","8:28 AM","8:48 AM","9:08 AM","9:28 AM","9:48 AM","10:08 AM","10:28 AM"] },
    { stopName: "Business School", times: ["8:11 AM","8:31 AM","8:51 AM","9:11 AM","9:31 AM","9:51 AM","10:11 AM","10:31 AM"] },
    { stopName: "Museum Walk",     times: ["8:14 AM","8:34 AM","8:54 AM","9:14 AM","9:34 AM","9:54 AM","10:14 AM","10:34 AM"] }
  ],
  r4: null,  // Continuous loop — no fixed schedule
  r5: [
    { stopName: "East Village",   times: ["6:30 AM","7:00 AM","7:30 AM","8:00 AM","8:30 AM","9:00 AM","9:30 AM","10:00 AM"] },
    { stopName: "Law School",     times: ["6:35 AM","7:05 AM","7:35 AM","8:05 AM","8:35 AM","9:05 AM","9:35 AM","10:05 AM"] },
    { stopName: "Main Library",   times: ["6:41 AM","7:11 AM","7:41 AM","8:11 AM","8:41 AM","9:11 AM","9:41 AM","10:11 AM"] },
    { stopName: "Commons",        times: ["6:47 AM","7:17 AM","7:47 AM","8:17 AM","8:47 AM","9:17 AM","9:47 AM","10:17 AM"] },
    { stopName: "Transit Center", times: ["6:52 AM","7:22 AM","7:52 AM","8:22 AM","8:52 AM","9:22 AM","9:52 AM","10:22 AM"] }
  ],
  r6: null   // Continuous loop — no fixed schedule
};
