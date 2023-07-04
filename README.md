# openseadragon-annotations-super-lite

Super-lite-annotations plugin for openseadragon.

This plugin provides a thin layer to manage openseadragon [Overlays](https://openseadragon.github.io/examples/ui-overlays/) for image annotation usage.

## Features

- 0 deps, under 500 lines of code
- Basic features
  - Click viewer to render openseadragon Overlays as annotation
  - Move by drag
  - Resizing
  - Delete button
- Export and restore annotations through JSON

⚠️ This plugin does not offer default styles for created annotation overlays.

You need to apply your CSS for related classes.

```css
.osdasl-host {
  box-sizing: border-box;
  outline: 1px solid rgba(255, 255, 255, 0.8);
  cursor: move;
  will-change: width, height, top, left;
}
.osdasl-host:hover {
  background-color: rgba(0, 255, 26, 0.2);
}
.osdals-host.-dragging {
  background-color: transparent;
  cursor: grabbing;
}

/* and so on... */
```

## Install

```
npm i openseadragon
npm i openseadragon-annotations-super-lite
```

TypeScript definitions are included. ✌️

## Usage

```ts
import OpenSeadragon from "openseadragon";
import { AnnotationsSuperLite, type AnnotationEvent } from "openseadragon-annotations-super-lite";

// Install plugin along with OSD core
const viewer = new OpenSeadragon.Viewer({ /* ... */ });
const myAnno = new AnnotationsSuperLite(viewer, { channelName: "osdasl" });

// [Optional] Set annotation behavior
myAnno.setAnnotationOptions({
  activate: { selectable: true, removable: true, resizable: false, draggable: false },
});

// [Optional] Restore previous annotations
const annotations = [{
  id: "osdasl_1675845237828",
  location: [0, 0, 0.04, 0.04],
}]
myAnno.restore(annotations);

// [Optional] Register event handlers
myAnno.activate({ clickToAdd: true, keyboardShortcut: false });

// [Optional] Communicate with plugin via BroadcastChannel API
const channel = new BroadcastChannel("osdasl");
channel.onmessage = ({ data: message }: MessageEvent<AnnotationEvent>) => {
  switch (message.type) {
    case "annotation:added": {
      message.data.id;
      message.data.location;
      // Save it if needed and restore later
    }
    case "annotation:updated": { }
    case "annotation:removed": { }
    case "annotation:selected": { }
    case "annotation:deselected": { }
  }
};


// Destroy instance
channel.onmessage = null;
channel.close();
myAnno.destroy();
viewer.destroy();
```

See also [demo](https://leader22.github.io/openseadragon-annotations-super-lite/) and it's [code](https://github.com/leader22/openseadragon-annotations-super-lite/blob/main/demo/src/viewer/index.svelte).

This demo using Svelte for client UI, but plugin itself does not require any deps.

