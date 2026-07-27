import { formatData } from '@mochart/demo-common';

import { useState, useRef } from 'react';

import TextAreaContent from '../misc/TextAreaContent';

interface Props {
  active?: boolean;
  data: unknown;
}

export default function RandomMochartDataTab({ active, data }: Props) {
  const [dataText, setDataText] = useState(() => formatData(data));

  const prevData = useRef(data);
  if (prevData.current !== data) {
    prevData.current = data;
    setDataText(formatData(data));
  }

  return (
    <div className={"mochart-demo-tab-container demo-layout-col data" + (active ? " active" : "")}>
      <div className="mochart-demo-tab-content">
        <TextAreaContent value={dataText} onChange={() => {}} />
      </div>
    </div>
  );
}
