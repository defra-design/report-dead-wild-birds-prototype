//
// Collection decision engine for the Report a Dead Wild Bird service.
//
// This is the single place where "will this bird be collected?" is decided, and
// the single place where collection thresholds are configured.
//
// A bird is not collected unless it passes all of these:
//
//   - Bird still present  : if it has gone there is nothing to collect
//   - Reachable           : collectors work on foot, with no boats or ladders
//   - Not decomposed      : decomposed carcasses cannot be tested
//   - Meets threshold     : enough birds of that species to be of interest
//
// When the bird was first seen is recorded, but does not affect this decision.
//
// Two overrides promote a report to priority even when the count threshold is
// not met: high-risk species, and mass mortality events.
//

// Species that are always of interest for avian influenza surveillance. These
// are collected whenever the carcass is still viable, however many were found.
const HIGH_RISK_SPECIES = [
  'swan',
  'goose', // includes pink-footed goose
  'duck',
  'gull-seabird',
  'bird-of-prey',
  'grebe'
]

// Collection thresholds: how many birds of this type must be found together
// before a collection is worthwhile. Change these values to respond to an
// outbreak or a policy change - nothing else needs to change.
const SPECIES = {
  swan: { label: 'Swan', threshold: 1 },
  goose: { label: 'Goose (including pink-footed goose)', threshold: 1 },
  duck: { label: 'Duck', threshold: 1 },
  'gull-seabird': { label: 'Gull or other seabird', threshold: 1 },
  'bird-of-prey': { label: 'Bird of prey (for example buzzard, owl)', threshold: 1 },
  grebe: { label: 'Grebe', threshold: 1 },
  corvid: { label: 'Crow, rook, magpie or other corvid', threshold: 3 },
  pigeon: { label: 'Pigeon or dove', threshold: 3 },
  'garden-bird': { label: 'Small garden bird (for example blackbird, finch)', threshold: 3 },
  other: { label: 'Another type of bird', threshold: 3 },
  unknown: { label: 'I do not know', threshold: 3 }
}

// Reports of more than this many birds are treated as a mass mortality event.
const MASS_MORTALITY_THRESHOLD = 5

// Default threshold used when a species is not in the list above.
const DEFAULT_THRESHOLD = 3

// The answers that must all be present before an outcome can be decided.
const GATING_ANSWERS = ['stillThere', 'reachable', 'condition', 'species', 'count']

function speciesLabel (key) {
  return (SPECIES[key] && SPECIES[key].label) || 'Not provided'
}

function thresholdFor (species) {
  return SPECIES[species] ? SPECIES[species].threshold : DEFAULT_THRESHOLD
}

function isHighRisk (species) {
  return HIGH_RISK_SPECIES.indexOf(species) !== -1
}

// "How many birds" is captured as a band. Use the lower bound of the band for
// threshold comparisons.
function countValue (data) {
  switch (data.count) {
    case '1': return 1
    case '2-5': return 2
    case 'more-than-5': return 6
    default: return 0
  }
}

function outcome (collect, priority, reasons) {
  let summary = 'We will not be collecting this bird'
  if (collect) {
    summary = priority ? 'This report is a priority for collection' : 'We may collect this bird'
  }
  return { collect, priority, reasons, summary }
}

