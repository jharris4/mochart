<script lang="ts">
  // Placeholder test component: renders the chart context it receives as props.
  let { width = 0, height = 0 }: { width?: number; height?: number } = $props();
</script>

<div>Bad config {width}x{height}</div>
