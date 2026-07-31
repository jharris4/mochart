export type JsonPath = (string | number)[];
export type JsonEditorSeverity = 'error' | 'warning' | 'info' | 'hint';

export interface JsonEditorDiagnostic {
  from: number;
  to: number;
  severity: JsonEditorSeverity;
  message: string;
  path?: JsonPath;
  source: 'json' | 'mochart';
}

export interface JsonEditorSupport {
  readonly name: string;
}

export interface JsonEditorOptions {
  /** Initial strict-JSON source text. */
  value?: string;
  /** Accessible name applied to the editor's content element. */
  ariaLabel: string;
  /** Indentation used by `format`; defaults to two spaces. */
  indentation?: number | string;
  readOnly?: boolean;
  lineNumbers?: boolean;
  /** Optional domain intelligence, such as `createMochartConfigSupport()`. */
  support?: JsonEditorSupport | JsonEditorSupport[];
  /** Called for user edits and formatting, but not controlled `setValue` updates. */
  onChange?: (value: string) => void;
  /** Called when syntax or domain diagnostics are recalculated. */
  onDiagnostics?: (diagnostics: readonly JsonEditorDiagnostic[]) => void;
}

export interface JsonEditorHandle {
  readonly element: HTMLElement;
  getValue(): string;
  setValue(value: string): void;
  setReadOnly(readOnly: boolean): void;
  focus(): void;
  format(): boolean;
  destroy(): void;
}
