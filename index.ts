/**
 * App entry. Background work must be registered at bundle load, before (or without) any screen rendering:
 * Android may start the JS runtime headless for the GPS foreground service or to draw a widget.
 * To take effect, package.json "main" must point here ("index.ts") instead of "expo-router/entry".
 */
import './src/features/trips/backgroundTask';
import './src/features/widgets/register';
import 'expo-router/entry';
