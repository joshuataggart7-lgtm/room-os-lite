/** The phone remote: enter the code from the big screen, then fire moments, switch scenes and set volume. */
import { fill, h } from "./dom";
import { walkupPanel } from "./walkups";
import { RemoteLink, type Msg } from "./link";
import { remoteButtons } from "./moments";
import { playersPanel } from "./playersPanel";
import { PACKS, type Team } from "./teams";
import { parlayPanel } from "./parlay";

export function mountRemote(root: HTMLElement) {
  const q = new URLSearchParams(location.hash.split("?")[1] ?? "");
  const link = new RemoteLink();
  let code = (q.get("c") ?? localStorage.getItem("lite.code") ?? "").toUpperCase();
  let state: any = null;

  const view = h("div.remote");
  root.replaceChildren(view);

  function askCode(msg = "") {
    const inp = h("input.code-in", { inputmode: "text", autocapitalize: "characters", autocomplete: "off", maxlength: 4, placeholder: "ABCD", value: code, "aria-label": "Pairing code" }) as HTMLInputElement;
    const go = () => { const c = inp.value.trim().toUpperCase(); if (c.length === 4) { code = c; connect(); } else inp.focus(); };
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
    inp.addEventListener("input", () => { inp.value = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, ""); if (inp.value.length === 4) go(); });
    view.replaceChildren(h("div.r-pair", {},
      h("div.logo-word", {}, h("b", {}, "ROOM OS"), h("span", {}, "LITE")),
      h("h1", {}, "Phone remote"),
      h("p", {}, "Enter the 4 letter code in the corner of the big screen."),
      inp,
      msg ? h("p.err", {}, msg) : null,
      h("button.big", { onclick: go }, "Connect"),
      h("a.muted-link", { href: "#/" }, "Back")));
    setTimeout(() => inp.focus(), 50);
  }

  function connect() {
    view.replaceChildren(h("div.r-pair", {}, h("div.spinner"), h("p", {}, `Connecting to ${code}...`)));
    link.onState = (s, why) => {
      if (s === "connected") { localStorage.setItem("lite.code", code); render(); }
      if (s === "failed") askCode(why === "nocode" ? "No screen with that code. Check the code on the big screen." : "Couldn't connect. Make sure the screen is open, then try again.");
      if (s === "closed") askCode("The screen closed. Enter the code again when it's back.");
    };
    link.onMsg = (m: Msg) => {
      if (m.t === "state") { state = m; render(); }
      if (m.t === "moment") flashBtn(m.k);
      if (m.t === "alert") note(`${m.title}. ${m.sub}`);
    };
    link.connect(code);
  }

  const send = (m: Msg) => { link.send(m); try { navigator.vibrate?.(20); } catch { /* */ } };
  function flashBtn(k: string) { view.querySelectorAll<HTMLElement>(`[data-k="${k}"]`).forEach((b) => { b.classList.remove("hit"); void b.offsetWidth; b.classList.add("hit"); }); }

  let noteT = 0;
  function note(text: string) {
    let n = view.querySelector<HTMLElement>(".r-alert");
    if (!n) { n = h("div.r-alert"); view.prepend(n); }
    n.textContent = text; n.classList.add("show");
    clearTimeout(noteT); noteT = window.setTimeout(() => n!.classList.remove("show"), 6000);
  }
  let showPlayers = false;
  let panelEl: HTMLElement | null = null;
  let logoTaps: number[] = [];
  let showWalkups = false, wuEl: HTMLElement | null = null;
  let showParty = false, partyEl: HTMLElement | null = null, showParlay = false, parlayEl: HTMLElement | null = null;
  function render() {
    if ([panelEl, wuEl, partyEl, parlayEl].some((x) => x && x.contains(document.activeElement))) return; // don't yank the keyboard mid-search
    const t: Team | undefined = state?.team ? ({ ...PACKS[0], ...state.team } as Team) : undefined;
    if (!t) { view.replaceChildren(h("div.r-pair", {}, h("div.spinner"), h("p", {}, "Connected. Waiting for the screen..."))); return; }
    const sc = state.score;
    const vol = h("input", { type: "range", min: 0, max: 100, value: Math.round((state.vol ?? 0.8) * 100), "aria-label": "Volume" }) as HTMLInputElement;
    vol.onchange = () => send({ t: "vol", v: Number(vol.value) / 100 });
    const delay = h("input", { type: "range", min: 0, max: 90, value: state.delay ?? 0, "aria-label": "TV delay" }) as HTMLInputElement;
    const dl = h("span.val", {}, state.delay ? `${state.delay}s` : "Off");
    delay.oninput = () => { dl.textContent = Number(delay.value) ? `${delay.value}s` : "Off"; };
    delay.onchange = () => send({ t: "delay", v: Number(delay.value) });
    const btns = remoteButtons(t);
    fill(view,
      h("header.r-top", { style: { "--team": t.color, "--alt": t.alt } as any },
        t.logo ? h("img", { src: t.logo, alt: "", onclick: () => { const now = Date.now(); logoTaps = [...logoTaps.filter((x) => now - x < 3000), now]; if (logoTaps.length >= 5) { logoTaps = []; send({ t: "egg" }); } } }) : null,
        h("div", {}, h("b", {}, t.fullName), h("span", {}, `Connected to ${code}`)),
        sc ? h("div.r-score", {}, h("span", {}, `${sc.them[0]} ${sc.state === "pre" ? "" : sc.them[1]}`), h("span", {}, `${sc.us[0]} ${sc.state === "pre" ? "" : sc.us[1]}`), h("em", {}, sc.detail)) : null),
      state.series?.text ? h(`div.r-series${state.series.flag === "elim" || state.series.flag === "decider" ? ".hot" : ""}`, {}, state.series.text, state.series.flag === "elim" ? h("b", {}, "WIN OR GO HOME") : state.series.flag === "decider" ? h("b", {}, "WINNER TAKE ALL") : null) : null,
      state.music ? h("a.r-music", { href: state.music.url, target: "_blank", rel: "noopener" }, h("span", {}, "Now playing on Spotify"), h("b", {}, `${state.music.title} · ${state.music.artist}`), h("em", {}, "Open in Spotify")) : null,
      !state.started ? h("div.r-note", {}, "Tap Start on the big screen once so it can play sound. ", h("button", { onclick: () => send({ t: "start" }) }, "Try from here")) : null,
      h("div.r-grid", {}, ...btns.map((b) => h(`button.r-btn${b.big ? ".big" : ""}`, { "data-k": b.k, onclick: () => send({ t: "moment", k: b.k }), style: { "--team": t.color, "--alt": t.alt } as any }, b.label))),
      state.hype ? h("button.r-day.r-hype", { onclick: () => send({ t: "hype" }) }, "Hype video") : null,
      h("button.r-day", { onclick: () => send({ t: "day", v: state.day ? "stop" : "go" }) }, state.day ? "Stop the full day demo" : "Play full day (demo)"),
      h("h3.r-h", {}, "Game day"),
      h("div.r-step", {}, h("button.seg", { onclick: () => send({ t: "step", v: -1 }), "aria-label": "Previous" }, "‹ Back"), h("b", {}, (state.scenes ?? []).find((x: any) => x.id === state.scene)?.label ?? ""), h("button.seg", { onclick: () => send({ t: "step", v: 1 }), "aria-label": "Next" }, "Next ›")),
      h("div.r-scenes", {}, ...(state.scenes ?? []).map((s: any) => h(`button.seg${state.scene === s.id ? ".on" : ""}`, { onclick: () => send({ t: "scene", v: s.id }) }, s.label))),
      h("label.r-slider", {}, h("span", {}, "Volume"), vol),
      h("label.r-slider", {}, h("span", {}, "TV delay"), delay, dl),
      state.mlbId ? h("button.r-players-btn", { onclick: () => { showWalkups = !showWalkups; wuEl = null; render(); } }, showWalkups ? "Hide walk-up songs" : `Walk-up songs: ${state.walkups?.on ? "on" : "off"}`) : null,
      state.mlbId && showWalkups ? (wuEl ??= walkupPanel(state.mlbId, state.walkups ?? { on: false, picks: {} }, (w) => send({ t: "walkups", v: w }), (x) => send({ t: "walkupTest", id: x.id }))) : null,
      h("button.r-players-btn", { onclick: () => { showParty = !showParty; partyEl = null; render(); } }, showParty ? "Hide watch party" : `Watch party: ${state.party?.state === "connected" ? `linked with ${state.party.host || "the room"}` : state.party?.state === "connecting" ? "connecting" : "not linked"}`),
      showParty ? (partyEl = partyBox()) : null,
      state.parlayCtx ? h("button.r-players-btn", { onclick: () => { showParlay = !showParlay; parlayEl = null; render(); } }, showParlay ? "Hide parlay tracker" : `Parlay tracker (${(state.parlays ?? []).length})`) : null,
      state.parlayCtx && showParlay ? (parlayEl ??= parlayPanel({ team: t, ...state.parlayCtx }, state.parlays ?? [], (list) => { send({ t: "parlays", v: list }); parlayEl = null; })) : null,
      h("button.r-players-btn", { onclick: () => send({ t: "music", v: !state.musicOn }) }, state.musicOn ? "Spotify music: on" : "Spotify music: off"),
      h("p.r-tip", {}, "TV delay holds the crowd and score until your TV catches up. Try 30 to 45 seconds for streaming TV."),
      h("button.r-players-btn", { onclick: () => { showPlayers = !showPlayers; panelEl = null; render(); } }, showPlayers ? "Hide My Players" : `My Players (${(state.players ?? []).length})`),
      showPlayers ? (panelEl ??= playersPanel((list) => send({ t: "players", v: list }), state.players ?? [])) : null,
      h("button.muted-link", { onclick: () => { link.close(); localStorage.removeItem("lite.code"); code = ""; askCode(); } }, "Disconnect"),
    );
  }

  /** Watch party: link the big screen with Joshua's room and send cheers from the phone. */
  function partyBox(): HTMLElement {
    const p = state.party ?? {};
    const inp = h("input", { maxlength: 6, autocapitalize: "characters", autocomplete: "off", placeholder: "ABC234", value: p.code ?? "", "aria-label": "Watch party code" }) as HTMLInputElement;
    inp.oninput = () => { inp.value = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, ""); };
    return h("div.r-party", {},
      h("p.r-tip", {}, "Enter the 6 character code from Joshua's Room OS remote (Game night). His big plays fire on your screen after your TV delay; your cheers show on his projectors."),
      inp,
      h("div.r-scenes", {}, h("button.seg.on", { onclick: () => { send({ t: "partyJoin", code: inp.value }); partyEl = null; } }, "Join"), p.state && p.state !== "off" ? h("button.seg", { onclick: () => { send({ t: "partyLeave" }); partyEl = null; } }, "Leave") : null),
      p.state === "failed" ? h("p.r-tip", {}, `${p.why}. Trying again on its own.`) : null,
      p.state === "connected" ? h("div.r-cheers", {}, ...(state.partyEmoji ?? []).map((e: string) => h("button.seg", { onclick: () => send({ t: "partyCheer", emoji: e }) }, e)), ...(state.partyTalk ?? []).map((x: string) => h("button.seg", { onclick: () => send({ t: "partyCheer", talk: x }) }, x))) : null);
  }

  if (code.length === 4) connect(); else askCode();
}
