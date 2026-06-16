#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(DualPhotoComposer, NSObject)

RCT_EXTERN_METHOD(composeDualPhoto:(NSString *)rearPhotoPath
                  frontPhotoPath:(NSString *)frontPhotoPath
                  layout:(NSString *)layout
                  pipX:(nonnull NSNumber *)pipX
                  pipY:(nonnull NSNumber *)pipY
                  pipWidth:(nonnull NSNumber *)pipWidth
                  pipHeight:(nonnull NSNumber *)pipHeight
                  previewWidth:(nonnull NSNumber *)previewWidth
                  previewHeight:(nonnull NSNumber *)previewHeight
                  aspectRatio:(nonnull NSNumber *)aspectRatio
                  maxLongSide:(nonnull NSNumber *)maxLongSide
                  jpegQuality:(nonnull NSNumber *)jpegQuality
                  primaryCamera:(NSString *)primaryCamera
                  pipBorderVisible:(BOOL)pipBorderVisible
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
