package com.strawcoding.strawnote

import android.view.MotionEvent
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class StylusPalmRejectionTest {
    @Test
    fun stylusAndEraserAreStylusTools() {
        assertTrue(StylusPalmRejection.isStylusTool(MotionEvent.TOOL_TYPE_STYLUS))
        assertTrue(StylusPalmRejection.isStylusTool(MotionEvent.TOOL_TYPE_ERASER))
        assertFalse(StylusPalmRejection.isStylusTool(MotionEvent.TOOL_TYPE_FINGER))
        assertFalse(StylusPalmRejection.isStylusTool(MotionEvent.TOOL_TYPE_MOUSE))
        assertFalse(StylusPalmRejection.isStylusTool(MotionEvent.TOOL_TYPE_UNKNOWN))
    }

    @Test
    fun remappedActionFallsBackToMoveWhenActionPointerDropped() {
        val action =
            StylusPalmRejection.remappedAction(
                origActionMasked = MotionEvent.ACTION_POINTER_UP,
                origActionIndex = 1,
                keep = listOf(0),
            )
        assertEquals(MotionEvent.ACTION_MOVE, action)
    }

    @Test
    fun remappedActionKeepsPointerIndexWhenStillPresent() {
        val action =
            StylusPalmRejection.remappedAction(
                origActionMasked = MotionEvent.ACTION_POINTER_DOWN,
                origActionIndex = 1,
                keep = listOf(0, 1),
            )
        val expected =
            MotionEvent.ACTION_POINTER_DOWN or (1 shl MotionEvent.ACTION_POINTER_INDEX_SHIFT)
        assertEquals(expected, action)
    }
}
