/**
 * EcoRoute API service layer.
 * All traffic data is simulated – not live.
 */
import axios from "axios";

const client = axios.create({
  baseURL: "/api",
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

/** Fetch available weight presets. Backend returns { eco: {...}, ... } */
export async function getPresets() {
  const { data } = await client.get("/routes/presets");
  const names = Object.keys(data);
  const presets = names.map((name) => ({
    name,
    description: describePreset(name),
    weights: data[name],
  }));
  return { presets };
}

function describePreset(name) {
  const map = {
    eco: "minimise CO₂",
    fastest: "minimise time",
    balanced: "blend CO₂ + time",
    shortest: "minimise distance",
  };
  return map[name] ?? name;
}

/** Fetch all vehicles. Backend returns a plain array. */
export async function getVehicles() {
  const { data } = await client.get("/vehicles");
  // Backend returns array; wrap for consistency
  const vehicles = Array.isArray(data) ? data : data.vehicles ?? [];
  return { vehicles };
}

/**
 * Plan a multi-objective route.
 * Adapts frontend form fields to the backend RoutePlanRequest schema.
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
  const { data } = await client.post("/routes/plan", payload);
  return data;
}

/** Fetch journey by ID */
export async function getJourney(journeyId) {
  const { data } = await client.get(`/routes/${journeyId}`);
  return data;
}

/** Fetch journey history. Backend returns a plain array. */
export async function getHistory(limit = 20) {
  const { data } = await client.get("/history", { params: { limit } });
  const journeys = Array.isArray(data) ? data : data.journeys ?? [];
  return { journeys };
}
