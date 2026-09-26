using System;
using System.Collections.Generic;
using UnityEngine;

public sealed class VoxelWorldController : MonoBehaviour
{
    [Serializable] private sealed class Vec3Dto { public float x; public float y; public float z; }
    [Serializable] private sealed class TransformDto
    {
        public Vec3Dto position;
        public Vec3Dto rotation;
        public Vec3Dto scale;
    }
    [Serializable] private sealed class ObjectDto
    {
        public string id;
        public string name;
        public bool active = true;
        public TransformDto transform;
    }
    [Serializable] private sealed class SceneDto
    {
        public int version;
        public string sceneId;
        public int tick;
        public float time;
        public ObjectDto[] objects;
    }

    [SerializeField] private Material blockMaterial;
    [SerializeField] private Material playerMaterial;
    [SerializeField] private int maxObjects = 900;

    private readonly Dictionary<string, GameObject> live = new Dictionary<string, GameObject>();
    private readonly HashSet<string> seen = new HashSet<string>();

    public void ApplyScene(string json)
    {
        SceneDto scene;
        try { scene = JsonUtility.FromJson<SceneDto>(json); }
        catch (Exception ex)
        {
            Debug.LogWarning("[PredictLM] invalid scene json: " + ex.Message);
            return;
        }

        if (scene == null || scene.objects == null) return;
        seen.Clear();

        var count = Mathf.Min(scene.objects.Length, maxObjects);
        for (var i = 0; i < count; i++)
        {
            var dto = scene.objects[i];
            if (dto == null || string.IsNullOrEmpty(dto.id) || dto.transform == null || dto.transform.position == null)
                continue;

            seen.Add(dto.id);
            if (!live.TryGetValue(dto.id, out var go) || go == null)
            {
                go = GameObject.CreatePrimitive(dto.id == "player" ? PrimitiveType.Capsule : PrimitiveType.Cube);
                go.name = dto.name ?? dto.id;
                go.transform.SetParent(transform, true);
                var renderer = go.GetComponent<Renderer>();
                if (renderer != null)
                {
                    if (dto.id == "player" && playerMaterial != null) renderer.sharedMaterial = playerMaterial;
                    else if (blockMaterial != null) renderer.sharedMaterial = blockMaterial;
                }
                live[dto.id] = go;
            }

            var p = dto.transform.position;
            go.transform.position = new Vector3(p.x, p.y, p.z);

            var r = dto.transform.rotation;
            if (r != null) go.transform.eulerAngles = new Vector3(r.x, r.y, r.z);

            var s = dto.transform.scale;
            go.transform.localScale = s == null ? Vector3.one : new Vector3(
                Mathf.Approximately(s.x, 0f) ? 1f : s.x,
                Mathf.Approximately(s.y, 0f) ? 1f : s.y,
                Mathf.Approximately(s.z, 0f) ? 1f : s.z
            );
            go.SetActive(dto.active);
        }

        var stale = new List<string>();
        foreach (var pair in live)
            if (!seen.Contains(pair.Key)) stale.Add(pair.Key);

        foreach (var id in stale)
        {
            if (live.TryGetValue(id, out var go) && go != null) Destroy(go);
            live.Remove(id);
        }
    }
}
