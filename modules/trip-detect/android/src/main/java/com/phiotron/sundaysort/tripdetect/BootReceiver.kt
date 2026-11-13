package com.phiotron.sundaysort.tripdetect

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/** Activity-transition registrations don't survive a reboot or an app update: register again (P1-1, S1). */
class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val action = intent.action ?: return
    if (action != Intent.ACTION_BOOT_COMPLETED && action != Intent.ACTION_MY_PACKAGE_REPLACED &&
      action != "android.intent.action.QUICKBOOT_POWERON") return
    EventLog.add(context, "boot")
    if (!AutoConfig.enabled(context)) return
    val pending = goAsync()
    AutoConfig.registerTransitions(context) { e ->
      if (e != null) Log.w(AutoConfig.TAG, "re-register after $action failed: ${e.message}")
      pending.finish()
    }
  }
}
