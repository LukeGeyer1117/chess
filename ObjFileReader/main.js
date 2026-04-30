import { initShaderProgram } from "./shader.js";
import { readObjFile } from "./objFileReader.js";
import { setShaderAttributes, loadTexture } from "./helpers.js";

// Global variables because I'm a gangster.
let lX_target=1, lY_target=-1, lZ_target=-1;
let interpolateCamera = false;
let animation_start_time = null;
let eye_x_orig = null;
let eye_x_target = null;
let eye_z_orig = null;
let eye_z_target = null;
let target_z_orig = null;
let target_z_target = null;
let animation_duration = 2;
let animation_current_time = 3;
let radians = 0;
let orig_radians = 0;

let animationSpeedChanger = document.querySelector("#animation-speed-changer");
animationSpeedChanger.addEventListener("input", (event) => {
	const newValue = parseFloat(event.target.value);
	animation_duration = newValue;
	main();
})

main();
async function main() {
	console.log('This is working');

	//
	// start gl
	// 
	const canvas = document.getElementById('glcanvas');
	const gl = canvas.getContext('webgl');
	if (!gl) {
		alert('Your browser does not support WebGL');
	}
	gl.clearColor(0.75, 0.85, 0.8, 1.0);
	gl.enable(gl.DEPTH_TEST); // Enable depth testing
	gl.depthFunc(gl.LEQUAL); // Near things obscure far things

	//
	// Create a shader
	// 
	let shaderProgram = initShaderProgram(gl, await (await fetch("textureNormalTriangles.vs")).text(), await (await fetch("textureNormalTriangles.fs")).text());


	//
	// Other shader variables:
	// 
	const lightDirection = [lX_target, lY_target, lZ_target];
	gl.uniform3fv(gl.getUniformLocation(shaderProgram, "uLightDirection"), lightDirection);

	const eye = [0, 6, 4];
	const at = [0.01, 0, 1]
	const up = [0, 1, 0];

	//
	// Create content to display
	//
	const objFileName = "pieces/PiezasAjedrezAdjusted.obj"
	const [objectNames, objectVertices] = await readObjFile(objFileName);

	//
	// Put the objectVertices data into WebGL objectBuffers.
	// Then we can just leave the buffers unaltered on the GPU from frame to frame.
	// That should be much faster than javascript sending vertices to the GPU every frame.
	//
	const objectBuffers = {}; // A dictionary to store objectBuffers by objectNames

	// Make this not happen until readObj is finished!
	for (let i = 0; i < objectNames.length; i++) {
		const name = objectNames[i];
		const vertices = objectVertices[name];
		const vertexBufferObject = gl.createBuffer();
		vertexBufferObject.vertexCount = vertices.length / 11; // x,y,z, u,v, nx,ny,nz, fx,fy,fz
		gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferObject); // the vertexBuffer we are currently talking to
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW); // move vertices data into the current vertexBuffer
		objectBuffers[name] = vertexBufferObject;
	}



	// 
	// Setup the textures
	//
	const WHITE_TEXTURE = 0;
	const BLACK_TEXTURE = 1;
	const BOARD_TEXTURE = 2;
	loadTexture(gl, 'pieces/PiezasAjedrezDiffusewood.png', [220, 220, 220, 255], WHITE_TEXTURE);
	loadTexture(gl, 'pieces/PiezasAjedrezDiffuseblackwood.png', [80, 80, 80, 255], BLACK_TEXTURE);
	loadTexture(gl, 'pieces/TableroDiffuse01.png', [255, 171, 0, 255], BOARD_TEXTURE);
	gl.activeTexture(gl.TEXTURE0 + 3); // Why do we need this? I don't know, but it doesn't pick textures right without it.


	// 
	// Listener for window resize
	//
	window.addEventListener("resize", reportWindowSize);
	function reportWindowSize() {
		let physicalToCSSPixelsRatio = 1;
		physicalToCSSPixelsRatio = window.devicePixelRatio; // Do this for no pixelation. Comment out for better speed.
		canvas.width = canvas.clientWidth * physicalToCSSPixelsRatio;
		canvas.height = canvas.clientHeight * physicalToCSSPixelsRatio;
		gl.viewport(0, 0, canvas.width, canvas.height);
		setPlayerView(gl, shaderProgram, eye, at, up, canvas.width / canvas.height);
	}
	reportWindowSize();

	document.addEventListener("keydown", (event) => {
		if (event.key === "ArrowUp") {
			lY_target += 1;
			const lightDirection = [lX_target, lY_target, lZ_target];
			gl.uniform3fv(gl.getUniformLocation(shaderProgram, "uLightDirection"), lightDirection);
		} else if (event.key === "ArrowDown") {
			lY_target -= 1;
			const lightDirection = [lX_target, lY_target, lZ_target];
			gl.uniform3fv(gl.getUniformLocation(shaderProgram, "uLightDirection"), lightDirection);
		} else if (event.key === "ArrowLeft") {
			lX_target -= 1;
			const lightDirection = [lX_target, lY_target, lZ_target];
			gl.uniform3fv(gl.getUniformLocation(shaderProgram, "uLightDirection"), lightDirection);
		} else if (event.key === "ArrowRight") {
			lX_target += 1;
			const lightDirection = [lX_target, lY_target, lZ_target];
			gl.uniform3fv(gl.getUniformLocation(shaderProgram, "uLightDirection"), lightDirection);
		}
	})

	document.addEventListener("keypress", (event) => {
		if (event.key === "r") {
			if (!interpolateCamera) {
				interpolateCamera = true;
			}
		}
	})


	//
	// Main render loop
	//
	// I know this is ugly. I don't care.
	let x1=-3.5, x2=-2.5, x3=-1.5, x4=-0.5, x5=0.5, x6=1.5, x7=2.5, x8=3.5, x9=-3.5, x10=-2.5, x11=-1.5, x12=-.5, x13=.5, x14=1.5, x15=2.5, x16=3.5,
		x17=-3.5, x18=-2.5, x19=-1.5, x20=-0.5, x21=0.5, x22=1.5, x23=2.5, x24=3.5, x25=-3.5, x26=-2.5, x27=-1.5, x28=-.5, x29=.5, x30=1.5, x31=2.5, x32=3.5
	let y1=0, y2=0, y3=0, y4=0, y5=0, y6=0, y7=0, y8=0, y9=0, y10=0, y11=0, y12=0, y13=0, y14=0, y15=0, y16=0,
		y17=0, y18=0, y19=0, y20=0, y21=0, y22=0, y23=0, y24=0, y25=0, y26=0, y27=0, y28=0, y29=0, y30=0, y31=0, y32=0;
	let z1=2.5, z2=2.5, z3=2.5, z4=2.5, z5=2.5, z6=2.5, z7=2.5, z8=2.5, z9=3.5, z10=3.5, z11=3.5, z12=3.5, z13=3.5, z14=3.5, z15=3.5, z16=3.5,
		z17=-2.5, z18=-2.5, z19=-2.5, z20=-2.5, z21=-2.5, z22=-2.5, z23=-2.5, z24=-2.5, z25=-3.5, z26=-3.5, z27=-3.5, z28=-3.5, z29=-3.5, z30=-3.5, z31=-3.5, z32=-3.5;

	let previousTime = 0;
	let frameCounter = 0;
	function redraw(currentTime) {
		currentTime *= .001; // milliseconds to seconds
		let DT = currentTime - previousTime;
		if (DT > .5)
			DT = .5;
		frameCounter += 1;
		if (Math.floor(currentTime) != Math.floor(previousTime)) {
			frameCounter = 0;
		}
		previousTime = currentTime;

		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		// Handle side changing
		// Remember to set all the things to null after so the side can be changed again.
		if (eye_z_orig == null) {
			eye_x_orig = eye[0];
			eye_z_orig = eye[2];
			target_z_orig = at[2];
		}
		if (interpolateCamera) {
			// Calculate the targets
			if (animation_start_time == null) {
				animation_start_time = currentTime;
				eye_z_target = -1 * eye_z_orig;
				target_z_target = -1 * target_z_orig;
			}
			let animation_finish_time = animation_start_time + animation_duration;
			// Interpolate the target of the eye
			at[2] = Interpolate(currentTime, animation_start_time, animation_finish_time, target_z_orig, target_z_target);
			// calculate rotation radians for camera
			if (orig_radians == 0) {
				radians = Interpolate(currentTime, animation_start_time, animation_finish_time, 0, Math.PI);	
				if (radians > 3.1415) {
					orig_radians = 1;
				}
			} else {
				radians = Interpolate(currentTime, animation_start_time, animation_finish_time, Math.PI, 0);
				if (radians == 0) {
					orig_radians = 0;
				}
			}
			eye[0] = 4 * Math.sin(radians);
			eye[2] = Interpolate(currentTime, animation_start_time, animation_finish_time, eye_z_orig, eye_z_target);
			setPlayerView(gl, shaderProgram, eye, at, up, canvas.width / canvas.height);
		}
		if (eye[2] == -1*eye_z_orig) {
			interpolateCamera = false;
			eye_z_orig = null;
			eye_z_target = null;
			target_z_orig = null;
			target_z_target = null;
			animation_start_time = null;
			// animation_finish_time = null;		Keep this commented !! Breaks if you don't for some reason.
		}

		// Draw the board
		gl.uniform1i(gl.getUniformLocation(shaderProgram, "uTexture"), BOARD_TEXTURE); // sets uTexture on the video card
		drawTransformedObject(gl, shaderProgram, objectBuffers, "cube");


		//
		// Draw White Pieces
		//
		gl.uniform1i(gl.getUniformLocation(shaderProgram, "uTexture"), WHITE_TEXTURE); // sets uTexture on the video card

		// Pawns
		drawTransformedObject(gl, shaderProgram, objectBuffers, "pawn", x1, y1, z1);	// 1
		drawTransformedObject(gl, shaderProgram, objectBuffers, "pawn", x2, y2, z2);	// 2
		drawTransformedObject(gl, shaderProgram, objectBuffers, "pawn", x3, y3, z3);	// 3
		drawTransformedObject(gl, shaderProgram, objectBuffers, "pawn", x4, y4, z4);    // 4
		drawTransformedObject(gl, shaderProgram, objectBuffers, "pawn", x5, y5, z5);	// 5
		drawTransformedObject(gl, shaderProgram, objectBuffers, "pawn", x6, y6, z6);	// 6
		drawTransformedObject(gl, shaderProgram, objectBuffers, "pawn", x7, y7, z7);	// 7
		drawTransformedObject(gl, shaderProgram, objectBuffers, "pawn", x8, y8, z8);	// 8

		// Rooks
		drawTransformedObject(gl, shaderProgram, objectBuffers, "rook", x9, y9, z9);	// 9
		drawTransformedObject(gl, shaderProgram, objectBuffers, "rook", x16, y16, z16);	// 16

		// Knights
		drawTransformedObject(gl, shaderProgram, objectBuffers, "knight", x10, y10, z10, Math.PI);	// 10
		drawTransformedObject(gl, shaderProgram, objectBuffers, "knight", x15, y15, z15, Math.PI);	// 15

		// Bishops
		drawTransformedObject(gl, shaderProgram, objectBuffers, "bishop", x11, y11, z11);	// 11
		drawTransformedObject(gl, shaderProgram, objectBuffers, "bishop", x14, y14, z14);	// 14

		// king:
		// Set the modelView and normal matrices to your translate,scale,rotate before drawing anything!
		drawTransformedObject(gl, shaderProgram, objectBuffers, "king", x13, y13, z13);	// 13
		// queen:	
		drawTransformedObject(gl, shaderProgram, objectBuffers, "queen", x12, y12, z12);	// 12


		//
		// Draw black Pieces
		//
		gl.uniform1i(gl.getUniformLocation(shaderProgram, "uTexture"), BLACK_TEXTURE); // sets uTexture on the video card

		// Pawns
		drawTransformedObject(gl, shaderProgram, objectBuffers, "pawn", x17, y17, z17);		// 17
		drawTransformedObject(gl, shaderProgram, objectBuffers, "pawn", x18, y18, z18);		// 18
		drawTransformedObject(gl, shaderProgram, objectBuffers, "pawn", x19, y19, z19);		// 19
		drawTransformedObject(gl, shaderProgram, objectBuffers, "pawn", x20, y20, z20);		// 20
		drawTransformedObject(gl, shaderProgram, objectBuffers, "pawn", x21, y21, z21);		// 21
		drawTransformedObject(gl, shaderProgram, objectBuffers, "pawn", x22, y22, z22);		// 22
		drawTransformedObject(gl, shaderProgram, objectBuffers, "pawn", x23, y23, z23);		// 23
		drawTransformedObject(gl, shaderProgram, objectBuffers, "pawn", x24, y24, z24);		// 24

		// Rooks
		drawTransformedObject(gl, shaderProgram, objectBuffers, "rook", x25, y25, z25);		// 25
		drawTransformedObject(gl, shaderProgram, objectBuffers, "rook", x32, y32, z32);		// 32

		// Knights
		drawTransformedObject(gl, shaderProgram, objectBuffers, "knight", x26, y26, z26);	// 26
		drawTransformedObject(gl, shaderProgram, objectBuffers, "knight", x31, y31, z31);	// 31

		// Bishops
		drawTransformedObject(gl, shaderProgram, objectBuffers, "bishop", x27, y27, z27);	// 27
		drawTransformedObject(gl, shaderProgram, objectBuffers, "bishop", x30, y30, z30);	// 30

		// king:
		// Set the modelView and normal matrices to your translate,scale,rotate before drawing anything!
		drawTransformedObject(gl, shaderProgram, objectBuffers, "king", x29, y29, z29);		// 29
		// queen:
		drawTransformedObject(gl, shaderProgram, objectBuffers, "queen", x28, y28, z28);	// 28

		//
		// //	The Script of piece moves and captures.
		//
		z4 = Interpolate(currentTime, 3, 3+animation_duration, z4, .5);
		z21 = Interpolate(currentTime, 5, 5+animation_duration, z21, -.5);
		z4 = Interpolate(currentTime, 7, 7+animation_duration, z4, z4-1);		
		x4 = Interpolate(currentTime, 7, 7+animation_duration, x4, 0.5);

			// capture pawn
		y21 = Interpolate(currentTime, 8, 8+animation_duration, y21, 20);
		x21 = Interpolate(currentTime, 10, 10+animation_duration, x21, -5.5);
		z21 = Interpolate(currentTime, 10, 10+animation_duration, z21, 5.5);
		y21 = Interpolate(currentTime, 10, 10+animation_duration, y21, 0);

		x28 = Interpolate(currentTime, 10, 10+animation_duration, x28, 0.5);
		z28 = Interpolate(currentTime, 10, 10+animation_duration, z28, -2.5);
		x15 = Interpolate(currentTime, 12, 12+animation_duration, x15, 1.5);
		z15 = Interpolate(currentTime, 12, 12+animation_duration, z15, 1.5);
		x26 = Interpolate(currentTime, 14, 14+animation_duration, x26, -1.5);
		z26 = Interpolate(currentTime, 14, 14+animation_duration, z26, -1.5);
		x11 = Interpolate(currentTime, 16, 16+animation_duration, x11, 1.5);
		z11 = Interpolate(currentTime, 16, 16+animation_duration, z11, .5);
		x28 = Interpolate(currentTime, 18, 18+animation_duration, x28, -2.5);
		z28 = Interpolate(currentTime, 18, 18+animation_duration, z28, .5);
		x11 = Interpolate(currentTime, 20, 20+animation_duration, x11, -0.5);
		z11 = Interpolate(currentTime, 20, 20+animation_duration, z11, 2.5);
		z28 = Interpolate(currentTime, 22, 22+animation_duration, z28, 2.5);

			// capture pawn
		y2 = Interpolate(currentTime, 23, 23+animation_duration, y2, 20);
		x2 = Interpolate(currentTime, 25, 25+animation_duration, x2, -5.5);
		z2 = Interpolate(currentTime, 25, 25+animation_duration, z2, -5.5);
		y2 = Interpolate(currentTime, 25, 25+animation_duration, y2, 0);

		x11 = Interpolate(currentTime, 25, 25+animation_duration, x11, -1.5);
		z11 = Interpolate(currentTime, 25, 25+animation_duration, z11, 1.5);
		x30 = Interpolate(currentTime, 27, 27+animation_duration, x30, -2.5);
		z30 = Interpolate(currentTime, 27, 27+animation_duration, z30, 0.5);
		z12 = Interpolate(currentTime, 29, 29+animation_duration, z12, 2.5);
		x30 = Interpolate(currentTime, 31, 31+animation_duration, x30, -1.5);
		z30 = Interpolate(currentTime, 31, 31+animation_duration, z30, 1.5);

			// capture bishop
		y11 = Interpolate(currentTime, 32, 32+animation_duration, y11, 20);
		x11 = Interpolate(currentTime, 34, 34+animation_duration, x11, -4.5);
		z11 = Interpolate(currentTime, 34, 34+animation_duration, z11, -5.5);
		y11 = Interpolate(currentTime, 34, 34+animation_duration, y11, 0);


		x12 = Interpolate(currentTime, 34, 34+animation_duration, x12, -1.5);
		z12 = Interpolate(currentTime, 34, 34+animation_duration, z12, 1.5);

			// capture bishop
		y30 = Interpolate(currentTime, 35, 35+animation_duration, y30, 20);
		x30 = Interpolate(currentTime, 37, 37+animation_duration, x30, -4.5);
		z30 = Interpolate(currentTime, 37, 37+animation_duration, z30, 5.5);
		y30 = Interpolate(currentTime, 37, 37+animation_duration, y30, 0);

		x28 = Interpolate(currentTime, 38, 38+animation_duration, x28, -1.5);
		z28 = Interpolate(currentTime, 38, 38+animation_duration, z28, 3.5);

		y1 = Interpolate(currentTime, 43, 50, y1, -20);
		y2 = Interpolate(currentTime, 43, 50, y2, -20);
		y3 = Interpolate(currentTime, 43, 50, y3, -20);
		y4 = Interpolate(currentTime, 43, 50, y4, -20);
		y5 = Interpolate(currentTime, 43, 50, y5, -20);
		y6 = Interpolate(currentTime, 43, 50, y6, -20);
		y7 = Interpolate(currentTime, 43, 50, y7, -20);
		y8 = Interpolate(currentTime, 43, 50, y8, -20);
		y9 = Interpolate(currentTime, 43, 50, y9, -20);
		y10 = Interpolate(currentTime, 43, 50, y10, -20);
		y11 = Interpolate(currentTime, 43, 50, y11, -20);
		y12 = Interpolate(currentTime, 43, 50, y12, -20);
		y13 = Interpolate(currentTime, 43, 50, y13, -20);
		y14 = Interpolate(currentTime, 43, 50, y14, -20);
		y15 = Interpolate(currentTime, 43, 50, y15, -20);
		y16 = Interpolate(currentTime, 43, 50, y16, -20);

		// let modelViewMatrix = mat4.create();
		// let rotation = Interpolate(currentTime, 5, 8, 0, Math.PI * 8);
		// mat4.rotate(modelViewMatrix, modelViewMatrix, rotation, [0, 1, 0]);
		// drawTransformedObject(gl, shaderProgram, objectBuffers["bishop"], modelViewMatrix);

		requestAnimationFrame(redraw);
	}
	requestAnimationFrame(redraw);
};

