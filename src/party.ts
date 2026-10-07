/**
 * Watch party with a Room OS room (Joshua's game room). The room's projector page holds the PeerJS id
 * "roomos-party-<CODE>"; Lite connects to it with the six-character code from the room's remote. Moments come
 * in with the play's feed time and wait for this screen's own TV delay; cheers go back as preset emoji and lines
 * only. Free: PeerJS's public signaling (0.peerjs.com), then browser to browser. No server of ours.
 */
import Peer, { type DataConnection } from "peerjs";
import { partyPeerId, validPartyCode, type PartyMoment } from "./gncore";

export type PartyState = "off" | "connecting" | "connected" | "failed";
const KEY = "lite.party";

export class PartyGuest {
  code = (localStorage.getItem(KEY) ?? "").toUpperCase();
  state: PartyState = "off";
  why = "";
  host = "";
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private retry = 0;
  private tries = 0;
  private wanted = false;
  onMoment: (m: PartyMoment) => void = () => {};
  onChange: () => void = () => {};

  join(code: string, name: string) {
    code = code.trim().toUpperCase();
    if (!validPartyCode(code)) { this.state = "failed"; this.why = "Party codes are 6 letters and numbers"; this.onChange(); return; }
    this.code = code; localStorage.setItem(KEY, code); this.wanted = true; this.tries = 0;
    this.open(name);
  }

  leave() { this.wanted = false; localStorage.removeItem(KEY); clearTimeout(this.retry); this.close(); this.state = "off"; this.host = ""; this.onChange(); }

  private close() { try { this.peer?.destroy(); } catch { /* */ } this.peer = null; this.conn = null; }

  private open(name: string) {
    this.close(); clearTimeout(this.retry);
    this.state = "connecting"; this.why = ""; this.onChange();
    const p = new Peer({ debug: 0 }); this.peer = p;
    const again = (why: string) => {
      this.state = "failed"; this.why = why; this.onChange();
      // The room's projector page may still be coming up: keep trying quietly (10 s, 20 s, ... up to a minute).
      if (this.wanted) this.retry = window.setTimeout(() => this.open(name), Math.min(60000, 10000 * ++this.tries));
    };
    const timer = window.setTimeout(() => { if (!this.conn?.open) again("The room didn't answer yet"); }, 15000);
    p.on("open", () => {
      const c = p.connect(partyPeerId(this.code), { reliable: true }); this.conn = c;
      c.on("open", () => { clearTimeout(timer); this.tries = 0; this.state = "connected"; c.send({ t: "hello", name, app: "lite" }); this.onChange(); });
      c.on("data", (d: any) => {
        if (d?.t === "hello" && typeof d.name === "string") { this.host = d.name.slice(0, 30); this.onChange(); }
        if (d?.t === "moment" && typeof d.kind === "string" && typeof d.title === "string") this.onMoment({ t: "moment", kind: d.kind, title: String(d.title).slice(0, 40), sub: typeof d.sub === "string" ? d.sub.slice(0, 120) : undefined, team: typeof d.team === "string" ? d.team.slice(0, 8) : undefined, feedTs: Number(d.feedTs) || Date.now() });
      });
      c.on("close", () => { if (this.wanted) again("The room closed the link"); });
    });
    p.on("error", (e: any) => { clearTimeout(timer); again(e?.type === "peer-unavailable" ? "No room with that code is open right now" : "Couldn't reach the pairing service"); });
  }

  /** Reconnect with the saved code (after a reload). */
  resume(name: string) { if (validPartyCode(this.code)) { this.wanted = true; this.open(name); } }

  cheer(from: string, x: { emoji?: string; talk?: string }): boolean {
    if (!this.conn?.open) return false;
    try { this.conn.send({ t: "cheer", from, ...x }); return true; } catch { return false; }
  }
}
