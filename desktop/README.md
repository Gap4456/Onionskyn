# Onionskyn Desktop

Windows desktop version of the Onionskyn animation editor, packaged with Electron.

This is part of [Gap4456's Onionskyn fork](https://github.com/Gap4456/Onionskyn).

## Download

For the ready-to-use Windows version, visit [GitHub Releases](https://github.com/Gap4456/Onionskyn/releases).

Download the Windows ZIP archive, extract it completely, and run `Onionskyn.exe`.

## Build from source

Requirements:
- Node.js and npm
- Windows 64-bit for the Windows build

Open a terminal in the `desktop` folder and run:

```
bash
npm ci
npm start
```

To build the Windows desktop application:

```
bash
npm run dist:win
```

The generated application and ZIP archive will be available in the `release` folder.

## Known limitation

If the project contains unsaved changes, the desktop application may refuse to close without displaying a warning. Press Ctrl+S to save before closing.

## Credits

Original Onionskyn project by [papptimus](https://github.com/papptimus/Onionskyn).

Desktop packaging and custom modifications by Gap4456.

See [GAPS_CHANGELOG.md](../GAPS_CHANGELOG.md) for the list of modifications.
