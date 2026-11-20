package io.github.gauciv.kontrata

import android.app.Application
import android.content.Context
import com.google.firebase.Firebase
import com.google.firebase.appcheck.appCheck
import com.google.firebase.appcheck.debug.DebugAppCheckProviderFactory
import com.google.firebase.initialize
import com.google.firebase.remoteconfig.remoteConfig
import com.google.firebase.remoteconfig.remoteConfigSettings
import org.json.JSONObject

class KontrataApp : Application() {
    override fun onCreate() {
        super.onCreate()
        Firebase.initialize(context = this)
        // App Check is ENFORCED for Firebase AI Logic. Without Google Play distribution there is no Play Integrity (and a
        // custom attestation server would need the paid Blaze plan), so the judging build uses the debug provider, which
        // the hackathon accepts. The token is only compiled into DEBUG builds from local.properties (never committed),
        // the project has no billing account (worst case = free-tier quota), and the token is revoked after judging.
        if (BuildConfig.APP_CHECK_DEBUG_TOKEN.isNotEmpty()) seedDebugSecret(this, BuildConfig.APP_CHECK_DEBUG_TOKEN)
        Firebase.appCheck.installAppCheckProviderFactory(DebugAppCheckProviderFactory.getInstance())
        Config.init()
    }

    /** The debug provider reads its secret from this store; seeding it gives every install the registered token. */
    private fun seedDebugSecret(context: Context, token: String) {
        val app = com.google.firebase.FirebaseApp.getInstance()
        context.getSharedPreferences("com.google.firebase.appcheck.debug.store.${app.persistenceKey}", MODE_PRIVATE)
            .edit().putString("com.google.firebase.appcheck.debug.DEBUG_SECRET", token).apply()
    }
}

/** Remote Config: same keys and defaults as the web app (firebase/remoteconfig.template.json). */
object Config {
    private val rc get() = Firebase.remoteConfig

    fun init() {
        rc.setConfigSettingsAsync(remoteConfigSettings { minimumFetchIntervalInSeconds = 3600 })
        rc.setDefaultsAsync(mapOf("hsw_min_salary_usd" to 500L, "hsw_old_min_salary_usd" to 400L, "cloud_model" to "gemini-3.5-flash-lite"))
        rc.fetchAndActivate() // fire and forget: defaults/cached values apply offline
    }

    fun cloudModel(): String = rc.getString("cloud_model").ifEmpty { "gemini-3.5-flash-lite" }

    fun rules(): JSONObject = JSONObject()
        .put("hswMinSalaryUsd", rc.getLong("hsw_min_salary_usd").takeIf { it > 0 } ?: 500)
        .put("hswOldMinSalaryUsd", rc.getLong("hsw_old_min_salary_usd").takeIf { it > 0 } ?: 400)
}
