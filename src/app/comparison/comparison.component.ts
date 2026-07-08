import { Component, input, ChangeDetectionStrategy } from '@angular/core';

import type { RenamedObject, RenameObject } from '../interfaces';
import { IconComponent } from '../icons/icon.component';

@Component({
  selector: 'app-comparison',
  templateUrl: './comparison.component.html',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./comparison.component.scss']
})
export class ComparisonComponent {

  readonly files = input<RenamedObject[] | RenameObject[]>();

  constructor() { }

  getIcon(file: RenamedObject | RenameObject): string {

    if (file.filename === file.newFilename) {
      return 'icon-equals';
    } else if (file.newFilename === '' || !file.newFilename) {
      return 'icon-error';
    } else {
      return 'icon-arrow';
    }

  }

}
