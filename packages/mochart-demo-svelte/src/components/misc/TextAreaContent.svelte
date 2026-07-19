<script lang="ts">
  interface Props {
    value: string;
    onChange: (value: string) => void;
  }

  let { value, onChange }: Props = $props();
</script>

<div class="text-area-content">
  <textarea {value} oninput={(event) => onChange(event.currentTarget.value)}></textarea>
</div>

<style>
  /* No JS measurement needed for the pane; plain css sizing sets the
     textarea dimensions here. */
  .text-area-content {
    display: flex;
    flex: 1 1 auto;
    width: 100%;
    min-width: 0;
    min-height: 0;
  }
  textarea {
    width: 100%;
    height: 100%;
    resize: none;
  }
</style>
