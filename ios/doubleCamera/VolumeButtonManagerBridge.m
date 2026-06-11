#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(VolumeButtonManager, RCTEventEmitter)
RCT_EXTERN_METHOD(prepareRecordingAudio:(nonnull NSNumber *)channelCount
                  sampleRate:(nonnull NSNumber *)sampleRate
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(requestCurrentLocation:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
@end
