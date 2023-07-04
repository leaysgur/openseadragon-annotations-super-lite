import { Annotation } from "./annotation";
import type { Viewer, CanvasClickEvent, CanvasKeyEvent } from "openseadragon";
import type {
  AnnotationInit,
  AnnotationActivateOptions,
  NotifyMessage,
} from "./annotation";

type AnnotationAddedEvent = {
  type: "annotation:added";
  data: AnnotationInit;
};
type AnnotationUpdatedEvent = {
  type: "annotation:updated";
  data: AnnotationInit;
};
type AnnotationRemovedEvent = {
  type: "annotation:removed";
  data: Pick<AnnotationInit, "id">;
};
type AnnotationSelectedEvent = {
  type: "annotation:selected";
  data: Pick<AnnotationInit, "id">;
};
type AnnotationDeselectedEvent = {
  type: "annotation:deselected";
  data: null;
};
export type AnnotationEvent =
  | AnnotationAddedEvent
  | AnnotationRemovedEvent
  | AnnotationUpdatedEvent
  | AnnotationSelectedEvent
  | AnnotationDeselectedEvent;

const defaultManagerOptions = {
  channelName: "osdasl",
};
const defaultAnnotationOptions = {
  activate: {
    selectable: true,
    removable: true,
    draggable: true,
    resizable: true,
  },
};

export class AnnotationManager {
  #viewer: Viewer;
  #options: typeof defaultManagerOptions;
  #annotationOptions: typeof defaultAnnotationOptions =
    defaultAnnotationOptions;
  #notify: (event: AnnotationEvent) => void;
  // ↑ UserApp <- AnnotationManager
  // ↓            AnnotationManager <- Annotations
  #channel = new MessageChannel();
  #annotations: Map<string, Annotation> = new Map();
  #disposers: (() => void)[] = [];

  constructor(viewer: Viewer, options?: { channelName?: string }) {
    this.#viewer = viewer;
    this.#options = {
      ...defaultManagerOptions,
      ...options,
    };

