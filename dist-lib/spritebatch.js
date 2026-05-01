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
  transform: mat4x4f,
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
  let transformed = (screen.transform * vec4f(world, 0.0, 1.0)).xy;
  let ndc_x = (transformed.x / screen.size.x) * 2.0 - 1.0;
  let ndc_y = 1.0 - (transformed.y / screen.size.y) * 2.0;
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
var PARAM_INFO = {
	f32: {
		align: 4,
		size: 4,
		components: 1
	},
	vec2f: {
		align: 8,
		size: 8,
		components: 2
	},
	vec3f: {
		align: 16,
		size: 12,
		components: 3
	},
	vec4f: {
		align: 16,
		size: 16,
		components: 4
	}
};
function alignUp(offset, align) {
	return offset + align - 1 & ~(align - 1);
}
function buildParamsDescriptor(input) {
	const schema = {};
	const defaults = {};
	const fields = [];
	let offset = 0;
	let structAlign = 4;
	for (const [name, def] of Object.entries(input)) {
		const type = typeof def === "string" ? def : def.type;
		schema[name] = type;
		if (typeof def === "object" && def.default !== void 0) defaults[name] = def.default;
		const info = PARAM_INFO[type];
		offset = alignUp(offset, info.align);
		fields.push({
			name,
			type,
			offset
		});
		offset += info.size;
		structAlign = Math.max(structAlign, info.align);
	}
	const size = alignUp(offset, structAlign);
	return {
		schema,
		defaults,
		wgsl: `struct EffectParams {\n${fields.map((f) => `  ${f.name}: ${f.type},`).join("\n")}\n}\n@group(1) @binding(0) var<uniform> params: EffectParams;\n`,
		size,
		fields
	};
}
function packParams(descriptor, values, out) {
	const floatCount = descriptor.size / 4;
	const buf = out ?? new Float32Array(floatCount);
	buf.fill(0);
	for (const field of descriptor.fields) {
		const val = values[field.name];
		if (val === void 0) continue;
		const floatOffset = field.offset / 4;
		if (typeof val === "number") buf[floatOffset] = val;
		else {
			const comps = PARAM_INFO[field.type].components;
			for (let c = 0; c < comps; c++) buf[floatOffset + c] = val[c] ?? 0;
		}
	}
	return buf;
}
function buildShaderSource(effect) {
	return SHADER_PREAMBLE + (effect.params?.wgsl ?? "") + VERTEX_MAIN + effect.fragmentWgsl;
}
function buildDepthShaderSource(effect) {
	return SHADER_PREAMBLE + (effect.params?.wgsl ?? "") + VERTEX_MAIN + (effect.depthFragmentWgsl ?? "");
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
			depthFragmentWgsl: options?.depthFragmentWgsl,
			params: options?.params ? buildParamsDescriptor(options.params) : void 0
		};
	},
	variant(effect, defaults) {
		if (!effect.params) return effect;
		return {
			...effect,
			params: {
				...effect.params,
				defaults: {
					...effect.params.defaults,
					...defaults
				}
			}
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
	static async fromUrl(surface, url) {
		const img = new Image();
		img.src = url;
		await img.decode();
		return Texture2D.fromImageSource(surface, img);
	}
	static fromImageSource(surface, source) {
		const w = "naturalWidth" in source ? source.naturalWidth : source.width;
		const h = "naturalHeight" in source ? source.naturalHeight : source.height;
		const gpu = surface.gpuDevice;
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
	static fromColor(surface, r, g, b, a = 1) {
		const gpu = surface.gpuDevice;
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
//#region src/lib/RenderSurface.ts
var DEPTH_FORMAT = "depth24plus";
var RenderSurface = class RenderSurface {
	canvas;
	gpuDevice;
	format;
	maxDevicePixelRatio = 2;
	_context;
	_encoder = null;
	_colorView = null;
	_depthTexture = null;
	_depthView = null;
	_lastW = 0;
	_lastH = 0;
	_frameId = 0;
	_logicalW = 1;
	_logicalH = 1;
	_dpr = 1;
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
		return new RenderSurface(canvas, device, ctx, navigator.gpu.getPreferredCanvasFormat());
	}
	get width() {
		return this._logicalW;
	}
	get height() {
		return this._logicalH;
	}
	get physicalWidth() {
		return this.canvas.width;
	}
	get physicalHeight() {
		return this.canvas.height;
	}
	get dpr() {
		return this._dpr;
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
		const dpr = Math.min(window.devicePixelRatio || 1, this.maxDevicePixelRatio);
		const cw = this.canvas.clientWidth || window.innerWidth;
		const ch = this.canvas.clientHeight || window.innerHeight;
		const w = Math.max(1, Math.floor(cw * dpr));
		const h = Math.max(1, Math.floor(ch * dpr));
		if (this.canvas.width !== w || this.canvas.height !== h) {
			this.canvas.width = w;
			this.canvas.height = h;
		}
		this._logicalW = cw;
		this._logicalH = ch;
		this._dpr = dpr;
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
//#region src/lib/RenderTexture2D.ts
var RenderTexture2D = class RenderTexture2D {
	_surface;
	_texture;
	_depthTexture;
	_depthView;
	_physW;
	_physH;
	_logicalW;
	_logicalH;
	_label;
	constructor(surface, physW, physH, logicalW, logicalH, label) {
		this._surface = surface;
		this._physW = physW;
		this._physH = physH;
		this._logicalW = logicalW;
		this._logicalH = logicalH;
		this._label = label;
		this._createTextures();
	}
	static create(surface, options) {
		const w = Math.max(1, Math.floor(options.width));
		const h = Math.max(1, Math.floor(options.height));
		return new RenderTexture2D(surface, w, h, w, h, options.label ?? "rt");
	}
	get texture() {
		return this._texture;
	}
	get gpuDevice() {
		return this._surface.gpuDevice;
	}
	get commandEncoder() {
		return this._surface.commandEncoder;
	}
	get width() {
		return this._logicalW;
	}
	get height() {
		return this._logicalH;
	}
	get physicalWidth() {
		return this._physW;
	}
	get physicalHeight() {
		return this._physH;
	}
	get format() {
		return this._surface.format;
	}
	get depthFormat() {
		return this._surface.depthFormat;
	}
	get colorView() {
		return this._texture.view;
	}
	get depthView() {
		return this._depthView;
	}
	get frameId() {
		return this._surface.frameId;
	}
	resize(width, height) {
		width = Math.max(1, Math.floor(width));
		height = Math.max(1, Math.floor(height));
		if (width === this._physW && height === this._physH) return;
		this._destroyTextures();
		this._physW = width;
		this._physH = height;
		this._logicalW = width;
		this._logicalH = height;
		this._createTextures();
	}
	resizeToSurface(surface) {
		const s = surface ?? this._surface;
		this._logicalW = s.width;
		this._logicalH = s.height;
		const pw = s.physicalWidth;
		const ph = s.physicalHeight;
		if (pw === this._physW && ph === this._physH) return;
		this._destroyTextures();
		this._physW = pw;
		this._physH = ph;
		this._createTextures();
	}
	clear(options) {
		const c = options?.clearColor ?? {
			r: 0,
			g: 0,
			b: 0,
			a: 0
		};
		this.commandEncoder.beginRenderPass({
			colorAttachments: [{
				view: this.colorView,
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
	destroy() {
		this._destroyTextures();
	}
	_createTextures() {
		const gpu = this._surface.gpuDevice;
		const colorTex = gpu.createTexture({
			label: `${this._label}-color`,
			size: {
				width: this._physW,
				height: this._physH
			},
			format: this._surface.format,
			usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
		});
		this._texture = new Texture2D(colorTex, this._physW, this._physH);
		this._depthTexture = gpu.createTexture({
			label: `${this._label}-depth`,
			size: {
				width: this._physW,
				height: this._physH
			},
			format: this._surface.depthFormat,
			usage: GPUTextureUsage.RENDER_ATTACHMENT
		});
		this._depthView = this._depthTexture.createView();
	}
	_destroyTextures() {
		this._texture.destroy();
		this._depthTexture.destroy();
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
var UNIFORM_ALIGN = 256;
var MAX_UNIFORM_BATCHES = 16;
var SpriteBatch = class {
	_surface;
	_gpu;
	_maxSprites;
	_uniformBuffer;
	_quadVB;
	_quadIB;
	_instanceBuffer;
	_instanceData;
	_sortedData;
	_textures;
	_sortedTextures;
	_sortOrder;
	_depthKeys;
	_bindGroupLayout;
	_paramsBindGroupLayout;
	_pipelineLayout;
	_pipelineCache = /* @__PURE__ */ new Map();
	_shaderCache = /* @__PURE__ */ new Map();
	_samplerCache = /* @__PURE__ */ new Map();
	_uniformData = new Float32Array(20);
	_dummyParamsBuffer;
	_dummyParamsBindGroup;
	_paramsBuffer;
	_paramsData = new Float32Array(64);
	_begun = false;
	_spriteCount = 0;
	_bufferOffset = 0;
	_uniformBatchIndex = 0;
	_lastFrameId = -1;
	_sortMode = "deferred";
	_blend = BlendState.alphaBlend;
	_sampler = SamplerState.linearClamp;
	_effect = SpriteEffect.defaultTextured;
	_time = 0;
	_transform = null;
	_target;
	_effectParams = null;
	constructor(surface, options) {
		this._surface = surface;
		this._target = surface;
		this._gpu = surface.gpuDevice;
		this._maxSprites = options?.maxSprites ?? 1e4;
		this._uniformBuffer = this._gpu.createBuffer({
			label: "sb-uniform",
			size: MAX_UNIFORM_BATCHES * UNIFORM_ALIGN,
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
		const max = this._maxSprites;
		this._instanceData = new Float32Array(max * INSTANCE_FLOATS);
		this._sortedData = new Float32Array(max * INSTANCE_FLOATS);
		this._instanceBuffer = this._gpu.createBuffer({
			label: "sb-instances",
			size: this._instanceData.byteLength,
			usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
		});
		this._textures = new Array(max).fill(null);
		this._sortedTextures = new Array(max).fill(null);
		this._sortOrder = new Uint32Array(max);
		this._depthKeys = new Float32Array(max);
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
		this._paramsBindGroupLayout = this._gpu.createBindGroupLayout({
			label: "sb-params-bgl",
			entries: [{
				binding: 0,
				visibility: GPUShaderStage.FRAGMENT,
				buffer: { type: "uniform" }
			}]
		});
		this._pipelineLayout = this._gpu.createPipelineLayout({
			label: "sb-pl",
			bindGroupLayouts: [this._bindGroupLayout, this._paramsBindGroupLayout]
		});
		this._dummyParamsBuffer = this._gpu.createBuffer({
			label: "sb-params-dummy",
			size: 16,
			usage: GPUBufferUsage.UNIFORM
		});
		this._dummyParamsBindGroup = this._gpu.createBindGroup({
			layout: this._paramsBindGroupLayout,
			entries: [{
				binding: 0,
				resource: { buffer: this._dummyParamsBuffer }
			}]
		});
		this._paramsBuffer = this._gpu.createBuffer({
			label: "sb-params",
			size: 256,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
		});
	}
	begin(options) {
		if (this._begun) throw new Error("SpriteBatch.begin() called twice without end()");
		this._begun = true;
		this._spriteCount = 0;
		const fid = this._surface.frameId;
		if (fid !== this._lastFrameId) {
			this._lastFrameId = fid;
			this._bufferOffset = 0;
			this._uniformBatchIndex = 0;
		}
		this._sortMode = options?.sortMode ?? "deferred";
		this._blend = options?.blendState ?? BlendState.alphaBlend;
		this._sampler = options?.samplerState ?? SamplerState.linearClamp;
		this._effect = options?.effect ?? SpriteEffect.defaultTextured;
		this._time = options?.time ?? 0;
		this._transform = options?.transformMatrix ?? null;
		this._target = options?.target ?? this._surface;
		this._effectParams = options?.effectParams ?? null;
	}
	draw(texture, options) {
		if (!this._begun) throw new Error("draw() called without begin()");
		if (this._spriteCount >= this._maxSprites) return;
		const i = this._spriteCount++;
		const o = i * INSTANCE_FLOATS;
		const d = this._instanceData;
		const texW = texture.width;
		const texH = texture.height;
		let srcW, srcH;
		let u0, v0, u1, v1;
		if (options?.sourceRect) {
			const sr = options.sourceRect;
			srcW = sr.width;
			srcH = sr.height;
			u0 = sr.x / texW;
			v0 = sr.y / texH;
			u1 = (sr.x + srcW) / texW;
			v1 = (sr.y + srcH) / texH;
		} else {
			srcW = texW;
			srcH = texH;
			u0 = 0;
			v0 = 0;
			u1 = 1;
			v1 = 1;
		}
		if (options?.flip) {
			const flip = options.flip;
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
		}
		let px, py, dw, dh;
		if (options?.destinationRect) {
			const dr = options.destinationRect;
			px = dr.x;
			py = dr.y;
			dw = dr.width;
			dh = dr.height;
		} else {
			const scaleOpt = options?.scale;
			let sx, sy;
			if (typeof scaleOpt === "number") {
				sx = scaleOpt;
				sy = scaleOpt;
			} else if (scaleOpt) {
				sx = scaleOpt[0];
				sy = scaleOpt[1];
			} else {
				sx = 1;
				sy = 1;
			}
			dw = srcW * sx;
			dh = srcH * sy;
			const pos = options?.position;
			px = pos ? pos[0] : 0;
			py = pos ? pos[1] : 0;
		}
		let ox, oy;
		if (options?.origin) {
			ox = options.origin[0] * (dw / srcW);
			oy = options.origin[1] * (dh / srcH);
		} else {
			ox = 0;
			oy = 0;
		}
		const color = options?.color ?? Color.white;
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
		d[o + 12] = options?.layerDepth ?? 0;
		d[o + 13] = options?.rotation ?? 0;
		d[o + 14] = ox;
		d[o + 15] = oy;
		this._textures[i] = texture;
	}
	end() {
		if (!this._begun) throw new Error("end() called without begin()");
		this._begun = false;
		const count = this._spriteCount;
		if (count === 0) return;
		const ud = this._uniformData;
		ud[0] = this._target.width;
		ud[1] = this._target.height;
		ud[2] = this._time;
		ud[3] = 0;
		if (this._transform) ud.set(this._transform, 4);
		else {
			ud[4] = 1;
			ud[5] = 0;
			ud[6] = 0;
			ud[7] = 0;
			ud[8] = 0;
			ud[9] = 1;
			ud[10] = 0;
			ud[11] = 0;
			ud[12] = 0;
			ud[13] = 0;
			ud[14] = 1;
			ud[15] = 0;
			ud[16] = 0;
			ud[17] = 0;
			ud[18] = 0;
			ud[19] = 1;
		}
		this._gpu.queue.writeBuffer(this._uniformBuffer, this._uniformBatchIndex * UNIFORM_ALIGN, ud);
		const uniformOffset = this._uniformBatchIndex * UNIFORM_ALIGN;
		this._uniformBatchIndex++;
		const needsSort = this._sortMode !== "deferred";
		let uploadData;
		let texArray;
		const baseOffset = this._bufferOffset;
		if (needsSort) {
			this._buildSortOrder(count);
			this._applySort(count);
			uploadData = this._sortedData;
			texArray = this._sortedTextures;
		} else {
			uploadData = this._instanceData;
			texArray = this._textures;
		}
		this._gpu.queue.writeBuffer(this._instanceBuffer, baseOffset * INSTANCE_BYTES, uploadData.buffer, uploadData.byteOffset, count * INSTANCE_BYTES);
		this._bufferOffset += count;
		const effect = this._effect;
		let paramsBindGroup = this._dummyParamsBindGroup;
		if (effect.params) {
			const merged = this._effectParams ? {
				...effect.params.defaults,
				...this._effectParams
			} : effect.params.defaults;
			const packed = packParams(effect.params, merged, this._paramsData);
			this._gpu.queue.writeBuffer(this._paramsBuffer, 0, packed.buffer, packed.byteOffset, effect.params.size);
			paramsBindGroup = this._gpu.createBindGroup({
				layout: this._paramsBindGroupLayout,
				entries: [{
					binding: 0,
					resource: {
						buffer: this._paramsBuffer,
						size: effect.params.size
					}
				}]
			});
		}
		const sampler = this._getOrCreateSampler(this._sampler);
		const groups = this._findTextureGroups(texArray, count);
		const encoder = this._target.commandEncoder;
		if (effect.depthPrepass) {
			const depthPipeline = this._getOrCreatePipeline(true);
			const pass = encoder.beginRenderPass({
				colorAttachments: [],
				depthStencilAttachment: {
					view: this._target.depthView,
					depthClearValue: 1,
					depthLoadOp: "clear",
					depthStoreOp: "store"
				}
			});
			this._encodeGroups(pass, depthPipeline, sampler, groups, texArray, baseOffset, uniformOffset, paramsBindGroup);
			pass.end();
		}
		const colorPipeline = this._getOrCreatePipeline(false);
		const colorPass = encoder.beginRenderPass({
			colorAttachments: [{
				view: this._target.colorView,
				loadOp: "load",
				storeOp: "store"
			}],
			...effect.depthPrepass ? { depthStencilAttachment: {
				view: this._target.depthView,
				depthLoadOp: "load",
				depthStoreOp: "discard"
			} } : {}
		});
		this._encodeGroups(colorPass, colorPipeline, sampler, groups, texArray, baseOffset, uniformOffset, paramsBindGroup);
		colorPass.end();
	}
	_buildSortOrder(n) {
		const order = this._sortOrder;
		for (let i = 0; i < n; i++) order[i] = i;
		const d = this._instanceData;
		const textures = this._textures;
		switch (this._sortMode) {
			case "texture":
				this._radixSortByKey(order, n, (idx) => textures[idx].id);
				break;
			case "frontToBack": {
				const dk = this._depthKeys;
				for (let i = 0; i < n; i++) dk[i] = d[i * INSTANCE_FLOATS + 12];
				this._radixSortByKey(order, n, (idx) => dk[idx]);
				break;
			}
			case "backToFront": {
				const dk = this._depthKeys;
				for (let i = 0; i < n; i++) dk[i] = -d[i * INSTANCE_FLOATS + 12];
				this._radixSortByKey(order, n, (idx) => dk[idx]);
				break;
			}
		}
	}
	_radixSortByKey(order, n, key) {
		if (n <= 512) {
			new Uint32Array(order.buffer, order.byteOffset, n).sort((a, b) => key(a) - key(b));
			return;
		}
		new Uint32Array(order.buffer, order.byteOffset, n).sort((a, b) => key(a) - key(b));
	}
	_applySort(n) {
		const order = this._sortOrder;
		const src = this._instanceData;
		const dst = this._sortedData;
		const srcTex = this._textures;
		const dstTex = this._sortedTextures;
		for (let i = 0; i < n; i++) {
			const si = order[i];
			const srcOff = si * INSTANCE_FLOATS;
			const dstOff = i * INSTANCE_FLOATS;
			dst[dstOff] = src[srcOff];
			dst[dstOff + 1] = src[srcOff + 1];
			dst[dstOff + 2] = src[srcOff + 2];
			dst[dstOff + 3] = src[srcOff + 3];
			dst[dstOff + 4] = src[srcOff + 4];
			dst[dstOff + 5] = src[srcOff + 5];
			dst[dstOff + 6] = src[srcOff + 6];
			dst[dstOff + 7] = src[srcOff + 7];
			dst[dstOff + 8] = src[srcOff + 8];
			dst[dstOff + 9] = src[srcOff + 9];
			dst[dstOff + 10] = src[srcOff + 10];
			dst[dstOff + 11] = src[srcOff + 11];
			dst[dstOff + 12] = src[srcOff + 12];
			dst[dstOff + 13] = src[srcOff + 13];
			dst[dstOff + 14] = src[srcOff + 14];
			dst[dstOff + 15] = src[srcOff + 15];
			dstTex[i] = srcTex[si];
		}
	}
	_findTextureGroups(textures, count) {
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
	_encodeGroups(pass, pipeline, sampler, groups, textures, instanceOffset, uniformOffset, paramsBindGroup) {
		pass.setPipeline(pipeline);
		pass.setVertexBuffer(0, this._quadVB);
		pass.setVertexBuffer(1, this._instanceBuffer);
		pass.setIndexBuffer(this._quadIB, "uint16");
		pass.setBindGroup(1, paramsBindGroup);
		for (const g of groups) {
			const bg = this._gpu.createBindGroup({
				layout: this._bindGroupLayout,
				entries: [
					{
						binding: 0,
						resource: {
							buffer: this._uniformBuffer,
							offset: uniformOffset,
							size: 80
						}
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
		const fmt = this._target.format;
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
		const depthFmt = this._target.depthFormat;
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
//#region src/lib/SpriteAnimation.ts
var SpriteAnimation = class SpriteAnimation {
	_frames;
	_sequence;
	_frameDuration;
	_mode;
	_elapsed = 0;
	_index = 0;
	_direction = 1;
	_playing = true;
	_complete = false;
	speed = 1;
	constructor(frames, sequence, frameDuration, mode) {
		this._frames = frames;
		this._sequence = sequence;
		this._frameDuration = frameDuration;
		this._mode = mode;
	}
	static fromGrid(texture, options) {
		const { columns, rows, frameDuration, mode } = options;
		const fw = texture.width / columns;
		const fh = texture.height / rows;
		const total = options.frameCount ?? columns * rows;
		const frames = [];
		for (let i = 0; i < total; i++) {
			const col = i % columns;
			const row = Math.floor(i / columns);
			frames.push({
				x: col * fw,
				y: row * fh,
				width: fw,
				height: fh
			});
		}
		return new SpriteAnimation(frames, Array.from({ length: total }, (_, i) => i), frameDuration, mode ?? "loop");
	}
	static fromRects(rects, options) {
		return new SpriteAnimation(rects, Array.from({ length: rects.length }, (_, i) => i), options.frameDuration, options.mode ?? "loop");
	}
	slice(start, end, overrides) {
		const seq = [];
		for (let i = start; i < end; i++) seq.push(this._sequence[i]);
		return new SpriteAnimation(this._frames, seq, overrides?.frameDuration ?? this._frameDuration, overrides?.mode ?? this._mode);
	}
	pick(indices, overrides) {
		const seq = indices.map((i) => this._sequence[i]);
		return new SpriteAnimation(this._frames, seq, overrides?.frameDuration ?? this._frameDuration, overrides?.mode ?? this._mode);
	}
	update(dt) {
		if (!this._playing || this._complete) return;
		const len = this._sequence.length;
		if (len === 0) return;
		this._elapsed += dt * this.speed;
		while (this._elapsed >= this._frameDuration) {
			this._elapsed -= this._frameDuration;
			const next = this._index + this._direction;
			switch (this._mode) {
				case "loop":
					this._index = (next % len + len) % len;
					break;
				case "once":
					if (next >= len) {
						this._index = len - 1;
						this._complete = true;
						this._elapsed = 0;
						return;
					}
					this._index = next;
					break;
				case "pingPong":
					if (next >= len) {
						this._direction = -1;
						this._index = len - 2 >= 0 ? len - 2 : 0;
					} else if (next < 0) {
						this._direction = 1;
						this._index = 1 < len ? 1 : 0;
					} else this._index = next;
					break;
			}
		}
	}
	get currentFrame() {
		return this._frames[this._sequence[this._index]];
	}
	get frameIndex() {
		return this._index;
	}
	get frameCount() {
		return this._sequence.length;
	}
	get isComplete() {
		return this._complete;
	}
	get isPlaying() {
		return this._playing;
	}
	get mode() {
		return this._mode;
	}
	set mode(m) {
		this._mode = m;
		this._complete = false;
	}
	get frameDuration() {
		return this._frameDuration;
	}
	set frameDuration(v) {
		this._frameDuration = v;
	}
	play() {
		this._playing = true;
		if (this._complete) {
			this._complete = false;
			this._index = 0;
			this._direction = 1;
			this._elapsed = 0;
		}
	}
	pause() {
		this._playing = false;
	}
	reset() {
		this._index = 0;
		this._direction = 1;
		this._elapsed = 0;
		this._complete = false;
		this._playing = true;
	}
};
//#endregion
//#region src/lib/Camera2D.ts
var Camera2D = class {
	position = [0, 0];
	zoom = 1;
	rotation = 0;
	origin = [0, 0];
	_matrix = new Float32Array(16);
	getTransformMatrix() {
		const z = this.zoom;
		const r = this.rotation;
		const px = this.position[0];
		const py = this.position[1];
		const cx = this.origin[0];
		const cy = this.origin[1];
		const cos = Math.cos(r);
		const sin = Math.sin(r);
		const a = z * cos;
		const b = z * sin;
		const tx = -a * px + b * py + cx;
		const ty = -b * px - a * py + cy;
		const m = this._matrix;
		m[0] = a;
		m[1] = b;
		m[2] = 0;
		m[3] = 0;
		m[4] = -b;
		m[5] = a;
		m[6] = 0;
		m[7] = 0;
		m[8] = 0;
		m[9] = 0;
		m[10] = 1;
		m[11] = 0;
		m[12] = tx;
		m[13] = ty;
		m[14] = 0;
		m[15] = 1;
		return m;
	}
	lookAt(x, y) {
		this.position = [x, y];
	}
	screenToWorld(screenX, screenY) {
		const sx = screenX - this.origin[0];
		const sy = screenY - this.origin[1];
		const z = this.zoom;
		const r = this.rotation;
		const cos = Math.cos(-r);
		const sin = Math.sin(-r);
		const rx = (cos * sx - sin * sy) / z;
		const ry = (sin * sx + cos * sy) / z;
		return [rx + this.position[0], ry + this.position[1]];
	}
	worldToScreen(worldX, worldY) {
		const dx = worldX - this.position[0];
		const dy = worldY - this.position[1];
		const z = this.zoom;
		const r = this.rotation;
		const cos = Math.cos(r);
		const sin = Math.sin(r);
		return [z * (cos * dx - sin * dy) + this.origin[0], z * (sin * dx + cos * dy) + this.origin[1]];
	}
};
//#endregion
export { BlendState, Camera2D, Color, RenderSurface, RenderTexture2D, SamplerState, SpriteAnimation, SpriteBatch, SpriteEffect, Texture2D, buildParamsDescriptor, buildShaderSource, packParams };

//# sourceMappingURL=spritebatch.js.map