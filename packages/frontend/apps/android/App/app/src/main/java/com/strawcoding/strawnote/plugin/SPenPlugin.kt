package com.strawcoding.strawnote.plugin

import android.view.KeyEvent
import android.view.MotionEvent
import com.strawcoding.strawnote.AffineEditorWebView
import com.strawcoding.strawnote.StylusButtonInput
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * Send one button stream through Capacitor. AndroidSPenAdapter forwards that
 * stream to the editor; direct evaluateJavascript delivery would duplicate it.
 */
@CapacitorPlugin(name = "SPen")
class SPenPlugin : Plugin() {
    private val input = StylusButtonInput { pressed, keyCode ->
        val detail = JSObject().apply {
            put("action", if (pressed) "down" else "up")
            put("pressed", pressed)
            keyCode?.let { put("keyCode", it) }
        }
        notifyListeners("spenButton", detail)
    }
    @PluginMethod
    fun ping(call: PluginCall) {
        call.resolve(JSObject().put("ok", true))
    }

    @PluginMethod
    fun setPalmRejection(call: PluginCall) {
        val enabled = call.getBoolean("enabled", false) ?: false
        activity.runOnUiThread {
            (bridge?.webView as? AffineEditorWebView)?.palmRejectionEnabled = enabled
            call.resolve()
        }
    }

    fun handleKeyEvent(event: KeyEvent): Boolean = input.handleKeyEvent(event)

    fun handleMotionEvent(event: MotionEvent): Boolean = input.handleMotionEvent(event)

    companion object {
        fun isStylusButtonKey(event: KeyEvent): Boolean = StylusButtonInput.isStylusButtonKey(event)
    }
}
