import { App, TFile, TFolder, getFrontMatterInfo, normalizePath, parseYaml, stringifyYaml } from "obsidian";
import { LOCALIZED_FIELDS, MAX_SHOTS_PER_LOCALE, isLocale, type LocalizedField } from "./locales";
import { mapLimit, type LocalizedTexts, type Translator } from "./translate";

// Все данные лежат в обычных файлах хранилища, поэтому синхронизируются любым способом (Obsidian Sync, Syncthing, Git):
//   <root>/Этапы.md                      — колонки канбана
//   <root>/<Приложение>/<Приложение>.md  — карточка: этап, параметры, наборы скринов, история; тело — свободные заметки
//   <root>/<Приложение>/Локализации/<код>.md — тексты листинга для локали
//   <root>/<Приложение>/Скрины/*         — загруженные скриншоты, иконка лежит рядом с карточкой

export type Stage = { id: string; name: string; color: string };
export type HistoryEntry = { date: string; from: string | null; to: string };
export type Localization = LocalizedTexts & { locale: string; auto: boolean };

export type AppRecord = {
  id: string; // путь к папке приложения
  folder: string;
  note: string;
  stage: string;
  position: number;
  primaryLocale: string;
  bundleId: string;
  storeUrl: string;
  account: string;
  icon: string | null; // путь к файлу
  sets: Record<string, string[]>; // локаль -> пути скринов по порядку
  history: HistoryEntry[];
  locales: Record<string, Localization>;
  shots: string[]; // все загруженные скрины
  created: string;
};

export const DEFAULT_STAGES: Stage[] = [
  { id: "development", name: "Разработка", color: "#94a3b8" },
  { id: "first_review", name: "Первичная модерация", color: "#f59e0b" },
  { id: "rejected", name: "Реджект", color: "#ef4444" },
  { id: "live_white", name: "Белая в сторе", color: "#38bdf8" },
  { id: "tech_update", name: "Техническое обновление", color: "#a78bfa" },
  { id: "screenshots", name: "Скрины", color: "#f472b6" },
  { id: "working", name: "Работающая", color: "#22c55e" },
  { id: "blocked", name: "Заблокированная", color: "#71717a" },
];

export const STAGE_COLORS = [
  "#94a3b8", "#f59e0b", "#ef4444", "#38bdf8", "#a78bfa", "#f472b6",
  "#22c55e", "#71717a", "#14b8a6", "#eab308", "#6366f1", "#fb923c",
];

const LOC_DIR = "Локализации";
const SHOTS_DIR = "Скрины";
const STAGES_FILE = "Этапы.md";
const IMAGE_EXT = new Set(["png", "jpg", "jpeg", "webp"]);

const emptyTexts = (): LocalizedTexts => Object.fromEntries(LOCALIZED_FIELDS.map((f) => [f, ""])) as LocalizedTexts;
const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
const today = () => new Date().toISOString();

