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
          background: '#cce8cc', // COLOR green
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
          background: '#e8cccc',  // COLOR red
          color: '#370000',
          strike: true
        };
        newOps.ops.push(op);
      }

    }

    const adjusted = oldContent.compose(newOps);

    return adjusted;
  }

  /**
   * Natural sort a list of strings, mutates array and return sorted array
   * @param array
   */
  public natural_sort(array) {
    // using `localeCompare()` rather than implementing from scratch
    // https://stackoverflow.com/questions/2802341/javascript-natural-sort-of-alphanumerical-strings
    // https://fuzzytolerance.info/blog/2019/07/19/The-better-way-to-do-natural-sort-in-JavaScript/
    array.sort((a, b) =>
      a.localeCompare(b, navigator.languages[0] || navigator.language, {
        numeric: true,
        ignorePunctuation: true,
      })
    );
    return array;
  }

}
