<script>
  import OpenSeadragon from "openseadragon";
  import { onMount } from "svelte";
  import { install } from "./my-anno";

  export let source;

  onMount(() => {
    const viewer = new OpenSeadragon.Viewer({
      id: "osd-viewer",

      showNavigationControl: false,

      showNavigator: true,
      navigatorId: "osd-navigator",

      tileSources: source,
    });

    const dispose = install(viewer);

    return () => {
      dispose();
      viewer.destroy();
    };
  });
</script>

<div class="main">
  <div class="my-viewer" id="osd-viewer"></div>
  <div class="my-navigator" id="osd-navigator">
  </div>
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
    width: 100%;
    height: 100%;
    background-color: #333;
  }
  .my-editor {
    grid-area: editor;
    background-color: #333;
  }
</style>
