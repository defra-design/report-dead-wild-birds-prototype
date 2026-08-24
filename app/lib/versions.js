//
// Version registry for the prototype.
//
// The service hosts several versions of the reporting journey side by side, so
// the team can compare them. The picker on the home page is built from this
// list, and app/routes.js mounts each version under its own path (for example
// /v1 and /v2).
//
// Each version is self-contained: its own journey, decision engine and page
// templates (in app/views/<id>). Older versions are frozen - to change the
// journey, add a new version rather than editing an existing one.
//
// To add a version:
//   1. copy app/lib/<previous> to app/lib/<new id> and edit it
//   2. copy app/views/<previous> to app/views/<new id> and edit it
//   3. add an entry to the top of the list below
//

const VERSIONS = [
  {
    id: 'v4',
    number: '4.0',
    date: '20 August 2026',
    current: false,
    summary: 'Usability test B. A fuller start page that explains the service is for disease monitoring, not bird removal, and then goes straight into the form with no screening questions. Tests whether stronger guidance alone sets expectations. Includes the version 3 assessment fixes.',
    journey: require('./v4/journey'),
    decision: require('./v4/decision')
  },
  {
    id: 'v3',
    number: '3.0',
    date: '20 August 2026',
    current: false,
    summary: 'Usability test A. Standard start-page guidance, then screening questions that triage out people who do not need the form — including an intent question (report for disease monitoring vs ask for a bird to be removed). Includes the assessment fixes: validated postcode, what3words format check, and the outcome contact wording.',
    journey: require('./v3/journey'),
    decision: require('./v3/decision')
  },
  {
    id: 'v2',
    number: '2.0',
    date: '4 August 2026',
    current: false,
    summary: 'Country moved first (with Northern Ireland signposting), species before number of birds, when-seen simplified to recency bands, time since seen no longer affects the collection decision, address and postcode added to location, email or phone accepted, and Check your answers no longer restarts the form.',
    journey: require('./v2/journey'),
    decision: require('./v2/decision')
  },
  {
    id: 'v1',
    number: '1.0',
    date: '24 July 2026',
    current: false,
    summary: 'First build of the reporting journey.',
    journey: require('./v1/journey'),
    decision: require('./v1/decision')
  }
]

function get (id) {
  return VERSIONS.filter(function (version) { return version.id === id })[0]
}

module.exports = { VERSIONS: VERSIONS, get: get }
