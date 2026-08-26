//
// Routes for the Report a Dead Wild Bird prototype.
//
// For guidance on how to create routes see:
// https://prototype-kit.service.gov.uk/docs/create-routes
//
// The prototype hosts several versions of the journey side by side (see
// app/lib/versions.js). The home page is a version picker. Each version is
// mounted under its own path, for example /v1 and /v2, and its pages, journey
// and decision engine are all self-contained.
//

const fs = require('fs')
const path = require('path')
const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()

const versions = require('./lib/versions')

// ---------------------------------------------------------------------------
// Home page - version picker
// ---------------------------------------------------------------------------
router.get('/', function (req, res) {
  res.render('index', { versions: versions.VERSIONS })
})

// ---------------------------------------------------------------------------
// Mount every version
// ---------------------------------------------------------------------------
versions.VERSIONS.forEach(function (version) {
  mountVersion(version)
})

function mountVersion (version) {
  const basePath = '/' + version.id
  const journey = version.journey
  const decision = version.decision

  // Give every page in this version its answers, its debug state and its base
  // path. Answers are kept per version so switching versions does not mix them.
  function withVersion (req, res, next) {
    const data = req.session.data[version.id] || (req.session.data[version.id] = {})
    res.locals.data = data
    res.locals.basePath = basePath
    res.locals.version = version
    res.locals.speciesLabel = decision.speciesLabel

    const debugKey = 'showDebug_' + version.id
    if (req.query.debug === 'off') req.session[debugKey] = false
    if (req.query.debug === 'on') req.session[debugKey] = true
    res.locals.showDebug = req.session[debugKey] !== false
    res.locals.debug = decision.explain(data)

    next()
  }

  // Version start page, and a clean restart.
  router.get(basePath, withVersion, function (req, res) {
    res.render(version.id + '/start')
  })
  router.get(basePath + '/start', withVersion, function (req, res) {
    res.render(version.id + '/start')
  })
  router.get(basePath + '/start-again', function (req, res) {
    req.session.data[version.id] = {}
    res.redirect(basePath)
  })

  // Journey pages. Each renders its view, then on submit validates and either
  // redisplays with errors or moves to the next page. When reached from Check
  // your answers (?return=check), it returns there after answering.
  journey.STEPS.forEach(function (step) {
    if (step === 'check') return

    router.get(basePath + '/' + step, withVersion, function (req, res) {
      res.render(version.id + '/' + step, { returnToCheck: req.query.return === 'check' })
    })

    router.post(basePath + '/' + step, withVersion, function (req, res) {
      const data = res.locals.data
      const errors = journey.VALIDATORS[step](req.body, data)

      if (errors.length) {
        return res.render(version.id + '/' + step, {
          returnToCheck: req.query.return === 'check',
          errors: errorsByField(errors),
          errorSummary: errorSummary(errors)
        })
      }

      const next = journey.nextStep(step, data)
      if (req.query.return === 'check' && journey.STEPS.indexOf(next) !== -1) {
        return res.redirect(basePath + '/check')
      }
      res.redirect(basePath + '/' + next)
    })
  })

  // Check your answers, and the outcome (which runs the decision engine).
  router.get(basePath + '/check', withVersion, function (req, res) {
    res.render(version.id + '/check')
  })
  // Where 'check' goes next is version-driven: most versions send it straight to
  // the outcome, but a version can route it elsewhere (for example to a contact
  // page) via its nextStep().
  router.post(basePath + '/check', withVersion, function (req, res) {
    res.redirect(basePath + '/' + journey.nextStep('check', res.locals.data))
  })
  router.get(basePath + '/outcome', withVersion, function (req, res) {
    const outcome = decision.decide(res.locals.data)
    res.render(version.id + '/outcome', {
      outcome: outcome,
      referenceNumber: referenceNumber(res.locals.data, outcome.collect)
    })
  })

  // Guidance pages: any template in the version folder that is not a journey
  // step or one of the pages handled above. These are plain GET pages people
  // are diverted to (for example sick-or-injured, bird-has-gone).
  guidancePages(version).forEach(function (page) {
    router.get(basePath + '/' + page, withVersion, function (req, res) {
      res.render(version.id + '/' + page)
    })
  })
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Templates in a version folder that are not steps or the start/check/outcome
// pages, so they can be registered as plain guidance pages.
function guidancePages (version) {
  const handled = version.journey.STEPS.concat(['start', 'check', 'outcome'])
  const dir = path.join(__dirname, 'views', version.id)
  return fs.readdirSync(dir)
    .filter(function (file) { return file.endsWith('.html') })
    .map(function (file) { return file.replace(/\.html$/, '') })
    .filter(function (name) { return handled.indexOf(name) === -1 })
}

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
// It is prefixed WSF- for a collection and REP- for a report-only (no collection).
function referenceNumber (data, collect) {
  const fingerprint = JSON.stringify(data)
  let hash = 0
  for (let i = 0; i < fingerprint.length; i++) {
    hash = (Math.imul(31, hash) + fingerprint.charCodeAt(i)) | 0
  }
  const prefix = collect ? 'WSF-' : 'REP-'
  return prefix + (Math.abs(hash) % 900000 + 100000)
}

module.exports = router
