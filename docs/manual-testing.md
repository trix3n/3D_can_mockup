# Multi-Label Review: manual review and release notes

## Preview review

Use the Vercel **Preview** deployment of `feature/multi-label-review`, not the production domain. Existing Vercel Deployment Protection may require your Vercel login; this is separate from the app's account-free Share viewer. No protection settings are changed by this PR.

1. Upload different PNG files in Variant A, B and C. Apply each layout. Cancel an edit and confirm the previous layout survives.
2. Pause automatic rotation. Orbit/pan/zoom the can; change background and lighting. Switch A/B/C and confirm only the artwork changes, without resetting the view. Repeat on a phone using touch.
3. Change label height or distance from bottom: these dimensions are common to all variants. Artwork placement is individual. Remove and replace a variant; check the remaining variants still work. Check the original single-label workflow.
4. Record the active variant at 720p and 1080p. Switching must be disabled during recording. Play the WebM, then save/download it. A hardware-accelerated normal browser is needed for meaningful video validation; the test environment's software WebGL also produced empty recordings on unchanged main.
5. Click Share. Open the result in a fresh browser session and switch all saved variants. Close the creator's editor: the viewer must still work. Later studio edits must not change the snapshot.
6. Try an invalid PNG or a source larger than 25 MiB. Try a complete Share JSON exceeding 22,000,000 bytes. Errors must preserve the current artwork. PNG dimensions are additionally bounded to 32 megapixels and 16384 pixels per side.
7. Open an existing old Share URL on the Preview host (preserve its `?id=...` or fragment). Confirm it remains readable. A random valid UUID in `?review=...` should show `Share project not found`.
8. New shares expire after 120 hours. At expiry the viewer, including an already open tab, must show `This share link has expired`. Do not shorten production retention or edit production manifests for testing; use the isolated procedure below.

Clicking Share writes new files. If Preview and Production use the same Blob binding, test shares go into that same store under `review-v2/`. They do not overwrite old `previews/` files. Studio-only checks do not upload artwork.

## Environment and Vercel settings

- Existing `BLOB_READ_WRITE_TOKEN`: required for Share. No new Blob service or database is required. For fully isolated testing, use a separate test Blob store and bind its token to the test environment only, after approval.
- New `CRON_SECRET`: a strong server-only secret, needed in **Production** before cleanup is activated. Do not prefix it with `NEXT_PUBLIC_` or copy it into Preview. It is not required to test Studio or Share in Preview.
- `VERCEL_ENV`: supplied automatically by Vercel. Cleanup requires the exact value `production`; do not manually override it in Preview.
- `vercel.json` declares one daily job, `/api/cron/reviews`, at `17 3 * * *` UTC. Vercel Cron schedules run on Production deployments. The daily interval is compatible with Hobby; execution time has hour-level precision on Hobby and normal function/usage limits apply.
- Publishing the feature branch must not change the Production Branch (`main`), merge the PR, promote Preview, or trigger a manual Production deployment.

## Preview deletion protection

The route authenticates with CRON_SECRET and then rejects non-production environments with HTTP 403 **before accessing Blob**. With no secret or the wrong secret it returns 401. Automated tests check that a valid secret on Preview cannot list or delete files. Do not call the Production cleanup endpoint during review.

Shared credentials still give Preview Share write access to the common store. The cleanup guard prevents this route from deleting from Preview; a separate store is required for storage-level isolation. A future Production cleanup may remove expired test shares in the common `review-v2/` prefix. It never scans old `previews/`.

## Real deletion test: requires separate approval

Do not run this against the existing production store. No real cleanup is performed as part of this PR.

1. Provision a separate disposable public Blob store after approval. Run a local copy with only that store's BLOB_READ_WRITE_TOKEN, a test CRON_SECRET, and VERCEL_ENV=production for this isolated local process. Do not change the live Vercel project's environment settings or disable the Preview guard.
2. Seed synthetic projects with valid UUIDs and manifests: one active; one whose createdAt is 121 hours ago; one whose expiry was more than 7 days ago. Always set expiresAt = createdAt + 120 hours. Each manifest must reference only its exact `review-v2/payloads/<id>.json` path.
3. Also seed a harmless legacy `previews/` fixture and an unrelated fixture. Keep a list of their exact paths and contents before the run.
4. Check Viewer/API statuses before deletion: active 200, expired 410. Invoke the **local** Cron endpoint with the test Authorization bearer header.
5. Confirm the active, legacy and unrelated fixtures are unchanged. The recently expired payload must be gone but its manifest retained. The older payload and marker must both be gone; its Viewer now returns 404.
6. Run cleanup again: it must remain safe. Simulate a deletion failure using mocked storage tests; the manifest must remain until remaining files are successfully removed. Do not introduce artificial failures in the live store.
7. Dispose of only the dedicated test store/fixtures after approval. Do not use production credentials for this procedure.

Public payload URLs can remain accessible until physical deletion and previously cached/downloaded copies cannot be revoked. The status API is no-store; new Blob objects use a short cache lifetime. Physical deletion waits for the next successful daily run. Monitor failures and scan duration before increasing usage.
