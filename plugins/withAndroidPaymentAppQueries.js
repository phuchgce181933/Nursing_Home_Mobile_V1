const { withAndroidManifest } = require('expo/config-plugins');

// Android 11+ (API 30+) package visibility: without declaring these custom URL
// schemes in a <queries> block, Linking.canOpenURL() always returns false for
// them even when the app is installed, so the wallet top-up screen could never
// deep-link into MoMo/ZaloPay/VNPay on Android. iOS uses infoPlist's
// LSApplicationQueriesSchemes for the same purpose (already set in app.json).
const PAYMENT_APP_SCHEMES = ['momo', 'zalopay', 'vnpay'];

const withAndroidPaymentAppQueries = (config) =>
  withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    if (!manifest.queries) manifest.queries = [{}];
    const queries = manifest.queries[0];
    if (!queries.intent) queries.intent = [];

    for (const scheme of PAYMENT_APP_SCHEMES) {
      const alreadyDeclared = queries.intent.some(
        (intent) => intent.data?.[0]?.$?.['android:scheme'] === scheme
      );
      if (alreadyDeclared) continue;
      queries.intent.push({
        action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
        data: [{ $: { 'android:scheme': scheme } }],
      });
    }

    return config;
  });

module.exports = withAndroidPaymentAppQueries;
