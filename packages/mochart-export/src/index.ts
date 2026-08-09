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
  /** Background color painted behind the chart when not transparent. Defaults to the effective page background behind the chart (white when untraceable). */
  backgroundColor?: string;
}

export interface ExportPngOptions extends ExportSvgOptions {
  /** Rasterization scale relative to the chart's on-screen pixel size. */
  scale?: number;
}

export interface StitchOptions extends ExportSvgOptions {
  /** Number of columns in the tiled grid; rows are derived from the count. */
  cols: number;
  /** Gap in pixels between tiles (both axes). Defaults to 0. */
  gap?: number;
}

export interface StitchPngOptions extends StitchOptions {
  /** Rasterization scale relative to the tiled grid's pixel size. */
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

function isTransparentColor(color: string): boolean {
  if (!color || color === 'transparent') {
    return true;
  }
  const match = /^rgba\((?:[^,]+,){3}\s*([0-9.]+)\s*\)$/.exec(color);
  return match !== null && parseFloat(match[1]) === 0;
}

/**
 * The effective page background behind the chart: the nearest ancestor with a
 * non-transparent computed background. The export inlines the page's computed
 * (theme-resolved) chart colors, so this default keeps exports WYSIWYG — a
 * chart on a dark page exports onto its dark background, not onto white.
 */
function getEffectiveBackgroundColor(element: Element): string {
  let current: Element | null = element;
  while (current) {
    const color = getComputedStyle(current).backgroundColor;
    if (!isTransparentColor(color)) {
      return color;
    }
    current = current.parentElement;
  }
  return '#ffffff';
}

function makeBackgroundRect(width: number, height: number, backgroundColor: string): SVGRectElement {
  const backgroundRect = document.createElementNS(SVG_NS, 'rect') as SVGRectElement;
  backgroundRect.setAttribute('width', String(width));
  backgroundRect.setAttribute('height', String(height));
  backgroundRect.style.setProperty('fill', backgroundColor);
  backgroundRect.style.setProperty('fill-opacity', '1');
  return backgroundRect;
}

/**
 * Clone a live chart svg with its computed presentation styles inlined and the
 * crosshair removed, so it serializes/renders the same off-page. No background
 * is painted here — callers add one to the (possibly composed) outer svg.
 */
function cloneChartSvg(svgElement: SVGSVGElement): SVGSVGElement {
  const svgCloneElement = svgElement.cloneNode(true) as SVGSVGElement;
  inlineComputedStyles(svgCloneElement, svgElement);
  for (const crosshairElement of svgCloneElement.querySelectorAll('.' + crosshairClass)) {
    crosshairElement.parentNode?.removeChild(crosshairElement);
  }
  // The export is a static image: the tab stops and button semantics need the
  // live keyboard handlers, so strip them and expose the svg as a plain
  // labeled image instead of an interactive group.
  for (const interactiveElement of svgCloneElement.querySelectorAll('[tabindex]')) {
    for (const attribute of ['tabindex', 'role', 'aria-label', 'aria-expanded', 'aria-pressed']) {
      interactiveElement.removeAttribute(attribute);
    }
  }
  svgCloneElement.setAttribute('role', 'img');
  return svgCloneElement;
}

function getSvgText(svgElement: SVGSVGElement, options: ExportSvgOptions): string {
  const { transparent = false, backgroundColor = getEffectiveBackgroundColor(svgElement) } = options;
  const svgCloneElement = cloneChartSvg(svgElement);

  if (!transparent) {
    const { width, height } = getSvgSize(svgElement);
    svgCloneElement.insertBefore(makeBackgroundRect(width, height, backgroundColor), svgCloneElement.firstChild);
  }

  return new XMLSerializer().serializeToString(svgCloneElement);
}

/**
 * Compose several live chart svgs into one standalone svg, tiling them left to
 * right, top to bottom into `cols` columns. Every tile is sized to the largest
 * chart so the grid stays aligned. Returns null when no chart svg is found.
 */
function getStitchedSvgText(elements: Element[], options: StitchOptions): string | null {
  const { transparent = false, cols, gap = 0 } = options;
  const charts: { svg: SVGSVGElement; width: number; height: number }[] = [];
  for (const element of elements) {
    const svg = findChartSvg(element);
    if (svg) {
      const { width, height } = getSvgSize(svg);
      charts.push({ svg, width, height });
    }
  }
  if (charts.length === 0) {
    return null;
  }
  const backgroundColor = options.backgroundColor ?? getEffectiveBackgroundColor(charts[0].svg);
  // cols is an upper bound: reserving columns no chart can reach would pad the
  // image with blank space (a partly-filled last row still leaves its own cells)
  const columns = Math.min(Math.max(1, Math.floor(cols)), charts.length);
  const rows = Math.ceil(charts.length / columns);
  const cellWidth = charts.reduce((max, chart) => Math.max(max, chart.width), 0);
  const cellHeight = charts.reduce((max, chart) => Math.max(max, chart.height), 0);
  const totalWidth = columns * cellWidth + (columns - 1) * gap;
  const totalHeight = rows * cellHeight + (rows - 1) * gap;

  // createElementNS already puts the element in the svg namespace; setting xmlns
  // here too would serialize the declaration twice and make the markup invalid xml
  const outer = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
  outer.setAttribute('width', String(totalWidth));
  outer.setAttribute('height', String(totalHeight));
  outer.setAttribute('viewBox', '0 0 ' + totalWidth + ' ' + totalHeight);

  if (!transparent) {
    outer.appendChild(makeBackgroundRect(totalWidth, totalHeight, backgroundColor));
  }

  charts.forEach((chart, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    // Center each chart within its (max-sized) cell so uneven sizes stay tidy.
    const x = col * (cellWidth + gap) + (cellWidth - chart.width) / 2;
    const y = row * (cellHeight + gap) + (cellHeight - chart.height) / 2;
    const clone = cloneChartSvg(chart.svg);
    clone.setAttribute('x', String(x));
    clone.setAttribute('y', String(y));
    clone.setAttribute('width', String(chart.width));
    clone.setAttribute('height', String(chart.height));
    outer.appendChild(clone);
  });

  return new XMLSerializer().serializeToString(outer);
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

/** Rasterize standalone svg markup to a png blob via an offscreen canvas. */
function rasterizeSvgText(svgText: string, width: number, height: number, scale: number): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // a throw here escapes the event handler rather than the promise executor, so
      // without this the promise would never settle (drawImage/toBlob raise
      // SecurityError on a canvas tainted by a cross-origin image in the chart)
      try {
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
          resolve(blob);
        });
      }
      catch (error) {
        // rejected as-is: a DOMException's name (SecurityError) is the diagnosis,
        // and wrapping it in a generic Error would throw that away
        reject(error);
      }
    };
    img.onerror = () => {
      reject(new Error('mochart-export: failed to rasterize the chart svg'));
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText);
  });
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
  return rasterizeSvgText(svgText, width, height, scale).then((blob) => {
    saveBlob(blob, filename + '.png');
    return true;
  });
}

