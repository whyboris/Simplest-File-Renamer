import { Component, input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-icon',
  templateUrl: './icon.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: []
})
export class IconComponent {

  readonly icon = input.required<string>();

  constructor() { }

}
