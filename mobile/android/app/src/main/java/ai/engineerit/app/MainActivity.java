package ai.engineerit.app;

import android.graphics.Color;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private EngineeritFileChooser fileChooser;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(EngineeritShellPlugin.class);
        fileChooser = new EngineeritFileChooser(this);
        super.onCreate(savedInstanceState);
        getWindow().getDecorView().setBackgroundColor(Color.parseColor("#F9FAFB"));
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().setWebChromeClient(new EngineeritChromeClient(getBridge(), fileChooser));
            EngineeritShellPlugin.injectDocumentStartScript(getBridge());
        }
    }
}
