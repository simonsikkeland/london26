/*
 * London-cupen: poengtavle som lagres i nettleseren (localStorage).
 * Én dommer fører stillingen og deler den med gjengen via lenke (#cup=...).
 */

const STORE_KEY = "london26-cup-v1";
const PLAYERS = TRIP.players;
const GOLF_POINTS = [10, 8, 6, 5, 4, 3, 2, 1];
const TEAM_NAMES = ["Team Kensington", "Team Notting Hill"];

const firstName = (n) => n.split(" ")[0];

function emptyState() {
  return { events: [], quests: {}, tips: {}, result: {}, golf: {}, teams: null };
}

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY));
    return s ? { ...emptyState(), ...s } : emptyState();
  } catch {
    return emptyState();
  }
}

let state = load();

function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch { /* privat modus o.l. */ }
  renderStandings();
}

/* ---------- Poengberegning ---------- */
const outcome = (h, a) => (h > a ? "H" : h < a ? "B" : "U");
const isNum = (v) => v !== "" && v != null && !Number.isNaN(Number(v));
const norm = (s) => String(s || "").trim().toLowerCase();

function tipPoints() {
  const r = state.result;
  const pts = Object.fromEntries(PLAYERS.map((p) => [p, 0]));
  if (!isNum(r.h) || !isNum(r.a)) return pts;
  const rh = +r.h, ra = +r.a;

  let bestCardDiff = Infinity;
  if (isNum(r.c)) {
    PLAYERS.forEach((p) => {
      const t = state.tips[p];
      if (t && isNum(t.c)) bestCardDiff = Math.min(bestCardDiff, Math.abs(+t.c - +r.c));
    });
  }

  PLAYERS.forEach((p) => {
    const t = state.tips[p];
    if (!t) return;
    if (isNum(t.h) && isNum(t.a)) {
      if (+t.h === rh && +t.a === ra) pts[p] += 5;
      else if (outcome(+t.h, +t.a) === outcome(rh, ra)) pts[p] += 2;
    }
    if (norm(r.s) && norm(t.s) && norm(t.s) === norm(r.s)) pts[p] += 3;
    if (isNum(r.c) && isNum(t.c) && Math.abs(+t.c - +r.c) === bestCardDiff) pts[p] += 2;
  });
  return pts;
}

function golfPoints() {
  const scored = PLAYERS.filter((p) => isNum(state.golf[p])).map((p) => [p, +state.golf[p]]);
  const pts = Object.fromEntries(PLAYERS.map((p) => [p, 0]));
  scored.forEach(([p, strokes]) => {
    const place = scored.filter(([, s]) => s < strokes).length; // likt antall slag = delt plass
    pts[p] = GOLF_POINTS[place] || 0;
  });
  return pts;
}

function questPoints() {
  const pts = Object.fromEntries(PLAYERS.map((p) => [p, 0]));
  QUESTS.forEach((q) => (state.quests[q.id] || []).forEach((p) => { if (p in pts) pts[p] += q.pts; }));
  return pts;
}

function manualPoints() {
  const pts = Object.fromEntries(PLAYERS.map((p) => [p, 0]));
  state.events.forEach((e) => { if (e.who in pts) pts[e.who] += e.pts; });
  return pts;
}

function standings() {
  const parts = { oppdrag: questPoints(), tips: tipPoints(), golf: golfPoints(), annet: manualPoints() };
  return PLAYERS.map((p) => {
    const b = Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, v[p]]));
    return { name: p, ...b, total: b.oppdrag + b.tips + b.golf + b.annet };
  }).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "no"));
}

