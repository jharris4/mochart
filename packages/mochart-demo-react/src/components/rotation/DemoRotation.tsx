import { rotationConfigs as configs, rotationData as data } from '@mochart/demo-common';

import React, { useState, useEffect, useRef } from 'react';

import { DefaultChart } from '@mochart/react';

import { SiteRootButton, BackToDemosButton } from '../misc/ModeSwitcher';

import type { OnBackToDemos } from '../../types';

const minWidth = 400;

interface DemoRotationProps {
  siteRootUrl?: string;
  onBackToDemos: OnBackToDemos;
}

export default function DemoRotation({ siteRootUrl, onBackToDemos }: DemoRotationProps) {
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
    <div className="mochart-demo-container">
      <div className="mochart-demo-tabs-container">
        <div className="mochart-demo-nav-group">
          <SiteRootButton siteRootUrl={siteRootUrl} />
          <BackToDemosButton onBackToDemos={onBackToDemos} />
        </div>
      </div>
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
