// Lighthouse CI config.
// TODO(week-12): tighten thresholds before launch:
//   performance >= 0.85, accessibility/best-practices/seo >= 0.95.
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run preview',
      url: [
        'http://localhost:4321/',
        'http://localhost:4321/scents',
        'http://localhost:4321/scent/azeziya',
        'http://localhost:4321/bundles/starter-set',
        'http://localhost:4321/cart',
        'http://localhost:4321/story',
      ],
      numberOfRuns: 3,
      settings: {
        // Skip third-party flakes that Lighthouse occasionally trips on.
        skipAudits: ['uses-http2'],
      },
    },
    assert: {
      assertions: {
        'categories:performance':    ['error', { minScore: 0.75 }],
        'categories:accessibility':  ['error', { minScore: 0.90 }],
        'categories:best-practices': ['error', { minScore: 0.90 }],
        'categories:seo':            ['error', { minScore: 0.90 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
