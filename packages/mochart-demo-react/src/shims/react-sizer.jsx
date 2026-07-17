import React, { Component } from 'react';

/**
 * Minimal replacement for the old `react-sizer` HOC, built on ResizeObserver.
 * Renders a measuring div and passes its size to the wrapped component via
 * the configured prop names. `sizer({ widthProp: 'dontwantwidth' })` can be
 * used to discard a measurement (the old trick of routing it to an unused prop).
 */
export default function sizer(options = {}) {
  const widthProp = options.widthProp || 'width';
  const heightProp = options.heightProp || 'height';

  return function wrapWithSizer(WrappedComponent) {
    return class Sizer extends Component {
      constructor(props) {
        super(props);
        this.elementRef = React.createRef();
        this.resizeObserver = null;
        this.state = { width: 0, height: 0 };
      }

      updateSize = (width, height) => {
        width = Math.floor(width);
        height = Math.floor(height);
        if (width !== this.state.width || height !== this.state.height) {
          this.setState({ width, height });
        }
      }

      componentDidMount() {
        const element = this.elementRef.current;
        this.resizeObserver = new ResizeObserver(entries => {
          const { width, height } = entries[entries.length - 1].contentRect;
          this.updateSize(width, height);
        });
        this.resizeObserver.observe(element);
        const rect = element.getBoundingClientRect();
        this.updateSize(rect.width, rect.height);
      }

      componentWillUnmount() {
        this.resizeObserver.disconnect();
        this.resizeObserver = null;
      }

      render() {
        const { width, height } = this.state;
        const sizeProps = { [widthProp]: width, [heightProp]: height };
        // The wrapper must join the surrounding flex layout (the demo css
        // assumes the measured element stretches), so it is a flex child and
        // a flex container itself rather than a plain block.
        const style = {
          display: 'flex',
          flexFlow: 'column nowrap',
          flex: '1 1 auto',
          width: '100%',
          minWidth: 0,
          minHeight: 0,
          overflow: 'hidden'
        };
        return (
          <div className="sizer" style={style} ref={this.elementRef}>
            {width > 0 ? <WrappedComponent {...this.props} {...sizeProps} /> : null}
          </div>
        );
      }
    };
  };
}
