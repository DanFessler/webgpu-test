//#region src/lib/math.ts
var Color = {
	white: {
		r: 1,
		g: 1,
		b: 1,
		a: 1
	},
	black: {
		r: 0,
		g: 0,
		b: 0,
		a: 1
	},
	transparent: {
		r: 0,
		g: 0,
		b: 0,
		a: 0
	},
	red: {
		r: 1,
		g: 0,
		b: 0,
		a: 1
	},
	green: {
		r: 0,
		g: 1,
		b: 0,
		a: 1
	},
	blue: {
		r: 0,
		g: 0,
		b: 1,
		a: 1
	},
	yellow: {
		r: 1,
		g: 1,
		b: 0,
		a: 1
	},
	cyan: {
		r: 0,
		g: 1,
		b: 1,
		a: 1
	},
	magenta: {
		r: 1,
		g: 0,
		b: 1,
		a: 1
	},
	cornflowerBlue: {
		r: .392,
		g: .584,
		b: .929,
		a: 1
	},
	rgba(r, g, b, a = 1) {
		return {
			r,
			g,
			b,
			a
		};
	}
};
//#endregion
//#region src/lib/states.ts
var BlendState = {
	alphaBlend: {
		color: {
			srcFactor: "src-alpha",
			dstFactor: "one-minus-src-alpha",
			operation: "add"
		},
		alpha: {
			srcFactor: "one",
			dstFactor: "one-minus-src-alpha",
			operation: "add"
		}
	},
	additive: {
		color: {
			srcFactor: "src-alpha",
			dstFactor: "one",
			operation: "add"
		},
		alpha: {
			srcFactor: "one",
			dstFactor: "one",
			operation: "add"
		}
	},
	opaque: {
		color: {
			srcFactor: "one",
			dstFactor: "zero",
			operation: "add"
		},
		alpha: {
			srcFactor: "one",
			dstFactor: "zero",
			operation: "add"
		}
	},
	premultipliedAlpha: {
		color: {
			srcFactor: "one",
			dstFactor: "one-minus-src-alpha",
			operation: "add"
		},
		alpha: {
			srcFactor: "one",
			dstFactor: "one-minus-src-alpha",
			operation: "add"
		}
	}
};
var SamplerState = {
	linearClamp: {
		magFilter: "linear",
		minFilter: "linear",
		addressModeU: "clamp-to-edge",
		addressModeV: "clamp-to-edge"
	},
	linearWrap: {
		magFilter: "linear",
		minFilter: "linear",
		addressModeU: "repeat",
		addressModeV: "repeat"
	},
	pointClamp: {
		magFilter: "nearest",
		minFilter: "nearest",
		addressModeU: "clamp-to-edge",
		addressModeV: "clamp-to-edge"
	},
	pointWrap: {
		magFilter: "nearest",
		minFilter: "nearest",
		addressModeU: "repeat",
		addressModeV: "repeat"
	}
};
//#endregion
//#region src/lib/SpriteEffect.ts
var SHADER_PREAMBLE = `
struct ScreenUniform {
  size: vec4f,
}

struct VertexInput {
  @location(0) local_pos: vec2f,
  @location(6) local_uv: vec2f,
  @location(1) inst_pos: vec2f,
  @location(2) inst_size: vec2f,
  @location(3) inst_color: vec4f,
  @location(4) inst_uv_rect: vec4f,
  @location(5) inst_depth: f32,
  @location(7) inst_rotation: f32,
  @location(8) inst_origin: vec2f,
}

struct VertexOutput {
  @builtin(position) clip_pos: vec4f,
  @location(0) color: vec4f,
  @location(1) uv: vec2f,
}

@group(0) @binding(0) var<uniform> screen: ScreenUniform;
@group(0) @binding(1) var sprite_tex: texture_2d<f32>;
@group(0) @binding(2) var sprite_sampler: sampler;
`;
var VERTEX_MAIN = `
@vertex
fn vs_main(v: VertexInput) -> VertexOutput {
  var out: VertexOutput;
  let pixel = v.local_pos * v.inst_size;
  let centered = pixel - v.inst_origin;
  let c = cos(v.inst_rotation);
  let s = sin(v.inst_rotation);
  let rotated = vec2f(
    centered.x * c - centered.y * s,
    centered.x * s + centered.y * c,
  );
  let world = v.inst_pos + rotated;
  let ndc_x = (world.x / screen.size.x) * 2.0 - 1.0;
  let ndc_y = 1.0 - (world.y / screen.size.y) * 2.0;
  out.clip_pos = vec4f(ndc_x, ndc_y, v.inst_depth, 1.0);
  out.uv = mix(v.inst_uv_rect.xy, v.inst_uv_rect.zw, v.local_uv);
  out.color = v.inst_color;
  return out;
}
`;
var FRAG_TEXTURED = `
@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4f {
  let t = textureSample(sprite_tex, sprite_sampler, in.uv);
  return t * in.color;
}
`;
var FRAG_ALPHA_CUTOUT = `
@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4f {
  let t = textureSample(sprite_tex, sprite_sampler, in.uv);
  if (t.a < 0.5) { discard; }
  return vec4f(t.rgb * in.color.rgb, 1.0);
}
`;
var FRAG_ALPHA_CUTOUT_DEPTH = `
@fragment
fn fs_depth(in: VertexOutput) {
  let t = textureSample(sprite_tex, sprite_sampler, in.uv);
  if (t.a < 0.5) { discard; }
}
`;
var FRAG_SOLID_COLOR = `
@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4f {
  return in.color;
}
`;
function buildShaderSource(effect) {
	return SHADER_PREAMBLE + VERTEX_MAIN + effect.fragmentWgsl;
}
function buildDepthShaderSource(effect) {
	return SHADER_PREAMBLE + VERTEX_MAIN + (effect.depthFragmentWgsl ?? "");
}
var SpriteEffect = {
	defaultTextured: {
		label: "defaultTextured",
		fragmentWgsl: FRAG_TEXTURED,
		depthPrepass: false
	},
	alphaCutout: {
		label: "alphaCutout",
		fragmentWgsl: FRAG_ALPHA_CUTOUT,
		depthPrepass: true,
		depthFragmentWgsl: FRAG_ALPHA_CUTOUT_DEPTH
	},
	solidColor: {
		label: "solidColor",
		fragmentWgsl: FRAG_SOLID_COLOR,
		depthPrepass: false
	},
	custom(label, fragmentWgsl, options) {
		return {
			label,
			fragmentWgsl,
			depthPrepass: options?.depthPrepass ?? false,
			depthFragmentWgsl: options?.depthFragmentWgsl
		};
	}
};
//#endregion
//#region src/lib/Texture2D.ts
var nextId = 1;
var Texture2D = class Texture2D {
	gpuTexture;
	view;
	width;
	height;
	id;
	constructor(gpuTexture, width, height) {
		this.gpuTexture = gpuTexture;
		this.view = gpuTexture.createView();
		this.width = width;
		this.height = height;
		this.id = nextId++;
	}
	static async fromUrl(device, url) {
		const img = new Image();
		img.src = url;
		await img.decode();
		return Texture2D.fromImageSource(device, img);
	}
	static fromImageSource(device, source) {
		const w = "naturalWidth" in source ? source.naturalWidth : source.width;
		const h = "naturalHeight" in source ? source.naturalHeight : source.height;
		const gpu = device.gpuDevice;
		const texture = gpu.createTexture({
			label: "texture2d",
			size: {
				width: w,
				height: h
			},
			format: "rgba8unorm",
			usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
		});
		gpu.queue.copyExternalImageToTexture({ source }, { texture }, {
			width: w,
			height: h
		});
		return new Texture2D(texture, w, h);
	}
	static fromColor(device, r, g, b, a = 1) {
		const gpu = device.gpuDevice;
		const texture = gpu.createTexture({
			label: "texture2d-solid",
			size: {
				width: 1,
				height: 1
			},
			format: "rgba8unorm",
			usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
		});
		const data = new Uint8Array([
			Math.round(r * 255),
			Math.round(g * 255),
			Math.round(b * 255),
			Math.round(a * 255)
		]);
		gpu.queue.writeTexture({ texture }, data, { bytesPerRow: 4 }, {
			width: 1,
			height: 1
		});
		return new Texture2D(texture, 1, 1);
	}
	destroy() {
		this.gpuTexture.destroy();
	}
};
//#endregion
//#region src/lib/GraphicsDevice.ts
var DEPTH_FORMAT = "depth24plus";
var GraphicsDevice = class GraphicsDevice {
	canvas;
	gpuDevice;
	format;
	_context;
	_encoder = null;
	_colorView = null;
	_depthTexture = null;
	_depthView = null;
	_lastW = 0;
	_lastH = 0;
	_frameId = 0;
	constructor(canvas, gpuDevice, context, format) {
		this.canvas = canvas;
		this.gpuDevice = gpuDevice;
		this._context = context;
		this.format = format;
	}
	static async create(canvas) {
		if (!navigator.gpu) throw new Error("WebGPU is not supported in this browser");
		const adapter = await navigator.gpu.requestAdapter({ powerPreference: "high-performance" });
		if (!adapter) throw new Error("No WebGPU adapter found");
		const device = await adapter.requestDevice();
		const ctx = canvas.getContext("webgpu");
		if (!ctx) throw new Error("Failed to get WebGPU canvas context");
		return new GraphicsDevice(canvas, device, ctx, navigator.gpu.getPreferredCanvasFormat());
	}
	get width() {
		return this.canvas.width;
	}
	get height() {
		return this.canvas.height;
	}
	get depthFormat() {
		return DEPTH_FORMAT;
	}
	get commandEncoder() {
		if (!this._encoder) throw new Error("No active frame — call beginFrame() first");
		return this._encoder;
	}
	get colorView() {
		if (!this._colorView) throw new Error("No active frame");
		return this._colorView;
	}
	get depthView() {
		if (!this._depthView) throw new Error("No depth texture");
		return this._depthView;
	}
	get frameId() {
		return this._frameId;
	}
	resize() {
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		const w = Math.max(1, Math.floor(this.canvas.clientWidth * dpr));
		const h = Math.max(1, Math.floor(this.canvas.clientHeight * dpr));
		if (this.canvas.width !== w || this.canvas.height !== h) {
			this.canvas.width = w;
			this.canvas.height = h;
		}
	}
	beginFrame(options) {
		this._frameId++;
		this.resize();
		if (this.canvas.width !== this._lastW || this.canvas.height !== this._lastH) {
			this._lastW = this.canvas.width;
			this._lastH = this.canvas.height;
			this._context.configure({
				device: this.gpuDevice,
				format: this.format,
				alphaMode: "opaque"
			});
			this._depthTexture?.destroy();
			this._depthTexture = this.gpuDevice.createTexture({
				label: "gd-depth",
				size: {
					width: this._lastW,
					height: this._lastH
				},
				format: DEPTH_FORMAT,
				usage: GPUTextureUsage.RENDER_ATTACHMENT
			});
			this._depthView = this._depthTexture.createView();
		}
		this._encoder = this.gpuDevice.createCommandEncoder();
		this._colorView = this._context.getCurrentTexture().createView();
		const c = options?.clearColor ?? {
			r: 0,
			g: 0,
			b: 0,
			a: 1
		};
		this._encoder.beginRenderPass({
			colorAttachments: [{
				view: this._colorView,
				clearValue: {
					r: c.r,
					g: c.g,
					b: c.b,
					a: c.a
				},
				loadOp: "clear",
				storeOp: "store"
			}],
			depthStencilAttachment: {
				view: this._depthView,
				depthClearValue: 1,
				depthLoadOp: "clear",
				depthStoreOp: "store"
			}
		}).end();
	}
	endFrame() {
		if (!this._encoder) throw new Error("No active frame");
		this.gpuDevice.queue.submit([this._encoder.finish()]);
		this._encoder = null;
		this._colorView = null;
	}
};
//#endregion
//#region src/lib/SpriteBatch.ts
var INSTANCE_FLOATS = 16;
var INSTANCE_BYTES = INSTANCE_FLOATS * 4;
var VERTEX_BUFFER_LAYOUTS = [{
	arrayStride: 16,
	stepMode: "vertex",
	attributes: [{
		shaderLocation: 0,
		offset: 0,
		format: "float32x2"
	}, {
		shaderLocation: 6,
		offset: 8,
		format: "float32x2"
	}]
}, {
	arrayStride: INSTANCE_BYTES,
	stepMode: "instance",
	attributes: [
		{
			shaderLocation: 1,
			offset: 0,
			format: "float32x2"
		},
		{
			shaderLocation: 2,
			offset: 8,
			format: "float32x2"
		},
		{
			shaderLocation: 3,
			offset: 16,
			format: "float32x4"
		},
		{
			shaderLocation: 4,
			offset: 32,
			format: "float32x4"
		},
		{
			shaderLocation: 5,
			offset: 48,
			format: "float32"
		},
		{
			shaderLocation: 7,
			offset: 52,
			format: "float32"
		},
		{
			shaderLocation: 8,
			offset: 56,
			format: "float32x2"
		}
	]
}];
var SpriteBatch = class {
	_device;
	_gpu;
	_maxSprites;
	_uniformBuffer;
	_quadVB;
	_quadIB;
	_instanceBuffer;
	_instanceData;
	_textures;
	_bindGroupLayout;
	_pipelineLayout;
	_pipelineCache = /* @__PURE__ */ new Map();
	_shaderCache = /* @__PURE__ */ new Map();
	_samplerCache = /* @__PURE__ */ new Map();
	_begun = false;
	_spriteCount = 0;
	_bufferOffset = 0;
	_lastFrameId = -1;
	_sortMode = "deferred";
	_blend = BlendState.alphaBlend;
	_sampler = SamplerState.linearClamp;
	_effect = SpriteEffect.defaultTextured;
	_time = 0;
	constructor(device, options) {
		this._device = device;
		this._gpu = device.gpuDevice;
		this._maxSprites = options?.maxSprites ?? 1e4;
		this._uniformBuffer = this._gpu.createBuffer({
			label: "sb-uniform",
			size: 16,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
		});
		const verts = new Float32Array([
			0,
			0,
			0,
			0,
			1,
			0,
			1,
			0,
			0,
			1,
			0,
			1,
			1,
			1,
			1,
			1
		]);
		this._quadVB = this._gpu.createBuffer({
			label: "sb-quad-vb",
			size: verts.byteLength,
			usage: GPUBufferUsage.VERTEX,
			mappedAtCreation: true
		});
		new Float32Array(this._quadVB.getMappedRange()).set(verts);
		this._quadVB.unmap();
		const idx = new Uint16Array([
			0,
			1,
			2,
			2,
			1,
			3
		]);
		this._quadIB = this._gpu.createBuffer({
			label: "sb-quad-ib",
			size: idx.byteLength,
			usage: GPUBufferUsage.INDEX,
			mappedAtCreation: true
		});
		new Uint16Array(this._quadIB.getMappedRange()).set(idx);
		this._quadIB.unmap();
		this._instanceData = new Float32Array(this._maxSprites * INSTANCE_FLOATS);
		this._instanceBuffer = this._gpu.createBuffer({
			label: "sb-instances",
			size: this._instanceData.byteLength,
			usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
		});
		this._textures = new Array(this._maxSprites).fill(null);
		this._bindGroupLayout = this._gpu.createBindGroupLayout({
			label: "sb-bgl",
			entries: [
				{
					binding: 0,
					visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
					buffer: { type: "uniform" }
				},
				{
					binding: 1,
					visibility: GPUShaderStage.FRAGMENT,
					texture: { sampleType: "float" }
				},
				{
					binding: 2,
					visibility: GPUShaderStage.FRAGMENT,
					sampler: { type: "filtering" }
				}
			]
		});
		this._pipelineLayout = this._gpu.createPipelineLayout({
			label: "sb-pl",
			bindGroupLayouts: [this._bindGroupLayout]
		});
	}
	begin(options) {
		if (this._begun) throw new Error("SpriteBatch.begin() called twice without end()");
		this._begun = true;
		this._spriteCount = 0;
		const fid = this._device.frameId;
		if (fid !== this._lastFrameId) {
			this._lastFrameId = fid;
			this._bufferOffset = 0;
		}
		this._sortMode = options?.sortMode ?? "deferred";
		this._blend = options?.blendState ?? BlendState.alphaBlend;
		this._sampler = options?.samplerState ?? SamplerState.linearClamp;
		this._effect = options?.effect ?? SpriteEffect.defaultTextured;
		this._time = options?.time ?? 0;
	}
	draw(texture, options) {
		if (!this._begun) throw new Error("draw() called without begin()");
		if (this._spriteCount >= this._maxSprites) return;
		const opts = options ?? {};
		const i = this._spriteCount++;
		const o = i * INSTANCE_FLOATS;
		const srcX = opts.sourceRect?.x ?? 0;
		const srcY = opts.sourceRect?.y ?? 0;
		const srcW = opts.sourceRect?.width ?? texture.width;
		const srcH = opts.sourceRect?.height ?? texture.height;
		let u0 = srcX / texture.width;
		let v0 = srcY / texture.height;
		let u1 = (srcX + srcW) / texture.width;
		let v1 = (srcY + srcH) / texture.height;
		const flip = opts.flip ?? "none";
		if (flip === "horizontal" || flip === "both") {
			const tmp = u0;
			u0 = u1;
			u1 = tmp;
		}
		if (flip === "vertical" || flip === "both") {
			const tmp = v0;
			v0 = v1;
			v1 = tmp;
		}
		let px, py, dw, dh;
		if (opts.destinationRect) {
			px = opts.destinationRect.x;
			py = opts.destinationRect.y;
			dw = opts.destinationRect.width;
			dh = opts.destinationRect.height;
		} else {
			const sx = typeof opts.scale === "number" ? opts.scale : opts.scale?.[0] ?? 1;
			const sy = typeof opts.scale === "number" ? opts.scale : opts.scale?.[1] ?? 1;
			dw = srcW * sx;
			dh = srcH * sy;
			px = opts.position?.[0] ?? 0;
			py = opts.position?.[1] ?? 0;
		}
		const scaleToDestX = dw / srcW;
		const scaleToDestY = dh / srcH;
		const ox = (opts.origin?.[0] ?? 0) * scaleToDestX;
		const oy = (opts.origin?.[1] ?? 0) * scaleToDestY;
		const color = opts.color ?? Color.white;
		const d = this._instanceData;
		d[o] = px;
		d[o + 1] = py;
		d[o + 2] = dw;
		d[o + 3] = dh;
		d[o + 4] = color.r;
		d[o + 5] = color.g;
		d[o + 6] = color.b;
		d[o + 7] = color.a;
		d[o + 8] = u0;
		d[o + 9] = v0;
		d[o + 10] = u1;
		d[o + 11] = v1;
		d[o + 12] = opts.layerDepth ?? 0;
		d[o + 13] = opts.rotation ?? 0;
		d[o + 14] = ox;
		d[o + 15] = oy;
		this._textures[i] = texture;
	}
	end() {
		if (!this._begun) throw new Error("end() called without begin()");
		this._begun = false;
		if (this._spriteCount === 0) return;
		this._gpu.queue.writeBuffer(this._uniformBuffer, 0, new Float32Array([
			this._device.width,
			this._device.height,
			this._time,
			0
		]));
		const order = this._sortOrder();
		const sorted = this._rearrange(order);
		const count = this._spriteCount;
		const baseOffset = this._bufferOffset;
		this._gpu.queue.writeBuffer(this._instanceBuffer, baseOffset * INSTANCE_BYTES, sorted.data.buffer, sorted.data.byteOffset, count * INSTANCE_BYTES);
		this._bufferOffset += count;
		const sampler = this._getOrCreateSampler(this._sampler);
		const groups = this._textureGroups(sorted.textures, count);
		const encoder = this._device.commandEncoder;
		const effect = this._effect;
		if (effect.depthPrepass) {
			const depthPipeline = this._getOrCreatePipeline(true);
			const pass = encoder.beginRenderPass({
				colorAttachments: [],
				depthStencilAttachment: {
					view: this._device.depthView,
					depthClearValue: 1,
					depthLoadOp: "clear",
					depthStoreOp: "store"
				}
			});
			this._drawGroups(pass, depthPipeline, sampler, groups, sorted.textures, baseOffset);
			pass.end();
		}
		const colorPipeline = this._getOrCreatePipeline(false);
		const colorPass = encoder.beginRenderPass({
			colorAttachments: [{
				view: this._device.colorView,
				loadOp: "load",
				storeOp: "store"
			}],
			...effect.depthPrepass ? { depthStencilAttachment: {
				view: this._device.depthView,
				depthLoadOp: "load",
				depthStoreOp: "discard"
			} } : {}
		});
		this._drawGroups(colorPass, colorPipeline, sampler, groups, sorted.textures, baseOffset);
		colorPass.end();
	}
	_sortOrder() {
		const n = this._spriteCount;
		const order = Array.from({ length: n }, (_, i) => i);
		const d = this._instanceData;
		const textures = this._textures;
		switch (this._sortMode) {
			case "deferred": break;
			case "texture":
				order.sort((a, b) => textures[a].id - textures[b].id);
				break;
			case "frontToBack":
				order.sort((a, b) => d[a * INSTANCE_FLOATS + 12] - d[b * INSTANCE_FLOATS + 12]);
				break;
			case "backToFront":
				order.sort((a, b) => d[b * INSTANCE_FLOATS + 12] - d[a * INSTANCE_FLOATS + 12]);
				break;
		}
		return order;
	}
	_rearrange(order) {
		const n = this._spriteCount;
		const src = this._instanceData;
		const dst = new Float32Array(n * INSTANCE_FLOATS);
		const textures = new Array(n);
		for (let i = 0; i < n; i++) {
			const srcIdx = order[i];
			dst.set(src.subarray(srcIdx * INSTANCE_FLOATS, (srcIdx + 1) * INSTANCE_FLOATS), i * INSTANCE_FLOATS);
			textures[i] = this._textures[srcIdx];
		}
		return {
			data: dst,
			textures
		};
	}
	_textureGroups(textures, count) {
		if (count === 0) return [];
		const groups = [];
		let gStart = 0;
		let gTex = textures[0];
		for (let i = 1; i < count; i++) if (textures[i] !== gTex) {
			groups.push({
				start: gStart,
				count: i - gStart
			});
			gStart = i;
			gTex = textures[i];
		}
		groups.push({
			start: gStart,
			count: count - gStart
		});
		return groups;
	}
	_drawGroups(pass, pipeline, sampler, groups, textures, instanceOffset) {
		pass.setPipeline(pipeline);
		pass.setVertexBuffer(0, this._quadVB);
		pass.setVertexBuffer(1, this._instanceBuffer);
		pass.setIndexBuffer(this._quadIB, "uint16");
		for (const g of groups) {
			const bg = this._gpu.createBindGroup({
				layout: this._bindGroupLayout,
				entries: [
					{
						binding: 0,
						resource: { buffer: this._uniformBuffer }
					},
					{
						binding: 1,
						resource: textures[g.start].view
					},
					{
						binding: 2,
						resource: sampler
					}
				]
			});
			pass.setBindGroup(0, bg);
			pass.drawIndexed(6, g.count, 0, 0, instanceOffset + g.start);
		}
	}
	_getOrCreatePipeline(isDepth) {
		const effect = this._effect;
		const blend = this._blend;
		const fmt = this._device.format;
		const key = `${effect.label}|${isDepth}|${JSON.stringify(blend)}|${fmt}`;
		let p = this._pipelineCache.get(key);
		if (p) return p;
		const wgsl = isDepth ? buildDepthShaderSource(effect) : buildShaderSource(effect);
		let mod = this._shaderCache.get(wgsl);
		if (!mod) {
			mod = this._gpu.createShaderModule({
				label: `sb-${effect.label}`,
				code: wgsl
			});
			this._shaderCache.set(wgsl, mod);
		}
		const depthFmt = this._device.depthFormat;
		let depthStencil;
		if (isDepth) depthStencil = {
			format: depthFmt,
			depthWriteEnabled: true,
			depthCompare: "less"
		};
		else if (effect.depthPrepass) depthStencil = {
			format: depthFmt,
			depthWriteEnabled: false,
			depthCompare: "less-equal"
		};
		p = this._gpu.createRenderPipeline({
			label: `sb-pipe-${effect.label}-${isDepth ? "depth" : "color"}`,
			layout: this._pipelineLayout,
			vertex: {
				module: mod,
				entryPoint: "vs_main",
				buffers: VERTEX_BUFFER_LAYOUTS
			},
			fragment: isDepth ? {
				module: mod,
				entryPoint: "fs_depth",
				targets: []
			} : {
				module: mod,
				entryPoint: "fs_main",
				targets: [{
					format: fmt,
					blend: {
						color: blend.color,
						alpha: blend.alpha
					}
				}]
			},
			primitive: { topology: "triangle-list" },
			...depthStencil ? { depthStencil } : {}
		});
		this._pipelineCache.set(key, p);
		return p;
	}
	_getOrCreateSampler(state) {
		const key = JSON.stringify(state);
		let s = this._samplerCache.get(key);
		if (!s) {
			s = this._gpu.createSampler({
				label: "sb-sampler",
				...state
			});
			this._samplerCache.set(key, s);
		}
		return s;
	}
};
//#endregion
export { BlendState, Color, GraphicsDevice, SamplerState, SpriteBatch, SpriteEffect, Texture2D, buildShaderSource };

//# sourceMappingURL=spritebatch.js.map