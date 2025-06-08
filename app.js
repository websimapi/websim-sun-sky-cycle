import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Sky } from 'three/addons/objects/Sky.js';

// Time state
let timeOfDay = 0.25; // Start at dawn
const timeSpeed = 0.00005; // Much slower speed of day/night cycle (was 0.0005)

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.5;
document.getElementById('container').appendChild(renderer.domElement);

// Camera position
camera.position.set(0, 2, 5);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 1;
controls.maxDistance = 100;

// Lighting
const ambientLight = new THREE.AmbientLight(0x404040, 0.1);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 500;
directionalLight.shadow.camera.left = -50;
directionalLight.shadow.camera.right = 50;
directionalLight.shadow.camera.top = 50;
directionalLight.shadow.camera.bottom = -50;
scene.add(directionalLight);

// Sky
const sky = new Sky();
sky.scale.setScalar(450);
scene.add(sky);

const skyUniforms = sky.material.uniforms;
skyUniforms['turbidity'].value = 10;
skyUniforms['rayleigh'].value = 2;
skyUniforms['mieCoefficient'].value = 0.005;
skyUniforms['mieDirectionalG'].value = 0.8;

// Sun
const sun = new THREE.Vector3();

// Moon
const moonGeometry = new THREE.SphereGeometry(2, 32, 32);
const moonMaterial = new THREE.MeshLambertMaterial({ 
    color: 0xffffff,
    emissive: 0x222222
});
const moon = new THREE.Mesh(moonGeometry, moonMaterial);
scene.add(moon);

// Moon light
const moonLight = new THREE.DirectionalLight(0x4444ff, 0);
moonLight.castShadow = true;
moonLight.shadow.mapSize.width = 1024;
moonLight.shadow.mapSize.height = 1024;
moonLight.shadow.camera.near = 0.5;
moonLight.shadow.camera.far = 500;
moonLight.shadow.camera.left = -50;
moonLight.shadow.camera.right = 50;
moonLight.shadow.camera.top = 50;
moonLight.shadow.camera.bottom = -50;
scene.add(moonLight);

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Update time
    timeOfDay += timeSpeed;
    if (timeOfDay > 1) timeOfDay = 0;
    
    // Update sun and lighting
    updateSunAndLighting();
    
    controls.update();
    renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Initialize
updateSunAndLighting();
animate();

function updateSunAndLighting() {
    // Calculate sun position based on time of day
    const elevation = Math.sin(timeOfDay * Math.PI * 2) * 90;
    const azimuth = timeOfDay * 360;
    
    const phi = THREE.MathUtils.degToRad(90 - elevation);
    const theta = THREE.MathUtils.degToRad(azimuth);
    
    sun.setFromSphericalCoords(1, phi, theta);
    skyUniforms['sunPosition'].value.copy(sun);
    
    // Update directional light
    directionalLight.position.set(sun.x * 100, sun.y * 100, sun.z * 100);
    
    // Calculate moon position (opposite to sun)
    const moonElevation = Math.sin((timeOfDay + 0.5) * Math.PI * 2) * 90;
    const moonAzimuth = (timeOfDay + 0.5) * 360;
    
    const moonPhi = THREE.MathUtils.degToRad(90 - moonElevation);
    const moonTheta = THREE.MathUtils.degToRad(moonAzimuth);
    
    const moonPos = new THREE.Vector3();
    moonPos.setFromSphericalCoords(200, moonPhi, moonTheta);
    moon.position.copy(moonPos);
    
    // Update moon light
    moonLight.position.set(moonPos.x, moonPos.y, moonPos.z);
    
    // Calculate lighting intensity based on sun elevation
    const sunHeight = Math.max(0, elevation / 90);
    const moonHeight = Math.max(0, moonElevation / 90);
    const isNight = elevation < 0;
    
    if (isNight) {
        // Night time - show moon
        directionalLight.intensity = 0.05;
        moonLight.intensity = moonHeight * 0.3;
        ambientLight.intensity = 0.02 + (moonHeight * 0.08);
        moon.material.emissive.setHex(0x111133);
        skyUniforms['turbidity'].value = 20;
        skyUniforms['rayleigh'].value = 1;
        renderer.toneMappingExposure = 0.05 + (moonHeight * 0.1);
    } else {
        // Day time - hide moon
        const dayIntensity = Math.pow(sunHeight, 0.5);
        directionalLight.intensity = dayIntensity * 3;
        moonLight.intensity = 0;
        ambientLight.intensity = 0.2 + (dayIntensity * 0.3);
        moon.material.emissive.setHex(0x000000);
        
        // Adjust sky parameters for different times of day
        if (sunHeight < 0.3) {
            // Dawn/dusk
            skyUniforms['turbidity'].value = 15;
            skyUniforms['rayleigh'].value = 3;
            renderer.toneMappingExposure = 0.3;
        } else {
            // Midday
            skyUniforms['turbidity'].value = 10;
            skyUniforms['rayleigh'].value = 2;
            renderer.toneMappingExposure = 0.5;
        }
    }
    
    // Color temperature changes
    const warmth = Math.max(0, 1 - sunHeight * 2);
    const coolness = Math.max(0, sunHeight - 0.5) * 2;
    
    if (isNight) {
        directionalLight.color.setRGB(0.2, 0.3, 0.6); // Cool moonlight
        moonLight.color.setRGB(0.6, 0.7, 1.0); // Cool moonlight
    } else if (warmth > 0) {
        directionalLight.color.setRGB(1.0, 0.7 + warmth * 0.3, 0.5 + warmth * 0.3); // Warm sunrise/sunset
    } else {
        directionalLight.color.setRGB(1.0, 0.95, 0.8 + coolness * 0.2); // Cool daylight
    }
}