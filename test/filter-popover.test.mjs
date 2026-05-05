// Unit tests for US-109e: filter popovers dismiss on outside pointerdown.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

// ── Minimal DOM polyfill for Node.js test runner ───────────────────
// Node.js does not ship HTMLElement / document. We create lean stubs
// so isClickInsideFilterControls can walk composed paths and run
// closest() against data attributes and class selectors exactly as it
// does in the browser.
if (typeof HTMLElement === "undefined") {
  class MockElement {
    constructor(tagName) {
      this.tagName = tagName.toUpperCase();
      this.dataset = {};
      this.className = "";
      this.parentElement = null;
      this._children = [];
    }
    appendChild(child) {
      child.parentElement = this;
      this._children.push(child);
    }
    closest(selector) {
      const selectors = selector.split(",").map((s) => s.trim());
      let el = this;
      while (el) {
        for (const sel of selectors) {
          if (sel === "[data-saved-views]" && el.dataset && el.dataset.savedViews === "true") return el;
          if (sel.startsWith(".") && el.className && el.className.includes(sel.slice(1))) return el;
        }
        el = el.parentElement;
      }
      return null;
    }
  }
  globalThis.HTMLElement = MockElement;
  globalThis.document = {
    createElement(tag) { return new MockElement(tag); },
    createElementNS(_ns, tag) {
      // SVG elements are NOT HTMLElement — return a plain EventTarget
      // subclass so instanceof HTMLElement returns false.
      const el = { tagName: tag.toUpperCase(), dataset: {}, parentElement: null, _children: [] };
      el.appendChild = function (child) { child.parentElement = el; el._children.push(child); };
      el.closest = MockElement.prototype.closest;
      return el;
    },
  };
}

function compilePure() {
  const result = spawnSync(
    "npx",
    [
      "esbuild",
      "src/view/filter-popover.ts",
      "--bundle=false",
      "--format=esm",
      "--platform=node",
      "--outdir=test/.compiled/view",
      "--loader:.ts=ts",
    ],
    { cwd: process.cwd(), stdio: "pipe", encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error("esbuild compile failed:\n" + result.stderr);
  }
}

compilePure();
const { shouldCloseFilterPopoverOnPointerDown, isClickInsideFilterControls } = await import("../test/.compiled/view/filter-popover.js");

// ── shouldCloseFilterPopoverOnPointerDown ──────────────────────────

test("US-109e: outside pointerdown closes an open filter popover", () => {
  assert.equal(
    shouldCloseFilterPopoverOnPointerDown({
      isOpen: true,
      isInsideFilterControls: false,
    }),
    true,
  );
});

test("US-109e: clicks inside filter controls keep the popover open", () => {
  assert.equal(
    shouldCloseFilterPopoverOnPointerDown({
      isOpen: true,
      isInsideFilterControls: true,
    }),
    false,
  );
});

test("US-109e: closed popovers ignore outside pointerdown", () => {
  assert.equal(
    shouldCloseFilterPopoverOnPointerDown({
      isOpen: false,
      isInsideFilterControls: false,
    }),
    false,
  );
});

// ── isClickInsideFilterControls (integration seam) ──────────────────

/**
 * Builds a composedPath() array that mirrors what a real PointerEvent
 * would produce: target → parent → … → document.
 */
function stubEvent(target) {
  const path = [];
  let node = target;
  while (node) {
    path.push(node);
    node = node.parentElement;
  }
  path.push(document);
  return {
    composedPath: () => path,
  };
}

test("US-109e: isClickInsideFilterControls — inside [data-saved-views] toolbar", () => {
  const wrap = document.createElement("div");
  wrap.dataset.savedViews = "true";
  const btn = document.createElement("button");
  wrap.appendChild(btn);

  assert.equal(isClickInsideFilterControls(stubEvent(btn)), true);
});

test("US-109e: isClickInsideFilterControls — inside popover dropdown itself", () => {
  const wrap = document.createElement("div");
  wrap.dataset.savedViews = "true";
  const popoverWrap = document.createElement("div");
  popoverWrap.className = "bt-filter-popover-wrap";
  const popover = document.createElement("div");
  popover.className = "bt-filter-popover bt-date-popover";
  const option = document.createElement("button");
  popover.appendChild(option);
  popoverWrap.appendChild(popover);
  wrap.appendChild(popoverWrap);

  assert.equal(isClickInsideFilterControls(stubEvent(option)), true);
});

test("US-109e: isClickInsideFilterControls — popover outside [data-saved-views] still recognized", () => {
  const orphan = document.createElement("div");
  orphan.className = "bt-filter-popover bt-date-popover";
  const cell = document.createElement("button");
  orphan.appendChild(cell);

  assert.equal(isClickInsideFilterControls(stubEvent(cell)), true);
});

test("US-109e: isClickInsideFilterControls — outside everything returns false", () => {
  const body = document.createElement("div");
  body.className = "bt-body";
  const card = document.createElement("div");
  body.appendChild(card);

  assert.equal(isClickInsideFilterControls(stubEvent(card)), false);
});

test("US-109e: isClickInsideFilterControls — SVG target with HTMLElement ancestor", () => {
  const wrap = document.createElement("div");
  wrap.dataset.savedViews = "true";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  wrap.appendChild(svg);

  assert.equal(isClickInsideFilterControls(stubEvent(svg)), true);
});
