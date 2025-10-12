'use strict';

let gl;                         
let surfaceModel;               
let shProgram;                 
let spaceball;                 

function deg2rad(angle) {
    return angle * Math.PI / 180;
}


function ShaderProgram(name, program) {
    this.name = name;
    this.prog = program;
    this.iAttribVertex = -1;
    this.iColor = -1;
    this.iModelViewProjectionMatrix = -1;
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


function draw() {
    gl.clearColor(0.12,0.12,0.12,1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let projection = m4.perspective(Math.PI/6, 1, 0.1, 100);
    let modelView = spaceball.getViewMatrix();

    let rotateToPointZero = m4.axisRotation([0.707,0.707,0], 0.7);
    let translateToPointZero = m4.translation(0, 0, -6);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView );
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0 );

    let modelViewProjection = m4.multiply(projection, matAccum1);

    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection );

    if (surfaceModel) surfaceModel.Draw();
}

function initGL() {

    let prog = createProgram( gl, vertexShaderSource, fragmentShaderSource );

    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex              = gl.getAttribLocation(prog, "vertex");
    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    shProgram.iColor                     = gl.getUniformLocation(prog, "color");


    surfaceModel = new Model('ShoeSurface', gl, {
        uSteps: 36,      
        vSteps: 24,      
        uResolution: 120,
        vResolution: 120,
        surfaceFunc: null
    });

    surfaceModel.init();

    gl.enable(gl.DEPTH_TEST);
    gl.lineWidth(1.0); 
}


function init() {
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if ( ! gl ) throw "Browser does not support WebGL";
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

    spaceball = new TrackballRotator(canvas, draw, 0);

    draw();
}
