<script>
  let { value, onChange } = $props();
</script>

<div class="text-area-content">
  <textarea {value} oninput={(event) => onChange(event.target.value)}></textarea>
</div>

<style>
  /* The react demo measured the pane with react-sizer to set explicit pixel
     sizes on the textarea; plain css sizing does the same job here. */
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
