# WebGL Surface Visualization with Phong Shading

## Overview
Interactive 3D surface visualization implementing Phong shading, dynamic mesh resolution, and real-time lighting effects.

## Surface Function
```javascript
x = (u - 0.5) * 2.0
y = (v - 0.5) * 2.0
z = (x * x * x) / 3.0 - (y * y) / 2.0
```
Where u ∈ [0, 1] and v ∈ [0, 1]

## Features

### Rendering
- Vertex Buffer Objects (VBO) with indexed triangles
- Dynamic mesh resolution (U/V: 10-100 steps)
- Phong shading with rotating light source
- Facet Angle Weighted Average normals

### Interactive Controls
- Mouse/touch rotation control
- U/V resolution sliders
- Real-time surface updates
- Performance-optimized updates

### Lighting
- Ambient, Diffuse, and Specular components
- Rotating point light source
- Per-fragment lighting calculations
- Dynamic normal recalculation

## Quick Start

1. Start local server:
   ```bash
   python3 -m http.server 8000
   ```

2. Open in browser:
   ```
   http://localhost:8000
   ```

3. Controls:
   - Drag to rotate view
   - Use sliders to adjust resolution
   - Watch rotating light effects

## Technical Details

### Shaders
- Vertex shader: position, normal, and lighting calculations
- Fragment shader: Phong lighting model implementation

### Optimizations
- Debounced mesh updates
- Efficient normal calculations
- Optimized buffer management
- WebGL state preservation

### Requirements
- WebGL-compatible browser
- JavaScript enabled
- GPU with shader support
