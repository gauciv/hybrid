package io.github.gauciv.kontrata

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.json.JSONObject

// ---------------------------------------------------------------- tokens (same as the web: docs/DESIGN.md)
object K {
    val paper = Color(0xFFF5F6F4)
    val sheet = Color(0xFFFFFFFF)
    val ink = Color(0xFF1C2733)
    val ink2 = Color(0xFF4A5560)
    val ledger = Color(0xFF1F4E5F)
    val rule = Color(0xFFD5DAD6)
    val ruleStrong = Color(0xFFAEB6B1)
    val red = Color(0xFF9E2A2B)
    val amber = Color(0xFF7A5A12)
    val amberBg = Color(0xFFF5F0E3)
    val green = Color(0xFF2E6A42)
    val redBg = Color(0xFFF6ECEA)
    val device = Color(0xFFEEF2EF)
}

@OptIn(androidx.compose.ui.text.ExperimentalTextApi::class)
val Sans = FontFamily(
    Font(R.font.public_sans, FontWeight.Normal, variationSettings = FontVariation.Settings(FontVariation.weight(400))),
    Font(R.font.public_sans, FontWeight.SemiBold, variationSettings = FontVariation.Settings(FontVariation.weight(600))),
    Font(R.font.public_sans, FontWeight.Bold, variationSettings = FontVariation.Settings(FontVariation.weight(680))),
)
val Serif = FontFamily(Font(R.font.ibm_plex_serif, FontWeight.Normal))

private val body = TextStyle(fontFamily = Sans, fontSize = 16.sp, lineHeight = 24.sp, color = K.ink)
private val small = body.copy(fontSize = 14.sp, lineHeight = 20.sp, color = K.ink2)
private val quoteStyle = TextStyle(fontFamily = Serif, fontSize = 15.sp, lineHeight = 24.sp, color = K.ink)
private val shape = RoundedCornerShape(4.dp)

private val PH = Regex("""\[\[([A-Z_]+)_(\d+)(?:\.\d+)?]]""")

/** Show real words on the device: placeholders → values from the in-memory vault. */
private fun rehydrate(t: String, vault: List<Pair<String, String>>): String {
    val m = vault.toMap()
    return Regex("""\[\[[A-Z_]+_\d+(?:\.\d+)?]]""").replace(t) { m[it.value] ?: it.value }
}

// ---------------------------------------------------------------- screen

@Composable
fun KontrataScreen(vm: MainViewModel) {
    val scroll = rememberScrollState()
    LaunchedEffect(vm.phase) { scroll.scrollTo(0) }
    Column(Modifier.fillMaxSize().background(K.paper).systemBarsPadding().imePadding().verticalScroll(scroll)) {
        Header(vm)
        Column(Modifier.padding(horizontal = 18.dp)) {
            when {
                vm.engineError != null -> Text(vm.engineError!!, style = body.copy(color = K.red), modifier = Modifier.padding(vertical = 24.dp))
                vm.strings.isEmpty() -> Box(Modifier.fillMaxWidth().padding(48.dp), Alignment.Center) { Spinner() }
                vm.phase == Phase.Input -> InputScreen(vm)
                vm.phase == Phase.Working -> WorkingScreen(vm)
                else -> vm.analysis?.let { ResultsScreen(vm, it) }
            }
        }
        if (vm.strings.isNotEmpty()) Footer(vm)
    }
}

