/**
 * iOS home-screen widgets (S-14): small (− / +, to-sort count) and medium (week net, − Expense, + Income,
 * Start trip / End trip). Data comes from the app through the shared App Group (see
 * src/features/widgets/refresh.ts). Built only on EAS (no Mac here).
 * @type {import('@bacons/apple-targets/app.plugin').ConfigFunction}
 */
module.exports = (config) => ({
  type: 'widget',
  name: 'SundaySortWidget',
  displayName: 'Sunday Sort',
  bundleIdentifier: '.widget',
  deploymentTarget: '17.0',
  frameworks: ['SwiftUI', 'WidgetKit'],
  colors: {
    $accent: { color: '#1F2A44', darkColor: '#F5B841' },
    $widgetBackground: { color: '#FAF8F4', darkColor: '#1F2632' },
  },
  entitlements: {
    'com.apple.security.application-groups': config.ios.entitlements['com.apple.security.application-groups'],
  },
});
