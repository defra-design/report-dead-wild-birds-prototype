//
// Routes for the Report a Dead Wild Bird prototype.
//
// For guidance on how to create routes see:
// https://prototype-kit.service.gov.uk/docs/create-routes
//
// The journey itself (page order, validation, branching) is defined in
// app/lib/journey.js, and the collection decision in app/lib/decision.js.
// Most pages need no code here - they are driven by those two files.
//

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()

const journey = require('./lib/journey')
const decision = require('./lib/decision')

// ---------------------------------------------------------------------------
// Debug panel
// ---------------------------------------------------------------------------
// Shows the live session data and how each decision rule currently evaluates,
// so designers and researchers can see why the service reached its answer.
// Turn it off for a session with ?debug=off, and back on with ?debug=on.
router.use(function (req, res, next) {
  if (req.query.debug === 'off') req.session.showDebug = false
  if (req.query.debug === 'on') req.session.showDebug = true

  res.locals.showDebug = req.session.showDebug !== false
  res.locals.debug = decision.explain(req.session.data || {})
  next()
})

// ---------------------------------------------------------------------------
// Start the journey again from the beginning
// ---------------------------------------------------------------------------
router.get('/start-again', function (req, res) {
  req.session.data = {}
  res.redirect('/')
})

// ---------------------------------------------------------------------------
// Journey pages
// ---------------------------------------------------------------------------
// Every step in journey.STEPS gets the same treatment: show the page, then on
// submit validate the answer and either redisplay the page with errors or move
// on to whichever page comes next.
journey.STEPS.forEach(function (step) {
  // 'check' only reviews answers rather than collecting one, so it is below.
  if (step === 'check') return

  router.get('/' + step, function (req, res) {
    res.render(step)
  })

  router.post('/' + step, function (req, res) {
    const data = req.session.data
    const errors = journey.VALIDATORS[step](req.body, data)

    if (errors.length) {
      return res.render(step, {
        errors: errorsByField(errors),
        errorSummary: errorSummary(errors)
      })
    }

    res.redirect('/' + journey.nextStep(step, data))
  })
})

// ---------------------------------------------------------------------------
// Check your answers
// ---------------------------------------------------------------------------
router.post('/check', function (req, res) {
  res.redirect('/outcome')
})

// ---------------------------------------------------------------------------
// Outcome - runs the decision engine and tells the reporter what happens next
// ---------------------------------------------------------------------------
router.get('/outcome', function (req, res) {
  const data = req.session.data

  res.render('outcome', {
    outcome: decision.decide(data),
    referenceNumber: referenceNumber(data)
  })
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Turns [{ field, message }] into { field: message } so a view can ask for the
// error on a single field, for example errors.condition.
function errorsByField (errors) {
  const byField = {}
  errors.forEach(function (error) {
    byField[error.field] = error.message
  })
  return byField
}

// Builds the list the GOV.UK error summary component expects.
function errorSummary (errors) {
  return errors.map(function (error) {
    return { text: error.message, href: '#' + error.field }
  })
}

// A stable, made-up reference number for the prototype. The same answers always
// produce the same reference, which makes screenshots and testing easier.
function referenceNumber (data) {
  const fingerprint = JSON.stringify(data)
  let hash = 0
  for (let i = 0; i < fingerprint.length; i++) {
    hash = (Math.imul(31, hash) + fingerprint.charCodeAt(i)) | 0
  }
  return 'WSF-' + (Math.abs(hash) % 900000 + 100000)
}

module.exports = router
