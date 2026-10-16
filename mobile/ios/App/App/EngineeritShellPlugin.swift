import Capacitor
import Foundation
import WebKit

/// Cancels Moyasar and other checkout navigations inside the iOS app.
/// Guideline 3.1: this shell does not sell digital subscriptions.
@objc(EngineeritShellPlugin)
public class EngineeritShellPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "EngineeritShellPlugin"
    public let jsName = "EngineeritShell"
    public let pluginMethods: [CAPPluginMethod] = []

    override public func shouldOverrideLoad(_ navigationAction: WKNavigationAction) -> NSNumber? {
        guard let url = navigationAction.request.url, Self.isPayment(url) else {
            return nil
        }
        DispatchQueue.main.async { [weak self] in
            self?.bridge?.webView?.evaluateJavaScript(
                "window.__engineeritShowReader && window.__engineeritShowReader()",
                completionHandler: nil
            )
        }
        return NSNumber(value: true)
    }

    static func isPayment(_ url: URL) -> Bool {
        guard let host = url.host?.lowercased() else { return false }
        return host == "moyasar.com"
            || host.hasSuffix(".moyasar.com")
            || host == "paddle.com"
            || host.hasSuffix(".paddle.com")
    }
}
