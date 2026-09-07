#import <Capacitor/Capacitor.h>

CAP_PLUGIN(WidgetBridge, "WidgetBridge",
  CAP_PLUGIN_METHOD(setState, CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(clearState, CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(startActivity, CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(endActivities, CAPPluginReturnPromise);
)
