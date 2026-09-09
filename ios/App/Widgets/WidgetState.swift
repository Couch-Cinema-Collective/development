import Foundation

/**
 * What the web app hands across the bridge for the Home/Lock Screen widget.
 * Written by WidgetBridge (app target) into the shared App Group; read by
 * the timeline provider (widget target). JSON, ISO-8601 dates.
 */
struct WidgetState: Codable {
    var guildName: String
    var filmTitle: String
    var phaseLabel: String
    var deadline: Date?
    var position: Int?
    var filmCount: Int?

    static let suiteName = "group.com.couchcinemacollective.app"
    static let key = "widget.state"

    static func load() -> WidgetState? {
        guard let json = UserDefaults(suiteName: suiteName)?.string(forKey: key),
              let data = json.data(using: .utf8) else { return nil }
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try? decoder.decode(WidgetState.self, from: data)
    }
}
