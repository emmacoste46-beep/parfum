import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const canvas = document.querySelector("#bottle-scene");
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 8.8);

scene.add(new THREE.HemisphereLight(0xffe0ca, 0x4d0714, 2.25));
const key = new THREE.DirectionalLight(0xfff0db, 4.6);
key.position.set(-3.6, 5.2, 5);
scene.add(key);
const rim = new THREE.DirectionalLight(0xff6870, 5.5);
rim.position.set(4.4, 1.5, -2.5);
scene.add(rim);
const low = new THREE.PointLight(0xffa385, 18, 12);
low.position.set(0, -2.6, 3.5);
scene.add(low);

const turntable = new THREE.Group();
scene.add(turntable);
let bottle = null;
let bottleBaseScale = 1;
let baseY = 0;
let scrollTarget = 0;
let scrollCurrent = 0;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
document.body.classList.add("motion-ready");

const panels = document.querySelectorAll(".panel");
const panelObserver = new IntersectionObserver((entries) => {
  for (const entry of entries) entry.target.classList.toggle("is-active", entry.isIntersecting);
}, { threshold: 0.18, rootMargin: "-18% 0px -18% 0px" });
panels.forEach((panel) => panelObserver.observe(panel));

function glassMaterial(color, roughness = 0.18, metalness = 0.22, transmission = 0.24) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness,
    metalness,
    transmission,
    thickness: 0.55,
    ior: 1.45,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    transparent: true,
    opacity: 0.94,
  });
}

function createFallbackBottle() {
  const fallback = new THREE.Group();
  const ruby = glassMaterial(0x68121c, 0.14, 0.18, 0.2);
  const darkRuby = new THREE.MeshPhysicalMaterial({ color: 0x400a12, roughness: 0.21, metalness: 0.14, clearcoat: 1 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd5a06b, metalness: 0.82, roughness: 0.24 });
  const label = new THREE.MeshStandardMaterial({ color: 0xf2daca, roughness: 0.7, metalness: 0.02 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.72, 2.55, 0.86, 8, 8, 2), ruby);
  body.position.y = -0.18;
  body.scale.set(1, 1, 0.92);
  fallback.add(body);

  const shoulders = new THREE.Mesh(new THREE.CylinderGeometry(0.49, 0.81, 0.43, 8, 1), ruby);
  shoulders.position.y = 1.28;
  shoulders.scale.z = 0.79;
  fallback.add(shoulders);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.34, 0.31, 32), gold);
  neck.position.y = 1.64;
  fallback.add(neck);

  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.39, 0.36, 0.69, 48, 1, false), darkRuby);
  cap.position.y = 2.11;
  fallback.add(cap);

  const capBand = new THREE.Mesh(new THREE.CylinderGeometry(0.365, 0.365, 0.07, 48), gold);
  capBand.position.y = 1.84;
  fallback.add(capBand);

  const frontLabel = new THREE.Mesh(new THREE.PlaneGeometry(1.27, 0.82), label);
  frontLabel.position.set(0, -0.26, 0.438);
  fallback.add(frontLabel);

  const labelText = makeLabelTexture();
  const frontPrint = new THREE.Mesh(new THREE.PlaneGeometry(1.12, 0.58), new THREE.MeshBasicMaterial({ map: labelText, transparent: true, toneMapped: false, depthWrite: false }));
  frontPrint.position.set(0, -0.26, 0.447);
  fallback.add(frontPrint);

  const foot = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.09, 0.79), gold);
  foot.position.y = -1.47;
  fallback.add(foot);
  return fallback;
}

function makeLabelTexture() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#f2daca";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.textAlign = "center";
  ctx.fillStyle = "#6e1220";
  ctx.font = "italic 84px Georgia";
  ctx.fillText("Amora", 256, 121);
  ctx.font = "22px monospace";
  ctx.fillText("EAU DE PARFUM", 256, 172);
  ctx.font = "16px monospace";
  ctx.fillText("PARIS · 2026", 256, 204);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function centerAndScale(root) {
  const bounds = new THREE.Box3().setFromObject(root);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  root.position.sub(center);
  const scale = 3.55 / Math.max(size.x, size.y, size.z);
  bottleBaseScale = scale;
  root.scale.setScalar(scale);
  return root;
}

function setBottle(root) {
  bottle = centerAndScale(root);
  turntable.clear();
  turntable.add(bottle);
  document.body.classList.add("three-ready");
  baseY = window.innerWidth < 760 ? -0.28 : 0;
  fitBottle();
}

const loader = new GLTFLoader();
loader.load(
  "./assets/parfum.glb",
  (gltf) => setBottle(gltf.scene),
  undefined,
  () => setBottle(createFallbackBottle()),
);

function fitBottle() {
  if (!bottle) return;
  const mobile = window.innerWidth < 760;
  const x = mobile ? 0.64 : 1.8;
  const y = mobile ? -0.45 : 0.02;
  const scale = mobile ? 0.88 : 1;
  bottle.scale.setScalar(bottleBaseScale * scale);
  turntable.position.set(x, y + baseY, 0);
}

function updateScroll() {
  const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  scrollTarget = window.scrollY / max;
  const progress = document.querySelector(".scroll-progress span");
  progress.style.height = `${scrollTarget * 100}%`;
}

window.addEventListener("scroll", updateScroll, { passive: true });
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  fitBottle();
  updateScroll();
});
updateScroll();

const clock = new THREE.Clock();
function render() {
  requestAnimationFrame(render);
  const t = clock.getElapsedTime();
  scrollCurrent += (scrollTarget - scrollCurrent) * (reducedMotion ? 1 : 0.075);
  turntable.rotation.y = scrollCurrent * Math.PI * 2.4 + (reducedMotion ? 0 : Math.sin(t * 0.28) * 0.035);
  turntable.rotation.x = (scrollCurrent - 0.5) * 0.075;
  turntable.position.y = (window.innerWidth < 760 ? -0.45 : 0.02) + (reducedMotion ? 0 : Math.sin(t * 0.7) * 0.045);
  renderer.render(scene, camera);
}
render();