function setObservationView(gl, shaderProgram, eye, at, up, canvasAspect) {
	const projectionMatrix = mat4.create();
	const fov = 60 * Math.PI / 180;
	const near = 1;
	const far = 2000;
	mat4.perspective(projectionMatrix, fov, canvasAspect, near, far);

	const lookAtMatrix = mat4.create();
	mat4.lookAt(lookAtMatrix, eye, at, up);
	mat4.multiply(projectionMatrix, projectionMatrix, lookAtMatrix);

	const projectionMatrixUniformLocation = gl.getUniformLocation(shaderProgram, "uProjectionMatrix");
	gl.uniformMatrix4fv(projectionMatrixUniformLocation, false, projectionMatrix);

	gl.uniform3fv(
		gl.getUniformLocation(shaderProgram, "uEyePosition"),
		eye
	);
}

function setPlayerView(gl, shaderProgram, eye, at, up, canvasAspect) {
	const projectionMatrix = mat4.create();
	const fov = 90 * Math.PI / 180;
	const near = 1;
	const far = 200;
	mat4.perspective(projectionMatrix, fov, canvasAspect, near, far);
	
	const lookAtMatrix = mat4.create();
	mat4.lookAt(lookAtMatrix, eye, at, up);
	mat4.multiply(projectionMatrix, projectionMatrix, lookAtMatrix);

	const projectionMatrixUniformLocation = gl.getUniformLocation(shaderProgram, "uProjectionMatrix");
	gl.uniformMatrix4fv(projectionMatrixUniformLocation, false, projectionMatrix);

	gl.uniform3fv(gl.getUniformLocation(shaderProgram, "uEyePosition"), eye);
}

