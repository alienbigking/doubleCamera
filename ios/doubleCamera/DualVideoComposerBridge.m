#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(DualVideoComposer, NSObject)

RCT_EXTERN_METHOD(composeDualVideo:(NSString *)rearVideoPath
                  frontVideoPath:(NSString *)frontVideoPath
                  layout:(NSString *)layout
                  pipX:(nonnull NSNumber *)pipX
                  pipY:(nonnull NSNumber *)pipY
                  pipWidth:(nonnull NSNumber *)pipWidth
                  pipHeight:(nonnull NSNumber *)pipHeight
                  previewWidth:(nonnull NSNumber *)previewWidth
                  previewHeight:(nonnull NSNumber *)previewHeight
                  primaryCamera:(NSString *)primaryCamera
                  pipBorderVisible:(BOOL)pipBorderVisible
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
