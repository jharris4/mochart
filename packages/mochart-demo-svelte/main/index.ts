import { mount } from 'svelte';

import 'bootstrap/dist/css/bootstrap.min.css';
import 'font-awesome/css/font-awesome.min.css';
import './demo.css';

import App from './App.svelte';

const target = document.getElementById('root');
if (target === null) {
  throw new Error('demo root element (#root) not found');
}

mount(App, { target });
