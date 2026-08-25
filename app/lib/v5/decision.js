//
// Outcome logic for v5.
//
// The end page shows one of two outcomes:
//   - collect (WSF): the bird may be collected for testing
//   - do not collect (REP): report only
//
// A report is collected only when:
//   - the bird can be reached safely (accessible), AND
//   - the condition is good or mixed (not decomposed), AND
//   - the number of that species meets the collection threshold
//
// The thresholds below are PLACEHOLDERS to be replaced with the real surveillance
// collection thresholds. Change them in one place here.
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

function speciesLabel (key) {
  return (SPECIES[key] && SPECIES[key].label) || 'Not provided'
}

function thresholdFor (species) {
  return SPECIES[species] ? SPECIES[species].threshold : DEFAULT_THRESHOLD
}

function countValue (data) {
  const n = parseInt(data.count, 10)
  return isNaN(n) ? 0 : n
}

function outcome (collect, reason, summary) {
  return { collect: collect, reason: reason, summary: summary }
}

//
// Decide the outcome. Returns { collect, reason, summary }.
//
function decide (data) {
  if (data.accessible === 'no') {
    return outcome(false, 'not-accessible', 'We are not able to collect this bird')
  }
  if (data.condition === 'decomposed') {
    return outcome(false, 'decomposed', 'We do not need to collect this bird')
  }

  const threshold = thresholdFor(data.species)
  if (countValue(data) >= threshold) {
    return outcome(true, 'threshold-met', 'We may collect this bird for testing')
  }
  return outcome(false, 'below-threshold', 'We do not need to collect this bird')
}

//
// Live explanation for the debug panel.
//
function explain (data) {
  const threshold = data.species ? thresholdFor(data.species) : null
  const count = countValue(data)

  function gate (answer, failingValue) {
    if (!answer) return 'pending'
    return answer === failingValue ? 'fail' : 'pass'
  }

  const checks = [
    { rule: 'Accessible', detail: 'accessible !== "no"', value: data.accessible || '—', status: gate(data.accessible, 'no') },
    { rule: 'Not decomposed', detail: 'condition !== "decomposed"', value: data.condition || '—', status: gate(data.condition, 'decomposed') },
    {
      rule: 'Meets threshold',
      detail: threshold ? ('count (' + count + ') >= threshold (' + threshold + ')') : 'needs species + count',
      value: (data.species && data.count) ? (count + ' vs ' + threshold) : '—',
      status: (!data.species || data.count === undefined) ? 'pending' : (count >= threshold ? 'pass' : 'fail')
    }
  ]

  const complete = ['accessible', 'condition', 'species'].every(function (k) {
    return data[k] !== undefined && data[k] !== null && data[k] !== ''
  }) && data.count !== undefined

  return {
    checks: checks,
    complete: complete,
    verdict: complete ? { collect: decide(data).collect, summary: decide(data).summary, priority: false } : null,
    species: SPECIES,
    highRiskList: [],
    massMortalityThreshold: null,
    countValue: count,
    threshold: threshold,
    highRisk: false,
    massMortality: false
  }
}

module.exports = {
  decide: decide,
  explain: explain,
  speciesLabel: speciesLabel,
  thresholdFor: thresholdFor,
  SPECIES: SPECIES
}
