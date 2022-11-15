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

  // Restore
  for (const { id, location } of annotations) {
    const annotation = new Annotation(viewer, { id, location })
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
  };
};
