# Third-party software

Onionskyn's single-file build (`onionskyn.html`) includes the following libraries, inlined so the app works offline.

## polygon-clipping v0.15.7

- Copyright (c) 2018 Mike Fogel; portions Copyright (c) 2016 Alexander Milevski (from martinez)
- MIT licence. Used by the Eraser tool to cut filled shapes.
- Source and full licence text: https://github.com/mfogel/polygon-clipping (also kept in `source/src/vendor/polygon-clipping.LICENSE.md`)

## JSZip v3.10.1

- Copyright (c) 2009-2016 Stuart Knightley
- Dual licensed under the MIT license or GPLv3; Onionskyn uses it under the **MIT license**.
- Source and full licence text: https://github.com/Stuk/jszip (see `LICENSE.markdown`)

JSZip bundles **pako**, released under the MIT license: https://github.com/nodeca/pako (see `LICENSE`)

The licence header comment at the top of the inlined JSZip code is left in place in the built file, as the MIT licence requires.
