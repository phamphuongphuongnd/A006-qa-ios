package com.phiotron.sundaysort.tripdetect

import android.Manifest
import android.annotation.SuppressLint
import android.app.PendingIntent
import android.bluetooth.BluetoothManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.os.BatteryManager
import android.os.Build
import androidx.core.content.ContextCompat
import com.google.android.gms.location.ActivityRecognition
import expo.modules.location.AppForegroundedSingleton
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Skeleton for S1 (automatic trips). What works now:
 * - background activity transitions (driving / walking / cycling / still, enter + exit) → EventLog
 * - optional raw sampling (P3 device check, S1 tuning) → EventLog
 * - van Bluetooth ACL connect / disconnect → EventLog (manifest receiver, works with the app closed)
 * - charging state; power connect / disconnect only while a runtime receiver is alive (Android 8+ limit)
 * - bonded Bluetooth devices for the "Van Bluetooth" picker
 * S1: receivers wake the JS task "SundayTripDetect" (TripDetectTaskService) for start / end decisions,
 * BootReceiver registers transitions again after reboot / update, AutoConfig keeps what they need.
 */
class TripDetectModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private var powerReceiver: BroadcastReceiver? = null

  private fun pendingIntent(requestCode: Int): PendingIntent {
    val intent = Intent(context, TripDetectReceiver::class.java)
    // Activity recognition fills the intent with results, so it must be mutable on Android 12+.
    val flags = PendingIntent.FLAG_UPDATE_CURRENT or
      (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_MUTABLE else 0)
    return PendingIntent.getBroadcast(context, requestCode, intent, flags)
  }

  private fun hasActivityPermission(): Boolean = AutoConfig.hasActivityPermission(context)

  private fun unregisterPower() {
    powerReceiver?.let { runCatching { context.unregisterReceiver(it) } }
    powerReceiver = null
  }

  @SuppressLint("MissingPermission")
  override fun definition() = ModuleDefinition {
    Name("SundayTripDetect")

    Events("onSignal")

    OnStartObserving {
      EventLog.listener = { sendEvent("onSignal", it) }
    }

    OnStopObserving {
      EventLog.listener = null
    }

    Function("hasActivityPermission") { hasActivityPermission() }

    AsyncFunction("startTransitions") { promise: Promise ->
      AutoConfig.registerTransitions(context) { e ->
        if (e == null) promise.resolve(null) else promise.reject("E_TRANSITIONS", e.message, e)
      }
    }

    AsyncFunction("stopTransitions") { promise: Promise ->
      AutoConfig.unregisterTransitions(context) { promise.resolve(null) }
    }

    /** S1: what the receivers need while JS is dead (see AutoConfig). */
    Function("configure") { cfg: Map<String, Any?> -> AutoConfig.write(context, cfg) }

    Function("scheduleWake") { atMs: Double -> AutoConfig.scheduleWake(context, atMs.toLong()) }

    Function("cancelWake") { AutoConfig.cancelWake(context) }

    /**
     * Can automatic trips work right now? `restricted`: the system or the user stopped background work (Samsung
     * "sleeping apps" / background restriction) → "paused". `batteryOptimized`: not "Unrestricted" → may miss drives.
     */
    Function("health") {
      val c = context
      val am = c.getSystemService(Context.ACTIVITY_SERVICE) as android.app.ActivityManager
      val pm = c.getSystemService(Context.POWER_SERVICE) as android.os.PowerManager
      val bucket = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
        (c.getSystemService(Context.USAGE_STATS_SERVICE) as android.app.usage.UsageStatsManager).appStandbyBucket
      } else 10
      val bgLocation = Build.VERSION.SDK_INT < Build.VERSION_CODES.Q ||
        ContextCompat.checkSelfPermission(c, Manifest.permission.ACCESS_BACKGROUND_LOCATION) == PackageManager.PERMISSION_GRANTED
      mapOf(
        "activityPermission" to hasActivityPermission(),
        "backgroundLocation" to bgLocation,
        "batteryOptimized" to !pm.isIgnoringBatteryOptimizations(c.packageName),
        "backgroundRestricted" to (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P && am.isBackgroundRestricted),
        // 45 = STANDBY_BUCKET_RESTRICTED (Android 12+; Samsung "deep sleeping").
        "restrictedBucket" to (bucket >= 45),
        "registered" to (AutoConfig.registeredAt(context) > 0),
        "manufacturer" to Build.MANUFACTURER.lowercase(),
      )
    }

    /** Dev builds: feed a fake signal through the same path as a real one (S-07d dev tools, adb tests). */
    Function("simulate") { kind: String, activity: String?, transition: String?, address: String? ->
      val extra = mutableMapOf<String, Any?>()
      if (activity != null) {
        extra["activity"] = activity
        extra["transition"] = transition ?: "enter"
        extra["eventAt"] = System.currentTimeMillis()
      }
      if (address != null) extra["address"] = address
      EventLog.add(context, kind, extra)
      AutoConfig.kick(context, "simulate", foreground = false)
    }

    /** Raw activity results about every `intervalMs` (device checks / tuning; battery-heavy, keep it short). */
    AsyncFunction("startSampling") { intervalMs: Double, promise: Promise ->
      if (!hasActivityPermission()) {
        promise.reject("E_PERMISSION", "Activity recognition not granted", null)
        return@AsyncFunction
      }
      ActivityRecognition.getClient(context)
        .requestActivityUpdates(intervalMs.toLong(), pendingIntent(REQ_SAMPLES))
        .addOnSuccessListener { promise.resolve(null) }
        .addOnFailureListener { promise.reject("E_SAMPLING", it.message, it) }
    }

    AsyncFunction("stopSampling") { promise: Promise ->
      if (!hasActivityPermission()) {
        promise.resolve(null)
        return@AsyncFunction
      }
      ActivityRecognition.getClient(context)
        .removeActivityUpdates(pendingIntent(REQ_SAMPLES))
        .addOnCompleteListener { promise.resolve(null) }
    }

    Function("getRecentEvents") { sinceMs: Double -> EventLog.read(context, sinceMs.toLong()) }

    /**
     * A13-13 (Android 14, van Bluetooth with the app closed): expo-location refuses `startLocationUpdatesAsync` with a
     * foreground service unless an activity is on screen — even when Android itself allows it (the receiver's start
     * exemption + "Allow all the time"). With background location granted, tell it the app may start one now; Android
     * still has the last word (a refusal throws → "Tap to record"). False without background location.
     */
    Function("allowBackgroundLocationStart") {
      val bg = Build.VERSION.SDK_INT < Build.VERSION_CODES.Q ||
        ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_BACKGROUND_LOCATION) == PackageManager.PERMISSION_GRANTED
      if (bg) AppForegroundedSingleton.isForegrounded = true
      bg
    }

    /** Diagnostics: what the JS task decided (e.g. an automatic start and why it failed), next to the signals. */
    Function("log") { kind: String, extra: Map<String, Any?> -> EventLog.add(context, kind, extra) }

    Function("clearEvents") { EventLog.clear(context) }

    Function("isCharging") {
      (context.getSystemService(Context.BATTERY_SERVICE) as BatteryManager).isCharging
    }

    /** Power connect / disconnect are not delivered to manifest receivers (Android 8+): runtime receiver. */
    Function("watchPower") { on: Boolean ->
      unregisterPower()
      if (on) {
        val r = object : BroadcastReceiver() {
          override fun onReceive(c: Context, i: Intent) {
            EventLog.add(c, if (i.action == Intent.ACTION_POWER_CONNECTED) "power_connected" else "power_disconnected")
          }
        }
        val filter = IntentFilter().apply {
          addAction(Intent.ACTION_POWER_CONNECTED)
          addAction(Intent.ACTION_POWER_DISCONNECTED)
        }
        ContextCompat.registerReceiver(context, r, filter, ContextCompat.RECEIVER_NOT_EXPORTED)
        powerReceiver = r
      }
    }

    /** Paired devices for the "Van Bluetooth" picker; empty without BLUETOOTH_CONNECT (Android 12+). */
    Function("getBondedDevices") {
      val granted = Build.VERSION.SDK_INT < Build.VERSION_CODES.S ||
        ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED
      val adapter = (context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager)?.adapter
      if (!granted || adapter == null) {
        emptyList<Map<String, String?>>()
      } else {
        adapter.bondedDevices.map { mapOf("address" to it.address, "name" to it.name) }
      }
    }

    OnDestroy {
      unregisterPower()
      EventLog.listener = null
    }
  }

  companion object {
    private const val REQ_SAMPLES = 4102
  }
}