function getStitchedFilename(elements: Element[], options: StitchOptions): string {
  if (options.filename) {
    return options.filename;
  }
  for (const element of elements) {
    const svg = findChartSvg(element);
    if (svg) {
      return getFilename(svg, options);
    }
  }
  return options.filenamePrefix ? options.filenamePrefix + 'export' : 'export';
}

function getStitchedSize(svgText: string): { width: number; height: number } {
  const widthMatch = /\bwidth="([\d.]+)"/.exec(svgText);
  const heightMatch = /\bheight="([\d.]+)"/.exec(svgText);
  return {
    width: widthMatch ? parseFloat(widthMatch[1]) : 0,
    height: heightMatch ? parseFloat(heightMatch[1]) : 0
  };
}

/**
 * Download several charts tiled into one svg file (see getStitchedSvgText for
 * the layout). Returns true when at least one chart svg was found.
 */
export function exportChartsSVG(elements: Element[], options: StitchOptions): boolean {
  const svgText = getStitchedSvgText(elements, options);
  if (svgText === null) {
    return false;
  }
  const filename = getStitchedFilename(elements, options);
  const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
  saveBlob(blob, filename + '.svg');
  return true;
}

/**
 * Download several charts tiled into one png file, rasterized through an
 * offscreen canvas. Resolves to true when at least one chart svg was found.
 */
export function exportChartsPNG(elements: Element[], options: StitchPngOptions): Promise<boolean> {
  const svgText = getStitchedSvgText(elements, options);
  if (svgText === null) {
    return Promise.resolve(false);
  }
  const { scale = 2 } = options;
  const filename = getStitchedFilename(elements, options);
  const { width, height } = getStitchedSize(svgText);
  return rasterizeSvgText(svgText, width, height, scale).then((blob) => {
    saveBlob(blob, filename + '.png');
    return true;
  });
}

/** Serialize several charts tiled into one standalone svg string (no download). */
export function getStitchedChartsSvgText(elements: Element[], options: StitchOptions): string | null {
  return getStitchedSvgText(elements, options);
}
