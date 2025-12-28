'use strict';

let gl;                          
let surfaceModel;                
let shProgram;                  
let spaceball;                  
let lightAngle = 0;
let lightRadius = 5.0;
let lastTime = 0;

let uSlider, vSlider;
let scaleSlider, angleSlider;
let ambientSlider, diffuseSlider, specularSlider, shininessSlider;

let diffuseTexture;
let specularTexture;
let normalTexture;
let texCenterU = 0.5;
let texCenterV = 0.5;
let texScale = 1.0;
let texAngle = 0.0; 

function deg2rad(angle) {
    return angle * Math.PI / 180;
}

function ShaderProgram(name, program) {
    this.name = name;
    this.prog = program;
    this.iAttribVertex = -1;
    this.iAttribNormal = -1;
    this.iAttribTexcoord = -1;
    this.iAttribTangent = -1;
    this.iModelViewMatrix = -1;
    this.iModelViewProjectionMatrix = -1;
    this.iNormalMatrix = -1;
    this.iLightPosition = -1;
    this.iAmbientColor = -1;
    this.iDiffuseColor = -1;
    this.iSpecularColor = -1;
    this.iShininess = -1;
    this.iDiffuse = -1;
    this.iSpecular = -1;
    this.iNormal = -1;
    this.iTexCenter = -1;
    this.iTexAngle = -1;
    this.iTexScale = -1;
    this.Use = function() { gl.useProgram(this.prog); };
}

function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader( gl.VERTEX_SHADER );
    gl.shaderSource(vsh,vShader);
    gl.compileShader(vsh);
    if ( ! gl.getShaderParameter(vsh, gl.COMPILE_STATUS) ) {
        const error = gl.getShaderInfoLog(vsh);
        console.error("Vertex shader error:", error);
        throw new Error("Error in vertex shader:  " + error);
    }
    console.log('Vertex shader compiled successfully');
    
    let fsh = gl.createShader( gl.FRAGMENT_SHADER );
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if ( ! gl.getShaderParameter(fsh, gl.COMPILE_STATUS) ) {
       const error = gl.getShaderInfoLog(fsh);
       console.error("Fragment shader error:", error);
       throw new Error("Error in fragment shader:  " + error);
    }
    console.log('Fragment shader compiled successfully');
    
    let prog = gl.createProgram();
    gl.attachShader(prog,vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if ( ! gl.getProgramParameter( prog, gl.LINK_STATUS) ) {
       const error = gl.getProgramInfoLog(prog);
       console.error("Program link error:", error);
       throw new Error("Link error in program:  " + error);
    }
    console.log('Shader program linked successfully');
    return prog;
}

function createTexture(gl, url) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 255, 255]));

  const image = new Image();
  if (url.startsWith('http://') || url.startsWith('https://')) {
    image.crossOrigin = 'anonymous';
  }
  image.src = url;
  image.addEventListener('load', () => {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    console.log('Texture loaded:', url);
  });
  image.addEventListener('error', (e) => {
    console.error('Failed to load texture:', url, e);
  });

  return tex;
}

let drawCallCount = 0;

