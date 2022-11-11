<script>
  import OpenSeadragon from "openseadragon";
  import { onMount } from "svelte";
  import { install } from "./my-anno/index";
  /** @typedef {import("./my-anno/annotation").AnnotationInit} AnnotationInit */

  /** @type {string} */
  export let source;
  /** @type {Record<string, AnnotationInit>} */
  export let annotations;

  /** @type {AnnotationInit | null} */
  let selected = null;

  onMount(() => {
    const viewer = new OpenSeadragon.Viewer({
      id: "osd-viewer",

      showNavigationControl: false,

      showNavigator: true,
      navigatorId: "osd-navigator",
      navigatorDisplayRegionColor: "transparent",

      tileSources: source,
    });

    // @ts-ignore: To apply custom styles
    viewer.navigator.displayRegion.className = "my-navigator-display-region";

    const { port, destory } = install(viewer, { annotations });

    port.onmessage = ({ data: { type, data } }) => {
      switch (type) {
        case "added": {
          annotations[data.annotation.id] = data.annotation;
          localStorage.setItem("ANNOTATIONS", JSON.stringify(annotations));
          selected = data.annotation;
          break;
        }
        case "moved": {
          annotations[data.annotation.id] = data.annotation;
          localStorage.setItem("ANNOTATIONS", JSON.stringify(annotations));
          if (selected?.id === data.annotation.id)
            selected = data.annotation;
          break;
        }
        case "resized": {
          annotations[data.annotation.id] = data.annotation;
          localStorage.setItem("ANNOTATIONS", JSON.stringify(annotations));
          if (selected?.id === data.annotation.id)
            selected = data.annotation;
          break;
        }
        case "removed": {
          delete annotations[data.annotation.id];
          localStorage.setItem("ANNOTATIONS", JSON.stringify(annotations));

          if (selected?.id === data.annotation.id)
            selected = null;
          break;
        }
        case "clicked": {
          selected = data.annotation;
          break;
        }
      }

      console.log(type, annotations);
    };

    return () => {
      destory();
      viewer.destroy();
    };
  });
</script>

<div class="main">
  <div class="my-viewer" id="osd-viewer"></div>
  <div class="my-navigator" id="osd-navigator"></div>
  <div class="my-editor">
    <pre style="color: beige; font-size: 0.8rem; padding: 8px;">{JSON.stringify(selected, null, 2)}</pre>
  </div>
</div>

<style>
  .main {
    display: grid;
    grid-template:
      "viewer navigator" 200px
      "viewer editor"    1fr
    /  1fr    240px;
    gap: 8px;
    height: 100%;
    background-color: #222;
  }

  .my-viewer {
    grid-area: viewer;
    background-color: #333;
  }
  .my-navigator {
    grid-area: navigator;
    background-color: #333;
  }
  /* This is required... */
  #osd-navigator {
    width: 100%;
    height: 100%;
  }
  .my-editor {
    grid-area: editor;
    background-color: #333;
  }

  :global(.my-navigator-display-region) {
    box-shadow: rgba(0, 0, 0, 0.7) 0 0 0 1000px;
  }

  :global(.anno-overlay) {
    box-sizing: border-box;
    border: 2px solid gold;
    background-color: rgba(255, 255, 255, 0.3);
    cursor: move;
  }
  :global(.anno-overlay.-grabbing) {
    border-style: dashed;
    cursor: grabbing;
  }
  :global(.anno-overlay-resize-handle) {
    cursor: nwse-resize;
    background-color: gold;
    width: 8px; /* Never scales */
    height: 8px;
    position: absolute;
    bottom: -2px;
    right: -2px;
  }
  :global(.anno-overlay-remove-handle) {
    cursor: pointer;
    background-color: tomato;
    width: 8px; /* Never scales */
    height: 8px;
    position: absolute;
    top: -2px;
    left: -2px;
  }
</style>
