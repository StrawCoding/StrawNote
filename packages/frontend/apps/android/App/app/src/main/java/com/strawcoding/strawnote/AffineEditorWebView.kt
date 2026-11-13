package com.strawcoding.strawnote

import android.content.Context
import android.os.Build
import android.os.SystemClock
import android.util.AttributeSet
import android.view.MotionEvent
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputConnection
import android.view.inputmethod.InputMethodManager
import com.getcapacitor.CapacitorWebView

class AffineEditorWebView(
    context: Context,
    attrs: AttributeSet,
) : CapacitorWebView(context, attrs) {
    private val imeState = AndroidImeState()
    private var imeBridgeInstalled = false
    @Volatile
    private var isTrustedPage = false

    /** Reject finger/palm until this uptime ms (hover + contact + grace). */
    private var stylusActiveUntil = 0L

    private val imeBridge = AffineImeBridge(
        isTrustedPage = { this.isTrustedPage },
        clearComposingState = { imeState.nextClearRequestGeneration() },
        requestRestartInput = ::requestRestartInput,
        onEditorFocusedChanged = { focused -> imeState.editorFocused = focused },
    )

    /**
     * Prefer delivering stylus motion to page JS (brush / S Pen) instead of
     * Android handwriting IME capturing strokes.
     */
    fun configureStylusInput() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            try {
                val method =
                    javaClass.methods.firstOrNull {
                        it.name == "setStylusHandwritingEnabled" && it.parameterTypes.size == 1
                    }
                method?.invoke(this, false)
            } catch (_: Throwable) {
                // Older WebView implementations may lack the method.
            }
        }
        isNestedScrollingEnabled = false
    }

    private fun markStylusActive() {
        stylusActiveUntil =
            SystemClock.uptimeMillis() + StylusPalmRejection.STYLUS_GRACE_MS
        parent?.requestDisallowInterceptTouchEvent(true)
    }

    private fun isStylusActive(now: Long = SystemClock.uptimeMillis()): Boolean =
        now < stylusActiveUntil

    /**
     * S Pen hover arms palm rejection *before* contact, so a resting palm's first
     * touch does not sneak through in the gap between pen approach and touch-down.
     */
    override fun dispatchGenericMotionEvent(event: MotionEvent): Boolean {
        if (StylusPalmRejection.isHoverStylusArming(event)) {
            markStylusActive()
        }
        return super.dispatchGenericMotionEvent(event)
    }

    /**
     * While the stylus is (or was just) active, strip non-stylus pointers from the
     * MotionEvent stream before Chromium sees them.
     */
    override fun dispatchTouchEvent(event: MotionEvent): Boolean {
        val now = SystemClock.uptimeMillis()

        if (StylusPalmRejection.eventContainsStylus(event)) {
            markStylusActive()
        }

        if (!isStylusActive(now)) {
            return super.dispatchTouchEvent(event)
        }

        val keep = StylusPalmRejection.stylusKeepIndices(event)
        if (keep.size == event.pointerCount) {
            return super.dispatchTouchEvent(event)
        }
        if (keep.isEmpty()) {
            // Pure palm/finger while pen is active — swallow.
            return true
        }

        val filtered = StylusPalmRejection.buildFilteredEvent(event, keep) ?: return true
        return try {
            super.dispatchTouchEvent(filtered)
        } finally {
            filtered.recycle()
        }
    }

    fun updateAndroidIMEBridge(url: String?, expectedOrigin: String?) {
        val shouldInstallBridge = isTrustedAffineOrigin(url, expectedOrigin)
        if (shouldInstallBridge == imeBridgeInstalled) {
            isTrustedPage = shouldInstallBridge
            return
        }

        if (shouldInstallBridge) {
            addJavascriptInterface(imeBridge, AFFINE_IME_BRIDGE_NAME)
            imeBridgeInstalled = true
            isTrustedPage = true
        } else {
            isTrustedPage = false
            imeBridgeInstalled = false
            removeJavascriptInterface(AFFINE_IME_BRIDGE_NAME)
            imeState.editorFocused = false
        }
    }

    override fun onCreateInputConnection(outAttrs: EditorInfo): InputConnection? {
        val connection = super.onCreateInputConnection(outAttrs) ?: return null
        return AffineInputConnection(
            connection,
            imeState,
            dispatchDeleteBackward = {
                dispatchAndroidEditorInput(this, AndroidImeInputType.BACKWARD_DELETE)
            },
            dispatchDeleteForward = {
                dispatchAndroidEditorInput(this, AndroidImeInputType.FORWARD_DELETE)
            },
        )
    }

    private fun requestRestartInput(delayMs: Long) {
        val restartGeneration = imeState.nextRestartGeneration()
        if (delayMs <= 0L) {
            post { restartInput() }
            return
        }

        postDelayed(
            {
                if (restartGeneration != imeState.restartInputGeneration) return@postDelayed
                restartInput()
            },
            delayMs,
        )
    }

    private fun restartInput() {
        val inputMethodManager =
            context.getSystemService(Context.INPUT_METHOD_SERVICE) as? InputMethodManager
        inputMethodManager?.restartInput(this)
    }
}