function draw(currentTime) {
    drawCallCount++;
    
    const canvas = document.getElementById("webglcanvas");
    gl.viewport(0, 0, canvas.width, canvas.height);
    
    gl.clearColor(0.12,0.12,0.12,1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    if (drawCallCount === 1 && shProgram && shProgram.prog && surfaceModel && spaceball) {
        console.log('Canvas cleared successfully. Ready to draw model.');
    }

    if (!shProgram || !shProgram.prog || !surfaceModel || !spaceball) {
        if (drawCallCount <= 5) {
            console.log('Waiting for initialization...', {
                shProgram: !!shProgram,
                prog: !!(shProgram && shProgram.prog),
                surfaceModel: !!surfaceModel,
                spaceball: !!spaceball
            });
        }
        requestAnimationFrame(draw);
        return;
    }
    
    if (drawCallCount === 1) {
        console.log('First successful draw call!', {
            shProgram: !!shProgram,
            surfaceModel: !!surfaceModel,
            spaceball: !!spaceball,
            modelIndexCount: surfaceModel.indexCount,
            modelVertexCount: surfaceModel.vertexCount
        });
    }

    if (lastTime != 0) {
        const deltaTime = (currentTime - lastTime) / 1000.0; 
        lightAngle += deltaTime * 0.5;
    }
    lastTime = currentTime;

    const lightX = Math.cos(lightAngle) * lightRadius;
    const lightZ = Math.sin(lightAngle) * lightRadius;
    const lightPosition = [lightX, 3.0, lightZ];

    let projection = m4.perspective(Math.PI/6, 1, 0.1, 100);
    let modelView = spaceball.getViewMatrix();

    let rotateToPointZero = m4.axisRotation([0.707,0.707,0], 0.7);
    let translateToPointZero = m4.translation(0, 0, -6);
    
    const scaleFactor = 0.7;
    let scaleMatrix = m4.scaling(scaleFactor, scaleFactor, scaleFactor);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView);
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0);
    let matAccum2 = m4.multiply(scaleMatrix, matAccum1);
     
    let modelViewProjection = m4.multiply(projection, matAccum2);
    let normalMatrix = m4.transpose(m4.inverse(matAccum2));
     
    gl.useProgram(shProgram.prog);
     
    if (shProgram.iModelViewProjectionMatrix === -1) {
        console.error('iModelViewProjectionMatrix is -1!');
    }
    if (shProgram.iModelViewMatrix === -1) {
        console.error('iModelViewMatrix is -1!');
    }
    if (shProgram.iNormalMatrix === -1) {
        console.error('iNormalMatrix is -1!');
    }
    if (shProgram.iLightPosition === -1) {
        console.error('iLightPosition is -1!');
    }
    
    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);
    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, matAccum2);
    gl.uniformMatrix4fv(shProgram.iNormalMatrix, false, normalMatrix);
     
    gl.uniform3fv(shProgram.iLightPosition, lightPosition);

    const ka = ambientSlider ? parseFloat(ambientSlider.value) : 0.35;
    const kd = diffuseSlider ? parseFloat(diffuseSlider.value) : 1.0;
    const ks = specularSlider ? parseFloat(specularSlider.value) : 1.0;
    const shininess = shininessSlider ? parseFloat(shininessSlider.value) : 80;

    gl.uniform3fv(shProgram.iAmbientColor, [ka, ka, ka]);
    gl.uniform3fv(shProgram.iDiffuseColor, [kd, kd, kd]);
    gl.uniform3fv(shProgram.iSpecularColor, [ks, ks, ks]);
    gl.uniform1f(shProgram.iShininess, shininess);

    if (shProgram.iTexCenter !== -1) {
        gl.uniform2fv(shProgram.iTexCenter, [texCenterU, texCenterV]);
    }
    if (shProgram.iTexAngle !== -1) {
        gl.uniform1f(shProgram.iTexAngle, deg2rad(texAngle));
    }
    if (shProgram.iTexScale !== -1) {
        gl.uniform1f(shProgram.iTexScale, texScale);
    }

    if (shProgram.iDiffuse !== -1) {
        gl.activeTexture(gl.TEXTURE0);
        if (diffuseTexture) {
            gl.bindTexture(gl.TEXTURE_2D, diffuseTexture);
        } else {
            gl.bindTexture(gl.TEXTURE_2D, null);
        }
        gl.uniform1i(shProgram.iDiffuse, 0);
    }

    if (shProgram.iSpecular !== -1) {
        gl.activeTexture(gl.TEXTURE1);
        if (specularTexture) {
            gl.bindTexture(gl.TEXTURE_2D, specularTexture);
        } else {
            gl.bindTexture(gl.TEXTURE_2D, null);
        }
        gl.uniform1i(shProgram.iSpecular, 1);
    }

    if (shProgram.iNormal !== -1) {
        gl.activeTexture(gl.TEXTURE2);
        if (normalTexture) {
            gl.bindTexture(gl.TEXTURE_2D, normalTexture);
        } else {
            gl.bindTexture(gl.TEXTURE_2D, null);
        }
        gl.uniform1i(shProgram.iNormal, 2);
    }

    const glError = gl.getError();
    if (glError !== gl.NO_ERROR) {
        console.warn('WebGL error before Draw:', glError);
    }

    // Діагностика перед малюванням
    if (surfaceModel.indexCount === 0) {
        console.error('Model has no indices!', {
            vertexCount: surfaceModel.vertexCount,
            indexCount: surfaceModel.indexCount
        });
        requestAnimationFrame(draw);
        return;
    }
    
    if (currentTime < 100) {
        console.log('Drawing frame:', {
            indexCount: surfaceModel.indexCount,
            vertexCount: surfaceModel.vertexCount,
            hasTextures: {
                diffuse: !!diffuseTexture,
                specular: !!specularTexture,
                normal: !!normalTexture
            },
            uniforms: {
                mvp: shProgram.iModelViewProjectionMatrix,
                mv: shProgram.iModelViewMatrix,
                nm: shProgram.iNormalMatrix,
                light: shProgram.iLightPosition
            }
        });
    }

    surfaceModel.Draw();
    
    const glErrorAfter = gl.getError();
    if (glErrorAfter !== gl.NO_ERROR) {
        console.error('WebGL error after Draw:', glErrorAfter);
    }
    requestAnimationFrame(draw);
}

