package com.phiotron.sundaysort.tripdetect

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.SystemClock
import com.google.android.gms.location.ActivityRecognitionResult
import com.google.android.gms.location.ActivityTransition
import com.google.android.gms.location.ActivityTransitionResult
import com.google.android.gms.location.DetectedActivity

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
    if (ActivityTransitionResult.hasResult(intent)) {
      val result = ActivityTransitionResult.extractResult(intent) ?: return
      for (e in result.transitionEvents) {
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
    }
  }
}
