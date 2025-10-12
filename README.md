# WebGL Wallis Surface Renderer

## Start

```bash

python3 -m http.server 8000

```

Open `http://localhost:8000` in your browser.

- **x = (u - 0.5) * 2.0** 
- **y = (v - 0.5) * 2.0**
- **z = (x * x * x) / 3.0 - (y * y) / 2.0**

Where u ∈ [0, Math.PI] and v ∈ [-1, 1]
