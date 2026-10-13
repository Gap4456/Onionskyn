# Tutorial 2: symbols and masks

A **symbol** is a reusable drawing with its own timeline. Draw a character once, animate its blinking or walking inside the symbol, then place as many copies as you like.

## Make a symbol

1. Draw something (say an eye: a white ellipse with a dark pupil) and select all of its parts with the Selection tool.
2. Press **F8**, or click **Convert selection to symbol** in the Object or Library tab. On some laptops you need **Fn+F8**. A message confirms the new symbol and the Library tab opens.
3. The selection on the stage is now an *instance* of the symbol. Place more copies from the Library tab.

## Animate inside it

1. Double-click an instance (or double-click the symbol in the Library) to enter it. The breadcrumb at the top of the stage shows where you are; click back or press **Esc** with nothing selected to leave.
2. A new symbol has one frame. Press **F5** to add frames, then **F6** for keyframes, exactly as in [Tutorial 1](tutorial-1-bouncing-ball.md). For a blink, add a keyframe at frame 10 with a squashed eye and one at frame 12 back to normal.
3. Exit the symbol. All copies on the stage now blink.

## Movie clip or graphic?

Select an instance and look at the **Symbol** row in the Object tab.

| Type | Behaviour |
| --- | --- |
| Movie clip | Always loops from its first frame, independent of the main timeline. Best for ambient motion like blinking or flames. |
| Graphic | Follows the main timeline. Set Loop, Play once or Single frame, and the First frame to show. Best for lip-sync and hand-placed poses. |

Give an instance a name in the Instance field (for example `btn_next`) if you want to reach it from a script.

## Masks

A mask reveals only the part of other layers that sits behind its shapes.

1. Put the artwork you want to reveal on one layer, for example a striped image.
2. Add a layer **above** it and draw a shape (a circle works well) as the window.
3. Select the upper layer and click the **Mask** button in the layers toolbar. It now clips the layer or layers directly below it. Select more layers just under the mask and click Mask on each to add them.
4. Click Mask again to turn it back into a normal layer. A hidden mask layer does not mask anything, so show it again to see the effect.

Mask shapes can be tweened, so a circle that grows over a few frames makes a classic reveal.