    const events = new BroadcastChannel(this.#options.channelName);
    this.#notify = (event) => events.postMessage(event);

    this.#channel.port1.onmessage = this.#onAnnotationNotifyMessage;
    this.#disposers.push(() => {
      this.#channel.port1.onmessage = null;
      this.#channel.port1.close();
      this.#channel.port2.onmessage = null;
      this.#channel.port2.close();
    });
  }

  // Does not affect already existing annotations
  setAnnotationOptions(options: {
    activate?: Partial<AnnotationActivateOptions>;
  }) {
    this.#annotationOptions = {
      // ...this.#annotationActivateOptions,
      // ...options,
      activate: {
        ...this.#annotationOptions.activate,
        ...options.activate,
      },
    };

    return this;
  }

  restore(inits: AnnotationInit[]) {
    for (const init of inits) {
      if (!init) {
        continue;
      }

      this.#addAnnotation(init);
    }

    return this;
  }

  activate(options?: {
    clickToAdd?: boolean;
    enableKeyboardShortcut?: boolean;
  }) {
    const activateOptions = {
      ...{ clickToAdd: true, enableKeyboardShortcut: true },
      ...options,
    };

    if (activateOptions.clickToAdd) {
      // Disable it for click-to-add-overlay
      for (const type of ["mouse", "touch", "pen", "unknown"]) {
        this.#viewer.gestureSettingsByDeviceType(type).clickToZoom = false;
      }
      // Click to add overlay
      this.#viewer.addHandler("canvas-click", this.#onViewerCanvasClick);

      this.#disposers.push(() => {
        for (const type of ["mouse", "touch", "pen", "unknown"]) {
          this.#viewer.gestureSettingsByDeviceType(type).clickToZoom = true;
        }
        this.#viewer.removeHandler("canvas-click", this.#onViewerCanvasClick);
      });
    }

    if (activateOptions.enableKeyboardShortcut) {
      // Keyboard shortcut
      this.#viewer.addHandler("canvas-key", this.#onViewerCanvasKey);
      // CanvasKeyEvent is only fired when focused
      this.#viewer.addHandler("canvas-enter", this.#onViewerCanvasEnter);
      this.#viewer.addHandler("canvas-exit", this.#onViewerCanvasExit);

      this.#disposers.push(() => {
        this.#viewer.removeHandler("canvas-key", this.#onViewerCanvasKey);
        this.#viewer.removeHandler("canvas-enter", this.#onViewerCanvasEnter);
        this.#viewer.removeHandler("canvas-exit", this.#onViewerCanvasExit);
      });
    }

    return this;
  }

  destroy() {
    for (const dispose of this.#disposers) {
      dispose();
    }

    for (const annotation of this.#annotations.values()) {
      annotation.destroy();
    }
    this.#annotations.clear();
  }

  #onAnnotationNotifyMessage = ({
    data: { type, id },
  }: {
    data: NotifyMessage;
  }) => {
    const annotation = this.#annotations.get(id);
    if (!annotation) {
      return;
    }

    switch (type) {
      case "removeHandle:click": {
        if (annotation.selected)
          this.#notify({
            type: "annotation:deselected",
            data: null,
          });

        this.#deleteAnnotation(id);
        this.#notify({
          type: "annotation:removed",
          data: annotation.toJSON(),
        });
        break;
      }
      case "host:click": {
        this.#selectAnnotation(id);
        this.#notify({
          type: "annotation:selected",
          data: { id },
        });
        break;
      }
      case "resizeHandle:dragEnd": {
        this.#notify({
          type: "annotation:updated",
          data: annotation.toJSON(),
        });
        break;
      }
      case "host:dragEnd": {
        this.#notify({
          type: "annotation:updated",
          data: annotation.toJSON(),
        });
        break;
      }
    }
  };

  #onViewerCanvasClick = (ev: CanvasClickEvent) => {
    if (!ev.quick) {
      return;
    }

    // Just deselect if any annotation is selected
    if ([...this.#annotations.values()].some((a) => a.selected)) {
      this.#selectAnnotation(null);
      this.#notify({
        type: "annotation:deselected",
        data: null,
      });
      return;
    }

    // Otherwise add new annotation and select it
    const id = `osdasl_${Date.now()}`;
    const point = this.#viewer.viewport.pointFromPixel(ev.position);
    const location: AnnotationInit["location"] = [
      point.x - 0.02, // centering
      point.y - 0.02, // centering
      0.04,
      0.04,
    ];

    const annotation = this.#addAnnotation({ id, location });
    this.#notify({
      type: "annotation:added",
      data: annotation.toJSON(),
    });

    this.#selectAnnotation(id);
    this.#notify({
      type: "annotation:selected",
      data: { id },
    });
  };

  #onViewerCanvasKey = (ev: CanvasKeyEvent) => {
    // @ts-ignore: It surely exists!!!
    switch (ev.originalEvent.key) {
      case "Backspace":
      case "Delete": {
        for (const [id, annotation] of this.#annotations) {
          if (annotation.selected) {
            this.#notify({
              type: "annotation:deselected",
              data: null,
            });

            this.#deleteAnnotation(id);
            this.#notify({
              type: "annotation:removed",
              data: { id },
            });
          }
        }
        ev.originalEvent.preventDefault();
        break;
      }
      case "Escape": {
        this.#selectAnnotation(null);
        this.#notify({
          type: "annotation:deselected",
          data: null,
        });
        break;
      }
    }
  };

  #onViewerCanvasEnter = () => this.#viewer.canvas.focus();
  #onViewerCanvasExit = () => this.#viewer.canvas.blur();

  #addAnnotation(init: AnnotationInit) {
    const annotation = new Annotation(
      {
        viewer: this.#viewer,
        port: this.#channel.port2,
      },
      init,
    )
      .render()
      .activate(this.#annotationOptions.activate);

    this.#annotations.set(init.id, annotation);

    return annotation;
  }

  #selectAnnotation(targetId: string | null) {
    for (const [id, annotation] of this.#annotations) {
      annotation.select(id === targetId);
    }
  }

  #deleteAnnotation(targetId: string) {
    const annotation = this.#annotations.get(targetId);
    if (!annotation) {
      return;
    }

    this.#annotations.delete(targetId);
    annotation.destroy();
  }
}
