import OpenSeadragon from "openseadragon";

/**
 * @typedef {{
 *   id: string;
 *   location: [x: number, y: number, w: number, h: number];
 * }} AnnotationInit
 * */

export class Annotation {
  /**
   * @param {import("openseadragon").Viewer} viewer
   * @param {AnnotationInit} init
   * @param {MessagePort} port
   */
  constructor(viewer, { id, location }, port) {
    this.viewer = viewer;

    this.id = id;
    /** @type {import("openseadragon").Rect} */
    this.location = new OpenSeadragon.Rect(...location);

    this.port = port;

    this.hostElement = document.createElement("div");
    Object.assign(this.hostElement, {
      id: this.id,
      className: "anno-overlay",
    });

    /** @type {Map<string, import("openseadragon").MouseTracker>} */
    this.mouseTrackers = new Map();
  }

  /** @param {string} trigger */
  notify(trigger) {
    /** @type {AnnotationInit} */
    const json = {
      id: this.id,
      location: [
        this.location.x,
        this.location.y,
        this.location.width,
        this.location.height,
      ],
    };

    this.port.postMessage({ type: trigger, data: { annotation: json } });
  }

  destroy() {
    const { viewer, hostElement: $overlay } = this;

    // Internally calls overlay.destroy();
    viewer.removeOverlay($overlay);
    // Need to delay until all possible events are processed
    requestIdleCallback(() => {
      [...this.mouseTrackers.values()].forEach((tracker) => tracker.destroy());
      this.mouseTrackers.clear();
    });

    this.notify("removed");
  }

  /** @param {"added" | "restored"} trigger */
  render(trigger) {
    this.viewer.addOverlay(this.hostElement, this.location);

    this.notify(trigger);
  }

  activate() {
    const { id, viewer, hostElement: $overlay } = this;

    const overlay = this.viewer.getOverlayById(id);
    this.mouseTrackers.set(
      "overlay",
      new OpenSeadragon.MouseTracker({
        element: $overlay,
        //
        // CLICK
        //
        clickHandler: (ev) => {
          // @ts-ignore: It surely exists!!!
          if (!ev.quick) {
            return;
          }

          this.notify("clicked");
        },

        //
        // DRAG
        //
        pressHandler: () => {
          $overlay.classList.add("-grabbing");
        },
        releaseHandler: () => {
          $overlay.classList.remove("-grabbing");
          this.notify("moved");
        },
        dragHandler: (ev) => {
          // @ts-ignore: It surely exists!!!
          const delta = viewer.viewport.deltaPointsFromPixels(ev.delta);
          const loc = overlay.getBounds(viewer.viewport);

          const nextLoc = loc.translate(delta);

          this.location = nextLoc;
          viewer.updateOverlay($overlay, nextLoc);
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
    $overlay.append($removeHandle);

    this.mouseTrackers.set(
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
    $overlay.append($resizeHandle);

    this.mouseTrackers.set(
      "resizeHandle",
      new OpenSeadragon.MouseTracker({
        element: $resizeHandle,
        pressHandler: () => {
          $resizeHandle.classList.add("-grabbing");
        },
        releaseHandler: () => {
          $resizeHandle.classList.remove("-grabbing");
          this.notify("resized");
        },
        dragHandler: (ev) => {
          // @ts-ignore: It surely exists!!!
          const delta = viewer.viewport.deltaPointsFromPixels(ev.delta);
          const loc = overlay.getBounds(viewer.viewport);

          const nextLoc = loc.clone();
          // Resize = x, y stays same, updates w, h
          nextLoc.width = loc.width + delta.x;
          nextLoc.height = loc.height + delta.y;

          this.location = nextLoc;
          viewer.updateOverlay($overlay, nextLoc);
        },
      }),
    );
  }
}
