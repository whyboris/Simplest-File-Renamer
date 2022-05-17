import { app, BrowserWindow, screen, Menu } from 'electron';
import * as path from 'path';
import * as url from 'url';

const settings = require('electron-settings');

let win, serve;
const args = process.argv.slice(1);
serve = args.some(val => val === '--serve');

interface WindowSettings {
  x: number;
  y: number;
  width: number;
  height: number;
}

function createWindow() {

  const windowSettings: WindowSettings = getWindowSettings();

  console.log(windowSettings);

  Menu.setApplicationMenu(null);

  // Create the browser window.
  win = new BrowserWindow({
    x: windowSettings.x,
    y: windowSettings.y,
    width: windowSettings.width,
    height: windowSettings.height,
    center: true,
    minWidth: 400,
    minHeight: 200,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
  });

  if (serve) {
    require('electron-reload')(__dirname, {
      electron: require(`${__dirname}/node_modules/electron`)
    });
    win.loadURL('http://localhost:4200');
  } else {
    win.loadURL(url.format({
      pathname: path.join(__dirname, 'dist/index.html'),
      protocol: 'file:',
      slashes: true
    }));
  }

  if (serve) {
    win.webContents.openDevTools();
  }

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store window
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null;
  });

  win.on('close', () => {
    const windowSizeAndPosition: WindowSettings = win.getBounds();

    settings.setSync('app-location', windowSizeAndPosition);
  });

}

try {

  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  app.on('ready', createWindow);

  // Quit when all windows are closed.
  app.on('window-all-closed', () => {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (win === null) {
      createWindow();
    }
  });

} catch (e) {
  // Catch Error
  // throw e;
}

// =================================================================================================
//   CUSTOM STUFF
// =================================================================================================

import { RenameObject, RenamedObject, RenameResult } from './src/app/home/interfaces';

const fs = require('fs');

const ipc = require('electron').ipcMain;
const shell = require('electron').shell;

const dialog = require('electron').dialog;

let angularApp: any = null;

const pathToAppData = app.getPath('appData');


ipc.on('just-started', function (event) {
  console.log('just started !!!');
  angularApp = event;

  // parse files from command line
  var args = process.argv.slice(1);
  var filePaths = args.filter(function (val, index, array) {
    if (!fs.existsSync(val)) return false;
    return fs.lstatSync(val).isFile();
  });
  console.log("filePaths from CLI:", filePaths);
  if (filePaths.length) {
    angularApp.sender.send("file-chosen", filePaths);
  }
});

ipc.on('choose-file', function (event) {
  dialog.showOpenDialog(win, {
    properties: ['openFile', 'multiSelections']
  }).then(result => {
    console.log(result);
    const filePath: string[] = result.filePaths;
    if (filePath.length) {
      event.sender.send('file-chosen', filePath);
    }
  }).catch(err => {
    console.log('choose-input: this should not happen!');
    console.log(err);
  });
});

ipc.on('rename-these-files', function (event, filesToRename: RenameObject[]): void {
  console.log('renaming!!!');
  console.log(filesToRename);

  const results: RenamedObject[] = filesToRename.map(element => renameThisFile(element));

  console.log(results);
  angularApp.sender.send('renaming-report', results);
});

function fileExistsWithCaseSync(filepath) {
  const dir: string = path.dirname(filepath);
  if (dir === '/' || dir === '.') return true;
  const filenames = fs.readdirSync(dir); // add return type?
  if (filenames.indexOf(path.basename(filepath)) === -1) {
      return false;
  }
  return fileExistsWithCaseSync(dir);
}

function renameThisFile(file: RenameObject): RenamedObject {

  const renamedObject: RenamedObject = {
    path: file.path,
    filename: file.filename,
    extension: file.extension,
    newFilename: file.newFilename,
    result: undefined,
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

  if (file.newFilename.includes('/')) {
    renamedObject.result = 'error';
    renamedObject.error = 'can not have "/" in filename';
    return renamedObject;
  }

  const original: string = path.join(file.path, file.filename + file.extension);
  const newName: string = path.join(file.path, file.newFilename + file.extension);

  console.log('renaming file:');
  console.log(original);
  console.log(newName);

  let result: RenameResult = 'renamed';
  let errMsg: string;

  // check if already exists first
  if (fileExistsWithCaseSync(newName)) {
    result = 'error';
    errMsg = 'file name exists';
  } else {
    try {
      fs.renameSync(original, newName);
    } catch (err) {
      result = 'error';
      // console.log(err);
      if (err.code === 'ENOENT') {
        errMsg = 'source file not found';
      } else {
        errMsg = 'unexpected error';
      }
    }
  }

  renamedObject.result = result;

  if (errMsg) {
    renamedObject.error = errMsg;
  }

  return renamedObject;
}


ipc.on('open-txt-file', function (event, files: string): void {

  try {
    fs.statSync(path.join(pathToAppData, 'renamer-app'));
  } catch (e) {
    fs.mkdirSync(path.join(pathToAppData, 'renamer-app'));
  }

  const pathToTempTXT: string = path.join(pathToAppData, 'renamer-app', 'temp.txt');
  console.log(pathToTempTXT);

  fs.writeFile(pathToTempTXT, files, 'utf8', () => {

    console.log('file written');

    shell.openPath(pathToTempTXT); // normalize because on windows, the path sometimes is mixing `\` and `/`

  });

});

let lastModified: number = 0;

/**
 * Check if file has been edited
 * if so, send its contents back to the app
 */
ipc.on('app-back-in-focus', function (event): void {

  const currentModified: number = fs.statSync(path.join(pathToAppData, 'renamer-app', 'temp.txt')).mtimeMs;

  if (lastModified === currentModified) {
    return;
  } else {
    lastModified = currentModified;
  }

  fs.readFile(path.join(pathToAppData, 'renamer-app', 'temp.txt'), 'utf8', (err, data) => {
    if (err) {
      console.log(err);
    } else {
      console.log('file read:');
      // console.log(data);
      angularApp.sender.send('txt-file-updated', data);
    }
  });

});

/**
 * Determine app location and size based on last location
 * or default to something good.
 */
function getWindowSettings(): WindowSettings {

  const electronScreen = screen;

  const desktopSize = electronScreen.getPrimaryDisplay().workAreaSize; // { height: number, width: number }

  const screenWidth = desktopSize.width;
  const screenHeight = desktopSize.height;

  const defaultSize: WindowSettings = {
    x: desktopSize.width / 2 - 300,
    y: desktopSize.height / 2 - 150,
    width: 600,
    height: 300,
  };

  const savedSettings = settings.getSync('app-location');

  // Make sure the app isn't off-screen (perhaps due to monitor change)
  if (    savedSettings
       && savedSettings.x < screenWidth - 200
       && savedSettings.y < screenHeight - 200
      ) {
    return savedSettings;
  } else {
    return defaultSize;
  }
}
