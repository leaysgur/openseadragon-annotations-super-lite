import OpenSeadragon from "openseadragon";

/**
 * @typedef {{
 *   id: string;
 *   location: [x: number, y: number, w: number, h: number];
 * }} AnnotationInit
 *
 * @typedef {
 *   | "added"
 *   | "restored"
 *   | "moved"
 *   | "resized"
 *   | "removed"
 *   | "selected"
 * } AnnotationMessageType;
 * @typedef {{
 *   id: string;
 *   location: [x: number, y: number, w: number, h: number];
 * }} AnnotationMessageData
 * @typedef {{
 *   type: AnnotationMessageType;
 *   data: AnnotationMessageData;
 * }} AnnotationMessage
 * */

export class Annotation {
  /** @type {import("openseadragon").Viewer} viewer */
  #viewer;
  /** @type {string} */
  #id;
  /** @type {import("openseadragon").Rect} */
  #location;

  /** @type {HTMLDivElement} */
  #hostElement = document.createElement("div");
  #selected = false;
  /** @type {BroadcastChannel} */
  #channel = new BroadcastChannel("my-anno");
  /** @type {Map<string, import("openseadragon").MouseTracker>} */
  #mouseTrackers = new Map();

  /**
   * @param {import("openseadragon").Viewer} viewer
   * @param {AnnotationInit} init
   */
  constructor(viewer, { id, location }) {
    this.#viewer = viewer;
    this.#id = id;
    this.#location = new OpenSeadragon.Rect(...location);
  }

  /** @param {AnnotationMessageType} type */
  #notify(type) {
    /** @type {AnnotationMessage} */
    const message = {
      type,
      data: {
        id: this.#id,
        location: [
          this.#location.x,
          this.#location.y,
          this.#location.width,
          this.#location.height,
        ],
      },
    };
    this.#channel.postMessage(message);
  }

  destroy() {
    // Internally calls overlay.destroy();
    this.#viewer.removeOverlay(this.#hostElement);

    // Need to delay until all possible events are processed
    requestIdleCallback(() => {
      for (const tracker of this.#mouseTrackers.values()) tracker.destroy();
      this.#mouseTrackers.clear();
    });

    this.#notify("removed");

    this.#channel.onmessage = null;
    this.#channel.close();
  }

  /** @param {"added" | "restored"} trigger */
  render(trigger) {
    Object.assign(this.#hostElement, {
      id: this.#id,
      className: "anno-overlay",
    });

    this.#viewer.addOverlay(this.#hostElement, this.#location);

    this.#notify(trigger);

    this.#channel.onmessage = ({ data }) => {
      if (data.type === "selected" || data.type === "added") {
        this.select(false);
      }
    };

    return this;
  }

  /** @param {boolean} bool */
  select(bool) {
    this.#selected = bool;

    if (this.#selected) {
      this.#hostElement.classList.add("-selected");
    } else {
      this.#hostElement.classList.remove("-selected");
    }

    return this;
  }

  activate() {
    const overlay = this.#viewer.getOverlayById(this.#id);
    this.#mouseTrackers.set(
      "overlay",
      new OpenSeadragon.MouseTracker({
        element: this.#hostElement,
        //
        // CLICK
        //
        clickHandler: (ev) => {
          // @ts-ignore: It surely exists!!!
          if (!ev.quick) {
            return;
          }

          this.select(true);
          this.#notify("selected");
        },

        //
        // DRAG
        //
        dragHandler: (ev) => {
          this.#hostElement.classList.add("-grabbing");

          // @ts-ignore: It surely exists!!!
          const delta = this.#viewer.viewport.deltaPointsFromPixels(ev.delta);
          const loc = overlay.getBounds(this.#viewer.viewport);

          const nextLoc = loc.translate(delta);

          this.#location = nextLoc;
          this.#viewer.updateOverlay(this.#hostElement, nextLoc);
        },
        // XXX: Should double check on releaseHandler?
        dragEndHandler: () => {
          this.#hostElement.classList.remove("-grabbing");
          this.#notify("moved");
        },
      }),
    );

    //
    // REMOVE
    //
    const $removeHandle = document.createElement("div");
    Object.assign($removeHandle, {
      className: "anno-overlay-remove-handle",
    });
    this.#hostElement.append($removeHandle);

    this.#mouseTrackers.set(
      "removeHandle",
      new OpenSeadragon.MouseTracker({
        element: $removeHandle,
        clickHandler: (ev) => {
          // @ts-ignore: It surely exists!!!
          if (!ev.quick) {
            return;
          }

          this.destroy();
        },
      }),
    );

    //
    // RESIZE
    //
    const $resizeHandle = document.createElement("div");
    Object.assign($resizeHandle, {
      className: "anno-overlay-resize-handle",
    });
    this.#hostElement.append($resizeHandle);

    this.#mouseTrackers.set(
      "resizeHandle",
      new OpenSeadragon.MouseTracker({
        element: $resizeHandle,
        dragHandler: (ev) => {
          $resizeHandle.classList.add("-grabbing");

          // @ts-ignore: It surely exists!!!
          const delta = this.#viewer.viewport.deltaPointsFromPixels(ev.delta);
          const loc = overlay.getBounds(this.#viewer.viewport);

          const nextLoc = loc.clone();
          // Resize = x, y stays same, updates w, h
          nextLoc.width = loc.width + delta.x;
          nextLoc.height = loc.height + delta.y;

          this.#location = nextLoc;
          this.#viewer.updateOverlay(this.#hostElement, nextLoc);
        },
        dragEndHandler: () => {
          $resizeHandle.classList.remove("-grabbing");
          this.#notify("resized");
        },
      }),
    );

    return this;
  }
}
