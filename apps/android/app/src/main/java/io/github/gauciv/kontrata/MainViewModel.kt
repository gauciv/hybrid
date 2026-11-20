package io.github.gauciv.kontrata

import android.app.Application
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject

enum class Phase { Input, Working, Results }

data class Source(val name: String, val thumb: Bitmap?, val state: String, val method: String? = null) // state: reading|done|failed

data class DeepClause(val quote: String, val status: String, val explanation: String, val sourceId: String?)
data class DeepResult(val summary: String, val clauses: List<DeepClause>, val questions: List<String>, val prompt: String, val ms: Long)

class MainViewModel(app: Application) : AndroidViewModel(app) {
    var lang by mutableStateOf("tl"); private set
    var strings by mutableStateOf<Map<String, String>>(emptyMap()); private set
    var engineError by mutableStateOf<String?>(null); private set
    var phase by mutableStateOf(Phase.Input); private set
    var step by mutableIntStateOf(1); private set
    var text by mutableStateOf("")
    var emptyError by mutableStateOf(false); private set
    var source by mutableStateOf<Source?>(null); private set
    var analysis by mutableStateOf<Analysis?>(null); private set
    var nerMs by mutableStateOf(0L); private set
    var reviewed by mutableStateOf(false)
    var deepLang by mutableStateOf("tl")
    var deep by mutableStateOf<DeepResult?>(null); private set
    var deepBusy by mutableStateOf(false); private set
    var deepFailed by mutableStateOf(false); private set

    private var engine: Engine? = null
    private var seq = 0 // stale-result guard for photo reading

    init {
        viewModelScope.launch {
            try {
                if (!Engine.isSupported()) error("JavaScriptSandbox is not supported on this device (update Android System WebView).")
                engine = Engine.create(app)
                strings = engine!!.strings(lang)
            } catch (e: Exception) {
                engineError = e.message ?: e.toString()
            }
        }
    }

    /** Interface copy from the shared engine (same words as the web app). */
    fun s(key: String, n: Any? = null): String {
        val raw = when {
            n is Int && n == 1 && strings.containsKey("$key.one") -> strings["$key.one"]!!
            n is String && strings.containsKey("$key.s") -> strings["$key.s"]!!
            else -> strings[key] ?: key
        }
        return if (n == null) raw else raw.replace("{n}", n.toString()).replace("{s}", n.toString())
    }

    fun setLanguage(l: String) {
        lang = l
        deepLang = if (l == "en") "en" else "tl"
        viewModelScope.launch { engine?.let { strings = it.strings(l) } }
    }

    val reading get() = source?.state == "reading"

    fun pickSample(kind: String) {
        emptyError = false
        when (kind) {
            "contract" -> { seq++; source = null; text = Samples.contract }
            "post" -> { seq++; source = null; text = Samples.post }
            "photo" -> viewModelScope.launch {
                val bmp = withContext(Dispatchers.IO) { getApplication<Application>().assets.open("sample-contract-photo.png").use { BitmapFactory.decodeStream(it) } }
                readBitmap("sample-contract-photo.png", bmp)
            }
        }
    }

    fun readPhoto(uri: Uri) = viewModelScope.launch {
        val ctx = getApplication<Application>()
        val bmp = withContext(Dispatchers.IO) { decodeScaled(ctx.contentResolver, uri) }
        if (bmp == null) { source = Source("photo", null, "failed"); return@launch }
        readBitmap(uri.lastPathSegment ?: "photo", bmp)
    }

    private suspend fun readBitmap(name: String, bmp: Bitmap) {
        val id = ++seq
        emptyError = false
        text = ""
        source = Source(name, bmp, "reading")
        try {
            val (t, method) = Ai.readPhoto(bmp)
            if (seq != id) return
            if (t.isBlank()) error("empty")
            text = t
            source = Source(name, bmp, "done", method)
        } catch (_: Exception) {
            if (seq == id) source = source?.copy(state = "failed")
        }
    }

    fun removeSource() { seq++; source = null; text = "" }

    fun check() {
        val e = engine ?: return
        if (text.isBlank()) { emptyError = true; return }
        viewModelScope.launch {
            phase = Phase.Working
            step = 1
            val people = Cache.people[text] ?: Ai.findPeople(e, text).also { if (it.status == "ok") Cache.people[text] = it }
            nerMs = people.ms
            step = 2
            val a = e.analyse(text, people.entities, people.status, Config.rules())
            step = 3
            analysis = a
            reviewed = false
            deep = null
            deepFailed = false
            phase = Phase.Results
        }
    }

    /** "Cover these too": add the model-free scan's suspects as entities and re-run the Airlock. */
    fun coverSuspects() {
        val e = engine ?: return
        val a = analysis ?: return
        viewModelScope.launch {
            val extra = JSONArray(a.entities.toString())
            for (s in a.suspects) extra.put(JSONObject().put("text", s).put("type", suspectType(a.text, s)))
            analysis = e.analyse(a.text, extra, a.nerStatus, Config.rules())
            reviewed = false
        }
    }

    private val addressWord = Regex("\\b(?:street|st\\.|road|avenue|ave\\.|villa|block|blk|building|district|brgy|barangay|city|village)\\b", RegexOption.IGNORE_CASE)
    private fun suspectType(text: String, s: String): String {
        val at = text.indexOf(s)
        if (at < 0) return "PERSON"
        return if (addressWord.containsMatchIn(text.substring(maxOf(0, at - 40), at))) "ADDRESS" else "PERSON"
    }

    fun explain() {
        val e = engine ?: return
        val a = analysis ?: return
        viewModelScope.launch {
            deepBusy = true
            deepFailed = false
            try {
                val d = Ai.deepCheck(e, a, deepLang)
                val r = e.parseDeep(d.raw, a.redacted, a.vault)
                if (r.has("error")) error(r.getString("error"))
                Cache.deep[Config.cloudModel() + "\n" + d.prompt] = d.raw // placeholders only; memory only
                val cl = r.getJSONArray("clauses")
                val qs = r.getJSONArray("questions")
                deep = DeepResult(
                    summary = r.getString("summary"),
                    clauses = (0 until cl.length()).map { cl.getJSONObject(it).let { c -> DeepClause(c.getString("quote"), c.getString("status"), c.getString("explanation"), c.optString("sourceId").ifEmpty { null }.takeIf { id -> id != "null" }) } },
                    questions = (0 until qs.length()).map { qs.getString(it) },
                    prompt = d.prompt,
                    ms = d.ms,
                )
            } catch (_: Exception) {
                deepFailed = true
            } finally {
                deepBusy = false
            }
        }
    }

    fun restart() {
        analysis = null; deep = null; text = ""; source = null; phase = Phase.Input
    }

    suspend fun rehydrate(t: String): String = engine?.rehydrate(t, analysis?.vault ?: JSONArray()) ?: t
}

private fun decodeScaled(cr: android.content.ContentResolver, uri: Uri, max: Int = 1600): Bitmap? = runCatching {
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    cr.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, bounds) }
    var sample = 1
    while (maxOf(bounds.outWidth, bounds.outHeight) / sample > max) sample *= 2
    cr.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, BitmapFactory.Options().apply { inSampleSize = sample }) }
}.getOrNull()
