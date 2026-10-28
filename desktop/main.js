// Electron logs: the Onionskyn editor itself remains unchanged.
const { app, BrowserWindow, shell } = require('electron');
const path = require('node:path');

// Keep Electron's browser storage stable across launches.
app.setName('Onionskyn');

function createWindow() {
  const win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 800,
    minHeight: 550,
    title: 'Onionskyn',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  // Disallow the local editor from navigating to an external website.
  win.webContents.on('will-navigate', (event, url) => {
    if (url !== win.webContents.getURL()) event.preventDefault();
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url);
    return { action: 'deny' };
  });

  // Save downloads to the user's chosen destination via Chromium's download dialog.
  win.webContents.session.on('will-download', (_event, item) => {
    item.setSaveDialogOptions({ title: 'Save Onionskyn file' });
  });

  win.loadFile(path.join(__dirname, 'onionskyn.html'));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
