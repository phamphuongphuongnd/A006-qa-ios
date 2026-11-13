/**
 * App entry. Background work must be registered at bundle load, before (or without) any screen rendering:
 * Android may start the JS runtime headless for the GPS foreground service or to draw a widget.
 * To take effect, package.json "main" must point here ("index.ts") instead of "expo-router/entry".
 */
import './src/features/trips/backgroundTask';
import './src/features/widgets/register';
// P3 device probe (dev builds only; the task body is harmless in release, the screen redirects).
import './src/dev/probeTask';
import 'expo-router/entry';
