package com.strawcoding.strawnote

import android.view.MotionEvent

/**
 * Native-layer S Pen palm rejection helpers for [AffineEditorWebView].
 *
 * Browsers only see pointer type — they cannot tell a resting palm from a finger tap.
 * Filtering must happen on Android [MotionEvent] tool types before Chromium synthesizes
 * PointerEvents. Approach inspired by public AFFiNE Galaxy Tab clients (hover arming +
 * multi-pointer strip while stylus is active).
 */
object StylusPalmRejection {
    /** Keep rejecting finger touches briefly after the pen lifts / leaves hover. */
    const val STYLUS_GRACE_MS = 400L

    fun isStylusTool(toolType: Int): Boolean =
        toolType == MotionEvent.TOOL_TYPE_STYLUS ||
            toolType == MotionEvent.TOOL_TYPE_ERASER

    fun eventContainsStylus(event: MotionEvent): Boolean {
        for (i in 0 until event.pointerCount) {
            if (isStylusTool(event.getToolType(i))) return true
        }
        return false
    }

    fun isHoverStylusArming(event: MotionEvent): Boolean {
        val action = event.actionMasked
        if (
            action != MotionEvent.ACTION_HOVER_ENTER &&
            action != MotionEvent.ACTION_HOVER_MOVE
        ) {
            return false
        }
        return isStylusTool(event.getToolType(0))
    }

    fun stylusKeepIndices(event: MotionEvent): List<Int> =
        (0 until event.pointerCount).filter { isStylusTool(event.getToolType(it)) }

    /**
     * Remap DOWN/UP actions when a dropped finger pointer owned the action index.
     * Pure helper so JVM unit tests can cover without mocking [MotionEvent.obtain].
     */
    fun remappedAction(
        origActionMasked: Int,
        origActionIndex: Int,
        keep: List<Int>,
    ): Int {
        return when (origActionMasked) {
            MotionEvent.ACTION_POINTER_DOWN, MotionEvent.ACTION_POINTER_UP -> {
                val remappedIndex = keep.indexOf(origActionIndex)
                when {
                    remappedIndex == -1 -> MotionEvent.ACTION_MOVE
                    origActionMasked == MotionEvent.ACTION_POINTER_DOWN ->
                        MotionEvent.ACTION_POINTER_DOWN or
                            (remappedIndex shl MotionEvent.ACTION_POINTER_INDEX_SHIFT)
                    else ->
                        MotionEvent.ACTION_POINTER_UP or
                            (remappedIndex shl MotionEvent.ACTION_POINTER_INDEX_SHIFT)
                }
            }
            else -> origActionMasked
        }
    }

    fun remappedAction(src: MotionEvent, keep: List<Int>): Int =
        remappedAction(src.actionMasked, src.actionIndex, keep)

    fun buildFilteredEvent(src: MotionEvent, keep: List<Int>): MotionEvent? {
        if (keep.isEmpty()) return null
        val count = keep.size
        val props = Array(count) { MotionEvent.PointerProperties() }
        val coords = Array(count) { MotionEvent.PointerCoords() }
        for ((newIndex, origIndex) in keep.withIndex()) {
            src.getPointerProperties(origIndex, props[newIndex])
            src.getPointerCoords(origIndex, coords[newIndex])
        }
        val newAction = remappedAction(src, keep)
        return runCatching {
            MotionEvent.obtain(
                src.downTime,
                src.eventTime,
                newAction,
                count,
                props,
                coords,
                src.metaState,
                src.buttonState,
                src.xPrecision,
                src.yPrecision,
                src.deviceId,
                src.edgeFlags,
                src.source,
                src.flags,
            )
        }.getOrNull()
    }
}
