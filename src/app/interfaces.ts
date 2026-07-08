import type { QuillOptions } from 'quill';

export interface SourceOfTruth {
  path: string;
  filename: string;
  extension: string;
}

export interface RenameObject extends SourceOfTruth {
  newFilename: string;
  result?: RenameResult; // added just to avoid TS2339 in comparison.component.html
  error?: string;        // added just to avoid TS2339 in comparison.component.html
}

export type RenameResult = 'renamed' | 'unchanged' | 'error' | undefined;

export interface RenamedObject extends RenameObject {
  result: RenameResult;
  error: string; // "" empty string === no error
}

export interface ParsedPath {
    base: string;
    dir: string;
    ext: string;
    name: string;
    root: string;
}

export const defaultOptions: QuillOptions = {
  formats: null,
  modules: {
    toolbar: null,
    keyboard: {
      bindings: undefined,
    }
  },
  readOnly: false,
  theme: 'bubble',
};
