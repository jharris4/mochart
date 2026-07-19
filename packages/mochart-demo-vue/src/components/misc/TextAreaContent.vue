<script setup lang="ts">
interface Props {
  value: string;
  onChange: (value: string) => void;
}

const props = defineProps<Props>();

function onInput(event: Event) {
  props.onChange((event.currentTarget as HTMLTextAreaElement).value);
}
</script>

<template>
  <div class="text-area-content">
    <textarea :value="props.value" @input="onInput"></textarea>
  </div>
</template>

<style scoped>
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
