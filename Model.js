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
    this.texcoordBuffer = null;
    this.tangentBuffer = null;
    
    this.vertices = new Float32Array(totalVertices * 3);
    this.normals = new Float32Array(totalVertices * 3);
    this.texcoords = new Float32Array(totalVertices * 2);
    this.tangents = new Float32Array(totalVertices * 4);
    this.indices = new Uint16Array(totalIndices);
    
    this.vertexCount = 0;
    this.indexCount = 0;

    this.surfaceFunc = options.surfaceFunc || Model.defaultSurface;
    
    this.vertexBuffer = gl.createBuffer();
    this.normalBuffer = gl.createBuffer();
    this.texcoordBuffer = gl.createBuffer();
    this.tangentBuffer = gl.createBuffer();
    this.indexBuffer = gl.createBuffer();
}


Model.defaultSurface = function(u, v) {
    var x = (u - 0.5) * 2.0; 
    var y = (v - 0.5) * 2.0;
    var z = (x * x * x) / 3.0 - (y * y) / 2.0;
    return [x, y, z];
};

Model.prototype.resize = function(newUSteps, newVSteps) {
    this.uSteps = newUSteps;
    this.vSteps = newVSteps;
    
    const totalVertices = this.uSteps * this.vSteps;
    const totalIndices = (this.uSteps - 1) * (this.vSteps - 1) * 6;
    
    this.vertices = new Float32Array(totalVertices * 3);
    this.normals = new Float32Array(totalVertices * 3);
    this.texcoords = new Float32Array(totalVertices * 2);
    this.tangents = new Float32Array(totalVertices * 4);
    this.indices = new Uint16Array(totalIndices);
    
    this.vertexCount = 0;
    this.indexCount = 0;
};

