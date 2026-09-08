//
// Outcome logic for v5.
//
// The end page shows one of two outcomes:
//   - collect (WSF): the bird may be collected for testing
//   - do not collect (REP): report only
//
// A report is collected when EITHER:
//   - it is a mass mortality (the total number of birds across all species
//     meets the mass mortality threshold) — this overrides condition and
//     reachability, OR
//   - the bird can be reached safely (accessible), AND
//     the condition is good or mixed (not decomposed), AND
//     the number of that species meets its own collection threshold
//
// Change the thresholds in one place below.
//

// Species options from the doc (type of bird). key -> { label, hint, threshold }.
const SPECIES = {
  'bird-of-prey': { label: 'Birds of prey', hint: 'Such as owls, hawks or buzzards.', threshold: 1 },
  corvid: { label: 'Corvids', hint: 'Such as crows, ravens, rooks, magpies, jackdaws and jays.', threshold: 3 },
  duck: { label: 'Ducks', threshold: 1 },
  gamebird: { label: 'Gamebirds', hint: 'Such as pheasants, partridges and grouse.', threshold: 3 },
  goose: { label: 'Geese', threshold: 1 },
  gull: { label: 'Gulls', hint: 'Includes all gulls and kittiwakes.', threshold: 1 },
  seabird: { label: 'Seabirds', hint: 'Such as puffins, gannets, guillemots and cormorants.', threshold: 1 },
  wader: { label: 'Waders', hint: 'Such as avocets, curlews, oystercatchers and plovers.', threshold: 1 },
  'gull-seabird-wader-unknown': { label: 'Unknown gulls, seabirds and waders', threshold: 1 },
  'heron-egret': { label: 'Herons and egrets', hint: 'Includes cranes, bitterns, spoonbills and storks.', threshold: 1 },
  'pigeon-dove': { label: 'Pigeons and doves', threshold: 3 },
  'rail-crake': { label: 'Rails and crakes', hint: 'Such as moorhens and coots.', threshold: 3 },
  'songbird-garden': { label: 'Songbirds and garden birds', hint: 'Such as sparrows, tits, blackbirds, finches, starlings and robins.', threshold: 3 },
  swan: { label: 'Swans', threshold: 1 },
  other: { label: 'Other wild birds', threshold: 3 },
  unknown: { label: 'I\'m not sure', threshold: 3 }
}

const DEFAULT_THRESHOLD = 3

// A mass mortality is 5 or more dead wild birds in total, across all species.
// It overrides the condition and reachability gates (see decide()).
const MASS_MORTALITY_THRESHOLD = 5

// A bird seen more than this many days ago is too old to be useful for testing.
const MAX_AGE_DAYS = 4

function speciesLabel (key) {
  return (SPECIES[key] && SPECIES[key].label) || 'Not provided'
}

function thresholdFor (species) {
  return SPECIES[species] ? SPECIES[species].threshold : DEFAULT_THRESHOLD
}

function totalCount (data) {
  const counts = data.counts || {}
  return Object.keys(counts).reduce(function (sum, k) { return sum + (counts[k] || 0) }, 0)
}

// True if any single bird type meets its own collection threshold.
function meetsThreshold (data) {
  const counts = data.counts || {}
  return Object.keys(counts).some(function (k) {
    return counts[k] >= thresholdFor(k)
  })
}

// True if the total across all species is a mass mortality.
function massMortality (data) {
  return totalCount(data) >= MASS_MORTALITY_THRESHOLD
}

// True if the bird was seen more than MAX_AGE_DAYS calendar days ago.
function tooOld (data) {
  if (!data.dateSeen) return false
  const s = data.dateSeen
  const seen = new Date(s.year, s.month - 1, s.day)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const days = Math.round((today - seen) / 86400000)
  return days > MAX_AGE_DAYS
}

// True if the reporter's location is in Northern Ireland. The prototype sets
// this from a test toggle on the location page; a real service would derive it.
function northernIreland (data) {
  return !!(data.location && data.location.northernIreland)
}

function outcome (collect, reason, summary) {
  return { collect: collect, reason: reason, summary: summary }
}

