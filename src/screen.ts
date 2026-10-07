/** The stadium screen: footage, crowd sound, the game day journey, live score bug, jumbotron moments, My Players and the phone link. */
import qrcode from "qrcode-generator";
import { Audio } from "./audio";
import { $, add, fill, h } from "./dom";
import { diff, findEvent, pollEvent, simSnapshots, type MomentKind, type Snapshot } from "./espn";
import { Fireworks } from "./fireworks";
import { chapters, LABEL, sceneFor, type Chapter, type Scene } from "./journey";
import { ScreenLink, type Msg } from "./link";
import { demoKind, moment, vendorsFor, welcomeFor, type Moment } from "./moments";
import { loadPlayers, savePlayers, Watcher, type Alert, type Player } from "./players";
import { playersPanel } from "./playersPanel";
import { playlist, Reel } from "./reel";
import { SPORT, type Team } from "./teams";

export type { Scene };

const fmtTime = (iso: string) => {
  const d = new Date(iso), now = new Date();
  const same = d.toDateString() === now.toDateString();
  const day = same ? (d.getHours() < 17 ? "Today" : "Tonight") : d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  return `${day} ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", timeZoneName: "short" })}`;
};
const until = (iso: string) => {
  const m = Math.round((Date.parse(iso) - Date.now()) / 60000);
  if (m <= 0) return "Starting soon";
  return m >= 60 * 24 ? "" : m >= 60 ? `in ${Math.floor(m / 60)}h ${m % 60}m` : `in ${m} min`;
};
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function mountScreen(root: HTMLElement, team: Team) {
  const q = new URLSearchParams(location.hash.split("?")[1] ?? "");
  const sim = q.has("sim");
  const audio = new Audio();
  const reel = new Reel(team.color);
  const fw = new Fireworks([team.alt, "#ffffff", "#ffd36b", team.alt]);
  const link = new ScreenLink();
  const st = {
    started: false, scene: "game" as Scene, sceneLocked: false, delay: Number(localStorage.getItem("lite.delay") ?? 0) || 0,
    vol: Number(localStorage.getItem("lite.vol") ?? 0.8), snaps: [] as Snapshot[], shown: null as Snapshot | null, ev: null as { id: string; date: string } | null,
    err: "", busy: false, queue: [] as { k: MomentKind; demo?: boolean }[], chapters: chapters(team), dayDemo: 0, located: false,
  };
  audio.volume = st.vol;
  const chap = (s: Scene) => st.chapters.find((c) => c.id === s) ?? st.chapters[st.chapters.length - 2];

  // ---------- layout
  const bug = h("div.bug");
  const jumbo = h("div.jumbo", {}, h("div.jumbo-beams"), h("div.jumbo-card", {}, h("div.jumbo-stripe"), h("div.jumbo-title"), h("div.jumbo-sub")));
  const flash = h("div.flash");
  const toast = h("div.toast");
  const chapterCard = h("div.chapter");
  const lower = h("div.lower");
  const dayBar = h("div.daybar.hidden");
  const egg = h("div.egg.hidden");
  const tod = h("div.tod");
  const pairChip = h("button.pair-chip", { onclick: () => togglePanel(pairCard) });
  const pairCard = h("div.panel.pair-card.hidden");
  const playersCard = h("div.panel.players-card.hidden");
  const dock = h("div.dock");
  const brandLogo = team.logo ? h("img.brand-logo", { src: team.logo, alt: "" }) : null;
  const brand = h("div.brand", {}, brandLogo, h("span.brand-dot"), h("b", {}, "ROOM OS"), h("span", {}, " LITE"), h("i", {}, team.venue));
  const startCover = h("div.start", {},
    h("div.start-inner", {},
      team.logo ? h("img.start-logo", { src: team.logo, alt: "" }) : null,
      h("div.start-kicker", {}, team.venue),
      h("h1", {}, team.fullName),
      h("button.start-btn", { onclick: () => start() }, "Tap to start"),
      h("p.start-hint", {}, "Turn the sound up. On iPhone or iPad, switch off silent mode."),
    ));
  const screen = h("div.screen", { "data-set": team.set, style: { "--team": team.color, "--alt": team.alt } as any }, reel.el, tod, fw.canvas, flash, h("div.scrim"), brand, chapterCard, bug, lower, jumbo, toast, dayBar, pairChip, pairCard, playersCard, dock, egg, startCover);
  root.replaceChildren(screen);

  // ---------- controls
  const vol = h("input", { type: "range", min: 0, max: 100, value: Math.round(st.vol * 100), "aria-label": "Volume" }) as HTMLInputElement;
  vol.oninput = () => setVol(Number(vol.value) / 100);
  const delay = h("input", { type: "range", min: 0, max: 90, step: 1, value: st.delay, "aria-label": "TV delay" }) as HTMLInputElement;
  const delayLbl = h("span.val");
  delay.oninput = () => setDelay(Number(delay.value));
  const sceneGroup = h("div.dock-group");
  const renderScenes = () => sceneGroup.replaceChildren(...st.chapters.map((c) => h(`button.seg${c.id === st.scene ? ".on" : ""}`, { onclick: () => setScene(c.id, true) }, c.label)));
  add(dock,
    h("button.dock-btn.primary", { onclick: () => trigger(demoKind(team), true) }, "Demo moment"),
    h("button.dock-btn.primary2", { onclick: () => playDay() }, "Play full day (demo)"),
    h("button.dock-btn", { onclick: () => trigger("chant") }, team.set === "msu" ? "Cowbells" : "Chant"),
    sceneGroup,
    h("label.dock-slider", {}, h("span", {}, "Volume"), vol),
    h("label.dock-slider", {}, h("span", {}, "TV delay"), delay, delayLbl),
    h("button.dock-btn", { onclick: () => togglePanel(playersCard) }, "My players"),
    h("button.dock-btn", { onclick: () => togglePanel(pairCard) }, "Phone remote"),
    document.fullscreenEnabled || (document as any).webkitFullscreenEnabled ? h("button.dock-btn", { onclick: () => fullscreen(true) }, "Full screen") : null,
    h("a.dock-btn", { href: "#/" }, "Change team"),
  );

  function setVol(v: number) { st.vol = v; audio.setVolume(v); vol.value = String(Math.round(v * 100)); localStorage.setItem("lite.vol", String(v)); broadcast(); }
  function setDelay(s: number) { st.delay = s; delay.value = String(s); delayLbl.textContent = s ? `${s}s` : "Off"; localStorage.setItem("lite.delay", String(s)); broadcast(); }
  setDelay(st.delay);

  function setScene(s: Scene, byUser = false, quietCard = false) {
    if (!st.chapters.some((c) => c.id === s)) s = "game";
    if (byUser) { st.sceneLocked = true; if (st.dayDemo) stopDay(); }
    const changed = s !== st.scene;
    st.scene = s;
    const c = chap(s);
    renderScenes();
    reel.set(playlist(team.set, s));
    screen.dataset.tod = c.tod;
    if (st.started) {
      void audio.bed(c.bed);
      if (changed) c.enter?.forEach((e) => void audio.play(e.s, e));
    }
    if ((changed || byUser) && !quietCard) showChapter(c);
    broadcast();
  }
  function stepScene(dir: number) {
    const i = st.chapters.findIndex((c) => c.id === st.scene);
    setScene(st.chapters[Math.max(0, Math.min(st.chapters.length - 1, i + dir))].id, true);
  }
  let chapT = 0;
  function showChapter(c: Chapter) {
    const idx = st.chapters.indexOf(c) + 1;
    chapterCard.replaceChildren(h("div.ch-kicker", {}, `${idx} of ${st.chapters.length}  ·  ${c.kicker}`), h("div.ch-title", {}, c.title), h("div.ch-sub", {}, c.sub));
    chapterCard.classList.remove("show"); void chapterCard.offsetWidth; chapterCard.classList.add("show");
    clearTimeout(chapT); chapT = window.setTimeout(() => chapterCard.classList.remove("show"), 7000);
  }
  renderScenes();
  setScene("game", false, true);

  // Idle: hide the dock and cursor after a few seconds without input.
  let idle = 0;
  const panelsOpen = () => !pairCard.classList.contains("hidden") || !playersCard.classList.contains("hidden");
  const wake = () => { screen.classList.remove("idle"); clearTimeout(idle); idle = window.setTimeout(() => { if (!panelsOpen()) screen.classList.add("idle"); }, 4500); };
  ["mousemove", "touchstart", "keydown", "click"].forEach((e) => window.addEventListener(e, wake, { passive: true }));
  wake();

  // Easter egg: tap the logo five times, or type "sophie".
  let taps: number[] = [], typed = "";
  brand.addEventListener("click", () => { const now = Date.now(); taps = [...taps.filter((t) => now - t < 3000), now]; if (taps.length >= 5) { taps = []; fanClub(); } });
  window.addEventListener("keydown", (e) => {
    if (e.target instanceof HTMLInputElement) return;
    typed = (typed + e.key.toLowerCase()).slice(-6);
    if (typed === "sophie") { typed = ""; fanClub(); return; }
    if (!st.started && (e.key === "Enter" || e.key === " ")) { start(); return; }
    if (e.key === "d") trigger(demoKind(team), true);
    if (e.key === "c") trigger("chant");
    if (e.key === "f") fullscreen(true);
    if (e.key === "ArrowRight" && e.shiftKey) stepScene(1);
    if (e.key === "ArrowLeft" && e.shiftKey) stepScene(-1);
  });

  // ---------- start
  function start() {
    if (st.started) return;
    st.started = true;
    audio.unlock();
    startCover.classList.add("gone");
    setTimeout(() => startCover.remove(), 900);
    fullscreen(false);
    void wakeLock();
    const c = chap(st.scene);
    void audio.bed(c.bed);
    audio.preload(["sfx_roar_football", "sfx_roar_huge", "sfx_fireworks", ...moment(team, demoKind(team)).cues.map((x) => x.s)]);
    setTimeout(() => (st.chapters.length > 4 ? showChapter(c) : welcomeFor(team).forEach((x) => void audio.play(x.s, x))), 1500);
    scheduleAmbience();
    togglePanel(pairCard, true);
    setTimeout(() => { if (!link.phones) togglePanel(pairCard, false); }, 25000);
    watcher.start();
    broadcast();
  }
  function fullscreen(toggle: boolean) {
    const d = document as any, el = document.documentElement as any;
    if (d.fullscreenElement || d.webkitFullscreenElement) { if (toggle) (d.exitFullscreen || d.webkitExitFullscreen)?.call(d); return; }
    try { const p = (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el); p?.catch?.(() => undefined); } catch { /* */ }
  }
  let lock: any = null;
  async function wakeLock() { try { lock = await (navigator as any).wakeLock?.request("screen"); } catch { /* */ } }
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && st.started && (!lock || lock.released)) void wakeLock(); });

  function scheduleAmbience() {
    const vs = vendorsFor(team);
    setTimeout(() => {
      const inside = ["walkIn", "game"].includes(st.scene);
      if (!st.busy && inside) void audio.play(vs[Math.floor(Math.random() * vs.length)], { gain: 0.3, pan: Math.random() * 1.6 - 0.8 });
      if (!st.busy && team.set === "msu" && ["tailgate", "game", "walkIn"].includes(st.scene) && Math.random() < 0.6) void audio.play("sfx_cowbell_single", { gain: 0.35, pan: Math.random() * 1.6 - 0.8 });
      if (!st.busy && st.scene === "drive" && Math.random() < 0.5) void audio.play("radio_hype", { gain: 0.6 });
      scheduleAmbience();
    }, 40000 + Math.random() * 60000);
  }

  // ---------- moments
  function trigger(k: MomentKind, demo = false) {
    if (!st.started) start();
    const m = moment(team, k);
    if (m.quiet) { m.cues.forEach((c) => void audio.play(c.s, c)); return; }
    st.queue.push({ k, demo });
    if (!st.busy) void runQueue();
  }
  async function runQueue() {
    st.busy = true;
    while (st.queue.length) { const { k, demo } = st.queue.shift()!; await runMoment(moment(team, k), k, demo); }
    st.busy = false;
  }
  function runMoment(m: Moment, k: MomentKind, demo?: boolean): Promise<void> {
    m.cues.forEach((c) => void audio.play(c.s, c));
    link.send({ t: "moment", k, title: m.title });
    if (m.fireworks) fw.show(m.fireworks);
    if (m.celebrate) reel.celebrate(playlist(team.set, "celebrate"), m.celebrate);
    if (m.flash) { flash.classList.remove("go"); void flash.offsetWidth; flash.classList.add("go"); }
    if (k === "opp" && st.shown) { toastMsg(`${st.shown.them.abbr} scores`, ""); return wait(2500); }
    if (!m.title) return wait(1500);
    if (m.small) { toastMsg(m.title, m.sub ?? ""); return wait(3500); }
    $(".jumbo-title", jumbo)!.textContent = m.title;
    $(".jumbo-sub", jumbo)!.textContent = demo ? `${m.sub ?? ""}  ·  Demo` : m.sub ?? "";
    jumbo.classList.remove("show"); void jumbo.offsetWidth; jumbo.classList.add("show");
    return wait(k === "win" ? 9000 : 6500).then(() => { jumbo.classList.remove("show"); return wait(700); });
  }
  let toastT = 0;
  function toastMsg(a: string, b: string) {
    toast.replaceChildren(h("b", {}, a), b ? h("span", {}, b) : "");
    toast.classList.add("show"); clearTimeout(toastT); toastT = window.setTimeout(() => toast.classList.remove("show"), 3200);
  }

  // ---------- Sophie Cunningham fan club (good-natured, no quotes, no stats, no photos)
  let eggT = 0;
  function fanClub() {
    if (!st.started) start();
    egg.replaceChildren(h("div.egg-inner", {},
      h("div.egg-tag", {}, "Breaking news"),
      h("div.egg-title", {}, "Welcome to the", h("br"), h("span", {}, "Sophie Cunningham"), h("br"), "Fan Club"),
      h("div.egg-sub", {}, "You've been signed up. Membership card is in the mail. No refunds."),
      h("div.egg-ticker", {}, h("div", {}, "SOPHIE CUNNINGHAM FAN CLUB  ★  NEW MEMBER ALERT  ★  SOPHIE CUNNINGHAM FAN CLUB  ★  NEW MEMBER ALERT  ★  ")),
      h("button.egg-x", { onclick: () => closeEgg() }, "Fine, I'm in")));
    egg.classList.remove("hidden"); void egg.offsetWidth; egg.classList.add("show");
    void audio.play("sting_fanclub", { gain: 0.9, duck: true });
    void audio.play(SPORT[team.league] === "basketball" ? "sfx_roar_basketball" : "sfx_roar_baseball", { at: 2.4, gain: 0.5 });
    fw.show(4);
    link.send({ t: "egg" });
    clearTimeout(eggT); eggT = window.setTimeout(closeEgg, 9000);
  }
  function closeEgg() { egg.classList.remove("show"); setTimeout(() => egg.classList.add("hidden"), 500); }

  // ---------- full day demo: the whole journey in about three minutes
  async function playDay() {
    if (!st.started) start();
    const run = ++st.dayDemo;
    st.sceneLocked = true;
    const list = st.chapters;
    const total = 180, gameShare = 50, rest = (total - gameShare) / (list.length - 1);
    togglePanel(pairCard, false);
    for (let i = 0; i < list.length && run === st.dayDemo; i++) {
      const c = list[i];
      setScene(c.id);
      const secs = c.id === "game" ? gameShare : rest;
      renderDayBar(i, list.length, c.label);
      if (c.id === "game") {
        await wait(9000); if (run !== st.dayDemo) return;
        trigger("start", true); await wait(12000); if (run !== st.dayDemo) return;
        trigger(demoKind(team), true); await wait(14000); if (run !== st.dayDemo) return;
        trigger("chant", true); await wait(secs * 1000 - 35000);
      } else if (c.id === "postgame") {
        trigger("win", true); await wait(secs * 1000);
      } else await wait(secs * 1000);
    }
    if (run === st.dayDemo) stopDay();
  }
  function stopDay() { st.dayDemo++; dayBar.classList.add("hidden"); broadcast(); }
  function renderDayBar(i: number, n: number, label: string) {
    dayBar.classList.remove("hidden");
    dayBar.replaceChildren(h("span.db-tag", {}, "Full day demo"), h("div.db-steps", {}, ...st.chapters.map((c, k) => h(`i${k < i ? ".done" : k === i ? ".now" : ""}`, { title: c.label }))), h("b", {}, label), h("button", { onclick: () => stopDay() }, "Stop"));
    broadcast();
  }

  // ---------- score bug
  function renderBug() {
    const s = st.shown;
    if (!s) {
      bug.className = "bug quiet";
      bug.replaceChildren(h("div.bug-msg", {}, st.err ? "Scores are offline right now." : !st.located ? "Finding the next game..." : team.league === "milb" ? "Offseason. No games scheduled." : "No game scheduled soon."), demoPill());
      return;
    }
    const baseball = SPORT[team.league] === "baseball";
    const row = (x: typeof s.us) => h("div.bug-team", { style: { "--c": x.color } as any },
      x.logo ? h("img", { src: x.logo, alt: "" }) : h("span.bug-noimg"), h("b", {}, x.abbr), s.state === "pre" ? null : h("span.bug-score", {}, String(x.score)));
    const away = s.us.home ? s.them : s.us, home = s.us.home ? s.us : s.them;
    let info: HTMLElement;
    if (s.state === "pre") info = h("div.bug-info", {}, h("b", {}, fmtTime(s.date)), h("span", {}, [until(s.date), s.broadcast].filter(Boolean).join("  ·  ")));
    else if (s.state === "post") info = h("div.bug-info", {}, h("b", {}, s.detail || "Final"));
    else if (baseball) info = h("div.bug-info.bb", {}, h("b", {}, s.detail.replace(/^(Top|Bot|Bottom|Mid|End)\s+/i, (x) => (/top/i.test(x) ? "▲ " : /bot/i.test(x) ? "▼ " : x))),
      diamond(s), h("span", {}, `${s.balls ?? 0}-${s.strikes ?? 0}`), outsDots(s.outs ?? 0));
    else info = h("div.bug-info", {}, h("b", {}, s.detail), s.downDistance ? h("span", { class: s.redZone ? "rz" : "" }, s.downDistance) : null);
    bug.className = `bug ${s.state}`;
    fill(bug, s.state === "in" ? h("div.bug-live", {}, "LIVE") : null, row(away), row(home), info, s.state !== "in" ? demoPill() : null);
  }
  const demoPill = () => h("button.demo-pill", { onclick: () => playDay() }, "Play full day (demo)");
  const diamond = (s: Snapshot) => h("span.diamond", { html: `<svg viewBox="0 0 40 30" aria-label="Bases"><rect x="15" y="2" width="10" height="10" transform="rotate(45 20 7)" class="${s.onSecond ? "on" : ""}"/><rect x="27" y="12" width="10" height="10" transform="rotate(45 32 17)" class="${s.onFirst ? "on" : ""}"/><rect x="3" y="12" width="10" height="10" transform="rotate(45 8 17)" class="${s.onThird ? "on" : ""}"/></svg>` });
  const outsDots = (n: number) => h("span.outs", {}, ...[0, 1, 2].map((i) => h(`i${i < n ? ".on" : ""}`)), h("em", {}, n === 1 ? " out" : " outs"));

  // ---------- data loop
  const simNext = sim ? simSnapshots(team) : null;
  async function locate() {
    if (sim) { st.ev = { id: "sim", date: new Date().toISOString() }; st.located = true; return; }
    try { st.ev = await findEvent(team); st.err = ""; } catch { st.err = "net"; }
    st.located = true;
    if (st.ev) { st.chapters = chapters(team, st.ev.date); renderScenes(); }
    renderBug();
  }
  async function poll() {
    let next = 120000;
    try {
      if (!st.ev) await locate();
      if (st.ev) {
        const s = simNext ? simNext() : await pollEvent(team, st.ev);
        if (s) {
          st.snaps.push(s); if (st.snaps.length > 60) st.snaps.shift(); st.err = "";
          next = s.state === "in" ? 8000 : Date.parse(s.date) - Date.now() < 2 * 3600e3 ? 30000 : 120000;
          if (s.state === "post" && Date.now() - Date.parse(s.date) > 8 * 3600e3) st.ev = null;
        }
      }
    } catch { st.err = "net"; next = 20000; }
    if (simNext) next = 4000;
    setTimeout(poll, next);
  }
  setInterval(() => { if (!sim && Math.random() < 0.03) void locate(); }, 60000);
  void locate().then(poll);

  // The TV delay: show the newest snapshot at least `delay` seconds old, so moments land with the picture.
  setInterval(() => {
    const cut = Date.now() - st.delay * 1000;
    let pick: Snapshot | null = null;
    for (const s of st.snaps) if (s.at <= cut) pick = s;
    if (!pick && !st.shown) pick = st.snaps[0] ?? null;
    if (pick && pick !== st.shown) {
      const prev = st.shown;
      st.shown = pick;
      if (prev && !st.dayDemo) for (const k of diff(team, prev, pick)) trigger(k);
      if (!st.sceneLocked) setScene(sceneFor(team, pick.state, (Date.parse(pick.date) - Date.now()) / 60000), false, !prev && !st.started);
      renderBug();
      broadcast();
    } else if (pick?.state === "pre") renderBug();
  }, 1000);
  renderBug();

  // ---------- My Players
  let players: Player[] = loadPlayers();
  const watcher = new Watcher(() => players);
  const setPlayers = (p: Player[]) => { players = p; savePlayers(p); broadcast(); };
  playersCard.append(playersPanel(setPlayers, players), h("button.x", { onclick: () => togglePanel(playersCard, false), "aria-label": "Close" }, "×"));
  const alertQ: Alert[] = [];
  let alertBusy = false;
  watcher.onAlert = (a) => setTimeout(() => { alertQ.push(a); if (!alertBusy) void showAlerts(); }, st.delay * 1000);
  async function showAlerts() {
    alertBusy = true;
    while (alertQ.length) {
      const a = alertQ.shift()!;
      lower.replaceChildren(h("div.lt-tag", {}, "My Players"), h("div.lt-main", {}, h("b", {}, a.title), h("span", {}, `${a.sub}  ·  ${a.player.team}`)));
      lower.classList.add("show");
      void audio.play(a.kind === "three" ? "sfx_roar_basketball" : a.kind === "hr" ? "sfx_organ_charge" : "sfx_roar_baseball", { gain: 0.55 });
      link.send({ t: "alert", title: a.title, sub: a.sub });
      await wait(8000);
      lower.classList.remove("show");
      await wait(800);
    }
    alertBusy = false;
  }

  // ---------- phone link
  function pairUrl() { return `${location.origin}${location.pathname}#/remote?c=${link.code}`; }
  function renderPair() {
    const ok = link.status === "ready";
    pairChip.replaceChildren(h("span", { class: `dot ${ok ? "ok" : link.status}` }), ok ? `Phone remote  ${link.code}` : link.status === "off" ? "Phone remote offline" : "Phone remote...");
    if (link.phones) pairChip.append(h("em", {}, `  ·  ${link.phones} connected`));
    pairCard.replaceChildren();
    if (!ok) { pairCard.append(h("h3", {}, "Phone remote"), h("p", {}, link.status === "off" ? "The pairing service isn't answering. The screen works fine on its own; try again later." : "Getting a code...")); return; }
    const qr = qrcode(0, "M"); qr.addData(pairUrl()); qr.make();
    pairCard.append(
      h("div.qr", { html: qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true }) }),
      h("div", {}, h("h3", {}, "Use your phone as the remote"), h("p", {}, "Scan this, or open the same link on your phone, tap Remote and enter"), h("div.code", {}, link.code),
        link.phones ? h("p.ok", {}, `${link.phones} phone${link.phones > 1 ? "s" : ""} connected`) : null),
      h("button.x", { onclick: () => togglePanel(pairCard, false), "aria-label": "Close" }, "×"));
  }
  function togglePanel(p: HTMLElement, on?: boolean) {
    const show = on ?? p.classList.contains("hidden");
    [pairCard, playersCard].forEach((x) => x.classList.toggle("hidden", x === p ? !show : true));
    wake();
  }
  link.onStatus = () => renderPair();
  link.onJoin = () => { renderPair(); toastMsg("Phone connected", "Your phone is the remote now"); broadcast(); setTimeout(() => togglePanel(pairCard, false), 2500); };
  link.onMsg = (m: Msg) => {
    if (m.t === "moment" && m.k) trigger(m.k as MomentKind, !!m.demo);
    else if (m.t === "vol") setVol(Number(m.v));
    else if (m.t === "delay") setDelay(Number(m.v));
    else if (m.t === "scene") setScene(m.v as Scene, true);
    else if (m.t === "step") stepScene(Number(m.v));
    else if (m.t === "day") (m.v === "stop" ? stopDay() : void playDay());
    else if (m.t === "egg") fanClub();
    else if (m.t === "players" && Array.isArray(m.v)) { setPlayers(m.v); toastMsg("My Players updated", `${m.v.length} on the list`); }
    else if (m.t === "start") start();
    else if (m.t === "hello") broadcast();
  };
  renderPair();
  link.start();

  function broadcast() {
    if (!link.phones) return;
    const s = st.shown;
    link.send({
      t: "state", team: { key: team.key, name: team.name, fullName: team.fullName, abbr: team.abbr, color: team.color, alt: team.alt, logo: team.logo, league: team.league, set: team.set },
      started: st.started, scene: st.scene, scenes: st.chapters.map((c) => ({ id: c.id, label: c.label })), vol: st.vol, delay: st.delay, day: !!st.dayDemo && !dayBar.classList.contains("hidden"), players,
      score: s ? { state: s.state, detail: s.state === "pre" ? fmtTime(s.date) : s.detail, us: [s.us.abbr, s.us.score], them: [s.them.abbr, s.them.score] } : null,
    });
  }

  // For tests and the curious: window.lite.trigger("hr"), lite.fanClub(), lite.playDay()
  (window as any).lite = { trigger, state: st, link, fanClub, playDay, stopDay, setScene, alert: (a: Alert) => watcher.onAlert(a), LABEL };
}
