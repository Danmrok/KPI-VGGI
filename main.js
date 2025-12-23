'use strict';

let gl;                         
let surfaceModel;               
let shProgram;                 
let spaceball;                 
let lightAngle = 0;
let lightRadius = 5.0;
let lastTime = 0;
let uSlider;
let vSlider;
let scaleSlider;
let angleSlider;
let diffuseTexture;
let specularTexture;
let normalTexture;
let texCenterU = 0.5;
let texCenterV = 0.5;
let texScale = 1.0;
let texAngle = 0.0; // in degrees

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
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
    }
    let fsh = gl.createShader( gl.FRAGMENT_SHADER );
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if ( ! gl.getShaderParameter(fsh, gl.COMPILE_STATUS) ) {
       throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog,vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if ( ! gl.getProgramParameter( prog, gl.LINK_STATUS) ) {
       throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}

function createTexture(gl, url) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 255, 255]));

  const image = new Image();
  image.src = url;
  image.addEventListener('load', () => {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  });

  return tex;
}

function draw(currentTime) {
    gl.clearColor(0.12,0.12,0.12,1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

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

    let matAccum0 = m4.multiply(rotateToPointZero, modelView);
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0);
    
    let modelViewProjection = m4.multiply(projection, matAccum1);
    let normalMatrix = m4.transpose(m4.inverse(matAccum1));

    if (!shProgram || !shProgram.prog || !surfaceModel) {
        requestAnimationFrame(draw);
        return;
    }
    
    gl.useProgram(shProgram.prog);
    
    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);
    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, matAccum1);
    gl.uniformMatrix4fv(shProgram.iNormalMatrix, false, normalMatrix);
    
    gl.uniform3fv(shProgram.iLightPosition, lightPosition);
    gl.uniform3fv(shProgram.iAmbientColor, [0.35, 0.35, 0.3]);
    gl.uniform3fv(shProgram.iDiffuseColor, [1.0, 1.0, 1.0]);
    gl.uniform3fv(shProgram.iSpecularColor, [1.0, 1.0, 1.0]);
    gl.uniform1f(shProgram.iShininess, 80.0);

    gl.uniform2fv(shProgram.iTexCenter, [texCenterU, texCenterV]);
    gl.uniform1f(shProgram.iTexAngle, deg2rad(texAngle));
    gl.uniform1f(shProgram.iTexScale, texScale);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, diffuseTexture);
    gl.uniform1i(shProgram.iDiffuse, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, specularTexture);
    gl.uniform1i(shProgram.iSpecular, 1);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, normalTexture);
    gl.uniform1i(shProgram.iNormal, 2);

    surfaceModel.Draw();
    requestAnimationFrame(draw);
}

function initGL() {
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

    diffuseTexture = createTexture(gl, 'old_wood_floor_diff_2k.png');
    specularTexture = createTexture(gl, 'old_wood_floor_rough_2k.png');
    normalTexture = createTexture(gl, 'old_wood_floor/old_wood_floor_nor_gl_2k.png');
    
    gl.enable(gl.DEPTH_TEST);
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
    
    function handleSliderChange() {
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

    uSlider.addEventListener('input', handleSliderChange);
    vSlider.addEventListener('input', handleSliderChange);
    scaleSlider.addEventListener('input', handleSliderChange);
    angleSlider.addEventListener('input', handleSliderChange);
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