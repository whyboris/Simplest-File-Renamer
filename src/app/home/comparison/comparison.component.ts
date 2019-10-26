import { Component, Input } from '@angular/core';

import { RenamedObject, RenameObject } from '../interfaces';

@Component({
  selector: 'app-comparison',
  templateUrl: './comparison.component.html',
  styleUrls: ['./comparison.component.scss']
})
export class ComparisonComponent {

  @Input() files: RenamedObject[] | RenameObject[];

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
