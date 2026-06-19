const ROOMS = [
  { id: "a101", name: "A101 NLD", floor: 1, zone: "A Wing", capacity: 32, type: "Classroom", lightsKw: 0.42, hvacKw: 2.7, x: 514, z: 82, w: 88, d: 64, h: 36 },
  { id: "a107", name: "A107 NLD", floor: 1, zone: "A Wing", capacity: 32, type: "Classroom", lightsKw: 0.42, hvacKw: 2.7, x: 372, z: 82, w: 88, d: 64, h: 36 },
  { id: "a111", name: "A111 NLD", floor: 1, zone: "A Wing", capacity: 32, type: "Classroom", lightsKw: 0.42, hvacKw: 2.7, x: 230, z: 82, w: 88, d: 64, h: 36 },
  { id: "b101", name: "B101 NLD", floor: 1, zone: "B Wing", capacity: 30, type: "Classroom", lightsKw: 0.4, hvacKw: 2.6, x: 94, z: 70, w: 86, d: 70, h: 38 },
  { id: "b108", name: "B108", floor: 1, zone: "B Wing", capacity: 34, type: "Classroom", lightsKw: 0.46, hvacKw: 2.8, x: 88, z: 196, w: 88, d: 82, h: 38 },
  { id: "c101", name: "C101 NPF", floor: 1, zone: "C Wing", capacity: 34, type: "Classroom", lightsKw: 0.45, hvacKw: 2.8, x: 514, z: 334, w: 90, d: 62, h: 36 },
  { id: "c110", name: "C110 NPF", floor: 1, zone: "C Wing", capacity: 38, type: "Classroom", lightsKw: 0.5, hvacKw: 3.1, x: 368, z: 318, w: 106, d: 78, h: 38 },
  { id: "c115", name: "C115 NLD", floor: 1, zone: "C Wing", capacity: 32, type: "Classroom", lightsKw: 0.42, hvacKw: 2.7, x: 218, z: 334, w: 110, d: 62, h: 36 },
  { id: "courtyard", name: "Courtyard", floor: 1, zone: "Central", capacity: 120, type: "Outdoor", lightsKw: 1.1, hvacKw: 0, x: 236, z: 190, w: 226, d: 90, h: 12 },
  { id: "auditorium", name: "Auditorium", floor: 2, zone: "Mall Area", capacity: 420, type: "Assembly", lightsKw: 5.6, hvacKw: 12.4, x: 380, z: 282, w: 210, d: 98, h: 58 },
  { id: "cafeteria", name: "Cafeteria", floor: 2, zone: "Mall Area", capacity: 260, type: "Cafeteria", lightsKw: 3.8, hvacKw: 8.6, x: 520, z: 92, w: 122, d: 78, h: 52 },
  { id: "b201", name: "B201 IMP", floor: 2, zone: "B Wing", capacity: 36, type: "Classroom", lightsKw: 0.5, hvacKw: 3.0, x: 108, z: 164, w: 84, d: 66, h: 40 },
  { id: "a224", name: "A224 EXTEMP", floor: 2, zone: "A Wing", capacity: 34, type: "Competition", lightsKw: 0.48, hvacKw: 3.0, x: 332, z: 78, w: 96, d: 60, h: 38 },
  { id: "a220", name: "A220 Prep", floor: 2, zone: "A Wing", capacity: 48, type: "Prep Room", lightsKw: 0.66, hvacKw: 3.8, x: 440, z: 78, w: 92, d: 60, h: 38 }
];

const DEFAULT_EVENTS = [];
const SCHOOL_WEATHER = {
  name: "Ardrey Kell HS",
  latitude: 35.033,
  longitude: -80.817,
  timezone: "America/New_York"
};
const CO2_KG_PER_KWH = 0.385;

const state = {
  date: new Date().toISOString().slice(0, 10),
  events: [],
  selectedRoomId: "courtyard",
  previewMinute: 7 * 60 + 45,
  rotation: -36,
  pitch: 60,
  layers: {
    lights: true,
    hvac: true
  },
  activeSideTab: "checklist",
  weather: {
    status: "loading",
    source: "offline",
    currentTemp: null,
    hourly: [],
    updatedAt: null,
    error: ""
  },
  dragging: false,
  dragMoved: false,
  wasDragClick: false,
  dragStartX: 0,
  dragStartY: 0,
  dragStartRotation: -36,
  dragStartPitch: 60,
  framePending: false,
  renderPending: false,
  modelBuilt: false
};