// Имя папки/файла без запрещённых символов
export const safeName = (s: string) => s.replace(/[\\/:*?"<>|#^[\]]/g, " ").replace(/\s+/g, " ").trim();

export type TranslateReport = { translated: number; trimmed: number; failed: string[]; error: string | null };

export class Store {
  stages: Stage[] = DEFAULT_STAGES;
  apps: AppRecord[] = [];
  private listeners = new Set<() => void>();
  private reloadTimer: number | null = null;
  private loading: Promise<void> | null = null;

  constructor(
    private app: App,
    private rootPath: () => string,
    private translator: Translator,
  ) {}

  get root() {
    return normalizePath(this.rootPath() || "Traffic Hub");
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  version = 0;

  private emit() {
    this.version++;
    this.listeners.forEach((fn) => fn());
  }

  isOwnPath(path: string) {
    return path === this.root || path.startsWith(this.root + "/");
  }

  // Изменения извне (синхронизация, ручная правка заметки) — перечитываем с задержкой
  scheduleReload() {
    if (this.reloadTimer !== null) window.clearTimeout(this.reloadTimer);
    this.reloadTimer = window.setTimeout(() => {
      this.reloadTimer = null;
      void this.reload();
    }, 300);
  }

  resource(path: string | null | undefined) {
    if (!path) return null;
    const f = this.app.vault.getFileByPath(path);
    return f ? this.app.vault.getResourcePath(f) : null;
  }

  // ---------- чтение ----------

  private async readFrontmatter(file: TFile): Promise<Record<string, unknown>> {
    const content = await this.app.vault.cachedRead(file);
    const info = getFrontMatterInfo(content);
    if (!info.exists) return {};
    return (parseYaml(info.frontmatter) as Record<string, unknown>) ?? {};
  }

  async reload() {
    // Не запускаем две загрузки одновременно
    while (this.loading) await this.loading;
    this.loading = this.doReload();
    try {
      await this.loading;
    } finally {
      this.loading = null;
    }
    this.emit();
  }

  private async doReload() {
    await this.ensureFolder(this.root);
    this.stages = await this.readStages();
    const rootFolder = this.app.vault.getFolderByPath(this.root);
    const apps: AppRecord[] = [];
    for (const child of rootFolder?.children ?? []) {
      if (!(child instanceof TFolder)) continue;
      const rec = await this.readApp(child);
      if (rec) apps.push(rec);
    }
    const first = this.stages[0]?.id;
    for (const a of apps) if (!this.stages.some((s) => s.id === a.stage) && first) a.stage = first;
    apps.sort((a, b) => a.position - b.position);
    this.apps = apps;
  }

  private async readStages(): Promise<Stage[]> {
    const path = `${this.root}/${STAGES_FILE}`;
    const file = this.app.vault.getFileByPath(path);
    if (!file) {
      await this.writeStages(DEFAULT_STAGES);
      return DEFAULT_STAGES;
    }
    const fm = await this.readFrontmatter(file);
    const list = Array.isArray(fm.stages) ? fm.stages : [];
    const stages = list
      .map((s: Record<string, unknown>) => ({ id: str(s.id), name: str(s.name), color: str(s.color) || "#94a3b8" }))
      .filter((s) => s.id && s.name);
    return stages.length ? stages : DEFAULT_STAGES;
  }

  private async readApp(folder: TFolder): Promise<AppRecord | null> {
    const note = this.app.vault.getFileByPath(`${folder.path}/${folder.name}.md`);
    if (!note) return null;
    const fm = await this.readFrontmatter(note);
    if (fm.traffic_hub !== "app") return null;

    const locales: Record<string, Localization> = {};
    const locFolder = this.app.vault.getFolderByPath(`${folder.path}/${LOC_DIR}`);
    for (const f of locFolder?.children ?? []) {
      if (!(f instanceof TFile) || f.extension !== "md" || !isLocale(f.basename)) continue;
      const lf = await this.readFrontmatter(f);
      const texts = emptyTexts();
      for (const k of LOCALIZED_FIELDS) texts[k] = str(lf[k]);
      locales[f.basename] = { ...texts, locale: f.basename, auto: lf.auto === true };
    }

    const shotsFolder = this.app.vault.getFolderByPath(`${folder.path}/${SHOTS_DIR}`);
    const shots = (shotsFolder?.children ?? [])
      .filter((f): f is TFile => f instanceof TFile && IMAGE_EXT.has(f.extension.toLowerCase()))
      .sort((a, b) => a.stat.ctime - b.stat.ctime || a.name.localeCompare(b.name))
      .map((f) => f.path);
    const known = new Set(shots);

    const rawSets = (fm.screenshots ?? {}) as Record<string, unknown>;
    const sets: Record<string, string[]> = {};
    for (const [loc, list] of Object.entries(rawSets)) {
      if (!Array.isArray(list)) continue;
      const paths = list.map((n) => `${folder.path}/${SHOTS_DIR}/${str(n)}`).filter((p) => known.has(p));
      if (paths.length && locales[loc]) sets[loc] = paths;
    }

    const icon = str(fm.icon) ? `${folder.path}/${str(fm.icon)}` : null;
    return {
      id: folder.path,
      folder: folder.path,
      note: note.path,
      stage: str(fm.stage),
      position: Number(fm.position) || 0,
      primaryLocale: isLocale(str(fm.primary_locale)) ? str(fm.primary_locale) : "en-US",
      bundleId: str(fm.bundle_id),
      storeUrl: str(fm.store_url),
      account: str(fm.account),
      icon: icon && this.app.vault.getFileByPath(icon) ? icon : null,
      sets,
      history: Array.isArray(fm.history)
        ? fm.history.map((h: Record<string, unknown>) => ({ date: str(h.date), from: h.from ? str(h.from) : null, to: str(h.to) }))
        : [],
      locales,
      shots,
      created: str(fm.created),
    };
  }

  // ---------- запись ----------

  private async ensureFolder(path: string) {
    if (!this.app.vault.getFolderByPath(path)) {
      try {
        await this.app.vault.createFolder(path);
      } catch {
        // папку успели создать параллельно
      }
    }
  }

  private async writeFile(path: string, content: string) {
    const file = this.app.vault.getFileByPath(path);
    if (file) await this.app.vault.modify(file, content);
    else await this.app.vault.create(path, content);
  }

  private async writeStages(stages: Stage[]) {
    await this.ensureFolder(this.root);
    const body = "\nКолонки доски Traffic Hub. Редактируются в настройках плагина.\n";
    await this.writeFile(`${this.root}/${STAGES_FILE}`, `---\n${stringifyYaml({ stages })}---\n${body}`);
  }

  private async patchApp(app: AppRecord, fn: (fm: Record<string, unknown>) => void) {
    const file = this.app.vault.getFileByPath(app.note);
    if (!file) throw new Error("Карточка приложения не найдена");
    await this.app.fileManager.processFrontMatter(file, fn);
  }

  private async writeLocale(app: AppRecord, loc: Localization) {
    await this.ensureFolder(`${app.folder}/${LOC_DIR}`);
    const fm: Record<string, unknown> = { locale: loc.locale, auto: loc.auto };
    for (const f of LOCALIZED_FIELDS) fm[f] = loc[f];
    await this.writeFile(`${app.folder}/${LOC_DIR}/${loc.locale}.md`, `---\n${stringifyYaml(fm)}---\n`);
  }

  private shotNames(app: AppRecord, paths: string[]) {
    return paths.map((p) => p.slice(`${app.folder}/${SHOTS_DIR}/`.length));
  }

  get(id: string) {
    return this.apps.find((a) => a.id === id) ?? null;
  }

  title(app: AppRecord) {
    return app.locales[app.primaryLocale]?.title || app.folder.split("/").pop() || "Без названия";
  }

  async createApp(input: { title: string; subtitle: string; primaryLocale: string; bundleId: string }) {
    const name = safeName(input.title);
    if (!name) throw new Error("Укажите название");
    const folder = `${this.root}/${name}`;
    if (this.app.vault.getAbstractFileByPath(folder)) throw new Error("Приложение с таким названием уже есть");
    const first = this.stages[0];
    const top = Math.min(0, ...this.apps.filter((a) => a.stage === first.id).map((a) => a.position));
    await this.ensureFolder(folder);
    const fm = {
      traffic_hub: "app",
      stage: first.id,
      position: top - 1,
      primary_locale: input.primaryLocale,
      bundle_id: input.bundleId,
      store_url: "",
      account: "",
      icon: "",
      screenshots: {},
      history: [{ date: today(), from: null, to: first.name }],
      created: today(),
    };
    await this.app.vault.create(`${folder}/${name}.md`, `---\n${stringifyYaml(fm)}---\n\nЗаметки по приложению.\n`);
    const rec = { folder } as AppRecord;
    await this.writeLocale(rec, { ...emptyTexts(), title: input.title.trim(), subtitle: input.subtitle.trim(), locale: input.primaryLocale, auto: false });
    await this.reload();
    return folder;
  }

  async updateApp(app: AppRecord, fields: { bundleId: string; storeUrl: string; account: string }) {
    await this.patchApp(app, (fm) => {
      fm.bundle_id = fields.bundleId;
      fm.store_url = fields.storeUrl;
      fm.account = fields.account;
    });
    await this.reload();
  }

  async setIcon(app: AppRecord, file: File) {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
    if (!IMAGE_EXT.has(ext)) throw new Error("Иконка должна быть PNG, JPG или WebP");
    const name = `icon-${Date.now()}.${ext}`;
    await this.app.vault.createBinary(`${app.folder}/${name}`, await file.arrayBuffer());
    const old = app.icon ? this.app.vault.getFileByPath(app.icon) : null;
    await this.patchApp(app, (fm) => (fm.icon = name));
    if (old) await this.app.fileManager.trashFile(old);
    await this.reload();
  }

  async moveApp(appId: string, stageId: string, beforeId: string | null) {
    const app = this.get(appId);
    const stage = this.stages.find((s) => s.id === stageId);
    if (!app || !stage) return;
    const column = this.apps.filter((a) => a.stage === stageId && a.id !== appId);
    const idx = beforeId ? column.findIndex((c) => c.id === beforeId) : -1;
    let position: number;
    if (idx === -1) position = (column.at(-1)?.position ?? 0) + 1;
    else if (idx === 0) position = column[0].position - 1;
    else position = (column[idx - 1].position + column[idx].position) / 2;

    const fromName = this.stages.find((s) => s.id === app.stage)?.name ?? null;
    // Сразу обновляем в памяти, чтобы доска не мигала
    const changed = app.stage !== stageId;
    app.stage = stageId;
    app.position = position;
    this.apps.sort((a, b) => a.position - b.position);
    this.emit();
    await this.patchApp(app, (fm) => {
      fm.stage = stageId;
      fm.position = position;
      if (changed) fm.history = [...(Array.isArray(fm.history) ? fm.history : []), { date: today(), from: fromName, to: stage.name }];
    });
    await this.reload();
  }

  async deleteApp(app: AppRecord) {
    const folder = this.app.vault.getFolderByPath(app.folder);
    if (folder) await this.app.fileManager.trashFile(folder);
    await this.reload();
  }

  // ---------- этапы ----------

  async saveStages(stages: Stage[]) {
    if (!stages.length) throw new Error("Нужен хотя бы один этап");
    await this.writeStages(stages);
    await this.reload();
  }

  async deleteStage(stageId: string, moveTo: string | null) {
    const target = this.stages.find((s) => s.id === moveTo);
    const from = this.stages.find((s) => s.id === stageId);
    const affected = this.apps.filter((a) => a.stage === stageId);
    if (affected.length && !target) throw new Error("Выберите, куда перенести приложения");
    for (const app of affected) {
      await this.patchApp(app, (fm) => {
        fm.stage = target!.id;
        fm.history = [...(Array.isArray(fm.history) ? fm.history : []), { date: today(), from: from?.name ?? null, to: target!.name }];
      });
    }
    await this.saveStages(this.stages.filter((s) => s.id !== stageId));
  }

  // ---------- локализации ----------

  async saveLocale(app: AppRecord, locale: string, texts: LocalizedTexts) {
    await this.writeLocale(app, { ...texts, locale, auto: false });
    await this.reload();
  }

  private async translateInto(app: AppRecord, source: string, targets: string[]): Promise<TranslateReport> {
    const src = app.locales[source];
    if (!src) throw new Error("Нет исходной локали");
    let trimmed = 0;
    const results = await mapLimit(targets, 3, async (locale) => {
      const { texts, trimmed: cut } = await this.translator.translate(src, source, locale);
      if (cut.length) trimmed++;
      await this.writeLocale(app, { ...texts, locale, auto: true });
    });
    const failed = targets.filter((_, i) => results[i].status === "rejected");
    const firstErr = results.find((r) => r.status === "rejected");
    const error = firstErr?.status === "rejected" && firstErr.reason instanceof Error ? firstErr.reason.message : null;
    return { translated: targets.length - failed.length, trimmed, failed, error };
  }

  async addLocales(app: AppRecord, locales: string[], auto: boolean, source: string): Promise<TranslateReport | null> {
    const fresh = locales.filter((l) => isLocale(l) && !app.locales[l]);
    for (const locale of fresh) await this.writeLocale(app, { ...emptyTexts(), locale, auto: false });
    const report = auto ? await this.translateInto(app, source, fresh) : null;
    await this.reload();
    return report;
  }

  async retranslate(app: AppRecord, source: string, targets: string[]) {
    const report = await this.translateInto(app, source, targets.filter((t) => t !== source && app.locales[t]));
    await this.reload();
    return report;
  }

  async removeLocale(app: AppRecord, locale: string) {
    if (locale === app.primaryLocale) throw new Error("Нельзя удалить основную локаль");
    const file = this.app.vault.getFileByPath(`${app.folder}/${LOC_DIR}/${locale}.md`);
    if (file) await this.app.fileManager.trashFile(file);
    await this.patchApp(app, (fm) => {
      if (fm.screenshots && typeof fm.screenshots === "object") delete (fm.screenshots as Record<string, unknown>)[locale];
    });
    await this.reload();
  }

  async setPrimaryLocale(app: AppRecord, locale: string) {
    await this.patchApp(app, (fm) => (fm.primary_locale = locale));
    await this.reload();
  }

  // ---------- скрины ----------

  async uploadShots(app: AppRecord, files: File[]) {
    const dir = `${app.folder}/${SHOTS_DIR}`;
    await this.ensureFolder(dir);
    for (const file of files) {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!IMAGE_EXT.has(ext)) continue;
      const base = safeName(file.name.replace(/\.[^.]+$/, "")) || "shot";
      let path = `${dir}/${base}.${ext}`;
      for (let i = 2; this.app.vault.getAbstractFileByPath(path); i++) path = `${dir}/${base}-${i}.${ext}`;
      await this.app.vault.createBinary(path, await file.arrayBuffer());
    }
    await this.reload();
  }

  async deleteShot(app: AppRecord, path: string) {
    const file = this.app.vault.getFileByPath(path);
    await this.patchApp(app, (fm) => {
      const sets = (fm.screenshots ?? {}) as Record<string, string[]>;
      const name = this.shotNames(app, [path])[0];
      for (const k of Object.keys(sets)) {
        sets[k] = (sets[k] ?? []).filter((n) => n !== name);
        if (!sets[k].length) delete sets[k];
      }
      fm.screenshots = sets;
    });
    if (file) await this.app.fileManager.trashFile(file);
    await this.reload();
  }

  // Набор (порядок скринов) применяется ко всем отмеченным локалям
  async applySet(app: AppRecord, paths: string[], locales: string[]) {
    if (paths.length > MAX_SHOTS_PER_LOCALE) throw new Error(`Не больше ${MAX_SHOTS_PER_LOCALE} скринов в локали`);
    const names = this.shotNames(app, paths);
    await this.patchApp(app, (fm) => {
      const sets = (fm.screenshots && typeof fm.screenshots === "object" ? fm.screenshots : {}) as Record<string, string[]>;
      for (const l of locales) {
        if (!app.locales[l]) continue;
        if (names.length) sets[l] = [...names];
        else delete sets[l];
      }
      fm.screenshots = sets;
    });
    await this.reload();
  }

  openNote(app: AppRecord) {
    const file = this.app.vault.getFileByPath(app.note);
    if (file) void this.app.workspace.getLeaf("tab").openFile(file);
  }
}

export type { LocalizedField };
