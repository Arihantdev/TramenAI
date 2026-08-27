const DEMO_BOOKINGS_KEY = "rf_demo_bookings";
const DEMO_PROFILE_KEY = "rf_demo_profile";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const readJson = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* demo storage can be unavailable */ }
};

export const DEMO_PROFILE = {
  name: "Aarav Sharma",
  email: "aarav.sharma@example.com",
  phone: "+91 98765 43210",
  photo: "",
};

export function getDemoProfile(identifier = "") {
  return { ...DEMO_PROFILE, email: identifier || DEMO_PROFILE.email, ...readJson(DEMO_PROFILE_KEY, {}) };
}

export function saveDemoProfile(profile) {
  const next = { ...DEMO_PROFILE, ...profile };
  writeJson(DEMO_PROFILE_KEY, next);
  return next;
}

export async function getTrainStatus(trains, query = "") {
  await delay(420);
  const normalized = query.trim().toLowerCase();
  const matches = normalized
    ? trains.filter((train) => String(train.id).toLowerCase().includes(normalized) || train.name.toLowerCase().includes(normalized))
    : trains;
  return {
    provider: "CRIS DEMO ADAPTER",
    mode: "DEMO",
    observedAt: new Date().toISOString(),
    results: matches.map((train) => ({ ...train, source: "CRIS DEMO", freshness: "LIVE SIMULATION" })),
  };
}

export async function getNtesInquiry({ trainNumber, station, question }) {
  await delay(520);
  return {
    provider: "NTES DEMO ADAPTER",
    mode: "DEMO",
    reference: `NTES-${Date.now().toString().slice(-6)}`,
    answer: `Inquiry received for train ${trainNumber || "the selected service"}${station ? ` at ${station}` : ""}. Demo operations indicate the service is being monitored by TramenAI control.`,
    question,
    observedAt: new Date().toISOString(),
  };
}

export async function getPnrStatus(pnr) {
  await delay(480);
  const cleanPnr = pnr.trim().toUpperCase();
  return {
    provider: "CRIS DEMO ADAPTER",
    mode: "DEMO",
    pnr: cleanPnr,
    status: cleanPnr === "8456123098" ? "CONFIRMED" : "RAC / DEMO",
    passenger: "Aarav Sharma",
    train: "22439 Shristi Express",
    journey: "Ratnapur → Chandigarh Jn",
    coach: cleanPnr === "8456123098" ? "B2 / 41" : "To be assigned",
    observedAt: new Date().toISOString(),
  };
}

export async function searchDemoTickets({ from, to, date }) {
  await delay(500);
  return [
    { id: "22439", name: "Shristi Express", from, to, date, departure: "06:20", arrival: "14:45", duration: "08h 25m", className: "3A", fare: 845, seats: 18 },
    { id: "12951", name: "Rajdhani Demo", from, to, date, departure: "16:10", arrival: "23:55", duration: "07h 45m", className: "2A", fare: 1460, seats: 6 },
  ];
}

export async function bookDemoTicket({ train, passenger }) {
  await delay(700);
  const booking = {
    id: `RF-${Date.now().toString().slice(-8)}`,
    pnr: String(Math.floor(1000000000 + Math.random() * 8999999999)),
    status: "CONFIRMED (DEMO)",
    train,
    passenger,
    createdAt: new Date().toISOString(),
  };
  const bookings = readJson(DEMO_BOOKINGS_KEY, []);
  writeJson(DEMO_BOOKINGS_KEY, [booking, ...bookings]);
  return booking;
}

export function getDemoBookings() {
  return readJson(DEMO_BOOKINGS_KEY, []);
}

export function cancelDemoBooking(id) {
  const bookings = readJson(DEMO_BOOKINGS_KEY, []);
  const next = bookings.map((booking) => booking.id === id ? { ...booking, status: "CANCELLED (DEMO)" } : booking);
  writeJson(DEMO_BOOKINGS_KEY, next);
  return next.find((booking) => booking.id === id);
}
