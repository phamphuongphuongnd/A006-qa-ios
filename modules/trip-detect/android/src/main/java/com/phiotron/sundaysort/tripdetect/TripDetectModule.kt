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
import com.google.android.gms.location.ActivityTransition
import com.google.android.gms.location.ActivityTransitionRequest
import com.google.android.gms.location.DetectedActivity
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
 * S1 adds: starting / ending trips from these signals, re-registering after reboot (BOOT_COMPLETED).
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

  private fun hasActivityPermission(): Boolean =
    Build.VERSION.SDK_INT < Build.VERSION_CODES.Q ||
      ContextCompat.checkSelfPermission(context, Manifest.permission.ACTIVITY_RECOGNITION) == PackageManager.PERMISSION_GRANTED

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
      if (!hasActivityPermission()) {
        promise.reject("E_PERMISSION", "Activity recognition not granted", null)
        return@AsyncFunction
      }
      val types = listOf(DetectedActivity.IN_VEHICLE, DetectedActivity.WALKING, DetectedActivity.ON_BICYCLE, DetectedActivity.STILL)
      val transitions = types.flatMap { t ->
        listOf(ActivityTransition.ACTIVITY_TRANSITION_ENTER, ActivityTransition.ACTIVITY_TRANSITION_EXIT).map { tr ->
          ActivityTransition.Builder().setActivityType(t).setActivityTransition(tr).build()
        }
      }
      ActivityRecognition.getClient(context)
        .requestActivityTransitionUpdates(ActivityTransitionRequest(transitions), pendingIntent(REQ_TRANSITIONS))
        .addOnSuccessListener { promise.resolve(null) }
        .addOnFailureListener { promise.reject("E_TRANSITIONS", it.message, it) }
    }

    AsyncFunction("stopTransitions") { promise: Promise ->
      if (!hasActivityPermission()) {
        promise.resolve(null)
        return@AsyncFunction
      }
      ActivityRecognition.getClient(context)
        .removeActivityTransitionUpdates(pendingIntent(REQ_TRANSITIONS))
        .addOnCompleteListener { promise.resolve(null) }
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
    private const val REQ_TRANSITIONS = 4101
    private const val REQ_SAMPLES = 4102
  }
}
