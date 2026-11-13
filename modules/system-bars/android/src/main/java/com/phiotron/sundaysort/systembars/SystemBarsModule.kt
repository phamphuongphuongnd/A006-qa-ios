package com.phiotron.sundaysort.systembars

import android.os.Build
import android.view.Window
import android.view.WindowInsetsController
import androidx.core.view.WindowInsetsControllerCompat
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.interfaces.ExtraWindowEventListener
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.Collections
import java.util.WeakHashMap

/**
 * B-12: the in-app theme (not the phone's) decides the nav bar buttons / scrim.
 *
 * androidx core's WindowInsetsControllerCompat(window, view) on API 30–34 only flips the legacy
 * SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR. Once anything has called setSystemBarsAppearance on the window
 * (PRIVATE_FLAG_APPEARANCE_CONTROLLED), the system ignores legacy flags, so the bar stayed light on a
 * Galaxy A13 (Android 14) with the app in Dark mode. Set the platform appearance directly as well.
 */
internal fun Window.applyNavigationBarLight(light: Boolean) {
  WindowInsetsControllerCompat(this, decorView).isAppearanceLightNavigationBars = light
  if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
    insetsController?.setSystemBarsAppearance(
      if (light) WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS else 0,
      WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS
    )
  }
}

class SystemBarsModule : Module(), ExtraWindowEventListener {
  private val reactContext get() = appContext.reactContext as? ReactApplicationContext

  override fun definition() = ModuleDefinition {
    Name("SundaySystemBars")

    OnCreate {
      reactContext?.addExtraWindowEventListener(this@SystemBarsModule)
    }

    OnDestroy {
      reactContext?.removeExtraWindowEventListener(this@SystemBarsModule)
    }

    AsyncFunction("setNavigationBarLight") { light: Boolean ->
      lastLight = light
      appContext.currentActivity?.window?.applyNavigationBarLight(light)
      extraWindows.forEach { it.applyNavigationBarLight(light) }
      return@AsyncFunction
    }.runOnQueue(Queues.MAIN)
  }

  // <Modal> (Sheet / Dialog) windows get the phone's light/dark from React Native's enableEdgeToEdge;
  // re-apply the app's choice after that has run.
  override fun onExtraWindowCreate(window: Window) {
    extraWindows.add(window)
    val light = lastLight ?: return
    window.decorView.post { window.applyNavigationBarLight(light) }
  }

  override fun onExtraWindowDestroy(window: Window) {
    extraWindows.remove(window)
  }

  companion object {
    private var lastLight: Boolean? = null
    private val extraWindows = Collections.newSetFromMap<Window>(WeakHashMap())
  }
}
