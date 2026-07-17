import React from 'react';
import sizer from 'react-sizer';

interface Props {
  width: number;
  height: number;
  value: string;
  onChange: (value: string) => void;
}

function TextAreaContent({ width, height, value, onChange }: Props) {
  return (
    <div className="text-area-content">
      <textarea value={value} onChange={(event) => onChange(event.target.value)} style={{ width, height }}></textarea>
    </div>
  );
}

const SizerTextAreaContent = sizer()(TextAreaContent);

export default SizerTextAreaContent;
