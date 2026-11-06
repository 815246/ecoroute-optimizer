/**
 * EcoRoute API service layer.
 * All traffic data is simulated – not live.
 * Supports configurable VITE_API_BASE_URL with graceful demo fallbacks for Vercel.
 */
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL.replace(/\/$/, "")}/api`
  : "/api";

const client = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

export const FALLBACK_VEHICLES = [
  { id: "petrol_hatchback", name: "Petrol Hatchback", fuel_type: "petrol", baseline_l_per_100km: 6.2 },
  { id: "diesel_suv", name: "Diesel SUV", fuel_type: "diesel", baseline_l_per_100km: 7.5 },
  { id: "electric_compact", name: "Electric Compact", fuel_type: "electric", baseline_kwh_per_100km: 15.0 },
  { id: "delivery_van", name: "Delivery Van", fuel_type: "diesel", baseline_l_per_100km: 9.8 },
];

export const FALLBACK_PRESETS = [
  { name: "eco", description: "minimise CO₂", weights: { co2: 0.7, time: 0.2, distance: 0.1 } },
  { name: "fastest", description: "minimise time", weights: { co2: 0.1, time: 0.8, distance: 0.1 } },
  { name: "balanced", description: "blend CO₂ + time", weights: { co2: 0.45, time: 0.45, distance: 0.1 } },
  { name: "shortest", description: "minimise distance", weights: { co2: 0.1, time: 0.1, distance: 0.8 } },
];

function describePreset(name) {
  const map = {
    eco: "minimise CO₂",
    fastest: "minimise time",
    balanced: "blend CO₂ + time",
    shortest: "minimise distance",
  };
  return map[name] ?? name;
}

/** Fetch available weight presets. */
export async function getPresets() {
  try {
    const { data } = await client.get("/routes/presets");
    const names = Object.keys(data);
    const presets = names.map((name) => ({
      name,
      description: describePreset(name),
      weights: data[name],
    }));
    return { presets };
  } catch {
    return { presets: FALLBACK_PRESETS };
  }
}

/** Fetch all vehicles. */
export async function getVehicles() {
  try {
    const { data } = await client.get("/vehicles");
    const vehicles = Array.isArray(data) ? data : data.vehicles ?? [];
    return { vehicles: vehicles.length > 0 ? vehicles : FALLBACK_VEHICLES };
  } catch {
    return { vehicles: FALLBACK_VEHICLES };
  }
}

/**
 * Plan a multi-objective route.
 * Tries the live backend first, with interactive fallback for serverless preview.
 */
export async function planRoute(params) {
  const payload = {
    source: params.source,
    destination: params.destination,
    vehicle: params.vehicle_id ?? "petrol_hatchback",
    weights: params.preset ?? "eco",
    data_mode: params.use_osm ? "real" : "simulated",
    departure_hour: params.departure_hour ?? null,
    k: 5,
    persist: true,
  };

  try {
    const { data } = await client.post("/routes/plan", payload);
    return data;
  } catch (err) {
    // If running in cloud/Vercel preview without live backend connected, produce demo route set
    if (!err.response || err.code === "ERR_NETWORK" || err.response.status === 404 || err.response.status === 502) {
      return generateDemoRoutes(params);
    }
    throw err;
  }
}

/** Fetch journey by ID */
export async function getJourney(journeyId) {
  const { data } = await client.get(`/routes/${journeyId}`);
  return data;
}

/** Fetch journey history. */
export async function getHistory(limit = 20) {
  try {
    const { data } = await client.get("/history", { params: { limit } });
    const journeys = Array.isArray(data) ? data : data.journeys ?? [];
    return { journeys };
  } catch {
    return { journeys: [] };
  }
}

/** Generates realistic interactive demo routes for preview deployments */
function generateDemoRoutes(params) {
  // Parse or default coordinates
  let sLat = 23.3144, sLon = 85.3216; // Airport
  let dLat = 23.3486, dLon = 85.3341; // Railway Station

  if (typeof params.source === "string" && params.source.includes(",")) {
    const p = params.source.split(",").map(Number);
    if (!isNaN(p[0]) && !isNaN(p[1])) { sLat = p[0]; sLon = p[1]; }
  }
  if (typeof params.destination === "string" && params.destination.includes(",")) {
    const p = params.destination.split(",").map(Number);
    if (!isNaN(p[0]) && !isNaN(p[1])) { dLat = p[0]; dLon = p[1]; }
  }

  // Generate intermediate points for curvature
  const mid1 = [sLat + (dLat - sLat) * 0.35 + 0.005, sLon + (dLon - sLon) * 0.35 - 0.004];
  const mid2 = [sLat + (dLat - sLat) * 0.70 - 0.003, sLon + (dLon - sLon) * 0.70 + 0.003];

  const ecoGeometry = [[sLat, sLon], mid1, mid2, [dLat, dLon]];
  const fastGeometry = [
    [sLat, sLon],
    [sLat + (dLat - sLat) * 0.5 - 0.008, sLon + (dLon - sLon) * 0.5 - 0.008],
    [dLat, dLon],
  ];
  const shortGeometry = [[sLat, sLon], [dLat, dLon]];

  const demoEcoRoute = {
    rank: 1,
    primary_label: "Eco Route (Recommended)",
    label: "Eco Route",
    co2_kg: 0.942,
    travel_time_min: 15.4,
    distance_km: 6.8,
    fuel_consumed_l: 0.41,
    composite_score: 0.28,
    route_geometry: ecoGeometry,
    geometry: ecoGeometry,
    path: ["A", "C", "D", "E"],
    directions: [
      { step: 1, instruction: "Head north on Airport Exit Road", distance_km: 1.2, duration_min: 2.5, turn_type: "straight", location: [sLat, sLon] },
      { step: 2, instruction: "Turn right onto Hinoo Main Road", distance_km: 2.1, duration_min: 4.8, turn_type: "right", location: mid1 },
      { step: 3, instruction: "Turn left onto Station Approach Road", distance_km: 2.3, duration_min: 5.1, turn_type: "left", location: mid2 },
      { step: 4, instruction: "Arrive at destination on the right", distance_km: 1.2, duration_min: 3.0, turn_type: "straight", location: [dLat, dLon] },
    ],
    savings_vs_fastest_co2_kg: 0.285,
    savings_vs_fastest_co2_pct: 23.2,
    time_penalty_min: 1.8,
  };

  const demoFastRoute = {
    rank: 2,
    primary_label: "Fastest Route",
    label: "Fastest",
    co2_kg: 1.227,
    travel_time_min: 13.6,
    distance_km: 7.4,
    fuel_consumed_l: 0.53,
    composite_score: 0.42,
    route_geometry: fastGeometry,
    geometry: fastGeometry,
    path: ["A", "B", "E"],
    directions: [
      { step: 1, instruction: "Head northeast on Express Corridor", distance_km: 3.5, duration_min: 6.0, turn_type: "straight", location: [sLat, sLon] },
      { step: 2, instruction: "Turn left onto City Ring Road", distance_km: 2.8, duration_min: 5.0, turn_type: "left", location: fastGeometry[1] },
      { step: 3, instruction: "Arrive at destination", distance_km: 1.1, duration_min: 2.6, turn_type: "straight", location: [dLat, dLon] },
    ],
  };

  const demoShortRoute = {
    rank: 3,
    primary_label: "Shortest Route",
    label: "Shortest",
    co2_kg: 1.150,
    travel_time_min: 17.2,
    distance_km: 6.2,
    fuel_consumed_l: 0.49,
    composite_score: 0.51,
    route_geometry: shortGeometry,
    geometry: shortGeometry,
    path: ["A", "E"],
    directions: [
      { step: 1, instruction: "Take direct urban arterial road", distance_km: 4.0, duration_min: 11.0, turn_type: "straight", location: [sLat, sLon] },
      { step: 2, instruction: "Continue onto Terminal Road to arrival", distance_km: 2.2, duration_min: 6.2, turn_type: "straight", location: [dLat, dLon] },
    ],
  };

  return {
    status: "success",
    journey_id: "demo-" + Date.now(),
    data_mode: "simulated",
    traffic_label: "Simulated traffic, not live",
    source: String(params.source),
    destination: String(params.destination),
    vehicle: { id: params.vehicle_id ?? "petrol_hatchback", name: "Petrol Hatchback", fuel_type: "petrol" },
    weights: { co2: 0.7, time: 0.2, distance: 0.1 },
    recommended_route: demoEcoRoute,
    baselines: {
      fastest: demoFastRoute,
      shortest: demoShortRoute,
    },
    routes: [demoEcoRoute, demoFastRoute, demoShortRoute],
    explanation: {
      summary: "Eco Route saves 0.285 kg CO₂ (23.2%) compared to the fastest route, with a small 1.8 min time penalty.",
      tradeoffs: [
        { route: "Eco Route", co2_kg: 0.942, time_min: 15.4, dist_km: 6.8 },
        { route: "Fastest Route", co2_kg: 1.227, time_min: 13.6, dist_km: 7.4 },
        { route: "Shortest Route", co2_kg: 1.150, time_min: 17.2, dist_km: 6.2 },
      ],
    },
    agent_trace: [
      { agent: "RoadNetworkAgent", action: "Fetched candidate paths between origin and destination" },
      { agent: "TrafficAgent", action: "Applied simulated time-of-day congestion weights" },
      { agent: "EmissionAgent", action: "Calculated speed-dependent fuel and CO2 emissions" },
      { agent: "OptimizationAgent", action: "Ranked Pareto candidate routes with Multi-Objective weights" },
    ],
  };
}
