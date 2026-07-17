<script lang="ts">
  import type { Snippet } from 'svelte';

  // Error-boundary equivalent of the react ErrorTab. Unlike the react
  // version (which cloned its child to inject `active`), children here
  // receive their `active` prop directly at the call site.
  interface Props {
    active: boolean;
    children: Snippet;
  }

  let { active, children }: Props = $props();
</script>

<svelte:boundary onerror={(error) => console.error(error)}>
  {@render children()}

  {#snippet failed()}
    <div class={"mochart-demo-tab-container error" + (active ? " active" : "")}>
      <div class="alert alert-danger text-center mochart-demo-error-message" role="alert">
        An Error Occurred
      </div>
    </div>
  {/snippet}
</svelte:boundary>
