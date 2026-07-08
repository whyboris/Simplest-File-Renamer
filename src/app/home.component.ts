import { Component, HostListener, ViewChild, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';

import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';

import Quill from 'quill';

import { HelperService } from './helper.service';
import { FileService } from './file.service';

import { ComparisonComponent } from './comparison/comparison.component';
import { IconComponent } from './icons/icon.component';
import { SvgDefinitionsComponent } from './icons/svg-definitions.component';

import { defaultOptions } from './interfaces';
import type { AfterViewInit, ElementRef, OnInit } from '@angular/core';
import type { SourceOfTruth, RenameObject, RenamedObject } from './interfaces';

interface FileOrDir {
  is_file: boolean, // snake_case to match the rust convention
  is_directory: boolean,
}

@Component({
  selector: 'app-root',
  templateUrl: './home.component.html',
  imports: [ ComparisonComponent, IconComponent, SvgDefinitionsComponent ],
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements AfterViewInit, OnInit {

  appWindow = getCurrentWindow();

  @ViewChild('editor1', { static: true }) editorNode1: ElementRef; // input file
  @ViewChild('editor2', { static: true }) editorNode2: ElementRef; // editable one
  @ViewChild('editor3', { static: true }) editorNode3: ElementRef; // input overlay (deletions)
  @ViewChild('editor4', { static: true }) editorNode4: ElementRef; // output overlay (additions)

  @ViewChild('comparison1', { static: true }) comparison1: ElementRef; // middle bar with comparison icons
  @ViewChild('comparison2', { static: true }) comparison2: ElementRef; // middle bar with comparison icons

  editor1: Quill;
  editor2: Quill;
  editor3: Quill;
  editor4: Quill;

  nodeRef1: HTMLElement;
  nodeRef2: HTMLElement;
  nodeRef3: HTMLElement;
  nodeRef4: HTMLElement;

  compare1: HTMLElement;
  compare2: HTMLElement;

  appInFocus = true;
  editingInTXT = false;
  hover = false;

  userUpdatedText = false; // used for deciding whether to `findDiff` on hover in/out

  compareIcons: RenamedObject[] | RenameObject[] = [];
  sourceOfTruth: SourceOfTruth[] = [];

  mode: 'review' | 'edit' = 'edit';

  finalReport = {
    failed: 0,
    renamed: 0,
    unchanged: 0,
  };

  numberOfSuccesses: number = 0;
  allErrors: any = {};

  @HostListener('document:keydown', ['$event'])
  handleArrowKeys(event: KeyboardEvent) {
    // stop showing diff if user starts to navigate with arrows
    if (['ArrowDown','ArrowUp','ArrowLeft','ArrowRight'].includes(event.key)) {
      this.hover = true;
    }
  }

  // `keydown` rather than `keypress` to include `Delete` and `Backspace` keyboard events
  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    // if editor has selection & user is typing, hide the diff overlay
    if (this.mode === 'edit' && this.editor2.getSelection() !== null) {
      this.userUpdatedText = true;
      this.hover = true;
    }
  }

  @HostListener('window:blur', ['$event'])
  onBlur(event: any): void {
    this.appInFocus = false;
  }

  @HostListener('window:focus', ['$event'])
  async onFocus(event: any) {
    this.appInFocus = true;

    if (this.editingInTXT && this.mode === 'edit') {
      const returnedText = await this.fileService.readScratchpadFile();

      this.afterFocusReturned(returnedText);
    }
  }

  lastModified = 0;

  async afterFocusReturned(newText: string) {

    const mtime = await this.fileService.getFileModifiedTime();

    if (mtime) {

      var currentModified = mtime;

      if (this.lastModified === currentModified) {

        return; // <------------ notice the early return; do not update editor

      }
      else {
          this.lastModified = currentModified;
      }
    }

    const newOps: any = {
      ops: [{
        insert: newText
      }]
    };
    this.editor2.setContents(newOps);
    this.findDiff();
  };


  // needs to be above `keyBindings` else maybe it doesn't work?
  toggler = () => {
    this.findDiff();
    this.scrollToCorrectPositions();
    this.hover = !this.hover;
  }

  keyBindings: any = {
    tab:   { key: 9,  handler: this.toggler },
    enter: { key: 13, handler: this.toggler },
    esc:   { key: 27, handler: this.toggler },
  };

  constructor(
    public helperService: HelperService,
    public fileService: FileService,
    public cd: ChangeDetectorRef,
  ) { }

  ngOnInit() {

    this.appWindow.onDragDropEvent((event) => { // Handles dropped files over app window
      if (event.payload.type === 'drop') {
        if (event.payload.paths.length > 0 && this.mode === 'edit') {
          this.addToFileList(event.payload.paths);
        }
      }
    });
  }

  // set up Quill
  ngAfterViewInit() {
    const customOptions = defaultOptions;
    const readOnly = JSON.parse(JSON.stringify(defaultOptions));
    readOnly.readOnly = true;
    customOptions.modules.keyboard.bindings = this.keyBindings;
    this.editor1 = new Quill(this.editorNode1.nativeElement, readOnly);
    this.editor2 = new Quill(this.editorNode2.nativeElement, defaultOptions);
    this.editor3 = new Quill(this.editorNode3.nativeElement, readOnly);
    this.editor4 = new Quill(this.editorNode4.nativeElement, readOnly);

    this.nodeRef1 = this.editorNode1.nativeElement;
    this.nodeRef2 = this.editorNode2.nativeElement;
    this.nodeRef3 = this.editorNode3.nativeElement;
    this.nodeRef4 = this.editorNode4.nativeElement;

    this.compare1 = this.comparison1.nativeElement;
    this.compare2 = this.comparison2.nativeElement;
  }

  /**
   * Add files/folders to current list
   * 1) don't add unless it's a file/folder not on the list
   * 2) append _input_ and _output_ with new filename/foldername
   * 3) reload the diff view
   * @param files
   */
  async addToFileList(files: string[]) {

    // TODO: perform sort() but with locale compare <------------------------- FIX THIS

    const input = this.editor1.getContents();
    const output = this.editor2.getContents();

    // clean up remove the `\n` at the beginning
    const newInput = { ops: [] };
    input.ops.forEach((element) => {
      if (element.insert !== '\n') { // do not include the first line
        newInput.ops.push(element);
      }
    });

    const newOutput = { ops: [] };
    output.ops.forEach((element) => {
      if (element.insert !== '\n') { // do not include the first line
        newOutput.ops.push(element);
      }
    });

    for (const file of files) {

      const currentFile = this.fileService.parse(file);

      let response: FileOrDir = { is_directory: false, is_file: false };
      await invoke<FileOrDir>("checkfileordir", { "pathstring": file }).then((fileOrPath) => {
        response = fileOrPath;
      });

      const isDirectory = response.is_directory;

      if (response.is_file || isDirectory) {

        const filename = isDirectory ? currentFile.base : currentFile.name;
        const extension = isDirectory ? '' : currentFile.ext;

        let fileAlreadyAdded: boolean = false;

        this.sourceOfTruth.forEach((element) => {
          if (
               element.filename  === filename
            && element.path      === currentFile.dir
            && element.extension === extension
          ) {
            fileAlreadyAdded = true;
          }
        });

        if (!fileAlreadyAdded) {

          this.sourceOfTruth.push({
            extension: extension,
            filename: filename,
            path: currentFile.dir,
          });

          newInput.ops.push({ insert: filename + '\n' });
          newOutput.ops.push({ insert: filename + '\n' });
        }
      }
    };

    this.editor1.setContents(<any>newInput);
    this.editor2.setContents(<any>newOutput);

    this.findDiff();
  }

  /**
   * Generate the deletions/additions markup and render
   */
  findDiff() {
    const oldContent = this.editor1.getContents();
    const newContent = this.editor2.getContents();

    const deleteOnly = this.helperService.find_deletions(oldContent, newContent);
    const addOnly = this.helperService.find_additions(oldContent, newContent);

    this.editor3.setContents(deleteOnly);
    this.editor4.setContents(addOnly);

    this.userUpdatedText = false;

    this.compareIcons = this.getNewSourceOfTruth();
  }

  // ======================= UI INTERRACTIONS ======================================================

  updateScroll() {
    this.hover = true;
    this.nodeRef1.scrollLeft = this.nodeRef2.scrollLeft;
    this.nodeRef1.scrollTop = this.nodeRef2.scrollTop;

    this.alignComparisonColumn();
  }

  /**
   * Update UI after mouse enters the text editing area
   */
  mouseEntered() {
    if (this.mode === 'edit') {
      this.hover = true;
    }
  }

  /**
   * Update UI after mouse leaves the text editing area
   * 1) find the diff
   * 2) align the scrolling location, both X & Y
   */
  mouseLeft() {
    if (this.mode === 'edit') {

      if (this.userUpdatedText) {
        this.findDiff();
      }

      this.scrollToCorrectPositions();

      this.hover = false;
    }
  }

  scrollToCorrectPositions() {
    this.nodeRef3.scrollLeft = this.nodeRef2.scrollLeft;
    this.nodeRef3.scrollTop = this.nodeRef2.scrollTop;

    this.nodeRef4.scrollLeft = this.nodeRef2.scrollLeft;
    this.nodeRef4.scrollTop = this.nodeRef2.scrollTop;

    this.alignComparisonColumn();
  }

  /**
   * Adjust the center comparison column depending on editor scroll amount
   */
  alignComparisonColumn() {
    const offsetStyle: string = "translateY(-" + this.nodeRef2.scrollTop + "px)";

    this.compare1.style.transform = offsetStyle;
    this.compare2.style.transform = offsetStyle;
  }

  /**
   * Open system dialog for adding new file or files
   */
  async addFile() {
    const fileList: string[] | null = await open({
      multiple: true,
      directory: false,
    });

    if (fileList && fileList.length > 0) {
      this.addToFileList(fileList);
    }
  }

  /**
   * Open system dialog for adding new folder or folders
   */
  async addFolder() {
    const folderList: string[] | null = await open({
      multiple: true,
      directory: true,
    });

    if (folderList && folderList.length > 0) {
      this.addToFileList(folderList);
    }
  }

  /**
   * Open the filenames/foldernames with system's default .txt editor
   */
  async openTXT() {
    this.editingInTXT = true;

    await this.fileService.writeScratchpadFile(this.editor2.getText());

    await this.fileService.openScratchpadFile();
  }

  /**
   * Start the rename process -- send data to Node
   *
   * Send the whole list to Node
   * Node will annotate it and return it back with `error`, `success`, or `unchanged`
   *
   */
  async renameStuff() {
    const renamedObject = await this.fileService.renameTheseFiles(this.getNewSourceOfTruth());

    this.showRenameReport(renamedObject);
  }

  /**
   * Sets mode to `review` and shows report of renaming to the user
   * @param report
   */
  showRenameReport(report: RenamedObject[]) {
    this.mode = 'review';

    this.editor1.setContents(this.editor3.getContents());
    this.editor2.setContents(this.editor4.getContents());
    this.editor2.disable(); // sets to `readOnly`

    this.compareIcons = report;

    this.finalReport = {
      failed: 0,
      renamed: 0,
      unchanged: 0,
    };

    report.forEach(element => {
      switch (element.result) {
        case 'renamed':
          this.finalReport.renamed++;
          break;
        case 'unchanged':
          this.finalReport.unchanged++;
          break;
        case 'error':
          this.finalReport.failed++;
          break;
      }
    });

    this.cd.detectChanges();
  }

  /**
   * Generate new `sourceOfTruth` object with `newFilename` field
   */
  getNewSourceOfTruth(): RenameObject[] {
    const fileNames = this.editor2.getText().split('\n');
    fileNames.pop(); // last element always `\n'

    // now do renaming against `sourceOfTruth`
    const newSourceOfTruth: RenameObject[] = [];

    this.sourceOfTruth.forEach((element, index) => {
      newSourceOfTruth.push({
        path: element.path,
        filename: element.filename,
        extension: element.extension,
        newFilename:  fileNames[index],
      });
    });

    return newSourceOfTruth;
  }

  /**
   * Reset the app to ~ initial state
   */
  restart(): void {
    this.sourceOfTruth = [];
    this.editor1.setContents(<any>[]);
    this.editor2.setContents(<any>[]);
    this.findDiff();
    this.editor2.enable();
    this.mode = 'edit';
  }

}
