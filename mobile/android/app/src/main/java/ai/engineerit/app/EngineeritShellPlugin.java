package ai.engineerit.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.net.Uri;
import android.os.Build;
import androidx.browser.customtabs.CustomTabsIntent;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import com.getcapacitor.Plugin;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

/**
 * Injects the shell script, opens Moyasar in Chrome Custom Tabs, and creates the push channel.
 * iOS never reaches the Custom Tab path: that platform cancels payment navigations instead.
 */
@CapacitorPlugin(name = "EngineeritShell")
public class EngineeritShellPlugin extends Plugin {

    static final String CHANNEL_ID = "engineerit_default";

    @Override
    public void load() {
        createNotificationChannel();
    }

    /** Call after the bridge has registered Capacitor's own document-start script. */
    public static void injectDocumentStartScript(com.getcapacitor.Bridge bridge) {
        if (bridge == null || bridge.getWebView() == null || bridge.getContext() == null) return;
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) return;
        String script = readAsset(bridge.getContext(), "public/js/policy.js") + "\n" + readAsset(bridge.getContext(), "public/js/inject.js");
        if (script.trim().isEmpty()) return;
        Set<String> origins = new HashSet<>(
            Arrays.asList("https://engineerit.ai", "https://www.engineerit.ai")
        );
        WebViewCompat.addDocumentStartJavaScript(bridge.getWebView(), script, origins);
    }

    @Override
    public Boolean shouldOverrideLoad(Uri url) {
        if (!isPaymentUrl(url)) return null;
        openCustomTab(url);
        return true;
    }

    static boolean isPaymentUrl(Uri url) {
        if (url == null) return false;
        String host = url.getHost();
        if (host == null) return false;
        String value = host.toLowerCase();
        return (
            value.equals("moyasar.com") ||
            value.endsWith(".moyasar.com") ||
            value.equals("paddle.com") ||
            value.endsWith(".paddle.com")
        );
    }

    private void openCustomTab(Uri url) {
        try {
            CustomTabsIntent tabs = new CustomTabsIntent.Builder().setShowTitle(true).setShareState(CustomTabsIntent.SHARE_STATE_OFF).build();
            tabs.intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
            tabs.launchUrl(getActivity(), url);
        } catch (Exception ex) {
            android.content.Intent view = new android.content.Intent(android.content.Intent.ACTION_VIEW, url);
            view.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(view);
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = getContext().getSystemService(NotificationManager.class);
        if (manager == null) return;
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "engineerit AI",
            NotificationManager.IMPORTANCE_DEFAULT
        );
        channel.setDescription("Account and engineering updates");
        manager.createNotificationChannel(channel);
    }

    private static String readAsset(android.content.Context context, String path) {
        StringBuilder builder = new StringBuilder();
        try (InputStream input = context.getAssets().open(path);
            BufferedReader reader = new BufferedReader(new InputStreamReader(input, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                builder.append(line).append('\n');
            }
        } catch (Exception ex) {
            return "";
        }
        return builder.toString();
    }
}
