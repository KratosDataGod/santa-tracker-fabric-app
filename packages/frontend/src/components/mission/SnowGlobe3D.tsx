import { geoEquirectangular, geoPath } from 'd3-geo';
import type { Feature, MultiPolygon } from 'geojson';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import landTopology from 'world-atlas/land-110m.json';

import type { MissionState } from '@/mission/derive';
import { interpolateGreatCircle, subsolarPoint, type LatLon } from '@/mission/geo';
import type { SeasonData } from '@/mission/model';

const topology = landTopology as unknown as Topology<{ land: GeometryCollection }>;
const LAND = feature(topology, topology.objects.land) as unknown as Feature<MultiPolygon>;

const RAD = Math.PI / 180;

/** Latitude/longitude to a point on a sphere, matching an equirectangular texture. */
function toVector(p: LatLon, radius = 1): THREE.Vector3 {
  const phi = (90 - p.lat) * RAD;
  const theta = (p.lon + 180) * RAD;
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

/** Paints the Earth: deep winter oceans, evergreen land, snow toward the poles. */
function paintEarth(): THREE.CanvasTexture {
  const width = 2048;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const ocean = ctx.createLinearGradient(0, 0, 0, height);
  ocean.addColorStop(0, '#bfe3f7');
  ocean.addColorStop(0.12, '#2f7fb8');
  ocean.addColorStop(0.5, '#0f4f86');
  ocean.addColorStop(0.88, '#2f7fb8');
  ocean.addColorStop(1, '#d8eefb');
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, width, height);

  const projection = geoEquirectangular()
    .scale(width / (2 * Math.PI))
    .translate([width / 2, height / 2]);
  const path = geoPath(projection, ctx);
  ctx.beginPath();
  path(LAND);
  const land = ctx.createLinearGradient(0, 0, 0, height);
  land.addColorStop(0, '#ffffff');
  land.addColorStop(0.16, '#f2f8f4');
  land.addColorStop(0.3, '#3f9a62');
  land.addColorStop(0.5, '#2f8a4f');
  land.addColorStop(0.72, '#3f9a62');
  land.addColorStop(0.86, '#f2f8f4');
  land.addColorStop(1, '#ffffff');
  ctx.fillStyle = land;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 248, 232, 0.65)';
  ctx.lineWidth = 2;
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function radialSprite(inner: string, outer: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, inner);
  g.addColorStop(0.25, outer);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

function candyTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 8;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff8e8';
  ctx.fillRect(0, 0, 64, 8);
  ctx.fillStyle = '#e0162f';
  ctx.fillRect(0, 0, 32, 8);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Points along the flown route, lifted just off the surface. */
function routePoints(path: LatLon[], radius: number): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const steps = 14;
    for (let s = 0; s < steps; s++) {
      out.push(toVector(interpolateGreatCircle(path[i], path[i + 1], s / steps), radius));
    }
  }
  if (path.length > 0) out.push(toVector(path[path.length - 1], radius));
  return out;
}

const FRESNEL_VERTEX = `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }`;
const FRESNEL_FRAGMENT = `
  uniform vec3 uColor;
  uniform float uPower;
  uniform float uStrength;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float rim = pow(1.0 - abs(dot(vNormal, vView)), uPower);
    gl_FragColor = vec4(uColor, rim * uStrength);
  }`;

function fresnel(color: number, power: number, strength: number, side: THREE.Side) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uPower: { value: power },
      uStrength: { value: strength },
    },
    vertexShader: FRESNEL_VERTEX,
    fragmentShader: FRESNEL_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side,
  });
}

interface Props {
  data: SeasonData;
  state: MissionState;
  plaque: string;
  /** 0 shows the whole globe on its stand; 1 flies the camera in close. */
  zoom?: number;
  /** Let the mouse wheel zoom the globe. Off where the page needs to scroll past it. */
  wheelZoom?: boolean;
}

/**
 * The world as a lit, three-dimensional snow globe: real day and night,
 * city lights that switch on as gifts land, a candy-cane ribbon behind the
 * sleigh, snow swirling under the glass, and a lacquer-and-gold stand.
 */
