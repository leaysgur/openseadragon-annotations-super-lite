import OpenSeadragon from "openseadragon";
import { renderAnnotation } from "./selector";

/**
 * @typedef {{
 *   id: string;
 *   location: {
 *     x: number;
 *     y: number;
 *     w: number;
 *     h: number;
 *   };
 * }} Annotation
 */

/** @param {import("openseadragon").AddOverlayEvent} ev */
const onViewerAddOverlay = (ev) => {
  const aId = ev.element.id;
  const aLocation = /** @type {import("openseadragon").Rect} */ (ev.location);

  /** @type {Annotation} */
  const annotation = {
    id: aId,
    location: {
      x: aLocation.x,
      y: aLocation.y,
      w: aLocation.width,
      h: aLocation.height,
    },
  };

  const annotations = JSON.parse(localStorage.getItem("ANNOTATIONS") ?? "{}");
  annotations[aId] = annotation;
  localStorage.setItem("ANNOTATIONS", JSON.stringify(annotations));
  console.log(annotations);
};

/** @param {import("openseadragon").AddOverlayEvent} ev */
const onViewerUpdateOverlay = (ev) => {
  // TODO: Need to debounce!!!
  const aId = ev.element.id;
  const aLocation = /** @type {import("openseadragon").Rect} */ (ev.location);

  /** @type {Annotation} */
  const annotation = {
    id: aId,
    location: {
      x: aLocation.x,
      y: aLocation.y,
      w: aLocation.width,
      h: aLocation.height,
    },
  };

  const annotations = JSON.parse(localStorage.getItem("ANNOTATIONS") ?? "{}");
  annotations[aId] = annotation;
  localStorage.setItem("ANNOTATIONS", JSON.stringify(annotations));
  console.log(annotations);
};

/** @param {import("openseadragon").RemoveOverlayEvent} ev */
const onViewerRemoveOverlay = (ev) => {
  const aId = ev.element.id;

  const annotations = JSON.parse(localStorage.getItem("ANNOTATIONS") ?? "{}");
  annotations[aId] = undefined;
  localStorage.setItem("ANNOTATIONS", JSON.stringify(annotations));
  console.log(annotations);
};

/**
 * @param {import("openseadragon").Viewer} viewer
 * @param {Record<string, Annotation>} annotations
 */
export const install = (viewer, annotations) => {
  for (const { id, location } of Object.values(annotations)) {
    renderAnnotation(
      id,
      new OpenSeadragon.Rect(location.x, location.y, location.w, location.h),
      viewer,
    );
  }

  viewer.addHandler("add-overlay", onViewerAddOverlay);
  viewer.addHandler("update-overlay", onViewerUpdateOverlay);
  viewer.addHandler("remove-overlay", onViewerRemoveOverlay);

  return () => {
    viewer.removeHandler("add-overlay", onViewerAddOverlay);
    viewer.removeHandler("remove-overlay", onViewerRemoveOverlay);
  };
};
