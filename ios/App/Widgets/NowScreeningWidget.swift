import SwiftUI
import WidgetKit

/// Brand palette — mirrors src/app/globals.css.
enum Brand {
    static let ink = Color(red: 0x0B / 255, green: 0x0B / 255, blue: 0x0B / 255)
    static let paper = Color(red: 0xF7 / 255, green: 0xF5 / 255, blue: 0xF0 / 255)
    static let signal = Color(red: 0xE6 / 255, green: 0x2B / 255, blue: 0x24 / 255)
}

struct NowScreeningEntry: TimelineEntry {
    let date: Date
    let state: WidgetState?
}

struct NowScreeningProvider: TimelineProvider {
    func placeholder(in context: Context) -> NowScreeningEntry {
        NowScreeningEntry(
            date: Date(),
            state: WidgetState(
                guildName: "Your guild", filmTitle: "Now Screening",
                phaseLabel: "Watch & review", deadline: nil,
                position: 1, filmCount: 6))
    }

    func getSnapshot(in context: Context, completion: @escaping (NowScreeningEntry) -> Void) {
        completion(NowScreeningEntry(date: Date(), state: WidgetState.load()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<NowScreeningEntry>) -> Void) {
        let state = WidgetState.load()
        var entries = [NowScreeningEntry(date: Date(), state: state)]
        // One more entry at the deadline so the countdown flips to "closed"
        // without waiting for the next system refresh.
        if let deadline = state?.deadline, deadline > Date() {
            entries.append(NowScreeningEntry(date: deadline, state: state))
        }
        completion(Timeline(entries: entries, policy: .after(Date().addingTimeInterval(60 * 60))))
    }
}

struct NowScreeningView: View {
    var entry: NowScreeningEntry
    @Environment(\.widgetFamily) private var family

    var body: some View {
        switch family {
        case .accessoryRectangular: accessoryRectangular
        case .accessoryInline: accessoryInline
        default: home
        }
    }

    private var home: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(entry.state?.guildName.uppercased() ?? "COUCH CINEMA")
                .font(.system(size: 10, weight: .medium))
                .tracking(1.5)
                .foregroundStyle(Brand.paper.opacity(0.55))
                .lineLimit(1)

            Text(entry.state?.filmTitle.uppercased() ?? "NO FESTIVAL RUNNING")
                .font(.system(size: family == .systemMedium ? 22 : 17, weight: .medium))
                .foregroundStyle(Brand.paper)
                .lineLimit(2)
                .minimumScaleFactor(0.7)

            Spacer(minLength: 2)

            if let state = entry.state {
                if let deadline = state.deadline, deadline > entry.date {
                    Text(state.phaseLabel.uppercased())
                        .font(.system(size: 9, weight: .medium))
                        .tracking(1.2)
                        .foregroundStyle(Brand.paper.opacity(0.55))
                    Text(deadline, style: .timer)
                        .font(.system(size: 24, weight: .medium, design: .default))
                        .monospacedDigit()
                        .foregroundStyle(Brand.signal)
                } else {
                    Text(state.phaseLabel.uppercased())
                        .font(.system(size: 11, weight: .medium))
                        .tracking(1.2)
                        .foregroundStyle(Brand.signal)
                }
                if let position = state.position, let count = state.filmCount {
                    Text("Film \(position) of \(count)")
                        .font(.system(size: 10))
                        .foregroundStyle(Brand.paper.opacity(0.55))
                }
            } else {
                Text("Open the app to start a festival")
                    .font(.system(size: 10))
                    .foregroundStyle(Brand.paper.opacity(0.55))
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }

    private var accessoryRectangular: some View {
        VStack(alignment: .leading, spacing: 1) {
            Text(entry.state?.filmTitle ?? "Couch Cinema")
                .font(.headline)
                .lineLimit(1)
            if let state = entry.state, let deadline = state.deadline, deadline > entry.date {
                Text(state.phaseLabel).font(.caption2)
                Text(deadline, style: .timer).font(.caption).monospacedDigit()
            } else {
                Text(entry.state?.phaseLabel ?? "No festival running").font(.caption2)
            }
        }
    }

    private var accessoryInline: some View {
        Text(entry.state.map { "🎬 \($0.filmTitle)" } ?? "🎬 Couch Cinema")
    }
}

struct NowScreeningWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "NowScreening", provider: NowScreeningProvider()) { entry in
            NowScreeningView(entry: entry)
                .containerBackground(Brand.ink, for: .widget)
        }
        .configurationDisplayName("Now Screening")
        .description("This week's film and the time left on its window.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular, .accessoryInline])
    }
}