/* ---------- Rendering ---------- */
function renderStandings() {
  const rows = standings();
  const top = rows[0].total;
  let pos = 0;
  $("#standings").innerHTML = rows.map((r, i) => {
    if (i === 0 || r.total !== rows[i - 1].total) pos = i + 1;
    const bits = [
      r.oppdrag && `oppdrag ${r.oppdrag}`, r.tips && `tips ${r.tips}`,
      r.golf && `golf ${r.golf}`, r.annet && `annet ${r.annet}`,
    ].filter(Boolean).join(" · ");
    const crown = top > 0 && r.total === top ? " 👑" : "";
    return `<li class="${top > 0 && r.total === top ? "leader" : ""}">
      <span class="pos">${pos}</span>
      <span class="name">${esc(r.name)}${crown}<span class="breakdown">${esc(bits || "ingen poeng ennå")}</span></span>
      <span class="total">${r.total}</span>
    </li>`;
  }).join("");
  renderLog();
  renderTipScores();
  renderGolfScores();
}

function renderLog() {
  const list = [...state.events].reverse();
  $("#log").innerHTML = list.length
    ? list.map((e) => `<li>
        <span class="p ${e.pts < 0 ? "neg" : ""}">${e.pts > 0 ? "+" : ""}${e.pts}</span>
        <span class="txt"><b>${esc(firstName(e.who))}</b> ${esc(e.reason || "")}</span>
        <button class="del" data-del="${e.id}" title="Angre" aria-label="Slett">×</button>
      </li>`).join("")
    : `<li class="empty">Ingen poeng delt ut ennå.</li>`;
}

function renderAwardSelect() {
  const teamOpts = state.teams
    ? state.teams.map((t, i) => `<option value="team:${i}">${esc(TEAM_NAMES[i])} (alle ${t.length})</option>`).join("")
    : "";
  $("#award-who").innerHTML =
    PLAYERS.map((p) => `<option value="${esc(p)}">${esc(p)}</option>`).join("") +
    `<option value="all">Hele gjengen</option>` + teamOpts;
}

function renderTeams() {
  const el = $("#teams");
  if (!state.teams) { el.innerHTML = `<p class="hint">Ingen lag trukket ennå.</p>`; return; }
  el.innerHTML = state.teams.map((t, i) => `<div class="team ${i ? "b" : "a"}">
      <h4>${esc(TEAM_NAMES[i])}</h4>
      <ul>${t.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>
    </div>`).join("");
}

function renderQuests() {
  $("#quests").innerHTML = QUESTS.map((q) => {
    const done = state.quests[q.id] || [];
    return `<div class="quest">
      <div class="quest-top"><h4>${esc(q.title)}</h4><span class="pts">${q.pts}p</span></div>
      <p>${esc(q.text)} ${q.once ? `<span class="tag">først til mølla</span>` : ""}</p>
      <div class="chips">${PLAYERS.map((p) =>
        `<button class="chip" data-quest="${q.id}" data-player="${esc(p)}" aria-pressed="${done.includes(p)}">${esc(firstName(p))}</button>`).join("")}
      </div>
    </div>`;
  }).join("");
}

function renderTips() {
  const t = (p, k) => esc((state.tips[p] || {})[k] ?? "");
  const r = (k) => esc(state.result[k] ?? "");
  $("#tips").innerHTML = `
    <thead><tr><th>Navn</th><th>${esc(TRIP.match.home)}</th><th>${esc(TRIP.match.away)}</th><th>Første målscorer</th><th>Gule kort</th><th class="score">Poeng</th></tr></thead>
    <tbody>
      ${PLAYERS.map((p) => `<tr>
        <td>${esc(firstName(p))}</td>
        <td><input type="number" min="0" max="20" inputmode="numeric" data-tip="${esc(p)}" data-k="h" value="${t(p, "h")}"></td>
        <td><input type="number" min="0" max="20" inputmode="numeric" data-tip="${esc(p)}" data-k="a" value="${t(p, "a")}"></td>
        <td><input type="text" data-tip="${esc(p)}" data-k="s" value="${t(p, "s")}" placeholder="Etternavn"></td>
        <td><input type="number" min="0" max="20" inputmode="numeric" data-tip="${esc(p)}" data-k="c" value="${t(p, "c")}"></td>
        <td class="score" data-tipscore="${esc(p)}"></td>
      </tr>`).join("")}
      <tr class="result">
        <td>Resultat</td>
        <td><input type="number" min="0" max="20" inputmode="numeric" data-res="h" value="${r("h")}"></td>
        <td><input type="number" min="0" max="20" inputmode="numeric" data-res="a" value="${r("a")}"></td>
        <td><input type="text" data-res="s" value="${r("s")}" placeholder="Etternavn"></td>
        <td><input type="number" min="0" max="20" inputmode="numeric" data-res="c" value="${r("c")}"></td>
        <td></td>
      </tr>
    </tbody>`;
  renderTipScores();
}

