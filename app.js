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
  { id: "a220", name: "A220 Prep", floor: 2, zone: "A Wing", capacity: 48, type: "Prep Room", lightsKw: 0.66, hvacKw: 3.8, x: 440, z: 78, w: 92, d: 60, h: 38 },
  { id: "media", name: "Media Center", floor: 3, zone: "Third Floor", capacity: 120, type: "Library", lightsKw: 1.4, hvacKw: 5.6, x: 276, z: 190, w: 160, d: 96, h: 48 },
  { id: "tab", name: "Tab Room", floor: 3, zone: "Third Floor", capacity: 42, type: "Operations", lightsKw: 0.62, hvacKw: 3.2, x: 454, z: 194, w: 90, d: 74, h: 40 },
  { id: "judges", name: "Judges Lounge", floor: 3, zone: "Third Floor", capacity: 64, type: "Lounge", lightsKw: 0.82, hvacKw: 4.2, x: 178, z: 190, w: 92, d: 82, h: 40 },
  { id: "c309", name: "C309 Senate", floor: 3, zone: "C Wing", capacity: 56, type: "Competition", lightsKw: 0.72, hvacKw: 3.9, x: 360, z: 330, w: 104, d: 60, h: 38 },
  { id: "c311", name: "C311 Congress", floor: 3, zone: "C Wing", capacity: 56, type: "Competition", lightsKw: 0.72, hvacKw: 3.9, x: 484, z: 330, w: 110, d: 60, h: 38 }
];

const DEFAULT_EVENTS = [];

const state = {
  date: new Date().toISOString().slice(0, 10),
  events: [],
  selectedRoomId: "media",
  previewMinute: 7 * 60 + 45,
  rotation: -36,
  pitch: 60,
  layers: {
    lights: true,
    hvac: true
  },
  activeSideTab: "checklist",
  dragging: false,
  dragMoved: false,
  wasDragClick: false,
  dragStartX: 0,
  dragStartY: 0,
  dragStartRotation: -36,
  dragStartPitch: 60
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
  return { kwh, co2: kwh * 0.385 };
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
    room.floor / 3,
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
  for (let epoch = 0; epoch < 900; epoch += 1) {
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

function analyzeSchedule() {
  const activeRoomIds = new Set(state.events.map((event) => event.roomId));
  const totalKwh = state.events.reduce((sum, event) => sum + calculateEventImpact(event).kwh, 0);
  const lightsOnNow = ROOMS.filter((room) => getRoomStatus(room.id) === "on").length;
  const neededSoon = ROOMS.filter((room) => getRoomStatus(room.id) === "soon").length;
  const actions = buildActions();
  return {
    activeRooms: activeRoomIds.size,
    layerRoomsNow: lightsOnNow,
    neededSoon,
    totalKwh,
    totalCo2: totalKwh * 0.385,
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
    const prepLead = systems.includes("hvac") ? 30 : 10;
    const prediction = predictEnergyKwh(event, room);

    actions.push({
      time: timeFromMinutes(minutes(event.start) - prepLead),
      sort: minutes(event.start) - prepLead,
      title: `Prep ${room.name}`,
      detail: `${event.name}: ${systemText} for ${event.students} students. AI estimate: ${prediction.kwh.toFixed(1)} kWh.`,
      confidence: prediction.confidence,
      status: "Start"
    });

    actions.push({
      time: timeFromMinutes(minutes(event.end) + 10),
      sort: minutes(event.end) + 10,
      title: `Turn off ${room.name}`,
      detail: `${event.name} ends at ${formatTime(event.end)}. Check that the room is empty first.`,
      confidence: "High",
      status: "Stop"
    });
  });

  return actions.sort((a, b) => a.sort - b.sort);
}

function loadEvents() {
  const stored = localStorage.getItem(storageKey());
  state.events = stored ? JSON.parse(stored) : cloneDefaultEvents();
}

function saveEvents() {
  localStorage.setItem(storageKey(), JSON.stringify(state.events));
}

function renderRoomOptions() {
  $("#roomSelect").innerHTML = ROOMS.map((room) => {
    return `<option value="${room.id}">${room.name} - Floor ${room.floor} - ${room.type} - cap ${room.capacity}</option>`;
  }).join("");
}

function renderModel() {
  const model = $("#schoolModel");
  updateModelTransform();
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
    <span class="floor-plate floor-three">
      <span class="floor-wing top-wing"></span>
      <span class="floor-wing left-wing"></span>
      <span class="floor-wing bottom-wing"></span>
      <span class="floor-wing right-stub"></span>
      <span class="floor-label">Floor 3</span>
    </span>
  `;
  const rooms = ROOMS.map((room) => {
    const layerState = getRoomLayerState(room.id);
    const active = activeEventsForRoom(room.id).find((event) => getSystemsForEvent(event).length);
    const soon = soonEventsForRoom(room.id).find((event) => getSystemsForEvent(event).length);
    const note = active ? `${active.name} is active now` : soon ? `${soon.name} starts at ${formatTime(soon.start)}` : "selected layers off";
    const floorZ = (room.floor - 1) * 118;
    return `
      <div class="room-block status-${layerState.status} ${layerState.layerClass} ${state.selectedRoomId === room.id ? "selected" : ""}"
        style="--x:${room.x}px; --z:${room.z}px; --w:${room.w}px; --d:${room.d}px; --h:${room.h}px; --floor-z:${floorZ}px;"
        data-room-id="${room.id}">
        <span class="room-top"></span>
        <span class="room-front"></span>
        <span class="room-back"></span>
        <span class="room-left"></span>
        <span class="room-side"></span>
        <button class="room-label" type="button" aria-label="${room.name}: ${note}" data-room-id="${room.id}">${room.name}</button>
      </div>
    `;
  }).join("");
  model.innerHTML = floorPlates + rooms;
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
    insights.push({
      title: "Ready for a real schedule",
      detail: "Add a club or meeting and the model will estimate energy, flag low-occupancy rooms, and suggest room moves.",
      tone: "green"
    });
    return insights;
  }

  const moveCandidates = state.events.map((event) => {
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
    return alternate ? { event, currentRoom: room, alternateRoom: alternate.room, savings: current - alternate.kwh } : null;
  }).filter(Boolean).sort((a, b) => b.savings - a.savings);

  const bestMove = moveCandidates.find((candidate) => candidate.savings > 0.8);
  if (bestMove) {
    insights.push({
      title: `Move ${bestMove.event.name} to ${bestMove.alternateRoom.name}`,
      detail: `${bestMove.currentRoom.name} is oversized for ${bestMove.event.students} students. Same-floor move could save about ${bestMove.savings.toFixed(1)} kWh.`,
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
  renderActions(analysis.actions);
  renderModelInsights(analysis);
  renderScheduleList();
}

function resetForm() {
  $("#editingId").value = "";
  $("#activityName").value = "";
  $("#roomSelect").value = state.selectedRoomId;
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
  $("#roomSelect").value = event.roomId;
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
  $("#roomSelect").value = roomId;
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
    render();
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
    state.selectedRoomId = "media";
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

  $("#roomSelect").addEventListener("change", (event) => {
    state.selectedRoomId = event.target.value;
    render();
  });

  $("#eventForm").addEventListener("submit", (event) => {
    event.preventDefault();
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
    updateModelTransform();
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
}

init();
