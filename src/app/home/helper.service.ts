import { Injectable } from '@angular/core';

@Injectable()
export class HelperService {

  constructor() { }

  /**
   * Generate Quill ops for additions
   * @param oldContent
   * @param newContent
   */
  public find_additions(oldContent, newContent) {
    const diff = oldContent.diff(newContent);

    for (let i = 0; i < diff.ops.length; i++) {
      const op = diff.ops[i];
      if (op.hasOwnProperty('insert')) {
        op.attributes = {
          background: '#cce8cc', // green
          color: '#003700'
        };
      }
    }

    const adjusted: any = oldContent.compose(diff);

    return adjusted;
  }

  /**
   * Generate Quill ops for deletions
   * @param oldContent
   * @param newContent
   */
  public find_deletions(oldContent, newContent) {
    const diff = oldContent.diff(newContent);

    const newOps = {
      ops: []
    };

    for (let i = 0; i < diff.ops.length; i++) {
      const op = diff.ops[i];

      if (op.hasOwnProperty('retain')) {
        newOps.ops.push(op);
      }

      if (op.hasOwnProperty('delete')) {
        // keep the text
        op.retain = op.delete;
        delete op.delete;
        // but color it red and struckthrough
        op.attributes = {
          background: '#e8cccc',
          color: '#370000',
          strike: true
        };
        newOps.ops.push(op);
      }

    }

    const adjusted = oldContent.compose(newOps);

    return adjusted;
  }

}
