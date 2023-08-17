import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
// physics
import * as CANNON from 'cannon';

// Animation loop
let previousTimestamp = 0; 


// Initialize the scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#bg') });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);

// Cannon.js setup
const world = new CANNON.World();
world.gravity.set(0, -5, 0); // Gravity

// Cannon.js collider for the player
const playerShape = new CANNON.Box(new CANNON.Vec3(1, 1, 1));
const playerBody = new CANNON.Body({ mass: 1 });
playerBody.addShape(playerShape);
playerBody.position.set(0, 5, 0);
world.addBody(playerBody);

// Cannon.js collider for the cube (box)
const cubeShape = new CANNON.Box(new CANNON.Vec3(1, 1, 1));
const cubeBody = new CANNON.Body({ mass: 0.00001 });
cubeBody.addShape(cubeShape);
cubeBody.position.set(0, 5, -5);
world.addBody(cubeBody);

// Cannon.js collider for the floor
const floorShape = new CANNON.Plane();
const floorBody = new CANNON.Body({ mass: 0 });
floorBody.addShape(floorShape);
floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
world.addBody(floorBody);

// Three.js visual floor setup
const gradientShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const gradientUniforms = {
  color1: { value: new THREE.Color(0xFfe400) },
  color2: { value: new THREE.Color(0xFfe400) },
};

const gradientMaterial = new THREE.ShaderMaterial({
  uniforms: gradientUniforms,
  vertexShader: gradientShader,
  fragmentShader: `
    uniform vec3 color1;
    uniform vec3 color2;
    varying vec2 vUv;
    void main() {
      gl_FragColor = vec4(mix(color1, color2, vUv.y), 1.0);
    }
  `,
});

// mobile controls
const mobileControls = document.getElementById('mobile-controls');
const mobileUpButton = document.getElementById('mobile-up');
const mobileDownButton = document.getElementById('mobile-down');
const mobileLeftButton = document.getElementById('mobile-left');
const mobileRightButton = document.getElementById('mobile-right');

function updateMobileControlsVisibility() {
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) { // Adjust this threshold as needed
    mobileControls.style.display = 'block';
  } else {
    mobileControls.style.display = 'none';
  }
}
updateMobileControlsVisibility();


// 

const floorGeometry = new THREE.PlaneGeometry(1000, 1000);
const floorMesh = new THREE.Mesh(floorGeometry, gradientMaterial);
floorMesh.rotation.x = -Math.PI / 2;
scene.add(floorMesh);

// Position the camera
camera.position.set(0, 10, 30);

// Create orbital controls
const controls = new OrbitControls(camera, renderer.domElement);

// Add ambient light
const ambientLight = new THREE.AmbientLight(0xffffff);
scene.add(ambientLight);

// Point light
const pointLight = new THREE.PointLight(0xffffff);
pointLight.position.set(5, 5, 5);
scene.add(pointLight);

// Light helper
const lightHelper = new THREE.PointLightHelper(pointLight);
scene.add(lightHelper);

// Add grid helper
const gridHelper = new THREE.GridHelper(200, 50);
scene.add(gridHelper);


// Load the 3D model
const loader = new GLTFLoader();
let player;
let mixer;
let isMoving = false;
let animationAction;

let cube; // Define the cube variable

// Skybox
const skybox = new THREE.TextureLoader().load('/assets/images/sky.jpeg');
scene.background = skybox;

// Load the model and start the animation loop
loadModel();
animate();

// Load the model function
function loadModel() {
  loader.load('./assets/robot_dog/scene.gltf', function (gltf) {
    player = gltf.scene;

    if (gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(player);
      animationAction = mixer.clipAction(gltf.animations[0]);
      animationAction.play();
    }

    scene.add(player);

    // Add a simple cube (box) to the scene for collision testing
    const cubeGeometry = new THREE.BoxGeometry(2, 2, 2);
    const cubeMaterial = new THREE.MeshBasicMaterial({ color: 0x2596be });
    cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    scene.add(cube);
  });
}

// Set up movement parameters
const moveSpeed = 15;
const rotationSpeed = 3;
const animationSpeedFactor = 3;
const moveDirection = new THREE.Vector3();
const front = new THREE.Vector3(0, 0, 1);
const right = new THREE.Vector3(1, 0, 0);