Model.prototype.init = function() {
    var gl = this.gl;
    
    let iIndex = 0;  
    
    const uStep = 1.0 / (this.uSteps - 1);
    const vStep = 1.0 / (this.vSteps - 1);

    for (let vi = 0; vi < this.vSteps; vi++) {
        const v = vi * vStep;
        for (let ui = 0; ui < this.uSteps; ui++) {
            const u = ui * uStep;
            const vertexIndex = vi * this.uSteps + ui;
            const p = this.surfaceFunc(u, v);
            
            
            const vOffset = vertexIndex * 3;
            this.vertices[vOffset] = p[0];
            this.vertices[vOffset + 1] = p[1];
            this.vertices[vOffset + 2] = p[2];
            
            this.normals[vOffset] = 0;
            this.normals[vOffset + 1] = 0;
            this.normals[vOffset + 2] = 0;
            
            const tcOffset = vertexIndex * 2;
            this.texcoords[tcOffset] = u;
            this.texcoords[tcOffset + 1] = v;
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

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.normals, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.texcoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.texcoords, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.tangentBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.tangents, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);

    this.vertexCount = this.vertices.length / 3;
    this.indexCount = this.indices.length;

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
};


Model.prototype.calculateAngleWeightedNormals = function() {
    this.vertexCount = this.vertices.length / 3;
    this.normals.fill(0);
    let tangents = new Float32Array(this.vertexCount * 3);
    tangents.fill(0);
    let bitangents = new Float32Array(this.vertexCount * 3);
    bitangents.fill(0);
    
    const vec1 = new Float32Array(3);
    const vec2 = new Float32Array(3);
    const normal = new Float32Array(3);
    
    const vertices = this.vertices;
    const normals = this.normals;
    const indices = this.indices;
    
    const subtractVectors = (out, aOffset, bOffset) => {
        out[0] = vertices[aOffset] - vertices[bOffset];
        out[1] = vertices[aOffset + 1] - vertices[bOffset + 1];
        out[2] = vertices[aOffset + 2] - vertices[bOffset + 2];
    };
    
    const calculateTriangleNormal = (out, v1Offset, v2Offset, v3Offset) => {
        subtractVectors(vec1, v2Offset, v1Offset);
        subtractVectors(vec2, v3Offset, v1Offset);
        
        out[0] = vec1[1] * vec2[2] - vec1[2] * vec2[1];
        out[1] = vec1[2] * vec2[0] - vec1[0] * vec2[2];
        out[2] = vec1[0] * vec2[1] - vec1[1] * vec2[0];
    };
    
    const calculateAngle = (v1Offset, v2Offset, v3Offset) => {
        subtractVectors(vec1, v2Offset, v1Offset);
        subtractVectors(vec2, v3Offset, v1Offset);
        
        const len1Sq = vec1[0] * vec1[0] + vec1[1] * vec1[1] + vec1[2] * vec1[2];
        const len2Sq = vec2[0] * vec2[0] + vec2[1] * vec2[1] + vec2[2] * vec2[2];
        const dot = vec1[0] * vec2[0] + vec1[1] * vec2[1] + vec1[2] * vec2[2];
        
        const cos = dot / Math.sqrt(len1Sq * len2Sq);
        return Math.acos(Math.min(1.0, Math.max(-1.0, cos)));
    };

    for(let i = 0; i < indices.length; i += 3) {
        const idx1 = indices[i] * 3;
        const idx2 = indices[i+1] * 3;
        const idx3 = indices[i+2] * 3;
        
        calculateTriangleNormal(normal, idx1, idx2, idx3);
        
        const angle1 = calculateAngle(idx1, idx2, idx3);
        const angle2 = calculateAngle(idx2, idx3, idx1);
        const angle3 = calculateAngle(idx3, idx1, idx2);

        subtractVectors(vec1, idx2, idx1);
        subtractVectors(vec2, idx3, idx1);

        const vertexIndex1 = indices[i];
        const vertexIndex2 = indices[i+1];
        const vertexIndex3 = indices[i+2];

        const uvOffset1 = vertexIndex1 * 2;
        const uvOffset2 = vertexIndex2 * 2;
        const uvOffset3 = vertexIndex3 * 2;

        const delta_u1 = this.texcoords[uvOffset2] - this.texcoords[uvOffset1];
        const delta_v1 = this.texcoords[uvOffset2 + 1] - this.texcoords[uvOffset1 + 1];
        const delta_u2 = this.texcoords[uvOffset3] - this.texcoords[uvOffset1];
        const delta_v2 = this.texcoords[uvOffset3 + 1] - this.texcoords[uvOffset1 + 1];

        const denom = delta_u1 * delta_v2 - delta_u2 * delta_v1;
        if (Math.abs(denom) < 1e-6) continue;
        const invDenom = 1 / denom;

        const tan = new Float32Array(3);
        const bi = new Float32Array(3);
        for (let k = 0; k < 3; k++) {
            tan[k] = invDenom * (delta_v2 * vec1[k] - delta_v1 * vec2[k]);
            bi[k] = invDenom * (delta_u1 * vec2[k] - delta_u2 * vec1[k]);
        }
        
        for(let j = 0; j < 3; j++) {
            normals[idx1 + j] += normal[j] * angle1;
            tangents[idx1 + j] += tan[j] * angle1;
            bitangents[idx1 + j] += bi[j] * angle1;

            normals[idx2 + j] += normal[j] * angle2;
            tangents[idx2 + j] += tan[j] * angle2;
            bitangents[idx2 + j] += bi[j] * angle2;

            normals[idx3 + j] += normal[j] * angle3;
            tangents[idx3 + j] += tan[j] * angle3;
            bitangents[idx3 + j] += bi[j] * angle3;
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

    const temp = new Float32Array(3);
    const cros = new Float32Array(3);
    const bitan = new Float32Array(3);
    for (let vi = 0; vi < this.vertexCount; vi++) {
        const offset = vi * 3;
        const n = [normals[offset], normals[offset + 1], normals[offset + 2]];
        let t_acc = [tangents[offset], tangents[offset + 1], tangents[offset + 2]];

        let dot_tn = n[0] * t_acc[0] + n[1] * t_acc[1] + n[2] * t_acc[2];
        temp[0] = n[0] * dot_tn;
        temp[1] = n[1] * dot_tn;
        temp[2] = n[2] * dot_tn;
        t_acc[0] -= temp[0];
        t_acc[1] -= temp[1];
        t_acc[2] -= temp[2];

        let len_t = Math.sqrt(t_acc[0] * t_acc[0] + t_acc[1] * t_acc[1] + t_acc[2] * t_acc[2]);
        if (len_t > EPSILON) {
            t_acc[0] /= len_t;
            t_acc[1] /= len_t;
            t_acc[2] /= len_t;
        } else {
            t_acc = [1, 0, 0]; 
        }

        cros[0] = n[1] * t_acc[2] - n[2] * t_acc[1];
        cros[1] = n[2] * t_acc[0] - n[0] * t_acc[2];
        cros[2] = n[0] * t_acc[1] - n[1] * t_acc[0];

        bitan[0] = bitangents[offset];
        bitan[1] = bitangents[offset + 1];
        bitan[2] = bitangents[offset + 2];
        let len_b = Math.sqrt(bitan[0] * bitan[0] + bitan[1] * bitan[1] + bitan[2] * bitan[2]);
        if (len_b > EPSILON) {
            bitan[0] /= len_b;
            bitan[1] /= len_b;
            bitan[2] /= len_b;
        } else {
            bitan = [0, 1, 0];
        }

        let dot_b = cros[0] * bitan[0] + cros[1] * bitan[1] + cros[2] * bitan[2];
        let handedness = (dot_b >= 0) ? 1.0 : -1.0;

        const tanOffset = vi * 4;
        this.tangents[tanOffset] = t_acc[0];
        this.tangents[tanOffset + 1] = t_acc[1];
        this.tangents[tanOffset + 2] = t_acc[2];
        this.tangents[tanOffset + 3] = handedness;
    }
};

Model.prototype.Draw = function() {
    const gl = this.gl;
    if (!gl || !shProgram || !shProgram.prog || 
        shProgram.iAttribVertex === -1 || shProgram.iAttribNormal === -1 ||
        shProgram.iAttribTexcoord === -1 || shProgram.iAttribTangent === -1) {
        if (!gl) console.error('Draw: gl is null');
        if (!shProgram) console.error('Draw: shProgram is null');
        if (!shProgram || !shProgram.prog) console.error('Draw: shProgram.prog is null');
        if (shProgram && (shProgram.iAttribVertex === -1 || shProgram.iAttribNormal === -1 ||
            shProgram.iAttribTexcoord === -1 || shProgram.iAttribTangent === -1)) {
            console.error('Draw: Missing attributes', {
                vertex: shProgram.iAttribVertex,
                normal: shProgram.iAttribNormal,
                texcoord: shProgram.iAttribTexcoord,
                tangent: shProgram.iAttribTangent
            });
        }
        return;
    }
    
    if (this.indexCount === 0) {
        console.error('Draw: indexCount is 0!');
        return;
    }
    
    
    const vertexLoc = shProgram.iAttribVertex;
    const normalLoc = shProgram.iAttribNormal;
    const texcoordLoc = shProgram.iAttribTexcoord;
    const tangentLoc = shProgram.iAttribTangent;
    
    gl.useProgram(shProgram.prog);
    
    gl.enableVertexAttribArray(vertexLoc);
    gl.enableVertexAttribArray(normalLoc);
    gl.enableVertexAttribArray(texcoordLoc);
    gl.enableVertexAttribArray(tangentLoc);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.vertexAttribPointer(vertexLoc, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.texcoordBuffer);
    gl.vertexAttribPointer(texcoordLoc, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.tangentBuffer);
    gl.vertexAttribPointer(tangentLoc, 4, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    
    const drawError = gl.getError();
    if (drawError !== gl.NO_ERROR) {
        console.error('WebGL error before drawElements:', drawError);
    }
    
    gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);
    
    const drawErrorAfter = gl.getError();
    if (drawErrorAfter !== gl.NO_ERROR) {
        console.error('WebGL error after drawElements:', drawErrorAfter, 'indexCount:', this.indexCount);
    }

    gl.disableVertexAttribArray(vertexLoc);
    gl.disableVertexAttribArray(normalLoc);
    gl.disableVertexAttribArray(texcoordLoc);
    gl.disableVertexAttribArray(tangentLoc);
};

Model.prototype.dispose = function() {
    var gl = this.gl;
    if (this.vertexBuffer) gl.deleteBuffer(this.vertexBuffer);
    if (this.normalBuffer) gl.deleteBuffer(this.normalBuffer);
    if (this.texcoordBuffer) gl.deleteBuffer(this.texcoordBuffer);
    if (this.tangentBuffer) gl.deleteBuffer(this.tangentBuffer);
    if (this.indexBuffer) gl.deleteBuffer(this.indexBuffer);
    
    this.vertexBuffer = null;
    this.normalBuffer = null;
    this.texcoordBuffer = null;
    this.tangentBuffer = null;
    this.indexBuffer = null;
    this.vertices = [];
    this.normals = [];
    this.texcoords = [];
    this.tangents = [];
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
    var texcoordSize = this.texcoords.length * 4;
    var tangentSize = this.tangents.length * 4;
    var indexSize = this.indices.length * 2;  
    return (vertexSize + normalSize + texcoordSize + tangentSize + indexSize) / 1024.0;
};