import "@fontsource/oswald/600.css";
import "@fontsource/oswald/700.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/800.css";
import "./style.css";
import { mountCredits } from "./credits";
import { h } from "./dom";
import { mountLanding } from "./landing";
import { mountRemote } from "./remote";
import { mountScreen } from "./screen";
import { resolveTeam } from "./teams";

const root = document.getElementById("app")!;
// Share links like ?team=padres land on the Padres page.
const qTeam = new URLSearchParams(location.search).get("team");
if (qTeam && !location.hash) location.hash = `#/${qTeam.toLowerCase() === "sd" ? "padres" : qTeam.toLowerCase()}`;
let current = "";

async function route() {
  const [path, qs] = (location.hash.replace(/^#/, "") || "/").split("?");
  const key = `${path}?${qs ?? ""}`;
  if (key === current) return;
  // The screen owns timers and a peer connection; a clean reload is the simplest way to leave it.
  if (current.startsWith("/screen") || current.startsWith("/remote")) { current = key; location.reload(); return; }
  current = key;
  document.body.className = `route-${path.replace(/\W/g, "") || "home"}`;
  window.scrollTo(0, 0);
  if (path === "/screen") {
    const team = await resolveTeam(new URLSearchParams(qs).get("t"));
    if (!team) { location.hash = "#/"; return; }
    document.title = `${team.name} · Room OS Lite`;
    mountScreen(root, team);
  } else if (path === "/remote") { document.title = "Remote · Room OS Lite"; mountRemote(root); }
  else if (path === "/credits") { document.title = "Credits · Room OS Lite"; mountCredits(root); }
  else if (["/sd", "/padres"].includes(path)) { document.title = "Padres · Room OS Lite"; mountLanding(root, "sd"); }
  else if (["/saints", "/no"].includes(path)) mountLanding(root, "no");
  else if (["/olemiss", "/miss"].includes(path)) mountLanding(root, "miss");
  else if (["/msu", "/state"].includes(path)) mountLanding(root, "msu");
  else { document.title = "Room OS Lite"; mountLanding(root); }
}
window.addEventListener("hashchange", () => void route());
void route().catch(() => root.replaceChildren(h("p", {}, "Something went wrong. Reload the page.")));
