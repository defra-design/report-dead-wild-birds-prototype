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

## The journey

| Page | URL |
|---|---|
| Start page | `/` |
| Is the bird dead? | `/dead` |
| Is the bird still at the location? | `/still-there` |
| When did you first see the bird? | `/date-seen` |
| Which country? | `/country` |
| How many dead birds? | `/how-many` |
| What type of bird? | `/species` |
| Where is the bird? (map pin) | `/location` |
| Add a photo | `/photo` |
| Can the bird be reached safely? | `/reachable` |
| Is it on private land? | `/private-land` |
| What condition is it in? | `/condition` |
| Your details | `/contact` |
| Check your answers | `/check` |
| Outcome | `/outcome` |

Two screening questions send people to guidance instead of continuing:

- answering "sick or injured" on `/dead` goes to `/sick-or-injured`
- answering "no" on `/still-there` goes to `/bird-has-gone`

`/start-again` clears the answers and returns to the start.

## How it is put together

```
app/
  lib/decision.js     Collection decision engine and thresholds
  lib/journey.js      Page order, validation and branching
  routes.js           Wires the journey to pages; runs the decision at the end
  filters.js          speciesLabel and yesNo filters for use in views
  views/              One view per page, named after its URL
    layouts/main.html      Phase banner, back link, debug panel
    layouts/question.html  Two-thirds column and error summary
    includes/debug-panel.html
  assets/sass/application.scss       Map and debug panel styles
  assets/javascripts/application.js  Map pin, photo name, debug panel toggle
```

Most pages need no code. The journey is data: to change the order of questions,
edit `STEPS` in `app/lib/journey.js`.

### Changing the collection rules

All the collection logic lives in `app/lib/decision.js`.

A bird is **not** collected if any of these is true:

- it is no longer at the location
- it was first seen more than 48 hours ago (too late to test)
- it cannot be reached safely from the ground
- the carcass is decomposed

Otherwise it is collected when the report meets the **threshold** for that type of
bird. Two overrides make a report a **priority** even below the threshold:

- **high-risk species** — swan, goose, duck, gull or seabird, bird of prey, grebe
- **mass mortality** — more than 5 birds reported together

To change a threshold, edit the `SPECIES` object:

```js
const SPECIES = {
  swan: { label: 'Swan', threshold: 1 },
  'garden-bird': { label: 'Small garden bird ...', threshold: 3 },
  ...
}
```

To make a species high risk, add its key to `HIGH_RISK_SPECIES`. The species keys
must match the radio values in `app/views/species.html`.

### Adding a new question

1. Add its id to `STEPS` in `app/lib/journey.js`, in the position you want it
2. Add a validator with the same id to `VALIDATORS`
3. Create `app/views/<id>.html` extending `layouts/question.html`

The route is created automatically.

## Debug panel

Every page shows a panel with the live session data, how each collection rule
currently evaluates, and the threshold configuration, so it is clear why the
service reached a given outcome while walking the journey.

Toggle it with the **Debug** button, or hide it for a session with `?debug=off`
(`?debug=on` brings it back). It is built from `explain()` in `app/lib/decision.js`.

## Known prototype shortcuts

These would need real implementations before public testing:

- **The map is a stand-in.** It behaves like a map for testing the journey but
  draws a pattern rather than real tiles. Replace with an Ordnance Survey map.
- **Photos are not stored.** Only the file name is recorded.
- **No duplicate detection or no-collect zones.** Both need back-end lookups.
- **Thresholds do not vary by country** yet, although the country is captured.

## Scope

This prototype covers the public-facing reporting journey. Case management and
back-office handling are a separate system and not part of this prototype.
