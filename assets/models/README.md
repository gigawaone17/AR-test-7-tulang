# Blender GLB Model

Export your Blender asset as `model.glb` and place it in this folder:

```text
assets/models/model.glb
```

Recommended Blender export settings:

- Format: `glTF Binary (.glb)`
- Transform: apply scale and rotation before export
- Geometry: include normals and UVs
- Materials: use image textures or Principled BSDF materials
- Animation: include only if the AR model should animate

The AR page already loads `./assets/models/model.glb`.
