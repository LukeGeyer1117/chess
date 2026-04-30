precision mediump float;

attribute vec3 vertPosition;
attribute vec2 vertUV;
attribute vec3 vertNormal;
attribute vec3 faceNormal; // not used
uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat3 uNormalMatrix;
varying vec4 fragPosition;
varying vec2 fragUV;
varying vec3 fragNormal;
varying vec3 fragFaceNormal; // used just to keep var faceNormal alive.

void main() {
    fragFaceNormal = faceNormal; // we have to pretend to use faceNormal or it gets optimized out.
    fragPosition = uModelViewMatrix * vec4(vertPosition, 1.0);
    fragUV = vertUV;
    fragNormal = normalize(uNormalMatrix * vertNormal);

    gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(vertPosition, 1.0);
}
