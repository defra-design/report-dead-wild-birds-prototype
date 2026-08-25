//
// Journey definition for v5.
//
// Content comes from the content design doc; the page order is the team's:
//
//   1  start
//   2  reporting-dead-bird   (screener: "No, sick/injured" -> guidance)
//   3  country               (England/Scotland/Wales continue; N. Ireland -> guidance)
//   4  bird-type-and-number  (species + how many; checked against thresholds)
//   5  date-seen             (captured only; does not affect triage)
//   6  accessible            ("No" -> straight to the end page, cannot collect)
//   7  condition             (good/mixed collect; "decomposed" -> end page)
//   8  location
//   9  photo
//   10 location-details      (any other information)
//   11 contact
//   12 check
//   13 outcome (end page)
//
// This is a scaffold: validation is light and the collection thresholds in
// decision.js are placeholders, to be detailed page by page.
//

const STEPS = [
  'reporting-dead-bird',
  'country',
  'bird-type-and-number',
  'date-seen',
  'accessible',
  'condition',
  'location',
  'photo',
  'location-details',
  'contact',
  'check'
]

function isBlank (value) {
  return value === undefined || value === null || String(value).trim() === ''
}

const VALIDATORS = {
  'reporting-dead-bird': function (body, data) {
    if (isBlank(body.reportingDead)) return [{ field: 'reportingDead', message: 'Select yes if the bird is dead' }]
    data.reportingDead = body.reportingDead
    return []
  },

  country: function (body, data) {
    if (isBlank(body.country)) return [{ field: 'country', message: 'Select where you saw the bird' }]
    data.country = body.country
    return []
  },

  'bird-type-and-number': function (body, data) {
    const errors = []
    if (isBlank(body.species)) errors.push({ field: 'species', message: 'Select the type of bird' })
    else data.species = body.species

    if (isBlank(body.count)) errors.push({ field: 'count', message: 'Enter how many of this type of bird you found' })
    else if (!/^\d+$/.test(String(body.count).trim())) errors.push({ field: 'count', message: 'Number of birds must be a whole number' })
    else data.count = parseInt(body.count, 10)

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
    if (isBlank(body.condition)) return [{ field: 'condition', message: 'Select the condition of the bird' }]
    data.condition = body.condition
    return []
  },

  location: function (body, data) {
    if (isBlank(body.locationMethod)) return [{ field: 'locationMethod', message: 'Choose how you want to give the location' }]
    data.location = {
      method: body.locationMethod,
      map: (body.lat && body.lng) ? (body.lat + ', ' + body.lng) : '',
      addressPostcode: (body.addressPostcode || '').trim(),
      latLong: (body.latLong || '').trim(),
      osGrid: (body.osGrid || '').trim(),
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
  if (currentStep === 'reporting-dead-bird' && data.reportingDead === 'no') return 'sick-or-injured'
  if (currentStep === 'country' && data.country === 'northern-ireland') return 'northern-ireland'
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
