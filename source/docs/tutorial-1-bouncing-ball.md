# Tutorial 1: a bouncing ball

In about five minutes you will draw a ball, make it fall and rise, shape the speed so it feels weighty, and export it. Start with **File → New animation**.

1. **Set up the document.** Open the **Doc** tab in the Properties panel. Leave the stage size as is, set **fps** to 24 and **Fr** (frames) to 48. That is two seconds.
2. **Draw the ball.** Pick the Ellipse tool (**O**). Hold **Shift** to keep it a circle and drag near the top of the stage on frame 1. Switch to the Selection tool (**V**), click the ball, and use the **Object** tab to choose a fill colour.
3. **Add the landing keyframe.** In the timeline, click the cell for frame 24 on your layer, then press **F6** (Insert keyframe). Frame 24 now holds a copy of the ball. With the Selection tool, drag that copy down to the floor.
4. **Add the return keyframe.** Click frame 48 and press **F6**. Drag the ball back up to where it started.
5. **Tween the motion.** Click frame 1, open the **Frame** tab, and set Tween to **Motion**. Do the same on frame 24. The Frame tab shows the span the tween covers, and scrubbing the ruler shows the ball sliding between keyframes. You can also right-click a cell and choose **Create motion tween**.
6. **Shape the speed.** On frame 1 set Ease to **Ease in** (the ball accelerates as it falls). On frame 24 set Ease to **Ease out** (it decelerates as it rises). Try **Bounce** on the fall for a different feel.
7. **Squash it (optional).** Add a keyframe at frame 23, then use the Object tab to make the ball slightly wider and shorter. The tween will stretch and recover around the impact.
8. **Play it.** Press **Enter** to play and again to stop. Turn on **Loop** and **Onion** (the onion skin shows ghosts of neighbouring frames) in the transport bar to judge the arc.
9. **Export it.** Open **Export → Video…** (or **Animated GIF…**), choose a size and quality, and start the export. The export dialog shows the output size and warns you if it is too large.

## Tips

- Editing a frame inside a tween adds a keyframe there automatically.
- Tweens match objects between two keyframes, so keep the ball a single object per layer for the cleanest result.
- Put each moving thing on its own layer. Use the + button in the layers toolbar to add a layer when a scene gets busy.

Next: [Tutorial 2: symbols and masks](tutorial-2-symbols-and-masks.md)
