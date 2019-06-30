# demo-avisualiser-js
Audio visualiser using Web Audio API.
Uses AudioWorklets if available and falls back to ScriptProcessor otherwise.

Note: [Audio Worklets and AudioContext require a secure context](https://developers.google.com/web/updates/2017/12/audio-worklet#registration_and_instantiation). This means that they can only be used in `localhost` or remote https but not when opening as a local file.

Depends on [PixelsCommander/Download-File-JS](https://github.com/PixelsCommander/Download-File-JS) and [higuma/wav-audio-encoder-js](https://github.com/higuma/wav-audio-encoder-js)
