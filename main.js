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

function deg2rad(angle) {
    return angle * Math.PI / 180;
}


function ShaderProgram(name, program) {
    this.name = name;
    this.prog = program;
    this.iAttribVertex = -1;
    this.iAttribNormal = -1;
    this.iModelViewMatrix = -1;
    this.iModelViewProjectionMatrix = -1;
    this.iNormalMatrix = -1;
    this.iLightPosition = -1;
    this.iAmbientColor = -1;
    this.iDiffuseColor = -1;
    this.iSpecularColor = -1;
    this.iShininess = -1;
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

    if (!shProgram || !shProgram.prog) {
        console.error('Shader program is not initialized');
        return;
    }
    
    gl.useProgram(shProgram.prog);
    
    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);
    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, matAccum1);
    gl.uniformMatrix4fv(shProgram.iNormalMatrix, false, normalMatrix);
    
    gl.uniform3fv(shProgram.iLightPosition, lightPosition);
    gl.uniform3fv(shProgram.iAmbientColor, [0.2, 0.2, 0.2]);
    gl.uniform3fv(shProgram.iDiffuseColor, [0.7, 0.7, 0.7]);
    gl.uniform3fv(shProgram.iSpecularColor, [1.0, 1.0, 1.0]);
    gl.uniform1f(shProgram.iShininess, 32.0);

    if (surfaceModel) surfaceModel.Draw();
    requestAnimationFrame(draw);
}

function initGL() {
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
    shProgram.iAttribNormal = gl.getAttribLocation(prog, "normal");
    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    shProgram.iModelViewMatrix = gl.getUniformLocation(prog, "ModelViewMatrix");
    shProgram.iNormalMatrix = gl.getUniformLocation(prog, "NormalMatrix");
    shProgram.iLightPosition = gl.getUniformLocation(prog, "lightPosition");
    shProgram.iAmbientColor = gl.getUniformLocation(prog, "ambientColor");
    shProgram.iDiffuseColor = gl.getUniformLocation(prog, "diffuseColor");
    shProgram.iSpecularColor = gl.getUniformLocation(prog, "specularColor");
    shProgram.iShininess = gl.getUniformLocation(prog, "shininess");

    createSliders();

    surfaceModel = new Model('ShoeSurface', gl, {
        uSteps: parseInt(uSlider.value),
        vSteps: parseInt(vSlider.value)
    });

    surfaceModel.init();

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
    if (surfaceModel) {
        surfaceModel.dispose();
        surfaceModel.uSteps = uValue;
        surfaceModel.vSteps = vValue;
        surfaceModel.init();
    }
}, 150);

function createSliders() {
    uSlider = document.createElement('input');
    uSlider.type = 'range';
    uSlider.min = '10';
    uSlider.max = '50';
    uSlider.value = '36';
    uSlider.id = 'uSlider';

    const uLabel = document.createElement('label');
    uLabel.htmlFor = 'uSlider';
    uLabel.textContent = 'U Resolution: ';

    const uValue = document.createElement('span');
    uValue.id = 'uValue';
    uValue.textContent = uSlider.value;

    vSlider = document.createElement('input');
    vSlider.type = 'range';
    vSlider.min = '10';
    vSlider.max = '50';
    vSlider.value = '24';
    vSlider.id = 'vSlider';

    const vLabel = document.createElement('label');
    vLabel.htmlFor = 'vSlider';
    vLabel.textContent = 'V Resolution: ';

    const vValue = document.createElement('span');
    vValue.id = 'vValue';
    vValue.textContent = vSlider.value;

    let isUpdating = false;
    let updateQueued = false;
    
    function handleSliderChange() {
        const uValue = parseInt(uSlider.value);
        const vValue = parseInt(vSlider.value);
        
        
        document.getElementById('uValue').textContent = uValue;
        document.getElementById('vValue').textContent = vValue;

        
        debouncedUpdateSurface(uValue, vValue);
    }

    uSlider.oninput = handleSliderChange;
    vSlider.oninput = handleSliderChange;

    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.top = '10px';
    container.style.left = '10px';
    container.appendChild(uLabel);
    container.appendChild(uSlider);
    container.appendChild(uValue);
    container.appendChild(document.createElement('br'));
    container.appendChild(vLabel);
    container.appendChild(vSlider);
    container.appendChild(vValue);

    document.body.appendChild(container);
}

function updateSurface() {
    if (!surfaceModel) return;

    try {
        const currentProgram = gl.getParameter(gl.CURRENT_PROGRAM);
        
        surfaceModel.dispose();
        surfaceModel.uSteps = parseInt(uSlider.value);
        surfaceModel.vSteps = parseInt(vSlider.value);
        surfaceModel.init();

        if (currentProgram) {
            gl.useProgram(currentProgram);
        }
        
        requestAnimationFrame(() => {
            document.getElementById('uValue').textContent = uSlider.value;
            document.getElementById('vValue').textContent = vSlider.value;
        });
    } catch (error) {
        console.error('Error updating surface:', error);
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
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }

    try {
        initGL();
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    const rotatorCallback = () => {
        if (shProgram && gl) {
            gl.useProgram(shProgram.prog);
            requestAnimationFrame(draw);
        }
    };

    spaceball = new TrackballRotator(canvas, rotatorCallback, 0);
    rotatorCallback();
}
