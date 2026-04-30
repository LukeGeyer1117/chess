// Reads an obj File.
// NOTE: OBJ files have one or more subGroups, or subObjects. Specified with "-g groupName" or "-o objectName"
// Stores the names of the subObjects in a list called objectNames
// Stores the objectVertices of each subObject in a dictionary of objectNames:objectVertices
//
// Input: objFileName
// Output: A list of objectNames, 1 or more
// Output: A dictionary of objectVertices, by objectNames:
//      Each objectVertices will contain several vertexDataItems.
//      One vertexData item will include 3 position values, 2 uv's, 3 pointNormals values, and 3 faceNormals values.   
//      3 + 2 + 3 + 3 = 11, so there will be 11 floats in each vertexData item
//      More specifically, one vertexData item contains: x,y,z,u,v,nx,ny,nz,fx,fy,fz
//      Three vertexData items will form 1 triangle.
//      for each objectVertices (subObject), all the floats are packed flat into 1 array.
async function readObjFile(objFileName) {
    const objectNames = []; // A list of subObject names
    const objectVertices = {}; // A dictionary to store all of each subObject's vertexDataItems, by their objectNames

    const response = await fetch(objFileName);
    const text = await response.text();

    const lines = text.split("\n");
    let objectName = "";
    const vertexList = [];
    const uvList = [];
    const normalList = [];
    let currentFaceList = [];

    for (const line of lines) {
        // For example:  g rook (or maybe:  o rook)
        // or:  vn 0.89748335 0.36030793 -0.25436556
        // or:  f 1704/2968/3487 1962/2969/3488 7196/2970/3489  
        //      (f  firstVertex  secondVertex  thirdVertex),  where firstVertex splits into (positionIndex/uvIndex/normalIndex)
        const values = line.split(' ');
        if (values[0] == 'o' || values[0] == 'g') {
            if (currentFaceList.length > 0) {
                objectNames.push(objectName);
                objectVertices[objectName] = collectVertexData(vertexList, uvList, normalList, currentFaceList);
                currentFaceList = [];
            }
            objectName = values[1];
        }
        else if (values[0] == 'v') {
            vertexList.push(parseFloat(values[1]), parseFloat(values[2]), parseFloat(values[3]));
        }
        else if (values[0] == 'vt') {
            uvList.push(parseFloat(values[1]), 1 - parseFloat(values[2])); // switch UV values to go BottomToTop for GL.
        }
        else if (values[0] == 'vn') {
            normalList.push(parseFloat(values[1]), parseFloat(values[2]), parseFloat(values[3]));
        }
        else if (values[0] == 'f') { // how to put together 1 face, usually a triangle but sometimes a quad or polygon.
            const numVerts = values.length - 1; // If numVerts is not 3, this code will fan the polygon into triangles.
            const fieldsV0 = values[1].split('/'); // fieldsV0 = [positionIndex0,uvIndex0,normalIndex0], always of firstVertex
            for (let i = 2; i < numVerts; i++) { // This loop happens once for trianges, twice for quads, etc.
                const fieldsV1 = values[i].split('/'); // fieldsV1 = [positionIndex1,uvIndex1,normalIndex1], secondIndex of current triangle
                const fieldsV2 = values[i + 1].split('/'); // fieldsV2 = [positionIndex2,uvIndex2,normalIndex2], thirdIndex of current triangle
                // Convert all 9 index numbers from strings to integers using parseInt.
                // NOTE: We also subtract 1 because all OBJ File lists are one based, but javascript arrays are zero based.
                currentFaceList.push(parseInt(fieldsV0[0]) - 1, parseInt(fieldsV0[1]) - 1, parseInt(fieldsV0[2]) - 1); // save firstVertex indices
                currentFaceList.push(parseInt(fieldsV1[0]) - 1, parseInt(fieldsV1[1]) - 1, parseInt(fieldsV1[2]) - 1); // save second Vertex indices
                currentFaceList.push(parseInt(fieldsV2[0]) - 1, parseInt(fieldsV2[1]) - 1, parseInt(fieldsV2[2]) - 1); // save third Vertex indices
                // Resulting push: positionIndex0,uvIndex0,normalIndex0, positionIndex1,uvIndex1,normalIndex1, positionIndex2,uvIndex2,normalIndex2  
            }
        }
    } // for
    if (currentFaceList.length > 0) {
        objectNames.push(objectName);
        objectVertices[objectName] = collectVertexData(vertexList, uvList, normalList, currentFaceList);
    } // if we have more vertices that still need to be processed, after reading the whole obj file.

    return [objectNames, objectVertices];

} // function readObjFile

