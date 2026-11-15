import Capacitor
import Foundation

@objc(LiftoffNativePlugin)
public class LiftoffNativePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LiftoffNativePlugin"
    public let jsName = "LiftoffNative"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getSchedule", returnType: CAPPluginReturnPromise)
    ]

    @objc func getSchedule(_ call: CAPPluginCall) {
        call.resolve(["json": ScheduleCache.json()])
    }
}
