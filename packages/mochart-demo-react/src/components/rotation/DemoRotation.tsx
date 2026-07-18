import React, { useState, useEffect, useRef } from 'react';
import merge from 'lodash.merge';

import { DefaultChart } from 'mochart-react';

const minWidth = 400;

const data = [
  { "g": 1, "gd": "A text Label", "v": 123 },
  { "g": 2, "gd": "Some Long Text", "v": 24 },
  { "g": 3, "gd": "Cool", "v": 823 },
  { "g": 4, "gd": "Some Long Text", "v": 894 },
  { "g": 5, "gd": "Word", "v": 731 },
  { "g": 6, "gd": "Some Long Text", "v": 178 },
  { "g": 7, "gd": "Cool", "v": 420 },
  { "g": 8, "gd": "Some Long Text", "v": 295 },
  { "g": 9, "gd": "Oh", "v": 736 },
  { "g": 10, "gd": "Some Long Text", "v": 638 },
  { "g": 11, "gd": "Some Long Text", "v": 204 },
  { "g": 12, "gd": "Some Long Text", "v": 375 }
];

const baseConfig = {
  "version": "1.0.3",
  "chartConfig": {
    "margin": { "top": 10, "right": 10, "bottom": 10, "left": 10 }
  },
  "plotConfig": {
    "inverted": false
  },
  "titleConfig": {
    "title": "The Title"
  },
  "groupAxisConfig": {
    "valueLabel": "Group",
    "property": "g",
    "displayProperty": "gd",
    "type": "string",
    "scale": "ordinal",
    "title": "Group Axis Title",
    "tickLabelTruncationEnabled": true,
    "tickLabelTruncationValue": "...",
    "tickLabelTruncationMaxPercent": 0.20,
    "titleTruncationEnabled": true,
    "titleTruncationValue": "...",
    "tickLabelAnchor": "auto",
    "tickLabelRotation": 0,
    "before": true,
    "collapsed": false
  },
  "seriesAxisConfigs": [
    {
      "id": "SA1",
      "base": 0,
      "min": 0
    }
  ],
  "seriesConfigs": [
    {
      "axis": "SA1",
      "property": "v",
      "title": "Series 1"
    }
  ]
};

const configs: Record<string, any>[] = [];

function addConfig(title: string, inverted: boolean, before: boolean, collapsed: boolean, rotation: number, anchor = "auto") {
  const configOverride = {
    "titleConfig": {
      "title": title
    },
    "plotConfig": {
      "inverted": inverted
    },
    "groupAxisConfig": {
      "before": before,
      "collapsed": collapsed,
      "tickLabelRotation": rotation,
      "tickLabelAnchor": anchor
    }
  }
  configs.push(merge({}, baseConfig, configOverride));
}

addConfig("A1", false, false, false, 0);
addConfig("B1", false, false, true, 0);
addConfig("C1", false, true, false, 0);
addConfig("D1", false, true, true, 0);
addConfig("E1", true, false, false, 0);
addConfig("F1", true, false, true, 0);
addConfig("G1", true, true, false, 0);
addConfig("H1", true, true, true, 0);

addConfig("A2", false, false, false, -40);
addConfig("B2", false, false, true, -40);
addConfig("C2", false, true, false, -40);
addConfig("D2", false, true, true, -40);
addConfig("E2", true, false, false, -40);
addConfig("F2", true, false, true, -40);
addConfig("G2", true, true, false, -40);
addConfig("H2", true, true, true, -40);

addConfig("A3", false, false, false, 40);
addConfig("B3", false, false, true, 40);
addConfig("C3", false, true, false, 40);
addConfig("D3", false, true, true, 40);
addConfig("E3", true, false, false, 40);
addConfig("F3", true, false, true, 40);
addConfig("G3", true, true, false, 40);
addConfig("H3", true, true, true, 40);

addConfig("A4", false, false, false, -90);
addConfig("B4", false, false, true, -90);
addConfig("C4", false, true, false, -90);
addConfig("D4", false, true, true, -90);
addConfig("E4", true, false, false, -90);
addConfig("F4", true, false, true, -90);
addConfig("G4", true, true, false, -90);
addConfig("H4", true, true, true, -90);

addConfig("A5", false, false, false, 90);
addConfig("B5", false, false, true, 90);
addConfig("C5", false, true, false, 90);
addConfig("D5", false, true, true, 90);
addConfig("E5", true, false, false, 90);
addConfig("F5", true, false, true, 90);
addConfig("G5", true, true, false, 90);
addConfig("H5", true, true, true, 90);

addConfig("A6", false, true, false, 0, "middle");
addConfig("B6", false, true, false, -40, "middle");
addConfig("C6", false, true, false, 40, "middle");
addConfig("D6", false, true, false, -90, "middle");
addConfig("E6", false, true, false, 90, "middle");

addConfig("A7", false, true, false, 0, "start");
addConfig("B7", false, true, false, -40, "start");
addConfig("C7", false, true, false, 40, "start");
addConfig("D7", false, true, false, -90, "start");
addConfig("E7", false, true, false, 90, "start");

addConfig("A8", false, true, false, 0, "end");
addConfig("B8", false, true, false, -40, "end");
addConfig("C8", false, true, false, 40, "end");
addConfig("D8", false, true, false, -90, "end");
addConfig("E8", false, true, false, 90, "end");

export default function DemoRotation() {
  // Columns are sized from the card's measured width (not the window) so the
  // grid stays inside the padded shell.
  const chartsRef = useRef<HTMLDivElement | null>(null);
  const [chartsWidth, setChartsWidth] = useState(0);

  useEffect(() => {
    const el = chartsRef.current;
    if (!el) {
      return;
    }
    const measure = () => setChartsWidth(el.clientWidth);
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    measure();
    return () => observer.disconnect();
  }, []);

  const cols = Math.max(1, Math.floor(chartsWidth / minWidth));
  const colWidth = Math.floor(chartsWidth / cols);

  return (
    <div className="rotation-container">
      <div className="rotation-charts" ref={chartsRef}>
        {colWidth > 0 ? configs.map((config, i) => <DemoRotationChart key={i} data={data} config={config} i={i} cols={cols} colWidth={colWidth} />) : null}
      </div>
    </div>
  );
}

interface DemoRotationChartProps {
  data: Record<string, any>[];
  config: Record<string, any>;
  i: number;
  cols: number;
  colWidth: number;
}

function DemoRotationChart({ data, config, i, cols, colWidth }: DemoRotationChartProps) {
  const row = Math.floor(i / cols);

  const style: React.CSSProperties = {
    left: i % cols * colWidth,
    top: row * colWidth,
    width: colWidth,
    height: colWidth
  };

  return (
    <div className={"rotation-chart rotation-chart-" + i} style={style}>
      <DefaultChart config={config} data={data} width={colWidth} height={colWidth} />
    </div>
  );
}