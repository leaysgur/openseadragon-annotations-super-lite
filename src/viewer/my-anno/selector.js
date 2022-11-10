import OpenSeadragon from "openseadragon";

/**
 * @param {string} id
 * @param {import("openseadragon").Rect} location
 * @param {import("openseadragon").Viewer} viewer
 */
export const renderAnnotation = (id, location, viewer) => {
  const $overlay = document.createElement("div");
  Object.assign($overlay, {
    id,
    className: "anno-overlay",
  });

  viewer.addOverlay($overlay, location);

  const overlay = viewer.getOverlayById(id);
  const overlayTracker = new OpenSeadragon.MouseTracker({
    element: $overlay,
    clickHandler(ev) {
      // @ts-ignore: It surely exists!!!
      if (!ev.quick) {
        return;
      }

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
      const loc = overlay.getBounds(viewer.viewport);

      const nextLoc = loc.translate(delta);

      viewer.updateOverlay($overlay, nextLoc);
    },
  });

  //
  // RESIZE
  //
  const $resizer = document.createElement("div");
  Object.assign($resizer, {
    className: "anno-overlay-resizer",
  });
  $overlay.append($resizer);

  const resizerTracker = new OpenSeadragon.MouseTracker({
    element: $resizer,
    pressHandler() {
      $resizer.classList.add("-grabbing");
    },
    releaseHandler() {
      $resizer.classList.remove("-grabbing");
    },
    dragHandler(ev) {
      // @ts-ignore: It surely exists!!!
      const delta = viewer.viewport.deltaPointsFromPixels(ev.delta);
      const loc = overlay.getBounds(viewer.viewport);

      const nextLoc = loc.clone();
      // Resize = x, y stays same, updates w, h
      nextLoc.width = loc.width + delta.x;
      nextLoc.height = loc.height + delta.y;

      viewer.updateOverlay($overlay, nextLoc);
    },
  });
};

/** @param {import("openseadragon").CanvasClickEvent} ev */
const onViewerCanvasClick = (ev) => {
  if (!ev.quick) {
    return;
  }

  const viewer = ev.eventSource;

  const aId = `anno:${Date.now()}`;
  const point = viewer.viewport.pointFromPixel(ev.position);
  const aLocation = new OpenSeadragon.Rect(point.x, point.y, 0.05, 0.05);

  renderAnnotation(aId, aLocation, viewer);
};

/** @param {import("openseadragon").Viewer} viewer */
export const install = (viewer) => {
  // Click to add overlay
  viewer.addHandler("canvas-click", onViewerCanvasClick);

  // Disable it for click-to-add-overlay
  for (const type of ["mouse", "touch", "pen", "unknown"]) {
    viewer.gestureSettingsByDeviceType(type).clickToZoom = false;
  }

  return () => {
    viewer.removeHandler("canvas-click", onViewerCanvasClick);
  };
};
