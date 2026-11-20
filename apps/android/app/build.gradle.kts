import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.gms)
}

// App Check debug token for the demo/judging build. Kept in local.properties (gitignored), never in source.
val local = Properties().apply { rootProject.file("local.properties").takeIf { it.exists() }?.inputStream()?.use { load(it) } }

android {
    namespace = "io.github.gauciv.kontrata"
    compileSdk = 36

    defaultConfig {
        applicationId = "io.github.gauciv.kontrata"
        minSdk = 26 // firebase-ai-ondevice (ML Kit Prompt API) requires 26+
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0"
    }
    buildTypes {
        // The App Check debug token goes ONLY into the debug build (the judging/demo APK). Release builds carry none:
        // their offline checks work, the cloud explanation does not. Revoke the token after judging.
        debug { buildConfigField("String", "APP_CHECK_DEBUG_TOKEN", "\"${local.getProperty("appCheckDebugToken", "")}\"") }
        release {
            isMinifyEnabled = false
            buildConfigField("String", "APP_CHECK_DEBUG_TOKEN", "\"\"")
        }
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

kotlin {
    compilerOptions { jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17) }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(platform(libs.compose.bom))
    implementation(libs.compose.ui)
    implementation(libs.compose.foundation)
    implementation(libs.compose.material3)
    implementation(libs.compose.ui.tooling.preview)
    implementation(platform(libs.firebase.bom))
    implementation(libs.firebase.ai)
    implementation(libs.firebase.ai.ondevice)
    implementation(libs.firebase.appcheck.debug)
    implementation(libs.firebase.config)
    implementation(libs.javascriptengine)
    implementation(libs.coroutines.guava)
    implementation(libs.coroutines.play)
    implementation(libs.mlkit.text)
}