// Handle key press and release events
const keys = {};

document.addEventListener('keydown', (event) => {
  keys[event.key] = true;
  startOrResumeAnimation();
});

document.addEventListener('keyup', (event) => {
  keys[event.key] = false;
  if (!keys['ArrowUp'] && !keys['ArrowDown'] && !keys['w'] && !keys['W'] && !keys['s'] && !keys['S']) {
    pauseAnimation();
  }
});

// Start or resume the animation
function startOrResumeAnimation() {
  if (animationAction) {
    animationAction.paused = false;
    isMoving = true;
  }
}

// Pause the animation
function pauseAnimation() {
  if (animationAction) {
    animationAction.paused = true;
    isMoving = false;
  }
}

// Handle player movement
function handlePlayerMovement(deltaTime) {
  if (!player) return;

  moveDirection.set(0, 0, 0);

  if (keys['ArrowUp'] || keys['w'] || keys['W']) {
    moveDirection.add(front);
  }
  if (keys['ArrowDown'] || keys['s'] || keys['S']) {
    moveDirection.sub(front);
  }

  if (keys['a'] || keys['A']) {
    moveDirection.sub(right);
  }
  if (keys['d'] || keys['D']) {
    moveDirection.add(right);
  }

  if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
    player.rotation.y += rotationSpeed * deltaTime; // Apply rotation speed with deltaTime
  }
  if (keys['ArrowRight'] || keys['d'] || keys['D']) {
    player.rotation.y -= rotationSpeed * deltaTime; // Apply rotation speed with deltaTime
  }

  if (moveDirection.lengthSq() > 0) {
    startOrResumeAnimation();
  } else {
    pauseAnimation();
  }

  moveDirection.normalize().multiplyScalar(moveSpeed * deltaTime); // Apply moveSpeed with deltaTime
  moveDirection.applyQuaternion(player.quaternion);
  player.position.add(moveDirection);

  playerBody.position.copy(player.position);
}



  // Event listeners for mobile controls
  mobileUpButton.addEventListener('touchstart', () => {
    keys['ArrowUp'] = true;
    event.preventDefault();
    startOrResumeAnimation();
  });
  mobileUpButton.addEventListener('touchend', () => {
    keys['ArrowUp'] = false;
    event.preventDefault();
    pauseAnimation();
  });

mobileDownButton.addEventListener('touchstart', () => {
  keys['ArrowDown'] = true;
  event.preventDefault();
  startOrResumeAnimation();
});
mobileDownButton.addEventListener('touchend', () => {
  keys['ArrowDown'] = false;
  event.preventDefault();
  pauseAnimation();
});

mobileLeftButton.addEventListener('touchstart', () => {
  keys['a'] = true;
  event.preventDefault();
  startOrResumeAnimation();
});
mobileLeftButton.addEventListener('touchend', () => {
  keys['a'] = false;
  event.preventDefault();
  pauseAnimation();
});

mobileRightButton.addEventListener('touchstart', () => {
  keys['d'] = true;
  event.preventDefault();
  startOrResumeAnimation();
});
mobileRightButton.addEventListener('touchend', () => {
  keys['d'] = false;
  event.preventDefault();
  pauseAnimation();
});
    // 

    function onWindowResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener('resize', onWindowResize);
// Store the timestamp of the previous frame

// Animation loop
function animate(timestamp) {
  const deltaTime = (timestamp - previousTimestamp) / 1000; // Convert to seconds
  previousTimestamp = timestamp;

  requestAnimationFrame(animate);

  if (mixer) {
    mixer.update(0.01 * animationSpeedFactor);
  }
  controls.update();

  world.step(1 / 60);

  if (player && playerBody) {
    player.position.copy(playerBody.position);
  }

  if (cube) {
    cube.position.copy(cubeBody.position);
  }

  if (player) {
    const offset = new THREE.Vector3(0, 15, -13);
    const playerPos = player.position.clone().add(offset);
    camera.position.copy(playerPos);
    camera.lookAt(player.position);
  }

  handlePlayerMovement(deltaTime); // Pass deltaTime to the movement function
  renderer.render(scene, camera);
}
