package com.signalpay.demo;

import static org.junit.Assert.*;
import android.Manifest;
import android.net.Uri;
import androidx.test.ext.junit.rules.ActivityScenarioRule;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.rule.GrantPermissionRule;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class DemoWebViewTest {
    @Rule public GrantPermissionRule cameraPermission = GrantPermissionRule.grant(Manifest.permission.CAMERA);
    @Rule public ActivityScenarioRule<MainActivity> activity = new ActivityScenarioRule<>(MainActivity.class);

    private String js(String script) throws Exception {
        AtomicReference<String> result = new AtomicReference<>(); CountDownLatch done = new CountDownLatch(1);
        activity.getScenario().onActivity(screen -> screen.getDemoWebView().evaluateJavascript(script, value -> { result.set(value); done.countDown(); }));
        assertTrue("WebView JavaScript response timed out", done.await(10, TimeUnit.SECONDS)); return result.get();
    }
    private void until(String expression) throws Exception {
        long end = System.currentTimeMillis() + 20000;
        while (System.currentTimeMillis() < end) { if ("true".equals(js(expression))) return; Thread.sleep(150); }
        fail("Condition not reached: " + expression + " actual=" + js(expression));
    }
    @Before public void freshDemo() throws Exception {
        until("document.readyState==='complete' && !!document.getElementById('downloadQR').href && typeof SignalDemo!=='undefined'");
        js("document.getElementById('reset').click();document.getElementById('confirmReset').click()");
    }
    @Test public void sampleQRPaymentAndSms() throws Exception {
        js("document.getElementById('sampleScan').click()");
        until("document.getElementById('scanStatus').textContent.includes('Sample QR read: Chai Corner')");
        js("document.getElementById('paymentForm').requestSubmit()");
        until("document.getElementById('reviewDialog').open");
        js("document.getElementById('confirmPayment').click()");
        until("document.getElementById('balance').textContent==='PKR 24,750.00'");
        assertEquals("true", js("document.getElementById('sms').textContent.includes('SIMULATION') && document.getElementById('sms').textContent.includes('NOT SENT')"));
        assertEquals("true", js("document.querySelector('#activityRows').textContent.includes('Simulated')"));
    }
    @Test public void insufficientBalanceAndCancelLeaveWalletUnchanged() throws Exception {
        js("document.getElementById('amount').value='99999'; document.getElementById('paymentForm').requestSubmit()");
        assertEquals("true", js("!document.getElementById('reviewDialog').open && document.getElementById('toast').textContent.includes('Not enough')"));
        js("document.getElementById('amount').value='500';document.getElementById('paymentForm').requestSubmit();document.getElementById('cancelPayment').click()");
        assertEquals("true", js("document.getElementById('balance').textContent==='PKR 25,000.00' && document.getElementById('paymentCount').textContent==='0'"));
    }
    @Test public void nativeSoundboxAndMute() throws Exception {
        assertEquals("true", js("!!window.SignalSoundbox"));
        js("document.getElementById('testSound').click()");
        AtomicReference<String> spoken = new AtomicReference<>("");
        for (int i = 0; i < 60; i++) { activity.getScenario().onActivity(screen -> spoken.set(screen.lastSpeechText)); if (spoken.get().contains("500")) break; Thread.sleep(100); }
        assertTrue(spoken.get(), spoken.get().contains("500") && spoken.get().contains("simulation"));
        activity.getScenario().onActivity(screen -> screen.lastSpeechText = "");
        js("document.getElementById('soundEnabled').checked=false;document.getElementById('testSound').click()");
        activity.getScenario().onActivity(screen -> spoken.set(screen.lastSpeechText));
        assertEquals("", spoken.get());
        assertEquals("true", js("document.getElementById('soundStatus').textContent.includes('muted')"));
    }
    @Test public void cameraUsesEmulatedVideoAndStops() throws Exception {
        js("document.getElementById('startCamera').click()");
        until("!!document.getElementById('video').srcObject && document.getElementById('video').readyState>=2");
        js("window.testCameraTrack=document.getElementById('video').srcObject.getVideoTracks()[0];document.getElementById('stopCamera').click()");
        until("testCameraTrack.readyState==='ended' && document.getElementById('video').srcObject===null");
    }
    @Test public void untrustedOriginsAndRealQrAreRejected() throws Exception {
        assertFalse(MainActivity.isLocal(Uri.parse("https://evil.example/assets/www/index.html")));
        assertFalse(MainActivity.isExternalAllowed(Uri.parse("https://github.com/other/repo/releases/latest")));
        assertFalse(MainActivity.isExternalAllowed(Uri.parse("http://github.com/usama-hussain-seo-spciealist/signal-app/releases/latest")));
        assertEquals("true", js("(()=>{try{SignalDemo.parseQR('upi://pay?pa=real');return false}catch(e){return true}})()"));
    }
    @Test public void merchantReceiptNeverCreditsCustomerWallet() throws Exception {
        js("document.getElementById('receive').click()");
        assertEquals("true", js("document.getElementById('balance').textContent==='PKR 25,000.00' && document.getElementById('receivedTotal').textContent==='PKR 500.00'"));
        assertEquals("true", js("document.getElementById('sms').textContent.includes('NOT SENT')"));
    }
}
