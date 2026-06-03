# DualCam 双摄相机

React Native app for a front/back dual-camera capture experience.

## Current Scope

- Full-screen camera-style interface
- Picture-in-picture and split-screen layout states
- Photo/video mode switching
- Capture preview, gallery mock view, settings drawer, and quick settings panel
- iOS/Android native project names and permissions migrated from the old project

The current UI is a functional prototype shell. Native simultaneous front/back camera capture still needs to be implemented with iOS AVFoundation MultiCam and Android CameraX concurrent camera support.

## Run

```sh
npm start
npm run ios:device
```

For iOS dependencies:

```sh
cd ios
pod install
```

## Verify

```sh
npx tsc --noEmit
npm test -- --runInBand
```
