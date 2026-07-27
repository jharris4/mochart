
interface Props {
  value: string;
  onChange: (value: string) => void;
}

// The old code measured this pane with a sizer HOC and set explicit pixel
// sizes on the textarea; plain css sizing does the same job now.
export default function TextAreaContent({ value, onChange }: Props) {
  return (
    <div className="text-area-content">
      <textarea value={value} onChange={(event) => onChange(event.target.value)}></textarea>
    </div>
  );
}
