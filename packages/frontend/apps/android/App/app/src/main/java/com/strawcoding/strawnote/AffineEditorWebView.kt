package com.strawcoding.strawnote

import android.content.Context
import android.os.Build
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
    private var stylusActive = false

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

    override fun onTouchEvent(event: MotionEvent): Boolean {
        val tool = event.getToolType(0)
        val isStylus =
            tool == MotionEvent.TOOL_TYPE_STYLUS || tool == MotionEvent.TOOL_TYPE_ERASER

        if (isStylus) {
            stylusActive = event.actionMasked != MotionEvent.ACTION_UP &&
                event.actionMasked != MotionEvent.ACTION_CANCEL
            // Keep parent scrollers from stealing S Pen strokes.
            parent?.requestDisallowInterceptTouchEvent(true)
        } else if (stylusActive && tool == MotionEvent.TOOL_TYPE_FINGER) {
            // Palm rejection while stylus is down: drop finger touches.
            return true
        }

        return super.onTouchEvent(event)
    }

    override fun onGenericMotionEvent(event: MotionEvent): Boolean {
        // Hover / button changes from S Pen while near the screen.
        if (event.getToolType(0) == MotionEvent.TOOL_TYPE_STYLUS ||
            event.getToolType(0) == MotionEvent.TOOL_TYPE_ERASER
        ) {
            parent?.requestDisallowInterceptTouchEvent(true)
        }
        return super.onGenericMotionEvent(event)
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
