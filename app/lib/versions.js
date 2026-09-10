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
    id: 'v7',
    number: '7.0',
    name: 'Alpha Prototype',
    date: '10 September 2026',
    current: true,
    changes: [
      'Start page reframed to a single list of who should use the service',
      '"Describe the location" added back as a location option',
      '"Other information" folded into the location page',
      'Clearer exit-page headings, with extra guidance sections trimmed',
      'Email address required, telephone optional'
    ],
    journey: require('./v7/journey'),
    decision: require('./v7/decision')
  },
  {
    id: 'v6',
    number: '6.0',
    name: 'Alpha Prototype (v6)',
    date: '8 September 2026',
    current: false,
    changes: [
      'Journey reordered: screener, date, country, location, numbers, reachability, condition',
      'Country question added (England, Scotland, Wales, Northern Ireland)',
      'Six contextual exit pages, each shown as soon as collection is ruled out',
      'Birds seen more than 48 hours ago are not collected',
      'In Scotland, a single blackbird can meet the collection threshold',
      'Mass mortality (5 or more birds) overrides reachability and condition',
      'Debug panel collapsed by default'
    ],
    journey: require('./v6/journey'),
    decision: require('./v6/decision')
  },
  {
    id: 'v5',
    number: '5.0',
    date: '24 August 2026',
    current: false,
    changes: [
      'Rebuilt from the latest content pages in the agreed page order',
      'Bird species and numbers checked against collection thresholds',
      'Separate collect and do-not-collect end pages',
      '"Cannot be reached safely" and "decomposed" skip to the end'
    ],
    journey: require('./v5/journey'),
    decision: require('./v5/decision')
  },
  {
    id: 'v4',
    number: '4.0',
    date: '20 August 2026',
    current: false,
    changes: [
      'Fuller start-page guidance explaining the service is for disease monitoring, not bird removal',
      'No screening questions — goes straight into the form',
      'Postcode and what3words validation'
    ],
    journey: require('./v4/journey'),
    decision: require('./v4/decision')
  },
  {
    id: 'v3',
    number: '3.0',
    date: '20 August 2026',
    current: false,
    changes: [
      'Standard start-page guidance',
      'Screening questions to filter out reports that do not need the form',
      'Intent question: report for disease monitoring or ask for a bird to be removed',
      'Postcode and what3words validation'
    ],
    journey: require('./v3/journey'),
    decision: require('./v3/decision')
  },
  {
    id: 'v2',
    number: '2.0',
    date: '4 August 2026',
    current: false,
    changes: [
      'Country asked first',
      'Species asked before the number of birds',
      '"When seen" simplified to recency bands, no longer affecting collection',
      'Address and postcode added to the location options',
      'Email or telephone accepted',
      'Check answers no longer restarts the form'
    ],
    journey: require('./v2/journey'),
    decision: require('./v2/decision')
  },
  {
    id: 'v1',
    number: '1.0',
    date: '24 July 2026',
    current: false,
    changes: [
      'First build of the reporting journey'
    ],
    journey: require('./v1/journey'),
    decision: require('./v1/decision')
  }
]

function get (id) {
  return VERSIONS.filter(function (version) { return version.id === id })[0]
}

module.exports = { VERSIONS: VERSIONS, get: get }
