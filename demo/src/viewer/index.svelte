<script>
  import OpenSeadragon from "openseadragon";
  import { onMount, createEventDispatcher } from "svelte";
  import Portal from "svelte-portal";
  import { AnnotationsSuperLite } from "../../../src";
  /** @typedef {import("../../../src").AnnotationEvent} AnnotationEvent */

  /**
   * @typedef {{
   *   id: string;
   *   location: [number, number, number, number];
   *   labels: string[];
   *   color: string;
   * }} AnnotationItem
   */

  /** @type {string} */
  export let source;
  /** @type {Record<string, AnnotationItem>} */
  export let annotations;

  /** @type {AnnotationItem | null} */
  let selected = null;
  /** @type {{ label: string; color: string }} */
  let draft = {
    label: "",
    color: "",
  };

  $: {
    if (selected !== null) {
      const labels = draft.label
        .split(",")
        .map((l) => l.trim())
        .filter(Boolean);
      annotations[selected.id].labels = labels;
      selected.labels = labels;
    }
  }
  $: {
    if (selected !== null) {
      annotations[selected.id].color = draft.color;
      selected.color = draft.color;

      // Or use Portal if possible
      const $host = document.getElementById(selected.id);
      $host?.style.setProperty("--COLOR", draft.color);
    }
  }

  const dispatch = createEventDispatcher();
  $: {
    console.warn("UPDATE", annotations);
    dispatch("annotations", JSON.stringify(annotations));
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

    const myAnno = new AnnotationsSuperLite(viewer, { channelName: "my-anno" })
      .restore(Object.values(annotations))
      .activate();
    console.warn(myAnno);

    // Use Protal if possible
    for (const { id, color } of Object.values(annotations)) {
      const $host = document.getElementById(id);
      $host?.style.setProperty("--COLOR", color);
    }

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
          draft = { label: "", color: "" };
          break;
        }
        case "annotation:updated": {
          const item = {
            ...annotations[data.id],
            ...data,
          };
          annotations[data.id] = item;
          if (selected?.id === data.id) selected = item;
          break;
        }
        case "annotation:removed": {
          delete annotations[data.id];
          if (selected?.id === data.id) selected = null;
          draft = { label: "", color: "" };
          break;
        }
        case "annotation:selected": {
          selected = annotations[data.id];
          draft = { label: selected.labels.join(", "), color: selected.color };
          break;
        }
        case "annotation:deselected": {
          selected = null;
          draft = { label: "", color: "" };
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
  <div class="my-viewer" id="osd-viewer" />
  <div
    class="my-navigator"
    id="osd-navigator"
    style="height: 100%; width: 100%;"
  />
  <div class="my-editor">
    {#if selected === null}
      <div>Not selected</div>
    {:else}
      <div>
        <label for="labels">Labels</label>
        <input
          type="text"
          id="labels"
          placeholder="foo, bar"
          bind:value={draft.label}
        />
        <hr />
        <div>Color</div>
        <select bind:value={draft.color}>
          <option value="" disabled>Not selected</option>
          <option value="tomato">tomato</option>
          <option value="lime">lime</option>
          <option value="aqua">aqua</option>
        </select>
      </div>
    {/if}
    <pre>{JSON.stringify(selected, null, 2)}</pre>
  </div>
</div>

{#each Object.values(annotations) as annotation}
  <Portal target="#{annotation.id}" hidden>
    <div class="my-labels">
      {#each annotation.labels as label}
        <span>{label}</span>
      {/each}
    </div>
  </Portal>
{/each}

<style>
  .main {
    display: grid;
    grid-template:
      "viewer navigator" 250px
      "viewer editor" 1fr
      / 1fr 250px;
    height: 100%;
    background-color: #2c2c2c;
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
    color: #fff;
    padding: 16px;
    border-top: 1px solid rgba(255, 255, 255, 0.2);
    border-left: 1px solid rgba(255, 255, 255, 0.2);
    box-sizing: border-box;
    font-size: 0.7rem;
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
    font-size: 0.7rem;
  }

  :global(.my-navigator-display-region) {
    box-shadow: rgba(0, 0, 0, 0.7) 0 0 0 1000px;
  }

  :global(.osdasl-host) {
    --COLOR: #001aff;
    box-sizing: border-box;
    border: 2px solid var(--COLOR);
    outline: 1px solid rgba(255, 255, 255, 0.8);
    cursor: move;
    will-change: width, height, top, left;
  }
  :global(.osdasl-host:hover) {
    border-style: dashed;
    outline-style: dashed;
  }
  :global(.osd-als-host.-grabbing) {
    cursor: grabbing;
  }
  :global(.osdasl-resize-handle) {
    display: none;
    background-color: #fff;
    border: 1px solid var(--COLOR);
    box-sizing: border-box;
    width: 12px; /* Never scales */
    height: 12px;
    position: absolute;
  }
  :global(.osdasl-resize-handle-top-left) {
    cursor: nwse-resize;
    top: -6px;
    left: -6px;
  }
  :global(.osdasl-resize-handle-top-right) {
    cursor: nesw-resize;
    top: -6px;
    right: -6px;
  }
  :global(.osdasl-resize-handle-bottom-right) {
    cursor: nwse-resize;
    bottom: -6px;
    right: -6px;
  }
  :global(.osdasl-resize-handle-bottom-left) {
    cursor: nesw-resize;
    bottom: -6px;
    left: -6px;
  }
  :global(.osdasl-remove-handle) {
    display: none;
    cursor: pointer;
    width: 16px; /* Never scales */
    height: 16px;
    background: #2c2c2c;
    border-radius: 2px;
    position: absolute;
    bottom: -24px;
    left: 0;
    right: 0;
    margin: auto;
  }
  :global(.osdasl-remove-handle:hover) {
    background: #5c5c5c;
  }
  :global(.osdasl-remove-handle::after) {
    content: "x";
    font-size: 0.5rem;
    color: #fff;
  }
  :global(.osdasl-host.-selected:not(.-grabbing) .osdasl-resize-handle),
  :global(.osdasl-host.-selected:not(.-grabbing) .osdasl-remove-handle) {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  :global(.osdasl-host .my-labels) {
    position: absolute;
    top: -35px;
    left: -5px;
    display: flex;
    gap: 4px;
  }
  :global(.osdasl-host .my-labels span) {
    padding: 2px 4px;
    background-color: #fff;
    white-space: nowrap;
    font-size: 14px;
  }
</style>