function initGL() {
    const canvas = document.getElementById("webglcanvas");
    gl.viewport(0, 0, canvas.width, canvas.height);
    console.log('Viewport set to:', canvas.width, 'x', canvas.height);
    
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
    shProgram.iAttribNormal = gl.getAttribLocation(prog, "normal");
    shProgram.iAttribTexcoord = gl.getAttribLocation(prog, "texcoord");
    shProgram.iAttribTangent = gl.getAttribLocation(prog, "tangent");
    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    shProgram.iModelViewMatrix = gl.getUniformLocation(prog, "ModelViewMatrix");
    shProgram.iNormalMatrix = gl.getUniformLocation(prog, "NormalMatrix");
    shProgram.iLightPosition = gl.getUniformLocation(prog, "lightPosition");
    shProgram.iAmbientColor = gl.getUniformLocation(prog, "ambientColor");
    shProgram.iDiffuseColor = gl.getUniformLocation(prog, "diffuseColor");
    shProgram.iSpecularColor = gl.getUniformLocation(prog, "specularColor");
    shProgram.iShininess = gl.getUniformLocation(prog, "shininess");
    shProgram.iDiffuse = gl.getUniformLocation(prog, "u_diffuse");
    shProgram.iSpecular = gl.getUniformLocation(prog, "u_specular");
    shProgram.iNormal = gl.getUniformLocation(prog, "u_normal");
    shProgram.iTexCenter = gl.getUniformLocation(prog, "texCenter");
    shProgram.iTexAngle = gl.getUniformLocation(prog, "texAngle");
    shProgram.iTexScale = gl.getUniformLocation(prog, "texScale");

    setupSliders();

    surfaceModel = new Model('ShoeSurface', gl, {
        uSteps: parseInt(uSlider.value),
        vSteps: parseInt(vSlider.value)
    });

    surfaceModel.init();

    console.log('Model initialized:', {
        vertexCount: surfaceModel.vertexCount,
        indexCount: surfaceModel.indexCount,
        uSteps: surfaceModel.uSteps,
        vSteps: surfaceModel.vSteps
    });

    diffuseTexture = createTexture(gl, 'old_wood_floor_diff_2k.png');
    specularTexture = createTexture(gl, 'old_wood_floor_rough_2k.png');
    normalTexture = createTexture(gl, 'old_wood_floor_nor_gl_2k.png');
    
    console.log('Textures created:', {
        diffuse: !!diffuseTexture,
        specular: !!specularTexture,
        normal: !!normalTexture
    });
     
    gl.enable(gl.DEPTH_TEST);
    
    console.log('Shader program attributes:', {
        vertex: shProgram.iAttribVertex,
        normal: shProgram.iAttribNormal,
        texcoord: shProgram.iAttribTexcoord,
        tangent: shProgram.iAttribTangent
    });
    
    console.log('Shader program uniforms:', {
        diffuse: shProgram.iDiffuse,
        specular: shProgram.iSpecular,
        normal: shProgram.iNormal,
        texCenter: shProgram.iTexCenter,
        texAngle: shProgram.iTexAngle,
        texScale: shProgram.iTexScale
    });
    
    console.log('Initialization complete. Starting render loop...');
    console.log('Check console for any errors. If nothing appears, check:');
    console.log('1. Are textures loading? (Look for "Texture loaded" messages)');
    console.log('2. Is Draw being called? (Look for "First successful draw call" message)');
    console.log('3. Are there WebGL errors? (Look for error messages)');
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

const debouncedUpdateSurface = debounce((uValue, vValue) => {
    if (surfaceModel && gl && shProgram) {
        surfaceModel.resize(uValue, vValue);
        surfaceModel.init();        
        gl.useProgram(shProgram.prog);
    }
}, 150);

function setupSliders() {
    uSlider = document.getElementById('uSlider');
    vSlider = document.getElementById('vSlider');
    scaleSlider = document.getElementById('scaleSlider');
    angleSlider = document.getElementById('angleSlider');
    
    ambientSlider = document.getElementById('ambientSlider');
    diffuseSlider = document.getElementById('diffuseSlider');
    specularSlider = document.getElementById('specularSlider');
    shininessSlider = document.getElementById('shininessSlider');
     
    function handleMaterialChange() {
        document.getElementById('ambientValue').textContent = ambientSlider.value;
        document.getElementById('diffuseValue').textContent = diffuseSlider.value;
        document.getElementById('specularValue').textContent = specularSlider.value;
        document.getElementById('shininessValue').textContent = shininessSlider.value;
    }

    ambientSlider.addEventListener('input', handleMaterialChange);
    diffuseSlider.addEventListener('input', handleMaterialChange);
    specularSlider.addEventListener('input', handleMaterialChange);
    shininessSlider.addEventListener('input', handleMaterialChange);

    function handleGeometryChange() {
        const uValue = parseInt(uSlider.value);
        const vValue = parseInt(vSlider.value);
        texScale = parseFloat(scaleSlider.value);
        texAngle = parseInt(angleSlider.value);
         
        document.getElementById('uValue').textContent = uValue;
        document.getElementById('vValue').textContent = vValue;
        document.getElementById('scaleValue').textContent = texScale.toFixed(1);
        document.getElementById('angleValue').textContent = texAngle;
         
        debouncedUpdateSurface(uValue, vValue);
    }

    uSlider.addEventListener('input', handleGeometryChange);
    vSlider.addEventListener('input', handleGeometryChange);
    scaleSlider.addEventListener('input', handleGeometryChange);
    angleSlider.addEventListener('input', handleGeometryChange);
}

function handleKeyDown(event) {
    let changed = false;
    const step = 0.01;

    switch (event.key.toLowerCase()) {
        case 'a':
            texCenterU -= step;
            changed = true;
            break;
        case 'd':
            texCenterU += step;
            changed = true;
            break;
        case 'w':
            texCenterV += step;
            changed = true;
            break;
        case 's':
            texCenterV -= step;
            changed = true;
            break;
    }

    texCenterU = Math.max(0, Math.min(1, texCenterU));
    texCenterV = Math.max(0, Math.min(1, texCenterV));

    if (changed) {
        document.getElementById('centerUValue').textContent = texCenterU.toFixed(2);
        document.getElementById('centerVValue').textContent = texCenterV.toFixed(2);
    }
}

function init() {
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if (!gl) throw "Browser does not support WebGL";
    }
    catch (e) {
        document.getElementById("error-message").textContent = 
            "Вибачте, не вдалося отримати контекст WebGL.";
        return;
    }

    try {
        initGL();
    }
    catch (e) {
        document.getElementById("error-message").textContent = 
            "Помилка ініціалізації WebGL: " + e;
        return;
    }

    document.addEventListener('keydown', handleKeyDown);

    const rotatorCallback = () => {
        if (shProgram && gl) {
            gl.useProgram(shProgram.prog);
            requestAnimationFrame(draw);
        }
    };

    spaceball = new TrackballRotator(canvas, rotatorCallback, 0);
    rotatorCallback();
}