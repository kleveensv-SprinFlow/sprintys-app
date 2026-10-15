/**
 * Extends app.json. Push notifications (server-sent) need native credentials (Firebase on Android, the push
 * capability on iOS), so they are switched on only when the build sets PUSH_ENABLED=1 (GitHub variable of the
 * same name). Without it the build is exactly the one described by app.json: local reminders still work,
 * and the app simply does not register for server pushes.
 * See store/PUSH_SETUP.md.
 */
const fs = require('fs');

module.exports = ({ config }) => {
  const push = process.env.PUSH_ENABLED === '1';
  if (!push) return config;

  const hasGoogleServices = fs.existsSync('./google-services.json');
  if (!hasGoogleServices) {
    // eslint-disable-next-line no-console
    console.warn('PUSH_ENABLED=1 but google-services.json is missing: Android keeps working without server push.');
  }

  return {
    ...config,
    android: {
      ...config.android,
      ...(hasGoogleServices ? { googleServicesFile: './google-services.json' } : {}),
    },
    plugins: [...(config.plugins || []), ['expo-notifications', { color: '#0069E8' }]],
  };
};
