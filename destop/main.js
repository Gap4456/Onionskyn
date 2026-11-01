const { app, BrowserWindow, shell, dialog, ipcMain } = require('electron');
const path = require('node:path');
app.setName('Onionskyn');
function createWindow() {
  const win = new BrowserWindow({
    width: 1360, height: 860, minWidth: 800, minHeight: 550,
    title: 'Onionskyn', autoHideMenuBar: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true,
      preload: path.join(__dirname, 'preload.js') }
  });
  let dirty = false;
  let allowClose = false;
  let closingPrompt = false;
  let awaitingSave = false;
  let saveDownloadStarted = false;
  let saveDownloadFinished = false;
  let saveRequestAcknowledged = false;
  let saveFailed = false;
  function resetSave() {
    awaitingSave = false; saveDownloadStarted = false; saveDownloadFinished = false;
    saveRequestAcknowledged = false; saveFailed = false;
  }
  function finishSaveIfReady() {
    if (!awaitingSave) return;
    if (saveFailed) { resetSave(); dialog.showMessageBox(win, { type:'warning', buttons:['OK'],
      title:'Save failed', message:'Project was not saved. Onionskyn will remain open.' }); return; }
    if (saveRequestAcknowledged && saveDownloadFinished) {
      resetSave(); dirty = false; allowClose = true; win.close();
    }
  }
  const onDirty = (event, value) => { if (event.sender === win.webContents) dirty = !!value; };
  const onSaveResult = (event, ok) => {
    if (event.sender !== win.webContents || !awaitingSave) return;
    saveRequestAcknowledged = true;
    if (!ok) saveFailed = true;
    finishSaveIfReady();
  };
  ipcMain.on('onionskyn:dirty', onDirty);
  ipcMain.on('onionskyn:save-request-result', onSaveResult);
  win.on('closed', () => {
    ipcMain.removeListener('onionskyn:dirty', onDirty);
    ipcMain.removeListener('onionskyn:save-request-result', onSaveResult);
  });
  win.on('close', (event) => {
    if (allowClose || !dirty) return;
    event.preventDefault();
    if (closingPrompt || awaitingSave) return;
    closingPrompt = true;
    dialog.showMessageBox(win, {
      type:'warning', title:'Save your work?', message:'Save your work before closing Onionskyn?',
      detail:'You have unsaved changes.', buttons:['Save', "Don't Save", 'Cancel'],
      defaultId:0, cancelId:2, noLink:true
    }).then(({ response }) => {
      closingPrompt = false;
      if (win.isDestroyed()) return;
      if (response === 1) { allowClose = true; win.close(); }
      if (response === 0) {
        resetSave(); awaitingSave = true;
        win.webContents.send('onionskyn:save-before-close');
      }
    }).catch(() => { closingPrompt = false; });
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (url !== win.webContents.getURL()) event.preventDefault();
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url);
    return { action:'deny' };
  });
  win.webContents.session.on('will-download', (_event, item, sourceContents) => {
    if (sourceContents !== win.webContents) return;
    item.setSaveDialogOptions({ title:'Save Onionskyn file' });
    if (!awaitingSave) return;
    saveDownloadStarted = true;
    item.once('done', (_e, state) => {
      if (!awaitingSave) return;
      if (state === 'completed') saveDownloadFinished = true;
      else saveFailed = true;
      finishSaveIfReady();
    });
  });
  win.loadFile(path.join(__dirname, 'onionskyn.html'));
}
app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
