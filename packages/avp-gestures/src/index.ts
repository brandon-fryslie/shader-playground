// Public surface of avp-gestures: the Apple Vision Pro hand input-frame and the
// intent-neutral gesture vocabulary. This barrel is intentionally empty in the
// scaffold — the input-frame type, the gesture union, the WebXR input adapter,
// and the pure recognizer land in sibling tickets (shader-xr-ui-t6i.3 / .6).
// The package exists now so the one-way dependency direction (xr-ui -> avp-gestures,
// app -> both) is established and compile-enforced from the start. [LAW:one-way-deps]
export {};
