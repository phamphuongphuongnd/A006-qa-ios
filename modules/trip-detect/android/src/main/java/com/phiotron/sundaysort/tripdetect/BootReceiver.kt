package com.phiotron.sundaysort.tripdetect

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * Activity-transition registrations don't survive a reboot or an app update: register again (P1-1, S1).
 * B-129: a trip that was recording (automatic or started by the driver) gets its GPS back right away — before, it only
 * came back when the app was next opened while the notice still said "recording".
 */
class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val action = intent.action ?: return
    if (action != Intent.ACTION_BOOT_COMPLETED && action != Intent.ACTION_MY_PACKAGE_REPLACED &&
      action != "android.intent.action.QUICKBOOT_POWERON") return
    EventLog.add(context, "boot")
    if (AutoConfig.tripActive(context)) AutoConfig.kick(context, "restart", foreground = true)
    if (!AutoConfig.enabled(context)) return
    val pending = goAsync()
    AutoConfig.registerTransitions(context) { e ->
      if (e != null) Log.w(AutoConfig.TAG, "re-register after $action failed: ${e.message}")
      pending.finish()
    }
  }
}
