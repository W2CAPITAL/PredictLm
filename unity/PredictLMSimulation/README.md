# PredictLM Unity Simulation Bridge

This folder is a native Unity-side companion for the browser simulation.

It exists because the Next.js/Vercel runtime cannot execute the Unity Editor or a native Unity player.
The browser app therefore keeps a native renderer and a shared Unity-style scene contract. When a Unity
WebGL build is produced, set:

`NEXT_PUBLIC_UNITY_SIMULATION_URL=https://.../index.html`

The PredictLM Simulation iframe will then stream scene snapshots to this build.

## Architecture

- `PredictLMBridge.cs` receives JSON scene snapshots and commands.
- `VoxelWorldController.cs` owns generated block proxies and player state.
- `PredictLMWebGL.jslib` forwards parent-window `postMessage` messages to the Unity player.
- Browser contract: `src/lib/unity-fabric.ts`.
- Voxel world contract: `src/lib/simulation/minecraft-sandbox.ts`.

## UnEngine reference

The scene/component semantics are adapted from `jbruening/UnEngine` (MIT):
GameObject, Component, Transform, Vector3, Camera, Collider, Rigidbody, Input, Time and PlayerPrefs-style
separation. No Unity proprietary binaries are committed here.

## WebGL build

Create a Unity project, copy `Assets/` into it, create a scene with:
1. an empty object named `PredictLMBridge` with `PredictLMBridge` attached;
2. an empty object named `VoxelWorld` with `VoxelWorldController` attached;
3. a camera/light setup;
4. WebGL as build target.

The generated WebGL output stays outside Vercel unless explicitly hosted as a static build.
