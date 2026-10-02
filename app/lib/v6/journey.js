//
// Journey definition for v6.
//
// Content comes from the content design doc; the page order is the team's:
//
//   1  start
//   2  are-you-reporting-a-dead-bird   (screener: "No, sick/injured" -> guidance)
//   3  date-seen             (over 48 hours -> too old guidance)
//   4  location              (choose how to give the location — no reveals)
//   4a location-map / location-address / location-what3words  (one per method;
//                             the nation is derived here; Northern Ireland
//                             -> Northern Ireland guidance)
//   5  bird-type-and-number  (a number for each bird type; checked against thresholds)
//   6  blackbirds            (Scotland songbird follow-up only)
//   7  accessible            ("No" -> straight to the end page, cannot collect)
//   8  condition             (good/mixed collect; "decomposed" -> end page)
//   9  photo
//   10 anything-else         (any other information)
//   11 contact
//   12 check
//   13 outcome (end page)
//
// There is no country question: the nation (used for the Northern Ireland exit
// and the Scotland blackbird rule) is worked out from the location the reporter
// gives — see decision.nationFromLocation.
//

const decision = require('./decision')

const STEPS = [
  'are-you-reporting-a-dead-bird',
  'date-seen',
  'location',
  'location-map',
  'location-address',
  'location-what3words',
  'bird-type-and-number',
  'blackbirds',
  'accessible',
  'condition',
  'photo',
  'anything-else',
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

// The optional "any other information about the location" field, shared by the
// three location method pages (map, address, what3words).
function locationInfoError (body) {
  const info = (body.locationInfo || '').trim()
  if (info.length > 500) {
    return [{ field: 'locationInfo', message: 'Description must be 500 characters or less.' }]
  }
  return []
}

// Build data.location from a method page's fields and work out the nation from
// it (which drives the Northern Ireland exit and the Scotland blackbird rule).
function setLocation (data, method, body) {
  data.location = {
    method: method,
    map: (body.lat && body.lng) ? (body.lat + ', ' + body.lng) : '',
    postcode: (body.postcode || '').trim(),
    addressSelected: (body.addressSelected || '').trim(),
    addressLine1: (body.addressLine1 || '').trim(),
    addressLine2: (body.addressLine2 || '').trim(),
    addressTown: (body.addressTown || '').trim(),
    addressCounty: (body.addressCounty || '').trim(),
    addressPostcode: (body.addressPostcode || '').trim(),
    what3words: (body.what3words || '').trim(),
    info: (body.locationInfo || '').trim()
  }
  data.locationMethod = method
  data.country = decision.nationFromLocation(data.location)
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
      errors.push({ field: 'count-bird-of-prey', message: 'Enter a number for at least one species.' })
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

  // Choose how to give the location. Each method has its own page (below), so
  // this page has no conditional reveals — one thing per page.
  location: function (body, data) {
    if (isBlank(body.locationMethod)) {
      return [{ field: 'locationMethod', message: 'Use one of the options to tell us where you saw the bird.' }]
    }
    data.locationMethod = body.locationMethod
    return []
  },

  'location-map': function (body, data) {
    if (isBlank(body.lat) || isBlank(body.lng)) {
      return [{ field: 'map', message: 'Select where you saw the bird on the map.' }]
    }
    const errors = locationInfoError(body)
    if (errors.length) return errors
    setLocation(data, 'map', body)
    return []
  },

  'location-address': function (body, data) {
    // Address can be given by postcode lookup or by manual address lines.
    if (isBlank(body.postcode) && isBlank(body.addressPostcode)) {
      return [{ field: 'postcode', message: 'Enter a full UK postcode' }]
    }
    const errors = locationInfoError(body)
    if (errors.length) return errors
    setLocation(data, 'address', body)
    return []
  },

  'location-what3words': function (body, data) {
    if (isBlank(body.what3words)) {
      return [{ field: 'what3words', message: 'Enter a what3words location.' }]
    }
    const errors = locationInfoError(body)
    if (errors.length) return errors
    setLocation(data, 'what3words', body)
    return []
  },

  blackbirds: function (body, data) {
    if (isBlank(body.blackbirds)) return [{ field: 'blackbirds', message: 'Select whether any of the dead birds were blackbirds' }]
    data.blackbirds = body.blackbirds
    return []
  },

  photo: function (body, data) {
    // Optional in the scaffold.
    data.photo = body.photoName ? body.photoName : null
    return []
  },

  'anything-else': function (body, data) {
    // Optional free text, but capped at 500 characters.
    const details = (body.anythingElse || '').trim()
    if (details.length > 500) {
      return [{ field: 'anythingElse', message: 'Description must be 500 characters or less.' }]
    }
    data.anythingElse = details
    return []
  },

  contact: function (body, data) {
    const errors = []
    if (isBlank(body.name)) errors.push({ field: 'name', message: 'Enter your name.' })
    else data.name = body.name.trim()

    const phone = (body.phone || '').trim()
    const email = (body.email || '').trim()

    // Email and telephone are both required.
    if (!email) {
      errors.push({ field: 'email', message: 'Enter your email address.' })
    } else if (!isValidEmail(email)) {
      errors.push({ field: 'email', message: 'Enter an email address in the correct format, like name@example.com' })
    }
    if (!phone) {
      errors.push({ field: 'phone', message: 'Enter a telephone number.' })
    } else if (!isValidPhone(phone)) {
      errors.push({ field: 'phone', message: 'Enter a telephone number, like 01632 960 001, 07700 900 982 or +44 808 157 0192' })
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
//   2. seen more than 48 hours ago  -> too old guidance                  (no ref)
//   3. Northern Ireland (from the location) -> Northern Ireland guidance  (no ref)
//   4. below the collection threshold -> below threshold guidance        (no ref)
//   5. cannot be reached safely     -> not reachable guidance            (no ref)
//   6. decomposed                   -> bird condition guidance           (no ref)
//   - check                         -> outcome (collection)
//
// Every "no collection" gate now routes to its own reference-less guidance
// page, so the outcome page below is reached only for a collection (WSF).
//
// A mass mortality (5+ birds in total) is collected regardless of reachability
// or condition, so it does not trigger exits 4-6 — it carries on through the
// journey to capture contact and location. It is unknown at exits 2 and 3
// (before the birds are counted), so those two are always final.
//
function nextStep (currentStep, data) {
  if (currentStep === 'are-you-reporting-a-dead-bird' && data.reportingDead === 'no') return 'sick-or-injured'
  if (currentStep === 'date-seen' && decision.tooOld(data)) return 'too-old'

  // The location is split across pages: a chooser, then one page per method.
  if (currentStep === 'location') {
    if (data.locationMethod === 'map') return 'location-map'
    if (data.locationMethod === 'what3words') return 'location-what3words'
    return 'location-address'
  }
  // After a method page the nation is known, so the Northern Ireland exit fires.
  if (currentStep === 'location-map' || currentStep === 'location-address' || currentStep === 'location-what3words') {
    if (decision.northernIreland(data)) return 'northern-ireland'
    return 'bird-type-and-number'
  }

  const isMassMortality = decision.massMortality(data)

  // After the bird counts: in Scotland, if songbirds were reported, ask the
  // blackbird follow-up before deciding the threshold (a single blackbird is
  // collectable in Scotland). The threshold check then happens after it.
  if (currentStep === 'bird-type-and-number') {
    if (decision.scotlandSongbird(data)) return 'blackbirds'
    if (!isMassMortality && !decision.meetsThreshold(data)) return 'below-threshold'
    return 'accessible'
  }
  if (currentStep === 'blackbirds') {
    if (!isMassMortality && !decision.meetsThreshold(data)) return 'below-threshold'
    return 'accessible'
  }

  if (currentStep === 'accessible' && data.accessible === 'no' && !isMassMortality) return 'not-reachable'
  if (currentStep === 'condition' && data.condition === 'decomposed' && !isMassMortality) return 'bird-condition'
  if (currentStep === 'check') return 'outcome'
  return STEPS[STEPS.indexOf(currentStep) + 1]
}

module.exports = {
  STEPS: STEPS,
  VALIDATORS: VALIDATORS,
  nextStep: nextStep
}
