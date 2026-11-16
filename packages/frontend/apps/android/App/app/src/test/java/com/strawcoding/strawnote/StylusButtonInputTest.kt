package com.strawcoding.strawnote

import android.view.InputDevice
import android.view.KeyEvent
import android.view.MotionEvent
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.Robolectric
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], manifest = Config.NONE)
class StylusButtonInputTest {
    private fun motion(action: Int, buttons: Int, toolType: Int = MotionEvent.TOOL_TYPE_STYLUS, block: (MotionEvent) -> Unit) {
        val properties = MotionEvent.PointerProperties().apply {
            id = 0
            this.toolType = toolType
        }
        val coords = MotionEvent.PointerCoords().apply { x = 100f; y = 100f }
        val event = MotionEvent.obtain(1, 2, action, 1, arrayOf(properties), arrayOf(coords),
            0, buttons, 1f, 1f, 0, 0, InputDevice.SOURCE_STYLUS, 0)
        try { block(event) } finally { event.recycle() }
    }

    @Test
    fun hoverButtonOnPreKeycodeDevicesEmitsOneDownAndUp() {
        val seen = mutableListOf<Boolean>()
        val input = StylusButtonInput { pressed, _ -> seen.add(pressed) }
        motion(MotionEvent.ACTION_HOVER_MOVE, MotionEvent.BUTTON_STYLUS_PRIMARY) { input.handleMotionEvent(it) }
        motion(MotionEvent.ACTION_HOVER_MOVE, MotionEvent.BUTTON_STYLUS_PRIMARY) { input.handleMotionEvent(it) }
        motion(MotionEvent.ACTION_HOVER_MOVE, 0) { input.handleMotionEvent(it) }
        assertEquals(listOf(true, false), seen)
    }

    @Test
    fun genericButtonPressAndReleaseAreConsumedAndForwarded() {
        val seen = mutableListOf<Boolean>()
        val input = StylusButtonInput { pressed, _ -> seen.add(pressed) }
        motion(MotionEvent.ACTION_BUTTON_PRESS, MotionEvent.BUTTON_STYLUS_PRIMARY) {
            assertTrue(input.handleMotionEvent(it))
        }
        motion(MotionEvent.ACTION_BUTTON_RELEASE, 0) { assertTrue(input.handleMotionEvent(it)) }
        assertEquals(listOf(true, false), seen)
    }

    @Test
    fun stylusDriversUsingSecondaryButtonAlsoEmitOnePair() {
        val seen = mutableListOf<Boolean>()
        val input = StylusButtonInput { pressed, _ -> seen.add(pressed) }
        motion(MotionEvent.ACTION_BUTTON_PRESS, MotionEvent.BUTTON_SECONDARY) {
            assertTrue(input.handleMotionEvent(it))
        }
        motion(MotionEvent.ACTION_BUTTON_RELEASE, 0) { assertTrue(input.handleMotionEvent(it)) }
        assertEquals(listOf(true, false), seen)
    }

    @Test
    fun keyboardAndMotionReportsDoNotDoubleToggle() {
        val seen = mutableListOf<Boolean>()
        val input = StylusButtonInput { pressed, _ -> seen.add(pressed) }
        assertTrue(input.handleKeyEvent(KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_STYLUS_BUTTON_PRIMARY)))
        motion(MotionEvent.ACTION_HOVER_MOVE, MotionEvent.BUTTON_STYLUS_PRIMARY) { input.handleMotionEvent(it) }
        assertTrue(input.handleKeyEvent(KeyEvent(KeyEvent.ACTION_UP, KeyEvent.KEYCODE_STYLUS_BUTTON_PRIMARY)))
        motion(MotionEvent.ACTION_HOVER_MOVE, 0) { input.handleMotionEvent(it) }
        assertEquals(listOf(true, false), seen)
    }

    @Test
    fun tipContactWithVendorButtonBitsIsNotASideButtonClick() {
        val seen = mutableListOf<Boolean>()
        val input = StylusButtonInput { pressed, _ -> seen.add(pressed) }
        motion(MotionEvent.ACTION_DOWN, MotionEvent.BUTTON_PRIMARY or MotionEvent.BUTTON_STYLUS_PRIMARY) {
            assertFalse(input.handleMotionEvent(it))
        }
        motion(MotionEvent.ACTION_MOVE, MotionEvent.BUTTON_STYLUS_PRIMARY) { input.handleMotionEvent(it) }
        motion(MotionEvent.ACTION_UP, 0) { input.handleMotionEvent(it) }
        assertTrue(seen.isEmpty())
        assertFalse(input.handleKeyEvent(KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_BACK)))
    }

    @Test
    fun nativePalmRejectionDefaultsOffAndOnlyFiltersWhenEnabled() {
        val view = AffineEditorWebView(RuntimeEnvironment.getApplication(), Robolectric.buildAttributeSet().build())
        var delivered = 0
        view.setOnTouchListener { _, _ -> delivered++; true }
        assertFalse(view.palmRejectionEnabled)
        motion(MotionEvent.ACTION_HOVER_MOVE, 0) { view.dispatchGenericMotionEvent(it) }
        motion(MotionEvent.ACTION_DOWN, 0, MotionEvent.TOOL_TYPE_FINGER) { view.dispatchTouchEvent(it) }
        assertEquals(1, delivered)
        view.palmRejectionEnabled = true
        motion(MotionEvent.ACTION_HOVER_MOVE, 0) { view.dispatchGenericMotionEvent(it) }
        motion(MotionEvent.ACTION_DOWN, 0, MotionEvent.TOOL_TYPE_FINGER) { view.dispatchTouchEvent(it) }
        assertEquals(1, delivered)
        motion(MotionEvent.ACTION_DOWN, 0) { view.dispatchTouchEvent(it) }
        assertEquals(2, delivered)
        view.destroy()
    }
}
