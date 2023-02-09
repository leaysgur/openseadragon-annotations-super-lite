<script>
  import { onMount } from "svelte";
  import Viewer from "./viewer/index.svelte";
  import * as pkg from "../../package.json";

  let json = "{}";

  const onClickCopy = () => navigator.clipboard.writeText(json);
  /** @param {{ detail: string }} ev */
  const onAnnotations = ({ detail }) => {
    json = detail;
    localStorage.setItem("ANNOTATIONS", json);
  };

  /** @type {Promise<{ source: string; annotations: Record<string, any> }>} */
  let data = new Promise(() => {});
  onMount(() => {
    // XXX: Maybe fetch()
    data = new Promise((resolve) => {
      setTimeout(() => resolve({
        /* source: "http://openseadragon.github.io/example-images/highsmith/highsmith.dzi", */
        /* source: "http://clst.multimodal.riken.jp/CLST_ViewerData/EMV_028_161217SEM_RatKidney/DZI_images/DZI_IMAGE.dzi", */
        source: "https://microdraw.pasteur.fr/bigbrain/bigbrain.dzi",
        annotations: JSON.parse(localStorage.getItem("ANNOTATIONS") ?? "{}"),
      }), 500);
    });
  });
</script>

<div>
  <header>
    <h1>OSD-ASL Demo v{pkg.version}</h1>
    <button on:click={onClickCopy}>Copy JSON to clipboard</button>
  </header>

  <main>
    {#await data}
      <p>Loading...</p>
    {:then { source, annotations }}
      <Viewer {source} {annotations} on:annotations={onAnnotations} />
    {:catch err}
      <p>{err.toString()}</p>
    {/await}
  </main>
</div>

<style>
  div {
    display: grid;
    grid-template-rows: 50px 1fr;
    height: 100%;
  }

  header {
    padding: 10px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background-color: #2C2C2C;
    color: #fff;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  }
  h1 {
    margin: 0;
    font-size: 0.8rem;
  }
  button {
    padding: 4px 10px;
    height: 30px;
    background-color: #0066FF;
    color: #FFF;
    font-size: 0.6rem;
    border: none;
    border-radius: 4px;
  }

  main {
    height: 100%;
  }

  p {
    text-align: center;
    font-size: 1.5rem;
    padding-top: 10vh;
  }
</style>