function renderTipScores() {
  const pts = tipPoints();
  document.querySelectorAll("[data-tipscore]").forEach((td) => { td.textContent = pts[td.dataset.tipscore] || ""; });
}

function renderGolf() {
  $("#golf").innerHTML = PLAYERS.map((p) => `<div class="golf-row">
      <span>${esc(p)}</span>
      <input type="number" min="1" max="200" inputmode="numeric" placeholder="Slag" data-golf="${esc(p)}" value="${esc(state.golf[p] ?? "")}">
      <span class="gp" data-golfscore="${esc(p)}"></span>
    </div>`).join("");
  renderGolfScores();
}

function renderGolfScores() {
  const pts = golfPoints();
  document.querySelectorAll("[data-golfscore]").forEach((el) => {
    const p = el.dataset.golfscore;
    el.textContent = isNum(state.golf[p]) ? `${pts[p]}p` : "";
  });
}

function renderQuiz() {
  const visible = TRIP.showQuiz || new URLSearchParams(location.search).has("quiz");
  $("#quiz-card").hidden = !visible;
  $("#golf-quiz-grid").classList.toggle("cup-grid", visible);
  $("#quiz").innerHTML = QUIZ.map((x, i) => `<li>
      ${esc(x.q)} <button class="btn small" data-quiz="${i}">Vis svar</button>
      <span class="ans" id="ans-${i}" hidden>${esc(x.a)}</span>
    </li>`).join("");
  $("#penalty-list").innerHTML = PENALTIES.map((p) => `<li><b>${p.pts}</b> ${esc(p.text)}</li>`).join("");
}

function renderAll() {
  renderAwardSelect();
  renderTeams();
  renderQuests();
  renderTips();
  renderGolf();
  renderStandings();
}

/* ---------- Handlinger ---------- */
function award(pts) {
  const who = $("#award-who").value;
  const reason = $("#award-reason").value.trim();
  let targets = [who];
  let suffix = "";
  if (who === "all") { targets = PLAYERS; suffix = " (hele gjengen)"; }
  else if (who.startsWith("team:")) {
    const i = +who.split(":")[1];
    targets = state.teams[i];
    suffix = ` (${TEAM_NAMES[i]})`;
  }
  const ts = Date.now();
  targets.forEach((p, i) => state.events.push({ id: `${ts}-${i}`, who: p, pts, reason: reason + suffix, ts }));
  $("#award-reason").value = "";
  save();
}

$("#award-form").addEventListener("click", (e) => {
  const b = e.target.closest("[data-pts]");
  if (b) award(+b.dataset.pts);
});
$("#award-form").addEventListener("submit", (e) => e.preventDefault());

$("#log").addEventListener("click", (e) => {
  const b = e.target.closest("[data-del]");
  if (!b) return;
  state.events = state.events.filter((x) => x.id !== b.dataset.del);
  save();
});

$("#quests").addEventListener("click", (e) => {
  const b = e.target.closest("[data-quest]");
  if (!b) return;
  const q = QUESTS.find((x) => x.id === b.dataset.quest);
  const p = b.dataset.player;
  let done = state.quests[q.id] || [];
  if (done.includes(p)) done = done.filter((x) => x !== p);
  else done = q.once ? [p] : [...done, p];
  state.quests[q.id] = done;
  save();
  renderQuests();
});

