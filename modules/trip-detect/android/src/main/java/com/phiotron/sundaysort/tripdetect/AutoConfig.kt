package com.phiotron.sundaysort.tripdetect

import android.Manifest
import android.annotation.SuppressLint
import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import androidx.core.content.ContextCompat
import com.google.android.gms.location.ActivityRecognition
import com.google.android.gms.location.ActivityTransition
import com.google.android.gms.location.ActivityTransitionRequest
import com.google.android.gms.location.DetectedActivity

/**
 * What the receivers need to know while JS is dead (S1). JS writes it with `configure()`:
 * - enabled: automatic trips on and Pro (re-register transitions after reboot / update)
 * - vanAddress: start signal worth waking JS for
 * - tripActive: a trip is recording (then every activity change and wake alarm goes to JS)
 */
internal object AutoConfig {
  private const val PREFS = "sundaysort_trip_detect_cfg"
  const val TAG = "SundayTripDetect"
  const val ACTION_WAKE = "com.phiotron.sundaysort.tripdetect.WAKE"
  private const val REQ_TRANSITIONS = 4101
  private const val REQ_WAKE = 4103

  private fun prefs(c: Context) = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  fun enabled(c: Context) = prefs(c).getBoolean("enabled", false)
  fun tripActive(c: Context) = prefs(c).getBoolean("tripActive", false)
  fun vanAddress(c: Context): String? = prefs(c).getString("vanAddress", null)
  fun registeredAt(c: Context) = prefs(c).getLong("registeredAt", 0L)
  /** B-88: no new GPS check for a drive before this (JS sets it while one runs and for a cool-down after). */
  fun probeAfter(c: Context) = prefs(c).getLong("probeAfter", 0L)

  fun write(c: Context, cfg: Map<String, Any?>) {
    val e = prefs(c).edit()
    (cfg["enabled"] as? Boolean)?.let { e.putBoolean("enabled", it) }
    (cfg["tripActive"] as? Boolean)?.let { e.putBoolean("tripActive", it) }
    // B-145: "Start when charging" is gone — drop what an older build stored.
    e.remove("startOnCharge")
    if (cfg.containsKey("vanAddress")) e.putString("vanAddress", cfg["vanAddress"] as? String)
    (cfg["probeAfter"] as? Number)?.let { e.putLong("probeAfter", it.toLong()) }
    e.apply()
  }

  fun hasActivityPermission(c: Context): Boolean =
    Build.VERSION.SDK_INT < Build.VERSION_CODES.Q ||
      ContextCompat.checkSelfPermission(c, Manifest.permission.ACTIVITY_RECOGNITION) == PackageManager.PERMISSION_GRANTED

  fun transitionsIntent(c: Context): PendingIntent {
    val intent = Intent(c, TripDetectReceiver::class.java)
    // Activity recognition fills the intent with results, so it must be mutable on Android 12+.
    val flags = PendingIntent.FLAG_UPDATE_CURRENT or
      (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_MUTABLE else 0)
    return PendingIntent.getBroadcast(c, REQ_TRANSITIONS, intent, flags)
  }

  /** Register driving / walking / cycling / still transitions (also after reboot: registrations don't survive it). */
  @SuppressLint("MissingPermission")
  fun registerTransitions(c: Context, onDone: (Exception?) -> Unit = {}) {
    if (!hasActivityPermission(c)) {
      onDone(SecurityException("Activity recognition not granted"))
      return
    }
    val types = listOf(DetectedActivity.IN_VEHICLE, DetectedActivity.WALKING, DetectedActivity.ON_BICYCLE, DetectedActivity.STILL)
    val transitions = types.flatMap { t ->
      listOf(ActivityTransition.ACTIVITY_TRANSITION_ENTER, ActivityTransition.ACTIVITY_TRANSITION_EXIT).map { tr ->
        ActivityTransition.Builder().setActivityType(t).setActivityTransition(tr).build()
      }
    }
    ActivityRecognition.getClient(c)
      .requestActivityTransitionUpdates(ActivityTransitionRequest(transitions), transitionsIntent(c))
      .addOnSuccessListener {
        prefs(c).edit().putLong("registeredAt", System.currentTimeMillis()).apply()
        onDone(null)
      }
      .addOnFailureListener { onDone(it) }
  }

  @SuppressLint("MissingPermission")
  fun unregisterTransitions(c: Context, onDone: () -> Unit = {}) {
    prefs(c).edit().putLong("registeredAt", 0L).apply()
    if (!hasActivityPermission(c)) {
      onDone()
      return
    }
    ActivityRecognition.getClient(c).removeActivityTransitionUpdates(transitionsIntent(c)).addOnCompleteListener { onDone() }
  }

  private fun wakeIntent(c: Context): PendingIntent {
    val intent = Intent(c, TripDetectReceiver::class.java).setAction(ACTION_WAKE)
    return PendingIntent.getBroadcast(c, REQ_WAKE, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }

  /** One pending wake-up (end-of-trip check). Inexact but allowed in Doze; a new one replaces the old one. */
  fun scheduleWake(c: Context, atMs: Long) {
    val am = c.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, atMs, wakeIntent(c))
  }

  fun cancelWake(c: Context) {
    (c.getSystemService(Context.ALARM_SERVICE) as AlarmManager).cancel(wakeIntent(c))
  }

  /**
   * Run the JS task that decides what a signal means (start / end a trip). `foreground` = start the task service as
   * a foreground service (no trip recording yet, app likely dead): allowed from an activity-transition / Bluetooth /
   * boot broadcast on Android 12+. Failures are logged; the signal stays in EventLog for the next run.
   */
  fun kick(c: Context, reason: String, foreground: Boolean) {
    val intent = Intent(c, TripDetectTaskService::class.java).putExtra("reason", reason).putExtra("fg", foreground)
    try {
      if (foreground && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) c.startForegroundService(intent) else c.startService(intent)
    } catch (e: Exception) {
      Log.w(TAG, "kick($reason) failed: ${e.message}")
      if (foreground) {
        runCatching { c.startService(intent.putExtra("fg", false)) }.onFailure { Log.w(TAG, "kick fallback failed: ${it.message}") }
      }
    }
  }
}
