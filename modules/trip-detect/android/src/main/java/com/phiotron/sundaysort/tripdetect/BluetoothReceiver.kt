package com.phiotron.sundaysort.tripdetect

import android.annotation.SuppressLint
import android.bluetooth.BluetoothDevice
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

/** Van Bluetooth connect / disconnect (P1-1: connect is a start signal; disconnect never ends a trip). */
class BluetoothReceiver : BroadcastReceiver() {
  @SuppressLint("MissingPermission")
  override fun onReceive(context: Context, intent: Intent) {
    val kind = when (intent.action) {
      BluetoothDevice.ACTION_ACL_CONNECTED -> "bt_connected"
      BluetoothDevice.ACTION_ACL_DISCONNECTED -> "bt_disconnected"
      else -> return
    }
    val device: BluetoothDevice? = if (Build.VERSION.SDK_INT >= 33) {
      intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE, BluetoothDevice::class.java)
    } else {
      @Suppress("DEPRECATION")
      intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE)
    }
    val name = try {
      device?.name
    } catch (_: SecurityException) {
      null
    }
    EventLog.add(context, kind, mapOf("address" to device?.address, "name" to name))
    val van = AutoConfig.vanAddress(context)
    if (kind == "bt_connected" && van != null && van.equals(device?.address, ignoreCase = true)) {
      if (AutoConfig.tripActive(context)) AutoConfig.kick(context, "bluetooth", foreground = false)
      else if (AutoConfig.enabled(context)) AutoConfig.kick(context, "bluetooth", foreground = true)
    }
  }
}
