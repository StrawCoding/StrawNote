package com.strawcoding.strawnote

import android.content.res.ColorStateList
import android.content.ComponentCallbacks2
import android.os.Bundle
import android.view.Gravity
import android.view.KeyEvent
import android.view.View
import android.webkit.WebSettings
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge
import androidx.coordinatorlayout.widget.CoordinatorLayout
import androidx.core.content.ContextCompat
import androidx.core.graphics.drawable.DrawableCompat
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.updateMargins
import androidx.lifecycle.lifecycleScope
import androidx.vectordrawable.graphics.drawable.VectorDrawableCompat
import com.strawcoding.strawnote.ai.AIActivity
import com.strawcoding.strawnote.plugin.AIButtonPlugin
import com.strawcoding.strawnote.plugin.AFFiNEThemePlugin
import com.strawcoding.strawnote.plugin.AuthPlugin
import com.strawcoding.strawnote.plugin.HashCashPlugin
import com.strawcoding.strawnote.plugin.NbStorePlugin
import com.strawcoding.strawnote.plugin.MobileBackPlugin
import com.strawcoding.strawnote.plugin.PreviewPlugin
import com.strawcoding.strawnote.plugin.SPenPlugin
import com.strawcoding.strawnote.service.GraphQLService
import com.strawcoding.strawnote.service.SSEService
import com.strawcoding.strawnote.service.WebService
import com.strawcoding.strawnote.utils.px2dp
import com.strawcoding.strawnote.utils.dp2px
import com.getcapacitor.BridgeActivity
import com.getcapacitor.WebViewListener
import com.google.android.material.floatingactionbutton.FloatingActionButton
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import javax.inject.Inject


@AndroidEntryPoint
class MainActivity : BridgeActivity(), AIButtonPlugin.Callback, AFFiNEThemePlugin.Callback,
    View.OnClickListener {

    @Inject
    lateinit var webService: WebService

    @Inject
    lateinit var sseService: SSEService

    @Inject
    lateinit var graphQLService: GraphQLService

    init {
        registerPlugins(
            listOf(
                AFFiNEThemePlugin::class.java,
                AIButtonPlugin::class.java,
                AuthPlugin::class.java,
                HashCashPlugin::class.java,
                NbStorePlugin::class.java,
                MobileBackPlugin::class.java,
                PreviewPlugin::class.java,
                SPenPlugin::class.java,
            )
        )
    }

    private fun spenPlugin(): SPenPlugin? {
        return bridge?.getPlugin("SPen")?.instance as? SPenPlugin
    }

    private val fab: FloatingActionButton by lazy {
        FloatingActionButton(this).apply {
            visibility = View.GONE
            layoutParams = CoordinatorLayout.LayoutParams(dp2px(52), dp2px(52)).apply {
                gravity = Gravity.END or Gravity.BOTTOM
                updateMargins(0, 0, dp2px(24), dp2px(86))
            }
            customSize = dp2px(52)
            setImageResource(R.drawable.ic_ai)
            setImageDrawable(
                VectorDrawableCompat.create(resources, R.drawable.ic_ai, theme)?.apply {
                    DrawableCompat.setTint(
                        this,
                        ContextCompat.getColor(context, R.color.affine_primary)
                    )
                })
            setOnClickListener(this@MainActivity)
            val parent = bridge.webView.parent as CoordinatorLayout
            parent.addView(this)
        }
    }

    private var navHeight = 0

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        ViewCompat.setOnApplyWindowInsetsListener(window.decorView) { v, insets ->
            navHeight = px2dp(insets.getInsets(WindowInsetsCompat.Type.navigationBars()).bottom)
            ViewCompat.onApplyWindowInsets(v, insets)
        }
    }

    override fun load() {
        super.load()
        configureAndroidIMEBridge()
        AuthInitializer.initialize(bridge)
        configureEditorWebView()
    }

    private fun configureAndroidIMEBridge() {
        val trustedOrigin = normalizeAffineOrigin(bridge.localUrl)
        bridge.setWebViewClient(AffineWebViewClient(bridge, trustedOrigin))
        bridge.addWebViewListener(object : WebViewListener() {
            override fun onPageCommitVisible(view: WebView?, url: String?) {
                (view as? AffineEditorWebView)?.updateAndroidIMEBridge(url, trustedOrigin)
            }
        })

        (bridge.webView as? AffineEditorWebView)?.updateAndroidIMEBridge(
            bridge.webView.url ?: bridge.localUrl,
            trustedOrigin,
        )
    }

    override fun onTrimMemory(level: Int) {
        super.onTrimMemory(level)
        if (level >= ComponentCallbacks2.TRIM_MEMORY_UI_HIDDEN) {
            bridge.webView.evaluateJavascript(
                "window.dispatchEvent(new Event('affine:memory-pressure'))",
                null,
            )
        }
    }

    private fun configureEditorWebView() {
        bridge.webView.apply {
            overScrollMode = View.OVER_SCROLL_NEVER
            isHorizontalScrollBarEnabled = false
            isVerticalScrollBarEnabled = false
            settings.apply {
                // Debug builds may point CAP_SERVER_URL at an HTTP dev server; release builds
                // should keep mixed content blocked.
                mixedContentMode = if (BuildConfig.DEBUG) {
                    WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
                } else {
                    WebSettings.MIXED_CONTENT_NEVER_ALLOW
                }
                setSupportZoom(false)
                builtInZoomControls = false
                displayZoomControls = false
            }
            (this as? AffineEditorWebView)?.configureStylusInput()
        }
    }

    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (spenPlugin()?.handleKeyEvent(event) == true) {
            return true
        }
        return super.dispatchKeyEvent(event)
    }

    override fun present() {
        lifecycleScope.launch {
            fab.show()
        }
    }

    override fun dismiss() {
        lifecycleScope.launch {
            fab.hide()
        }
    }

    override fun onThemeChanged(darkMode: Boolean) {
        lifecycleScope.launch {
            fab.backgroundTintList = ColorStateList.valueOf(
                ContextCompat.getColor(
                    this@MainActivity,
                    if (darkMode) {
                        R.color.layer_background_primary_dark
                    } else {
                        R.color.layer_background_primary
                    }
                )
            )
        }
    }

    override fun getSystemNavBarHeight(): Int {
        return navHeight
    }

    override fun onClick(v: View) {
        lifecycleScope.launch {
            webService.update(bridge)
            sseService.updateServer(bridge)
            graphQLService.updateServer(bridge)
            AIActivity.open(this@MainActivity)
        }
    }

}
