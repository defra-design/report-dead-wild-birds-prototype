# Report a dead wild bird — prototype

A [GOV.UK Prototype Kit](https://prototype-kit.service.gov.uk/docs/) prototype of the
Report a Dead Wild Bird service (APHA / Defra).

The public use this service to tell APHA about dead wild birds, so APHA can monitor
and test for avian influenza (bird flu). It is a disease monitoring service rather
than a bird collection service: only a small number of reported birds are collected
for testing.

## Running the prototype

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Versions

The prototype holds more than one version of the journey side by side, so the team
can compare them. The home page is a **version picker**; each version runs under its
own path (`/v1`, `/v2`, …) and is completely self-contained.

Older versions are **frozen** — to change the journey, add a new version rather than
editing an existing one, so earlier rounds stay available for comparison.

| Version | Path | Notes |
|---|---|---|
| 4.0 | `/v4` | Usability test B — more start-page guidance, no screening questions. |
| 3.0 | `/v3` | Usability test A — standard guidance plus screening questions. |
| 2.0 | `/v2` | Team feedback round. |
| 1.0 | `/v1` | First build of the reporting journey. |

### v3 and v4 — the usability-test pair

v3 and v4 test how best to make clear that this is a disease-monitoring service,
not a bird-removal service, and whether screening questions are needed. Both are
built on the v2 journey and include the assessment fixes below.

**v3 — guidance + screening.** Standard start-page guidance, then screening
questions that triage out people who do not need the form — starting with an
**intent question** ("report a dead bird to help monitor disease" vs "ask for a
dead bird to be removed"). Choosing removal goes to guidance instead of the form.

**v4 — more guidance, no screening.** A fuller start page that explains what the
service is for and is not for, then straight into the form with no screening.
Tests whether stronger guidance alone sets expectations.

Note: v4 changes two things at once (more guidance and no screening), so it tests
them as a package rather than isolating either.

### Assessment fixes (in v3 and v4)

Aligned to the March 2023 Beta service assessment:

- **Location** takes a **validated postcode** (UK format), and the **what3words**
  field is format-checked — the 2023 assessment found no validation on these
- The **outcome** explains the reporter will only be contacted if needed, and is
  not usually told the test results (the 2023 "will I hear the results?" user need)

Deferred to the production build (see **For the production build** below) rather
than faked in the prototype: unique reference numbers, real address/postcode
lookup, and the privacy / accessibility / cookies footer.

### What changed in v2

- **Country** is the first question, and now includes **Northern Ireland**, which
  signposts to DAERA instead of continuing
- **Species** is asked before **number of birds**
- **When did you first see the bird?** is now a set of recency bands (Today,
  Yesterday, …) instead of a date, and **no longer affects the collection decision**
- **Location** adds an address/postcode field and a free-text details box; a map pin
  or an address is enough
- The **"are you standing next to the bird?"** question has been removed
- **Email or telephone** — at least one is required, not both
- **Check your answers** — changing an answer returns you straight to Check your
  answers instead of walking the rest of the form again
- The **non-collection outcome** uses a neutral blue panel, not the green
  confirmation panel (which is now only used when a bird may be collected)

## How it is put together

```
app/
  routes.js              Version picker, and mounts each version under /<id>
  filters.js             yesNo filter (speciesLabel is provided per version)
  lib/
    versions.js          The list of versions shown in the picker
    v1/journey.js        v1 page order, validation, branching
    v1/decision.js       v1 collection rules and thresholds
    v2/journey.js        v2 …
    v2/decision.js       v2 …
  views/
    index.html           Version picker
    v1/                  One template per page for v1
    v2/                  One template per page for v2
    layouts/main.html      Phase banner, back link, debug panel
    layouts/question.html  Two-thirds column and error summary
    includes/debug-panel.html
  assets/sass/application.scss       Map, debug panel and outcome panel styles
  assets/javascripts/application.js  Map pin, photo name, debug panel toggle
```

Within a version, most pages need no code. The journey is data: to change the order
of questions, edit `STEPS` in that version's `journey.js`. Internal links in the
templates are written as `basePath + "/page"`, where `basePath` is the version's
path — so the same template works under any version.

### Changing the collection rules

All the collection logic for a version lives in its `decision.js`.

A bird is **not** collected if any of these is true:

- it is no longer at the location
- it cannot be reached safely from the ground
- the carcass is decomposed

Otherwise it is collected when the report meets the **threshold** for that type of
bird. Two overrides make a report a **priority** even below the threshold:

- **high-risk species** — swan, goose, duck, gull or seabird, bird of prey, grebe
- **mass mortality** — more than 5 birds reported together

To change a threshold, edit the `SPECIES` object. To make a species high risk, add
its key to `HIGH_RISK_SPECIES`. The keys must match the radio values in the version's
`species.html`.

(v1 also screens out birds first seen more than 48 hours ago; v2 removes that rule.)

### Adding a version

1. `cp -r app/lib/v2 app/lib/v3` and edit the journey/decision
2. `cp -r app/views/v2 app/views/v3` and edit the pages
3. add an entry to the top of the list in `app/lib/versions.js`

## Debug panel

Every journey page shows a panel with the live session data, how each collection
rule currently evaluates, and the threshold configuration, so it is clear why the
service reached a given outcome. Toggle it with the **Debug** button, or hide it for
a session with `?debug=off` (`?debug=on` brings it back).

## Known prototype shortcuts

These would need real implementations before public testing:

- **The map is a stand-in.** It behaves like a map for testing the journey but draws
  a pattern rather than real tiles. Replace with an Ordnance Survey map.
- **Photos and address/postcode are not looked up or stored.** The prototype records
  what was typed only.
- **No duplicate detection or no-collect zones.** Both need back-end lookups.
- **Thresholds do not vary by country** yet, although the country is captured.

## For the production build

Items surfaced by the 2023 service assessment that a front-end prototype cannot
resolve, flagged here so they are picked up when the service is built:

- **Unique reference numbers.** The prototype's reference is a stand-in. The real
  service must generate a guaranteed-unique reference per submission (the 2023
  assessment flagged a risk of the same reference for different reports).
- **Real postcode / address lookup.** v3 validates postcode *format* only; live
  validation against an address service (for example OS Places) is a back-end job.
- **Privacy, accessibility and cookies.** A privacy policy link, an accurate cookie
  policy with an essential-cookies notification, and a corrected accessibility
  statement are needed in the built service (assessment standards 5 and 9).
- **Accessibility audit.** A full WCAG 2.1 AA audit and testing with assistive-tech
  and low-digital users (assessment standard 5).
- **Non-front-end standards.** Service/product owner, security assurance
  (pen test, data-protection sign-off), performance/KPIs, and the tools/hosting
  decision sit outside the prototype (assessment standards 6, 9, 10, 11, 14).

## Scope

This prototype covers the public-facing reporting journey. Case management and
back-office handling are a separate system and not part of this prototype.
