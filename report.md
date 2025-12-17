# Calculation and Graphics Work

---

**Student:** Striltsov Denys  
**Group:** TR-52mp  
**Discipline:** Visualization of Graphical and Geometric Information  
**Date:** December 17, 2025

---

## Chapter 1: Task Description

### 1.1 Overview

The purpose of this work is to develop an interactive WebGL application for visualizing a parametric surface of the "shoe surface" type with realistic texturing and lighting. The surface is generated procedurally based on parametric equations defined on the domain $u, v \in [0,1]$.

The application allows real-time interaction with the surface parameters, texture transformation, and lighting conditions. Special attention is paid to correct normal calculation and tangent space construction for normal mapping.

### 1.2 Functional Requirements

The application must fulfill the following requirements:

1. **Parametric Surface Visualization** – The surface is defined as:
   $$x = (u - 0.5) \cdot 2, \quad y = (v - 0.5) \cdot 2, \quad z = \frac{x^3}{3} - \frac{y^2}{2}$$

2. **Adjustable Mesh Resolution** – Parameters $u$ and $v$ can range from 10 to 50 subdivisions.

3. **Texture Coordinate Transformation** – Real-time scaling and rotation around an arbitrary center.

4. **Normal Mapping** – Implementation using tangent space (TBN matrix).

5. **Interactive Camera** – Trackball-style rotation using mouse input.

6. **Animated Lighting** – Light source moving along a circular trajectory.

### 1.3 Scope and Challenges

The main challenges of the task include:

- Correct computation of angle-weighted normals
- Stable calculation of tangents and bitangents with proper handedness
- Dynamic rebuilding of geometry when mesh resolution changes
- Correct implementation of texture coordinate transformations around an arbitrary center

---

## Chapter 2: Theoretical Framework

### 2.1 Parametric Surfaces

A parametric surface is defined by a vector-valued function:

$$\mathbf{r}(u,v) = (x(u,v), y(u,v), z(u,v))$$

In this work, the surface is defined as:

$$\mathbf{r}(u,v) = \left( 2(u - 0.5), \quad 2(v - 0.5), \quad \frac{[2(u - 0.5)]^3}{3} - \frac{[2(v - 0.5)]^2}{2} \right)$$

This function produces a saddle-like surface with cubic curvature along the $x$-axis.

### 2.2 Normal Calculation

To achieve smooth lighting, **angle-weighted normals** are used. For each triangle, a face normal is computed using the cross product of its edges. The contribution of each face normal to a vertex normal is weighted by the angle at that vertex. After accumulation, all vertex normals are normalized.

This method provides better visual smoothness compared to simple averaging.

### 2.3 Tangent Space and Normal Mapping

Normal mapping requires a tangent space basis consisting of:
- Tangent $\mathbf{t}$
- Bitangent $\mathbf{b}$
- Normal $\mathbf{n}$

Tangents are calculated using position and texture coordinate differences within each triangle. The **Gram–Schmidt process** is used to orthogonalize the tangent with respect to the normal. The handedness of the tangent space is stored in the fourth component of the tangent vector.

The **TBN matrix** is constructed in the fragment shader and used to transform normals from tangent space to world space.

### 2.4 Texture Coordinate Transformation

Texture coordinates are transformed in the vertex shader using the following steps:

1. Offset coordinates relative to a user-defined center
2. Rotate by a specified angle
3. Apply uniform scaling
4. Translate coordinates back to the original center

This approach ensures rotation and scaling around an arbitrary point in texture space.

### 2.5 Lighting Model

A modified **Phong lighting model** is used:
- **Diffuse lighting** is computed according to Lambert's law using the perturbed normal from the normal map
- **Specular highlights** are calculated using the Blinn–Phong model, where roughness texture values are inverted to control specular intensity

---

## Chapter 3: Implementation Details

### 3.1 Application Architecture

