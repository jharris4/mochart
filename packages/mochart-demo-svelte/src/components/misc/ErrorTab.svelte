<script lang="ts">
  import type { Snippet } from 'svelte';

  import { demoText } from '@mochart/demo-common';

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
      <div class="demo-alert demo-alert-error demo-text-center mochart-demo-error-message" role="alert">
        {demoText.errors.errorOccurred}
      </div>
    </div>
  {/snippet}
</svelte:boundary>