@Composable
private fun Header(vm: MainViewModel) {
    Row(
        Modifier.fillMaxWidth().background(K.sheet).padding(horizontal = 18.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Row(
            Modifier.weight(1f).clickable(interactionSource = remember { MutableInteractionSource() }, indication = null) { vm.restart() },
            verticalAlignment = Alignment.CenterVertically,
        ) {
            BrandMark()
            Spacer(Modifier.width(8.dp))
            Text("Kontrata", style = body.copy(fontWeight = FontWeight.Bold, fontSize = 17.sp))
        }
        Row(Modifier.border(1.dp, K.ruleStrong, shape)) {
            for ((code, label) in listOf("tl" to "Taglish", "en" to "English")) {
                val on = vm.lang == code
                Text(
                    label,
                    style = small.copy(color = if (on) Color.White else K.ink2),
                    modifier = Modifier.background(if (on) K.ink else Color.Transparent).clickable { vm.setLanguage(code) }.padding(horizontal = 12.dp, vertical = 6.dp),
                )
            }
        }
    }
    HorizontalDivider(color = K.rule)
}

// ---------------------------------------------------------------- input

@Composable
private fun InputScreen(vm: MainViewModel) {
    val picker = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri -> uri?.let { vm.readPhoto(it) } }
    Spacer(Modifier.height(28.dp))
    Text(vm.s("tagline"), style = body.copy(fontSize = 28.sp, lineHeight = 33.sp, fontWeight = FontWeight.SemiBold), modifier = Modifier.semantics { heading() })
    Spacer(Modifier.height(10.dp))
    Text(vm.s("intro"), style = body.copy(color = K.ink2))
    Spacer(Modifier.height(22.dp))

    Column(Modifier.fillMaxWidth().background(K.sheet, shape).border(1.dp, K.rule, shape)) {
        Text(vm.s("inputLabel"), style = body.copy(fontWeight = FontWeight.SemiBold), modifier = Modifier.padding(start = 16.dp, top = 14.dp, end = 16.dp))
        vm.source?.let { SourceCard(vm, it) }
        // Fixed-height box with its own scrolling, so a long contract never pushes the Check button off screen.
        Box(Modifier.fillMaxWidth().heightIn(min = 200.dp, max = 320.dp).padding(horizontal = 16.dp, vertical = 10.dp)) {
            if (vm.text.isEmpty() && !vm.reading) Text(vm.s("placeholder"), style = body.copy(color = Color(0xFF7B858D)))
            BasicTextField(
                value = vm.text,
                onValueChange = { vm.text = it },
                readOnly = vm.reading,
                textStyle = quoteStyle.copy(color = if (vm.reading) K.ink2 else K.ink),
                cursorBrush = SolidColor(K.ledger),
                modifier = Modifier.fillMaxWidth().heightIn(min = 180.dp, max = 300.dp),
            )
        }
        HorizontalDivider(color = K.rule)
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                ToolButton(vm.s("upload"), enabled = !vm.reading, modifier = Modifier.weight(1f)) {
                    picker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                }
                SampleMenu(vm, Modifier.weight(1f))
            }
            PrimaryButton(vm.s("check"), enabled = !vm.reading, modifier = Modifier.fillMaxWidth()) { vm.check() }
        }
    }
    if (vm.emptyError) Text(vm.s("emptyInput"), style = small.copy(color = K.red), modifier = Modifier.padding(top = 8.dp))
    Row(Modifier.padding(top = 18.dp, bottom = 28.dp)) {
        LockIcon(20)
        Spacer(Modifier.width(12.dp))
        Column {
            Text(vm.s("privacyTitle"), style = small.copy(color = K.ink, fontWeight = FontWeight.SemiBold))
            Text(vm.s("privacyBody"), style = small)
        }
    }
}

