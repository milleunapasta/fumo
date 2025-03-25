// Valori di default da cambiare per la gestione del mouse
const FORZA_REPULSIONE = .2;
const LARGHEZZA_INFLUENZA_MOUSE = 100;



const initialTop = window.innerHeight / 2;
const initialLeft = window.innerWidth / 2;
const initialPosition = new THREE.Vector2(randomBetween(initialLeft - 50, initialLeft + 50), initialTop - 20);

let mouse = new THREE.Vector2(0, 0);

let prefix = 'https://raw.githubusercontent.com/milleunapasta/fumo/refs/heads/main/'


// Load a list of files in a given path. Executes `callback` upon completion with the map of file names to text as an argument
function loadFiles(path, fileNames, callback) {
    var files = new Map();
    var filesToLoad = fileNames.length;
    if (filesToLoad === 0) {
        callback(filesToLoad);
    }
    for (var i = 0; i < fileNames.length; i += 1) {
        var name = fileNames[i];
        var url = path + '/' + name;
        (function (fileName) {
            var fr = new XMLHttpRequest();
            fr.open("GET", url, true);
            fr.onreadystatechange = function () {
                if (fr.readyState === XMLHttpRequest.DONE) {
                    if (fr.status === 200 || fr.status === 0) {
                        files.set(fileName, fr.responseText);
                    }
                    filesToLoad -= 1;
                    if (filesToLoad === 0) {
                        callback(files);
                    }
                }
            }
            fr.send();
        })(name);
    }
}



