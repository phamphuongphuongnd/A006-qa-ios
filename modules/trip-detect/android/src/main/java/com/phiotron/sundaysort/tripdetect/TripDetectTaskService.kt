package com.phiotron.sundaysort.tripdetect

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Bundle
import android.util.Log
import androidx.core.app.NotificationCompat
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

/**
 * Runs the JS task "SundayTripDetect" (src/features/trips/backgroundTask.ts) without UI, also while the app is locked
 * or closed. Started by the receivers; as a short foreground service ("location" type) when no trip is recording,
 * so the JS side may start GPS recording from the background (Android 12+ exemption for activity-transition /
 * Bluetooth / boot events).
 */
class TripDetectTaskService : HeadlessJsTaskService() {
  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.getBooleanExtra("fg", false) == true) {
      try {
        val n = notification()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
          startForeground(NOTIF_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)
        } else {
          startForeground(NOTIF_ID, n)
        }
      } catch (e: Exception) {
        Log.w(AutoConfig.TAG, "startForeground failed: ${e.message}")
      }
    }
    return super.onStartCommand(intent, flags, startId)
  }

  override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig {
    val extras = Bundle()
    extras.putString("reason", intent?.getStringExtra("reason") ?: "")
    return HeadlessJsTaskConfig(TASK, Arguments.fromBundle(extras), 60_000, true)
  }

  override fun onDestroy() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) stopForeground(STOP_FOREGROUND_REMOVE)
    super.onDestroy()
  }

  private fun notification(): Notification {
    val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && nm.getNotificationChannel(CHANNEL) == null) {
      val ch = NotificationChannel(CHANNEL, "Automatic trip checks", NotificationManager.IMPORTANCE_MIN)
      ch.setShowBadge(false)
      nm.createNotificationChannel(ch)
    }
    return NotificationCompat.Builder(this, CHANNEL)
      .setSmallIcon(applicationInfo.icon)
      .setContentTitle("Checking for a trip…")
      .setPriority(NotificationCompat.PRIORITY_MIN)
      .setSilent(true)
      .build()
  }

  companion object {
    const val TASK = "SundayTripDetect"
    private const val CHANNEL = "trip-detect"
    private const val NOTIF_ID = 4110
  }
}
