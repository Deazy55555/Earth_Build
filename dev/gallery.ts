// Dev-only page: shows every toy model in a grid. Open /dev/gallery.html?only=giraffe,lion&cols=4
import * as THREE from 'three';
import { BUILDERS, buildModel } from '../src/models';

const params = new URLSearchParams(location.search);
const only = params.get('only')?.split(',');
const ids = Object.keys(BUILDERS).filter((id) => !only || only.includes(id));
const cols = Number(params.get('cols') ?? 8);
const rows = Math.ceil(ids.length / cols);

const W = innerWidth;
const H = innerHeight;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(W, H);
renderer.setPixelRatio(devicePixelRatio);
renderer.toneMapping = THREE.NeutralToneMapping;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#cfe6ff');
scene.add(new THREE.HemisphereLight('#eaf5ff', '#9a8cc4', 1.7));
const sun = new THREE.DirectionalLight('#fff4e0', 2.1);
sun.position.set(-3, 5, 6);
scene.add(sun);

const sp = 2.6;
const cam = new THREE.PerspectiveCamera(30, W / H, 0.1, 500);
const cx = ((cols - 1) * sp) / 2;
const cz = ((rows - 1) * sp) / 2;
cam.position.set(cx, Math.max(rows, cols) * 2.2, cz + Math.max(rows, cols) * 3.2);
cam.lookAt(cx, 0, cz);

const water = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshBasicMaterial({ color: '#7fb6e8', transparent: true, opacity: 0.35 }));
water.rotation.x = -Math.PI / 2;
water.position.y = 0.001;
scene.add(water);

ids.forEach((id, i) => {
  const m = buildModel(id);
  const x = (i % cols) * sp;
  const z = Math.floor(i / cols) * sp;
  m.position.set(x, 0, z);
  scene.add(m);
  const tag = document.createElement('div');
  tag.className = 'tag';
  tag.textContent = id;
  document.body.appendChild(tag);
  const p = new THREE.Vector3(x, 0, z + 0.9).project(cam);
  tag.style.left = `${(p.x * 0.5 + 0.5) * W}px`;
  tag.style.top = `${(-p.y * 0.5 + 0.5) * H}px`;
});

renderer.render(scene, cam);
(window as unknown as { galleryReady: boolean }).galleryReady = true;
