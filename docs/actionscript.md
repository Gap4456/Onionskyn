# ActionScript 1/2 and scenes

Onionskyn can run the kind of ActionScript 1 and 2 code found in Flash 5 to Flash 8 files, and it imports scenes. This page covers what works, what doesn't, and how to bring an old file across.

## Turning it on

Open the **Doc** tab and set **Scripts** to **ActionScript 1/2**. The importer sets this for you when the file says it is an AS1/AS2 document, or when its scripts clearly are (for example they use `getURL`, `_root` or `on (release)`).

The setting applies to every script in the document: frame scripts, and the new **Script** box for clips and buttons. With it off, scripts are JavaScript in the CreateJS style, as before.

## Scripts on clips and buttons

Select a movie clip or button and use the **Script** box in the **Object** tab. Set the symbol type to **Button** to make a button: it shows its Up, Over and Down frames and uses the fourth frame as its hit area.

```
on (release) {
  gotoAndPlay("Main Menu", 1);
}
on (rollOver) { _root.hint._visible = true; }
onClipEvent (enterFrame) { _x += 2; }
```

A script on a button runs against the timeline the button sits on. A script on a movie clip runs against the clip itself.

## What works

- **Handlers:** `on (press, release, releaseOutside, rollOver, rollOut, keyPress "<Left>")`, `onClipEvent (load, enterFrame, mouseDown, mouseUp, mouseMove, keyDown, keyUp)`, and assigned handlers such as `mc.onRelease = function () { ... }`.
- **Timeline control:** `play`, `stop`, `gotoAndPlay`, `gotoAndStop`, `nextFrame`, `prevFrame`, `nextScene`, `prevScene`. Frame numbers start at 1. A number alone means a frame of the current scene, and `gotoAndPlay("Scene name", 1)` jumps to a scene.
- **Targets and properties:** `_root`, `_parent`, `_level0`, `this`, instance names, `_x`, `_y`, `_alpha` (0 to 100), `_rotation`, `_xscale`, `_yscale`, `_visible`, `_name`, `_currentframe`, `_totalframes`, `_xmouse`, `_ymouse`, `setProperty`, `getProperty`, `with`, `tellTarget`.
- **Variables and functions:** `var` and `function` on a frame belong to that timeline and are still there on later frames and from other clips. Variables that were never set read as `undefined` instead of causing an error. AS2 type annotations (`var n:Number`, `function f(a:String):Void`) are accepted and ignored.
- **Other commands:** `trace`, `getURL`, `random`, `getTimer`, `int`, `stopAllSounds`, `Key` (`isDown`, `getCode`, `addListener`), `new Sound(this)` with `attachSound`, `start`, `stop`, `setVolume` and `onSoundComplete`. Standard JavaScript objects (`Math`, `Array`, `Date`, `String`) and `setInterval` work as usual.

`getURL` opens the address in the player. Addresses starting with `javascript:` are blocked. In ▶ Preview, `getURL` shows the address in the message bar instead of leaving the page.

## What is not supported yet

`attachMovie`, `duplicateMovieClip`, `removeMovieClip`, `loadMovie`, `loadVariables`, `startDrag`, classes (AS2 `class` files), and the slash syntax (`/mc:var`). Preview reports each unsupported command once and carries on.

## Scenes

When you import a file with several scenes, Onionskyn joins them into one timeline, the same way Flash does when it publishes. Every scene's layers only have content inside that scene's frames, and the first keyframe of each scene is marked **S** on the timeline. The **Doc** tab lists the scenes so you can jump to one.

## Bringing in an old file

Onionskyn reads the Flash CS5 and later `.fla` and `.xfl` formats. Files from Flash MX 2004 and Flash 8 (the older binary `.fla`) have to be re-saved first: open the file in Animate, then **File → Save As** a current `.fla`.

Recent versions of Animate convert old ActionScript 1/2 documents to ActionScript 3 when you do this, and **that drops button handlers** such as `on (release)`. Frame scripts survive. Keep the original file, copy each handler out of it, and paste it into the matching button's **Script** box.
