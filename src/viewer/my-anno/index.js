import { Annotation } from "./annotation";
/** @typedef {import("./annotation").AnnotationInit} AnnotationInit */

/**
 * @param {import("openseadragon").Viewer} viewer
 * @param {Set<Annotation>} instances
 */
const handleViewerCanvasClick =
  (viewer, instances) =>
  /** @param {import("openseadragon").CanvasClickEvent} ev */
  (ev) => {
    if (!ev.quick) {
      return;
    }

    const id = `anno:${Date.now()}`;
    const point = viewer.viewport.pointFromPixel(ev.position);
    const location = /** @type {[number, number, number, number]} */ ([
      point.x,
      point.y,
      0.05,
      0.05,
    ]);

    const annotation = new Annotation(viewer, { id, location })
      .render("added")
      .activate()
      .select(true);

    instances.add(annotation);
  };

/**
 * @param {import("openseadragon").Viewer} viewer
 * @param {Set<Annotation>} instances
 */
const handleViewerCanvasKey =
  (viewer, instances) =>
  /** @param {import("openseadragon").CanvasKeyEvent} ev */
  (ev) => {
    viewer;

    // @ts-ignore: It surely exists!!!
    switch (ev.originalEvent.key) {
      case "Backspace":
      case "Delete": {
        for (const annotation of instances) {
          if (annotation.selected) {
            annotation.destroy();
            instances.delete(annotation);
          }
        }
      }
    }
  };

/**
 * @param {import("openseadragon").Viewer} viewer
 * @param {{
 *   annotations: AnnotationInit[];
 * }} options
 */
export const install = (viewer, { annotations }) => {
  /** @type {Set<Annotation>} */
  const instances = new Set();

  // Disable it for click-to-add-overlay
  for (const type of ["mouse", "touch", "pen", "unknown"]) {
    viewer.gestureSettingsByDeviceType(type).clickToZoom = false;
  }

  // Click to add overlay
  const onViewerCanvasClick = handleViewerCanvasClick(viewer, instances);
  viewer.addHandler("canvas-click", onViewerCanvasClick);

  // Keyboard shortcut
  const onViewerCanvasKey = handleViewerCanvasKey(viewer, instances);
  viewer.addHandler("canvas-key", onViewerCanvasKey);
  // Event is only fired when focused
  viewer.canvas.focus();

  // Restore
  for (const init of annotations) {
    if (!init) continue;

    const annotation = new Annotation(viewer, init)
      .render("restored")
      .activate();

    instances.add(annotation);
  }

  return () => {
    for (const annotation of instances) {
      annotation.destroy();
    }
    instances.clear();

    for (const type of ["mouse", "touch", "pen", "unknown"]) {
      viewer.gestureSettingsByDeviceType(type).clickToZoom = true;
    }
    viewer.removeHandler("canvas-click", onViewerCanvasClick);

    viewer.removeHandler("canvas-key", onViewerCanvasKey);
  };
};
