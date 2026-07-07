export interface SourceOfTruth {
  path: string;
  filename: string;
  extension: string;
}

export interface RenameObject extends SourceOfTruth {
  newFilename: string;
}

export type RenameResult = 'renamed' | 'unchanged' | 'error';

export interface ParsedPath {
    base: string;
    dir: string;
    ext: string;
    name: string;
    root: string;
}

export interface RenamedObject extends RenameObject {
  result: RenameResult;
  error?: string;
}

export const defaultOptions = {
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
