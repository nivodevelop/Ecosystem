import { createRoot } from "react-dom/client";
import { useState } from "react";
import { mockApp } from "obsidian";
import { Store } from "../src/store";
import { Translator } from "../src/translate";
import { Board } from "../src/ui/Board";
import { AppPage } from "../src/ui/AppPage";
import { NewAppForm } from "../src/ui/NewAppForm";
import { StagesEditor } from "../src/ui/StagesEditor";
import { Ctx, type HubContext } from "../src/ui/context";

const store = new Store(mockApp as never, () => "Traffic Hub", new Translator(() => ""));
let setView: (v: string) => void = () => {};

function Shell() {
  const [view, set] = useState("board");
  setView = set;
  const ctx: HubContext = {
    store,
    openApp: (id) => set(`app:${id}`),
    newApp: () => set("new"),
    openStages: () => set("stages"),
  };
  return (
    <Ctx.Provider value={ctx}>
      <div className="workspace-leaf-content th-root">
        {view === "board" && <Board />}
        {view.startsWith("app:") && <AppPage id={view.slice(4)} onTitle={() => {}} />}
        {view === "new" && (
          <div className="modal">
            <div className="modal-title">Новое приложение</div>
            <NewAppForm onCreated={(id) => set(`app:${id}`)} />
          </div>
        )}
        {view === "stages" && (
          <div className="modal th-modal">
            <div className="modal-title">Этапы канбана</div>
            <StagesEditor />
          </div>
        )}
      </div>
    </Ctx.Provider>
  );
}

(window as unknown as Record<string, unknown>).hub = { store, go: (v: string) => setView(v) };
void store.reload().then(() => createRoot(document.getElementById("app")!).render(<Shell />));
