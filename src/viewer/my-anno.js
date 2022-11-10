import OpenSeadragon from "openseadragon";

/**
 * @typedef {{
 * }} MyAnnoContext
 */

/** @param {MyAnnoContext} ctx */
const handleViewerCanvasClick =
  (ctx) =>
  /** @param {import("openseadragon").CanvasClickEvent} ev */
  (ev) => {
    if (!ev.quick) { return; }

    ctx;
    const viewer = ev.eventSource;

    const oId = `overlay:${Date.now()}`;

    const $overlay = document.createElement("div");
    Object.assign($overlay, {
      id: oId,
      className: "my-overlay",
    });

    const point = viewer.viewport.pointFromPixel(ev.position);
    viewer.addOverlay(
      $overlay,
      new OpenSeadragon.Rect(point.x, point.y, 0.05, 0.05),
    );

    const overlay = viewer.getOverlayById(oId);
    const overlayTracker = new OpenSeadragon.MouseTracker({
      element: $overlay,
      clickHandler(ev) {
        // @ts-ignore: It surely exists!!!
        if (!ev.quick) { return; }

        // Internally calls overlay.destroy();
        viewer.removeOverlay($overlay);
        // Need to delay until all possible events are processed
        requestIdleCallback(() => {
          resizerTracker.destroy();
          overlayTracker.destroy();
        });
      },

      //
      // DRAG
      //
      pressHandler() {
        $overlay.classList.add("-grabbing");
      },
      releaseHandler() {
        $overlay.classList.remove("-grabbing");
      },
      dragHandler(ev) {
        // @ts-ignore: It surely exists!!!
        const delta = viewer.viewport.deltaPointsFromPixels(ev.delta);

        const pos = overlay.getBounds(viewer.viewport);
        // @ts-ignore: It surely exists!!!
        overlay.update({ location: pos.translate(delta) });
        // @ts-ignore: It surely exists!!!
        overlay.drawHTML(viewer.overlaysContainer, viewer.viewport);
      },
    });

    //
    // RESIZE
    //
    const $resizer = document.createElement("div");
    Object.assign($resizer, {
      className: "my-overlay-resizer",
    });
    $overlay.append($resizer);

    const resizerTracker = new OpenSeadragon.MouseTracker({
      element: $resizer,
      dragHandler(ev) {
        // @ts-ignore: It surely exists!!!
        const delta = viewer.viewport.deltaPointsFromPixels(ev.delta);

        // Resize = x, y stays same, updates w, h
        const loc = overlay.getBounds(viewer.viewport);
        loc.width = loc.width + delta.x;
        loc.height = loc.height + delta.y;

        // @ts-ignore: It surely exists!!!
        overlay.update({ location: loc });
        // @ts-ignore: It surely exists!!!
        overlay.drawHTML(viewer.overlaysContainer, viewer.viewport);
      },
    });
  };

/** @param {import("openseadragon").Viewer} viewer */
export const install = (viewer) => {
  /** @type {MyAnnoContext} */
  const context = {};
  const onViewerCanvasClick = handleViewerCanvasClick(context);

  // Click to add overlay
  viewer.addHandler("canvas-click", onViewerCanvasClick);
  // Disable it for click-to-add-overlay
  for (const type of ["mouse", "touch", "pen", "unknown"]) {
    viewer.gestureSettingsByDeviceType(type).clickToZoom = false;
  }

  return {
    destroy() {
      viewer.removeHandler("canvas-click", onViewerCanvasClick);
    },
  };
};
