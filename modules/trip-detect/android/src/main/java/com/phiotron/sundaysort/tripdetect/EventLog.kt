package com.phiotron.sundaysort.tripdetect

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/**
 * Persistent ring buffer of detection signals (activity transitions, Bluetooth, charging).
 * Receivers run while the JS runtime may be dead, so every signal is written here first;
 * the module replays it to JS (`getRecentEvents`) and emits it live when JS is running.
 *
 * S1 decides what to do with these signals (start / end a shift trip); this file only records them.
 */
internal object EventLog {
  private const val PREFS = "sundaysort_trip_detect"
  private const val KEY = "events"
  // B-88: a week of transitions, wake-ups and Bluetooth (not raw samples) — read back by "Share trip diagnostics".
  private const val MAX = 1000

  /** Set by the module while JS is alive. */
  @Volatile
  var listener: ((Map<String, Any?>) -> Unit)? = null

  private fun load(context: Context): JSONArray {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    return try {
      JSONArray(prefs.getString(KEY, "[]"))
    } catch (_: Exception) {
      JSONArray()
    }
  }

  @Synchronized
  fun add(context: Context, kind: String, extra: Map<String, Any?> = emptyMap()) {
    val event = mutableMapOf<String, Any?>("kind" to kind, "at" to System.currentTimeMillis())
    event.putAll(extra)
    val arr = load(context)
    arr.put(JSONObject(event))
    val trimmed = JSONArray()
    for (i in maxOf(0, arr.length() - MAX) until arr.length()) trimmed.put(arr.get(i))
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, trimmed.toString()).apply()
    listener?.invoke(event)
  }

  @Synchronized
  fun read(context: Context, sinceMs: Long): List<Map<String, Any?>> {
    val arr = load(context)
    val out = mutableListOf<Map<String, Any?>>()
    for (i in 0 until arr.length()) {
      val o = arr.getJSONObject(i)
      if (o.optLong("at") < sinceMs) continue
      val m = mutableMapOf<String, Any?>()
      o.keys().forEach { k -> m[k] = o.get(k) }
      out.add(m)
    }
    return out
  }

  @Synchronized
  fun clear(context: Context) {
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().remove(KEY).apply()
  }
}
