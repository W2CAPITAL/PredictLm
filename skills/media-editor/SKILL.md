# Imagine Media Editor

Post-generation editing stays inside Imagine and defaults to browser-local processing.

Capabilities:
- ordered image and video clips;
- trim, duration and speed;
- cover or contain composition;
- cut and fade transitions;
- basic visual filters;
- natural caption overlay;
- WebM export with MediaRecorder;
- JSON project export and import for resumable edits;
- per-video volume and best-effort source-audio preservation when the browser exposes an audio track.

Reference projects:
- OpenCut (MIT): editor, timeline, plugin and headless architecture;
- capcut-mate (Apache-2.0): generic timeline, keyframe and caption schema patterns;
- capcut-cli (MIT): generic draft, timeline and export patterns;
- openreel-video (MIT): inspector and export architecture;
- ArcReel (AGPL-3.0): concepts only unless a separately reviewed compatible integration is chosen;
- blader/humanizer (MIT): natural caption and copy-quality patterns.

The editor must remain useful without paid APIs. External renderers are optional adapters; the default edit and WebM path runs in the browser.