The application is implemented using pure **WebGL 1.0** and consists of the following modules:

| Module | Description |
|--------|-------------|
| `Model.js` | Generation of parametric geometry, normals, tangents, and buffers |
| `main.js` | WebGL initialization, input handling, uniform updates, and render loop |
| `shader.gpu` | Vertex and fragment shaders |
| `index.html` | User interface and control elements |

### 3.2 Geometry Generation

The surface is discretized into a regular grid in parameter space. Each rectangular cell is split into two triangles. Vertex positions, texture coordinates, indices, normals, and tangents are generated dynamically based on the selected resolution.

When the resolution changes, buffers are rebuilt to maintain stability and performance.

### 3.3 Shader Programs

**Vertex Shader:**
- Performs coordinate transformations
- Applies texture coordinate transformations
- Passes tangent space data to the fragment shader

**Fragment Shader:**
- Reconstructs the TBN matrix
- Applies normal mapping
- Computes lighting using the modified Phong model

### 3.4 Interaction and Controls

User interaction includes:
- Mouse-based camera rotation
- Slider-based parameter adjustment
- Keyboard-based movement of the texture transformation center

### 3.5 Textures

Three high-resolution textures are used:
- **Diffuse map** – Base color information
- **Roughness map** – Surface material properties
- **Normal map** – Surface detail enhancement

Textures are loaded asynchronously and mipmaps are generated for improved rendering quality.

---

## Chapter 4: User Instructions

### 4.1 System Requirements

- Modern web browser with WebGL support (Chrome, Firefox, Edge)
- Local web server to avoid CORS restrictions

### 4.2 Launch Instructions

1. Place all project files in a single directory
2. Start a local server:
```bash
   python -m http.server 8000
```
3. Open `http://localhost:8000` in a browser

### 4.3 Controls

| Action | Control |
|--------|---------|
| Camera rotation | Left mouse button + drag |
| Change U resolution | Slider "Parameter U" |
| Change V resolution | Slider "Parameter V" |
| Texture scale | Slider "Scale" |
| Texture rotation | Slider "Rotation Angle" |
| Move texture center (U) | Keys **A** / **D** |
| Move texture center (V) | Keys **W** / **S** |

### 4.4 Application Interface

![Figure 1 – WebGL application interface with parametric surface visualization and texture control panel](screenshot.png)

**Figure 1** shows the main interface of the developed WebGL application. The central area displays the parametric surface with applied textures and lighting. The control panel on the right allows real-time adjustment of mesh resolution, texture transformation parameters, and transformation center. Keyboard controls are used to shift the texture transformation center along the UV coordinates.

---

## Chapter 5: Source Code Samples

### 5.1 Texture Coordinate Transformation (Vertex Shader)
```glsl
vec2 translated = texcoord - texCenter;
float c = cos(texAngle);
float s = sin(texAngle);
vec2 rotated = vec2(
    c * translated.x - s * translated.y,
    s * translated.x + c * translated.y
);
vec2 scaled = rotated * texScale;
vTexcoord = scaled + texCenter;
```

### 5.2 Normal Mapping with TBN (Fragment Shader)
```glsl
vec3 t = normalize(vTangent);
vec3 n = normalize(vNormal);
vec3 b = vHandedness * normalize(cross(n, t));
mat3 tbn = mat3(t, b, n);

vec3 normalMap = texture2D(u_normal, vTexcoord).rgb * 2.0 - 1.0;
vec3 normal = normalize(tbn * normalMap);
```

### 5.3 Keyboard Control of Texture Center
```javascript
const step = 0.01;
if (key === 'a') texCenterU -= step;
if (key === 'd') texCenterU += step;
if (key === 'w') texCenterV += step;
if (key === 's') texCenterV -= step;
```

---

## Conclusion

The project demonstrates practical application of computer graphics techniques including parametric surface generation, tangent space mathematics, and shader programming with WebGL.

---
