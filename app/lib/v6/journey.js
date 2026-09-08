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

const decision = require('./decision')

const STEPS = [
  'are-you-reporting-a-dead-bird',
  'date-seen',
  'location',
  'bird-type-and-number',
  'accessible',
  'condition',
  'photo',
  'location-details',
  'contact',
  'check'
]

// Bird types that have a "how many" number field on the bird-type-and-number
// page. Gulls, seabirds and waders are three separate counts, plus an "unknown"
// count for reporters who cannot tell which of the three they found.
const COUNT_KEYS = [
  'bird-of-prey', 'corvid', 'duck', 'gamebird', 'goose',
  'gull', 'seabird', 'wader', 'gull-seabird-wader-unknown',
  'heron-egret', 'pigeon-dove', 'rail-crake', 'songbird-garden', 'swan', 'other'
]

function isBlank (value) {
  return value === undefined || value === null || String(value).trim() === ''
}

// Joins the missing date parts for the error message, e.g. ['day','year'] ->
// "day and year", ['month'] -> "month".
function listParts (parts) {
  if (parts.length === 1) return parts[0]
  return parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1]
}

// Light-touch format checks for the prototype (not full validation).
function isValidEmail (value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function isValidPhone (value) {
  // Allow digits, spaces, and the usual separators; needs 8–15 digits.
  const digits = value.replace(/[\s()-]/g, '').replace(/^\+/, '')
  return /^[0-9]{8,15}$/.test(digits)
}

const VALIDATORS = {
  'are-you-reporting-a-dead-bird': function (body, data) {
    if (isBlank(body.reportingDead)) return [{ field: 'reportingDead', message: 'Select the reason for your report.' }]
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

    data.counts = counts

    if (total === 0) {
      errors.push({ field: 'count-bird-of-prey', message: 'Enter the number of birds you found for each species.' })
    }

    return errors
  },

  'date-seen': function (body, data) {
    // Captured for information only. It does not affect the collection decision.
    const d = body['date-day']; const m = body['date-month']; const y = body['date-year']

    // Which of the three boxes are empty. All empty is a different message from
    // one or two empty (which names the missing parts).
    const missing = []
    if (isBlank(d)) missing.push('day')
    if (isBlank(m)) missing.push('month')
    if (isBlank(y)) missing.push('year')
    if (missing.length === 3) {
      return [{ field: 'date-seen', message: 'Enter the date you saw the bird.' }]
    }
    if (missing.length) {
      return [{ field: 'date-seen', message: 'The date you saw the bird must include a ' + listParts(missing) + '.' }]
    }

    const day = parseInt(d, 10); const month = parseInt(m, 10); const year = parseInt(y, 10)
    if (!day || !month || !year || month < 1 || month > 12 || day < 1 || day > 31) {
      return [{ field: 'date-seen', message: 'The date you saw the bird must be a real date.' }]
    }
    // Reject impossible calendar dates, e.g. 31 February.
    const seen = new Date(year, month - 1, day)
    if (seen.getFullYear() !== year || seen.getMonth() !== month - 1 || seen.getDate() !== day) {
      return [{ field: 'date-seen', message: 'The date you saw the bird must be a real date.' }]
    }
    // You cannot have seen the bird in the future. Compare whole days only.
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    if (seen > today) {
      return [{ field: 'date-seen', message: 'The date you saw the bird must be today or in the past.' }]
    }
    data.dateSeen = { day: day, month: month, year: year }
    return []
  },

  accessible: function (body, data) {
    if (isBlank(body.accessible)) return [{ field: 'accessible', message: 'Select if the bird can be reached safely.' }]
    data.accessible = body.accessible
    return []
  },

  condition: function (body, data) {
    if (isBlank(body.condition)) return [{ field: 'condition', message: 'Select the condition of the bird.' }]
    data.condition = body.condition
    return []
  },

  location: function (body, data) {
    const method = body.locationMethod
    if (isBlank(method)) return [{ field: 'locationMethod', message: 'Tell us where you saw the bird.' }]

    // The chosen method must have its detail filled in. (Manual address lines
    // and real postcode/what3words format checks are a later, backend job.)
    if (method === 'map' && (isBlank(body.lat) || isBlank(body.lng))) {
      return [{ field: 'locationMethod', message: 'Select where you saw the bird on the map.' }]
    }
    if (method === 'address' && isBlank(body.postcode)) {
      return [{ field: 'locationMethod', message: 'Enter a full UK postcode' }]
    }
    if (method === 'what3words' && isBlank(body.what3words)) {
      return [{ field: 'locationMethod', message: 'Enter a what3words location.' }]
    }

    const info = (body.locationInfo || '').trim()
    if (info.length > 500) {
      return [{ field: 'locationInfo', message: 'Description must be 500 characters or less.' }]
    }

    data.location = {
      method: method,
      map: (body.lat && body.lng) ? (body.lat + ', ' + body.lng) : '',
      postcode: (body.postcode || '').trim(),
      what3words: (body.what3words || '').trim(),
      info: info,
      // Prototype-only test control: pretend this location is in Northern
      // Ireland so the Northern Ireland exit can be walked through. A real
      // service would derive the country from the location itself.
      northernIreland: body.simulateNI === 'yes'
    }
    return []
  },

  photo: function (body, data) {
    // Optional in the scaffold.
    data.photo = body.photoName ? body.photoName : null
    return []
  },

  'location-details': function (body, data) {
    // Optional free text, but capped at 500 characters.
    const details = (body.locationDetails || '').trim()
    if (details.length > 500) {
      return [{ field: 'locationDetails', message: 'Description must be 500 characters or less.' }]
    }
    data.locationDetails = details
    return []
  },

  contact: function (body, data) {
    const errors = []
    if (isBlank(body.name)) errors.push({ field: 'name', message: 'Name must be provided.' })
    else data.name = body.name.trim()

    const phone = (body.phone || '').trim()
    const email = (body.email || '').trim()

    // At least one contact method is required, but neither is mandatory on its
    // own. When both are blank the requirement belongs to the group, so the
    // error sits on the group (see contact.html) and spans both fields.
    if (!phone && !email) {
      errors.push({ field: 'contact', message: 'Telephone number or email address must be provided.' })
    } else {
      // Whatever was given must be in a sensible format. These are field-level.
      if (email && !isValidEmail(email)) {
        errors.push({ field: 'email', message: 'Enter an email address in the correct format, like name@example.com' })
      }
      if (phone && !isValidPhone(phone)) {
        errors.push({ field: 'phone', message: 'Enter a telephone number, like 01632 960 001, 07700 900 982 or +44 808 157 0192' })
      }
    }
    data.phone = phone
    data.email = email
    return errors
  }
}

//
// Next page. Each gate that means "no collection" sends the reporter straight
// to a contextual end page, in journey order:
//   1. not a dead bird              -> sick or injured guidance          (no ref)
//   2. seen more than 4 days ago    -> too old guidance                  (no ref)
//   3. Northern Ireland             -> Northern Ireland guidance         (no ref)
//   4. below the collection threshold -> below threshold guidance        (no ref)
//   5. cannot be reached safely     -> not reachable guidance            (no ref)
//   6. decomposed                   -> outcome (decomposed)              (REP)
//   - check                         -> outcome (collection, or final verdict)
//
// A mass mortality (5+ birds in total) is collected regardless of reachability
// or condition, so it does not trigger exits 4-6 — it carries on through the
// journey to capture contact and location. It is unknown at exits 2 and 3
// (before the birds are counted), so those two are always final.
//
function nextStep (currentStep, data) {
  if (currentStep === 'are-you-reporting-a-dead-bird' && data.reportingDead === 'no') return 'sick-or-injured'
  if (currentStep === 'date-seen' && decision.tooOld(data)) return 'too-old'
  if (currentStep === 'location' && decision.northernIreland(data)) return 'northern-ireland'

  const isMassMortality = decision.massMortality(data)
  if (currentStep === 'bird-type-and-number' && !isMassMortality && !decision.meetsThreshold(data)) return 'below-threshold'
  if (currentStep === 'accessible' && data.accessible === 'no' && !isMassMortality) return 'not-reachable'
  if (currentStep === 'condition' && data.condition === 'decomposed' && !isMassMortality) return 'outcome'
  if (currentStep === 'check') return 'outcome'
  return STEPS[STEPS.indexOf(currentStep) + 1]
}

module.exports = {
  STEPS: STEPS,
  VALIDATORS: VALIDATORS,
  nextStep: nextStep
}