//
// Decide the outcome of a report.
// Returns { collect, priority, reasons, summary }
//
function decide (data) {
  const reasons = []

  // Screen-outs, checked first and in order.
  if (data.stillThere === 'no') {
    reasons.push('You told us the bird is no longer at the location, so there is nothing for us to collect.')
    return outcome(false, false, reasons)
  }

  if (data.reachable === 'no') {
    reasons.push('You told us the bird cannot be reached safely from the ground. Our collectors do not use boats, ladders or other specialist equipment.')
    return outcome(false, false, reasons)
  }

  if (data.condition === 'decomposed') {
    reasons.push('You told us the carcass is decomposed, so it is not suitable for avian influenza testing.')
    return outcome(false, false, reasons)
  }

  // Priority overrides for viable birds of high surveillance value.
  if (data.count === 'more-than-5') {
    reasons.push('You reported more than ' + MASS_MORTALITY_THRESHOLD + ' dead birds. Larger mortality events are a priority for disease surveillance.')
    return outcome(true, true, reasons)
  }

  if (isHighRisk(data.species)) {
    reasons.push(speciesLabel(data.species) + ' is a higher-risk species for avian influenza, so we prioritise collecting it for testing.')
    return outcome(true, true, reasons)
  }

  // Standard threshold check.
  const threshold = thresholdFor(data.species)
  if (countValue(data) >= threshold) {
    reasons.push('This report meets the current collection threshold for testing.')
    return outcome(true, false, reasons)
  }

  reasons.push('This type of bird is only collected when ' + threshold + ' or more are found together. Your report still helps us monitor the health of wild birds.')
  return outcome(false, false, reasons)
}

//
// Live explanation of every rule, used by the debug panel.
// Unlike decide(), this never stops at the first failure - it reports the state
// of all rules so a designer can watch the logic resolve while filling the form.
// Each status is one of: pass, fail, pending, info.
//
function explain (data) {
  const count = countValue(data)
  const highRisk = isHighRisk(data.species)
  const massMortality = data.count === 'more-than-5'
  const threshold = data.species ? thresholdFor(data.species) : null

  // A gate passes when it has been answered and the answer is not the failing one.
  function gate (answer, failingValue) {
    if (!answer) return 'pending'
    return answer === failingValue ? 'fail' : 'pass'
  }

  const checks = [
    {
      rule: 'Bird still present',
      detail: 'stillThere !== "no"',
      value: data.stillThere || '—',
      status: gate(data.stillThere, 'no')
    },
    {
      rule: 'Reachable from ground',
      detail: 'reachable !== "no"',
      value: data.reachable || '—',
      status: gate(data.reachable, 'no')
    },
    {
      rule: 'Carcass not decomposed',
      detail: 'condition !== "decomposed"',
      value: data.condition || '—',
      status: gate(data.condition, 'decomposed')
    },
    {
      rule: 'Mass mortality override (> ' + MASS_MORTALITY_THRESHOLD + ')',
      detail: 'count === "more-than-5" → priority',
      value: data.count || '—',
      status: !data.count ? 'pending' : (massMortality ? 'pass' : 'info')
    },
    {
      rule: 'High-risk species override',
      detail: 'species in HIGH_RISK_SPECIES → priority',
      value: data.species ? (highRisk ? 'yes — high risk' : 'no') : '—',
      status: !data.species ? 'pending' : (highRisk ? 'pass' : 'info')
    },
    {
      rule: 'Meets count threshold',
      detail: threshold ? 'count (' + count + ') >= threshold (' + threshold + ')' : 'needs species + count',
      value: (data.species && data.count) ? count + ' vs ' + threshold : '—',
      status: (!data.species || !data.count) ? 'pending' : (count >= threshold ? 'pass' : 'fail')
    }
  ]

  // Only show a verdict once every gating answer exists, so a partly completed
  // form does not display a misleading "will not collect".
  const complete = GATING_ANSWERS.every(function (key) {
    return data[key] !== undefined && data[key] !== null && data[key] !== ''
  })

  return {
    checks: checks,
    complete: complete,
    verdict: complete ? decide(data) : null,
    threshold: threshold,
    highRisk: highRisk,
    massMortality: massMortality,
    countValue: count,
    species: SPECIES,
    highRiskList: HIGH_RISK_SPECIES,
    massMortalityThreshold: MASS_MORTALITY_THRESHOLD
  }
}

module.exports = {
  decide: decide,
  explain: explain,
  speciesLabel: speciesLabel,
  thresholdFor: thresholdFor,
  isHighRisk: isHighRisk,
  SPECIES: SPECIES,
  HIGH_RISK_SPECIES: HIGH_RISK_SPECIES,
  MASS_MORTALITY_THRESHOLD: MASS_MORTALITY_THRESHOLD
}
