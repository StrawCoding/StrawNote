package com.strawcoding.strawnote

import android.os.Build
import android.view.InputDevice
import android.view.KeyEvent
import android.view.MotionEvent

/** Merge keyboard and hover/button motion reports into one physical button stream. */
class StylusButtonInput(private val emit: (Boolean, Int?) -> Unit) {
    private var keyPressed = false
    private var motionPressed = false
    private var reportedPressed = false

    private fun report(keyCode: Int? = null) {
        val pressed = keyPressed || motionPressed
        if (pressed == reportedPressed) return
        reportedPressed = pressed
        emit(pressed, keyCode)
    }

    fun handleKeyEvent(event: KeyEvent): Boolean {
        if (!isStylusButtonKey(event)) return false
        when (event.action) {
            KeyEvent.ACTION_DOWN -> {
                if (event.repeatCount != 0) return true
                keyPressed = true
            }
            KeyEvent.ACTION_UP -> keyPressed = false
            else -> return false
        }
        report(event.keyCode)
        return true
    }

    fun handleMotionEvent(event: MotionEvent): Boolean {
        if (event.pointerCount == 0) return false
        if (!StylusPalmRejection.isStylusTool(event.getToolType(0)) &&
            !event.isFromSource(InputDevice.SOURCE_STYLUS)) return false
        val mask = MotionEvent.BUTTON_STYLUS_PRIMARY or MotionEvent.BUTTON_STYLUS_SECONDARY
        when (event.actionMasked) {
            MotionEvent.ACTION_BUTTON_PRESS -> {
                if ((event.actionButton or event.buttonState) and mask == 0) return false
                motionPressed = true
            }
            MotionEvent.ACTION_BUTTON_RELEASE -> {
                if (event.actionButton and mask == 0 && !motionPressed) return false
                motionPressed = event.buttonState and mask != 0
            }
            MotionEvent.ACTION_HOVER_ENTER, MotionEvent.ACTION_HOVER_MOVE ->
                motionPressed = event.buttonState and mask != 0
            MotionEvent.ACTION_HOVER_EXIT -> motionPressed = false
            // Do not mistake plain tip contact's vendor-specific button bits for a click.
            else -> return false
        }
        report()
        return event.actionMasked == MotionEvent.ACTION_BUTTON_PRESS ||
            event.actionMasked == MotionEvent.ACTION_BUTTON_RELEASE
    }

    companion object {
        fun isStylusButtonKey(event: KeyEvent): Boolean {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                if (event.keyCode == KeyEvent.KEYCODE_STYLUS_BUTTON_PRIMARY ||
                    event.keyCode == KeyEvent.KEYCODE_STYLUS_BUTTON_SECONDARY) return true
            }
            return event.isFromSource(InputDevice.SOURCE_STYLUS) &&
                event.keyCode == KeyEvent.KEYCODE_UNKNOWN
        }
    }
}
