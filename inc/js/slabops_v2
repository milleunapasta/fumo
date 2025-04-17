// slabops.js corretto per iOS e Desktop

// Funzione di check del supporto
function getSupportedTextureType(renderer) {
    const gl = renderer.getContext();
    if (gl.getExtension('OES_texture_float') && gl.getExtension('EXT_color_buffer_float')) {
        return THREE.FloatType;
    } else {
        return THREE.UnsignedByteType;
    }
}

// Slab class
function Slab(width, height, fs, uniforms, textureType) {
    this.uniforms = uniforms;
    this.state = new THREE.WebGLRenderTarget(width, height, {
        depthBuffer: false,
        stencilBuffer: false,
        format: THREE.RGBAFormat,
        type: textureType,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter
    });
    this.temp = this.state.clone();

    var geometry = new THREE.PlaneBufferGeometry(2 * (width - 2) / width, 2 * (height - 2) / height);
    var material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        fragmentShader: fs,
        depthWrite: false,
        depthTest: false,
        blending: THREE.NoBlending
    });

    this.scene = new THREE.Scene();
    this.scene.add(new THREE.Mesh(geometry, material));
}

// Slab camera e geometria di default
Slab.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
Slab.defaultGeometry = new THREE.PlaneBufferGeometry(2, 2);

// SlabOps Shader Names
var SLABOPS_SHADER_NAMES = {
    boundary: 'Boundary.fs',
    advect: 'Advection.fs',
    divergence: 'Divergence.fs',
    pressure: 'JacobiVectors.fs',
    gradient: 'Gradient.fs',
    splat: 'splat.fs',
    buoyancy: 'buoyancy.fs',
    copy: 'sampleRGB.fs'
};

var SLABOPS_REQUIRED_SHADER_FILES = Object.values(SLABOPS_SHADER_NAMES);

// SlabOps constructor
var SlabOps = function (shaderFiles, renderer, slabWidth, slabHeight) {
    this.renderer = renderer;
    this.slabSize = { width: slabWidth, height: slabHeight };
    this.gridScale = 1;
    this.numPressureIterations = 30;
    var gridSpecValue = new THREE.Vector2(slabWidth, slabHeight);

    const textureType = getSupportedTextureType(renderer);

    function createUniforms() {
        return {
            gridSpec: { type: "v2", value: gridSpecValue },
            gridScale: { type: "f", value: 1 }
        };
    }

    // Slab creation helper
    const createSlab = (shaderName, extraUniforms = {}) => new Slab(
        slabWidth,
        slabHeight,
        shaderFiles.get(shaderName),
        { ...createUniforms(), ...extraUniforms },
        textureType
    );

    this.boundary = { slab: createSlab(SLABOPS_SHADER_NAMES.boundary) };
    this.advect = { slab: createSlab(SLABOPS_SHADER_NAMES.advect) };
    this.divergence = { slab: createSlab(SLABOPS_SHADER_NAMES.divergence) };
    this.pressure = { slab: createSlab(SLABOPS_SHADER_NAMES.pressure) };
    this.gradient = { slab: createSlab(SLABOPS_SHADER_NAMES.gradient) };
    this.splat = { slab: createSlab(SLABOPS_SHADER_NAMES.splat) };
    this.buoyancy = { slab: createSlab(SLABOPS_SHADER_NAMES.buoyancy) };
    this.ink = { slab: createSlab(SLABOPS_SHADER_NAMES.copy) };

    this.velocity = new THREE.WebGLRenderTarget(slabWidth, slabHeight, {
        depthBuffer: false,
        stencilBuffer: false,
        format: THREE.RGBAFormat,
        type: textureType,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter
    });

    this.velocity.slab = createSlab(SLABOPS_SHADER_NAMES.advect);
};

// SlabOps methods
SlabOps.prototype = {
    constructor: SlabOps,

    step: function () {
        this.advectSlab(this.ink.slab);
        this.advectSlab(this.buoyancy.slab);
        this.advectSlab(this.advect.slab);
        this.buoySlab(this.advect.slab);
        this.projectSlab(this.advect.slab);
        this.velocitySlab(this.velocity.slab);
    },

    advectSlab: function (slab) {
        this.advect.slab.uniforms.velocity.value = this.advect.slab.state.texture;
        this.advect.slab.uniforms.advected.value = slab.state.texture;
        this.renderer.setRenderTarget(slab.temp);
        this.renderer.render(this.advect.slab.scene, Slab.camera);
        slab.swap();
    },

    buoySlab: function (slab) {
        this.buoyancy.slab.uniforms.v.value = slab.state.texture;
        this.buoyancy.slab.uniforms.b.value = this.buoyancy.slab.state.texture;
        this.renderer.setRenderTarget(slab.temp);
        this.renderer.render(this.buoyancy.slab.scene, Slab.camera);
        slab.swap();
    },

    projectSlab: function (slab) {
        this.divergence.slab.uniforms.w.value = slab.state.texture;
        this.renderer.setRenderTarget(this.divergence.slab.temp);
        this.renderer.render(this.divergence.slab.scene, Slab.camera);
        this.divergence.slab.swap();

        this.pressure.slab.uniforms.b.value = this.divergence.slab.state.texture;
        this.renderer.setRenderTarget(this.pressure.slab.state);
        this.renderer.clear();
        for (let i = 0; i < this.numPressureIterations; i++) {
            this.pressure.slab.uniforms.x.value = this.pressure.slab.state.texture;
            this.renderer.setRenderTarget(this.pressure.slab.temp);
            this.renderer.render(this.pressure.slab.scene, Slab.camera);
            this.pressure.slab.swap();
        }

        this.gradient.slab.uniforms.p.value = this.pressure.slab.state.texture;
        this.gradient.slab.uniforms.w.value = slab.state.texture;
        this.renderer.setRenderTarget(slab.temp);
        this.renderer.render(this.gradient.slab.scene, Slab.camera);
        slab.swap();
    },

    splatSlab: function (slab, uv, value, radius) {
        this.splat.slab.uniforms.center.value = new THREE.Vector2(this.slabSize.width * uv.x, this.slabSize.height * uv.y);
        this.splat.slab.uniforms.splatValue.value = value;
        this.splat.slab.uniforms.radii.value = new THREE.Vector2(radius * this.slabSize.width, radius * this.slabSize.height);
        this.splat.slab.uniforms.slab.value = slab.state.texture;
        this.renderer.setRenderTarget(slab.temp);
        this.renderer.render(this.splat.slab.scene, Slab.camera);
        slab.swap();
    },

    velocitySlab: function (slab) {
        this.advect.slab.uniforms.velocity.value = this.velocity.texture;
        this.advect.slab.uniforms.advected.value = this.velocity.slab.state.texture;
        this.renderer.setRenderTarget(slab.temp);
        this.renderer.render(this.advect.slab.scene, Slab.camera);
        slab.swap();
    }
};

