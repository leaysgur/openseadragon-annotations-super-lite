<script>
  import { onMount } from "svelte";
  import Viewer from "./viewer/index.svelte";

  let data = new Promise(() => {});
  onMount(() => {
    data = new Promise((resolve) => {
      setTimeout(() => resolve({
        source: "http://openseadragon.github.io/example-images/highsmith/highsmith.dzi",
        annotations: [],
      }), 1000);
    });
  });
</script>

<div>
  <header>
    <h1>Demo</h1>
  </header>

  <main>
    {#await data}
        <p>Loading...</p>
      {:then { source }}
        <Viewer {source} />
      {:catch err}
        <p>{err.toString()}</p>
    {/await}
  </main>
</div>

<style>
  div {
    display: grid;
    grid-template-rows: 30px 1fr;
    height: 100%;
  }

  header {
    background-color: #111;
    color: #fff;
    padding: 8px 16px;
    display: flex;
    align-items: center;
  }
  h1 {
    margin: 0;
    font-size: 0.8rem;
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