function init(loadedFiles) {
    var renderer = new THREE.WebGLRenderer({ alpha: true, preserveDrawingBuffer: false });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0); // Imposta clear color con alfa 0
    renderer.setClearAlpha(0);
    document.body.appendChild(renderer.domElement);

    renderer.setSize(window.innerWidth, window.innerHeight); // Ensure size is set correctly

    // Ensure SlabOps and Colorizer are defined or imported
    if (typeof SlabOps === 'undefined') {
        console.error('SlabOps is not defined');
    }
    if (typeof Colorizer === 'undefined') {
        console.error('Colorizer is not defined');
    }

    var slabOp = new SlabOps(loadedFiles, renderer, 512, 256);
    var colorizer = new Colorizer(loadedFiles, Slab.camera, Slab.defaultGeometry);
    //var mouseHandler = new MouseHandler();

    var slabParams = {
        ink: 'Ink',
        advect: 'Velocity',
        velocity: 'Velocity',
        density: 'Density',
        temperature: 'Temperature',
        divergence: 'Divergence',
        pressure: 'Pressure'
    };
    var guiParams = {
        'Slab': slabParams.ink,
        'Radius': 10,
        inkGuiParams: {
            'Ink Color': '#5f5f5f'
        },
        temperatureGuiParams: {
            "Rel. Temp": 0.3,
            'Min. Color': '#007FFF',
            'Max. Color': '#5f5f5f'
        },
        densityGuiParams: {
            "Rel. Density": 0.1,
            'Min. Color': '#000000',
            'Max. Color': '#5f5f5f'
        }
    };
    /* if (!slabOp.velocity) {
        // Assicurati di passare width, height, lo shader (ad es. SLABOPS_SHADER_NAMES.advect) e le uniformi necessarie
        slabOp.velocity = {
            slab: new Slab(
                slabOp.slabSize.width,
                slabOp.slabSize.height,
                loadedFiles.get(SLABOPS_SHADER_NAMES.advect), // o un altro shader appropriato
                {
                    // Definisci qui le uniformi necessarie
                    gridSpec: { type: "v2", value: new THREE.Vector2(slabOp.slabSize.width, slabOp.slabSize.height) }
                    // ...altri uniformi...
                }
            )
        };
        console.log("Inizializzata slabOp.velocity");
    } */


    //var gui = new dat.GUI();
    //var slabController = gui.add(guiParams, "Slab", Object.values(slabParams));
    //gui.add(guiParams, "Radius", 1, 100, 1);
    //gui.addFolder("Ink").addColor(guiParams.inkGuiParams, 'Ink Color');

    /* var updateColorizer = function () {
        switch (slabController.getValue()) {
            case slabParams.ink:
                colorizer.setRange(0, 1);
                colorizer.renderFunction = renderer => colorizer.renderIdentity(renderer, slabOp.ink.slab);
                break;
            case slabParams.density:
                colorizer.setRange(-2, 2);
                colorizer.renderFunction = renderer => colorizer.renderScalarR(renderer, slabOp.buoyancy.slab);
                break;
        }
    };
    updateColorizer();
    slabController.onChange(updateColorizer); */

    colorizer.setRange(0, 1);
    colorizer.renderFunction = renderer => colorizer.renderIdentity(renderer, slabOp.ink.slab);

    // Definisci globalmente:
    let mouseX = -10;
    let mouseY = -10;

    window.addEventListener("mousemove", function (event) {
        mouseX = event.clientX;
        mouseY = event.clientY;
    });

    const FPS_LIMIT = 30; // Impostiamo il frame rate a 30 FPS
    let lastFrameTime = 0;
    
    function animate(timestamp) {
        // Calcoliamo il deltaTime
        const deltaTime = timestamp - lastFrameTime;
    
        if (deltaTime >= 1000 / FPS_LIMIT) {  // Se il tempo trascorso è maggiore del limite (in millisecondi)
            lastFrameTime = timestamp; // Aggiorniamo il timestamp dell'ultimo frame
    
            // Logica di animazione (così come nel tuo codice originale)
            slabOp.advect.slab.uniforms.velocity = {
                type: 't',
                value: slabOp.velocity.slab.state.texture
            };
    
            let splatPosition = new THREE.Vector2(
                randomBetween(window.innerWidth / 2 - 200, window.innerWidth / 2 + 200),
                window.innerHeight / 2 + 200
            );
            splatPosition.x /= window.innerWidth;
            splatPosition.y /= window.innerHeight;
            splatPosition.y = 1 - splatPosition.y;
    
            let radius = guiParams["Radius"] / 100;
            let inkColor = new THREE.Color(guiParams.inkGuiParams['Ink Color']);
    
            // Esegui prima gli splat per buoyancy ed ink standard…
            slabOp.splatSlab(
                slabOp.buoyancy.slab,
                splatPosition,
                new THREE.Vector3(guiParams.densityGuiParams['Rel. Density'], guiParams.temperatureGuiParams["Rel. Temp"], 0),
                radius
            );
    
            slabOp.splatSlab(
                slabOp.ink.slab,
                splatPosition,
                new THREE.Vector3(inkColor.r, inkColor.g, inkColor.b),
                radius
            );
    
            if (slabOp.velocity && slabOp.velocity.slab) {
                let mouseUV = new THREE.Vector2(mouseX / window.innerWidth, 1 - (mouseY / window.innerHeight));
                let influenceRadius = LARGHEZZA_INFLUENZA_MOUSE / window.innerWidth;
    
                // Applica multipli splat intorno al mouse per una repulsione radiale pura
                for (let i = 0; i < 10; i++) {
                    // Genera un offset casuale attorno al mouse
                    let angle = Math.random() * Math.PI * 2;
                    let offsetAmount = Math.random() * (influenceRadius / 2);
                    let offset = new THREE.Vector2(Math.cos(angle) * offsetAmount, Math.sin(angle) * offsetAmount);
                    let splatUV = new THREE.Vector2().addVectors(mouseUV, offset);
    
                    // Calcola la direzione radiale dal centro del mouse al punto splat
                    let dir = splatUV.clone().sub(mouseUV);
                    if (dir.length() !== 0) {
                        dir.normalize();
                    }
                    // Forza la componente verticale a zero per avere solo spinta laterale
                    dir.y = 0;
                    let force = new THREE.Vector3(dir.x, 0, 0).multiplyScalar(FORZA_REPULSIONE);
    
                    // Applica lo splat SOLO sul canale di velocity
                    slabOp.splatSlab(slabOp.buoyancy.slab, splatUV, force, influenceRadius);
                }
            }
    
            slabOp.step();
            colorizer.renderFunction(renderer);
        }
    
        requestAnimationFrame(animate); // Chiedi il prossimo frame
    }
    
    animate(performance.now()); // Avvia la prima animazione passando il timestamp iniziale

    function showRenderTarget(renderer, target) {
        const texture = target.texture || (target.state && target.state.texture);
        if (!texture) {
            console.warn("Il render target passato non ha una texture definita.");
            return;
        }
        const debugScene = new THREE.Scene();
        const debugCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        const debugMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: 1
        });
        const debugQuad = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), debugMaterial);
        debugScene.add(debugQuad);
        renderer.setViewport(0, 0, window.innerWidth / 4, window.innerHeight / 4);
        renderer.render(debugScene, debugCamera);
        renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
    }
}

function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
}

document.addEventListener("DOMContentLoaded", function () {
    loadFiles(prefix + 'shaders', SLABOPS_REQUIRED_SHADER_FILES.concat(COLOR_REQUIRED_SHADER_FILES), init);
});