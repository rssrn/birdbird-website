/**
 * birdbird Web Viewer Configuration
 * Production deployment for birdbird.rossarn.workers.dev
 */

window.BIRDBIRD_CONFIG = {
  // R2 bucket, served same-origin by src/worker.js (was the rate-limited r2.dev URL)
  r2BaseUrl: '/media',

  // Site title
  siteName: 'Bird Feeder Highlights',

  // Site subtitle with location
  siteSubtitle: 'Holt, Wiltshire • Automated bird activity highlights from motion-triggered clips',

  // Analytics code
  analytics: '<script defer src="https://umami.rossarnold.uk/script.js" data-website-id="ef619203-335e-4825-bc02-56655ba97334"></script>'
};
