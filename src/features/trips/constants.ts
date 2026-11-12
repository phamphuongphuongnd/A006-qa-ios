/** expo-task-manager task that receives background location batches while a trip is running. */
export const TRIP_TASK = 'sundaysort.trip-gps';
/** Task name before B-10; its LOW channel can't be lowered once created, so it is deleted at startup. */
export const OLD_TRIP_TASK = 'sundaysort.trip-location';

/** Android notification channels (owned by trip work; DataServices owns the weekly-reminder channel). */
export const CHANNEL_TRIP = 'trip-recording';
export const CHANNEL_TRIP_REMINDER = 'trip-reminder';
/**
 * Channel expo-location uses for its required foreground-service notification: "<package>:<task name>".
 * We create it first at MIN importance so it folds away and the "Trip running" one (with buttons) is the one people see (B-10).
 */
export const CHANNEL_LOCATION_SERVICE = `com.phiotron.sundaysort:${TRIP_TASK}`;
export const OLD_CHANNEL_LOCATION_SERVICE = `com.phiotron.sundaysort:${OLD_TRIP_TASK}`;

/** Notification identifiers / categories. */
export const NOTIF_TRIP = 'trip-ongoing';
export const NOTIF_LONG_TRIP = 'trip-long';
export const CATEGORY_RUNNING = 'trip-running';
export const CATEGORY_PAUSED = 'trip-paused';
export const CATEGORY_LONG = 'trip-long';

export const ACTION_PAUSE = 'trip.pause';
export const ACTION_RESUME = 'trip.resume';
export const ACTION_END = 'trip.end';
export const ACTION_KEEP = 'trip.keep';

/** Brand colour for notification accents. */
export const NOTIF_COLOR = '#F5B841';
