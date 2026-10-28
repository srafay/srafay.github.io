/*
  The few WebGL2 calls the scene repeats: a program from two shaders, a buffer, an instanced attribute, the atlas as a
  one-channel texture.
*/
export type Attribute = { name: string; size: number; divisor: number; buffer: WebGLBuffer };

export function program(gl: WebGL2RenderingContext, vertexSource: string, fragmentSource: string) {
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type) as WebGLShader;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? "shader");
    return shader;
  };
  const made = gl.createProgram() as WebGLProgram;
  gl.attachShader(made, compile(gl.VERTEX_SHADER, vertexSource));
  gl.attachShader(made, compile(gl.FRAGMENT_SHADER, fragmentSource));
  gl.linkProgram(made);
  if (!gl.getProgramParameter(made, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(made) ?? "program");
  return made;
}

export function buffer(gl: WebGL2RenderingContext, data: BufferSource, usage: number = gl.STATIC_DRAW, target: number = gl.ARRAY_BUFFER) {
  const made = gl.createBuffer() as WebGLBuffer;
  gl.bindBuffer(target, made);
  gl.bufferData(target, data, usage);
  return made;
}

/** Binds each attribute of a program to its buffer in one vertex array. */
export function vertexArray(gl: WebGL2RenderingContext, shaderProgram: WebGLProgram, attributes: Attribute[], indices?: WebGLBuffer) {
  const array = gl.createVertexArray() as WebGLVertexArrayObject;
  gl.bindVertexArray(array);
  for (const attribute of attributes) {
    const location = gl.getAttribLocation(shaderProgram, attribute.name);
    if (location < 0) continue;
    gl.bindBuffer(gl.ARRAY_BUFFER, attribute.buffer);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, attribute.size, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(location, attribute.divisor);
  }
  if (indices) gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
  gl.bindVertexArray(null);
  return array;
}

/** The distance-field atlas as a one-channel texture, smooth between texels. */
export function atlasTexture(gl: WebGL2RenderingContext, width: number, height: number, pixels: Uint8Array) {
  const texture = gl.createTexture() as WebGLTexture;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, width, height, 0, gl.RED, gl.UNSIGNED_BYTE, pixels);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return texture;
}

/** A colour as "#rrggbb" to three numbers from 0 to 1. */
export function rgb(hex: string): [number, number, number] {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}
