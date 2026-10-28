# Onionskyn

### Gap4456's Fork — Custom Improvements

This fork includes additional animation workflow improvements, including a movable rotation pivot, pivot-aware tweening, improved frame and keyframe controls, and timeline Copy/Paste Frames.

See [GAPS_CHANGELOG.md](GAPS_CHANGELOG.md) for the full list of modifications.

A free, single-file animation editor that runs in your browser. Draw vectors, lay them out on a timeline, tween between keyframes, and export video, GIF, SVG or a standalone HTML player. Nothing is uploaded anywhere; your work stays in your browser until you save it.

Onionskyn is an independent project and is not affiliated with Adobe.

## Documentation

- [Getting started](docs/getting-started.md): the screen layout and how saving works
- [Tutorial 1: a bouncing ball](docs/tutorial-1-bouncing-ball.md)
- [Tutorial 2: symbols and masks](docs/tutorial-2-symbols-and-masks.md)
- [Reference](docs/reference.md): tools, panels, timeline, tweens, text, images, sound, scripting
- [Importing and exporting](docs/import-export.md)
- [ActionScript 1/2 and scenes](docs/actionscript.md): running old Flash code, and how scenes import
- [Keyboard shortcuts](docs/shortcuts.md)
- [Troubleshooting and known limits](docs/troubleshooting.md)
- [Building from source](docs/building.md): the source layout, building and testing

## Building from source

The app is a single HTML file built from the files in `src/`. Run `./build.sh` to produce `dist/onionskyn.html`, and `npm test` to run the regression suites. See [Building from source](docs/building.md) for the layout and the tests.

## Reporting a problem

Use **File → Report a problem…** in the app, describe what happened, and choose **Email report**. It opens your email app addressed to onionskyn.support@gmail.com with technical details attached. If no email app opens, use **Copy report** and paste it into an email yourself.

## License

Onionskyn is released under the [MIT License](LICENSE). Copyright (c) 2026 Dylan Papp. It includes JSZip and pako, also MIT; see [THIRD-PARTY.md](THIRD-PARTY.md).
