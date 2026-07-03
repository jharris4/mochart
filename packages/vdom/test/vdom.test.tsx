import { describe, it, expect, beforeEach } from 'vitest';
import { h, render, unmountAtNode, Component, PureComponent } from '../src/index';

let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

describe('mounting', () => {
  it('renders elements, text and numbers', () => {
    render(<div id="a">hello {42}</div>, container);
    const div = container.firstElementChild as HTMLDivElement;
    expect(div.id).toBe('a');
    expect(div.textContent).toBe('hello 42');
  });

  it('renders null/false children as placeholders that hold their position', () => {
    render(<div>{false}<span>x</span>{null}</div>, container);
    const div = container.firstElementChild!;
    expect(div.childNodes.length).toBe(3);
    expect(div.childNodes[0].nodeType).toBe(Node.COMMENT_NODE);
    expect((div.childNodes[1] as Element).tagName).toBe('SPAN');
  });

  it('flattens nested child arrays', () => {
    render(<div>{[1, 2].map(n => <i key={n}>{n}</i>)}<b>end</b></div>, container);
    expect(container.firstElementChild!.children.length).toBe(3);
  });

  it('creates svg elements in the SVG namespace and kebab-cases attributes', () => {
    render(
      <svg viewBox="0 0 10 10">
        <line x1={0} y1={0} x2={5} y2={5} strokeWidth={2} strokeOpacity={0.5} strokeDasharray="1 2" />
        <g clipPath="url(#c)" />
      </svg>,
      container
    );
    const svg = container.firstElementChild!;
    expect(svg.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(svg.getAttribute('viewBox')).toBe('0 0 10 10');
    const line = svg.firstElementChild!;
    expect(line.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(line.getAttribute('stroke-width')).toBe('2');
    expect(line.getAttribute('stroke-opacity')).toBe('0.5');
    expect(line.getAttribute('stroke-dasharray')).toBe('1 2');
    expect(svg.children[1].getAttribute('clip-path')).toBe('url(#c)');
  });

  it('applies style objects with px suffixes for dimensional numbers', () => {
    render(<div style={{ left: 5, opacity: 0.5, textAlign: 'center' }} />, container);
    const div = container.firstElementChild as HTMLDivElement;
    expect(div.style.left).toBe('5px');
    expect(div.style.opacity).toBe('0.5');
    expect(div.style.textAlign).toBe('center');
  });

  it('maps className to class', () => {
    render(<div className="a b" />, container);
    expect(container.firstElementChild!.getAttribute('class')).toBe('a b');
  });

  it('attaches event listeners', () => {
    let clicks = 0;
    render(<button onClick={() => clicks++} />, container);
    (container.firstElementChild as HTMLButtonElement).click();
    expect(clicks).toBe(1);
  });
});

describe('patching', () => {
  it('updates, adds and removes attributes', () => {
    render(<div id="a" title="t" />, container);
    const div = container.firstElementChild!;
    render(<div id="b" lang="en" />, container);
    expect(container.firstElementChild).toBe(div);
    expect(div.getAttribute('id')).toBe('b');
    expect(div.hasAttribute('title')).toBe(false);
    expect(div.getAttribute('lang')).toBe('en');
  });

  it('updates text in place', () => {
    render(<div>one</div>, container);
    const text = container.firstElementChild!.firstChild!;
    render(<div>two</div>, container);
    expect(container.firstElementChild!.firstChild).toBe(text);
    expect(text.nodeValue).toBe('two');
  });

  it('swaps event handlers without stacking listeners', () => {
    let a = 0;
    let b = 0;
    render(<button onClick={() => a++} />, container);
    render(<button onClick={() => b++} />, container);
    (container.firstElementChild as HTMLButtonElement).click();
    expect(a).toBe(0);
    expect(b).toBe(1);
  });

  it('reorders keyed children reusing DOM nodes', () => {
    render(<ul>{['a', 'b', 'c'].map(k => <li key={k}>{k}</li>)}</ul>, container);
    const [la, lb, lc] = Array.from(container.querySelectorAll('li'));
    render(<ul>{['c', 'a', 'b'].map(k => <li key={k}>{k}</li>)}</ul>, container);
    const items = Array.from(container.querySelectorAll('li'));
    expect(items.map(li => li.textContent)).toEqual(['c', 'a', 'b']);
    expect(items[0]).toBe(lc);
    expect(items[1]).toBe(la);
    expect(items[2]).toBe(lb);
  });

  it('adds and removes keyed children', () => {
    render(<ul>{['a', 'b'].map(k => <li key={k}>{k}</li>)}</ul>, container);
    render(<ul>{['b', 'x'].map(k => <li key={k}>{k}</li>)}</ul>, container);
    const items = Array.from(container.querySelectorAll('li'));
    expect(items.map(li => li.textContent)).toEqual(['b', 'x']);
  });

  it('swaps a conditional slot between false and an element without disturbing siblings', () => {
    render(<div>{false}<span>tail</span></div>, container);
    const tail = container.querySelector('span')!;
    render(<div><b>head</b><span>tail</span></div>, container);
    expect(container.firstElementChild!.children.length).toBe(2);
    expect(container.querySelector('b')!.nextElementSibling).toBe(tail);
    render(<div>{false}<span>tail</span></div>, container);
    expect(container.querySelector('b')).toBeNull();
    expect(container.querySelector('span')).toBe(tail);
  });
});

describe('function components', () => {
  it('renders and re-renders on prop change, skipping when props are shallow-equal', () => {
    let calls = 0;
    function Label({ text }: { text: string }) {
      calls++;
      return <span>{text}</span>;
    }
    render(<div><Label text="a" /></div>, container);
    expect(calls).toBe(1);
    render(<div><Label text="a" /></div>, container);
    expect(calls).toBe(1); // memoized
    render(<div><Label text="b" /></div>, container);
    expect(calls).toBe(2);
    expect(container.textContent).toBe('b');
  });

  it('supports defaultProps', () => {
    function Greet({ name }: { name?: string }) {
      return <span>{name}</span>;
    }
    Greet.defaultProps = { name: 'world' };
    render(<Greet />, container);
    expect(container.textContent).toBe('world');
  });

  it('can render null', () => {
    function Nothing() {
      return null;
    }
    render(<div><Nothing /><span>x</span></div>, container);
    expect(container.querySelector('span')!.textContent).toBe('x');
  });
});

describe('class components', () => {
  it('supports setState with synchronous re-render and callback', () => {
    let instance: Counter;
    class Counter extends Component<{}, { n: number }> {
      constructor(props: {}) {
        super(props);
        this.state = { n: 0 };
        instance = this;
      }
      render() {
        return <span>{this.state.n}</span>;
      }
    }
    render(<Counter />, container);
    expect(container.textContent).toBe('0');
    let called = false;
    instance!.setState({ n: 5 }, () => {
      called = true;
    });
    expect(container.textContent).toBe('5');
    expect(called).toBe(true);
  });

  it('merges setState during componentWillMount without extra renders', () => {
    let renders = 0;
    class WillMounter extends Component<{}, { ready: boolean }> {
      componentWillMount() {
        this.setState({ ready: true });
      }
      render() {
        renders++;
        return <span>{this.state.ready ? 'ready' : 'no'}</span>;
      }
    }
    render(<WillMounter />, container);
    expect(renders).toBe(1);
    expect(container.textContent).toBe('ready');
  });

  it('merges setState during componentWillReceiveProps into the same render', () => {
    let renders = 0;
    class Receiver extends Component<{ value: number }, { doubled: number }> {
      componentWillMount() {
        this.setState({ doubled: this.props.value * 2 });
      }
      componentWillReceiveProps(nextProps: { value: number }) {
        this.setState({ doubled: nextProps.value * 2 });
      }
      render() {
        renders++;
        return <span>{this.state.doubled}</span>;
      }
    }
    render(<Receiver value={1} />, container);
    render(<Receiver value={3} />, container);
    expect(container.textContent).toBe('6');
    expect(renders).toBe(2);
  });

  it('PureComponent skips re-render for shallow-equal props and state', () => {
    let renders = 0;
    class Pure extends PureComponent<{ a: number }> {
      render() {
        renders++;
        return <span>{this.props.a}</span>;
      }
    }
    render(<div><Pure a={1} /></div>, container);
    render(<div><Pure a={1} /></div>, container);
    expect(renders).toBe(1);
    render(<div><Pure a={2} /></div>, container);
    expect(renders).toBe(2);
  });

  it('runs refs and didMount after DOM attachment, child before parent', () => {
    const order: string[] = [];
    let refNode: Element | null = null;
    class Child extends Component {
      componentDidMount() {
        order.push('child');
      }
      render() {
        return <i ref={(el: Element | null) => { refNode = el; order.push('ref:' + (el !== null && el.isConnected)); }} />;
      }
    }
    class Parent extends Component {
      componentDidMount() {
        order.push('parent');
      }
      render() {
        return <div><Child /></div>;
      }
    }
    render(<Parent />, container);
    expect(order).toEqual(['ref:true', 'child', 'parent']);
    expect(refNode).not.toBeNull();
  });

  it('calls componentDidUpdate with previous props and state', () => {
    const seen: any[] = [];
    class Watcher extends Component<{ v: number }, { s: number }> {
      componentWillMount() {
        this.setState({ s: 0 });
      }
      componentDidUpdate(prevProps: { v: number }, prevState: { s: number }) {
        seen.push([prevProps.v, prevState.s]);
      }
      render() {
        return <span>{this.props.v}</span>;
      }
    }
    render(<Watcher v={1} />, container);
    render(<Watcher v={2} />, container);
    expect(seen).toEqual([[1, 0]]);
  });

  it('setState inside componentDidMount triggers a follow-up render (measure/re-render loop)', () => {
    class Measurer extends Component<{}, { width: number }> {
      componentWillMount() {
        this.setState({ width: 0 });
      }
      componentDidMount() {
        this.setState({ width: 100 });
      }
      render() {
        return <span>{this.state.width}</span>;
      }
    }
    render(<Measurer />, container);
    expect(container.textContent).toBe('100');
  });

  it('calls componentWillUnmount and ref(null) on unmount', () => {
    const events: string[] = [];
    class Leaf extends Component {
      componentWillUnmount() {
        events.push('unmount');
      }
      render() {
        return <i ref={(el: Element | null) => events.push(el ? 'ref' : 'ref-null')} />;
      }
    }
    render(<div><Leaf /></div>, container);
    render(<div />, container);
    expect(events).toEqual(['ref', 'unmount', 'ref-null']);
  });

  it('a component can render another component (chained dom resolution)', () => {
    function Inner({ label }: { label: string }) {
      return <em>{label}</em>;
    }
    class Outer extends PureComponent<{ label: string }> {
      render() {
        return <Inner label={this.props.label} />;
      }
    }
    render(<div><Outer label="x" /><span>y</span></div>, container);
    expect(container.firstElementChild!.children.length).toBe(2);
    render(<div><Outer label="z" /><span>y</span></div>, container);
    expect(container.querySelector('em')!.textContent).toBe('z');
  });

  it('supports class defaultProps', () => {
    class Greeter extends Component<{ name?: string }> {
      static defaultProps = { name: 'world' };
      render() {
        return <span>{this.props.name}</span>;
      }
    }
    render(<Greeter />, container);
    expect(container.textContent).toBe('world');
  });

  it('component root can change type between renders (false -> div)', () => {
    class Toggle extends Component<{ on: boolean }> {
      render() {
        return this.props.on ? <div>on</div> : false;
      }
    }
    render(<section><Toggle on={false} /><footer /></section>, container);
    const section = container.firstElementChild!;
    expect(section.childNodes[0].nodeType).toBe(Node.COMMENT_NODE);
    render(<section><Toggle on={true} /><footer /></section>, container);
    expect((section.childNodes[0] as Element).tagName).toBe('DIV');
    expect((section.childNodes[1] as Element).tagName).toBe('FOOTER');
  });
});

describe('root render', () => {
  it('unmountAtNode clears the tree', () => {
    render(<div>x</div>, container);
    unmountAtNode(container);
    expect(container.childNodes.length).toBe(0);
  });

  it('spread props patch correctly (event handler bag)', () => {
    let entered = 0;
    const handlers: any = { onMouseEnter: () => entered++ };
    render(<div {...handlers} />, container);
    container.firstElementChild!.dispatchEvent(new MouseEvent('mouseenter'));
    expect(entered).toBe(1);
    render(<div {...{}} />, container);
    container.firstElementChild!.dispatchEvent(new MouseEvent('mouseenter'));
    expect(entered).toBe(1);
  });
});
