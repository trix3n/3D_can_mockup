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

## Multi-Label Studio and Share

The existing studio supports Variant A / B / C, with up to three PNG artworks. Upload, replace, arrange, cancel and remove operate on the selected variant. Label height and distance from the bottom are common; artwork size and placement are individual. Changing the common height repaints other variants from their local sources. Switching variants preserves the single Canvas, camera, can rotation, lights and background. Video records the selected variant; switching is locked during recording. PNG input remains limited to 25 MiB, with an additional 32-megapixel / 16384-pixel-per-side safety limit checked before decoding.

New shares are immutable v2 JSON snapshots in the existing **public** Vercel Blob store. Prepared artwork is embedded as PNG Base64; original source files and filenames are not shared. The **whole JSON** must fit in 22,000,000 bytes. The browser still uploads directly (multipart) through `/api/share/upload`; the large payload does not pass through a Vercel Function request or response.

Creation uses three steps:

1. `POST /api/review` issues a random ID and a ten-minute HMAC ticket, signed using the server-only Blob credential. The existing per-instance best-effort rate limit is retained.
2. Direct client upload writes only `review-v2/payloads/<id>.json`. The upload route validates the ticket, path, content type and size, disallows overwrites, and sets a 60-second public cache lifetime. Client upload cannot write manifests.
3. `PUT /api/review` verifies the ticket, uploaded size and v2 scene schema, then creates the small immutable server manifest at `review-v2/manifests/<id>.json`. Server creation time starts the fixed **120-hour** lifetime. The manifest contains ID, version, creation/expiration times and exact payload paths. Retries do not extend expiration. The returned viewer URL uses `/share?review=<id>`.

`GET /api/review/<id>` returns an uncached status and public payload URL while active, HTTP 410 after expiration, and HTTP 404 when the manifest is absent. Viewer displays **This share link has expired** or **Share project not found** respectively. An open viewer has an expiration timer and rechecks status when the tab becomes visible. Server time determines the initial timer interval.

### Cleanup and activation

`vercel.json` schedules `/api/cron/reviews` once daily at 03:17 UTC (daily frequency suitable for Hobby). It takes effect only when this source is deployed. Configure a strong `CRON_SECRET` in Vercel before activating the deployment; Vercel sends it as `Authorization: Bearer ...`. A missing or incorrect secret fails closed with 401. Even with a valid secret, cleanup returns 403 unless VERCEL_ENV is production; Preview and development cannot run deletion. VERCEL_ENV is supplied by Vercel, not a new custom variable. Keep the existing `BLOB_READ_WRITE_TOKEN` binding. No deployed settings or storage are changed by local tests/builds.

The job paginates only the new prefixes. It validates each manifest and exact project-owned paths before deleting expired payloads. Active projects, malformed manifests, old `previews/` files and unrelated files are not deleted. Per-project failures are isolated and reported as counts, without logging artwork or credentials. A failed payload deletion leaves its manifest and paths for the next run. Missing payload deletion is idempotent.

The tiny manifest itself serves as the expiration marker, containing no artwork or scene settings. It is retained until **expiresAt + 7 days**, then deleted only after all payload deletions have succeeded. If cleanup is delayed past that date, payload and marker can be deleted in the same successful run. Unfinalized payloads older than 24 hours are removed only when no manifest exists; their ten-minute creation tickets have already expired. A manifest read failure does not authorize orphan deletion.

Physical deletion happens at the next successful daily run, not at the exact access deadline. At high volumes, monitor runtime and failures: a function timeout interrupts the scan, and another successful run is needed. The job performs no editor operations and cannot remove browser-local images/settings.

### Public storage limitations and legacy links

The viewer blocks access at expiration, but a direct public Blob URL may remain accessible until physical cleanup, and previously cached or downloaded copies cannot be revoked. The short cache lifetime reduces cache persistence; it does not provide confidentiality. The API's status is always `no-store`.

Existing `/share?id=...` v1 snapshots, their public `previews/` files, the legacy creation API and bounded self-contained fragment links remain supported. They do not acquire an expiration and are outside the cleanup prefixes. No migration or deletion of old files is performed.

### Validation

Run `npm test` and `npm run build`. New tests cover v2 schema limits, signed upload tickets, exact expiration boundaries, marker retention, deletion retry safety, path isolation, viewer API statuses, Cron authentication and pagination. Browser smoke checks should include desktop/mobile variant switching, unchanged camera/Canvas, common label dimensions, cancellation/removal, WebM export, new/legacy viewers, and open-tab expiration. Cloud Blob upload/cleanup should be verified in an isolated test prefix before production activation; local mocked tests do not prove the deployed store binding or Cron configuration.

Manual Preview review, environment setup and an isolated deletion-test procedure are documented in [docs/manual-testing.md](docs/manual-testing.md). Do not run real cleanup against the production store during PR review.
