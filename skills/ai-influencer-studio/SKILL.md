# AI Influencer Studio

## Purpose

Run a persistent virtual creator as one PredictLM capability inside Chat: identity, image/video generation, voice, copy, editing, publishing manifests, analytics and iteration.

The default campaign profile is **Vesper Noire**, a fictional adult (23+) luxury-goth creator. The reference photo supplied by a user may define aesthetic cues, but the system must not silently turn an unrelated real person into the identity of the virtual creator.

## Core contract

1. Keep one stable persona across posts.
2. Use the media continuity ledger and user-supplied reference images when available.
3. Preserve face geometry, hair silhouette, makeup language and signature accessories before varying pose/scene/outfit.
4. Use 4:5 for feed portraits and 9:16 for Reels/Stories unless the user requests another layout.
5. Treat voice as synthetic/authorized. GPT-SoVITS and VibeVoice are optional voice-production references, not permission to clone a real person's voice.
6. Mark realistic AI-generated media when required by the destination platform.
7. Generate platform-ready captions with Humanizer-style cleanup: specific, short, natural, no generic AI filler.
8. Use JEV routing/compaction to preserve exact identity/campaign anchors while removing stale campaign history.
9. Never claim a post was published unless a real publisher adapter confirmed it.
10. Growth is legitimate and organic: relevant comments, collaborations, remixable formats, trend participation, search/hashtags and cross-posting. Do not run mass comment spam, fake engagement or deceptive impersonation.
11. Keep the user's full brief available if generation is interrupted. The Chat send and stop controls are separate; stopping restores the submitted text to the composer for retry or editing.

## Default visual lock

- adult fictional woman, 23+
- long glossy black hair
- straight blunt bangs
- porcelain/cool editorial makeup
- precise black eyeliner
- soft rose or muted wine lip
- black couture layers
- silver chains/hardware
- layered choker
- occasional black-and-white striped accent
- premium dark editorial lighting

The face remains the same across campaigns. A style reference guides aesthetics; it does not authorize exact identity replication.

## Production loop

```
brief/reference
 -> persona lock
 -> content pillar + hook
 -> image/video generation
 -> semantic/identity review
 -> optional upscale/stylize
 -> synthetic voice + captions
 -> OpenCut/capcut-cli-compatible edit plan
 -> publishing manifest
 -> analytics
 -> next-content adaptation
```

## Voice

Preferred hierarchy:

- synthetic VibeVoice-style voice for original persona speech;
- GPT-SoVITS only with a synthetic/owned/authorized reference voice;
- generic browser/server TTS fallback.

Never clone a celebrity, stranger or other uninvolved person's voice.

## Video/editing

OpenCut and capcut-cli are trusted automation references for editable timelines, captions and 9:16 assembly. Unofficial or bypass-oriented "CapCut Pro" packages are not production dependencies. The publish click may be automated only through an authorized social publisher.

## Comment/outreach policy

Allowed: specific comments that add value to a relevant post, replies to people who engage with the creator, collab outreach, remixes, challenges and creator-to-creator conversation.

Not allowed: mass automated comments, repeated copy-paste promotion, fake testimonials, hidden bot swarms, purchased engagement or pretending the virtual creator is a real human.

## Runtime

- `src/lib/social/influencer-studio.ts`
- `src/app/api/social/influencer/route.ts`
- `src/app/api/social/publish/route.ts`
- media pipeline under `src/app/api/media/*`
- JEV policy under `src/lib/jev-policy.ts`
