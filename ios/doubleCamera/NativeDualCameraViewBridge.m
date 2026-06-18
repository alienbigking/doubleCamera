#import <React/RCTViewManager.h>
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(NativeCameraTestModule, NSObject)

RCT_EXTERN_METHOD(showMinimalCamera:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end

@interface RCT_EXTERN_MODULE(NativeDualCameraViewManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(layoutMode, NSString)
RCT_EXPORT_VIEW_PROPERTY(primaryCamera, NSString)
RCT_EXPORT_VIEW_PROPERTY(pipX, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(pipY, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(pipWidth, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(pipHeight, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(pipBorderVisible, BOOL)
RCT_EXPORT_VIEW_PROPERTY(frameCaptureEnabled, BOOL)
RCT_EXPORT_VIEW_PROPERTY(dualPreviewEnabled, BOOL)
RCT_EXPORT_VIEW_PROPERTY(active, BOOL)
RCT_EXPORT_VIEW_PROPERTY(onReady, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onError, RCTDirectEventBlock)

RCT_EXTERN_METHOD(capturePhoto:(NSDictionary *)options
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(focusPrimaryAtPoint:(NSDictionary *)options
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(startVideoRecording:(NSDictionary *)options
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(stopVideoRecording:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
