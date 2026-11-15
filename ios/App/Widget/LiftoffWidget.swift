import SwiftUI
import WidgetKit

struct LaunchEntry: TimelineEntry {
    let date: Date
    let name: String
    let when: String
    let detail: String
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> LaunchEntry {
        LaunchEntry(date: Date(), name: "Next launch", when: "Clock not set", detail: "Liftoff Club")
    }

    func getSnapshot(in context: Context, completion: @escaping (LaunchEntry) -> Void) {
        completion(current())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<LaunchEntry>) -> Void) {
        ScheduleCache.refresh {
            let entry = current()
            let next = Date().addingTimeInterval(30 * 60)
            completion(Timeline(entries: [entry], policy: .after(next)))
        }
    }

    private func current() -> LaunchEntry {
        let text = ScheduleCache.json()
        guard
            let data = text.data(using: .utf8),
            let root = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
            let launches = root["launches"] as? [[String: Any]],
            let first = launches.first
        else {
            return LaunchEntry(date: Date(), name: "Next launch", when: "Clock not set", detail: "Open Liftoff Club once")
        }
        let name = first["name"] as? String ?? "Next launch"
        let when = first["whenLabel"] as? String ?? "Clock not set"
        let rocket = first["rocket"] as? String ?? ""
        return LaunchEntry(date: Date(), name: name, when: when, detail: rocket)
    }
}

struct LiftoffWidgetView: View {
    var entry: LaunchEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Next launch")
                .font(.caption)
                .foregroundStyle(.secondary)
            Text(entry.name)
                .font(.headline)
                .lineLimit(2)
            Text(entry.when)
                .font(.subheadline)
            if !entry.detail.isEmpty {
                Text(entry.detail)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .padding()
        .containerBackground(Color(red: 0.027, green: 0.024, blue: 0.059), for: .widget)
    }
}

@main
struct LiftoffWidget: Widget {
    let kind = "LiftoffWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            LiftoffWidgetView(entry: entry)
        }
        .configurationDisplayName("Next launch")
        .description("The next launch on the public board.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
