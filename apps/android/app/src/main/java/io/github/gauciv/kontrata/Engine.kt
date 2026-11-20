package io.github.gauciv.kontrata

import android.content.Context
import androidx.javascriptengine.JavaScriptIsolate
import androidx.javascriptengine.JavaScriptSandbox
import kotlinx.coroutines.guava.await
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import org.json.JSONArray
import org.json.JSONObject

/**
 * Runs the SAME tested redaction + rules engine as the web app (packages/core, bundled as
 * assets/kontrata-core.js) inside Jetpack's JavaScriptSandbox: an isolated JS engine with no network,
 * no file system, and no access to the app. Kotlin only orchestrates; it never re-implements the rules.
 */
class Engine private constructor(private val isolate: JavaScriptIsolate) {
    private val lock = Mutex()

    companion object {
        fun isSupported() = JavaScriptSandbox.isSupported()

        suspend fun create(context: Context): Engine {
            val sandbox = JavaScriptSandbox.createConnectedInstanceAsync(context.applicationContext).await()
            val isolate = sandbox.createIsolate()
            val script = context.assets.open("kontrata-core.js").bufferedReader().use { it.readText() }
            isolate.evaluateJavaScriptAsync("$script;'ready'").await()
            return Engine(isolate)
        }
    }

    private suspend fun call(fn: String, vararg args: String): String = lock.withLock {
        val code = "KontrataCore.$fn(${args.joinToString(",") { JSONObject.quote(it) }})"
        val out = isolate.evaluateJavaScriptAsync(code).await()
        if (out.startsWith("{\"error\"")) error("engine.$fn: ${JSONObject(out).optString("error")}")
        out
    }

    suspend fun strings(lang: String): Map<String, String> {
        val o = JSONObject(call("strings", lang))
        return o.keys().asSequence().associateWith { o.getString(it) }
    }

    /** Prompts for the on-device model, one per chunk. Empty = nothing name-like to check. */
    suspend fun nerPrompts(text: String): List<Pair<String, String>> {
        val a = JSONArray(call("nerPrompts", text))
        return (0 until a.length()).map { a.getJSONObject(it).let { o -> o.getString("chunk") to o.getString("prompt") } }
    }

    /** Validated entities from one model answer; null = unusable output (that chunk counts as failed). */
    suspend fun parseNer(raw: String, chunk: String): JSONArray? {
        val o = JSONObject(call("parseNer", raw, chunk))
        return if (o.getBoolean("ok")) o.getJSONArray("entities") else null
    }

    suspend fun analyse(text: String, entities: JSONArray, nerStatus: String, config: JSONObject): Analysis =
        Analysis.from(text, entities, nerStatus, JSONObject(call("analyse", text, entities.toString(), nerStatus, config.toString())))

    suspend fun deepPrompt(redacted: String, findings: JSONArray, lang: String): String =
        JSONObject("{\"v\":${call("deepPrompt", redacted, findings.toString(), lang)}}").getString("v")

    suspend fun gateOk(payload: String, vault: JSONArray): Boolean = JSONObject(call("gate", payload, vault.toString())).getBoolean("ok")

    suspend fun parseDeep(raw: String, redacted: String, vault: JSONArray): JSONObject = JSONObject(call("parseDeep", raw, redacted, vault.toString()))

    suspend fun rehydrate(text: String, vault: JSONArray): String =
        JSONObject("{\"v\":${call("rehydrate", text, vault.toString())}}").getString("v")
}

/** Result of one Airlock pass. Raw JSON is kept for round-tripping into the engine. */
data class Analysis(
    val text: String,
    val entities: JSONArray,
    val nerStatus: String,
    val redacted: String,
    val vault: JSONArray, // [[placeholder, value], …]: lives only in this process's memory
    val verdictKind: String, // safe | needs_review | blocked
    val reviewReason: String?,
    val suspects: List<String>,
    val findings: JSONArray,
) {
    val vaultPairs: List<Pair<String, String>>
        get() = (0 until vault.length()).map { vault.getJSONArray(it).let { p -> p.getString(0) to p.getString(1) } }

    companion object {
        fun from(text: String, entities: JSONArray, nerStatus: String, o: JSONObject): Analysis {
            val v = o.getJSONObject("verdict")
            val s = v.optJSONArray("suspects")
            return Analysis(
                text = text,
                entities = entities,
                nerStatus = nerStatus,
                redacted = o.getString("redacted"),
                vault = o.getJSONArray("vault"),
                verdictKind = v.getString("kind"),
                reviewReason = v.optString("reason").ifEmpty { null },
                suspects = if (s == null) emptyList() else (0 until s.length()).map { s.getString(it) },
                findings = o.getJSONArray("findings"),
            )
        }
    }
}
