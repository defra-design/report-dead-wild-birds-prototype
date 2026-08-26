//
// Journey definition for v5.
//
// Content comes from the content design doc; the page order is the team's:
//
//   1  start
//   2  are-you-reporting-a-dead-bird   (screener: "No, sick/injured" -> guidance)
//   3  location              (country is derived from this, so it is not asked)
//   4  bird-type-and-number  (a number for each bird type; checked against thresholds)
//   5  date-seen             (captured only; does not affect triage)
//   6  accessible            ("No" -> straight to the end page, cannot collect)
//   7  condition             (good/mixed collect; "decomposed" -> end page)
//   8  photo
//   9  location-details      (any other information)
//   10 contact
//   11 check
//   12 outcome (end page)
//
// This is a scaffold: validation is light and the collection thresholds in
// decision.js are placeholders, to be detailed page by page.
//

const STEPS = [
  'are-you-reporting-a-dead-bird',
  'location',
  'bird-type-and-number',
  'date-seen',
  'accessible',
  'condition',
  'photo',
  'location-details',
  'contact',
  'check'
]

// Bird types that have a "how many" number field on the bird-type-and-number
// page. The gulls/seabirds/waders group is handled separately (see validator).
const COUNT_KEYS = [
  'bird-of-prey', 'corvid', 'duck', 'gamebird', 'goose',
  'gull', 'seabird', 'wader',
  'heron-egret', 'pigeon-dove', 'rail-crake', 'songbird-garden', 'swan', 'other'
]

function isBlank (value) {
  return value === undefined || value === null || String(value).trim() === ''
}

const VALIDATORS = {
  'are-you-reporting-a-dead-bird': function (body, data) {
    if (isBlank(body.reportingDead)) return [{ field: 'reportingDead', message: 'Select yes if you are reporting a dead bird' }]
    data.reportingDead = body.reportingDead
    return []
  },

  'bird-type-and-number': function (body, data) {
    const errors = []

    // A number for each bird type. Blank counts as 0.
    const counts = {}
    let total = 0
    COUNT_KEYS.forEach(function (key) {
      const raw = body['count-' + key]
      const n = parseInt(raw, 10)
      counts[key] = (isNaN(n) || n < 0) ? 0 : n
      total += counts[key]
    })

    // Gulls, seabirds and waders group: either give numbers (captured above) or
    // record that the reporter is not sure which they found.
    data.gullsChoice = body.gullsChoice || ''
    if (data.gullsChoice === 'unknown') {
      counts['gull-seabird-wader-unknown'] = 1
      total += 1
      // The "give numbers" fields are not relevant if they are not sure.
      counts.gull = 0; counts.seabird = 0; counts.wader = 0
    }

    data.counts = counts

    if (total === 0) {
      errors.push({ field: 'count-bird-of-prey', message: 'Enter how many dead wild birds you found' })
    }

    return errors
  },

  'date-seen': function (body, data) {
    // Captured for information only. It does not affect the collection decision.
    const d = body['date-day']; const m = body['date-month']; const y = body['date-year']
    if (isBlank(d) && isBlank(m) && isBlank(y)) {
      return [{ field: 'date-seen', message: 'Enter the date you saw the bird' }]
    }
    const day = parseInt(d, 10); const month = parseInt(m, 10); const year = parseInt(y, 10)
    if (!day || !month || !year || month < 1 || month > 12 || day < 1 || day > 31) {
      return [{ field: 'date-seen', message: 'Enter a real date' }]
    }
    data.dateSeen = { day: day, month: month, year: year }
    return []
  },

  accessible: function (body, data) {
    if (isBlank(body.accessible)) return [{ field: 'accessible', message: 'Select whether the bird can be reached safely' }]
    data.accessible = body.accessible
    return []
  },

  condition: function (body, data) {
    if (isBlank(body.condition)) return [{ field: 'condition', message: 'Select a description of the dead wild birds' }]
    data.condition = body.condition
    return []
  },

  location: function (body, data) {
    if (isBlank(body.locationMethod)) return [{ field: 'locationMethod', message: 'Choose how you want to give the location' }]
    data.location = {
      method: body.locationMethod,
      map: (body.lat && body.lng) ? (body.lat + ', ' + body.lng) : '',
      postcode: (body.postcode || '').trim(),
      what3words: (body.what3words || '').trim(),
      description: (body.locationDescription || '').trim()
    }
    return []
  },

  photo: function (body, data) {
    // Optional in the scaffold.
    data.photo = body.photoName ? body.photoName : null
    return []
  },

  'location-details': function (body, data) {
    // Optional free text.
    data.locationDetails = (body.locationDetails || '').trim()
    return []
  },

  contact: function (body, data) {
    const errors = []
    if (isBlank(body.name)) errors.push({ field: 'name', message: 'Enter your name' })
    else data.name = body.name.trim()

    if (isBlank(body.phone)) errors.push({ field: 'phone', message: 'Enter a telephone number' })
    else data.phone = body.phone.trim()

    // Email is optional per the doc.
    data.email = (body.email || '').trim()
    return errors
  }
}

//
// Next page. Screeners and early exits:
//   - a bird that is not dead        -> sick or injured guidance
//   - Northern Ireland               -> guidance (service does not cover NI)
//   - bird cannot be reached safely  -> straight to the end page (cannot collect)
//   - decomposed                     -> straight to the end page (cannot test)
//   - check                          -> end page (final submit)
//
function nextStep (currentStep, data) {
  if (currentStep === 'are-you-reporting-a-dead-bird' && data.reportingDead === 'no') return 'sick-or-injured'
  if (currentStep === 'accessible' && data.accessible === 'no') return 'outcome'
  if (currentStep === 'condition' && data.condition === 'decomposed') return 'outcome'
  if (currentStep === 'check') return 'outcome'
  return STEPS[STEPS.indexOf(currentStep) + 1]
}

module.exports = {
  STEPS: STEPS,
  VALIDATORS: VALIDATORS,
  nextStep: nextStep
}
