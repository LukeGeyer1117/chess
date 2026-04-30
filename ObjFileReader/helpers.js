// Make a textureObject on the video card, and return a javascript reference to it.
// Since it might take a while to load and we never want to block, first use the 1 by 1 texture with the color "tempColor"
// Using a callback, it will switch to the texture of objTextureFileName when it is done loading.
// NOTE: Try to make "tempColor" roughly approximate what your object will actually look like when it gets its real texture loaded.
// For every texture you make, pass in a unique textureImageUnit between 0 and 31
function loadTexture(gl, objTextureFileName, tempColor, textureImageUnit) {
    gl.activeTexture(gl.TEXTURE0 + textureImageUnit); // Specify which of our 32 texture slots we are talking to
    const textureObject = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, textureObject); // Tell GL that this textureObject is a 2D texture. (Not 1D or 3D.)

    // Fill our textureObject with a 1x1 pixel of color tempColor, while waiting for the real image data to load
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(tempColor));

    const image = new Image(); // make an empty javascript image.
    image.onload = function () { // this callback will get called when the command "image.src = " below has finished loading
        gl.bindTexture(gl.TEXTURE_2D, textureObject); // remember I'm talking to YOU, Mr. textureObject! (since the current texture may have got changed in the elapsed time.)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image); // fill the reserved textureObject slot with the real image.
        gl.generateMipmap(gl.TEXTURE_2D); // This makes texture mapping look better. 
    };
    image.src = objTextureFileName;

    return textureObject;
}

// This sets the shader attributes when using: a 3D vertPosition, followed by a 2D vertUV, then a 3D vertNormal, then a 3D faceNormal
// The data buffer passed to the video card must have the data packed exactly this way.
// The vertex shader must have four attribute variables exactly named 'vertPosition', 'vertUV', 'vertNormal', and "faceNormal"
function setShaderAttributes(gl, shaderProgram) {
    const positionsPerVertex = 3;       // x,y,z
    const uvsPerVertex = 2;             // u,v
    const vertexNormalsPerVertex = 3;   // nx,ny,nz
    const faceNormalsPerVertex = 3;     // fx,fy,fz
    const valuesPerVertex = positionsPerVertex + uvsPerVertex + vertexNormalsPerVertex + faceNormalsPerVertex;

    const positionAttribLocation = gl.getAttribLocation(shaderProgram, 'vertPosition');
    gl.vertexAttribPointer(
        positionAttribLocation, // Attribute location
        positionsPerVertex, // Number of elements per attribute
        gl.FLOAT, // Type of elements
        gl.FALSE,
        valuesPerVertex * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
        0 * Float32Array.BYTES_PER_ELEMENT // Offset from the beginning of a single vertex to this attribute
    );
    gl.enableVertexAttribArray(positionAttribLocation);

    const uvAttribLocation = gl.getAttribLocation(shaderProgram, 'vertUV');
    gl.vertexAttribPointer(
        uvAttribLocation, // Attribute location
        uvsPerVertex, // Number of elements per attribute
        gl.FLOAT, // Type of elements
        gl.FALSE,
        valuesPerVertex * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
        (positionsPerVertex) * Float32Array.BYTES_PER_ELEMENT // Offset from the beginning of a single vertex to this attribute
    );
    gl.enableVertexAttribArray(uvAttribLocation);

    const vertNormalAttribLocation = gl.getAttribLocation(shaderProgram, 'vertNormal');
    gl.vertexAttribPointer(
        vertNormalAttribLocation, // Attribute location
        vertexNormalsPerVertex, // Number of elements per attribute
        gl.FLOAT, // Type of elements
        gl.FALSE,
        valuesPerVertex * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
        (positionsPerVertex + uvsPerVertex) * Float32Array.BYTES_PER_ELEMENT // Offset from the beginning of a single vertex to this attribute
    );
    gl.enableVertexAttribArray(vertNormalAttribLocation);

    const faceNormalAttribLocation = gl.getAttribLocation(shaderProgram, 'faceNormal');
    gl.vertexAttribPointer(
        faceNormalAttribLocation, // Attribute location
        faceNormalsPerVertex, // Number of elements per attribute
        gl.FLOAT, // Type of elements
        gl.FALSE,
        valuesPerVertex * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
        (positionsPerVertex + uvsPerVertex + vertexNormalsPerVertex) * Float32Array.BYTES_PER_ELEMENT // Offset from the beginning of a single vertex to this attribute
    );
    gl.enableVertexAttribArray(faceNormalAttribLocation);

}

export { loadTexture, setShaderAttributes };