$("#tips").addEventListener("input", (e) => {
  const el = e.target;
  if (el.dataset.tip) {
    const p = el.dataset.tip;
    state.tips[p] = { ...(state.tips[p] || {}), [el.dataset.k]: el.value };
  } else if (el.dataset.res) {
    state.result = { ...state.result, [el.dataset.res]: el.value };
  } else return;
  save();
});

$("#golf").addEventListener("input", (e) => {
  const p = e.target.dataset.golf;
  if (!p) return;
  state.golf[p] = e.target.value;
  save();
});

$("#quiz").addEventListener("click", (e) => {
  const b = e.target.closest("[data-quiz]");
  if (!b) return;
  const ans = $(`#ans-${b.dataset.quiz}`);
  ans.hidden = !ans.hidden;
  b.textContent = ans.hidden ? "Vis svar" : "Skjul";
});

$("#draw-teams").addEventListener("click", () => {
  if (state.teams && !confirm("Trekke nye lag?")) return;
  const pool = [...PLAYERS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const half = Math.ceil(pool.length / 2);
  state.teams = [pool.slice(0, half), pool.slice(half)];
  save();
  renderTeams();
  renderAwardSelect();
});

$("#reset").addEventListener("click", () => {
  if (!confirm("Slette ALLE poeng, tips og lag på denne mobilen?")) return;
  state = emptyState();
  save();
  renderAll();
});

/* ---------- Deling ---------- */
function encodeState(s) {
  const bytes = new TextEncoder().encode(JSON.stringify(s));
  let bin = "";
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeState(str) {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

function status(msg) {
  const el = $("#share-status");
  el.textContent = msg;
  clearTimeout(status.t);
  status.t = setTimeout(() => { el.textContent = ""; }, 4000);
}

async function shareOrCopy(text, label, url) {
  if (navigator.share && /Mobi|Android|iPhone/i.test(navigator.userAgent)) {
    try { await navigator.share(url ? { title: "London-cupen", url } : { text }); return; } catch { /* avbrutt */ }
  }
  try {
    await navigator.clipboard.writeText(url || text);
    status(`${label} kopiert. Lim inn i gruppechatten.`);
  } catch {
    prompt("Kopier:", url || text);
  }
}

$("#share-link").addEventListener("click", () => {
  const url = location.href.split("#")[0] + "#cup=" + encodeState(state);
  shareOrCopy(null, "Lenke", url);
});

$("#share-text").addEventListener("click", () => {
  const rows = standings();
  const medals = ["🥇", "🥈", "🥉"];
  const text = "🏆 London-cupen – stilling\n" +
    rows.map((r, i) => `${medals[i] || `${i + 1}.`} ${firstName(r.name)} – ${r.total}p`).join("\n");
  shareOrCopy(text, "Stilling");
});

let incoming = null;
function checkIncoming() {
  const m = location.hash.match(/^#cup=(.+)$/);
  if (!m) return;
  try {
    incoming = { ...emptyState(), ...decodeState(m[1]) };
    $("#import-banner").hidden = false;
  } catch {
    status("Lenken var ugyldig.");
  }
}

$("#import-yes").addEventListener("click", () => {
  if (incoming) { state = incoming; save(); renderAll(); }
  incoming = null;
  $("#import-banner").hidden = true;
  history.replaceState(null, "", "#cupen");
  status("Stillingen er lastet inn ✔");
});

$("#import-no").addEventListener("click", () => {
  incoming = null;
  $("#import-banner").hidden = true;
  history.replaceState(null, "", "#cupen");
});

window.addEventListener("hashchange", checkIncoming);

renderQuiz();
renderAll();
checkIncoming();
