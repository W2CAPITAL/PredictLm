using System;
using System.Runtime.InteropServices;
using UnityEngine;

public sealed class PredictLMBridge : MonoBehaviour
{
    [SerializeField] private VoxelWorldController voxelWorld;

#if UNITY_WEBGL && !UNITY_EDITOR
    [DllImport("__Internal")]
    private static extern void PredictLMInstallParentBridge();
#endif

    private void Awake()
    {
        if (voxelWorld == null)
            voxelWorld = FindObjectOfType<VoxelWorldController>();
    }

    private void Start()
    {
#if UNITY_WEBGL && !UNITY_EDITOR
        PredictLMInstallParentBridge();
#endif
    }

    // Called from the WebGL .jslib bridge.
    public void ReceiveSceneJson(string json)
    {
        if (string.IsNullOrWhiteSpace(json)) return;
        if (voxelWorld != null) voxelWorld.ApplyScene(json);
    }

    // Intentionally small command surface. State remains authoritative in PredictLM.
    public void ReceiveCommandJson(string json)
    {
        if (string.IsNullOrWhiteSpace(json)) return;
        Debug.Log("[PredictLM] command " + json);
    }
}
