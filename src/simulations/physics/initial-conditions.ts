import type { PhysicsParams } from '../../types';

type Vec3 = [number, number, number];

export interface PhysicsOrbitalBasis {
  bitangent: Vec3;
  normal: Vec3;
  tangent: Vec3;
}

export interface PhysicsInitialConditions {
  initData: Float32Array;
  orbitalBasis: PhysicsOrbitalBasis;
  totalStarMass: number;
}

function cross3(a: number[], b: number[]): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function normalize3(v: number[]): Vec3 {
  const m = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / m, v[1] / m, v[2] / m];
}

export function createPhysicsInitialConditions(count: number, params: PhysicsParams): PhysicsInitialConditions {
  const diskThickness = 0.2;
  const verticalDrift = 0.18;
  const haloMass = params.haloMass ?? 5.0;
  const haloScale = params.haloScale ?? 2.0;
  const diskMass = params.diskMass ?? 3.0;
  const diskScaleA = params.diskScaleA ?? 1.5;
  const diskScaleB = params.diskScaleB ?? 0.3;

  function darkMatterVcirc2(r: number): number {
    const r2 = r * r;
    const haloD2 = r2 + haloScale * haloScale;
    const v2halo = haloMass * r2 / (haloD2 * Math.sqrt(haloD2));
    const ab = diskScaleA + diskScaleB;
    const diskD2 = r2 + ab * ab;
    const v2disk = diskMass * r2 / (diskD2 * Math.sqrt(diskD2));
    return v2halo + v2disk;
  }

  const orbitalNormal = normalize3([0.18, 1.0, -0.12]);
  const orbitalTangent = normalize3(cross3([0, 1, 0], orbitalNormal));
  const orbitalBitangent = cross3(orbitalNormal, orbitalTangent);

  const initData = new Float32Array(count * 12);
  let totalStarMass = 0;
  const particleMass = 1.0 / count;

  for (let i = 0; i < count; i++) {
    const off = i * 12;
    let x: number;
    let y: number;
    let z: number;
    let vx = 0;
    let vy = 0;
    let vz = 0;
    let mass = particleMass;
    const tracerFraction = i / count;

    if (params.distribution === 'spiral') {
      const lambda = 5.0;
      const diskScale = 3.5;
      const haloFraction = 0.04;

      if (tracerFraction < haloFraction) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const haloRadius = 0.3 + Math.pow(Math.random(), 0.5) * 4.0;
        x = haloRadius * Math.sin(phi) * Math.cos(theta);
        y = haloRadius * Math.sin(phi) * Math.sin(theta);
        z = haloRadius * Math.cos(phi);
        const haloSpeed = 0.12 + Math.random() * 0.1;
        const radialDir = normalize3([x, y, z]);
        const tangentDir = normalize3(cross3(radialDir, [0.3, 1, -0.2]));
        vx = tangentDir[0] * haloSpeed;
        vy = tangentDir[1] * haloSpeed;
        vz = tangentDir[2] * haloSpeed;
        mass = 0.01 + Math.random() * 0.05;
      } else {
        const r = Math.exp(-lambda * Math.random()) * diskScale;
        const angle = Math.random() * Math.PI * 2;
        const intR = (-1 / lambda) * Math.exp(-lambda * r / diskScale) + (1 / lambda);
        const intMax = (-1 / lambda) * Math.exp(-lambda) + (1 / lambda);
        const massFraction = intR / intMax;
        const enclosedMass = massFraction * 1.0;
        const effectiveG = (params.G ?? 0.3) * 0.001;
        const vCirc = Math.sqrt(
          Math.max(0.001, effectiveG * enclosedMass / Math.max(r, 0.05) + darkMatterVcirc2(r))
        );

        const h = (Math.random() - 0.5) * (0.25 + r * 0.05);
        x = orbitalTangent[0] * Math.cos(angle) * r + orbitalBitangent[0] * Math.sin(angle) * r + orbitalNormal[0] * h;
        y = orbitalTangent[1] * Math.cos(angle) * r + orbitalBitangent[1] * Math.sin(angle) * r + orbitalNormal[1] * h;
        z = orbitalTangent[2] * Math.cos(angle) * r + orbitalBitangent[2] * Math.sin(angle) * r + orbitalNormal[2] * h;
        vx = (-Math.sin(angle) * orbitalTangent[0] + Math.cos(angle) * orbitalBitangent[0]) * vCirc;
        vy = (-Math.sin(angle) * orbitalTangent[1] + Math.cos(angle) * orbitalBitangent[1]) * vCirc;
        vz = (-Math.sin(angle) * orbitalTangent[2] + Math.cos(angle) * orbitalBitangent[2]) * vCirc;
        mass = Math.pow(Math.random(), 2.0) * 0.8;
      }
    } else if (params.distribution === 'disk') {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * 4.5;
      mass = Math.pow(Math.random(), 3.0) * 0.8;
      if (tracerFraction < 0.03) {
        const h = (Math.random() - 0.5) * diskThickness * 0.5;
        x = orbitalTangent[0] * Math.cos(angle) * r + orbitalBitangent[0] * Math.sin(angle) * r + orbitalNormal[0] * h;
        y = orbitalTangent[1] * Math.cos(angle) * r + orbitalBitangent[1] * Math.sin(angle) * r + orbitalNormal[1] * h;
        z = orbitalTangent[2] * Math.cos(angle) * r + orbitalBitangent[2] * Math.sin(angle) * r + orbitalNormal[2] * h;
        const speed = Math.sqrt(Math.max(0.001, darkMatterVcirc2(r)));
        vx = (Math.sin(angle) * orbitalTangent[0] - Math.cos(angle) * orbitalBitangent[0]) * speed;
        vy = (Math.sin(angle) * orbitalTangent[1] - Math.cos(angle) * orbitalBitangent[1]) * speed;
        vz = (Math.sin(angle) * orbitalTangent[2] - Math.cos(angle) * orbitalBitangent[2]) * speed;
        mass = 0.1 + Math.random() * 0.3;
      } else if (tracerFraction < 0.12) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const haloRadius = 0.5 + Math.sqrt(Math.random()) * 3.5;
        x = haloRadius * Math.sin(phi) * Math.cos(theta);
        y = haloRadius * Math.sin(phi) * Math.sin(theta);
        z = haloRadius * Math.cos(phi);
        const haloSpeed = 0.15 + Math.random() * 0.15;
        const radialDir = normalize3([x, y, z]);
        const tangentDir = normalize3(cross3(radialDir, [0.3, 1, -0.2]));
        vx = tangentDir[0] * haloSpeed;
        vy = tangentDir[1] * haloSpeed;
        vz = tangentDir[2] * haloSpeed;
        mass = 0.02 + Math.random() * 0.1;
      } else {
        const h = (Math.random() - 0.5) * diskThickness * (0.35 + r * 0.4);
        x = orbitalTangent[0] * Math.cos(angle) * r + orbitalBitangent[0] * Math.sin(angle) * r + orbitalNormal[0] * h;
        y = orbitalTangent[1] * Math.cos(angle) * r + orbitalBitangent[1] * Math.sin(angle) * r + orbitalNormal[1] * h;
        z = orbitalTangent[2] * Math.cos(angle) * r + orbitalBitangent[2] * Math.sin(angle) * r + orbitalNormal[2] * h;
        const speed = Math.sqrt(Math.max(0.001, darkMatterVcirc2(r)));
        vx = (-Math.sin(angle) * orbitalTangent[0] + Math.cos(angle) * orbitalBitangent[0]) * speed + orbitalNormal[0] * h * verticalDrift;
        vy = (-Math.sin(angle) * orbitalTangent[1] + Math.cos(angle) * orbitalBitangent[1]) * speed + orbitalNormal[1] * h * verticalDrift;
        vz = (-Math.sin(angle) * orbitalTangent[2] + Math.cos(angle) * orbitalBitangent[2]) * speed + orbitalNormal[2] * h * verticalDrift;
      }
    } else if (params.distribution === 'web') {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const shellRadius = 3.0 + (Math.random() - 0.5) * 1.5;
      x = shellRadius * Math.sin(phi) * Math.cos(theta);
      y = shellRadius * Math.sin(phi) * Math.sin(theta);
      z = shellRadius * Math.cos(phi);
      const gridSpacing = 2.5;
      const nx = Math.round(x / gridSpacing) * gridSpacing;
      const ny = Math.round(y / gridSpacing) * gridSpacing;
      const nz = Math.round(z / gridSpacing) * gridSpacing;
      const pull = 0.15 + Math.random() * 0.1;
      x += (nx - x) * pull;
      y += (ny - y) * pull;
      z += (nz - z) * pull;
      const radialDir = normalize3([x, y, z]);
      const infall = 0.02 + Math.random() * 0.03;
      vx = -radialDir[0] * infall;
      vy = -radialDir[1] * infall;
      vz = -radialDir[2] * infall;
      mass = Math.pow(Math.random(), 2.0) * 0.6;
    } else if (params.distribution === 'cluster') {
      const clumpCount = 5;
      const clumpIdx = i % clumpCount;
      const clumpAngle = (clumpIdx / clumpCount) * Math.PI * 2 + 0.7;
      const clumpRadius = 1.2 + clumpIdx * 0.3;
      const cx = Math.cos(clumpAngle) * clumpRadius;
      const cy = (clumpIdx - 2) * 0.4;
      const cz = Math.sin(clumpAngle) * clumpRadius;
      const u = Math.random();
      const pr = 0.6 * Math.pow(u, 0.33) / Math.pow(1 - u * u + 0.01, 0.25);
      const pointTheta = Math.random() * Math.PI * 2;
      const pointPhi = Math.acos(2 * Math.random() - 1);
      x = cx + pr * Math.sin(pointPhi) * Math.cos(pointTheta);
      y = cy + pr * Math.sin(pointPhi) * Math.sin(pointTheta);
      z = cz + pr * Math.cos(pointPhi);
      const orbitSpeed = 0.1 + Math.random() * 0.12;
      const radialDir = normalize3([x - cx, y - cy, z - cz]);
      const tangentDir = normalize3(cross3(radialDir, [0.2, 1.0, -0.3]));
      vx = tangentDir[0] * orbitSpeed;
      vy = tangentDir[1] * orbitSpeed;
      vz = tangentDir[2] * orbitSpeed;
      mass = Math.pow(Math.random(), 2.5) * 1.0;
    } else if (params.distribution === 'maelstrom') {
      const ringCount = 4;
      const ringIdx = i % ringCount;
      const ringRadius = 1.0 + ringIdx * 1.2 + (Math.random() - 0.5) * 0.4;
      const ringTilt = (ringIdx - 1.5) * 0.35;
      const ringNormal = normalize3([Math.sin(ringTilt * 1.3), Math.cos(ringTilt), Math.sin(ringTilt * 0.7)]);
      const ringTangent = normalize3(cross3([0, 1, 0], ringNormal));
      const ringBitangent = cross3(ringNormal, ringTangent);
      const angle = Math.random() * Math.PI * 2;
      const h = (Math.random() - 0.5) * 0.15;
      x = ringTangent[0] * Math.cos(angle) * ringRadius + ringBitangent[0] * Math.sin(angle) * ringRadius + ringNormal[0] * h;
      y = ringTangent[1] * Math.cos(angle) * ringRadius + ringBitangent[1] * Math.sin(angle) * ringRadius + ringNormal[1] * h;
      z = ringTangent[2] * Math.cos(angle) * ringRadius + ringBitangent[2] * Math.sin(angle) * ringRadius + ringNormal[2] * h;
      const spinDir = ringIdx % 2 === 0 ? 1 : -1;
      const speed = spinDir * (1.2 + ringIdx * 0.3) / Math.sqrt(ringRadius + 0.1);
      vx = (-Math.sin(angle) * ringTangent[0] + Math.cos(angle) * ringBitangent[0]) * speed;
      vy = (-Math.sin(angle) * ringTangent[1] + Math.cos(angle) * ringBitangent[1]) * speed;
      vz = (-Math.sin(angle) * ringTangent[2] + Math.cos(angle) * ringBitangent[2]) * speed;
      mass = Math.pow(Math.random(), 3.0) * 0.5;
    } else if (params.distribution === 'dust') {
      const span = 6.0;
      x = (Math.random() - 0.5) * span;
      y = (Math.random() - 0.5) * span;
      z = (Math.random() - 0.5) * span;
      const freq = 0.8;
      const amp = 0.08;
      vx = Math.sin(y * freq + 1.3) * Math.cos(z * freq + 0.7) * amp;
      vy = Math.sin(z * freq + 2.1) * Math.cos(x * freq + 1.1) * amp;
      vz = Math.sin(x * freq + 0.5) * Math.cos(y * freq + 2.5) * amp;
      mass = Math.pow(Math.random(), 4.0) * 0.4;
    } else if (params.distribution === 'binary') {
      const isSecond = Math.random() < 0.45;
      const diskRadius = Math.sqrt(Math.random()) * 2.2;
      const angle = Math.random() * Math.PI * 2;
      const tilt = isSecond ? 0.25 : -0.15;
      const diskNormal = normalize3([tilt, 1.0, tilt * 0.5]);
      const diskTangent = normalize3(cross3([0, 1, 0], diskNormal));
      const diskBitangent = cross3(diskNormal, diskTangent);
      const h = (Math.random() - 0.5) * 0.15;
      x = diskTangent[0] * Math.cos(angle) * diskRadius + diskBitangent[0] * Math.sin(angle) * diskRadius + diskNormal[0] * h + (isSecond ? 1.8 : -1.8);
      y = diskTangent[1] * Math.cos(angle) * diskRadius + diskBitangent[1] * Math.sin(angle) * diskRadius + diskNormal[1] * h + (isSecond ? 0.3 : -0.3);
      z = diskTangent[2] * Math.cos(angle) * diskRadius + diskBitangent[2] * Math.sin(angle) * diskRadius + diskNormal[2] * h;
      const diskSpeed = 0.7 / Math.sqrt(diskRadius + 0.15);
      const pairSpeed = isSecond ? 0.12 : -0.12;
      vx = (-Math.sin(angle) * diskTangent[0] + Math.cos(angle) * diskBitangent[0]) * diskSpeed + pairSpeed * 0.3;
      vy = (-Math.sin(angle) * diskTangent[1] + Math.cos(angle) * diskBitangent[1]) * diskSpeed;
      vz = (-Math.sin(angle) * diskTangent[2] + Math.cos(angle) * diskBitangent[2]) * diskSpeed + pairSpeed;
      if (Math.random() < 0.1) {
        const t = Math.random();
        x = -1.8 + t * 3.6 + (Math.random() - 0.5) * 0.8;
        y = -0.3 + t * 0.6 + (Math.random() - 0.5) * 0.5;
        z = (Math.random() - 0.5) * 0.6;
        vx = (Math.random() - 0.5) * 0.1;
        vy = (Math.random() - 0.5) * 0.05;
        vz = (Math.random() - 0.5) * 0.1;
      }
      mass = Math.pow(Math.random(), 2.5) * 0.7;
    } else if (params.distribution === 'shell') {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const shellRadius = 1.5 + Math.random() * 0.1;
      x = shellRadius * Math.sin(phi) * Math.cos(theta);
      y = shellRadius * Math.sin(phi) * Math.sin(theta);
      z = shellRadius * Math.cos(phi);
      const radialDir = normalize3([x, y, z]);
      const tangentDir = normalize3(cross3(radialDir, [0.3, 1, -0.2]));
      const bitangentDir = cross3(radialDir, tangentDir);
      const swirl = 0.18 + Math.random() * 0.08;
      vx = (tangentDir[0] + bitangentDir[0] * 0.35) * swirl;
      vy = (tangentDir[1] + bitangentDir[1] * 0.35) * swirl;
      vz = (tangentDir[2] + bitangentDir[2] * 0.35) * swirl;
      mass = Math.pow(Math.random(), 3.0) * 0.8;
    } else {
      x = (Math.random() - 0.5) * 4;
      y = (Math.random() - 0.5) * 4;
      z = (Math.random() - 0.5) * 4;
      vx = (Math.random() - 0.5) * 0.12;
      vy = (Math.random() - 0.5) * 0.12;
      vz = (Math.random() - 0.5) * 0.12;
      mass = Math.pow(Math.random(), 3.0) * 0.8;
    }

    initData[off] = x;
    initData[off + 1] = y;
    initData[off + 2] = z;
    initData[off + 3] = mass;
    initData[off + 4] = vx;
    initData[off + 5] = vy;
    initData[off + 6] = vz;
    initData[off + 8] = 0;
    initData[off + 9] = 0;
    initData[off + 10] = 0;
    totalStarMass += mass;
  }

  return {
    initData,
    orbitalBasis: {
      bitangent: orbitalBitangent,
      normal: orbitalNormal,
      tangent: orbitalTangent,
    },
    totalStarMass,
  };
}
