// @ts-check
import OpenSeadragon from "openseadragon";

// TODO: disposer
// TODO: styling by class or data-attr

/** @param {import("openseadragon").Viewer} viewer */
export const install = (viewer) => {
  //
  // ADD, DELETE
  //
  for (const type of ["mouse", "touch", "pen", "unknown"])
    viewer.gestureSettingsByDeviceType(type).clickToZoom = false;

  viewer.addHandler("canvas-click", (ev) => {
    if (!ev.quick) return;

    const oId = "o:" + Date.now();
    const $overlay = document.createElement("div");
    $overlay.id = oId;
    Object.assign($overlay.style, {
      outline: "2px solid tomato",
      backgroundColor: "rgba(255, 255, 255, 0.3)",
      cursor: "move",
      position: "relative",
    });

    const point = viewer.viewport.pointFromPixel(ev.position);
    viewer.addOverlay($overlay, new OpenSeadragon.Rect(point.x, point.y, 0.1, 0.1));

    new OpenSeadragon.MouseTracker({
      element: $overlay,
      clickHandler(ev) {
        // @ts-ignore: It surely exists!!!
        if (!ev.quick) return;

        viewer.removeOverlay($overlay);
      },

      pressHandler() {
        $overlay.style.outlineStyle = "dashed";
      },
      releaseHandler() {
        $overlay.style.outlineStyle = "solid";
      },
      dragHandler(ev) {
        // @ts-ignore: It surely exists!!!
        const delta = viewer.viewport.deltaPointsFromPixels(ev.delta);
        const overlay = viewer.getOverlayById(oId);

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
    Object.assign($resizer.style, {
      cursor: "nwse-resize",
      backgroundColor: "white",
      width: "10px", // Never scales
      height: "10px",
      position: "absolute",
      bottom: "0",
      right: "0",
    });
    $overlay.append($resizer);

    new OpenSeadragon.MouseTracker({
      element: $resizer,
      dragHandler(ev) {
        // @ts-ignore: It surely exists!!!
        const delta = viewer.viewport.deltaPointsFromPixels(ev.delta);
        const overlay = viewer.getOverlayById(oId);

        const loc = overlay.getBounds(viewer.viewport);
        loc.width = loc.width + delta.x;
        loc.height = loc.height + delta.y;

        // @ts-ignore: It surely exists!!!
        overlay.update({ location: loc });
        // @ts-ignore: It surely exists!!!
        overlay.drawHTML(viewer.overlaysContainer, viewer.viewport);
      },
    });
  });

  return () => {
    // dispose
  };
};
