import React, { useRef, useState, useEffect, type ComponentType } from 'react';

/**
 * Minimal replacement for the old `react-sizer` HOC, built on ResizeObserver.
 * Renders a measuring div and passes its size to the wrapped component via
 * the configured prop names. `sizer({ widthProp: 'dontwantwidth' })` can be
 * used to discard a measurement (the old trick of routing it to an unused prop).
 */
interface SizerOptions {
  widthProp?: string;
  heightProp?: string;
}

interface Size {
  width: number;
  height: number;
}

export default function sizer(options: SizerOptions = {}) {
  const widthProp = options.widthProp || 'width';
  const heightProp = options.heightProp || 'height';

  return function wrapWithSizer<P extends object>(WrappedComponent: ComponentType<P>) {
    return function Sizer(props: Partial<P>) {
      const elementRef = useRef<HTMLDivElement>(null);
      const [size, setSize] = useState<Size>({ width: 0, height: 0 });

      useEffect(() => {
        const element = elementRef.current;
        if (element === null) {
          return;
        }
        const updateSize = (rawWidth: number, rawHeight: number) => {
          const width = Math.floor(rawWidth);
          const height = Math.floor(rawHeight);
          setSize(prev => (width !== prev.width || height !== prev.height ? { width, height } : prev));
        };
        const resizeObserver = new ResizeObserver(entries => {
          const { width, height } = entries[entries.length - 1].contentRect;
          updateSize(width, height);
        });
        resizeObserver.observe(element);
        const rect = element.getBoundingClientRect();
        updateSize(rect.width, rect.height);
        return () => resizeObserver.disconnect();
      }, []);

      const { width, height } = size;
      const sizeProps = { [widthProp]: width, [heightProp]: height } as Partial<P>;
      // The wrapper must join the surrounding flex layout (the demo css
      // assumes the measured element stretches), so it is a flex child and
      // a flex container itself rather than a plain block.
      const style: React.CSSProperties = {
        display: 'flex',
        flexFlow: 'column nowrap',
        flex: '1 1 auto',
        width: '100%',
        minWidth: 0,
        minHeight: 0,
        overflow: 'hidden'
      };
      return (
        <div className="sizer" style={style} ref={elementRef}>
          {width > 0 ? <WrappedComponent {...(props as P)} {...sizeProps} /> : null}
        </div>
      );
    };
  };
}
