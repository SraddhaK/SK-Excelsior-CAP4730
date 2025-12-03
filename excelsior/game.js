//setup for threejs
const container = document.getElementById("container");
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.z = 180;

//rendering
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

const radius = 70;

//particle aterial for globe
const pointMaterial = new THREE.PointsMaterial({
    color: 0x66ccff,
    //super small and opaque particles for detail
    size: 0.5,
    opacity: 0.95,
    transparent: true,
    depthWrite: false,
});

//making the sphere!
const sphereParticles = (() => {
    const particleCount = 3500;
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
        const phi = Math.acos(2 * Math.random() - 1);
        const theta = 2 * Math.PI * Math.random();

        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi);

        positions.set([x, y, z], i * 3);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const points = new THREE.Points(geometry, pointMaterial);
    scene.add(points);
    return points;
})();

let countryParticles = null;

//making the countries based off of the image mask
const loader = new THREE.TextureLoader();
loader.load("landmask.png", (texture) => {
    texture.minFilter = THREE.LinearFilter;
    countryParticles = createCountryParticles(texture);
    scene.add(countryParticles);
});

//using texture to get particles
function createCountryParticles(landMaskTexture) {
    const canvas = document.createElement("canvas");
    canvas.width = landMaskTexture.image.width;
    canvas.height = landMaskTexture.image.height;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(landMaskTexture.image, 0, 0);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

    const positions = [];

    const targetCount = 47500;
let attempts = 0;

//math functions
while (positions.length < targetCount * 3 && attempts < targetCount * 20) {
    attempts++;

    const u = Math.random();
    const v = Math.random();

    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);

    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);

    const lat = 90 - (phi * 180 / Math.PI);
    const lon = (theta * 180 / Math.PI) - 180;

    const px = Math.floor(((lon + 180) / 360) * canvas.width);
    const py = Math.floor(((90 - lat) / 180) * canvas.height);

    const index = (py * canvas.width + px) * 4;
    const r = imgData[index];

    //makes land accurate
    if (r > 100) {
        positions.push(x, y, z);
    }
}

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3)
    );
    return new THREE.Points(geometry, pointMaterial);
}

//mouse interaction!
let mouseX = 0, mouseY = 0;

document.addEventListener("mousemove", (event) => {
    mouseX = (event.clientX - window.innerWidth / 2) * 0.002;
    mouseY = (event.clientY - window.innerHeight / 2) * 0.002;
});

//animating the globe
function animate() {
    requestAnimationFrame(animate);

    sphereParticles.rotation.y += 0.002;
    sphereParticles.rotation.x += mouseY * 0.01;
    sphereParticles.rotation.y += mouseX * 0.01;

    //let's hope this rotates the land WITH the globe
    if (countryParticles) {
        countryParticles.rotation.copy(sphereParticles.rotation);
    }

    renderer.render(scene, camera);
}

animate();

//resizinf
window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});


//atmospheric glow! inspired from a YT video, but did not use any code, so did not include
const atmosphereRadius = radius + 8;
const atmosphereMaterial = new THREE.ShaderMaterial({
    uniforms: {
    c: { value: 0.075 },
    p: { value: 0.75 },
    glowColor: { value: new THREE.Color(0x66ccff) }
},
    vertexShader: `
        varying vec3 vNormal;
        void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform float c;
        uniform float p;
        uniform vec3 glowColor;
        varying vec3 vNormal;

        void main() {
            float intensity = pow(c - dot(vNormal, vec3(0, 0, 1.0)), p);
            gl_FragColor = vec4(glowColor, intensity);
        }
    `,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    transparent: true
});

//atmosphere moves too!
const atmosphereGeometry = new THREE.SphereGeometry(atmosphereRadius, 128, 128);
const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
scene.add(atmosphere);
atmosphere.rotation.y = sphereParticles.rotation.y;