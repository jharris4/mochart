<script lang="ts">
  import { exportPNG, exportSVG } from 'mochart-export';

  import ButtonWithTooltip from './ButtonWithTooltip.svelte';
  import Icon from './Icon.svelte';

  // Download buttons for the chart found inside the container element
  // (mochart-export locates the chart svg itself).
  interface Props {
    idPrefix: string;
    getContainer: () => Element | null;
    disabled?: boolean;
  }

  let { idPrefix, getContainer, disabled = false }: Props = $props();

  function onExportPng() {
    const container = getContainer();
    if (container) {
      void exportPNG(container);
    }
  }

  function onExportSvg() {
    const container = getContainer();
    if (container) {
      exportSVG(container);
    }
  }
</script>

<div class="btn-group">
  <ButtonWithTooltip id={idPrefix + "-export-png"} {disabled} label="PNG"
                     tooltipText="Download the chart as a PNG image" tooltipPlacement="top-start"
                     onClick={onExportPng} aria-label="Export PNG">
    <Icon size="lg" fixedWidth={true} name="file-image" />
  </ButtonWithTooltip>
  <ButtonWithTooltip id={idPrefix + "-export-svg"} {disabled} label="SVG"
                     tooltipText="Download the chart as an SVG image" tooltipPlacement="top-start"
                     onClick={onExportSvg} aria-label="Export SVG">
    <Icon size="lg" fixedWidth={true} name="file-code" />
  </ButtonWithTooltip>
</div>
