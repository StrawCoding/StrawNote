package com.strawcoding.strawnote.plugin

import android.os.Build
import android.view.KeyEvent
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * Forwards S Pen / stylus button events into the WebView as
 * `window.dispatchEvent(new CustomEvent('strawnote:spen-button', { detail }))`.
 *
 * Tip + barrel while on-screen are primarily handled by Pointer Events in JS;
 * this plugin covers detached button clicks and API 34+ stylus keycodes.
 */
@CapacitorPlugin(name = "SPen")
class SPenPlugin : Plugin() {
    @PluginMethod
    fun ping(call: PluginCall) {
        call.resolve(JSObject().put("ok", true))
    }

    fun handleKeyEvent(event: KeyEvent): Boolean {
        if (!isStylusButtonKey(event)) return false

        val action = when (event.action) {
            KeyEvent.ACTION_DOWN -> if (event.repeatCount == 0) "down" else null
            KeyEvent.ACTION_UP -> "up"
            else -> null
        } ?: return false

        val detail = JSObject().apply {
            put("action", action)
            put("pressed", action == "down")
            put("keyCode", event.keyCode)
        }
        notifyListeners("spenButton", detail)
        dispatchToWeb(detail)
        return true
    }

    private fun dispatchToWeb(detail: JSObject) {
        val js = """
            (function(){
              try {
                window.dispatchEvent(new CustomEvent('strawnote:spen-button', {
                  detail: ${detail.toString()}
                }));
              } catch (e) {}
            })();
        """.trimIndent()
        activity.runOnUiThread {
            bridge?.webView?.evaluateJavascript(js, null)
        }
    }

    companion object {
        fun isStylusButtonKey(event: KeyEvent): Boolean {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                // API 34+: KEYCODE_STYLUS_BUTTON_PRIMARY / SECONDARY
                val primary = KeyEvent.keyCodeFromString("KEYCODE_STYLUS_BUTTON_PRIMARY")
                val secondary = KeyEvent.keyCodeFromString("KEYCODE_STYLUS_BUTTON_SECONDARY")
                if (event.keyCode == primary || event.keyCode == secondary) {
                    return true
                }
            }
            // Some Samsung builds deliver S Pen click as KEYCODE_UNKNOWN with source stylus
            val source = event.source
            val isStylusSource =
                (source and android.view.InputDevice.SOURCE_STYLUS) ==
                    android.view.InputDevice.SOURCE_STYLUS
            return isStylusSource && event.keyCode == KeyEvent.KEYCODE_UNKNOWN
        }
    }
}
