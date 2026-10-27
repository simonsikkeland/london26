/* Program, kart og lister. Innholdet kommer fra data.js. */

const $ = (sel, root = document) => root.querySelector(sel);
const byId = Object.fromEntries(PLACES.map((p) => [p.id, p]));

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function mapsUrl(p) {
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(`${p.name}, ${p.addr}`);
}

function directionsUrl(p, mode = "transit") {
  return "https://www.google.com/maps/dir/?api=1&travelmode=" + mode + "&destination=" + encodeURIComponent(`${p.name}, ${p.addr}`);
}

// Luftlinje i meter
function distance(a, b) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Grovt estimat: gatenett ~1.3x luftlinje, 80 m/min
function walkText(from, to) {
  const m = distance(from, to) * 1.3;
  if (m > 3500) return `${(m / 1000).toFixed(1)} km`;
  return `${Math.max(1, Math.round(m / 80))} min gange`;
}

function distLine(p) {
  if (p.cat === "base" && p.id !== "stadium") return "";
  const parts = [];
  if (p.id !== "hotel") parts.push(`${walkText(byId.hotel, p)} fra hotellet`);
  if (p.id !== "marius") parts.push(`${walkText(byId.marius, p)} fra Marius`);
  return parts.join(" · ");
}

/* ---------- Tabs ---------- */
const PANELS = ["program", "kart", "mat", "gjore", "cupen", "praktisk"];
let map;

function showPanel() {
  const hash = location.hash.slice(1);
  // Delte cup-lenker ser ut som #cup=...
  const id = hash.startsWith("cup=") ? "cupen" : PANELS.includes(hash) ? hash : "program";
  document.querySelectorAll(".panel").forEach((el) => el.classList.toggle("active", el.id === id));
  document.querySelectorAll(".tabs a").forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + id));
  const active = $(`.tabs a[href="#${id}"]`);
  if (active) {
    // Rull bare fanemenyen sidelengs, ikke hele siden
    const tabs = $("#tabs");
    tabs.scrollLeft = active.offsetLeft - (tabs.clientWidth - active.offsetWidth) / 2;
  }
  if (id === "kart") initMap();
}

function onTabClick(e) {
  const a = e.target.closest("a");
  if (!a) return;
  e.preventDefault();
  history.pushState(null, "", a.getAttribute("href"));
  showPanel();
  window.scrollTo({ top: $(".hero").offsetHeight, behavior: "smooth" });
}

/* ---------- Nedtelling ---------- */
function renderCountdown() {
  const el = $("#countdown");
  const kickoff = new Date(TRIP.kickoff);
  const start = new Date(TRIP.start + "T00:00:00Z");
  const now = new Date();
  let target = start, what = "til avreise";
  if (now >= start) { target = kickoff; what = `til avspark ${TRIP.match.home}–${TRIP.match.away}`; }
  const diff = target - now;
  if (diff <= 0) {
    el.innerHTML = `<span class="what">${now < new Date(TRIP.end + "T23:59:59Z") ? "Det er i gang! ⚽🍺" : "Takk for turen, gjeng 🇬🇧"}</span>`;
    return;
  }
  const d = Math.floor(diff / 864e5), h = Math.floor(diff / 36e5) % 24, m = Math.floor(diff / 6e4) % 60, s = Math.floor(diff / 1e3) % 60;
  const unit = (n, l) => `<div class="unit"><span class="num">${String(n).padStart(2, "0")}</span><span class="lbl">${l}</span></div>`;
  el.innerHTML = unit(d, "dager") + unit(h, "timer") + unit(m, "min") + unit(s, "sek") + `<span class="what">${what}</span>`;
}

