import { mochartCssClasses } from '@mochart/core';

const SVG_NS = 'http://www.w3.org/2000/svg';

// Single-class selectors derived from the shared mochart class map (some map
// entries hold "base per-item" class pairs, so always take the first token).
const chartClass = mochartCssClasses['chart'].split(' ')[0];
const crosshairClass = mochartCssClasses['crosshair'].split(' ')[0];
const titleTextRawClass = mochartCssClasses['titleTextRaw'].split(' ')[0];

const SVG_CONTAINER_TAGS = ['svg', 'g'];

const SVG_STYLE_ATTRIBUTES = [
  'fill', 'fill-opacity',
  'stroke', 'stroke-opacity', 'stroke-width', 'stroke-dasharray'
];

const SVG_TEXT_TAGS = ['text', 'tspan'];

const SVG_TEXT_STYLE_ATTRIBUTES = SVG_STYLE_ATTRIBUTES.concat([
  'font-family', 'font-size', 'font-weight', 'font-style'
]);

const SVG_CONTAINER_TAG_SET = new Set(SVG_CONTAINER_TAGS);
const SVG_STYLE_ATTRIBUTE_SET = new Set(SVG_STYLE_ATTRIBUTES);
const SVG_TEXT_TAG_SET = new Set(SVG_TEXT_TAGS);
const SVG_TEXT_STYLE_ATTRIBUTE_SET = new Set(SVG_TEXT_STYLE_ATTRIBUTES);

export interface ExportSvgOptions {
  /** Exact filename to use (without extension); overrides the chart-title-derived name. */
  filename?: string;
  /** Prefix prepended to the chart-title-derived filename. */
  filenamePrefix?: string;
  /** Keep the background transparent instead of painting it with backgroundColor. */
  transparent?: boolean;
  /** Background color painted behind the chart when not transparent. */
  backgroundColor?: string;
}

export interface ExportPngOptions extends ExportSvgOptions {
  /** Rasterization scale relative to the chart's on-screen pixel size. */
  scale?: number;
}

/**
 * Find the chart svg for an element that is the chart root
 * (div.mochart-chart), any ancestor of it, or the svg itself.
 */
export function findChartSvg(element: Element): SVGSVGElement | null {
  if (element instanceof SVGSVGElement) {
    return element;
  }
  if (element.classList.contains(chartClass)) {
    return element.querySelector<SVGSVGElement>(':scope > svg');
  }
  return element.querySelector<SVGSVGElement>('.' + chartClass + ' > svg');
}

/**
 * Copy the computed svg presentation styles (fill, stroke, fonts on text)
 * onto the cloned nodes as inline styles, so the serialized svg renders the
 * same outside the page's stylesheets.
 */
function inlineComputedStyles(targetNode: Element, sourceNode: Element): void {
  const targetChildren = targetNode.children;
  const sourceChildren = sourceNode.children;
  for (let i = 0; i < targetChildren.length; i++) {
    const targetChild = targetChildren[i];
    const sourceChild = sourceChildren[i];
    if (!sourceChild) {
      continue;
    }
    const tagName = targetChild.tagName.toLowerCase();
    if (!SVG_CONTAINER_TAG_SET.has(tagName)) {
      const style = window.getComputedStyle(sourceChild);
      const styleAttributeSet = SVG_TEXT_TAG_SET.has(tagName) ? SVG_TEXT_STYLE_ATTRIBUTE_SET : SVG_STYLE_ATTRIBUTE_SET;
      for (let st = 0; st < style.length; st++) {
        const styleProperty = style[st];
        if (styleAttributeSet.has(styleProperty)) {
          (targetChild as SVGElement | HTMLElement).style.setProperty(styleProperty, style.getPropertyValue(styleProperty));
        }
      }
    }
    inlineComputedStyles(targetChild, sourceChild);
  }
}

function replaceWhitespace(text: string): string {
  return text.replace(/\s+/g, '_');
}

function getFilename(svgElement: SVGSVGElement, options: ExportSvgOptions): string {
  if (options.filename) {
    return options.filename;
  }
  const titleElement = svgElement.querySelector('.' + titleTextRawClass);
  const title = titleElement && titleElement.textContent ? titleElement.textContent.trim() : '';
  const baseName = title ? replaceWhitespace(title) : 'export';
  return options.filenamePrefix ? options.filenamePrefix + baseName : baseName;
}

function getSvgSize(svgElement: SVGSVGElement): { width: number; height: number } {
  const widthAttribute = parseFloat(svgElement.getAttribute('width') || '');
  const heightAttribute = parseFloat(svgElement.getAttribute('height') || '');
  if (widthAttribute > 0 && heightAttribute > 0) {
    return { width: widthAttribute, height: heightAttribute };
  }
  const rect = svgElement.getBoundingClientRect();
  return { width: rect.width, height: rect.height };
}

/**
 * Serialize the chart svg to standalone markup: computed styles inlined, the
 * crosshair stripped, and (unless transparent) a solid background rect
 * inserted beneath the chart.
 */
export function getChartSvgText(element: Element, options: ExportSvgOptions = {}): string | null {
  const svgElement = findChartSvg(element);
  return svgElement ? getSvgText(svgElement, options) : null;
}

function getSvgText(svgElement: SVGSVGElement, options: ExportSvgOptions): string {
  const { transparent = false, backgroundColor = '#ffffff' } = options;
  const svgCloneElement = svgElement.cloneNode(true) as SVGSVGElement;
  inlineComputedStyles(svgCloneElement, svgElement);

  if (!transparent) {
    const { width, height } = getSvgSize(svgElement);
    const backgroundRect = document.createElementNS(SVG_NS, 'rect');
    backgroundRect.setAttribute('width', String(width));
    backgroundRect.setAttribute('height', String(height));
    backgroundRect.style.setProperty('fill', backgroundColor);
    backgroundRect.style.setProperty('fill-opacity', '1');
    svgCloneElement.insertBefore(backgroundRect, svgCloneElement.firstChild);
  }

  // remove the crosshair from the svg if it is present
  for (const crosshairElement of svgCloneElement.querySelectorAll('.' + crosshairClass)) {
    crosshairElement.parentNode?.removeChild(crosshairElement);
  }

  return new XMLSerializer().serializeToString(svgCloneElement);
}

function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Download the chart found in (or at) `element` as an svg file.
 * Returns true when a chart svg was found and the download was started.
 */
export function exportSVG(element: Element, options: ExportSvgOptions = {}): boolean {
  const svgElement = findChartSvg(element);
  if (!svgElement) {
    return false;
  }
  const filename = getFilename(svgElement, options);
  const svgText = getSvgText(svgElement, options);
  const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
  saveBlob(blob, filename + '.svg');
  return true;
}

/**
 * Download the chart found in (or at) `element` as a png file, rasterized
 * through an offscreen canvas. Resolves to true when a chart svg was found
 * and the download was started.
 */
export function exportPNG(element: Element, options: ExportPngOptions = {}): Promise<boolean> {
  const svgElement = findChartSvg(element);
  if (!svgElement) {
    return Promise.resolve(false);
  }
  const { scale = 2 } = options;
  const filename = getFilename(svgElement, options);
  const svgText = getSvgText(svgElement, options);
  const { width, height } = getSvgSize(svgElement);

  return new Promise<boolean>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('mochart-export: could not create a 2d canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('mochart-export: could not encode the chart canvas as png'));
          return;
        }
        saveBlob(blob, filename + '.png');
        resolve(true);
      });
    };
    img.onerror = () => {
      reject(new Error('mochart-export: failed to rasterize the chart svg'));
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText);
  });
}
