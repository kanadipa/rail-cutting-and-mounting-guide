# The 3D lib

A small 3D toolkit, built on [three.js](https://threejs.org) 0.160.

- `lib/core` is plain three.js with no framework, so it works with React, Vue, Svelte or vanilla JS.
- `lib/react` holds thin [React Three Fiber](https://r3f.docs.pmnd.rs) wrappers over `core`.

Scene units are **millimetres**. A cut rail piece sits at the origin, and every placed item's pose
is relative to its rail, so a rail and its items go in the same scene with nothing to convert. You
do not need 3D experience to use it.

## Core API (`lib/core`)

### `loadGlb(url): Promise<THREE.Group>`

Loads a GLB. Each URL is downloaded once. Every call returns its own copy, so changing or cutting
one copy never affects another. It rejects with a clear error if the file cannot be loaded.

### `cutRailModel(railScene, cutLengthMm, barLengthMm): THREE.Group`

Cuts a rail to length. `railScene` is the rail's raw-bar GLB (from `loadGlb`), and
`barLengthMm` comes from the rail's entry in `catalog.json`. It returns a **new** model of the
piece, at the origin and running along +X for `cutLengthMm`. The cut end is closed. The input is
left untouched.

**Throws** if the cut is impossible: a length that is not a positive number, or
`cutLengthMm > barLengthMm`.

To show the whole raw bar, cut it to its full length: `cutRailModel(scene, bar, bar)`.

### `placeComponent(model, pose): model`

Sets the model's position and rotation from a placed item's `pose` in `placement.json`. Take the
component's GLB as it is: the pose alone puts it in place on its rail, with no scaling, centring or
other processing. Add it to the same scene (or group) as the rail piece.

### `createRailScene(container, { background? }): RailScene`

A ready-made viewer inside any HTML element. It sets up an orthographic camera looking straight at
the plate, lights, and controls: drag to rotate, two fingers or right-drag to pan, pinch or wheel to
zoom. It follows the container's size.

```ts
interface RailScene {
  scene: THREE.Scene;                 // add your models here
  camera: THREE.OrthographicCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  fitTo(object?, padding?): void;     // frame an object (default: everything)
  dispose(): void;                    // remove the canvas, free GPU memory
}
```

### Example: plain TypeScript

```ts
import { createRailScene, cutRailModel, loadGlb, placeComponent } from "./lib/core";

const view = createRailScene(document.getElementById("viewer")!, { background: "#f4f5f7" });

const railGlb = await loadGlb("/assets/glb/Weidmueller.0236500000.glb");
const piece = cutRailModel(railGlb, 306, 2000);
view.scene.add(piece);

const part = await loadGlb("/assets/glb/Siemens.6ES7131-6BH01-0BA0.glb"); // -2K1/1
placeComponent(part, { positionMm: [155.1, -15.8, 8.63], quaternion: [0, 0, 0, 1] });
view.scene.add(part);

view.fitTo(piece);
```

## React API (`lib/react`)

| Component / hook | Does |
| --- | --- |
| `<RailCanvas fitKey? background?>` | The viewport (camera, lights, controls). Change `fitKey` (e.g. to the rail's BMK) to re-frame the camera on its contents. |
| `<RailModel url cutLengthMm barLengthMm>` | A cut rail piece. If the cut is impossible it throws to the nearest error boundary. |
| `<ComponentModel url pose onClick?>` | A component at its pose. |
| `useGlb(url)` | `{ model, error }`, for building your own components. |

```tsx
<RailCanvas fitKey={rail.bmk}>
  <RailModel url="/assets/glb/Weidmueller.0236500000.glb" cutLengthMm={306} barLengthMm={2000} />
  <ComponentModel url="/assets/glb/Siemens.6ES7131-6BH01-0BA0.glb" pose={item.pose} />
</RailCanvas>
```

`demo/main.tsx` is a complete, minimal example. It loads both data files, cuts the chosen rail, and
places its components; a slider sets how many of them are shown.

## Good to know

- The GLBs are real CAD models, up to about 1.4 MB each, and one rail uses dozens of them. Load
  each article once and reuse it. `loadGlb` already does this for you.
- You may change the lib. If you do, say so in `DECISIONS.md`.
