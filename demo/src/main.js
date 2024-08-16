import App from "./app.svelte";
import "./main.css";

if (!window.requestIdleCallback) {
  // @ts-ignore: Polyfill for Safari
  window.requestIdleCallback = (cb) => {
    const start = Date.now();
    return setTimeout(() => {
      cb({
        didTimeout: false,
        timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
      });
    }, 1);
  };

  window.cancelIdleCallback = (id) => clearTimeout(id);
}

const app = new App({ target: document.body });

export default app;