export function SnowGlobe3D({ data, state, plaque, zoom = 0, wheelZoom = false }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const latest = useRef({ data, state, zoom, wheelZoom });
  useEffect(() => {
    latest.current = { data, state, zoom, wheelZoom };
  }, [data, state, zoom, wheelZoom]);
  // True while the viewer has turned the globe away from where the camera wants to be.
  const [turned, setTurned] = useState(false);
  const [hinted, setHinted] = useState(false);
  const recentre = useRef(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.setAttribute('aria-hidden', 'true');

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    camera.position.set(0, 0.25, 6.7);
    camera.lookAt(0, -0.17, 0);

    // --- Lighting: a cool moonlit fill, a warm practical from the village ---
    scene.add(new THREE.AmbientLight(0x6f8fd8, 0.55));
    const warm = new THREE.PointLight(0xffc878, 26, 12);
    warm.position.set(-2.6, -1.2, 3.2);
    scene.add(warm);
    const rimLight = new THREE.DirectionalLight(0x9fd0ff, 1.1);
    rimLight.position.set(3, 3, -2);
    scene.add(rimLight);

    // --- The globe group: tilt (latitude) containing spin (longitude) ---
    const tilt = new THREE.Group();
    const spin = new THREE.Group();
    tilt.add(spin);
    scene.add(tilt);

    const earthTexture = paintEarth();
    const earth = new THREE.Mesh(
      new THREE.SphereGeometry(1, 96, 96),
      new THREE.MeshStandardMaterial({ map: earthTexture, roughness: 0.78, metalness: 0.02 })
    );
    spin.add(earth);

    // The sun, fixed to the Earth so day and night fall where they really do.
    const sun = new THREE.DirectionalLight(0xfff1d6, 2.6);
    spin.add(sun);
    spin.add(sun.target);

    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.045, 64, 64),
      fresnel(0x7fd8ff, 2.4, 0.9, THREE.FrontSide)
    );
    scene.add(atmosphere);

    // --- Stops: tiny lights that glow gold once Santa has been ---
    const glowTexture = radialSprite('rgba(255,255,255,1)', 'rgba(255,214,120,0.85)');
    // One point cloud for every stop: a thousand lights in a single draw call.
    const stopCount = data.stops.length;
    const stopPositions = new Float32Array(stopCount * 3);
    const stopTints = new Float32Array(stopCount * 3);
    const stopSizes = new Float32Array(stopCount);
    data.stops.forEach((stop, i) => {
      const v = toVector(stop, 1.012);
      stopPositions.set([v.x, v.y, v.z], i * 3);
    });
    const stopGeometry = new THREE.BufferGeometry();
    stopGeometry.setAttribute('position', new THREE.BufferAttribute(stopPositions, 3));
    stopGeometry.setAttribute('tint', new THREE.BufferAttribute(stopTints, 3));
    stopGeometry.setAttribute('size', new THREE.BufferAttribute(stopSizes, 1));
    const stopMaterial = new THREE.ShaderMaterial({
      uniforms: { map: { value: glowTexture }, pixels: { value: 600 } },
      vertexShader: `
        attribute vec3 tint;
        attribute float size;
        uniform float pixels;
        varying vec3 vTint;
        void main() {
          vTint = tint;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * pixels * projectionMatrix[1][1] / -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform sampler2D map;
        varying vec3 vTint;
        void main() {
          vec4 glow = texture2D(map, gl_PointCoord);
          gl_FragColor = vec4(vTint * glow.rgb, 1.0) * glow.a;
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    spin.add(new THREE.Points(stopGeometry, stopMaterial));
    // The biggest deliveries get their own colour while they wait.
    const bigGiftsK = [...data.stops].map((stop) => stop.giftsK).sort((x, y) => y - x)[
      Math.floor(stopCount * 0.06)
    ] ?? Infinity;
    const TINT = {
      done: [1.0, 0.78, 0.35],
      soon: [1.0, 0.5, 0.14],
      big: [0.36, 0.78, 1.0],
      waiting: [0.62, 0.68, 0.82],
      mine: [0.55, 1.0, 0.6],
    };

    // --- The workshop: a pillar of light at the Pole ---
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.05, 0.42, 16, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xffe9a8,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
    beam.position.set(0, 1.2, 0);
    spin.add(beam);
    const poleGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: glowTexture, color: 0xffe9a8, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    poleGlow.position.set(0, 1.02, 0);
    poleGlow.scale.setScalar(0.3);
    spin.add(poleGlow);

    // --- The sleigh and its trail of sparks ---
    const sleighTexture = radialSprite('rgba(255,255,255,1)', 'rgba(255,60,80,0.95)');
    const sleigh = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: sleighTexture, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending })
    );
    sleigh.scale.setScalar(0.24);
    spin.add(sleigh);
    const SPARKS = 60;
    const sparkPositions = new Float32Array(SPARKS * 3);
    const sparkGeometry = new THREE.BufferGeometry();
    sparkGeometry.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
    const sparks = new THREE.Points(
      sparkGeometry,
      new THREE.PointsMaterial({
        map: glowTexture,
        color: 0xffd98a,
        size: 0.06,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    spin.add(sparks);
    let sparkIndex = 0;

    // --- Candy-cane ribbon along the flown route (rebuilt as it grows) ---
    const candy = candyTexture();
    const ribbonMaterial = new THREE.MeshStandardMaterial({
      map: candy,
      roughness: 0.35,
      emissive: 0x5a0a14,
      emissiveIntensity: 0.6,
    });
    let ribbon: THREE.Mesh | null = null;
    let ribbonKey = '';
    let ribbonBuiltAt = 0;
    const TAIL_STOPS = 45;
    const buildRibbon = (path: LatLon[], key: string) => {
      if (key === ribbonKey) return;
      ribbonKey = key;
      ribbonBuiltAt = performance.now();
      if (ribbon) {
        spin.remove(ribbon);
        ribbon.geometry.dispose();
        ribbon = null;
      }
      const points = routePoints(path, 1.018);
      if (points.length < 2) return;
      const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
      const geometry = new THREE.TubeGeometry(curve, Math.min(1400, points.length * 2), 0.0075, 6, false);
      candy.repeat.set(points.length / 1.6, 1);
      ribbon = new THREE.Mesh(geometry, ribbonMaterial);
      spin.add(ribbon);
    };

    // --- Glass dome ---
    const glass = new THREE.Mesh(
      new THREE.SphereGeometry(1.34, 64, 64),
      fresnel(0xeaf6ff, 3.2, 0.85, THREE.FrontSide)
    );
    scene.add(glass);
    const glint = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: radialSprite('rgba(255,255,255,0.9)', 'rgba(255,255,255,0.25)'), transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, opacity: 0.55 })
    );
    glint.position.set(-0.62, 0.78, 1.0);
    glint.scale.set(0.75, 0.38, 1);
    glint.material.rotation = 0.6;
    scene.add(glint);

    // --- Snow swirling inside the glass ---
    const FLAKES = 700;
    const flakeData = new Float32Array(FLAKES * 4);
    const flakePositions = new Float32Array(FLAKES * 3);
    for (let i = 0; i < FLAKES; i++) {
      flakeData[i * 4] = Math.random() * Math.PI * 2; // angle
      flakeData[i * 4 + 1] = 1.06 + Math.random() * 0.25; // radius
      flakeData[i * 4 + 2] = Math.random() * 2 - 1; // height
      flakeData[i * 4 + 3] = 0.04 + Math.random() * 0.1; // fall speed
    }
    const flakeGeometry = new THREE.BufferGeometry();
    flakeGeometry.setAttribute('position', new THREE.BufferAttribute(flakePositions, 3));
    const flakes = new THREE.Points(
      flakeGeometry,
      new THREE.PointsMaterial({
        map: radialSprite('rgba(255,255,255,1)', 'rgba(255,255,255,0.6)'),
        color: 0xffffff,
        size: 0.03,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      })
    );
    scene.add(flakes);

    // --- The stand: red lacquer, gold bands, snow on the rim ---
    const lacquer = new THREE.MeshPhysicalMaterial({ color: 0xa30f26, roughness: 0.22, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.08, side: THREE.DoubleSide });
    const gold = new THREE.MeshStandardMaterial({ color: 0xf2c460, roughness: 0.28, metalness: 0.95, emissive: 0x4a3008, emissiveIntensity: 0.5 });
    const profile = [
      [0.0, -1.08], [0.76, -1.08], [0.8, -1.12], [0.84, -1.2], [1.0, -1.42], [1.08, -1.56], [1.08, -1.66], [0.0, -1.66],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    const stand = new THREE.Mesh(new THREE.LatheGeometry(profile, 96), lacquer);
    scene.add(stand);
    const bandTop = new THREE.Mesh(new THREE.TorusGeometry(0.79, 0.035, 16, 96), gold);
    bandTop.rotation.x = Math.PI / 2;
    bandTop.position.y = -1.1;
    scene.add(bandTop);
    const bandFoot = new THREE.Mesh(new THREE.TorusGeometry(1.08, 0.045, 16, 96), gold);
    bandFoot.rotation.x = Math.PI / 2;
    bandFoot.position.y = -1.62;
    scene.add(bandFoot);
    const snowRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.72, 0.06, 12, 96),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 })
    );
    snowRim.rotation.x = Math.PI / 2;
    snowRim.position.y = -1.05;
    snowRim.scale.z = 0.6;
    scene.add(snowRim);

    // Engraved plaque
    const plaqueCanvas = document.createElement('canvas');
    plaqueCanvas.width = 512;
    plaqueCanvas.height = 128;
    const pctx = plaqueCanvas.getContext('2d')!;
    const pg = pctx.createLinearGradient(0, 0, 0, 128);
    pg.addColorStop(0, '#fff1c4');
    pg.addColorStop(0.5, '#e9b84e');
    pg.addColorStop(1, '#b9801c');
    pctx.fillStyle = pg;
    pctx.beginPath();
    pctx.roundRect(4, 4, 504, 120, 28);
    pctx.fill();
    pctx.strokeStyle = '#7a4e0c';
    pctx.lineWidth = 5;
    pctx.stroke();
    pctx.fillStyle = '#4a2c04';
    pctx.font = '700 62px "Playfair Display", Georgia, serif';
    pctx.textAlign = 'center';
    pctx.textBaseline = 'middle';
    pctx.fillText(plaque, 256, 68);
    const plaqueTexture = new THREE.CanvasTexture(plaqueCanvas);
    plaqueTexture.colorSpace = THREE.SRGBColorSpace;
    const plaqueMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.72, 0.18),
      new THREE.MeshBasicMaterial({ map: plaqueTexture, toneMapped: false })
    );
    plaqueMesh.position.set(0, -1.35, 0.97);
    plaqueMesh.rotation.x = -0.62;
    scene.add(plaqueMesh);

    // --- Sizing ---
    let baseDistance = 6.7;
    let zoomNow = 0;
    const resize = () => {
      const { clientWidth, clientHeight } = mount;
      if (clientWidth < 10 || clientHeight < 10) return;
      renderer.setSize(clientWidth, clientHeight, false);
      camera.aspect = clientWidth / clientHeight;
      // Keep the whole globe and stand in frame on narrow panels.
      baseDistance = camera.aspect < 0.95 ? 6.7 / Math.max(0.55, camera.aspect) : 6.7;
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(mount);

    // --- Drag to turn, pinch or wheel to zoom ------------------------------
    // The viewer's turn is an offset on top of the camera's own target, and it
    // eases back to zero a few seconds after they let go.
    const canvas = renderer.domElement;
    canvas.style.touchAction = 'none';
    canvas.style.cursor = 'grab';
    let userYaw = 0;
    let userPitch = 0;
    let userZoom = 0;
    let lastTouched = -Infinity;
    let isTurned = false;
    const pointers = new Map<number, { x: number; y: number }>();
    let pinch = 0;
    const touched = () => {
      lastTouched = performance.now();
      if (!isTurned) {
        isTurned = true;
        setTurned(true);
        setHinted(true);
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      canvas.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      canvas.style.cursor = 'grabbing';
      pinch = 0;
    };
    const onPointerMove = (event: PointerEvent) => {
      const before = pointers.get(event.pointerId);
      if (!before) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size === 1) {
        userYaw += (event.clientX - before.x) * 0.006;
        userPitch = Math.max(-1.4, Math.min(1.4, userPitch + (event.clientY - before.y) * 0.006));
        touched();
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const apart = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch > 0) userZoom = Math.max(-0.7, Math.min(0.7, userZoom + (apart - pinch) * 0.004));
        pinch = apart;
        touched();
      }
    };
    const onPointerUp = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      pinch = 0;
      if (pointers.size === 0) canvas.style.cursor = 'grab';
      lastTouched = performance.now();
    };
    const onWheel = (event: WheelEvent) => {
      if (!latest.current.wheelZoom) return;
      event.preventDefault();
      userZoom = Math.max(-0.7, Math.min(0.7, userZoom - event.deltaY * 0.0012));
      touched();
    };
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });

    // --- Animation ---
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    let frame = 0;
    let last = performance.now();
    let spinY = 0;
    let tiltX = 0.9;
    let started = false;
    const projected = new THREE.Vector3();

    const animate = (now: number) => {
      frame = requestAnimationFrame(animate);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const { data: season, state: mission, zoom: zoomWanted } = latest.current;
      const s = mission.sleigh;
      const airborne = s.status !== 'docked' && s.status !== 'home';

      // Fly the camera in toward the Earth when asked to zoom.
      zoomNow += (zoomWanted - zoomNow) * Math.min(1, dt * 1.6);
      const closeDistance = baseDistance * 0.44;
      // Let go for a few seconds (or press "Back to Santa") and the globe finds him again.
      if (recentre.current) {
        recentre.current = false;
        lastTouched = -Infinity;
      }
      if (pointers.size === 0 && now - lastTouched > 4000 && isTurned) {
        const back = Math.min(1, dt * 2.2);
        userYaw -= userYaw * back;
        userPitch -= userPitch * back;
        userZoom -= userZoom * back;
        if (Math.abs(userYaw) + Math.abs(userPitch) + Math.abs(userZoom) < 0.004) {
          userYaw = userPitch = userZoom = 0;
          isTurned = false;
          setTurned(false);
        }
      }
      const zoomEye = Math.max(-0.35, Math.min(1.08, zoomNow + userZoom));
      camera.position.set(0, 0.25 * (1 - zoomNow), baseDistance + (closeDistance - baseDistance) * zoomEye);
      camera.lookAt(0, -0.17 * (1 - zoomNow), 0);

      // Camera target: follow the sleigh, or orbit slowly above the Arctic.
      let targetY: number;
      let targetX: number;
      if (airborne) {
        targetY = -(s.position.lon + 90) * RAD;
        targetX = Math.max(-0.75, Math.min(1.05, s.position.lat * RAD * 0.9));
      } else {
        targetY = spinY + (reduced ? 0 : dt * 0.12);
        targetX = 0.98;
      }
      if (!started) {
        spinY = targetY;
        tiltX = targetX;
        started = true;
      }
      let dy = targetY - spinY;
      dy = ((((dy + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
      spinY += airborne ? dy * Math.min(1, dt * 3) : dy;
      tiltX += (targetX - tiltX) * Math.min(1, dt * 2.5);
      spin.rotation.y = spinY + userYaw;
      tilt.rotation.x = Math.max(-1.45, Math.min(1.5, tiltX + userPitch));

      // Real sun position for the moment on the mission clock.
      const sunAt = toVector(subsolarPoint(mission.time), 6);
      sun.position.copy(sunAt);

      // Stops
      stopMaterial.uniforms.pixels.value = renderer.domElement.height * 0.5;
      for (let i = 0; i < stopCount; i++) {
        const stop = season.stops[i];
        if (!stop) continue;
        const done =
          stop.seq <= s.stopsDone || (s.status === 'delivering' && s.target?.seq === stop.seq);
        const soon = !done && airborne && stop.arrival - mission.time < 3_600_000;
        const big = !done && stop.giftsK >= bigGiftsK;
        const tint = stop.personal ? TINT.mine : done ? TINT.done : soon ? TINT.soon : big ? TINT.big : TINT.waiting;
        stopTints.set(tint, i * 3);
        const pulse = soon ? 1 + 0.3 * Math.sin(now / 180 + i) : done ? 1 + 0.2 * Math.sin(now / 300 + i) : 1;
        stopSizes[i] = stop.personal
          ? 0.085 * (1 + 0.25 * Math.sin(now / 250))
          : (done ? 0.05 : soon ? 0.06 : big ? 0.05 : 0.026) * pulse;
      }
      stopGeometry.attributes.tint.needsUpdate = true;
      stopGeometry.attributes.size.needsUpdate = true;

      // Ribbon behind the sleigh: the last stretch of the route, like a comet's
      // tail. The gold lights show everywhere he has been.
      if (s.status === 'docked' || s.status === 'home') {
        buildRibbon([], 'none');
      } else if (now - ribbonBuiltAt > 120) {
        const from = Math.max(0, s.stopsDone - TAIL_STOPS);
        const done = season.stops.slice(from, s.stopsDone);
        const legStep = Math.round((s.position.lat + s.position.lon) / 3);
        const start = from === 0 ? [{ lat: 90, lon: 0 }] : [];
        buildRibbon([...start, ...done, s.position], `${s.stopsDone}:${s.status}:${legStep}`);
      }

      // Sleigh and sparks
      sleigh.visible = airborne;
      sparks.visible = airborne;
      if (airborne) {
        const height = 1.03 + Math.min(0.09, s.altitudeFt / 600_000);
        const position = toVector(s.position, height);
        sleigh.position.copy(position);
        sleigh.scale.setScalar(0.2 + 0.05 * Math.sin(now / 180));
        sparkPositions[sparkIndex * 3] = position.x + (Math.random() - 0.5) * 0.03;
        sparkPositions[sparkIndex * 3 + 1] = position.y + (Math.random() - 0.5) * 0.03;
        sparkPositions[sparkIndex * 3 + 2] = position.z + (Math.random() - 0.5) * 0.03;
        sparkIndex = (sparkIndex + 1) % SPARKS;
        sparkGeometry.attributes.position.needsUpdate = true;
      }

      beam.material.opacity = 0.4 + 0.2 * Math.sin(now / 500);

      // Up close, the glass and the stand step out of the shot.
      const far = 1 - zoomNow;
      glass.material.uniforms.uStrength.value = 0.85 * far;
      glint.material.opacity = 0.55 * far;
      flakes.material.opacity = 0.9 * far;
      const showStand = zoomNow < 0.5;
      stand.visible = bandTop.visible = bandFoot.visible = snowRim.visible = plaqueMesh.visible = showStand;

      // Snow
      if (!reduced) {
        for (let i = 0; i < FLAKES; i++) {
          const a = (flakeData[i * 4] += dt * 0.25);
          let y = flakeData[i * 4 + 2] - flakeData[i * 4 + 3] * dt;
          if (y < -1) y = 1;
          flakeData[i * 4 + 2] = y;
          const shell = flakeData[i * 4 + 1];
          const ring = Math.sqrt(Math.max(0.0001, shell * shell - y * y * 1.1));
          flakePositions[i * 3] = Math.cos(a) * ring;
          flakePositions[i * 3 + 1] = y * 1.02;
          flakePositions[i * 3 + 2] = Math.sin(a) * ring;
        }
        flakeGeometry.attributes.position.needsUpdate = true;
      }

      renderer.render(scene, camera);

      // Floating label for the next stop (or the workshop).
      const label = labelRef.current;
      if (label) {
        const anchor = airborne && s.target ? toVector(s.target, 1.05) : new THREE.Vector3(0, 1.45, 0);
        projected.copy(anchor);
        spin.localToWorld(projected);
        const facing = projected.z > 0.15 && zoomNow < 0.5;
        projected.project(camera);
        const text = airborne ? (s.target ? `Next: ${s.target.city}` : 'Heading home') : "Santa's Workshop";
        // (Hidden when zoomed in: the close-up map names the next stop.)
        if (label.textContent !== text) label.textContent = text;
        label.style.opacity = facing ? '1' : '0';
        label.style.transform = `translate(-50%, -140%) translate(${((projected.x + 1) / 2) * mount.clientWidth}px, ${((1 - projected.y) / 2) * mount.clientHeight}px)`;
      }
    };
    frame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        mesh.geometry?.dispose?.();
        const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(material)) material.forEach((m) => m.dispose());
        else material?.dispose?.();
      });
      [earthTexture, glowTexture, sleighTexture, candy, plaqueTexture].forEach((t) => t.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
    // The scene is built once per season; live values arrive through `latest`.
  }, [data.stops, plaque]);

  const sleigh = state.sleigh;
  const description =
    sleigh.status === 'docked'
      ? 'Snow globe of the Earth seen from above the Arctic. The sleigh is docked at the North Pole.'
      : sleigh.status === 'home'
        ? 'Snow globe of the Earth. The sleigh is home at the North Pole.'
        : `Snow globe of the Earth following the sleigh at latitude ${sleigh.position.lat.toFixed(1)}, longitude ${sleigh.position.lon.toFixed(1)}.`;

  return (
    <div className="relative h-full w-full">
      <div ref={mountRef} role="img" aria-label={description} className="absolute inset-0">
        <div
          ref={labelRef}
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 whitespace-nowrap rounded-full border border-gold/70 bg-black/60 px-300 py-100 text-200 font-bold text-snow transition-opacity"
        />
      </div>
      {!hinted && (
        <p className="globe-hint pointer-events-none absolute bottom-200 right-200 rounded-full bg-black/55 px-300 py-100 text-200 font-bold text-snow">
          Drag to turn the globe
        </p>
      )}
      {turned && (
        <button
          type="button"
          className="plaque absolute bottom-200 right-200 inline-flex h-9 items-center gap-200 !rounded-full px-400 text-200 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          onClick={() => {
            recentre.current = true;
          }}
        >
          {sleigh.status === 'docked' || sleigh.status === 'home' ? 'Back to the Pole' : 'Back to Santa'}
        </button>
      )}
    </div>
  );
}

export default SnowGlobe3D;