// Input: vertexList, uvList, normalList, currentFaceList. All for one subObject (or subGroup) of the obj file.
// Output: vertexDataItems, a flat array of floats, including calculated faceNormals
function collectVertexData(vertexList, uvList, normalList, currentFaceList) {
    // Remember, each currentFaceList entry represents one triangle, is 9 integer indexes long, (or 3 vertices long), and looks like this:
    // positionIndex0,uvIndex0,normalIndex0, positionIndex1,uvIndex1,normalIndex1, positionIndex2,uvIndex2,normalIndex2  
    // So, if there were 10 triangles, there would be 30 vertices and 90 index numbers.
    // This code skips by 3, so it would happen 30 times, where each i is the beginning of each 3-wide vertex. i=0,3,6,9,12,15,...81,84,87
    const vertexDataItems = [];
    for (let i = 0; i < currentFaceList.length; i += 3) {
        const vertexIndex = currentFaceList[i] * 3;
        // *3 because the vertexList is [x0,y0,z0, x1,y1,z1, ... x10,y10,z10, ...],
        //      so if currentFaceList[i] is index 10, the actual x,y,z float values in vertexList are at indices 30, 31, 32.
        const uvIndex = currentFaceList[i + 1] * 2;
        const normalIndex = currentFaceList[i + 2] * 3;
        vertexDataItems.push(vertexList[vertexIndex + 0], vertexList[vertexIndex + 1], vertexList[vertexIndex + 2], // x,y,x
            uvList[uvIndex + 0], uvList[uvIndex + 1], // u,v
            normalList[normalIndex + 0], normalList[normalIndex + 1], normalList[normalIndex + 2] // nx,ny,nz
        );

        //
        // Calculating the triangleFaceNormals requires 3 vertices worth of vertexNormals.
        //

        // baseI is the beginning index of the current triangle, regardless if i is currently indexing the first, second, or third vertex.
        // Thus for the above example, baseI would go 0,0,0,9,9,9,18,18,18, ... 81,81,81
        const baseI = Math.floor(i / 9) * 9;
        const normalIndex0 = currentFaceList[baseI + 2] * 3; // normals of the first vertex in this triangle
        const normalIndex1 = currentFaceList[baseI + 5] * 3; // normals of the second vertex in this triangle
        const normalIndex2 = currentFaceList[baseI + 8] * 3; // normals of the third
        const nx = [normalList[normalIndex0 + 0], normalList[normalIndex1 + 0], normalList[normalIndex2 + 0]];
        const ny = [normalList[normalIndex0 + 1], normalList[normalIndex1 + 1], normalList[normalIndex2 + 1]];
        const nz = [normalList[normalIndex0 + 2], normalList[normalIndex1 + 2], normalList[normalIndex2 + 2]];
        // The faceNormal is the average of the 3 vertexNormals.
        // Again, it is the same for 3 vertices in a row, then it is the same for the next three vertices, etc.
        const faceNormal = [nx[0] + nx[1] + nx[2], ny[0] + ny[1] + ny[2], nz[0] + nz[1] + nz[2]];
        vertexDataItems.push(faceNormal[0], faceNormal[1], faceNormal[2])
    }
    return vertexDataItems;
}

export { readObjFile };