/**
 * Phone remote pairing over WebRTC with PeerJS's free public signaling server (0.peerjs.com) and its
 * public STUN/TURN. The screen takes the id "roomoslite-<CODE>"; the phone connects to it. No server of ours.
 * If the signaling server is down, the screen keeps working on its own.
 */
import Peer, { type DataConnection } from "peerjs";

const ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const newCode = () => Array.from({ length: 4 }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join("");
const pid = (code: string) => `roomoslite-${code.toUpperCase()}`;

export type Msg = Record<string, any> & { t: string };

export class ScreenLink {
  code = "";
  peer: Peer | null = null;
  conns = new Set<DataConnection>();
  status: "starting" | "ready" | "off" = "starting";
  onMsg: (m: Msg) => void = () => {};
  onStatus: () => void = () => {};
  onJoin: () => void = () => {};
  private tries = 0;

  start(code = newCode()) {
    this.code = code;
    try { this.peer?.destroy(); } catch { /* */ }
    const p = new Peer(pid(code), { debug: 0 });
    this.peer = p;
    p.on("open", () => { this.status = "ready"; this.tries = 0; this.onStatus(); });
    p.on("connection", (c) => {
      c.on("open", () => { this.conns.add(c); this.onJoin(); });
      c.on("data", (d) => this.onMsg(d as Msg));
      c.on("close", () => { this.conns.delete(c); this.onStatus(); });
      c.on("error", () => this.conns.delete(c));
    });
    p.on("disconnected", () => { setTimeout(() => { try { if (!p.destroyed) p.reconnect(); } catch { /* */ } }, 3000); });
    p.on("error", (e: any) => {
      if (e?.type === "unavailable-id") return this.start(newCode());
      if (e?.type === "peer-unavailable") return;
      if (["network", "server-error", "socket-error", "socket-closed", "browser-incompatible"].includes(e?.type)) {
        this.status = "off"; this.onStatus();
        if (++this.tries < 6) setTimeout(() => this.start(this.code), 5000 * this.tries);
      }
    });
  }

  send(m: Msg) { for (const c of this.conns) { try { c.send(m); } catch { /* */ } } }
  get phones() { return this.conns.size; }
}

export class RemoteLink {
  peer: Peer | null = null;
  conn: DataConnection | null = null;
  onMsg: (m: Msg) => void = () => {};
  onState: (s: "connecting" | "connected" | "failed" | "closed", why?: string) => void = () => {};

  connect(code: string) {
    this.close();
    this.onState("connecting");
    const p = new Peer({ debug: 0 });
    this.peer = p;
    const fail = (why: string) => this.onState("failed", why);
    const timer = setTimeout(() => { if (!this.conn?.open) fail("timeout"); }, 15000);
    p.on("open", () => {
      const c = p.connect(pid(code), { reliable: true });
      this.conn = c;
      c.on("open", () => { clearTimeout(timer); this.onState("connected"); c.send({ t: "hello" }); });
      c.on("data", (d) => this.onMsg(d as Msg));
      c.on("close", () => this.onState("closed"));
    });
    p.on("error", (e: any) => { clearTimeout(timer); fail(e?.type === "peer-unavailable" ? "nocode" : "network"); });
  }

  send(m: Msg) { try { if (this.conn?.open) this.conn.send(m); } catch { /* */ } }
  close() { try { this.peer?.destroy(); } catch { /* */ } this.peer = null; this.conn = null; }
}
