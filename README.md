# Slim Studio

Next.js + React Three Fiber / Drei mockup studio for a 250 ml slim aluminium can.

## Develop

Node.js 22+ recommended (validated on 24). Run `npm ci`, then `npm run dev`.
Production: `npm run build` then `npm start`. Deploy directly to Vercel or any Node.js host supporting Next.js. No credentials, database or external HDRI assets are required.

## Geometry and labels

Nominal slim can: 250 ml, Ø52 mm body, 134 mm overall height. The procedural reference model uses a shorter shoulder, a recessed lid and an approximately Ø50.8 mm external end seam (200 size code). Body dimensions are fixed; camera zoom does not change physical size. Profile details are visual approximations from the supplied reference, not manufacturing CAD.

The available cylindrical label zone is 4–124 mm from the bottom (120 mm maximum label height). Circumference is π × 52 = 163.3628 mm. Label width is circumference minus the 4 mm seam = 159.3628 mm. A partial cylinder leaves the seam physically uncovered; the seam is at the back of the initial view.

PNG upload opens a 2D editor. Its full-body unfolding is 163.36 × 134 mm; the two 2 mm edge strips form one 4 mm seam. Adjust label height and distance from the bottom, artwork width/height, and X/Y placement in millimetres, or drag the artwork. Drag any corner handle to resize it proportionally while keeping the opposite corner fixed. Aspect ratio is locked by default; fit, explicit stretch and centering are available. Artwork outside the label rectangle is clipped. Apply commits the same composition to the 3D mesh; cancel preserves the previous composition. Transparent PNG pixels expose aluminium. Uploads are held in browser memory only.

## Video

MediaRecorder records one 360° turn as square WebM at 720p or 1080p, for 4/6/8 seconds. Current camera and scene background are preserved. A playable preview and Save video as button appear after recording. Chrome/Edge open the native file picker for folder and filename selection; browsers without File System Access use standard downloads. A separate WebM download link remains available. Cancelling the picker retains the recording. Requires WebGL and a browser supporting canvas.captureStream and WebM MediaRecorder (Chrome/Firefox recommended). Actual frame rate depends on device performance; keep the tab visible while recording. MP4 is not produced.

## Checks

`npm test` checks dimensions, seam width, placement limits, aspect ratios and texture coordinates. `npm run build` validates TypeScript and produces the production bundle. Browser smoke checks should cover PNG upload, background switching, orbit controls and a completed WebM download.

## Camera and lid rendering

Left drag orbits; right drag and Shift + left drag pan parallel to the screen without changing the viewing angle. The Pan toolbar mode also maps left drag (one finger on touchscreens) to pan. Two fingers combine zoom and pan. Camera reset restores the initial position and target and clears damping motion. Camera composition is retained in video export.

The end deck, scored opening, strengthening panel, countersink and rolled seam are a single connected indexed surface. The pull tab and rivet are separate physical parts with bevelled edges. Neutral studio reflection cards and a shadow-casting key light reveal the pressed relief. Geometry connectivity, boundary integrity and surface relief are covered by tests. The procedural shape remains a visual reference rather than manufacturing CAD.

## Interface and product lighting

The interface, label editor, validation messages and video export are in English, with English number formatting. The product scene uses a bright front-left key light and tall left reflection card, weaker right fill, and a satin clearcoat on non-metallic printed artwork. The resulting left-to-right falloff keeps the illuminated label bright while preserving depth on the right. The same lights and materials are used in the exported video.

## View-relative studio controls

The key/fill rig and reflection environment follow the camera orientation every frame and stay outside the rotating can group. Orbiting the camera, panning and automatic can rotation therefore retain the key light on screen-left. Video uses the same live rig and settings.

Light intensity scales the direct sources and environment together (25–200%). Light hardness controls the sampled softbox spread, reflection-card width and PCF shadow radius (0% broad/soft, 100% small/focused). The reflection map is regenerated once the hardness slider settles; intensity does not rebuild it. Both controls are locked during recording.

## Share preview

Share preview saves an immutable scene snapshot to the public `slim-studio-previews` Vercel Blob store and returns a short `/share?id=…` URL. The store is linked to the existing Vercel project and supplies `BLOB_READ_WRITE_TOKEN` to production and preview deployments; no token is exposed to the client. Anyone with the URL can view the snapshot without an account. The applied PNG, label dimensions, lighting, background, automatic rotation and camera pose are preserved. Later editor changes do not alter existing links.

The viewer contains only the canvas and orbit/pan/zoom/reset/fullscreen controls. It works in a fresh browser session after the creator closes the editor. There are no upload, editing, lighting adjustment or recording controls. Sharing does not grant access to the creator's editor.

The creation endpoint limits payloads to 3.8 MB, validates scene data, restricts image types to embedded PNG and applies a best-effort per-instance request limit. Public snapshots have unguessable UUIDs. There is no expiry or revocation interface yet. Storage usage is managed in the project's Vercel Blob settings. Previous self-contained fragment links remain readable, with bounded decompression and schema validation.
