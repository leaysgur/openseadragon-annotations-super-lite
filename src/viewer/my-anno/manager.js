import { Annotation } from "./annotation";
/**
 * @typedef {import("./annotation").AnnotationInit} AnnotationInit
 * @typedef {import("./annotation").NotifyMessage} NotifyMessage
 */

/**
 * @typedef {{
 *   type: "annotation:added";
 *   data: AnnotationInit;
 * }} AnnotationAddedEvent
 * @typedef {{
 *   type: "annotation:updated";
 *   data: AnnotationInit;
 * }} AnnotationUpdatedEvent
 * @typedef {{
 *   type: "annotation:removed";
 *   data: { id: string }
 * }} AnnotationRemovedEvent
 * @typedef {{
 *   type: "annotation:selected";
 *   data: { id: string }
 * }} AnnotationSelectedEvent
 * @typedef {{
 *   type: "annotation:deselected";
 *   data: null;
 * }} AnnotationDeselectedEvent
 *
 * @typedef {(
 *   | AnnotationAddedEvent
 *   | AnnotationRemovedEvent
 *   | AnnotationUpdatedEvent
 *   | AnnotationSelectedEvent
 *   | AnnotationDeselectedEvent
 * )} AnnotationEvent
 */

export class AnnotationManager {
  /** @type {import("openseadragon").Viewer} */
  #viewer;

  /** @type {(event: AnnotationEvent) => void} */
  #notify;
  // ↑ App <-> AnnotationManager
  // ↓         AnnotationManager <-> Annotation
  #channel = new MessageChannel();

  /** @type {Map<string, Annotation>} */
  #annotations = new Map();

  /** @param {import("openseadragon").Viewer} viewer */
  constructor(viewer) {
    this.#viewer = viewer;

    const events = new BroadcastChannel("my-anno");
    this.#notify = (event) => events.postMessage(event);
  }

  /** @param {AnnotationInit[]} inits */
  restore(inits) {
    for (const init of inits) {
      if (!init) {
        continue;
      }
      this.#addAnnotation(init);
    }

    return this;
  }

  activate() {
    // Disable it for click-to-add-overlay
    for (const type of ["mouse", "touch", "pen", "unknown"]) {
      this.#viewer.gestureSettingsByDeviceType(type).clickToZoom = false;
    }
    // Click to add overlay
    this.#viewer.addHandler("canvas-click", this.#onViewerCanvasClick);

    // Keyboard shortcut
    this.#viewer.addHandler("canvas-key", this.#onViewerCanvasKey);
    // CanvasKeyEvent is only fired when focused
    this.#viewer.addHandler("canvas-enter", this.#onViewerCanvasEnter);
    this.#viewer.addHandler("canvas-exit", this.#onViewerCanvasExit);

    this.#channel.port1.onmessage = this.#onAnnotationNotifyMessage;

    // Activate restored annotations
    for (const annotation of this.#annotations.values()) {
      annotation.activate();
    }

    return this;
  }

  destroy() {
    this.#channel.port1.onmessage = null;
    this.#channel.port1.close();
    this.#channel.port2.onmessage = null;
    this.#channel.port2.close();

    for (const annotation of this.#annotations.values()) {
      annotation.destroy();
    }
    this.#annotations.clear();

    for (const type of ["mouse", "touch", "pen", "unknown"]) {
      this.#viewer.gestureSettingsByDeviceType(type).clickToZoom = true;
    }
    this.#viewer.removeHandler("canvas-click", this.#onViewerCanvasClick);

    this.#viewer.removeHandler("canvas-key", this.#onViewerCanvasKey);
    this.#viewer.removeHandler("canvas-enter", this.#onViewerCanvasEnter);
    this.#viewer.removeHandler("canvas-exit", this.#onViewerCanvasExit);
  }

  /** @param {{ data: NotifyMessage }} message */
  #onAnnotationNotifyMessage = ({ data: { type, id } }) => {
    const annotation = this.#annotations.get(id);
    if (!annotation) {
      return;
    }

    switch (type) {
      case "removeHandle:click": {
        this.#notify({
          type: "annotation:removed",
          data: annotation.toJSON(),
        });
        this.#deleteAnnotation(id);
        break;
      }
      case "overlay:click": {
        this.#notify({
          type: "annotation:selected",
          data: { id },
        });
        this.#selectAnnotation(id);
        break;
      }
      case "resizeHandle:dragEnd": {
        this.#notify({
          type: "annotation:updated",
          data: annotation.toJSON(),
        });
        break;
      }
      case "overlay:dragEnd": {
        this.#notify({
          type: "annotation:updated",
          data: annotation.toJSON(),
        });
        break;
      }
    }
  };

  /** @param {import("openseadragon").CanvasClickEvent} ev */
  #onViewerCanvasClick = (ev) => {
    if (!ev.quick) {
      return;
    }

    if ([...this.#annotations.values()].some((a) => a.selected)) {
      this.#selectAnnotation(null);
      this.#notify({
        type: "annotation:deselected",
        data: null,
      });
      return;
    }

    const id = `anno_${Date.now()}`;
    const point = this.#viewer.viewport.pointFromPixel(ev.position);
    const location = /** @type {[number, number, number, number]} */ ([
      point.x - 0.02, // centering
      point.y - 0.02, // centering
      0.04,
      0.04,
    ]);

    const annotation = this.#addAnnotation({ id, location }).activate();
    this.#notify({
      type: "annotation:added",
      data: annotation.toJSON(),
    });

    this.#selectAnnotation(id);
  };

  /** @param {import("openseadragon").CanvasKeyEvent} ev */
  #onViewerCanvasKey = (ev) => {
    // @ts-ignore: It surely exists!!!
    switch (ev.originalEvent.key) {
      case "Backspace":
      case "Delete": {
        for (const [id, annotation] of this.#annotations) {
          if (annotation.selected) {
            this.#notify({
              type: "annotation:removed",
              data: { id },
            });
            this.#deleteAnnotation(id);
          }
        }
        ev.originalEvent.preventDefault();
        break;
      }
      case "Escape": {
        this.#selectAnnotation(null);
        this.#notify({
          type: "annotation:deselected",
          data: null,
        });
        break;
      }
    }
  };

  #onViewerCanvasEnter = () => this.#viewer.canvas.focus();
  #onViewerCanvasExit = () => this.#viewer.canvas.blur();

  /** @param {AnnotationInit} init */
  #addAnnotation(init) {
    const annotation = new Annotation(
      {
        viewer: this.#viewer,
        port: this.#channel.port2,
      },
      init,
    ).render();
    this.#annotations.set(init.id, annotation);

    return annotation;
  }

  /** @param {string | null} targetId */
  #selectAnnotation(targetId) {
    for (const [id, annotation] of this.#annotations) {
      annotation.select(id === targetId);
    }
  }

  /** @param {string} targetId */
  #deleteAnnotation(targetId) {
    const annotation = this.#annotations.get(targetId);
    if (!annotation) {
      return;
    }

    this.#annotations.delete(targetId);
    annotation.destroy();
  }
}
