const { contextBridge, webUtils, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('process', process)

contextBridge.exposeInMainWorld('myAPI', {
  getPathForFile: (file) => {
    const path = webUtils.getPathForFile(file);
    return path;
  }
});

contextBridge.exposeInMainWorld('myElectron', {
  sendToMain: (channel, data) => ipcRenderer.send(channel, data),
  receiveFromMain: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(...args))
});

