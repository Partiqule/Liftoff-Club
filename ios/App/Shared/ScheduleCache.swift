import Foundation

enum ScheduleCache {
    static let appGroup = "group.app.liftoffclub"
    static let key = "schedule"
    static let endpoint = URL(string: "https://liftoffclub.app/api/ios/schedule")!

    static var defaults: UserDefaults? {
        UserDefaults(suiteName: appGroup)
    }

    static func refresh(completion: (() -> Void)? = nil) {
        let request = URLRequest(url: endpoint, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 20)
        URLSession.shared.dataTask(with: request) { data, response, _ in
            if let data, let http = response as? HTTPURLResponse, http.statusCode == 200 {
                defaults?.set(data, forKey: key)
            }
            completion?()
        }.resume()
    }

    static func json() -> String {
        if let data = defaults?.data(forKey: key), let text = String(data: data, encoding: .utf8) {
            return text
        }
        return "{\"launches\":[]}"
    }
}
