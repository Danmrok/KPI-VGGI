# WebGL Parametric Shoe Surface with Normal Mapping

## Project Description

This is a pure WebGL web application that demonstrates a **parametric surface in the shape of a shoe sole**, constructed using parametric equations. The surface is rendered with realistic Phong lighting, **normal mapping** in tangent space, and diffuse/specular textures.

The scene includes:

- A rotating point light source moving in a circle around the model
- Interactive camera rotation using the mouse (trackball rotator)
- Two sliders for dynamically adjusting the mesh resolution along U and V parameters
- Wood floor textures (diffuse, specular/roughness, normal map)
- Texture folder/files:
  - `old_wood_floor_diff_2k.png` — diffuse texture
  - `old_wood_floor_rough_2k.png` — specular/roughness map (used as specular)
  - `old_wood_floor/old_wood_floor_nor_gl_2k.png` — normal map (OpenGL format)

