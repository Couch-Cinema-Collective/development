import Foundation

#if canImport(ActivityKit)
import ActivityKit

/**
 * The Live Activity contract, compiled into both the app (which starts and
 * ends activities via the WidgetBridge plugin) and the widget extension
 * (which renders them on the Lock Screen and in the Dynamic Island).
 */
@available(iOS 16.1, *)
public struct FestivalActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        /// When the current phase closes — rendered as a live countdown.
        public var deadline: Date
        /// "Reviews lock", "Voting closes", "Ceremony reveal" …
        public var phaseLabel: String

        public init(deadline: Date, phaseLabel: String) {
            self.deadline = deadline
            self.phaseLabel = phaseLabel
        }
    }

    public var guildName: String
    public var filmTitle: String

    public init(guildName: String, filmTitle: String) {
        self.guildName = guildName
        self.filmTitle = filmTitle
    }
}
#endif
