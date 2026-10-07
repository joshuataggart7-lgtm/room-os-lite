/** Tiny DOM helper: h("div.cls", {attrs}, ...children). */
type Child = Node | string | null | undefined | false;
export function h<K extends keyof HTMLElementTagNameMap>(sel: K | string, attrs: Record<string, any> = {}, ...kids: Child[]): HTMLElement {
  const [tag, ...cls] = sel.split(".");
  const el = document.createElement(tag || "div");
  if (cls.length) el.className = cls.join(" ");
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
    else if (k === "html") el.innerHTML = v;
    else el.setAttribute(k, v === true ? "" : String(v));
  }
  for (const c of kids) if (c != null && c !== false) el.append(c as Node | string);
  return el;
}
export const $ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector(s) as T | null;
const clean = (k: Child[]) => k.filter((x) => x != null && x !== false) as (Node | string)[];
export const fill = (el: Element, ...k: Child[]) => el.replaceChildren(...clean(k));
export const add = (el: Element, ...k: Child[]) => el.append(...clean(k));
