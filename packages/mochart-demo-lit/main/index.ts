import { html, render } from 'lit';

import 'bootstrap/dist/css/bootstrap.min.css';
import '@fortawesome/fontawesome-free/css/fontawesome.min.css';
import '@fortawesome/fontawesome-free/css/solid.min.css';
import './demo.css';

import './demo-app';

const target = document.getElementById('root');
if (target === null) {
  throw new Error('demo root element (#root) not found');
}

render(html`<demo-app></demo-app>`, target);
