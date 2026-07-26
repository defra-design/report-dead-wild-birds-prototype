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
  'dead',
  'still-there',
  'date-seen',
  'country',
  'how-many',
  'species',
  'location',
  'photo',
  'reachable',
  'private-land',
  'condition',
  'contact',
  'check'
]

// A fixed "today" so the 48-hour logic behaves predictably in a prototype.
// In a live service this would be the real current date.
const TODAY = new Date('2026-07-17T10:00:00Z')

const HOURS_FOR_VIABLE_TESTING = 48

function isBlank (value) {
  return value === undefined || value === null || String(value).trim() === ''
}

// Each validator returns an array of { field, message } errors. When the answer
// is valid it writes the tidied value onto `data` (the session).
const VALIDATORS = {
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

  'date-seen': function (body, data) {
    const day = parseInt(body['date-day'], 10)
    const month = parseInt(body['date-month'], 10)
    const year = parseInt(body['date-year'], 10)

    if (isBlank(body['date-day']) && isBlank(body['date-month']) && isBlank(body['date-year'])) {
      return [{ field: 'date-seen', message: 'Enter the date you first saw the bird' }]
    }
    if (!day || !month || !year || month < 1 || month > 12 || day < 1 || day > 31) {
      return [{ field: 'date-seen', message: 'Enter a real date' }]
    }

    const seen = new Date(Date.UTC(year, month - 1, day, 10, 0, 0))
    if (seen > TODAY) {
      return [{ field: 'date-seen', message: 'The date you first saw the bird cannot be in the future' }]
    }

    data.dateSeen = { day: day, month: month, year: year }

    // Derived answer used by the decision engine.
    const hoursSinceSeen = (TODAY - seen) / (1000 * 60 * 60)
    data.seenMoreThan48h = hoursSinceSeen > HOURS_FOR_VIABLE_TESTING ? 'yes' : 'no'
    return []
  },

  country: function (body, data) {
    if (isBlank(body.country)) return [{ field: 'country', message: 'Select which country the bird is in' }]
    data.country = body.country
    return []
  },

  'how-many': function (body, data) {
    if (isBlank(body.count)) return [{ field: 'count', message: 'Select how many dead birds there are' }]
    data.count = body.count
    return []
  },

  species: function (body, data) {
    if (isBlank(body.species)) return [{ field: 'species', message: 'Select the type of bird' }]
    data.species = body.species
    return []
  },

  location: function (body, data) {
    const errors = []

    // The map writes coordinates into hidden fields when a pin is dropped.
    if (isBlank(body.lat) || isBlank(body.lng)) {
      errors.push({ field: 'map', message: 'Drop a pin on the map to show exactly where the bird is' })
    } else {
      data.location = {
        lat: body.lat,
        lng: body.lng,
        what3words: (body.what3words || '').trim()
      }
    }

    if (isBlank(body.standingNextTo)) {
      errors.push({ field: 'standingNextTo', message: 'Select whether you are standing next to the bird now' })
    } else {
      data.standingNextTo = body.standingNextTo
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

    // Email is mandatory so we can always tell the reporter the outcome, and so
    // collectors can get in touch.
    const email = (body.email || '').trim()
    if (!email) {
      errors.push({ field: 'email', message: 'Enter your email address' })
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push({ field: 'email', message: 'Enter an email address in the correct format, like name@example.com' })
    } else {
      data.email = email
    }

    data.phone = (body.phone || '').trim()
    return []
      .concat(errors)
  }
}

//
// Work out which page comes next.
// Two screening answers divert people to guidance instead of continuing:
// a bird that is not dead, and a bird that has already gone.
//
function nextStep (currentStep, data) {
  if (currentStep === 'dead' && data.dead === 'no') return 'sick-or-injured'
  if (currentStep === 'still-there' && data.stillThere === 'no') return 'bird-has-gone'
  if (currentStep === 'check') return 'outcome'
  return STEPS[STEPS.indexOf(currentStep) + 1]
}

module.exports = {
  STEPS: STEPS,
  VALIDATORS: VALIDATORS,
  nextStep: nextStep,
  TODAY: TODAY
}