@Composable
private fun SourceCard(vm: MainViewModel, src: Source) {
    Row(Modifier.padding(start = 12.dp, end = 12.dp, top = 10.dp).fillMaxWidth().background(K.device, shape).border(1.dp, K.rule, shape).padding(10.dp)) {
        Box(Modifier.size(width = 56.dp, height = 70.dp).background(K.sheet).border(1.dp, K.ruleStrong)) {
            src.thumb?.let { Image(it.asImageBitmap(), null, contentScale = ContentScale.Fit, modifier = Modifier.fillMaxSize().alpha(if (src.state == "reading") 0.55f else 1f)) }
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(src.name, style = small.copy(color = K.ink, fontWeight = FontWeight.SemiBold), maxLines = 1, overflow = TextOverflow.Ellipsis)
            when (src.state) {
                "reading" -> Row(verticalAlignment = Alignment.CenterVertically) { Spinner(14); Spacer(Modifier.width(6.dp)); Text(vm.s("readingNano"), style = small) }
                "done" -> Text("${vm.s("readBy.${src.method}")} ${vm.s("proofread")}", style = small)
                else -> Text(vm.s("readFailed"), style = small.copy(color = K.red))
            }
            Text(vm.s("remove"), style = small.copy(color = K.ledger), modifier = Modifier.padding(top = 4.dp).clickable { vm.removeSource() })
        }
    }
}

@Composable
private fun SampleMenu(vm: MainViewModel, modifier: Modifier) {
    var open by remember { mutableStateOf(false) }
    Box(modifier) {
        ToolButton(vm.s("trySample") + "  ▾", enabled = !vm.reading, modifier = Modifier.fillMaxWidth()) { open = true }
        DropdownMenu(open, onDismissRequest = { open = false }, containerColor = K.sheet) {
            for ((k, key) in listOf("contract" to "sampleContract", "post" to "samplePost", "photo" to "samplePhoto")) {
                DropdownMenuItem(text = { Text(vm.s(key), style = body) }, onClick = { open = false; vm.pickSample(k) })
            }
        }
    }
}

// ---------------------------------------------------------------- working

@Composable
private fun WorkingScreen(vm: MainViewModel) {
    Column(Modifier.padding(vertical = 32.dp)) {
        listOf("step1", "step2", "step3").forEachIndexed { i, k ->
            val n = i + 1
            Row(Modifier.fillMaxWidth().padding(vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                Text("$n", style = body.copy(fontWeight = FontWeight.SemiBold, color = if (n <= vm.step) K.ink else Color(0xFF7B858D)), modifier = Modifier.width(28.dp))
                Text(vm.s(k), style = body.copy(color = if (n <= vm.step) K.ink else Color(0xFF7B858D)), modifier = Modifier.weight(1f))
                when {
                    n < vm.step -> Text("✓", style = body.copy(color = K.green, fontWeight = FontWeight.Bold))
                    n == vm.step -> Spinner(18)
                }
            }
            HorizontalDivider(color = K.rule)
        }
    }
}

// ---------------------------------------------------------------- results

@Composable
private fun ResultsScreen(vm: MainViewModel, a: Analysis) {
    val findings = (0 until a.findings.length()).map { a.findings.getJSONObject(it) }.sortedBy { listOf("red", "amber", "green").indexOf(it.getString("severity")) }
    val reds = findings.count { it.getString("severity") == "red" }
    val ambers = findings.count { it.getString("severity") == "amber" }
    val heading = when {
        reds > 0 -> vm.s("resultsRed", reds)
        ambers > 0 -> vm.s("resultsAmber", ambers)
        else -> vm.s("resultsClear")
    }
    Spacer(Modifier.height(24.dp))
    Text(heading, style = body.copy(fontSize = 23.sp, lineHeight = 29.sp, fontWeight = FontWeight.SemiBold), modifier = Modifier.semantics { heading() })
    Spacer(Modifier.height(6.dp))
    Text(if (reds + ambers > 0) vm.s("resultsSub") else vm.s("resultsClearSub"), style = body.copy(color = K.ink2))
    if (a.nerStatus == "ok" && vm.nerMs > 0) Text(vm.s("modelOk", "%.1f".format(vm.nerMs / 1000.0)), style = small, modifier = Modifier.padding(top = 10.dp))
    Spacer(Modifier.height(14.dp))
    HorizontalDivider(color = K.ink, thickness = 2.dp)
    findings.forEach { FindingRow(vm, it, a.vaultPairs) }

    AirlockSection(vm, a)
    ExplainSection(vm, a)

    Spacer(Modifier.height(28.dp))
    ToolButton(vm.s("checkAnother")) { vm.restart() }
    Spacer(Modifier.height(12.dp))
}

@Composable
private fun FindingRow(vm: MainViewModel, f: JSONObject, vault: List<Pair<String, String>>) {
    val sev = f.getString("severity")
    val lang = vm.lang
    var open by remember { mutableStateOf(false) }
    Row(Modifier.padding(vertical = 16.dp)) {
        SeverityMark(sev)
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(vm.s("sevLabel.$sev"), style = small.copy(color = sevColor(sev), fontWeight = FontWeight.SemiBold))
            Text(f.getJSONObject("title").getString(lang), style = body.copy(fontSize = 18.sp, lineHeight = 24.sp, fontWeight = FontWeight.SemiBold))
            Spacer(Modifier.height(4.dp))
            Text(f.getJSONObject("detail").getString(lang), style = body)
            f.optString("evidence").takeIf { it.isNotEmpty() }?.let { ev ->
                Column(Modifier.padding(top = 10.dp).fillMaxWidth().background(K.sheet).leftBorder(sevColor(sev)).padding(start = 12.dp, top = 8.dp, end = 10.dp, bottom = 8.dp)) {
                    Text(vm.s("inContract"), style = small.copy(fontSize = 13.sp))
                    Text(rehydrate(ev, vault), style = quoteStyle)
                }
            }
            val cites = f.getJSONArray("citations")
            Text(
                "${if (open) "▾" else "▸"} ${vm.s("basis")}: " + (0 until cites.length()).joinToString("; ") { cites.getJSONObject(it).getString("title") },
                style = small.copy(fontSize = 13.sp),
                modifier = Modifier.padding(top = 8.dp).clickable { open = !open },
            )
            if (open) for (i in 0 until cites.length()) {
                val c = cites.getJSONObject(i)
                Text("“${c.getString("quote")}”", style = quoteStyle.copy(fontSize = 14.sp), modifier = Modifier.padding(top = 6.dp))
                Text(c.getString("title"), style = small.copy(fontSize = 12.sp))
            }
        }
    }
    HorizontalDivider(color = K.rule)
}

