import { Component, input } from '@angular/core';

@Component({
  selector: 'app-icon',
  templateUrl: './icon.component.html',
  styleUrls: []
})
export class IconComponent {

  readonly icon = input.required<string>();

  constructor() { }

}
