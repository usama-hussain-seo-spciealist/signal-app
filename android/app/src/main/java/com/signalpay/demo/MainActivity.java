package com.signalpay.demo;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.ClipData;
import android.util.Base64;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.view.WindowInsets;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;
import androidx.webkit.WebViewAssetLoader;
import androidx.core.content.FileProvider;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.math.BigDecimal;
import java.util.Collections;
import java.util.Locale;
import org.json.JSONObject;

public class MainActivity extends Activity {
    static final String ORIGIN = "https://appassets.androidplatform.net";
    static final String START = ORIGIN + "/assets/www/index.html";
    private static final int CAMERA_REQUEST = 77, FILE_REQUEST = 78;
    private WebView webView;
    private PermissionRequest pendingCamera;
    private ValueCallback<Uri[]> fileResult;
    private TextToSpeech speech;
    private boolean speechReady;
    // Package-visible only so instrumented tests can confirm the native speech request.
    String lastSpeechText = "";

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.WHITE);
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            } else {
                view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(), insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            }
            return insets;
        });
        webView = new WebView(this);
        root.addView(webView, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);
        getWindow().getDecorView().setSystemUiVisibility(android.view.View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        // Required only for images explicitly selected through the Android document picker.
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setGeolocationEnabled(false);
        settings.setUserAgentString(settings.getUserAgentString() + " SignalPayAndroid/3.1.0");
        WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this)).build();
        webView.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                WebResourceResponse local = loader.shouldInterceptRequest(request.getUrl());
                if (local != null) return local;
                // The WebView contains only bundled app assets; remote pages never get the bridge.
                return new WebResourceResponse("text/plain", "UTF-8", 403, "Blocked", Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (isLocal(request.getUrl())) return false;
                if (request.isForMainFrame() && isExternalAllowed(request.getUrl())) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, request.getUrl())); }
                    catch (ActivityNotFoundException ignored) { Toast.makeText(MainActivity.this, "No browser available", Toast.LENGTH_SHORT).show(); }
                }
                return true;
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public void onPermissionRequest(PermissionRequest request) {
                if (!isTrustedOrigin(request.getOrigin()) || !isLocal(Uri.parse(webView.getUrl()))
                        || request.getResources().length != 1 || !PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(request.getResources()[0])) { request.deny(); return; }
                if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
                    request.grant(new String[] { PermissionRequest.RESOURCE_VIDEO_CAPTURE }); return;
                }
                if (pendingCamera != null) pendingCamera.deny();
                pendingCamera = request;
                requestPermissions(new String[] { Manifest.permission.CAMERA }, CAMERA_REQUEST);
            }
            @Override public void onPermissionRequestCanceled(PermissionRequest request) { if (pendingCamera == request) pendingCamera = null; }
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (!isLocal(Uri.parse(view.getUrl()))) return false;
                if (fileResult != null) fileResult.onReceiveValue(null);
                fileResult = callback;
                boolean json = false;
                for (String accepted : params.getAcceptTypes()) if (accepted != null && accepted.contains("json")) json = true;
                Intent pick = new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType(json ? "application/json" : "image/*");
                pick.putExtra(Intent.EXTRA_MIME_TYPES, json ? new String[] { "application/json" } : new String[] { "image/png", "image/jpeg", "image/webp" });
                try { startActivityForResult(pick, FILE_REQUEST); }
                catch (ActivityNotFoundException ignored) { fileResult.onReceiveValue(null); fileResult = null; Toast.makeText(MainActivity.this, "No image picker available", Toast.LENGTH_SHORT).show(); }
                return true;
            }
        });
        speech = new TextToSpeech(this, result -> {
            speechReady = result == TextToSpeech.SUCCESS;
            if (speechReady && speech != null) {
                int language = speech.setLanguage(Locale.forLanguageTag("en-PK"));
                if (language < 0) speech.setLanguage(Locale.US);
            }
        });
        if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            WebViewCompat.addWebMessageListener(webView, "SignalQR", Collections.singleton(ORIGIN), (view, message, source, mainFrame, reply) -> {
                if (!mainFrame || !isTrustedOrigin(source) || !isLocal(Uri.parse(view.getUrl()))) return;
                try {
                    JSONObject data = new JSONObject(message.getData());
                    if ("shareReceipts".equals(data.optString("action"))) {
                        String json = data.optString("json");
                        if (json.length() > 250000) return;
                        JSONObject bundle = new JSONObject(json);
                        if (bundle.length() != 3 || !"signalpay-receipts".equals(bundle.optString("format")) || bundle.optInt("v") != 1) return;
                        org.json.JSONArray receipts = bundle.getJSONArray("receipts");
                        if (receipts.length() > 500) return;
                        for (int i = 0; i < receipts.length(); i++) if (!receipts.getString(i).startsWith("signalpay:2:") || receipts.getString(i).length() > 2600) return;
                        shareFile("SignalPay-receipts.json", json.getBytes(java.nio.charset.StandardCharsets.UTF_8), "application/json");
                        return;
                    }
                    String png = data.optString("png");
                    if (!"share".equals(data.optString("action")) || !png.startsWith("data:image/png;base64,") || png.length() > 1500000) return;
                    byte[] bytes = Base64.decode(png.substring(22), Base64.DEFAULT);
                    if (bytes.length < 8 || bytes[0] != (byte) 137 || bytes[1] != 80 || bytes[2] != 78 || bytes[3] != 71) return;
                    shareFile("SignalPay-QR.png", bytes, "image/png");
                } catch (Exception ignored) { Toast.makeText(this, "Sharing unavailable. Show the QR on this screen instead.", Toast.LENGTH_SHORT).show(); }
            });
            WebViewCompat.addWebMessageListener(webView, "SignalSoundbox", Collections.singleton(ORIGIN), (view, message, source, mainFrame, reply) -> {
                if (!mainFrame || !isTrustedOrigin(source) || !isLocal(Uri.parse(view.getUrl()))) return;
                try {
                    JSONObject data = new JSONObject(message.getData());
                    if ("stop".equals(data.optString("action"))) { speech.stop(); return; }
                    long cents = data.getLong("cents");
                    if (!"speak".equals(data.optString("action")) || cents < 100 || cents > 10000000) return;
                    String kind = data.optString("kind", "received");
                    String intro = "sent".equals(kind) ? "Demo payment sent. " : "test".equals(kind) ? "Sound test. " : "Demo payment received. ";
                    lastSpeechText = intro + BigDecimal.valueOf(cents, 2).stripTrailingZeros().toPlainString() + " Pakistani rupees. This is a simulation.";
                    if (speechReady && speech.speak(lastSpeechText, TextToSpeech.QUEUE_FLUSH, null, "signalpay-demo") != TextToSpeech.ERROR) reply.postMessage("Native soundbox voice requested. " + intro + "Check media volume and audio output if unheard.");
                    else reply.postMessage("Voice unavailable on this device. Demo receipt and confirmation tone remain available.");
                } catch (Exception ignored) { reply.postMessage("Soundbox request unavailable. Demo receipt remains visible."); }
            });
        }
        if (state == null || webView.restoreState(state) == null) webView.loadUrl(START);
    }

    static boolean isTrustedOrigin(Uri uri) { return uri != null && "https".equals(uri.getScheme()) && "appassets.androidplatform.net".equals(uri.getHost()) && uri.getPort() == -1 && uri.getUserInfo() == null; }
    private void shareFile(String fixedName, byte[] bytes, String mime) throws java.io.IOException {
        File dir = new File(getCacheDir(), "shared");
        if (!dir.exists() && !dir.mkdirs()) throw new java.io.IOException("No share cache");
        File image = new File(dir, fixedName);
        try (FileOutputStream out = new FileOutputStream(image)) { out.write(bytes); }
        Uri uri = FileProvider.getUriForFile(this, getPackageName() + ".files", image);
        Intent send = new Intent(Intent.ACTION_SEND).setType(mime).putExtra(Intent.EXTRA_STREAM, uri).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        send.setClipData(ClipData.newRawUri("SignalPay public demo receipt", uri));
        startActivity(Intent.createChooser(send, "Share SignalPay demo data"));
    }
    static boolean isLocal(Uri uri) { return isTrustedOrigin(uri) && uri.getPath() != null && uri.getPath().startsWith("/assets/www/"); }
    static boolean isExternalAllowed(Uri uri) {
        return uri != null && "https".equals(uri.getScheme()) && uri.getPort() == -1
            && (("github.com".equals(uri.getHost()) && uri.getPath().startsWith("/usama-hussain-seo-spciealist/signal-app/releases/"))
            || ("usama-hussain-seo-spciealist.github.io".equals(uri.getHost()) && uri.getPath().startsWith("/signal-app/")));
    }
    WebView getDemoWebView() { return webView; }
    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        if (requestCode == CAMERA_REQUEST && pendingCamera != null) {
            PermissionRequest request = pendingCamera; pendingCamera = null;
            if (results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED && isLocal(Uri.parse(webView.getUrl()))) request.grant(new String[] { PermissionRequest.RESOURCE_VIDEO_CAPTURE });
            else request.deny();
        }
    }
    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_REQUEST && fileResult != null) {
            fileResult.onReceiveValue(resultCode == RESULT_OK && data != null && data.getData() != null ? new Uri[] { data.getData() } : null); fileResult = null;
        }
    }
    @Override protected void onSaveInstanceState(Bundle state) { webView.saveState(state); super.onSaveInstanceState(state); }
    @Override protected void onPause() {
        if (pendingCamera == null) webView.evaluateJavascript("if(typeof stopCamera==='function')stopCamera();", null);
        webView.onPause(); if (speech != null) speech.stop(); super.onPause();
    }
    @Override protected void onResume() { super.onResume(); if (webView != null) webView.onResume(); }
    @Override protected void onStop() { if (pendingCamera != null) { pendingCamera.deny(); pendingCamera = null; } super.onStop(); }
    @Override public void onBackPressed() { if (webView.canGoBack()) webView.goBack(); else super.onBackPressed(); }
    @Override protected void onDestroy() {
        if (pendingCamera != null) pendingCamera.deny();
        if (fileResult != null) fileResult.onReceiveValue(null);
        if (speech != null) { speech.stop(); speech.shutdown(); }
        if (webView.getParent() instanceof android.view.ViewGroup) ((android.view.ViewGroup) webView.getParent()).removeView(webView);
        webView.destroy(); super.onDestroy();
    }
}
