import { App, Modal } from "obsidian";
import { t as tr } from "../i18n";

export type QueryDslSubmitMode = "update" | "saveAs";

export class QueryDslModal extends Modal {
  private value: string;
  private readonly hasExisting: boolean;
  private readonly onSubmit: (mode: QueryDslSubmitMode, text: string) => Promise<void>;
  private errorEl: HTMLElement | null = null;

  constructor(
    app: App,
    initialValue: string,
    hasExisting: boolean,
    onSubmit: (mode: QueryDslSubmitMode, text: string) => Promise<void>,
  ) {
    super(app);
    this.value = initialValue;
    this.hasExisting = hasExisting;
    this.onSubmit = onSubmit;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("task-center-query-dsl-modal");
    contentEl.createEl("h3", { text: tr("savedViews.dslTitle") });
    contentEl.createEl("p", { text: tr("savedViews.dslHelp"), cls: "setting-item-description" });

    const textarea = contentEl.createEl("textarea", { cls: "tc-full-width-input" });
    textarea.rows = 18;
    textarea.value = this.value;
    textarea.dataset.queryDslInput = "true";
    textarea.addEventListener("input", () => {
      this.value = textarea.value;
      this.clearError();
    });
    textarea.addEventListener("keydown", (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && !event.isComposing) {
        event.preventDefault();
        void this.commit(this.hasExisting ? "update" : "saveAs");
      } else if (event.key === "Escape") {
        event.preventDefault();
        this.close();
      }
    });

    this.errorEl = contentEl.createDiv({ cls: "tc-qa-error" });
    this.errorEl.hide();

    const actions = contentEl.createDiv({ cls: "task-center-saved-view-name-actions" });
    const cancel = actions.createEl("button", { text: tr("savedViews.cancel") });
    cancel.addEventListener("click", () => this.close());
    if (this.hasExisting) {
      const update = actions.createEl("button", { text: tr("savedViews.update"), cls: "mod-cta" });
      update.dataset.action = "update-current-view-dsl";
      update.addEventListener("click", () => void this.commit("update"));
    }
    const saveAs = actions.createEl("button", {
      text: tr("savedViews.save"),
      cls: this.hasExisting ? "" : "mod-cta",
    });
    saveAs.dataset.action = "save-current-view-dsl";
    saveAs.addEventListener("click", () => void this.commit("saveAs"));

    window.setTimeout(() => {
      textarea.focus();
      textarea.select();
    }, 10);
  }

  private async commit(mode: QueryDslSubmitMode): Promise<void> {
    try {
      await this.onSubmit(mode, this.value);
      this.close();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.showError(message);
    }
  }

  private showError(message: string): void {
    if (!this.errorEl) return;
    this.errorEl.setText(message);
    this.errorEl.show();
  }

  private clearError(): void {
    if (!this.errorEl) return;
    this.errorEl.setText("");
    this.errorEl.hide();
  }
}
