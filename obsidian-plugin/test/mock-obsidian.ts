// Минимальная имитация API Obsidian для проверки интерфейса плагина в обычном браузере
import YAML from "yaml";

export class TAbstractFile {
  parent: TFolder | null = null;
  constructor(public path: string) {}
  get name() {
    return this.path.split("/").pop() ?? "";
  }
}
export class TFile extends TAbstractFile {
  content = "";
  binary: ArrayBuffer | null = null;
  url: string | null = null;
  stat = { ctime: Date.now() + Math.random(), mtime: Date.now(), size: 0 };
  get basename() {
    return this.name.replace(/\.[^.]+$/, "");
  }
  get extension() {
    return this.name.includes(".") ? this.name.split(".").pop()! : "";
  }
}
export class TFolder extends TAbstractFile {
  children: TAbstractFile[] = [];
}

const files = new Map<string, TAbstractFile>();
const rootFolder = new TFolder("");
files.set("", rootFolder);

function parentOf(path: string) {
  const i = path.lastIndexOf("/");
  return i === -1 ? "" : path.slice(0, i);
}
function attach(f: TAbstractFile) {
  const parent = files.get(parentOf(f.path)) as TFolder;
  if (!parent) throw new Error(`Parent folder missing: ${f.path}`);
  f.parent = parent;
  parent.children.push(f);
  files.set(f.path, f);
}
function remove(f: TAbstractFile) {
  if (f instanceof TFolder) [...f.children].forEach(remove);
  files.delete(f.path);
  if (f.parent) f.parent.children = f.parent.children.filter((c) => c !== f);
}

export const normalizePath = (p: string) => p.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/^\/|\/$/g, "");

export function getFrontMatterInfo(content: string) {
  const m = content.match(/^---\n([\s\S]*?)\n?---\n?/);
  if (!m) return { exists: false, frontmatter: "", from: 0, to: 0, contentStart: 0 };
  return { exists: true, frontmatter: m[1], from: 4, to: m[0].length, contentStart: m[0].length };
}
export const parseYaml = (s: string) => YAML.parse(s);
export const stringifyYaml = (o: unknown) => YAML.stringify(o);

const vault = {
  getFileByPath: (p: string) => {
    const f = files.get(normalizePath(p));
    return f instanceof TFile ? f : null;
  },
  getFolderByPath: (p: string) => {
    const f = files.get(normalizePath(p));
    return f instanceof TFolder ? f : null;
  },
  getAbstractFileByPath: (p: string) => files.get(normalizePath(p)) ?? null,
  async createFolder(p: string) {
    p = normalizePath(p);
    if (files.has(p)) throw new Error("Folder already exists");
    const parts = p.split("/");
    for (let i = 1; i <= parts.length; i++) {
      const sub = parts.slice(0, i).join("/");
      if (!files.has(sub)) attach(new TFolder(sub));
    }
  },
  async create(p: string, content: string) {
    p = normalizePath(p);
    if (files.has(p)) throw new Error("File already exists");
    const f = new TFile(p);
    f.content = content;
    attach(f);
    return f;
  },
  async createBinary(p: string, data: ArrayBuffer) {
    p = normalizePath(p);
    if (files.has(p)) throw new Error("File already exists");
    const f = new TFile(p);
    f.binary = data;
    f.url = URL.createObjectURL(new Blob([data]));
    attach(f);
    return f;
  },
  async modify(f: TFile, content: string) {
    f.content = content;
    f.stat.mtime = Date.now();
  },
  cachedRead: async (f: TFile) => f.content,
  read: async (f: TFile) => f.content,
  getResourcePath: (f: TFile) => f.url ?? "",
  on: () => ({}),
};

const fileManager = {
  async processFrontMatter(f: TFile, fn: (fm: Record<string, unknown>) => void) {
    const info = getFrontMatterInfo(f.content);
    const fm = info.exists ? (YAML.parse(info.frontmatter) ?? {}) : {};
    fn(fm);
    const body = info.exists ? f.content.slice(info.contentStart) : f.content;
    f.content = `---\n${YAML.stringify(fm)}---\n${body}`;
  },
  async trashFile(f: TAbstractFile) {
    remove(f);
  },
};

export const mockApp = {
  vault,
  fileManager,
  workspace: { getLeaf: () => ({ openFile: async (f: TFile) => console.log("open note", f.path) }) },
};
export type App = typeof mockApp;
(globalThis as Record<string, unknown>).__vaultFiles = files;

export class Notice {
  constructor(message: string) {
    const log = document.getElementById("notices");
    const el = document.createElement("div");
    el.className = "notice";
    el.textContent = message;
    log?.appendChild(el);
    setTimeout(() => el.remove(), 8000);
  }
}

// Перевод: имитация, которая делает текст в три раза длиннее, чтобы проверить обрезку
export async function requestUrl(req: { url: string; body?: string }) {
  const url = new URL(req.url);
  const tl = url.searchParams.get("tl");
  const q = new URLSearchParams(req.body ?? "").get("q") ?? "";
  if (tl === "hr") return { status: 429, json: null };
  return { status: 200, json: [[[`[${tl}] ${q} ${q} ${q}`, q]]] };
}

export class Plugin {}
export class ItemView {}
export class Modal {}
export class PluginSettingTab {}
export class Setting {}
export class WorkspaceLeaf {}
export type ViewStateResult = unknown;
