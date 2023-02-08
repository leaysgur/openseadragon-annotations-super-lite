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

const viewer = new OpenSeadragon.Viewer({ /* ... */ });

// Install plugin
const myAnno = new AnnotationsSuperLite(viewer).activate();

// Communicate with plugin via BroadcastChannel API
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
```
