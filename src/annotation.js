import OpenSeadragon from "openseadragon";

/**
 * @typedef {{
 *   id: string;
 *   location: [x: number, y: number, w: number, h: number];
 * }} AnnotationInit
 * @typedef {{
 *    type:
 *      | "overlay:click"
 *      | "overlay:dragEnd"
 *      | "removeHandle:click"
 *      | "resizeHandle:dragEnd"
 *    id: string;
 * }} NotifyMessage
 */

export class Annotation {
  /** @type {import("openseadragon").Viewer} viewer */
  #viewer;
  /** @type {(type: NotifyMessage["type"]) => void} */
  #notify;
  /** @type {string} */
  #id;
  /** @type {import("openseadragon").Rect} */
  #location;

  /** @type {HTMLDivElement} */
  #hostElement = document.createElement("div");
  #selected = false;
  /** @type {Map<string, import("openseadragon").MouseTracker>} */
  #mouseTrackers = new Map();

  /**
   * @param {{
   *   viewer: import("openseadragon").Viewer;
   *   port: MessagePort;
   * }} ctx
   * @param {AnnotationInit} init
   */
  constructor({ viewer, port }, { id, location }) {
    this.#viewer = viewer;
    this.#id = id;
    this.#location = new OpenSeadragon.Rect(...location);

    this.#notify = (type) => port.postMessage({ type, id });
  }

  get selected() {
    return this.#selected;
  }

  /** @returns {AnnotationInit} */
  toJSON() {
    return {
      id: this.#id,
      location: [
        this.#location.x,
        this.#location.y,
        this.#location.width,
        this.#location.height,
      ],
    };
  }

  destroy() {
    // Internally calls overlay.destroy();
    this.#viewer.removeOverlay(this.#hostElement);

    // Need to delay until all possible events are processed
    requestIdleCallback(() => {
      for (const tracker of this.#mouseTrackers.values()) {
        tracker.destroy();
      }
      this.#mouseTrackers.clear();
    });
  }

  render() {
    Object.assign(this.#hostElement, {
      id: this.#id,
      className: "anno-overlay",
    });

    this.#viewer.addOverlay(this.#hostElement, this.#location);

    return this;
  }

  /** @param {boolean} bool */
  select(bool) {
    if (this.#selected === bool) {
      return this;
    }

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
        // SELECT
        //
        clickHandler: (ev) => {
          // @ts-ignore: It surely exists!!!
          if (!ev.quick) {
            return;
          }

          this.#notify("overlay:click");
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
          this.#notify("overlay:dragEnd");
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

          this.#notify("removeHandle:click");
        },
      }),
    );

    //
    // RESIZE
    //
    /** @type {[string, HTMLDivElement][]} */
    const $resizeHandles = [
      ["top-left", document.createElement("div")],
      ["top-right", document.createElement("div")],
      ["bottom-right", document.createElement("div")],
      ["bottom-left", document.createElement("div")],
    ];

    for (const [pos, $resizeHandle] of $resizeHandles) {
      Object.assign($resizeHandle, {
        className: `anno-overlay-resize-handle anno-overlay-resize-handle-${pos}`,
      });
      this.#hostElement.append($resizeHandle);

      this.#mouseTrackers.set(
        `resizeHandle:${pos}`,
        new OpenSeadragon.MouseTracker({
          element: $resizeHandle,
          dragHandler: (ev) => {
            $resizeHandle.classList.add("-grabbing");

            // @ts-ignore: It surely exists!!!
            const delta = this.#viewer.viewport.deltaPointsFromPixels(ev.delta);
            const loc = overlay.getBounds(this.#viewer.viewport);

            const nextLoc = loc.clone();
            switch (pos) {
              case "top-left": {
                nextLoc.x = loc.x + delta.x;
                nextLoc.y = loc.y + delta.y;
                nextLoc.width = loc.width - delta.x;
                nextLoc.height = loc.height - delta.y;
                break;
              }
              case "top-right": {
                nextLoc.y = loc.y + delta.y;
                nextLoc.width = loc.width + delta.x;
                nextLoc.height = loc.height - delta.y;
                break;
              }
              case "bottom-right": {
                nextLoc.width = loc.width + delta.x;
                nextLoc.height = loc.height + delta.y;
                break;
              }
              case "bottom-left": {
                nextLoc.x = loc.x + delta.x;
                nextLoc.width = loc.width - delta.x;
                nextLoc.height = loc.height + delta.y;
                break;
              }
            }

            this.#location = nextLoc;
            this.#viewer.updateOverlay(this.#hostElement, nextLoc);
          },
          dragEndHandler: () => {
            $resizeHandle.classList.remove("-grabbing");
            this.#notify("resizeHandle:dragEnd");
          },
        }),
      );
    }

    return this;
  }
}