@Composable
private fun AirlockSection(vm: MainViewModel, a: Analysis) {
    SectionTitle(vm.s("airlockTitle"), vm.s("airlockBody"))
    Column(Modifier.fillMaxWidth().border(1.dp, K.ruleStrong, shape)) {
        Text(redactedAnnotated(vm, a.redacted), style = quoteStyle.copy(lineHeight = 28.sp), modifier = Modifier.background(K.sheet).fillMaxWidth().padding(14.dp))
        HorizontalDivider(color = K.ruleStrong)
        Column(Modifier.fillMaxWidth().background(K.device).padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) { LockIcon(14); Spacer(Modifier.width(6.dp)); Text(vm.s("localOnly"), style = small.copy(color = K.ink, fontWeight = FontWeight.SemiBold)) }
            Spacer(Modifier.height(8.dp))
            val pairs = a.vaultPairs.filterNot { it.first.contains('.') }
            if (pairs.isEmpty()) Text(vm.s("nothingCovered"), style = small)
            pairs.forEach { (ph, v) ->
                Row(Modifier.padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                    Bar(chipLabel(vm, ph))
                    Spacer(Modifier.width(10.dp))
                    Text(v, style = small.copy(color = K.ink))
                }
            }
        }
    }
    if (a.verdictKind == "needs_review") ReviewBox(vm, a)
    if (a.verdictKind == "blocked") Text(vm.s("blocked"), style = body.copy(color = K.ink), modifier = Modifier.padding(top = 12.dp).fillMaxWidth().background(K.redBg).leftBorder(K.red).padding(12.dp))
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun ReviewBox(vm: MainViewModel, a: Analysis) {
    Column(Modifier.padding(top = 12.dp).fillMaxWidth().background(K.amberBg).leftBorder(K.amber).padding(14.dp)) {
        Text(vm.s("reviewTitle"), style = body.copy(fontWeight = FontWeight.SemiBold))
        if (a.reviewReason == "model_unavailable") Text(vm.s("modelOff"), style = body, modifier = Modifier.padding(top = 4.dp))
        if (a.suspects.isNotEmpty()) {
            Text(vm.s("reviewSuspects"), style = body, modifier = Modifier.padding(top = 6.dp))
            FlowRow(Modifier.padding(vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                a.suspects.forEach { Text(it, style = quoteStyle.copy(fontSize = 14.sp), modifier = Modifier.background(K.sheet).border(1.dp, K.ruleStrong).padding(horizontal = 8.dp, vertical = 2.dp)) }
            }
            ToolButton(vm.s("coverThese")) { vm.coverSuspects() }
        }
        Row(Modifier.padding(top = 10.dp).clickable { vm.reviewed = !vm.reviewed }, verticalAlignment = Alignment.Top) {
            Checkbox(vm.reviewed, onCheckedChange = { vm.reviewed = it }, colors = CheckboxDefaults.colors(checkedColor = K.ledger))
            Text(vm.s("confirmReview"), style = body, modifier = Modifier.padding(top = 12.dp))
        }
    }
}

@Composable
private fun ExplainSection(vm: MainViewModel, a: Analysis) {
    val canSend = a.verdictKind == "safe" || (a.verdictKind == "needs_review" && vm.reviewed)
    SectionTitle(vm.s("deepTitle"), vm.s("deepBody"))
    Text(vm.s("deepLang"), style = small.copy(color = K.ink, fontWeight = FontWeight.SemiBold))
    Row(Modifier.padding(top = 6.dp, bottom = 10.dp).border(1.dp, K.ruleStrong, shape)) {
        for ((code, label) in listOf("tl" to "Taglish", "ceb" to "Cebuano", "en" to "English")) {
            val on = vm.deepLang == code
            Text(label, style = small.copy(color = if (on) Color.White else K.ink2), modifier = Modifier.background(if (on) K.ink else Color.Transparent).clickable { vm.deepLang = code }.padding(horizontal = 12.dp, vertical = 8.dp))
        }
    }
    PrimaryButton(if (vm.deepBusy) vm.s("explaining") else vm.s("explain"), enabled = canSend && !vm.deepBusy, busy = vm.deepBusy, modifier = Modifier.fillMaxWidth()) { vm.explain() }
    if (vm.deepFailed) Text(vm.s("deepFailed"), style = small.copy(color = K.red), modifier = Modifier.padding(top = 8.dp))
    vm.deep?.let { d ->
        Text(d.summary, style = body.copy(fontSize = 18.sp, lineHeight = 26.sp), modifier = Modifier.padding(top = 18.dp, bottom = 4.dp))
        d.clauses.forEach { c ->
            val sev = when (c.status) { "violates" -> "red"; "unclear" -> "amber"; else -> "green" }
            Row(Modifier.padding(vertical = 12.dp)) {
                SeverityMark(sev)
                Spacer(Modifier.width(12.dp))
                Column {
                    Text(vm.s("clause.${c.status}"), style = small.copy(color = sevColor(sev), fontWeight = FontWeight.SemiBold))
                    Text(c.explanation, style = body)
                    Text("“${c.quote}”", style = quoteStyle, modifier = Modifier.padding(top = 6.dp).fillMaxWidth().background(K.sheet).leftBorder(sevColor(sev)).padding(10.dp))
                }
            }
            HorizontalDivider(color = K.rule)
        }
        if (d.questions.isNotEmpty()) {
            val ctx = LocalContext.current
            Column(Modifier.padding(top = 18.dp).fillMaxWidth().background(K.sheet, shape).border(1.dp, K.rule, shape).padding(16.dp)) {
                Text(vm.s("questionsTitle"), style = body.copy(fontSize = 18.sp, fontWeight = FontWeight.SemiBold))
                d.questions.forEachIndexed { i, q -> Text("${i + 1}. $q", style = body, modifier = Modifier.padding(top = 6.dp)) }
                Spacer(Modifier.height(12.dp))
                ToolButton(vm.s("copyQuestions")) {
                    val cm = ctx.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                    cm.setPrimaryClip(ClipData.newPlainText("Kontrata", d.questions.mapIndexed { i, q -> "${i + 1}. $q" }.joinToString("\n")))
                }
            }
        }
    }
}

@Composable
private fun Footer(vm: MainViewModel) {
    Column(Modifier.padding(top = 36.dp).fillMaxWidth().background(K.sheet).padding(horizontal = 18.dp, vertical = 24.dp)) {
        Text(vm.s("helpTitle"), style = body.copy(fontWeight = FontWeight.SemiBold))
        Text(vm.s("helpBody"), style = small, modifier = Modifier.padding(top = 4.dp))
        Text(vm.s("disclaimer"), style = small, modifier = Modifier.padding(top = 10.dp))
    }
}

// ---------------------------------------------------------------- pieces

@Composable
private fun SectionTitle(title: String, body2: String) {
    Spacer(Modifier.height(32.dp))
    Text(title, style = body.copy(fontSize = 22.sp, fontWeight = FontWeight.SemiBold), modifier = Modifier.semantics { heading() })
    Text(body2, style = body.copy(color = K.ink2), modifier = Modifier.padding(top = 4.dp, bottom = 12.dp))
}

private fun chipLabel(vm: MainViewModel, ph: String): String {
    val m = PH.matchEntire(ph) ?: return ph
    return "${vm.s("chip.${m.groupValues[1]}")}\u00A0${m.groupValues[2]}" // non-breaking: a bar never splits
}

/** Redacted text with each placeholder drawn as a labelled ink bar ("Tao 1"), like a censored document. */
private fun redactedAnnotated(vm: MainViewModel, t: String) = buildAnnotatedString {
    var last = 0
    for (m in PH.findAll(t)) {
        append(t.substring(last, m.range.first))
        withStyle(SpanStyle(background = K.ink, color = Color(0xFFE7ECEA), fontFamily = Sans, fontWeight = FontWeight.SemiBold, fontSize = 12.sp)) {
            append(" ${chipLabel(vm, m.value)} ")
        }
        last = m.range.last + 1
    }
    append(t.substring(last))
}

@Composable
private fun Bar(label: String) =
    Text(label, style = TextStyle(fontFamily = Sans, fontWeight = FontWeight.SemiBold, fontSize = 12.sp, color = Color(0xFFE7ECEA)), modifier = Modifier.background(K.ink, RoundedCornerShape(2.dp)).padding(horizontal = 6.dp, vertical = 3.dp))

@Composable
private fun PrimaryButton(label: String, enabled: Boolean = true, busy: Boolean = false, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Row(
        modifier.background(if (enabled || busy) K.ledger else Color(0xFFC9D0CC), shape).clickable(enabled = enabled, onClick = onClick).padding(vertical = 13.dp, horizontal = 18.dp),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (busy) { Spinner(16, Color.White); Spacer(Modifier.width(8.dp)) }
        Text(label, style = body.copy(fontWeight = FontWeight.SemiBold, color = if (enabled || busy) Color.White else Color(0xFF5D666E)))
    }
}

@Composable
private fun ToolButton(label: String, enabled: Boolean = true, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Box(
        modifier.background(K.sheet, shape).border(BorderStroke(1.dp, K.ruleStrong), shape).clickable(enabled = enabled, onClick = onClick).padding(vertical = 11.dp, horizontal = 14.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            label,
            style = small.copy(color = if (enabled) K.ink else Color(0xFF8A939A), fontWeight = FontWeight.SemiBold, textAlign = androidx.compose.ui.text.style.TextAlign.Center),
            maxLines = 2,
        )
    }
}

@Composable
private fun Spinner(size: Int = 22, color: Color = K.ledger) = CircularProgressIndicator(Modifier.size(size.dp), color = color, trackColor = K.rule, strokeWidth = 2.dp)

private fun sevColor(sev: String) = when (sev) { "red" -> K.red; "amber" -> K.amber; else -> K.green }

/** A 3dp coloured rule on the left edge (quotes, review and blocked notices). */
private fun Modifier.leftBorder(c: Color) = this.drawBehind { drawRect(c, size = androidx.compose.ui.geometry.Size(3.dp.toPx(), size.height)) }

@Composable
private fun SeverityMark(sev: String) {
    val c = sevColor(sev)
    Canvas(Modifier.padding(top = 3.dp).size(18.dp)) {
        val w = size.width
        when (sev) {
            "red" -> {
                val p = Path().apply { moveTo(w / 2, 0f); lineTo(w, w / 2); lineTo(w / 2, w); lineTo(0f, w / 2); close() }
                drawPath(p, c)
                drawLine(Color.White, Offset(w / 2, w * 0.26f), Offset(w / 2, w * 0.58f), strokeWidth = w * 0.1f)
                drawCircle(Color.White, w * 0.06f, Offset(w / 2, w * 0.72f))
            }
            "amber" -> {
                val p = Path().apply { moveTo(w / 2, w * 0.1f); lineTo(w * 0.94f, w * 0.88f); lineTo(w * 0.06f, w * 0.88f); close() }
                drawPath(p, c, style = Stroke(w * 0.1f))
                drawLine(c, Offset(w / 2, w * 0.4f), Offset(w / 2, w * 0.64f), strokeWidth = w * 0.09f)
                drawCircle(c, w * 0.05f, Offset(w / 2, w * 0.75f))
            }
            else -> {
                drawCircle(c, w * 0.42f, style = Stroke(w * 0.1f))
                val p = Path().apply { moveTo(w * 0.3f, w * 0.52f); lineTo(w * 0.45f, w * 0.66f); lineTo(w * 0.72f, w * 0.38f) }
                drawPath(p, c, style = Stroke(w * 0.1f))
            }
        }
    }
}

@Composable
private fun BrandMark() = Canvas(Modifier.size(width = 18.dp, height = 22.dp)) {
    val w = size.width; val h = size.height
    val page = Path().apply { moveTo(0f, 0f); lineTo(w * 0.65f, 0f); lineTo(w, h * 0.25f); lineTo(w, h); lineTo(0f, h); close() }
    drawPath(page, K.ink, style = Stroke(1.6.dp.toPx()))
    drawRect(K.ruleStrong, Offset(w * 0.2f, h * 0.42f), androidx.compose.ui.geometry.Size(w * 0.6f, h * 0.06f))
    drawRect(K.ink, Offset(w * 0.2f, h * 0.58f), androidx.compose.ui.geometry.Size(w * 0.6f, h * 0.13f))
    drawRect(K.ruleStrong, Offset(w * 0.2f, h * 0.8f), androidx.compose.ui.geometry.Size(w * 0.38f, h * 0.06f))
}

@Composable
private fun LockIcon(size: Int) = Canvas(Modifier.size(size.dp)) {
    val w = this.size.width
    drawRoundRect(K.ledger, Offset(w * 0.18f, w * 0.42f), androidx.compose.ui.geometry.Size(w * 0.64f, w * 0.48f), androidx.compose.ui.geometry.CornerRadius(w * 0.08f), style = Stroke(w * 0.08f))
    drawArc(K.ledger, 180f, 180f, false, Offset(w * 0.32f, w * 0.14f), androidx.compose.ui.geometry.Size(w * 0.36f, w * 0.5f), style = Stroke(w * 0.08f))
}
