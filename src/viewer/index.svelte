<script>
  import OpenSeadragon from "openseadragon";
  import { onMount, createEventDispatcher } from "svelte";
  import { MyAnno } from "./my-anno/index";
  /** @typedef {import("./my-anno/index").AnnotationEvent} AnnotationEvent */

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

  const dispatch = createEventDispatcher();

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
    const json = JSON.stringify(annotations);
    localStorage.setItem("ANNOTATIONS", json);
    dispatch("annotations", json);
  }

  onMount(() => {
    const viewer = new OpenSeadragon.Viewer({
      id: "osd-viewer",

      showNavigationControl: false,
      animationTime: 0.1,

      showNavigator: true,
      navigatorId: "osd-navigator",
      navigatorDisplayRegionColor: "transparent",

      tileSources: source,
    });

    // @ts-ignore: To apply custom styles
    viewer.navigator.displayRegion.classList.add("my-navigator-display-region");

    const myAnno = new MyAnno(viewer);
    myAnno.restore(Object.values(annotations)).activate();
    console.warn(myAnno);
    const channel = new BroadcastChannel("my-anno");

    /** @param {MessageEvent<AnnotationEvent>} ev */
    channel.onmessage = ({ data: message }) => {
      // Do not destruct too early for type guards
      const { type, data } = message;
      switch (type) {
        case "annotation:added": {
          const item = {
            ...data,
            labels: [],
          };
          annotations[data.id] = item;
          selected = item;
          draftLabel = "";
          break;
        }
        case "annotation:updated": {
          const item = {
            ...annotations[data.id],
            ...data,
          }
          annotations[data.id] = item;
          if (selected?.id === data.id) selected = item;
          break;
        }
        case "annotation:removed": {
          // @ts-ignore
          annotations[data.id] = undefined;
          if (selected?.id === data.id) selected = null;
          draftLabel = "";
          break;
        }
        case "annotation:selected": {
          selected = annotations[data.id];
          draftLabel = selected.labels.join(", ");
          break;
        }
        case "annotation:deselected": {
          selected = null;
          draftLabel = "";
          break;
        }
      }
    };

    return () => {
      channel.onmessage = null;
      channel.close();
      myAnno.destroy();
      viewer.destroy();
    };
  });
</script>

<div class="main">
  <div class="my-viewer" id="osd-viewer"></div>
  <div class="my-navigator" id="osd-navigator" style="height: 100%; width: 100%;"></div>
  <div class="my-editor">
    <p>Annotation</p>
    <hr>
    {#if selected === null}
      <div>Not selected</div>
    {:else}
      <div>
        <label for="labels">Labels</label>
        <input type="text" id="labels" placeholder="foo, bar" bind:value={draftLabel}>
      </div>
    {/if}
    <hr>
    <pre>{JSON.stringify(selected, null, 2)}</pre>
  </div>
</div>

<style>
  .main {
    display: grid;
    grid-template:
      "viewer navigator" 250px
      "viewer editor"    1fr
    /  1fr    250px;
    height: 100%;
    background-color: #2C2C2C;
  }

  .my-viewer {
    grid-area: viewer;
  }
  .my-navigator {
    grid-area: navigator;
    border-left: 1px solid rgba(255, 255, 255, 0.2);
    box-sizing: border-box;
  }
  .my-editor {
    grid-area: editor;
    color: #FFF;
    padding: 16px;
    border-top: 1px solid rgba(255, 255, 255, 0.2);
    border-left: 1px solid rgba(255, 255, 255, 0.2);
    box-sizing: border-box;
    font-size: 0.7rem;
  }

  .my-editor hr {
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-top: none;
    margin: 16px -16px;
  }
  .my-editor label {
    display: block;
    margin-bottom: 8px;
  }
  .my-editor input {
    width: 100%;
    box-sizing: border-box;
  }
  .my-editor pre {
    font-size: .7rem;
  }

  :global(.my-navigator-display-region) {
    box-shadow: rgba(0, 0, 0, 0.7) 0 0 0 1000px;
  }

  :global(.anno-overlay) {
    box-sizing: border-box;
    border: 2px solid #001AFF;
    outline: 1px solid rgba(255, 255, 255, 0.8);
    cursor: move;
    will-change: width, height, top, left;
  }
  :global(.anno-overlay:hover) {
    background-color: rgba(0, 26, 255, 0.2);
  }
  :global(.anno-overlay.-grabbing) {
    background-color: transparent;
    cursor: grabbing;
  }
  :global(.anno-overlay-resize-handle) {
    display: none;
    background-color: #FFF;
    border: 1px solid #001AFF;
    box-sizing: border-box;
    width: 12px; /* Never scales */
    height: 12px;
    position: absolute;
  }
  :global(.anno-overlay-resize-handle-top-left) {
    cursor: nwse-resize;
    top: -6px;
    left: -6px;
  }
  :global(.anno-overlay-resize-handle-top-right) {
    cursor: nesw-resize;
    top: -6px;
    right: -6px;
  }
  :global(.anno-overlay-resize-handle-bottom-right) {
    cursor: nwse-resize;
    bottom: -6px;
    right: -6px;
  }
  :global(.anno-overlay-resize-handle-bottom-left) {
    cursor: nesw-resize;
    bottom: -6px;
    left: -6px;
  }
  :global(.anno-overlay-remove-handle) {
    display: none;
    cursor: pointer;
    width: 16px; /* Never scales */
    height: 16px;
    background: #2C2C2C;
    border-radius: 2px;
    position: absolute;
    bottom: -24px;
    left: 0;
    right: 0;
    margin: auto;
  }
  :global(.anno-overlay-remove-handle::after) {
    content: "x";
    font-size: .5rem;
    color: #FFF;
  }
  :global(.anno-overlay.-selected:not(.-grabbing) .anno-overlay-resize-handle),
  :global(.anno-overlay.-selected:not(.-grabbing) .anno-overlay-remove-handle) {
    display: flex;
    justify-content: center;
    align-items: center;
  }
</style>
