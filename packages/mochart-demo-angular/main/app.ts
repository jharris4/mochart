import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  styles: [':host { display: block; width: 100%; height: 100%; }'],
  template: '<router-outlet />'
})
export class App {}
