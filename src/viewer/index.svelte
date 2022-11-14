<script>
  import OpenSeadragon from "openseadragon";
  import { onMount } from "svelte";
  import { install } from "./my-anno/index";
  /** @typedef {import("./my-anno/annotation").AnnotationMessage} AnnotationMessage */

  /**
   * @typedef {{
   *   id: string;
   *   location: [number, number, number, number];
   *   labels: string[];
   * }} AnnotationItem
   */

  /** @type {string} */
  export let source;
  /** @type {Record<string, AnnotationItem>} */
  export let annotations;

  /** @type {AnnotationItem | null} */
  let selected = null;
  /** @type {string} */
  let draftLabel = "";

  $: {
    if (selected !== null) {
      const labels = draftLabel.split(",").map((l) => l.trim()).filter(Boolean);
      annotations[selected.id].labels = labels;
      selected.labels = labels;
    }
  }

  $: {
    console.warn("UPDATE", annotations);
    localStorage.setItem("ANNOTATIONS", JSON.stringify(annotations));
  }

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

    const channel = new BroadcastChannel("my-anno");
    const destory = install(viewer, {
      annotations: Object.values(annotations),
    });

    /**
     * @param {MessageEvent<AnnotationMessage>} ev
     */
    channel.onmessage = ({ data: { type, data } }) => {
      switch (type) {
        case "added": {
          const annotation = {
            ...data,
            labels: [],
          };
          annotations[data.id] = annotation;
          selected = annotation;
          draftLabel = "";
          break;
        }
        case "moved":
        case "resized": {
          const annotation = {
            ...annotations[data.id],
            ...data,
          }
          annotations[data.id] = annotation;
          if (selected?.id === data.id) selected = annotation;
          break;
        }
        case "removed": {
          // @ts-ignore
          annotations[data.id] = undefined;
          if (selected?.id === data.id) selected = null;
          break;
        }
        case "selected": {
          selected = annotations[data.id];
          draftLabel = selected.labels.join(", ");
          break;
        }
      }

      console.warn(type, annotations);
    };

    return () => {
      channel.close();
      destory();
      viewer.destroy();
    };
  });
</script>

<div class="main">
  <div class="my-viewer" id="osd-viewer"></div>
  <div class="my-navigator" id="osd-navigator"></div>
  <div class="my-editor">
    <pre style="color: beige; font-size: 0.8rem;">{JSON.stringify(selected, null, 2)}</pre>
    <hr>
    {#if selected === null}
      <div>Not selected</div>
    {:else}
      <div>
        <label>
          <span style="color: beige;">Label:</span>
          <input type="text" placeholder="foo, bar" bind:value={draftLabel}>
        </label>
      </div>
    {/if}
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
    padding: 8px;
  }

  :global(.my-navigator-display-region) {
    box-shadow: rgba(0, 0, 0, 0.7) 0 0 0 1000px;
  }

  :global(.anno-overlay) {
    box-sizing: border-box;
    border: 2px solid gold;
    background-color: rgba(255, 255, 255, 0.3);
    cursor: move;
    will-change: width, height, top, left;
  }
  :global(.anno-overlay.-grabbing) {
    border-style: dashed;
    cursor: grabbing;
  }
  :global(.anno-overlay.-selected) {
    border-color: blue;
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
