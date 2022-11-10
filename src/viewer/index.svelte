<script>
  import OpenSeadragon from "openseadragon";
  import { onMount } from "svelte";
  import { install as installSelector } from "./my-anno/selector";
  import { install as installAnnotator } from "./my-anno/annotator";

  /** @type {string} */
  export let source;
  /** @type {Record<string, import("./my-anno/annotator").Annotation>} */
  export let annotations;

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

    const destorySelector = installSelector(viewer);
    const destroyAnnotator = installAnnotator(viewer, annotations);

    return () => {
      destorySelector();
      destroyAnnotator();

      viewer.destroy();
    };
  });
</script>

<div class="main">
  <div class="my-viewer" id="osd-viewer"></div>
  <div class="my-navigator" id="osd-navigator"></div>
  <div class="my-editor">Editor</div>
</div>

<style>
  .main {
    display: grid;
    grid-template:
      "viewer navigator" 200px
      "viewer editor"    1fr
    /  1fr    300px;
    grid-template-columns: 1fr 240px;
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
    cursor: pointer;
  }
  :global(.anno-overlay.-grabbing) {
    border-style: dashed;
    cursor: grabbing;
  }
  :global(.anno-overlay-resizer) {
    cursor: nwse-resize;
    background-color: gold;
    width: 8px; /* Never scales */
    height: 8px;
    position: absolute;
    bottom: -2px;
    right: -2px;
  }
</style>