function drawBuffer(gl, shaderProgram, buffer) {
	// Tell this persistant buffer to redraw itself.
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	setShaderAttributes(gl, shaderProgram);
	gl.drawArrays(gl.TRIANGLES, 0, buffer.vertexCount);
}

function drawTransformedObject(gl, shaderProgram, buffer, name, trans_x=0, trans_y=0, trans_z=0, rotation=0) {
	const modelViewMatrix = mat4.create();
	mat4.translate(modelViewMatrix, modelViewMatrix, [trans_x, trans_y, trans_z]);
	mat4.rotate(modelViewMatrix, modelViewMatrix, rotation, [0, 1, 0]);
	gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, "uModelViewMatrix"), false, modelViewMatrix);

	const normalMatrix = mat3.create();
	mat3.normalFromMat4(normalMatrix, modelViewMatrix);
	gl.uniformMatrix3fv(gl.getUniformLocation(shaderProgram, "uNormalMatrix"), false, normalMatrix);

	drawBuffer(gl, shaderProgram, buffer[name]);
}

function Interpolate(currentTime, t0, t1, v0, v1) {
	let ratio = (currentTime-t0) / (t1 - t0);
	if (ratio < 0) {
		ratio = 0;
	} else if (ratio > 1) {
		ratio = 1;
	}
	let v = v0 + (v1 - v0) * ratio;
	return v;
}


