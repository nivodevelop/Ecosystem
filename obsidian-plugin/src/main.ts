import { ItemView, Modal, Notice, Plugin, PluginSettingTab, Setting, WorkspaceLeaf, type ViewStateResult } from "obsidian";
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Store } from "./store";
import { Translator } from "./translate";
import { Board } from "./ui/Board";
import { AppPage } from "./ui/AppPage";
import { NewAppForm } from "./ui/NewAppForm";
import { StagesEditor } from "./ui/StagesEditor";
import { Ctx, type HubContext } from "./ui/context";

export const VIEW_BOARD = "traffic-hub-board";
export const VIEW_APP = "traffic-hub-app";

type Settings = { root: string; libreUrl: string };
const DEFAULTS: Settings = { root: "Traffic Hub", libreUrl: "" };

export default class TrafficHubPlugin extends Plugin {
  settings: Settings = DEFAULTS;
  store!: Store;

  async onload() {
    this.settings = { ...DEFAULTS, ...((await this.loadData()) as Partial<Settings>) };
    const translator = new Translator(() => this.settings.libreUrl);
    this.store = new Store(this.app, () => this.settings.root, translator);

    this.registerView(VIEW_BOARD, (leaf) => new BoardView(leaf, this));
    this.registerView(VIEW_APP, (leaf) => new AppView(leaf, this));

    this.addRibbonIcon("kanban-square", "Traffic Hub: доска приложений", () => void this.openBoard());
    this.addCommand({ id: "open-board", name: "Открыть доску приложений", callback: () => void this.openBoard() });
    this.addCommand({ id: "new-app", name: "Новое приложение", callback: () => this.newApp() });
    this.addSettingTab(new HubSettingTab(this));

    // Перечитываем данные, когда файлы меняются извне (ручная правка, синхронизация)
    const onChange = (path: string) => this.store.isOwnPath(path) && this.store.scheduleReload();
    this.registerEvent(this.app.vault.on("modify", (f) => onChange(f.path)));
    this.registerEvent(this.app.vault.on("create", (f) => onChange(f.path)));
    this.registerEvent(this.app.vault.on("delete", (f) => onChange(f.path)));
    this.registerEvent(this.app.vault.on("rename", (f, old) => (onChange(f.path), onChange(old))));

    this.app.workspace.onLayoutReady(() => void this.store.reload());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    await this.store.reload();
  }

  context(): HubContext {
    return { store: this.store, openApp: (id) => void this.openApp(id), newApp: () => this.newApp(), openStages: () => this.openStages() };
  }

  async openBoard() {
    const existing = this.app.workspace.getLeavesOfType(VIEW_BOARD)[0];
    const leaf = existing ?? this.app.workspace.getLeaf("tab");
    if (!existing) await leaf.setViewState({ type: VIEW_BOARD, active: true });
    void this.app.workspace.revealLeaf(leaf);
  }

  async openApp(id: string) {
    const existing = this.app.workspace.getLeavesOfType(VIEW_APP).find((l) => (l.view as AppView).appId === id);
    const leaf = existing ?? this.app.workspace.getLeaf("tab");
    if (!existing) await leaf.setViewState({ type: VIEW_APP, active: true, state: { id } });
    void this.app.workspace.revealLeaf(leaf);
  }

  newApp() {
    new ReactModal(this, "Новое приложение", (close) =>
      createElement(NewAppForm, {
        onCreated: (id: string) => {
          close();
          void this.openApp(id);
        },
      }),
    ).open();
  }

  openStages() {
    new ReactModal(this, "Этапы канбана", () => createElement(StagesEditor)).open();
  }
}

abstract class ReactView extends ItemView {
  protected root: Root | null = null;
  constructor(leaf: WorkspaceLeaf, protected plugin: TrafficHubPlugin) {
    super(leaf);
  }
  protected abstract element(): React.ReactElement;
  protected renderReact() {
    this.root ??= createRoot(this.contentEl);
    this.root.render(createElement(Ctx.Provider, { value: this.plugin.context() }, this.element()));
  }
  async onOpen() {
    this.contentEl.addClass("th-root");
    this.renderReact();
  }
  async onClose() {
    this.root?.unmount();
    this.root = null;
  }
}

class BoardView extends ReactView {
  getViewType() {
    return VIEW_BOARD;
  }
  getDisplayText() {
    return "Приложения";
  }
  getIcon() {
    return "kanban-square";
  }
  protected element() {
    return createElement(Board);
  }
}

class AppView extends ReactView {
  appId = "";
  getViewType() {
    return VIEW_APP;
  }
  getDisplayText() {
    const app = this.plugin.store.get(this.appId);
    return app ? this.plugin.store.title(app) : "Приложение";
  }
  getIcon() {
    return "smartphone";
  }
  getState() {
    return { id: this.appId };
  }
  async setState(state: { id?: string }, result: ViewStateResult) {
    this.appId = state.id ?? "";
    this.renderReact();
    return super.setState(state, result);
  }
  protected element() {
    return createElement(AppPage, { id: this.appId, onTitle: () => (this.leaf as unknown as { updateHeader?: () => void }).updateHeader?.() });
  }
}

class ReactModal extends Modal {
  private root: Root | null = null;
  constructor(private plugin: TrafficHubPlugin, private heading: string, private render: (close: () => void) => React.ReactElement) {
    super(plugin.app);
  }
  onOpen() {
    this.setTitle(this.heading);
    this.modalEl.addClass("th-modal");
    this.contentEl.addClass("th-root");
    this.root = createRoot(this.contentEl);
    this.root.render(createElement(Ctx.Provider, { value: this.plugin.context() }, this.render(() => this.close())));
  }
  onClose() {
    this.root?.unmount();
  }
}

class HubSettingTab extends PluginSettingTab {
  constructor(private plugin: TrafficHubPlugin) {
    super(plugin.app, plugin);
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    new Setting(containerEl)
      .setName("Папка с данными")
      .setDesc("Где в хранилище лежат приложения, локализации и скрины")
      .addText((t) =>
        t.setValue(this.plugin.settings.root).onChange(async (v) => {
          this.plugin.settings.root = v.trim() || DEFAULTS.root;
          await this.plugin.saveSettings();
        }),
      );
    new Setting(containerEl)
      .setName("LibreTranslate (необязательно)")
      .setDesc("Адрес своего сервера LibreTranslate, например http://localhost:5000. Пусто — бесплатный Google Translate.")
      .addText((t) =>
        t.setPlaceholder("http://localhost:5000").setValue(this.plugin.settings.libreUrl).onChange(async (v) => {
          this.plugin.settings.libreUrl = v.trim();
          await this.plugin.saveData(this.plugin.settings);
        }),
      );
    new Setting(containerEl)
      .setName("Этапы канбана")
      .setDesc("Названия, цвета и порядок колонок")
      .addButton((b) => b.setButtonText("Настроить").onClick(() => this.plugin.openStages()));
  }
}

export { Notice };
