package ai.engineerit.app;

import android.net.Uri;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebChromeClient;

/** Keeps Capacitor dialogs and adds a camera plus files chooser for uploads. */
public class EngineeritChromeClient extends BridgeWebChromeClient {

    private final EngineeritFileChooser fileChooser;

    public EngineeritChromeClient(Bridge bridge, EngineeritFileChooser fileChooser) {
        super(bridge);
        this.fileChooser = fileChooser;
    }

    @Override
    public boolean onShowFileChooser(
        WebView webView,
        ValueCallback<Uri[]> filePathCallback,
        FileChooserParams fileChooserParams
    ) {
        fileChooser.rememberAcceptTypes(fileChooserParams);
        fileChooser.show(filePathCallback, fileChooserParams);
        return true;
    }
}