/* ---------- Program ---------- */
function renderProgram() {
  const keys = [
    ["Vi bor", byId.hotel, ""],
    ["Marius bor", byId.marius, ""],
    [`${TRIP.match.home}–${TRIP.match.away} · lør 15:00`, byId.stadium, "red"],
  ];
  $("#key-places").innerHTML = keys.map(([label, p, cls]) => `
    <div class="key ${cls}">
      <div class="k-label">${esc(label)}</div>
      <div class="k-name">${esc(p.name)}</div>
      <div class="k-addr">${esc(p.addr)}</div>
      <a href="${mapsUrl(p)}" target="_blank" rel="noopener">Åpne i kart →</a>
    </div>`).join("");

  $("#days").innerHTML = PROGRAM.map((day) => `
    <article class="card day">
      <h3>${esc(day.day)}</h3>
      <p class="theme">${esc(day.theme)}</p>
      <ol class="timeline">
        ${day.items.map((it) => {
          const p = byId[it.place];
          return `<li class="stop ${it.highlight ? "highlight" : ""}">
            <span class="time">${esc(it.time)}</span>
            <span class="node"></span>
            <div class="body">
              <h4>${esc(it.title)}</h4>
              <p>${esc(it.text)}</p>
              ${p ? `<a href="#kart" data-focus="${p.id}">📍 ${esc(p.name)}</a> · <a href="${directionsUrl(p)}" target="_blank" rel="noopener">Veibeskrivelse</a>` : ""}
            </div>
          </li>`;
        }).join("")}
      </ol>
    </article>`).join("");
}

/* ---------- Kort-lister ---------- */
function placeCard(p) {
  const c = CATEGORIES[p.cat];
  const dl = distLine(p);
  return `<article class="card place-card">
    <div class="area"><span class="dot" style="background:${c.color}"></span>${esc(c.label)} · ${esc(p.area)}</div>
    <h3>${esc(p.name)}</h3>
    ${dl ? `<div class="dist">${esc(dl)}</div>` : ""}
    <p>${esc(p.desc)}</p>
    <div class="links">
      <a href="#kart" data-focus="${p.id}">Vis på kartet</a>
      <a href="${mapsUrl(p)}" target="_blank" rel="noopener">Google Maps ↗</a>
    </div>
  </article>`;
}

function renderFood() {
  const filters = [["alle", "Alle"], ["pub", "Pub & bar"], ["food", "Mat"]];
  const areas = [...new Set(PLACES.filter((p) => p.cat === "pub" || p.cat === "food").map((p) => p.area))];
  let cat = "alle", area = "alle";
  const wrap = $("#food-filters");
  const draw = () => {
    wrap.innerHTML =
      filters.map(([k, l]) => `<button class="filter" data-cat="${k}" aria-pressed="${cat === k}">${l}</button>`).join("") +
      `<span style="width:8px"></span>` +
      [["alle", "Alle områder"], ...areas.map((a) => [a, a])].map(([k, l]) => `<button class="filter" data-area="${esc(k)}" aria-pressed="${area === k}">${esc(l)}</button>`).join("");
    const list = PLACES
      .filter((p) => (p.cat === "pub" || p.cat === "food") && (cat === "alle" || p.cat === cat) && (area === "alle" || p.area === area))
      .sort((a, b) => distance(byId.hotel, a) - distance(byId.hotel, b));
    $("#food-list").innerHTML = list.map(placeCard).join("");
  };
  wrap.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.cat) cat = b.dataset.cat;
    if (b.dataset.area) area = b.dataset.area;
    draw();
  });
  draw();
}

function renderSee() {
  $("#see-list").innerHTML = PLACES.filter((p) => p.cat === "see")
    .sort((a, b) => distance(byId.hotel, a) - distance(byId.hotel, b))
    .map(placeCard).join("");
}

function renderPractical() {
  $("#practical").innerHTML = PRACTICAL.map((x) => `<div class="card"><h3>${esc(x.title)}</h3><p>${esc(x.text)}</p></div>`).join("");
  $("#people").innerHTML = TRIP.players.map((n) => `<li>${esc(n)}${n.startsWith("Marius") ? " 🏠" : ""}</li>`).join("");
}

/* ---------- Kart ---------- */
const markers = {};
const layers = {};

