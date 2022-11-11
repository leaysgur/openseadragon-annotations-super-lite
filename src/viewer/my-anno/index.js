import { Annotation } from "./annotation";
/** @typedef {import("./annotation").AnnotationInit} AnnotationInit */

/**
 * @param {import("openseadragon").Viewer} viewer
 * @param {MessagePort} port
 */
const handleViewerCanvasClick =
  (viewer, port) =>
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

    const annotation = new Annotation(viewer, { id, location }, port);
    annotation.render("added");
    annotation.activate();
  };

/**
 * @param {import("openseadragon").Viewer} viewer
 * @param {{
 *   annotations: Record<string, AnnotationInit>;
 * }} options
 */
export const install = (viewer, { annotations }) => {
  const { port1, port2 } = new MessageChannel();

  // Disable it for click-to-add-overlay
  for (const type of ["mouse", "touch", "pen", "unknown"]) {
    viewer.gestureSettingsByDeviceType(type).clickToZoom = false;
  }

  const onViewerCanvasClick = handleViewerCanvasClick(viewer, port1);

  // Click to add overlay
  viewer.addHandler("canvas-click", onViewerCanvasClick);

  // Restore
  for (const { id, location } of Object.values(annotations)) {
    const annotation = new Annotation(viewer, { id, location }, port1);
    annotation.render("restored");
    annotation.activate();
  }

  return {
    port: port2,
    destory: () => {
      port1.close();
      port2.close();

      viewer.removeHandler("canvas-click", onViewerCanvasClick);
    },
  };
};
