/** The My Players editor, shared by the big screen and the phone remote. */
import { h } from "./dom";
import { loadPlayers, searchPlayers, type PLeague, type Player } from "./players";

export function playersPanel(onChange: (list: Player[]) => void, initial: Player[] = loadPlayers()): HTMLElement {
  let list = initial.slice();
  let league: PLeague = "mlb";
  const listEl = h("div.pl-list");
  const results = h("div.pl-results");
  const input = h("input.search", { type: "search", placeholder: "Player name", "aria-label": "Player name", autocomplete: "off" }) as HTMLInputElement;
  const segs = (["mlb", "wnba"] as PLeague[]).map((l) => h("button.seg", { "data-l": l, onclick: () => { league = l; segs.forEach((b) => b.classList.toggle("on", b.dataset.l === l)); void run(); } }, l === "mlb" ? "Baseball (MLB + minors)" : "WNBA"));
  segs[0].classList.add("on");
  const render = () => {
    listEl.replaceChildren(...(list.length ? list.map((p) => h("div.pl-item", {}, h("div", {}, h("b", {}, p.name), h("span", {}, [p.team, p.level].filter(Boolean).join("  ·  "))),
      h("button.pl-x", { onclick: () => { list = list.filter((x) => !(x.id === p.id && x.league === p.league)); onChange(list); render(); }, "aria-label": `Remove ${p.name}` }, "Remove"))) : [h("p.muted", {}, "No players yet. Add your fantasy guys and they'll pop on screen when they homer, drive in a run or hit a three.")]));
  };
  let seq = 0;
  async function run() {
    const q = input.value, my = ++seq;
    if (q.trim().length < 2) { results.replaceChildren(); return; }
    results.replaceChildren(h("p.muted", {}, "Searching..."));
    try {
      const r = await searchPlayers(q, league);
      if (my !== seq) return;
      results.replaceChildren(...(r.length ? r.map((p) => h("button.pl-add", { onclick: () => { if (!list.some((x) => x.id === p.id && x.league === p.league)) { list = [...list, p]; onChange(list); render(); } input.value = ""; results.replaceChildren(); } },
        h("b", {}, p.name), h("span", {}, [p.team || "No team listed", p.level].filter(Boolean).join("  ·  ")), h("em", {}, "Add"))) : [h("p.muted", {}, "No active players found.")]));
    } catch { if (my === seq) results.replaceChildren(h("p.muted", {}, "Search isn't answering. Try again.")); }
  }
  let t = 0;
  input.oninput = () => { clearTimeout(t); t = window.setTimeout(() => void run(), 350); };
  render();
  const quick = h("button.link-btn", { onclick: () => { input.value = "Angel Reese"; league = "wnba"; segs.forEach((b) => b.classList.toggle("on", b.dataset.l === "wnba")); void run(); } }, "Angel Reese fan? Add her");
  return h("div.players-panel", {}, h("h3", {}, "My Players"), h("p.muted", {}, "Saved in this browser. No login."), listEl, h("div.seg-row", {}, ...segs), input, results, quick);
}