function initMap() {
  if (map) { setTimeout(() => map.invalidateSize(), 0); return; }
  if (typeof L === "undefined") { $("#map").textContent = "Kartet kunne ikke lastes."; return; }

  map = L.map("map", { scrollWheelZoom: false, tap: true }).setView([51.495, -0.20], 14);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-bidragsytere',
  }).addTo(map);

  Object.keys(CATEGORIES).forEach((k) => { layers[k] = L.layerGroup().addTo(map); });

  PLACES.forEach((p) => {
    const c = CATEGORIES[p.cat];
    const big = p.cat === "base";
    const size = big ? 40 : 30;
    const icon = L.divIcon({
      className: "",
      html: `<div class="pin ${big ? "big" : ""}" style="background:${c.color}">${c.icon}</div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2],
    });
    const dl = distLine(p);
    const m = L.marker([p.lat, p.lng], { icon, title: p.name, zIndexOffset: big ? 1000 : 0 })
      .bindPopup(`<div class="pop-area">${esc(c.label)} · ${esc(p.area)}</div>
        <h4>${esc(p.name)}</h4>
        ${dl ? `<div class="dist">${esc(dl)}</div>` : ""}
        <p>${esc(p.desc)}</p>
        <a href="${directionsUrl(p)}" target="_blank" rel="noopener">Veibeskrivelse ↗</a>`, { maxWidth: 280 });
    m.addTo(layers[p.cat]);
    markers[p.id] = m;
  });

  // Rute til kampen (forenklet): hotell → High St Ken → Earl's Court → Putney Bridge → stadion
  L.polyline([
    [byId.hotel.lat, byId.hotel.lng], [51.5009, -0.1925], [51.4920, -0.1934], [51.4872, -0.1953],
    [51.4801, -0.1950], [51.4752, -0.2013], [51.4681, -0.2089], [51.4715, -0.2175], [byId.stadium.lat, byId.stadium.lng],
  ], { color: "#d6262b", weight: 4, opacity: .7, dashArray: "8 8" })
    .bindTooltip("Ruta til kampen (District line)", { sticky: true })
    .addTo(map);

  const fwrap = $("#map-filters");
  fwrap.innerHTML = Object.entries(CATEGORIES).map(([k, c]) =>
    `<button class="filter" data-layer="${k}" aria-pressed="true"><span class="dot" style="background:${c.color}"></span>${esc(c.label)}</button>`).join("");
  fwrap.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    const on = b.getAttribute("aria-pressed") !== "true";
    b.setAttribute("aria-pressed", on);
    on ? layers[b.dataset.layer].addTo(map) : map.removeLayer(layers[b.dataset.layer]);
  });

  map.fitBounds(L.latLngBounds(PLACES.map((p) => [p.lat, p.lng])), { padding: [24, 24] });
  if (pendingFocus) { focusPlace(pendingFocus); pendingFocus = null; }
}

let pendingFocus = null;
function focusPlace(id) {
  const m = markers[id];
  if (!m) return;
  const cat = byId[id].cat;
  if (!map.hasLayer(layers[cat])) {
    layers[cat].addTo(map);
    const b = $(`#map-filters [data-layer="${cat}"]`);
    if (b) b.setAttribute("aria-pressed", "true");
  }
  map.setView(m.getLatLng(), 16);
  m.openPopup();
}

document.addEventListener("click", (e) => {
  const a = e.target.closest("[data-focus]");
  if (!a) return;
  e.preventDefault();
  history.pushState(null, "", "#kart");
  if (map) { showPanel(); focusPlace(a.dataset.focus); }
  else { pendingFocus = a.dataset.focus; showPanel(); }
  window.scrollTo({ top: $(".hero").offsetHeight, behavior: "smooth" });
});

/* ---------- Start ---------- */
$("#tabs").addEventListener("click", onTabClick);
window.addEventListener("popstate", showPanel);
renderCountdown();
setInterval(renderCountdown, 1000);
renderProgram();
renderFood();
renderSee();
renderPractical();
showPanel();
