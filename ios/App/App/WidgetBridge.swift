import Capacitor
import Foundation
import WidgetKit

#if canImport(ActivityKit)
import ActivityKit
#endif

/**
 * The web app's hand into iOS-only surfaces: the Home/Lock Screen widget
 * (state via the shared App Group) and Live Activities (the festival clock
 * on the Lock Screen / Dynamic Island). Called from src/lib/native.ts.
 */
@objc(WidgetBridge)
public class WidgetBridge: CAPPlugin {
    private static let suite = "group.com.couchcinemacollective.app"
    private static let stateKey = "widget.state"

    /// Store the widget's JSON state and refresh every timeline.
    @objc func setState(_ call: CAPPluginCall) {
        guard let json = call.getString("state") else {
            call.reject("state (JSON string) is required")
            return
        }
        UserDefaults(suiteName: Self.suite)?.set(json, forKey: Self.stateKey)
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }

    @objc func clearState(_ call: CAPPluginCall) {
        UserDefaults(suiteName: Self.suite)?.removeObject(forKey: Self.stateKey)
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }

    /// Start (or replace) the festival-clock Live Activity.
    @objc func startActivity(_ call: CAPPluginCall) {
        #if canImport(ActivityKit)
        guard #available(iOS 16.2, *) else {
            call.resolve(["started": false])
            return
        }
        guard let guildName = call.getString("guildName"),
              let filmTitle = call.getString("filmTitle"),
              let phaseLabel = call.getString("phaseLabel"),
              let deadlineMs = call.getDouble("deadline") else {
            call.reject("guildName, filmTitle, phaseLabel, deadline are required")
            return
        }
        let deadline = Date(timeIntervalSince1970: deadlineMs / 1000)
        guard deadline > Date(), ActivityAuthorizationInfo().areActivitiesEnabled else {
            call.resolve(["started": false])
            return
        }

        Task {
            // One festival clock at a time — end any predecessor first.
            for activity in Activity<FestivalActivityAttributes>.activities {
                await activity.end(nil, dismissalPolicy: .immediate)
            }
            let attributes = FestivalActivityAttributes(
                guildName: guildName, filmTitle: filmTitle)
            let state = FestivalActivityAttributes.ContentState(
                deadline: deadline, phaseLabel: phaseLabel)
            do {
                _ = try Activity.request(
                    attributes: attributes,
                    content: .init(state: state, staleDate: deadline))
                call.resolve(["started": true])
            } catch {
                call.resolve(["started": false])
            }
        }
        #else
        call.resolve(["started": false])
        #endif
    }

    /// End every festival Live Activity (window closed, signed out, …).
    @objc func endActivities(_ call: CAPPluginCall) {
        #if canImport(ActivityKit)
        guard #available(iOS 16.2, *) else {
            call.resolve()
            return
        }
        Task {
            for activity in Activity<FestivalActivityAttributes>.activities {
                await activity.end(nil, dismissalPolicy: .immediate)
            }
            call.resolve()
        }
        #else
        call.resolve()
        #endif
    }
}
