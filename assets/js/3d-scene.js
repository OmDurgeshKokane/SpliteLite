export function init3DScene() {
    const container = document.getElementById('canvas-container');
    if (!container) return;

    // Scene Setup
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 5;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);


    // --- Procedural Textures ---
    function createCoinTexture(symbol) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // Gold Gradient Background
        const grad = ctx.createRadialGradient(256, 256, 10, 256, 256, 250);
        grad.addColorStop(0, '#FFD700');
        grad.addColorStop(0.5, '#DAA520');
        grad.addColorStop(1, '#B8860B');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 512);

        // Circular Grooves (Noise)
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 250; i += 3) {
            ctx.beginPath();
            ctx.arc(256, 256, i, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Inner Ring
        ctx.beginPath();
        ctx.arc(256, 256, 220, 0, Math.PI * 2);
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 5;
        ctx.stroke();

        // Symbol (Rupee)
        ctx.save();
        ctx.translate(256, 256);
        ctx.rotate(-Math.PI / 2); // Rotate counter-clockwise to align with cylinder UVs
        ctx.fillStyle = '#8B4513';
        ctx.font = 'bold 300px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(symbol, 0, 14);

        // Emboss Effect (Highlight)
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillText(symbol, -3, 11);
        ctx.restore();

        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }

    const coinTexture = createCoinTexture('₹');

    // --- Coin Construction ---
    const coinGroup = new THREE.Group();

    // 1. Main Cylinder (The Body)
    const geometry = new THREE.CylinderGeometry(2, 2, 0.2, 64);

    // Materials
    const materialSide = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        metalness: 0.9,
        roughness: 0.2
    });
    const materialFace = new THREE.MeshStandardMaterial({
        map: coinTexture,
        metalness: 0.8,
        roughness: 0.3,
        bumpMap: coinTexture,
        bumpScale: 0.05
    });

    const cylinder = new THREE.Mesh(geometry, [materialSide, materialFace, materialFace]);
    // Rotate cylinder to align faces with Z axis initially
    cylinder.rotation.x = Math.PI / 2;
    coinGroup.add(cylinder);

    // 2. The Rim (Torus)
    const rimGeo = new THREE.TorusGeometry(2, 0.1, 16, 64);
    const rimMat = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        metalness: 1.0,
        roughness: 0.1
    });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    coinGroup.add(rim);

    // Initial Rotation
    coinGroup.rotation.y = -Math.PI / 2; // Face camera
    scene.add(coinGroup);

    // --- Lighting ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 5, 10);
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0xffaa00, 1.5, 20);
    pointLight.position.set(-5, -5, 5);
    scene.add(pointLight);

    // --- Animation Loop ---
    let mouseX = 0;
    let mouseY = 0;

    function animate() {
        requestAnimationFrame(animate);

        // Constant spin
        coinGroup.rotation.y += 0.005;

        // Interactive tilt (subtle)
        // Target rotation based on mouse
        const targetX = (mouseY * 0.3);
        const targetZ = (mouseX * 0.3);

        // Smooth lerp
        coinGroup.rotation.x += (targetX - coinGroup.rotation.x) * 0.1;
        coinGroup.rotation.z += (targetZ - coinGroup.rotation.z) * 0.1;

        renderer.render(scene, camera);
    }
    animate();

    // Mouse Interaction
    document.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth) * 2 - 1;
        mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    // Resize Handler (Robust ResizeObserver)
    const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
            const { width, height } = entry.contentRect;
            // Prevent 0-size errors if hidden
            if (width === 0 || height === 0) return;

            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
        }
    });

    resizeObserver.observe(container);

    // Initial check (force trigger if needed, though observer usually fires once on connect)
    // No explicit call needed as observe() triggers initial callback in most browsers, 
    // but we leave standard setSize above for immediate render.
}
