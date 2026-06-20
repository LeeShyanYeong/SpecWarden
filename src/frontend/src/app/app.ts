import { Component } from '@angular/core';
import { Board } from './board';

@Component({
  selector: 'app-root',
  imports: [Board],
  template: '<app-board />',
})
export class App {}
