import Capacitor
import UIKit
import WebKit

class EngineeritViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(EngineeritShellPlugin())
        injectShellScript()
    }

    /// Document-start injection keeps the iOS reader rules in place before the site paints.
    private func injectShellScript() {
        guard let webView = webView else { return }
        let source = Self.loadBundled("policy") + "\n" + Self.loadBundled("inject")
        let trimmed = source.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        let script = WKUserScript(source: source, injectionTime: .atDocumentStart, forMainFrameOnly: true)
        webView.configuration.userContentController.addUserScript(script)
    }

    private static func loadBundled(_ name: String) -> String {
        let url = Bundle.main.url(forResource: name, withExtension: "js", subdirectory: "public/js")
        guard let url, let text = try? String(contentsOf: url, encoding: .utf8) else {
            return ""
        }
        return text
    }
}
