import { mount } from 'svelte';

import 'bootstrap/dist/css/bootstrap.min.css';
import 'font-awesome/css/font-awesome.min.css';
import './demo.css';

import App from './App.svelte';

mount(App, { target: document.getElementById('root') });
