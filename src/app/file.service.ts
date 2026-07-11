import { Injectable } from '@angular/core';

import { invoke } from '@tauri-apps/api/core';
import { openPath } from '@tauri-apps/plugin-opener';
import { platform } from '@tauri-apps/plugin-os';
import { tempDir, join } from '@tauri-apps/api/path';

import { ParsedPath, RenamedObject, RenameObject, RenameResult } from './interfaces';
import { BaseDirectory, readTextFile, stat, writeTextFile } from '@tauri-apps/plugin-fs';

const FORBIDDEN_CHARS: string[] = [ `/`, `\\`, `|`, `?`, `*`, `:`, `>`, `<`, `"` ];

interface RustRenameResult {
  msg: string;
  result: string;
}

@Injectable({
  providedIn: 'root'
})
export class FileService {

  readonly tempTextFilename = 'simplest-file-renamer-scratchpad.txt';

  isWindows: boolean;
  sep: "\\" | "/";

  constructor() {
    this.isWindows = platform() === 'windows' ? true : false;
    this.sep = this.isWindows ? "\\" : "/";
  }

  parse(path: string): ParsedPath {
    if (this.isWindows) {
      return this.parseWin(path);
    } else {
      return this.parsePosix(path);
    }
  }

  async renameTheseFiles(filesToRename: RenameObject[]): Promise<RenamedObject[]> {

    const itemsWithIndex = filesToRename.map((item, index) => ({ ...item, idx: index }));

    const sortedFilesToRename: RenameObject[] = itemsWithIndex
    .slice()
    .sort((a, b) => {
      const depthA = (a.path).split(this.sep).length;
      const depthB = (b.path).split(this.sep).length;

      return depthB - depthA;
    });

    let results: RenamedObject[] = [];

    for (const file of sortedFilesToRename) {
      const result: RenamedObject = await this.renameThisFile(file);
      results.push(result);
    }

    const unscrambled = results.sort((a, b) => a.idx - b.idx);

    return unscrambled;
  }

  /**
   *
   * @param file RenameObject
   * @returns
   */
  hasForbiddenChar(file: RenameObject): RenamedObject | undefined {
    for (const char of FORBIDDEN_CHARS) {
      if (file.newFilename.includes(char)) {
        file.result = 'error';
        file.error = `can not have '${char}' in a filename`;

        return file as RenamedObject;
      }
    }
    return undefined;
  }

  /**
   * Asks Rust to rename file, returns object indicating success or error
   * @param file RenameObject -- file to rename
   * @returns RenamedObject
   */
  async renameThisFile(file: RenameObject): Promise<RenamedObject> {

    const renamedObject: RenamedObject = {
      idx: file.idx,
      path: file.path,
      filename: file.filename,
      extension: file.extension,
      newFilename: file.newFilename,
      result: undefined,
      error: "",
    };

    if (file.filename === file.newFilename) {
      renamedObject.result = 'unchanged';
      return renamedObject;
    }

    if (file.newFilename === undefined || file.newFilename.length === 0) {
      renamedObject.result = 'error';
      renamedObject.error = 'empty file name';
      return renamedObject;
    }

    const forbidden = this.hasForbiddenChar(file);
    if (forbidden) {
      return forbidden;
    }

    const original: string = await join(file.path, file.filename + file.extension);
    const newName: string = await join(file.path, file.newFilename + file.extension);

    let response: RustRenameResult = { msg: '', result: '' };

    await invoke<RustRenameResult>('rename', { 'old': original, 'new': newName })
      .then((rustResponse: RustRenameResult) => {
        console.log(rustResponse);
        response = rustResponse;
      });

    renamedObject.result = response.result as RenameResult;

    if (response.msg !== '') {
      renamedObject.error = response.msg;
    }

    return renamedObject;

  }

  /**
   * Read scratchpad file and return its contents
   * @returns
   */
  async readScratchpadFile(): Promise<string> {
    const fileContent = await readTextFile(this.tempTextFilename, {
      baseDir: BaseDirectory.Temp,
    });

    return fileContent;
  }

  /**
   * Get the modified time for the scratch file
   * @returns
   */
  async getFileModifiedTime(): Promise<number | undefined> {
    const tempPath = await tempDir();
    const fullPath = await join(tempPath, this.tempTextFilename);
    const fileMetadata = await stat(fullPath);
    const modifiedTime = fileMetadata.mtime; // mtime is a Date object or null

    return modifiedTime?.getTime();
}

  /**
   * Opens the file with OS default text editor
   */
  async openScratchpadFile() {
    try {
      const tempPath = await tempDir();
      const fullPath = await join(tempPath, this.tempTextFilename);
      await openPath(fullPath);
    } catch (error) {
      console.error('Failed to open file:', error);
    }
  }

  /**
   * Write the text into the scratch file
   * @param fileContents
   */
  async writeScratchpadFile(fileContents: string) {
    try {
      await writeTextFile(this.tempTextFilename, fileContents, {
        baseDir: BaseDirectory.Temp,
      });
    } catch (error) {
      console.error('Failed to write temp file:', error);
    }
  }

  // Below comes from the `path-parse` NPM package
  // https://github.com/jbgutierrez/path-parse/blob/master/index.js

  // WINDOWS SECTION =========================================================================================

  splitWindowsRe =
    /^(((?:[a-zA-Z]:|[\\\/]{2}[^\\\/]+[\\\/]+[^\\\/]+)?[\\\/]?)(?:[^\\\/]*[\\\/])*)((\.{1,2}|[^\\\/]+?|)(\.[^.\/\\]*|))[\\\/]*$/;

  win32SplitPath(filename: string) {
    return this.splitWindowsRe.exec(filename).slice(1);
  }

  parseWin(pathString: string): ParsedPath {
    if (typeof pathString !== 'string') {
      throw new TypeError(
          "Parameter 'pathString' must be a string, not " + typeof pathString
      );
    }
    var allParts = this.win32SplitPath(pathString);
    if (!allParts || allParts.length !== 5) {
      throw new TypeError("Invalid path '" + pathString + "'");
    }
    return {
      root: allParts[1],
      dir: allParts[0] === allParts[1] ? allParts[0] : allParts[0].slice(0, -1),
      base: allParts[2],
      ext: allParts[4],
      name: allParts[3]
    };
  };


  // POSIX SECTION =========================================================================================

  splitPathRe =
    /^((\/?)(?:[^\/]*\/)*)((\.{1,2}|[^\/]+?|)(\.[^.\/]*|))[\/]*$/;

  posixSplitPath(filename: string) {
    return this.splitPathRe.exec(filename).slice(1);
  }

  parsePosix(pathString: string): ParsedPath {
    if (typeof pathString !== 'string') {
      throw new TypeError(
          "Parameter 'pathString' must be a string, not " + typeof pathString
      );
    }
    var allParts = this.posixSplitPath(pathString);
    if (!allParts || allParts.length !== 5) {
      throw new TypeError("Invalid path '" + pathString + "'");
    }

    return {
      root: allParts[1],
      dir: allParts[0].slice(0, -1),
      base: allParts[2],
      ext: allParts[4],
      name: allParts[3],
    };
  };


}
