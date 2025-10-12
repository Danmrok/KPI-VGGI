'use strict';

function Model(name, gl, options) {
    this.name = name || 'ShoeSurface';
    this.gl = gl;
    options = options || {};

    this.uSteps = options.uSteps || 51;
    this.vSteps = options.vSteps || 51;

    const totalVertices = this.uSteps * this.vSteps;
    const totalIndices = (this.uSteps - 1) * (this.vSteps - 1) * 6;

    this.vertexBuffer = null;
    this.indexBuffer = null;
    this.normalBuffer = null;
    
    this.vertices = new Float32Array(totalVertices * 3);
    this.normals = new Float32Array(totalVertices * 3);
    this.indices = new Uint16Array(totalIndices);
    
    this.vertexCount = 0;
    this.indexCount = 0;

    this.surfaceFunc = options.surfaceFunc || Model.defaultSurface;
    
    this.vertexBuffer = gl.createBuffer();
    this.normalBuffer = gl.createBuffer();
    this.indexBuffer = gl.createBuffer();
}


Model.defaultSurface = function(u, v) {
    var x = (u - 0.5) * 2.0; 
    var y = (v - 0.5) * 2.0;
    var z = (x * x * x) / 3.0 - (y * y) / 2.0;
    return [x, y, z];
};

Model.prototype.init = function() {
    var gl = this.gl;
    
    let vIndex = 0;  
    let iIndex = 0;  
    
    const uStep = 1.0 / (this.uSteps - 1);
    const vStep = 1.0 / (this.vSteps - 1);

    for (let vi = 0; vi < this.vSteps; vi++) {
        const v = vi * vStep;
        for (let ui = 0; ui < this.uSteps; ui++) {
            const u = ui * uStep;
            const p = this.surfaceFunc(u, v);
            
            
            this.vertices[vIndex] = p[0];
            this.vertices[vIndex + 1] = p[1];
            this.vertices[vIndex + 2] = p[2];
            
            this.normals[vIndex] = 0;
            this.normals[vIndex + 1] = 0;
            this.normals[vIndex + 2] = 0;
            
            vIndex += 3;
        }
    }

    for (let vi = 0; vi < this.vSteps - 1; vi++) {
        const rowOffset = vi * this.uSteps;
        for (let ui = 0; ui < this.uSteps - 1; ui++) {
            const p0 = rowOffset + ui;
            const p1 = p0 + 1;
            const p2 = p0 + this.uSteps;
            const p3 = p2 + 1;

          
            this.indices[iIndex] = p0;
            this.indices[iIndex + 1] = p1;
            this.indices[iIndex + 2] = p2;
            this.indices[iIndex + 3] = p2;
            this.indices[iIndex + 4] = p1;
            this.indices[iIndex + 5] = p3;
            
            iIndex += 6;
        }
    }

    this.calculateAngleWeightedNormals();

    this.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);

    this.normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.normals), gl.STATIC_DRAW);

    this.indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices), gl.STATIC_DRAW);

    this.vertexCount = this.vertices.length / 3;
    this.indexCount = this.indices.length;

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
};


