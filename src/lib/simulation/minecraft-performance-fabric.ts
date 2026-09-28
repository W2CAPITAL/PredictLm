export type MinecraftPerformanceReferenceMode='runtime-pattern'|'media-pattern'|'system-pattern'|'native-reference';

export interface MinecraftPerformanceReference{
  repo:string;
  mode:MinecraftPerformanceReferenceMode;
  role:string;
  browserUse:string;
  nativeBoundary:string;
}

export const MINECRAFT_PERFORMANCE_REFERENCES:readonly MinecraftPerformanceReference[]=[
  {
    repo:'rakanki911/DLSS5-Swapper',
    mode:'native-reference',
    role:'capability detection, reversible install/restore flows and diagnostics',
    browserUse:'adaptive render-route selection and explicit fallback diagnostics',
    nativeBoundary:'No DLL swapping, NVIDIA runtime injection or game-folder modification is performed by PredictLM web runtime.'
  },
  {
    repo:'Kizzuwatnaa/DLSS5-Autopilot',
    mode:'native-reference',
    role:'automatic route selection, measured-cost feedback and fallback loops',
    browserUse:'auto quality governor chooses render scale/LOD from measured frame cost and can fall back without user intervention',
    nativeBoundary:'No external game scanning, executable patching or runtime downloading.'
  },
  {
    repo:'Blinue/Magpie',
    mode:'runtime-pattern',
    role:'official Windows window-upscaling reference: scaling effects, capture-mode fallback, frame-rate limiting, duplicate-frame detection and performance diagnostics',
    browserUse:'demand-driven voxel rendering, measured frame-cost governor, reduced internal resolution, crisp browser upscaling and explicit quality/performance presets',
    nativeBoundary:'Official Magpie is GPL-3.0 and Windows/DirectX native. PredictLM does not copy/link its GPL implementation, capture APIs or native effects into the Next.js browser runtime; only architecture-level behavior is reimplemented independently.'
  },
  {
    repo:'Merserk/dlss5-visual-enhancer',
    mode:'media-pattern',
    role:'separate image/video pipelines, preview caching, enhancement stages and export',
    browserUse:'simulation screenshot/video capture with ordered enhancement metadata and quality presets',
    nativeBoundary:'No proprietary DLSS/RTX/NVENC runtime is bundled.'
  },
  {
    repo:'perseval-BLR/NeuralScreen',
    mode:'media-pattern',
    role:'reduced processing resolution, before/after thinking, capture and recording',
    browserUse:'dynamic internal resolution, browser-native captureStream/MediaRecorder and HD screenshot export',
    nativeBoundary:'No desktop overlay, bundled NVIDIA runtime, Spout2 or Windows capture APIs.'
  },
  {
    repo:'hellzerg/optimizer',
    mode:'system-pattern',
    role:'hardware inspection, reversible tuning and explicit system-scope controls',
    browserUse:'browser capability detection and non-destructive quality presets',
    nativeBoundary:'PredictLM does not disable services, telemetry, Defender, HPET or Windows Update.'
  },
  {
    repo:'IgorMundstein/WinMemoryCleaner',
    mode:'system-pattern',
    role:'threshold-based resource pressure handling and transparent metrics',
    browserUse:'memory-pressure guard can drop transient mesh caches and reduce quality instead of forcing OS memory cleanup',
    nativeBoundary:'No working-set, standby-list or system-cache manipulation from the browser.'
  },
  {
    repo:'thedogecraft/sparkle',
    mode:'system-pattern',
    role:'preset-based optimization, hardware stats and reversible choices',
    browserUse:'Performance/Balanced/Quality/Cinematic presets and restore-to-auto behavior',
    nativeBoundary:'No registry, PowerShell, debloat, service or driver tweaks.'
  },
  {
    repo:'GPUOpen-LibrariesAndSDKs/FidelityFX-SDK',
    mode:'runtime-pattern',
    role:'dynamic-resolution, temporal/spatial upscaling, sharpening and frame-pacing architecture',
    browserUse:'FSR-inspired render-scale/sharpen separation and stable frame-budget logic implemented in WebGL-compatible code',
    nativeBoundary:'This is not AMD FSR SDK execution; no DirectX/Vulkan SDK binary is embedded.'
  },
  {
    repo:'Minecraft-Radiance/Radiance',
    mode:'runtime-pattern',
    role:'modern Minecraft renderer split, high-performance renderer and upscale-friendly pipeline',
    browserUse:'separate world simulation from renderer quality layer; keep modern renderer replaceable',
    nativeBoundary:'No Java mod, Vulkan renderer, ray tracing or DLSS runtime is embedded in the web app.'
  },
  {
    repo:'fholger/openvr_fsr',
    mode:'runtime-pattern',
    role:'renderScale, sharpening and center-priority/foveated quality',
    browserUse:'far-world LOD plus center-priority detail and adaptive sharpening at reduced internal resolution',
    nativeBoundary:'No OpenVR DLL replacement or SteamVR injection.'
  }
] as const;

export function minecraftPerformanceReferenceAudit(){
  const expected=11;
  return{
    expected,
    registered:MINECRAFT_PERFORMANCE_REFERENCES.length,
    complete:MINECRAFT_PERFORMANCE_REFERENCES.length===expected,
    nativeOnly:MINECRAFT_PERFORMANCE_REFERENCES.filter(x=>x.mode==='native-reference'||x.mode==='system-pattern').map(x=>x.repo),
    runtimePatterns:MINECRAFT_PERFORMANCE_REFERENCES.filter(x=>x.mode==='runtime-pattern'||x.mode==='media-pattern').map(x=>x.repo)
  };
}
