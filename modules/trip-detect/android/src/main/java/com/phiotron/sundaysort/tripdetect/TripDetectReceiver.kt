package com.phiotron.sundaysort.tripdetect

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.BatteryManager
import android.os.SystemClock
import com.google.android.gms.location.ActivityRecognitionResult
import com.google.android.gms.location.ActivityTransition
import com.google.android.gms.location.ActivityTransitionResult
import com.google.android.gms.location.DetectedActivity

internal fun isCharging(c: Context): Boolean =
  (c.getSystemService(Context.BATTERY_SERVICE) as BatteryManager).isCharging

internal fun activityName(type: Int): String = when (type) {
  DetectedActivity.IN_VEHICLE -> "driving"
  DetectedActivity.ON_BICYCLE -> "cycling"
  DetectedActivity.ON_FOOT, DetectedActivity.WALKING -> "walking"
  DetectedActivity.RUNNING -> "running"
  DetectedActivity.STILL -> "still"
  DetectedActivity.TILTING -> "tilting"
  else -> "unknown"
}

/** elapsedRealtimeNanos of an event → wall clock ms. */
private fun wallClock(elapsedNanos: Long): Long =
  System.currentTimeMillis() - (SystemClock.elapsedRealtimeNanos() - elapsedNanos) / 1_000_000

/**
 * Receives activity transitions (`kind: "activity"`, enter / exit) and, while sampling is on, raw activity
 * results (`kind: "sample"`, most probable activity + confidence). Runs with or without the JS runtime.
 *
 * Android 12+: an activity-transition event lets the app start a foreground service from the background
 * (documented FGS exemption) — S1 starts the location service from here or from a headless task.
 */
class TripDetectReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action == AutoConfig.ACTION_WAKE) {
      EventLog.add(context, "wake")
      // Only scheduled while a trip records, so the app has a foreground service: a plain service start is allowed.
      AutoConfig.kick(context, "wake", foreground = false)
      return
    }
    if (ActivityTransitionResult.hasResult(intent)) {
      val result = ActivityTransitionResult.extractResult(intent) ?: return
      var startCandidate = false
      for (e in result.transitionEvents) {
        val enter = e.transitionType == ActivityTransition.ACTIVITY_TRANSITION_ENTER
        if (enter && e.activityType == DetectedActivity.IN_VEHICLE) startCandidate = true
        if (!enter && e.activityType == DetectedActivity.STILL && AutoConfig.startOnCharge(context) && isCharging(context)) startCandidate = true
        // B-88: leaving 'still' may be a drive the sensor never calls driving (slow traffic): JS runs a short GPS check.
        if (!enter && e.activityType == DetectedActivity.STILL && System.currentTimeMillis() >= AutoConfig.probeAfter(context)) startCandidate = true
        EventLog.add(
          context,
          "activity",
          mapOf(
            "activity" to activityName(e.activityType),
            "transition" to if (e.transitionType == ActivityTransition.ACTIVITY_TRANSITION_ENTER) "enter" else "exit",
            "eventAt" to wallClock(e.elapsedRealTimeNanos),
          ),
        )
      }
      when {
        AutoConfig.tripActive(context) -> AutoConfig.kick(context, "activity", foreground = false)
        AutoConfig.enabled(context) && startCandidate -> AutoConfig.kick(context, "activity", foreground = true)
      }
      return
    }
    if (ActivityRecognitionResult.hasResult(intent)) {
      val result = ActivityRecognitionResult.extractResult(intent) ?: return
      val best = result.mostProbableActivity
      EventLog.add(
        context,
        "sample",
        mapOf("activity" to activityName(best.type), "confidence" to best.confidence, "eventAt" to result.time),
      )
      if (AutoConfig.enabled(context) && !AutoConfig.tripActive(context) && best.type == DetectedActivity.IN_VEHICLE && best.confidence >= 75) {
        AutoConfig.kick(context, "sample", foreground = true)
      }
    }
  }
}