Model.prototype.calculateAngleWeightedNormals = function() {
  
    this.normals.fill(0);
    
    const vec1 = new Float32Array(3);
    const vec2 = new Float32Array(3);
    const normal = new Float32Array(3);
    
    const vertices = this.vertices;
    const normals = this.normals;
    const indices = this.indices;
    
    const subtractVectors = (out, a, aOffset, b, bOffset) => {
        out[0] = vertices[aOffset] - vertices[bOffset];
        out[1] = vertices[aOffset + 1] - vertices[bOffset + 1];
        out[2] = vertices[aOffset + 2] - vertices[bOffset + 2];
    };
    
    const calculateTriangleNormal = (out, v1Offset, v2Offset, v3Offset) => {
        subtractVectors(vec1, vertices, v2Offset, vertices, v1Offset);
        subtractVectors(vec2, vertices, v3Offset, vertices, v1Offset);
        
        out[0] = vec1[1] * vec2[2] - vec1[2] * vec2[1];
        out[1] = vec1[2] * vec2[0] - vec1[0] * vec2[2];
        out[2] = vec1[0] * vec2[1] - vec1[1] * vec2[0];
    };
    
    const calculateAngle = (v1Offset, v2Offset, v3Offset) => {
        subtractVectors(vec1, vertices, v2Offset, vertices, v1Offset);
        subtractVectors(vec2, vertices, v3Offset, vertices, v1Offset);
        
        const len1Sq = vec1[0] * vec1[0] + vec1[1] * vec1[1] + vec1[2] * vec1[2];
        const len2Sq = vec2[0] * vec2[0] + vec2[1] * vec2[1] + vec2[2] * vec2[2];
        const dot = vec1[0] * vec2[0] + vec1[1] * vec2[1] + vec1[2] * vec2[2];
        
        return Math.acos(dot / Math.sqrt(len1Sq * len2Sq));
    };

    for(let i = 0; i < indices.length; i += 3) {
        const idx1 = indices[i] * 3;
        const idx2 = indices[i+1] * 3;
        const idx3 = indices[i+2] * 3;
        
        calculateTriangleNormal(normal, idx1, idx2, idx3);
        
        const angle1 = calculateAngle(idx1, idx2, idx3);
        const angle2 = calculateAngle(idx2, idx3, idx1);
        const angle3 = calculateAngle(idx3, idx1, idx2);
        
        for(let j = 0; j < 3; j++) {
            normals[idx1 + j] += normal[j] * angle1;
            normals[idx2 + j] += normal[j] * angle2;
            normals[idx3 + j] += normal[j] * angle3;
        }
    }
    
    const EPSILON = 1e-6;  
    for(let i = 0; i < normals.length; i += 3) {
        const x = normals[i];
        const y = normals[i+1];
        const z = normals[i+2];
        const lenSq = x*x + y*y + z*z;
        
        if(lenSq > EPSILON) {
            const invLen = 1 / Math.sqrt(lenSq);
            normals[i] *= invLen;
            normals[i+1] *= invLen;
            normals[i+2] *= invLen;
        }
    }
    
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    this.vertexCount = vertices.length / 3;
    this.indexCount = indices.length;
};

Model.prototype.Draw = function() {
    const gl = this.gl;
    if (!gl || !shProgram || !shProgram.prog || 
        shProgram.iAttribVertex === -1 || shProgram.iAttribNormal === -1) {
        return;
    }
    
    
    const vertexLoc = shProgram.iAttribVertex;
    const normalLoc = shProgram.iAttribNormal;
    
    gl.useProgram(shProgram.prog);
    
    gl.enableVertexAttribArray(vertexLoc);
    gl.enableVertexAttribArray(normalLoc);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.vertexAttribPointer(vertexLoc, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);

    gl.disableVertexAttribArray(vertexLoc);
    gl.disableVertexAttribArray(normalLoc);
};

Model.prototype.dispose = function() {
    var gl = this.gl;
    if (this.vertexBuffer) gl.deleteBuffer(this.vertexBuffer);
    if (this.normalBuffer) gl.deleteBuffer(this.normalBuffer);
    if (this.indexBuffer) gl.deleteBuffer(this.indexBuffer);
    
    this.vertexBuffer = null;
    this.normalBuffer = null;
    this.indexBuffer = null;
    this.vertices = [];
    this.normals = [];
    this.indices = [];
    this.vertexCount = 0;
    this.indexCount = 0;
};

Model.prototype.getCurveCount = function() {
    return { 
        uCount: this.uSteps, 
        vCount: this.vSteps, 
        totalVertices: this.vertexCount 
    };
};

Model.prototype.getMemorySize = function() {
    var vertexSize = this.vertices.length * 4; 
    var normalSize = this.normals.length * 4;  
    var indexSize = this.indices.length * 2;  
    return (vertexSize + normalSize + indexSize) / 1024.0;
};