//
// Decide the outcome. Returns { collect, reason, summary }.
//
function decide (data) {
  // Note: "too old" and "Northern Ireland" are routing exits handled before the
  // outcome page (see journey.nextStep), so they are not decided here.
  // Mass mortality is collected regardless of condition or reachability.
  if (massMortality(data)) {
    return outcome(true, 'mass-mortality', 'We may collect these birds for testing')
  }
  if (data.accessible === 'no') {
    return outcome(false, 'not-accessible', 'We are not able to collect these birds')
  }
  if (data.condition === 'decomposed') {
    return outcome(false, 'decomposed', 'We do not need to collect these birds')
  }
  if (meetsThreshold(data)) {
    return outcome(true, 'threshold-met', 'We may collect these birds for testing')
  }
  return outcome(false, 'below-threshold', 'We do not need to collect these birds')
}

//
// Live explanation for the debug panel.
//
function explain (data) {
  const total = totalCount(data)
  const hasCounts = data.counts && total > 0

  function gate (answer, failingValue) {
    if (!answer) return 'pending'
    return answer === failingValue ? 'fail' : 'pass'
  }

  const isMassMortality = massMortality(data)
  const isTooOld = tooOld(data)
  const isNI = northernIreland(data)

  const checks = [
    { rule: 'Seen 4 days ago or less', detail: 'days since seen <= ' + MAX_AGE_DAYS, value: data.dateSeen ? (isTooOld ? 'too old' : 'ok') : '—', status: !data.dateSeen ? 'pending' : (isTooOld ? 'fail' : 'pass') },
    { rule: 'Not Northern Ireland', detail: 'location not in NI', value: data.location ? (isNI ? 'NI' : 'ok') : '—', status: !data.location ? 'pending' : (isNI ? 'fail' : 'pass') },
    { rule: 'Some birds counted', detail: 'total > 0', value: hasCounts ? total : '—', status: hasCounts ? 'pass' : 'pending' },
    {
      rule: 'Mass mortality (override)',
      detail: 'total >= ' + MASS_MORTALITY_THRESHOLD,
      value: hasCounts ? (isMassMortality ? 'yes' : 'no') : '—',
      status: !hasCounts ? 'pending' : (isMassMortality ? 'pass' : 'fail')
    },
    { rule: 'Accessible', detail: 'accessible !== "no"', value: data.accessible || '—', status: gate(data.accessible, 'no') },
    { rule: 'Not decomposed', detail: 'condition !== "decomposed"', value: data.condition || '—', status: gate(data.condition, 'decomposed') },
    {
      rule: 'A type meets its threshold',
      detail: 'any species count >= its threshold',
      value: hasCounts ? (meetsThreshold(data) ? 'yes' : 'no') : '—',
      status: !hasCounts ? 'pending' : (meetsThreshold(data) ? 'pass' : 'fail')
    }
  ]

  // Some verdicts are reached early: too old (from the date alone) or a mass
  // mortality (from the counts alone). Otherwise the reachability and condition
  // answers are needed too.
  const complete = isTooOld || (hasCounts && (isMassMortality || (data.accessible !== undefined && data.condition !== undefined)))

  // "Too old" routes out before the collection decision, so show it directly.
  let verdict = null
  if (isTooOld) {
    verdict = { collect: false, summary: 'Routed to the ‘too old’ exit — no collection', priority: false }
  } else if (complete) {
    verdict = { collect: decide(data).collect, summary: decide(data).summary, priority: isMassMortality }
  }

  return {
    checks: checks,
    complete: complete,
    verdict: verdict,
    species: SPECIES,
    highRiskList: [],
    massMortalityThreshold: MASS_MORTALITY_THRESHOLD,
    countValue: total,
    threshold: null,
    highRisk: false,
    massMortality: isMassMortality
  }
}

module.exports = {
  decide: decide,
  explain: explain,
  speciesLabel: speciesLabel,
  thresholdFor: thresholdFor,
  massMortality: massMortality,
  meetsThreshold: meetsThreshold,
  tooOld: tooOld,
  northernIreland: northernIreland,
  SPECIES: SPECIES
}
