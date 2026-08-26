//
// Journey definition for the Report a Dead Wild Bird service.
//
// Every question is its own page, following the GOV.UK "one thing per page"
// pattern. This file defines:
//
//   STEPS      - the order of the pages
//   VALIDATORS - what counts as a valid answer for each page
//   nextStep() - where to send someone after they answer
//
// To add a question: add its id to STEPS, add a validator, and create a view
// named after the id in app/views.
//

// The order of the journey. Each id matches a view in app/views and a route.
const STEPS = [
  'intent',
  'country',
  'dead',
  'still-there',
  'when-seen',
  'species',
  'how-many',
  'location',
  'photo',
  'reachable',
  'private-land',
  'condition',
  'contact',
  'check'
]

function isBlank (value) {
  return value === undefined || value === null || String(value).trim() === ''
}

// Format checks only. In the real service a postcode would be confirmed against
// an address lookup (for example OS Places), and a what3words address against
// the what3words API, so these become back-end services once plumbed in.
const UK_POSTCODE = /^[A-Za-z]{1,2}\d[A-Za-z\d]?\s*\d[A-Za-z]{2}$/
const WHAT3WORDS = /^\/{0,3}[^\s.\/]+\.[^\s.\/]+\.[^\s.\/]+$/

// Each validator returns an array of { field, message } errors. When the answer
// is valid it writes the tidied value onto `data` (the session).
const VALIDATORS = {
  // Screening question: surfaces the collection misconception and triages out
  // people who want a bird removed rather than reported for disease monitoring.
  intent: function (body, data) {
    if (isBlank(body.intent)) return [{ field: 'intent', message: 'Select what you want to do' }]
    data.intent = body.intent
    return []
  },

  country: function (body, data) {
    if (isBlank(body.country)) return [{ field: 'country', message: 'Select which country the bird is in' }]
    data.country = body.country
    return []
  },

  dead: function (body, data) {
    if (isBlank(body.dead)) return [{ field: 'dead', message: 'Select yes if the bird is dead' }]
    data.dead = body.dead
    return []
  },

  'still-there': function (body, data) {
    if (isBlank(body.stillThere)) return [{ field: 'stillThere', message: 'Select whether the bird is still at the location' }]
    data.stillThere = body.stillThere
    return []
  },

  'when-seen': function (body, data) {
    // Captured as a recency band rather than an exact date. It is recorded for
    // information but does not affect the collection decision.
    if (isBlank(body.whenSeen)) return [{ field: 'whenSeen', message: 'Select when you first saw the bird' }]
    data.whenSeen = body.whenSeen
    return []
  },

  species: function (body, data) {
    if (isBlank(body.species)) return [{ field: 'species', message: 'Select the type of bird' }]
    data.species = body.species
    return []
  },

  'how-many': function (body, data) {
    if (isBlank(body.count)) return [{ field: 'count', message: 'Select how many dead birds there are' }]
    data.count = body.count
    return []
  },

  location: function (body, data) {
    const errors = []

    // People can pinpoint the bird with a map pin, a postcode, or both. At least
    // one is needed so a collector has somewhere to go. The free text box
    // captures anything that does not fit the fields above.
    const hasPin = !isBlank(body.lat) && !isBlank(body.lng)
    const postcode = (body.postcode || '').trim()
    const what3words = (body.what3words || '').trim()
    const hasPostcode = !isBlank(postcode)

    if (!hasPin && !hasPostcode) {
      errors.push({ field: 'location', message: 'Drop a pin on the map, or enter a postcode' })
    }

    // Format validation (the 2023 assessment found none on these fields).
    if (hasPostcode && !UK_POSTCODE.test(postcode)) {
      errors.push({ field: 'postcode', message: 'Enter a full UK postcode, like BS1 5AH' })
    }
    if (what3words && !WHAT3WORDS.test(what3words)) {
      errors.push({ field: 'what3words', message: 'Enter a what3words address in the format ///word.word.word' })
    }

    data.location = {
      lat: hasPin ? body.lat : null,
      lng: hasPin ? body.lng : null,
      postcode: postcode,
      what3words: what3words,
      details: (body.locationDetails || '').trim()
    }

    return errors
  },

  photo: function (body, data) {
    // A photo is strongly encouraged but optional, because not every reporter
    // is able to take one safely.
    data.photo = body.photoName ? body.photoName : null
    return []
  },

  reachable: function (body, data) {
    if (isBlank(body.reachable)) return [{ field: 'reachable', message: 'Select whether the bird can be reached safely from the ground' }]
    data.reachable = body.reachable
    data.nearWater = body.nearWater === 'yes' ? 'yes' : 'no'
    return []
  },

  'private-land': function (body, data) {
    if (isBlank(body.privateLand)) return [{ field: 'privateLand', message: 'Select whether the bird is on private land' }]
    data.privateLand = body.privateLand
    data.accessNotes = (body.accessNotes || '').trim()
    return []
  },

  condition: function (body, data) {
    if (isBlank(body.condition)) return [{ field: 'condition', message: 'Select the condition of the carcass' }]
    data.condition = body.condition
    return []
  },

  contact: function (body, data) {
    const errors = []

    if (isBlank(body.name)) {
      errors.push({ field: 'name', message: 'Enter your full name' })
    } else {
      data.name = body.name.trim()
    }

    // At least one of email or telephone is required, so we can reach the
    // reporter, but not both.
    const email = (body.email || '').trim()
    const phone = (body.phone || '').trim()

    let emailValid = true
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push({ field: 'email', message: 'Enter an email address in the correct format, like name@example.com' })
      emailValid = false
    }

    let phoneValid = true
    if (phone && !/^[0-9+()\s-]{7,}$/.test(phone)) {
      errors.push({ field: 'phone', message: 'Enter a telephone number in the correct format, like 01632 960 001' })
      phoneValid = false
    }

    if (!email && !phone) {
      errors.push({ field: 'email', message: 'Enter an email address or a telephone number' })
    }

    data.email = (email && emailValid) ? email : ''
    data.phone = (phone && phoneValid) ? phone : ''

    return errors
  }
}

//
// Work out which page comes next.
// Screening answers divert people to guidance instead of continuing:
// wanting a bird removed, a report in Northern Ireland, a bird that is not dead,
// or one that has gone.
//
function nextStep (currentStep, data) {
  if (currentStep === 'intent' && data.intent === 'removal') return 'removal-help'
  if (currentStep === 'country' && data.country === 'northern-ireland') return 'northern-ireland'
  if (currentStep === 'dead' && data.dead === 'no') return 'sick-or-injured'
  if (currentStep === 'still-there' && data.stillThere === 'no') return 'bird-has-gone'
  if (currentStep === 'check') return 'outcome'
  return STEPS[STEPS.indexOf(currentStep) + 1]
}

module.exports = {
  STEPS: STEPS,
  VALIDATORS: VALIDATORS,
  nextStep: nextStep
}
