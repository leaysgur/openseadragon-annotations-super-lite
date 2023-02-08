# openseadragon-annotations-super-lite

Super-lite-annotations implementation for openseadragon.

## Install

```
npm i openseadragon
npm i openseadragon-annotations-super-lite
```

TypeScript definitions are included.

## How to use

Check minimal [demo](https://leader22.github.io/openseadragon-annotations-super-lite/) and it's [code](https://github.com/leader22/openseadragon-annotations-super-lite/blob/main/demo/src/viewer/index.svelte).

This demo using Svelte for client UI, but plugin itself does not require any deps.

```ts
import OpenSeadragon from "openseadragon";
import { AnnotationsSuperLite } from "openseadragon-annotations-super-lite";
import type { AnnotationEvent } from "openseadragon-annotations-super-lite";

// Install plugin along with OSD core
const viewer = new OpenSeadragon.Viewer({ /* ... */ });
const myAnno = new AnnotationsSuperLite(viewer);

// [Optional] Register event handlers
myAnno.activate();

// [Optional] Communicate with plugin via BroadcastChannel API
const channel = new BroadcastChannel("my-anno");
channel.onmessage = ({ data: message }: MessageEvent<AnnotationEvent>) => {
  switch (message.type) {
    case "annotation:added": {
      message.data.id;
      message.data.location;
    }
    case "annotation:updated": { }
    case "annotation:removed": { }
    case "annotation:selected": { }
    case "annotation:deselected": { }
  }
};

// [Optional] Restore previous annotations
const annotations = [{
  id: "anno_1675845237828",
  location: [0, 0, 0.04, 0.04],
}]
myAnno.restore(annotations);

// Destroy instance
channel.onmessage = null;
channel.close();
myAnno.destroy();
viewer.destroy();
```

## Styling

This plugin does not offer default styles for created annotations.

You need to apply your CSS for related classes like `.anno-overlay`, `.anno-overlay-resize-handle` and so on.

See demo source code above for more details.
