'use strict';

function Model(name, gl, options) {
    this.name = name || 'ShoeSurface';
    this.gl = gl;
    options = options || {};

    this.uSteps = options.uSteps || 51;
    this.vSteps = options.vSteps || 51;
    this.uResolution = options.uResolution || 50;
    this.vResolution = options.vResolution || 50;

    this.uBuffers = [];
    this.vBuffers = [];
    this.uCounts = [];
    this.vCounts = [];

    this.surfaceFunc = options.surfaceFunc || Model.defaultSurface;
}


Model.defaultSurface = function(u, v) {
    var x = (u - 0.5) * 2.0; 
    var y = (v - 0.5) * 2.0;
    var z = (x * x * x) / 3.0 - (y * y) / 2.0;
    return [x, y, z];
};

Model.prototype.init = function() {
    var gl = this.gl;
    this.dispose();

    for (var vi = 0; vi < this.vSteps; ++vi) {
        var v = vi / (this.vSteps - 1);
        var verts = new Float32Array(this.uResolution * 3);
        var idx = 0;
        for (var ui = 0; ui < this.uResolution; ++ui) {
            var u = ui / (this.uResolution - 1);
            var p = this.surfaceFunc(u, v);
            verts[idx++] = p[0]; verts[idx++] = p[1]; verts[idx++] = p[2];
        }
        var buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
        this.uBuffers.push(buf);
        this.uCounts.push(this.uResolution);
    }

    for (var ui2 = 0; ui2 < this.uSteps; ++ui2) {
        var u2 = ui2 / (this.uSteps - 1);
        var verts2 = new Float32Array(this.vResolution * 3);
        var idx2 = 0;
        for (var vi2 = 0; vi2 < this.vResolution; ++vi2) {
            var v2 = vi2 / (this.vResolution - 1);
            var p2 = this.surfaceFunc(u2, v2);
            verts2[idx2++] = p2[0]; verts2[idx2++] = p2[1]; verts2[idx2++] = p2[2];
        }
        var buf2 = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf2);
        gl.bufferData(gl.ARRAY_BUFFER, verts2, gl.STATIC_DRAW);
        this.vBuffers.push(buf2);
        this.vCounts.push(this.vResolution);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
};


Model.prototype.Draw = function() {
    var gl = this.gl;
    if (!shProgram) return;
    gl.enableVertexAttribArray(shProgram.iAttribVertex);

    gl.uniform4fv(shProgram.iColor, [0.0, 0.8, 0.9, 1.0]);
    for (var i = 0; i < this.uBuffers.length; ++i) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.uBuffers[i]);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.LINE_STRIP, 0, this.uCounts[i]);
    }

    gl.uniform4fv(shProgram.iColor, [0.9, 0.2, 0.7, 1.0]);
    for (var j = 0; j < this.vBuffers.length; ++j) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffers[j]);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.LINE_STRIP, 0, this.vCounts[j]);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.disableVertexAttribArray(shProgram.iAttribVertex);
};

Model.prototype.dispose = function() {
    var gl = this.gl;
    if (this.uBuffers) { for (var i = 0; i < this.uBuffers.length; ++i) gl.deleteBuffer(this.uBuffers[i]); }
    if (this.vBuffers) { for (var j = 0; j < this.vBuffers.length; ++j) gl.deleteBuffer(this.vBuffers[j]); }
    this.uBuffers = [];
    this.vBuffers = [];
    this.uCounts = [];
    this.vCounts = [];
};

Model.prototype.getCurveCount = function() {
    var uCount = this.uBuffers.length;
    var vCount = this.vBuffers.length;
    var total = uCount * this.uResolution + vCount * this.vResolution;
    return { uCount: uCount, vCount: vCount, totalVertices: total };
};

Model.prototype.getMemorySize = function() {
    var bytes = 0; 
    bytes = (this.uCounts.reduce((s,c)=>s+c,0) + this.vCounts.reduce((s,c)=>s+c,0)) * 3 * 4;
    return bytes / 1024.0;
};