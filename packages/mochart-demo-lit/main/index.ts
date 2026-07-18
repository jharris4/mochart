import { html, render } from 'lit';

import 'bootstrap/dist/css/bootstrap.min.css';
import 'font-awesome/css/font-awesome.min.css';
import './demo.css';

import './demo-app';

const target = document.getElementById('root');
if (target === null) {
  throw new Error('demo root element (#root) not found');
}

render(html`<demo-app></demo-app>`, target);
