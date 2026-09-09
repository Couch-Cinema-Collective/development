import ActivityKit
import SwiftUI
import WidgetKit

/**
 * The festival clock as a Live Activity: the current phase deadline on the
 * Lock Screen and in the Dynamic Island. Started/ended by the app via the
 * WidgetBridge plugin whenever the dashboard has a running window.
 */
struct FestivalLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: FestivalActivityAttributes.self) { context in
            // Lock Screen banner.
            HStack(alignment: .center, spacing: 12) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(context.attributes.guildName.uppercased())
                        .font(.system(size: 10, weight: .medium))
                        .tracking(1.5)
                        .foregroundStyle(Brand.paper.opacity(0.55))
                    Text(context.attributes.filmTitle.uppercased())
                        .font(.system(size: 18, weight: .medium))
                        .foregroundStyle(Brand.paper)
                        .lineLimit(1)
                    Text(context.state.phaseLabel.uppercased())
                        .font(.system(size: 10, weight: .medium))
                        .tracking(1.2)
                        .foregroundStyle(Brand.signal)
                }
                Spacer()
                Text(context.state.deadline, style: .timer)
                    .font(.system(size: 28, weight: .medium))
                    .monospacedDigit()
                    .foregroundStyle(Brand.signal)
                    .frame(maxWidth: 90)
            }
            .padding(14)
            .activityBackgroundTint(Brand.ink)
            .activitySystemActionForegroundColor(Brand.paper)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Text(context.attributes.filmTitle)
                        .font(.headline)
                        .lineLimit(1)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(context.state.deadline, style: .timer)
                        .monospacedDigit()
                        .foregroundStyle(Brand.signal)
                        .frame(maxWidth: 70)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text(context.state.phaseLabel)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            } compactLeading: {
                Text("🎬")
            } compactTrailing: {
                Text(context.state.deadline, style: .timer)
                    .monospacedDigit()
                    .foregroundStyle(Brand.signal)
                    .frame(maxWidth: 44)
            } minimal: {
                Text("🎬")
            }
        }
    }
}
