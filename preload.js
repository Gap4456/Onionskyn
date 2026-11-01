const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('onionskynDesktop', {
  setDirty: (value) => ipcRenderer.send('onionskyn:dirty', !!value),
  onSaveBeforeClose: (callback) => ipcRenderer.on('onionskyn:save-before-close', () => callback()),
  saveRequestResult: (ok) => ipcRenderer.send('onionskyn:save-request-result', !!ok)
});