const $ = (selector) => document.querySelector(selector);
const storageKey = () => `lightsout:${state.date}`;

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `event-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function cloneDefaultEvents() {
  return DEFAULT_EVENTS.map((event) => ({
    ...event,
    id: event.id,
    needs: { ...event.needs }
  }));
}

let energyModel = null;
const MODEL_FEATURES = ["bias", "area", "capacity", "duration", "occupancy", "floor", "lights", "hvac", "projector", "afterHours", "largeSpace"];

function minutes(time) {
  const [hours, mins] = time.split(":").map(Number);
  return hours * 60 + mins;
}

function timeFromMinutes(total) {
  const day = 24 * 60;
  const safe = ((total % day) + day) % day;
  const hours = String(Math.floor(safe / 60)).padStart(2, "0");
  const mins = String(safe % 60).padStart(2, "0");
  return `${hours}:${mins}`;
}

function formatTime(time) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(`${state.date}T${time}:00`));
}

function formatDateKey(date = state.date) {
  return date;
}

function getRoom(roomId) {
  return ROOMS.find((room) => room.id === roomId);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getEnabledLayers() {
  return Object.entries(state.layers)
    .filter(([, enabled]) => enabled)
    .map(([layer]) => layer);
}

function getLayerLabel(layer) {
  return layer === "hvac" ? "Heat/cooling" : "Lights";
}

function getLayerNeed(event, layer) {
  return layer === "hvac" ? event.needs.hvac : event.needs.lights;
}

function getSystemsForEvent(event) {
  return getEnabledLayers().filter((layer) => getLayerNeed(event, layer));
}

async function loadWeatherForecast() {
  const cached = readCachedWeather();
  if (cached) {
    state.weather = cached;
    renderWeatherDependentPanels();
  }

  const params = new URLSearchParams({
    latitude: SCHOOL_WEATHER.latitude,
    longitude: SCHOOL_WEATHER.longitude,
    hourly: "temperature_2m,apparent_temperature",
    current: "temperature_2m,apparent_temperature",
    temperature_unit: "fahrenheit",
    timezone: SCHOOL_WEATHER.timezone,
    forecast_days: "7"
  });

  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, {
      cache: "no-store"
    });
    if (!response.ok) throw new Error(`Weather request failed: ${response.status}`);
    const data = await response.json();
    const hourly = (data.hourly?.time || []).map((time, index) => ({
      time,
      temp: data.hourly.temperature_2m[index],
      apparent: data.hourly.apparent_temperature[index]
    })).filter((item) => Number.isFinite(item.temp));
    state.weather = {
      status: "ready",
      source: "Open-Meteo",
      currentTemp: data.current?.temperature_2m ?? hourly[0]?.temp ?? null,
      hourly,
      updatedAt: new Date().toISOString(),
      error: ""
    };
    localStorage.setItem("lightsout:weather", JSON.stringify(state.weather));
  } catch (error) {
    state.weather = cached || {
      status: "offline",
      source: "offline estimate",
      currentTemp: null,
      hourly: [],
      updatedAt: null,
      error: error.message
    };
  }
  renderWeatherDependentPanels();
}

function readCachedWeather() {
  try {
    const raw = localStorage.getItem("lightsout:weather");
    if (!raw) return null;
    const cached = JSON.parse(raw);
    const ageMs = Date.now() - new Date(cached.updatedAt).getTime();
    if (!Number.isFinite(ageMs) || ageMs > 1000 * 60 * 60 * 6) return null;
    return { ...cached, status: "cached" };
  } catch {
    return null;
  }
}

function getOutdoorTempAt(time) {
  if (!state.weather.hourly.length) return null;
  const target = new Date(`${formatDateKey()}T${time}:00`).getTime();
  let closest = null;
  state.weather.hourly.forEach((entry) => {
    const entryTime = new Date(entry.time).getTime();
    const diff = Math.abs(entryTime - target);
    if (!closest || diff < closest.diff) closest = { ...entry, diff };
  });
  return closest && closest.diff <= 1000 * 60 * 90 ? closest : null;
}

function getHvacPlan(event, room = getRoom(event.roomId)) {
  if (!event.needs.hvac || room.hvacKw <= 0) {
    return { lead: 0, stopDelay: 0, temp: null, mode: "none", confidence: "High", reason: "No HVAC requested." };
  }
  const forecast = getOutdoorTempAt(event.start);
  const temp = forecast?.apparent ?? forecast?.temp ?? null;
  const largeRoom = room.capacity >= 120;
  const highLoad = Number(event.students) / Math.max(1, room.capacity) > 0.65;
  let lead = 30;
  let stopDelay = 10;
  let mode = "standard";
  let confidence = state.weather.status === "ready" || state.weather.status === "cached" ? "High" : "Medium";
  let reason = "Using offline default HVAC warm-up.";

  if (Number.isFinite(temp)) {
    if (temp <= 38) {
      lead = 60;
      stopDelay = 15;
      mode = "heating";
      reason = `${Math.round(temp)} F apparent temperature requires a longer heating warm-up.`;
    } else if (temp <= 52) {
      lead = 50;
      stopDelay = 12;
      mode = "heating";
      reason = `${Math.round(temp)} F apparent temperature suggests early heating.`;
    } else if (temp <= 64) {
      lead = 35;
      stopDelay = 8;
      mode = "heating";
      reason = `${Math.round(temp)} F is mild-cool, so moderate warm-up is enough.`;
    } else if (temp < 76) {
      lead = 20;
      stopDelay = 5;
      mode = "ventilation";
      reason = `${Math.round(temp)} F is near comfort range; minimize preconditioning.`;
    } else if (temp < 86) {
      lead = 40;
      stopDelay = 12;
      mode = "cooling";
      reason = `${Math.round(temp)} F apparent temperature suggests cooling prep.`;
    } else {
      lead = 55;
      stopDelay = 15;
      mode = "cooling";
      reason = `${Math.round(temp)} F apparent temperature requires a longer cooling lead.`;
    }
  }

  if (largeRoom) lead += 10;
  if (highLoad) lead += 5;
  return {
    lead: clamp(lead, 15, 75),
    stopDelay,
    temp,
    mode,
    confidence,
    reason
  };
}

function eventsForRoom(roomId) {
  return state.events
    .filter((event) => event.roomId === roomId)
    .sort((a, b) => minutes(a.start) - minutes(b.start));
}

function activeEventsForRoom(roomId) {
  return eventsForRoom(roomId).filter((event) => {
    return minutes(event.start) <= state.previewMinute && minutes(event.end) > state.previewMinute;
  });
}

function soonEventsForRoom(roomId) {
  return eventsForRoom(roomId).filter((event) => {
    const start = minutes(event.start);
    return start > state.previewMinute && start <= state.previewMinute + 45;
  });
}

function getRoomStatus(roomId) {
  return getRoomLayerState(roomId).status;
}

function getRoomLayerState(roomId) {
  const enabled = getEnabledLayers();
  const activeSystems = new Set();
  const soonSystems = new Set();

  activeEventsForRoom(roomId).forEach((event) => {
    enabled.forEach((layer) => {
      if (getLayerNeed(event, layer)) activeSystems.add(layer);
    });
  });

  soonEventsForRoom(roomId).forEach((event) => {
    enabled.forEach((layer) => {
      if (getLayerNeed(event, layer)) soonSystems.add(layer);
    });
  });

  const active = [...activeSystems];
  const soon = [...soonSystems];
  const status = active.length ? "on" : soon.length ? "soon" : "off";
  const visible = active.length ? active : soon;
  const layerClass = visible.length > 1 ? "layers-both" : visible[0] === "hvac" ? "layers-hvac" : visible[0] === "lights" ? "layers-lights" : "layers-none";
  return { status, activeSystems: active, soonSystems: soon, visibleSystems: visible, layerClass };
}

function calculateEventImpact(event) {
  const room = getRoom(event.roomId);
  const kwh = energyModel ? predictEnergyKwh(event, room).kwh : estimateEnergyFormula(event, room);
  return { kwh, co2: kwh * CO2_KG_PER_KWH };
}

function estimateEnergyFormula(event, room) {
  const durationHours = Math.max(0, minutes(event.end) - minutes(event.start)) / 60;
  const warmupHours = event.needs.hvac ? 0.5 : 0;
  const lightingKwh = event.needs.lights ? room.lightsKw * durationHours : 0;
  const hvacKwh = event.needs.hvac ? room.hvacKw * (durationHours + warmupHours) : 0;
  const projectorKwh = event.needs.projector ? 0.28 * durationHours : 0;
  return lightingKwh + hvacKwh + projectorKwh;
}

function getEventFeatures(event, room) {
  const durationHours = Math.max(0, minutes(event.end) - minutes(event.start)) / 60;
  const occupancy = Math.min(1.4, Number(event.students) / Math.max(1, room.capacity));
  const startsAfterHours = minutes(event.start) < 8 * 60 || minutes(event.start) >= 15 * 60;
  const area = (room.w * room.d) / 26000;
  return [
    1,
    area,
    room.capacity / 420,
    durationHours / 4,
    occupancy,
    room.floor / 2,
    event.needs.lights ? 1 : 0,
    event.needs.hvac ? 1 : 0,
    event.needs.projector ? 1 : 0,
    startsAfterHours ? 1 : 0,
    room.capacity >= 120 ? 1 : 0
  ];
}

function syntheticTargetKwh(event, room) {
  const base = estimateEnergyFormula(event, room);
  const durationHours = Math.max(0, minutes(event.end) - minutes(event.start)) / 60;
  const occupancy = Number(event.students) / Math.max(1, room.capacity);
  const largePenalty = occupancy < 0.25 && room.capacity >= 120 ? durationHours * 1.15 : 0;
  const afterHoursPenalty = minutes(event.start) >= 15 * 60 || minutes(event.start) < 8 * 60 ? 0.35 : 0;
  const floorPenalty = room.floor > 1 && event.needs.hvac ? 0.16 * room.floor : 0;
  const roomTypePenalty = room.type === "Assembly" || room.type === "Cafeteria" ? 0.7 : room.type === "Outdoor" ? -0.9 : 0;
  return Math.max(0.05, base + largePenalty + afterHoursPenalty + floorPenalty + roomTypePenalty);
}

function trainEnergyModel() {
  const examples = [];
  const starts = ["07:15", "08:30", "14:45", "15:30", "17:00"];
  const durations = [45, 60, 90, 120];
  const attendanceRatios = [0.18, 0.35, 0.65, 0.9];

  ROOMS.forEach((room) => {
    starts.forEach((start) => {
      durations.forEach((duration) => {
        attendanceRatios.forEach((ratio, index) => {
          const startMinute = minutes(start);
          const end = timeFromMinutes(startMinute + duration);
          const event = {
            roomId: room.id,
            start,
            end,
            students: Math.max(4, Math.round(room.capacity * ratio)),
            needs: {
              lights: true,
              hvac: room.type !== "Outdoor" && index !== 0,
              projector: ["Classroom", "Competition", "Prep Room", "Operations"].includes(room.type) && index % 2 === 0
            }
          };
          examples.push({
            x: getEventFeatures(event, room),
            y: syntheticTargetKwh(event, room)
          });
        });
      });
    });
  });

  const weights = new Array(MODEL_FEATURES.length).fill(0);
  const rate = 0.018;
  let loss = 0;
  for (let epoch = 0; epoch < 520; epoch += 1) {
    const gradient = new Array(weights.length).fill(0);
    loss = 0;
    examples.forEach((example) => {
      const prediction = dot(weights, example.x);
      const error = prediction - example.y;
      loss += error * error;
      example.x.forEach((value, index) => {
        gradient[index] += error * value;
      });
    });
    weights.forEach((_, index) => {
      weights[index] -= (rate * gradient[index]) / examples.length;
    });
    loss /= examples.length;
  }

  energyModel = {
    weights,
    examples: examples.length,
    rmse: Math.sqrt(loss)
  };
}

function dot(weights, features) {
  return features.reduce((sum, value, index) => sum + value * weights[index], 0);
}

function predictEnergyKwh(event, room = getRoom(event.roomId)) {
  const features = getEventFeatures(event, room);
  const raw = dot(energyModel.weights, features);
  const formula = estimateEnergyFormula(event, room);
  const kwh = Math.max(0.05, raw);
  const spread = Math.abs(kwh - formula);
  const confidence = spread < 1.5 ? "High" : spread < 3.5 ? "Medium" : "Low";
  return { kwh, confidence, spread };
}

function getRoomMoveRecommendations() {
  return state.events.map((event) => {
    const room = getRoom(event.roomId);
    const current = predictEnergyKwh(event, room).kwh;
    const alternate = ROOMS
      .filter((candidate) => candidate.id !== room.id)
      .filter((candidate) => candidate.floor === room.floor)
      .filter((candidate) => candidate.capacity >= Number(event.students))
      .filter((candidate) => candidate.capacity <= Math.max(Number(event.students) * 2.4, 34))
      .map((candidate) => {
        const moved = { ...event, roomId: candidate.id };
        return { room: candidate, kwh: predictEnergyKwh(moved, candidate).kwh };
      })
      .sort((a, b) => a.kwh - b.kwh)[0];
    if (!alternate) return null;
    const savingsKwh = current - alternate.kwh;
    return {
      event,
      currentRoom: room,
      alternateRoom: alternate.room,
      savingsKwh,
      savingsCo2: savingsKwh * CO2_KG_PER_KWH
    };
  }).filter(Boolean).sort((a, b) => b.savingsKwh - a.savingsKwh);
}

function estimateTimingSavingsKwh(event, room = getRoom(event.roomId)) {
  const avoidedRunHours = 15 / 60;
  const lighting = event.needs.lights ? room.lightsKw * avoidedRunHours : 0;
  const hvac = event.needs.hvac ? room.hvacKw * avoidedRunHours : 0;
  const projector = event.needs.projector ? 0.28 * avoidedRunHours : 0;
  return lighting + hvac + projector;
}

function estimateAiSavings() {
  const moveRecommendations = getRoomMoveRecommendations().filter((candidate) => candidate.savingsKwh > 0.8);
  const moveKwh = moveRecommendations.reduce((sum, candidate) => sum + candidate.savingsKwh, 0);
  const timingKwh = state.events.reduce((sum, event) => sum + estimateTimingSavingsKwh(event), 0);
  const totalKwh = moveKwh + timingKwh;
  return {
    moveRecommendations,
    moveKwh,
    timingKwh,
    totalKwh,
    moveCo2: moveKwh * CO2_KG_PER_KWH,
    timingCo2: timingKwh * CO2_KG_PER_KWH,
    totalCo2: totalKwh * CO2_KG_PER_KWH
  };
}

function analyzeSchedule() {
  const activeRoomIds = new Set(state.events.map((event) => event.roomId));
  const totalKwh = state.events.reduce((sum, event) => sum + calculateEventImpact(event).kwh, 0);
  const lightsOnNow = ROOMS.filter((room) => getRoomStatus(room.id) === "on").length;
  const neededSoon = ROOMS.filter((room) => getRoomStatus(room.id) === "soon").length;
  const actions = buildActions();
  const aiSavings = estimateAiSavings();
  return {
    activeRooms: activeRoomIds.size,
    layerRoomsNow: lightsOnNow,
    neededSoon,
    totalKwh,
    totalCo2: totalKwh * CO2_KG_PER_KWH,
    aiSavings,
    actions
  };
}

function buildActions() {
  const actions = [];
  state.events.forEach((event) => {
    const room = getRoom(event.roomId);
    const systems = getSystemsForEvent(event);
    if (!systems.length) return;
    const systemText = systems.map((system) => system === "hvac" ? "heat/cooling" : "lights").join(", ");
    const hvacPlan = getHvacPlan(event, room);
    const prepLead = systems.includes("hvac") ? hvacPlan.lead : 10;
    const prediction = predictEnergyKwh(event, room);
    const weatherText = systems.includes("hvac") ? ` ${hvacPlan.reason}` : "";

    actions.push({
      time: timeFromMinutes(minutes(event.start) - prepLead),
      sort: minutes(event.start) - prepLead,
      title: `Prep ${room.name}`,
      detail: `${event.name}: ${systemText} for ${event.students} students. AI estimate: ${prediction.kwh.toFixed(1)} kWh.${weatherText}`,
      confidence: systems.includes("hvac") ? hvacPlan.confidence : prediction.confidence,
      status: "Start"
    });

    actions.push({
      time: timeFromMinutes(minutes(event.end) + (systems.includes("hvac") ? hvacPlan.stopDelay : 10)),
      sort: minutes(event.end) + (systems.includes("hvac") ? hvacPlan.stopDelay : 10),
      title: systems.includes("hvac") ? `Set back ${room.name}` : `Turn off ${room.name}`,
      detail: systems.includes("hvac")
        ? `${event.name} ends at ${formatTime(event.end)}. Set HVAC back after ${hvacPlan.stopDelay} minutes if the room is empty.`
        : `${event.name} ends at ${formatTime(event.end)}. Check that the room is empty first.`,
      confidence: "High",
      status: "Stop"
    });
  });

  return actions.sort((a, b) => a.sort - b.sort);
}

function loadEvents() {
  const stored = localStorage.getItem(storageKey());
  const loaded = stored ? JSON.parse(stored) : cloneDefaultEvents();
  state.events = loaded.filter((event) => getRoom(event.roomId));
  if (!getRoom(state.selectedRoomId)) state.selectedRoomId = ROOMS[0].id;
  if (stored && state.events.length !== loaded.length) saveEvents();
}

function saveEvents() {
  localStorage.setItem(storageKey(), JSON.stringify(state.events));
}

function roomOptionLabel(room) {
  return `${room.name} - Floor ${room.floor}`;
}

function roomDetailLabel(room) {
  return `${room.zone} - ${room.type} - capacity ${room.capacity}`;
}

function findRoomFromSearch(value, allowFuzzy = false) {
  const query = value.trim().toLowerCase();
  if (!query) return null;
  const exact = ROOMS.find((room) => {
    const options = [
      roomOptionLabel(room),
      room.name,
      room.id,
      `${room.name} floor ${room.floor}`
    ].map((item) => item.toLowerCase());
    return options.includes(query);
  });
  if (exact || !allowFuzzy) return exact || null;
  const matches = ROOMS.filter((room) => {
    return roomOptionLabel(room).toLowerCase().includes(query)
      || room.zone.toLowerCase().includes(query)
      || room.type.toLowerCase().includes(query);
  });
  return matches.length === 1 ? matches[0] : null;
}

function updateRoomHint(room, isError = false) {
  const hint = $("#roomHint");
  hint.textContent = room ? roomDetailLabel(room) : "Search by room name, wing, or space type.";
  hint.classList.toggle("is-error", isError);
}

function setRoomPicker(roomId) {
  const room = getRoom(roomId);
  if (!room) return;
  $("#roomSelect").value = room.id;
  $("#roomSearch").value = roomOptionLabel(room);
  $("#roomSearch").setCustomValidity("");
  updateRoomHint(room);
}

function resolveRoomSearch(allowFuzzy = false) {
  const input = $("#roomSearch");
  const room = findRoomFromSearch(input.value, allowFuzzy);
  if (room) {
    state.selectedRoomId = room.id;
    setRoomPicker(room.id);
    return true;
  }
  $("#roomSelect").value = "";
  input.setCustomValidity("Choose a room from the search results.");
  updateRoomHint(null, true);
  $("#roomHint").textContent = "Choose one matching room from the search results.";
  return false;
}

function renderRoomOptions() {
  $("#roomList").innerHTML = ROOMS.map((room) => {
    return `<option value="${roomOptionLabel(room)}"></option>`;
  }).join("");
  setRoomPicker(state.selectedRoomId);
}

function renderModel() {
  const model = $("#schoolModel");
  updateModelTransform();
  if (!state.modelBuilt) {
    const floorPlates = `
      <span class="floor-plate floor-one">
        <span class="floor-wing top-wing"></span>
        <span class="floor-wing left-wing"></span>
        <span class="floor-wing bottom-wing"></span>
        <span class="floor-wing right-stub"></span>
        <span class="courtyard-cutout">Courtyard</span>
        <span class="floor-label">Floor 1</span>
      </span>
      <span class="floor-plate floor-two">
        <span class="floor-wing top-wing"></span>
        <span class="floor-wing left-wing"></span>
        <span class="floor-wing bottom-wing"></span>
        <span class="floor-wing right-stub"></span>
        <span class="floor-label">Floor 2</span>
      </span>
    `;
    const rooms = ROOMS.map((room) => {
      const floorZ = (room.floor - 1) * 118;
      return `
      <div class="room-block"
        style="--x:${room.x}px; --z:${room.z}px; --w:${room.w}px; --d:${room.d}px; --h:${room.h}px; --floor-z:${floorZ}px;"
        data-room-id="${room.id}">
        <span class="room-top"></span>
        <span class="room-front"></span>
        <span class="room-back"></span>
        <span class="room-left"></span>
        <span class="room-side"></span>
        <button class="room-label" type="button" data-room-id="${room.id}">${room.name}</button>
      </div>
    `;
    }).join("");
    model.innerHTML = floorPlates + rooms;
    state.modelBuilt = true;
  }

  ROOMS.forEach((room) => {
    const block = model.querySelector(`.room-block[data-room-id="${room.id}"]`);
    const label = block.querySelector(".room-label");
    const layerState = getRoomLayerState(room.id);
    const active = activeEventsForRoom(room.id).find((event) => getSystemsForEvent(event).length);
    const soon = soonEventsForRoom(room.id).find((event) => getSystemsForEvent(event).length);
    const note = active ? `${active.name} is active now` : soon ? `${soon.name} starts at ${formatTime(soon.start)}` : "selected layers off";
    block.className = `room-block status-${layerState.status} ${layerState.layerClass} ${state.selectedRoomId === room.id ? "selected" : ""}`;
    label.setAttribute("aria-label", `${room.name}: ${note}`);
  });
}

function renderFocusStrip() {
  const room = getRoom(state.selectedRoomId);
  const layerState = getRoomLayerState(room.id);
  const status = layerState.status;
  const active = activeEventsForRoom(room.id).filter((event) => getSystemsForEvent(event).length);
  const soon = soonEventsForRoom(room.id).filter((event) => getSystemsForEvent(event).length);
  const roomEvents = eventsForRoom(room.id);
  const next = active[0] || soon[0] || roomEvents.find((event) => minutes(event.start) > state.previewMinute && getSystemsForEvent(event).length);
  const activeLabels = layerState.activeSystems.map(getLayerLabel).join(" + ");
  const soonLabels = layerState.soonSystems.map(getLayerLabel).join(" + ");
  const statusText = status === "on" ? `${activeLabels} on now` : status === "soon" ? `${soonLabels} needed soon` : "Selected layers off";
  const detail = next
    ? `${next.name}: ${formatTime(next.start)}-${formatTime(next.end)} with ${next.students} students.`
    : "No scheduled use for the selected layers in this room today.";
  const systems = next ? getSystemsForEvent(next).map(getLayerLabel) : [];

  $("#focusStrip").innerHTML = `
    <div>
      <h3>${room.name} - ${statusText}</h3>
      <p>Floor ${room.floor} - ${room.zone} - ${room.type} - capacity ${room.capacity}. ${detail}</p>
    </div>
    <div class="focus-meta">
      <span class="pill ${status === "on" ? "amber" : status === "soon" ? "blue" : "green"}">${statusText}</span>
      ${systems.map((system) => `<span class="pill blue">${system}</span>`).join("")}
    </div>
  `;
}

function renderKpis(analysis) {
  $("#kpiStrip").innerHTML = `
    <div class="kpi"><span>On now</span><strong>${analysis.layerRoomsNow}</strong></div>
    <div class="kpi"><span>Soon</span><strong>${analysis.neededSoon}</strong></div>
    <div class="kpi"><span>CO2</span><strong>${analysis.totalCo2.toFixed(1)} kg</strong></div>
    <div class="kpi kpi-savings"><span>AI saved</span><strong>${analysis.aiSavings.totalCo2.toFixed(1)} kg</strong></div>
  `;
}

function renderWeatherPanel() {
  const status = state.weather.status;
  const temp = Number.isFinite(state.weather.currentTemp) ? `${Math.round(state.weather.currentTemp)} F` : "Offline";
  const source = status === "ready" ? state.weather.source : status === "cached" ? "cached forecast" : "offline fallback";
  const detail = status === "offline"
    ? "Using default HVAC lead times until weather is available."
    : `Using ${source} for weather-aware HVAC warm-up and setback timing.`;
  $("#weatherPanel").innerHTML = `
    <article class="weather-card ${status === "offline" ? "offline" : ""}">
      <div>
        <span>Outdoor weather</span>
        <strong>${temp}</strong>
      </div>
      <p>${detail}</p>
    </article>
  `;
}

function renderActions(actions) {
  const list = $("#actionList");
  if (!actions.length) {
    list.innerHTML = $("#emptyStateTemplate").innerHTML;
    return;
  }
  list.innerHTML = actions.map((action) => `
    <article class="action-card">
      <div class="time-chip">${formatTime(action.time)}</div>
      <div>
        <h3>${action.title}</h3>
        <p>${action.detail}</p>
        <div class="systems">
          <span class="pill ${action.status === "Start" ? "blue" : "green"}">${action.status}</span>
          <span class="pill ${action.confidence === "High" ? "green" : "amber"}">${action.confidence} confidence</span>
        </div>
      </div>
    </article>
  `).join("");
}

function buildModelInsights(analysis) {
  const insights = [{
    title: "Local AI model trained",
    detail: `Trained in this browser on ${energyModel.examples} synthetic AKHS room-use scenarios. Current validation error is about ${energyModel.rmse.toFixed(2)} kWh RMSE.`,
    tone: "blue"
  }];

  if (!state.events.length) {
    insights[0].detail += " Add a club or meeting and it will estimate energy, flag low-occupancy rooms, and suggest room moves.";
    return insights;
  }

  if (analysis.aiSavings.totalKwh > 0) {
    insights.push({
      title: "AI CO2 savings estimate",
      detail: `Following the timing checklist and room recommendations could avoid about ${analysis.aiSavings.totalCo2.toFixed(1)} kg CO2 (${analysis.aiSavings.totalKwh.toFixed(1)} kWh): ${analysis.aiSavings.timingCo2.toFixed(1)} kg from cleaner shutoff timing and ${analysis.aiSavings.moveCo2.toFixed(1)} kg from room choices.`,
      tone: "green"
    });
  }

  const bestMove = analysis.aiSavings.moveRecommendations[0];
  if (bestMove) {
    insights.push({
      title: `Move ${bestMove.event.name} to ${bestMove.alternateRoom.name}`,
      detail: `${bestMove.currentRoom.name} is oversized for ${bestMove.event.students} students. Same-floor move could save about ${bestMove.savingsKwh.toFixed(1)} kWh / ${bestMove.savingsCo2.toFixed(1)} kg CO2.`,
      tone: "amber"
    });
  }

  const floorGroups = new Map();
  state.events.forEach((event) => {
    const room = getRoom(event.roomId);
    if (!floorGroups.has(room.floor)) floorGroups.set(room.floor, []);
    floorGroups.get(room.floor).push(event);
  });
  floorGroups.forEach((events, floor) => {
    const afterSchool = events.filter((event) => minutes(event.start) >= 15 * 60);
    if (afterSchool.length >= 2) {
      insights.push({
        title: `Batch Floor ${floor} after-school checks`,
        detail: `${afterSchool.length} activities are on the same floor after school. Custodians can check that floor as one route.`,
        tone: "blue"
      });
    }
  });

  if (analysis.totalKwh > 18) {
    insights.push({
      title: "High-energy day",
      detail: "The model expects a heavier energy load today. Prioritize exact shutoff times for large rooms and HVAC zones.",
      tone: "amber"
    });
  }

  return insights.slice(0, 4);
}

function renderModelInsights(analysis) {
  $("#modelInsights").innerHTML = buildModelInsights(analysis).map((insight) => `
    <article class="model-card ${insight.tone}">
      <h3>${insight.title}</h3>
      <p>${insight.detail}</p>
    </article>
  `).join("");
}

function renderWeatherDependentPanels() {
  const analysis = analyzeSchedule();
  renderKpis(analysis);
  renderWeatherPanel();
  renderActions(analysis.actions);
  renderModelInsights(analysis);
}

function renderScheduleList() {
  const list = $("#scheduleList");
  const events = [...state.events].sort((a, b) => minutes(a.start) - minutes(b.start));
  if (!events.length) {
    list.innerHTML = $("#emptyStateTemplate").innerHTML;
    return;
  }
  list.innerHTML = events.map((event) => {
    const room = getRoom(event.roomId);
    const systems = [
      event.needs.lights && "Lights",
      event.needs.hvac && "HVAC",
      event.needs.projector && "Projector"
    ].filter(Boolean).join(" - ");
    return `
      <article class="schedule-card">
        <div class="schedule-main">
          <div>
            <strong>${event.name}</strong>
            <p>${formatTime(event.start)}-${formatTime(event.end)} - ${room.name} - Floor ${room.floor} - ${event.students} students</p>
            <p>${systems || "No systems selected"}</p>
          </div>
          <span class="pill ${event.priority === "normal" ? "green" : "amber"}">${event.priority}</span>
        </div>
        <div class="card-actions">
          <button type="button" data-edit="${event.id}">Edit</button>
          <button type="button" data-room-jump="${room.id}">Show</button>
          <button class="delete" type="button" data-delete="${event.id}">Delete</button>
        </div>
      </article>
    `;
  }).join("");
}

function render() {
  $("#timeReadout").textContent = formatTime(timeFromMinutes(state.previewMinute));
  $("#timeSlider").value = state.previewMinute;
  $("#layerLights").checked = state.layers.lights;
  $("#layerHvac").checked = state.layers.hvac;
  renderSideTabs();
  const analysis = analyzeSchedule();
  renderModel();
  renderFocusStrip();
  renderKpis(analysis);
  renderWeatherPanel();
  renderActions(analysis.actions);
  renderModelInsights(analysis);
  renderScheduleList();
}

function requestRender() {
  if (state.renderPending) return;
  state.renderPending = true;
  window.requestAnimationFrame(() => {
    state.renderPending = false;
    render();
  });
}

function resetForm() {
  $("#editingId").value = "";
  $("#activityName").value = "";
  setRoomPicker(state.selectedRoomId);
  $("#startTime").value = "15:30";
  $("#endTime").value = "16:30";
  $("#students").value = "20";
  $("#priority").value = "normal";
  $("#needLights").checked = true;
  $("#needHvac").checked = true;
  $("#needProjector").checked = false;
  $("#saveEvent").textContent = "Save";
}

function fillForm(event) {
  setSideTab("add");
  state.selectedRoomId = event.roomId;
  $("#editingId").value = event.id;
  $("#activityName").value = event.name;
  setRoomPicker(event.roomId);
  $("#startTime").value = event.start;
  $("#endTime").value = event.end;
  $("#students").value = event.students;
  $("#priority").value = event.priority;
  $("#needLights").checked = event.needs.lights;
  $("#needHvac").checked = event.needs.hvac;
  $("#needProjector").checked = event.needs.projector;
  $("#saveEvent").textContent = "Update";
  render();
}

function selectRoom(roomId) {
  state.selectedRoomId = roomId;
  setRoomPicker(roomId);
  render();
}

function updateModelTransform() {
  const model = $("#schoolModel");
  model.style.setProperty("--rotation", `${state.rotation}deg`);
  model.style.setProperty("--pitch", `${state.pitch}deg`);
}

function setSideTab(tab) {
  state.activeSideTab = tab;
  renderSideTabs();
}

function renderSideTabs() {
  document.querySelectorAll("[data-side-tab]").forEach((button) => {
    const active = button.dataset.sideTab === state.activeSideTab;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    const active = panel.id === `${state.activeSideTab}Panel`;
    panel.classList.toggle("active", active);
    panel.hidden = !active;
  });
}

function pickRoomFromPoint(clientX, clientY) {
  let best = null;
  document.querySelectorAll(".room-label").forEach((label) => {
    const rect = label.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distance = Math.hypot(centerX - clientX, centerY - clientY);
    if (!best || distance < best.distance) {
      best = { roomId: label.dataset.roomId, distance };
    }
  });
  return best && best.distance < 80 ? best.roomId : null;
}

function bindEvents() {
  $("#planDate").addEventListener("change", (event) => {
    state.date = event.target.value;
    loadEvents();
    render();
  });

  $("#timeSlider").addEventListener("input", (event) => {
    state.previewMinute = Number(event.target.value);
    requestRender();
  });

  $("#layerLights").addEventListener("change", (event) => {
    state.layers.lights = event.target.checked;
    if (!state.layers.lights && !state.layers.hvac) state.layers.hvac = true;
    render();
  });

  $("#layerHvac").addEventListener("change", (event) => {
    state.layers.hvac = event.target.checked;
    if (!state.layers.lights && !state.layers.hvac) state.layers.lights = true;
    render();
  });

  $("#resetDemo").addEventListener("click", () => {
    state.events = cloneDefaultEvents().map((event) => ({ ...event, id: createId() }));
    state.selectedRoomId = "courtyard";
    state.previewMinute = 7 * 60 + 45;
    state.layers = { lights: true, hvac: true };
    state.rotation = -36;
    state.pitch = 60;
    state.activeSideTab = "checklist";
    saveEvents();
    resetForm();
    render();
  });

  $("#addEvent").addEventListener("click", () => {
    setSideTab("add");
    resetForm();
    $("#activityName").focus();
  });

  $("#checklistTab").addEventListener("click", () => {
    setSideTab("checklist");
  });

  $("#cancelEdit").addEventListener("click", () => {
    resetForm();
    setSideTab("checklist");
  });

  $("#roomSearch").addEventListener("input", () => {
    const room = findRoomFromSearch($("#roomSearch").value);
    if (!room) {
      $("#roomSelect").value = "";
      $("#roomSearch").setCustomValidity("");
      updateRoomHint(null);
      return;
    }
    state.selectedRoomId = room.id;
    setRoomPicker(room.id);
    render();
  });

  $("#roomSearch").addEventListener("blur", () => {
    resolveRoomSearch(true);
  });

  $("#eventForm").addEventListener("submit", (event) => {
    event.preventDefault();
    if (!resolveRoomSearch(true)) {
      $("#roomSearch").reportValidity();
      return;
    }
    const start = $("#startTime").value;
    const end = $("#endTime").value;
    if (minutes(end) <= minutes(start)) {
      $("#endTime").setCustomValidity("End time must be after start time.");
      $("#endTime").reportValidity();
      return;
    }
    $("#endTime").setCustomValidity("");

    const id = $("#editingId").value || createId();
    const next = {
      id,
      name: $("#activityName").value.trim(),
      roomId: $("#roomSelect").value,
      start,
      end,
      students: Number($("#students").value),
      priority: $("#priority").value,
      needs: {
        lights: $("#needLights").checked,
        hvac: $("#needHvac").checked,
        projector: $("#needProjector").checked
      }
    };

    const existingIndex = state.events.findIndex((item) => item.id === id);
    if (existingIndex >= 0) {
      state.events.splice(existingIndex, 1, next);
    } else {
      state.events.push(next);
    }
    state.selectedRoomId = next.roomId;
    saveEvents();
    resetForm();
    setSideTab("checklist");
    render();
  });

  $("#scheduleList").addEventListener("click", (event) => {
    const editId = event.target.dataset.edit;
    const deleteId = event.target.dataset.delete;
    const roomJump = event.target.dataset.roomJump;
    if (editId) {
      const item = state.events.find((entry) => entry.id === editId);
      fillForm(item);
    }
    if (deleteId) {
      state.events = state.events.filter((entry) => entry.id !== deleteId);
      saveEvents();
      render();
    }
    if (roomJump) {
      selectRoom(roomJump);
    }
  });

  $("#schoolModel").addEventListener("click", (event) => {
    const roomHit = event.target.closest("[data-room-id]");
    const roomId = roomHit && roomHit.dataset.roomId;
    if (roomId) selectRoom(roomId);
  });

  $("#rotateLeft").addEventListener("click", () => {
    state.rotation -= 18;
    updateModelTransform();
  });

  $("#rotateRight").addEventListener("click", () => {
    state.rotation += 18;
    updateModelTransform();
  });

  $("#tiltUp").addEventListener("click", () => {
    state.pitch = clamp(state.pitch + 6, 46, 72);
    updateModelTransform();
  });

  $("#tiltDown").addEventListener("click", () => {
    state.pitch = clamp(state.pitch - 6, 46, 72);
    updateModelTransform();
  });

  $("#resetView").addEventListener("click", () => {
    state.rotation = -36;
    state.pitch = 60;
    updateModelTransform();
  });

  const viewport = $(".campus-viewport");
  viewport.addEventListener("click", (event) => {
    if (state.wasDragClick) return;
    const roomId = pickRoomFromPoint(event.clientX, event.clientY);
    if (roomId) {
      event.preventDefault();
      event.stopPropagation();
      selectRoom(roomId);
    }
  }, true);

  viewport.addEventListener("pointerdown", (event) => {
    state.dragging = true;
    state.dragMoved = false;
    state.dragStartX = event.clientX;
    state.dragStartY = event.clientY;
    state.dragStartRotation = state.rotation;
    state.dragStartPitch = state.pitch;
    $("#schoolModel").classList.add("is-dragging");
    viewport.setPointerCapture(event.pointerId);
  });

  viewport.addEventListener("pointermove", (event) => {
    if (!state.dragging) return;
    const deltaX = event.clientX - state.dragStartX;
    const deltaY = event.clientY - state.dragStartY;
    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) state.dragMoved = true;
    state.rotation = state.dragStartRotation - deltaX * 0.28;
    state.pitch = clamp(state.dragStartPitch - deltaY * 0.08, 46, 72);
    if (!state.framePending) {
      state.framePending = true;
      window.requestAnimationFrame(() => {
        state.framePending = false;
        updateModelTransform();
      });
    }
  });

  viewport.addEventListener("pointerup", () => {
    state.wasDragClick = state.dragMoved;
    state.dragging = false;
    $("#schoolModel").classList.remove("is-dragging");
    window.setTimeout(() => {
      state.wasDragClick = false;
    }, 0);
  });

  viewport.addEventListener("pointercancel", () => {
    state.dragging = false;
    $("#schoolModel").classList.remove("is-dragging");
  });
}

function init() {
  trainEnergyModel();
  $("#planDate").value = state.date;
  $("#timeSlider").value = state.previewMinute;
  renderRoomOptions();
  loadEvents();
  resetForm();
  bindEvents();
  render();
  loadWeatherForecast();
}

init();
