'use strict';

(() => {
  const canvas = document.getElementById('world');
  const ctx = canvas.getContext('2d');
  const mapCanvas = document.getElementById('minimap');
  const mapCtx = mapCanvas.getContext('2d');

  const ui = {
    intro: document.getElementById('intro'),
    start: document.getElementById('start-button'),
    dialogue: document.getElementById('dialogue'),
    speaker: document.getElementById('speaker-name'),
    speakerLabel: document.getElementById('speaker-label'),
    avatar: document.getElementById('speaker-avatar'),
    text: document.getElementById('dialogue-text'),
    choices: document.getElementById('dialogue-choices'),
    dialogueFooter: document.getElementById('dialogue-footer'),
    chapter: document.getElementById('dialogue-chapter'),
    missionTitle: document.getElementById('mission-title'),
    missionDescription: document.getElementById('mission-description'),
    objective: document.getElementById('objective-text'),
    chapterNumber: document.getElementById('chapter-number'),
    progressBar: document.getElementById('progress-bar'),
    progressPercent: document.getElementById('progress-percent'),
    progressCaption: document.getElementById('progress-caption'),
    interaction: document.getElementById('interaction-hint'),
    interactionName: document.getElementById('interaction-name'),
    location: document.getElementById('location-name'),
    journal: document.getElementById('journal'),
    journalEntries: document.getElementById('journal-entries'),
    courageScore: document.getElementById('courage-score'),
    connectionScore: document.getElementById('connection-score'),
    journalButton: document.getElementById('journal-button'),
    journalClose: document.getElementById('journal-close'),
    toast: document.getElementById('toast'),
  };

  const player = { x: 0, z: 17, heading: 0, speed: 4.5 };
  const keys = new Set();
  const faces = [];
  const world = { min: -27, max: 27 };
  const camera = { yaw: 0, pitch: 0.19 };
  const entries = [];
  const cast = [
    { id: 'nila', name: 'Nila', role: 'FELLOW FRESHER', x: -2.8, z: -1.5, color: '#cf9175', hair: '#382b29', accent: '#e5c478', heading: Math.PI },
    { id: 'dev', name: 'Dev', role: 'STUDENT COUNCIL', x: 9, z: -12, color: '#7fa38f', hair: '#302a27', accent: '#d3eb81', heading: 0.4 },
    { id: 'librarian', name: 'Mr. Kumar', role: 'CAMPUS LIBRARIAN', x: -11.1, z: -1.5, color: '#788ea6', hair: '#3a3933', accent: '#cfac6d', heading: -0.5 },
  ];

  const chapters = [
    { title: 'A face in the crowd', description: 'Somewhere beyond the gate, your first college friend is waiting to happen.', objective: 'Meet Nila at the central quad', target: () => cast[0], caption: 'YOUR FIRST DAY' },
    { title: 'Little things matter', description: 'A missing poster. A big afternoon. The best stories start with a small yes.', objective: 'Check the notice board', target: { x: 11, z: -7.5 }, caption: 'THE KIND THING' },
    { title: 'A helping hand', description: 'The campus feels smaller when you learn someone’s name.', objective: 'Find Dev at the Student Activity Centre', target: () => cast[1], caption: 'MAKING CONNECTIONS' },
    { title: 'Find your people', description: 'You made it this far together. Bring the good news back to Nila.', objective: 'Meet Nila at the central quad', target: () => cast[0], caption: 'YOUR FIRST FRIEND' },
    { title: 'Your story, from here', description: 'One day down. A whole campus of tomorrows to discover.', objective: 'Take a walk around campus', target: null, caption: 'DAY ONE · COMPLETE' },
  ];

  const buildings = [
    { x: -16, z: -15, w: 12, d: 8, h: 5.2, name: 'MAIN ACADEMIC BLOCK', wall: '#d9c4a0', roof: '#936a50', trim: '#ead8b4' },
    { x: -17, z: -3.2, w: 9, d: 8, h: 5, name: 'CENTRAL LIBRARY', wall: '#d8d0b4', roof: '#73816c', trim: '#ece6d0' },
    { x: 15, z: 2, w: 10, d: 8, h: 4.3, name: 'SIT CANTEEN', wall: '#d7ae7d', roof: '#925d47', trim: '#f0d7a8' },
    { x: -16, z: 15, w: 11, d: 8, h: 4.5, name: "BOYS' HOSTEL", wall: '#d4c29b', roof: '#768268', trim: '#eaddbb' },
    { x: 16, z: -14, w: 10, d: 8, h: 5, name: 'STUDENT ACTIVITY CENTRE', wall: '#dcc6a1', roof: '#895c47', trim: '#eee1c5' },
    { x: 1, z: -24, w: 14, d: 5, h: 4.5, name: 'SIT AUDITORIUM', wall: '#d2b88f', roof: '#867253', trim: '#ead4a9' },
    { x: 20, z: 15, w: 8, d: 8, h: 4.5, name: "GIRLS' HOSTEL", wall: '#d7c6a9', roof: '#8b7661', trim: '#ede0c5' },
  ];

  const obstacles = buildings.map(({ x, z, w, d }) => ({ x, z, w: w + 0.5, d: d + 0.5 }));
  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let lastFrame = 0;
  let toastTimer = 0;
  let toastHideTimer = 0;
  let dialogueState = null;
  let nearby = null;
  let started = false;
  let journalOpen = false;
  let mouseX = null;
  let stage = 0;
  let courage = 0;
  let connection = 0;

  function hexShade(hex, amount) {
    const raw = hex.replace('#', '');
    const value = parseInt(raw.length === 3 ? raw.split('').map((part) => part + part).join('') : raw, 16);
    const red = Math.min(255, Math.max(0, (value >> 16) + amount));
    const green = Math.min(255, Math.max(0, ((value >> 8) & 255) + amount));
    const blue = Math.min(255, Math.max(0, (value & 255) + amount));
    return `rgb(${red}, ${green}, ${blue})`;
  }

  function addFace(points, color, outline = null, targetFaces = faces) {
    targetFaces.push({ points, color, outline });
  }

  function boxFaces(x, y, z, w, h, d, color, yaw = 0, topColor = null, targetFaces = faces) {
    const local = [
      [-w / 2, 0, -d / 2], [w / 2, 0, -d / 2], [w / 2, 0, d / 2], [-w / 2, 0, d / 2],
      [-w / 2, h, -d / 2], [w / 2, h, -d / 2], [w / 2, h, d / 2], [-w / 2, h, d / 2],
    ];
    const vertices = local.map(([lx, ly, lz]) => ({
      x: x + lx * Math.cos(yaw) + lz * Math.sin(yaw),
      y: y + ly,
      z: z - lx * Math.sin(yaw) + lz * Math.cos(yaw),
    }));
    [
      [[0, 3, 2, 1], hexShade(color, -30)],
      [[4, 5, 6, 7], topColor || hexShade(color, 19)],
      [[0, 1, 5, 4], hexShade(color, -12)],
      [[1, 2, 6, 5], hexShade(color, -26)],
      [[2, 3, 7, 6], hexShade(color, -6)],
      [[3, 0, 4, 7], color],
    ].forEach(([indices, shade]) => addFace(indices.map((index) => vertices[index]), shade, null, targetFaces));
  }

  function circleFace(x, y, z, radius, color, segments = 12, targetFaces = faces) {
    const points = [];
    for (let index = 0; index < segments; index += 1) {
      const angle = (index / segments) * Math.PI * 2;
      points.push({ x: x + Math.cos(angle) * radius, y, z: z + Math.sin(angle) * radius });
    }
    addFace(points, color, null, targetFaces);
  }

  function createBuilding(building) {
    const { x, z, w, d, h, wall, roof, trim } = building;
    boxFaces(x, 0, z, w, h, d, wall);
    const roofBase = h + 0.05;
    addFace([
      { x: x - w / 2 - 0.45, y: roofBase, z: z - d / 2 - 0.45 },
      { x: x + w / 2 + 0.45, y: roofBase, z: z - d / 2 - 0.45 },
      { x: x, y: roofBase + 2.3, z: z - d / 2 },
    ], hexShade(roof, 7));
    addFace([
      { x: x + w / 2 + 0.45, y: roofBase, z: z - d / 2 - 0.45 },
      { x: x + w / 2 + 0.45, y: roofBase, z: z + d / 2 + 0.45 },
      { x: x, y: roofBase + 2.3, z: z - d / 2 },
    ], hexShade(roof, -15));
    addFace([
      { x: x + w / 2 + 0.45, y: roofBase, z: z + d / 2 + 0.45 },
      { x: x - w / 2 - 0.45, y: roofBase, z: z + d / 2 + 0.45 },
      { x: x, y: roofBase + 2.3, z: z - d / 2 },
    ], hexShade(roof, -6));
    addFace([
      { x: x - w / 2 - 0.45, y: roofBase, z: z + d / 2 + 0.45 },
      { x: x - w / 2 - 0.45, y: roofBase, z: z - d / 2 - 0.45 },
      { x: x, y: roofBase + 2.3, z: z - d / 2 },
    ], roof);
    for (let windowX = x - w / 2 + 1.15; windowX < x + w / 2 - 0.4; windowX += 2.1) {
      for (let windowY = 1.45; windowY < h - 0.4; windowY += 1.65) {
        boxFaces(windowX, windowY, z + d / 2 + 0.035, 0.82, 0.74, 0.1, '#758879');
        boxFaces(windowX, windowY + 0.37, z + d / 2 + 0.09, 0.86, 0.045, 0.1, trim);
        boxFaces(windowX, windowY + 0.32, z + d / 2 + 0.09, 0.04, 0.64, 0.1, trim);
      }
    }
    boxFaces(x, 0, z + d / 2 + 0.055, 1.05, 2, 0.12, '#7f6148');
    boxFaces(x, 1.55, z + d / 2 + 0.13, 1.5, 0.28, 0.14, '#e6d8b8');
    addFace([
      { x: x - 0.67, y: 1.65, z: z + d / 2 + 0.22 },
      { x: x + 0.67, y: 1.65, z: z + d / 2 + 0.22 },
      { x: x + 0.67, y: 1.85, z: z + d / 2 + 0.22 },
      { x: x - 0.67, y: 1.85, z: z + d / 2 + 0.22 },
    ], '#544d3d');
    building.sign = { x, y: h + 2.75, z: z - d / 2 };
  }

  function createTree(x, z, scale = 1) {
    const trunkHeight = 1.55 * scale;
    circleFace(x, 0.02, z, 0.63 * scale, 'rgb(38, 48, 34)');
    boxFaces(x, 0, z, 0.33 * scale, trunkHeight, 0.33 * scale, '#77543a');
    [
      [trunkHeight, 1.4 * scale, 2.25 * scale, '#637a50'],
      [trunkHeight + 1.0 * scale, 1.15 * scale, 1.8 * scale, '#778b59'],
      [trunkHeight + 1.8 * scale, 0.85 * scale, 1.35 * scale, '#8b9860'],
    ].forEach(([baseY, radius, peakHeight, color]) => {
      const count = 7;
      for (let index = 0; index < count; index += 1) {
        const angleA = (index / count) * Math.PI * 2;
        const angleB = ((index + 1) / count) * Math.PI * 2;
        addFace([
          { x, y: baseY + peakHeight, z },
          { x: x + Math.cos(angleA) * radius, y: baseY, z: z + Math.sin(angleA) * radius },
          { x: x + Math.cos(angleB) * radius, y: baseY, z: z + Math.sin(angleB) * radius },
        ], hexShade(color, (index % 2) * 8 - 3));
      }
    });
  }

  function createCentralQuad() {
    circleFace(0, 0.03, -0.7, 4.4, '#a58f70', 24);
    circleFace(0, 0.06, -0.7, 3.85, '#75885e', 24);
    circleFace(0, 0.08, -0.7, 2.65, '#8b9b70', 24);
    boxFaces(-4.4, 0, -0.7, 1.6, 0.26, 0.53, '#79563b');
    boxFaces(4.4, 0, -0.7, 1.6, 0.26, 0.53, '#79563b');
    boxFaces(0, 0, -5, 1.6, 0.26, 0.53, '#79563b');
    boxFaces(0, 0, 3.6, 1.6, 0.26, 0.53, '#79563b');
    createTree(0, -0.7, 0.73);
  }

  function createNoticeboard() {
    const x = 11;
    const z = -8;
    boxFaces(x, 0, z, 0.18, 2.8, 0.2, '#70503a');
    boxFaces(x - 0.72, 0.7, z, 0.14, 1.55, 0.18, '#70503a');
    boxFaces(x + 0.72, 0.7, z, 0.14, 1.55, 0.18, '#70503a');
    boxFaces(x, 1.65, z + 0.04, 2.3, 1.7, 0.25, '#ae8052');
    boxFaces(x, 1.72, z + 0.19, 1.97, 1.32, 0.12, '#d9c49a');
    boxFaces(x - 0.47, 1.82, z + 0.27, 0.66, 0.77, 0.05, '#e8b576');
    boxFaces(x + 0.46, 1.78, z + 0.28, 0.73, 0.9, 0.05, '#c98668');
    boxFaces(x + 0.1, 1.98, z + 0.34, 0.12, 0.61, 0.04, '#788c64');
    return { x, z, name: 'Campus Notice Board' };
  }

  const props = {};

  function createMainGate() {
    const z = 24.5;
    boxFaces(-5, 0, z, 0.7, 3.2, 0.7, '#c9ae80');
    boxFaces(5, 0, z, 0.7, 3.2, 0.7, '#c9ae80');
    boxFaces(0, 2.65, z, 10.2, 0.65, 0.7, '#966e4d');
    boxFaces(0, 2.78, z + 0.37, 5.7, 0.38, 0.1, '#e3d0a6');
    props.gateSign = { x: 0, y: 4.1, z };
  }

  function buildWorld() {
    addFace([
      { x: -55, y: -0.08, z: -55 }, { x: 55, y: -0.08, z: -55 },
      { x: 55, y: -0.08, z: 55 }, { x: -55, y: -0.08, z: 55 },
    ], '#899677');
    circleFace(0, 0.015, 0, 21, '#91a17d', 32);
    circleFace(18.5, 0.02, -4, 6.7, '#71855e', 24);
    circleFace(18.5, 0.035, -4, 6.1, '#84986a', 24);
    addFace([
      { x: -3.2, y: 0.035, z: 31 }, { x: 3.2, y: 0.035, z: 31 },
      { x: 3.2, y: 0.035, z: -21 }, { x: -3.2, y: 0.035, z: -21 },
    ], '#caba99');
    addFace([
      { x: -21, y: 0.04, z: -3.3 }, { x: 21, y: 0.04, z: -3.3 },
      { x: 21, y: 0.04, z: 0.05 }, { x: -21, y: 0.04, z: 0.05 },
    ], '#caba99');
    addFace([
      { x: -13.1, y: 0.035, z: 21 }, { x: -10.2, y: 0.035, z: 21 },
      { x: -10.2, y: 0.035, z: -19 }, { x: -13.1, y: 0.035, z: -19 },
    ], '#baa98b');
    addFace([
      { x: 10.1, y: 0.035, z: 20 }, { x: 13.1, y: 0.035, z: 20 },
      { x: 13.1, y: 0.035, z: -19 }, { x: 10.1, y: 0.035, z: -19 },
    ], '#baa98b');
    buildings.forEach(createBuilding);
    createCentralQuad();
    props.noticeboard = createNoticeboard();
    createMainGate();

    [
      [-7, -9, 1.05], [8, -9, 0.94], [-8, 7, 1.12], [8, 7, 1],
      [-5, -17, 1.2], [9, -18, 1], [-7, 17, 1], [7, 16, 1.12],
      [-22, -9, 1.1], [-23, 8, 1.24], [22, -5, 1.2], [23, 12, 1.04],
      [-5, 25, 1.15], [6, 24, 1.05], [22, -20, 1.08], [-22, -21, 1.12],
    ].forEach(([x, z, scale]) => createTree(x, z, scale));

  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    mapCanvas.width = Math.round(mapCanvas.clientWidth * pixelRatio);
    mapCanvas.height = Math.round(mapCanvas.clientHeight * pixelRatio);
    mapCtx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  function project(point, view = cameraView()) {
    const position = cameraSpace(point, view);
    if (position.depth < 0.18) return null;
    const focalLength = Math.min(width, height) * 0.91;
    const scale = focalLength / position.depth;
    return { x: width / 2 + position.x * scale, y: height * 0.47 - position.y * scale, depth: position.depth, scale };
  }

  function cameraSpace(point, view) {
    const dx = point.x - view.x;
    const dy = point.y - view.y;
    const dz = point.z - view.z;
    const rightX = Math.cos(view.yaw);
    const rightZ = Math.sin(view.yaw);
    const forwardX = Math.sin(view.yaw);
    const forwardZ = -Math.cos(view.yaw);
    const screenX = dx * rightX + dz * rightZ;
    const forward = dx * forwardX + dz * forwardZ;
    const screenY = dy * Math.cos(view.pitch) + forward * Math.sin(view.pitch);
    const depth = forward * Math.cos(view.pitch) - dy * Math.sin(view.pitch);
    return { x: screenX, y: screenY, depth };
  }

  function projectPolygon(points, view) {
    const nearPlane = 0.18;
    const cameraPoints = points.map((point) => cameraSpace(point, view));
    const clipped = [];
    for (let index = 0; index < cameraPoints.length; index += 1) {
      const current = cameraPoints[index];
      const previous = cameraPoints[(index + cameraPoints.length - 1) % cameraPoints.length];
      const currentVisible = current.depth >= nearPlane;
      const previousVisible = previous.depth >= nearPlane;
      if (currentVisible !== previousVisible) {
        const ratio = (nearPlane - previous.depth) / (current.depth - previous.depth);
        clipped.push({
          x: previous.x + (current.x - previous.x) * ratio,
          y: previous.y + (current.y - previous.y) * ratio,
          depth: nearPlane,
        });
      }
      if (currentVisible) clipped.push(current);
    }
    const focalLength = Math.min(width, height) * 0.91;
    return clipped.map((point) => ({
      x: width / 2 + point.x * focalLength / point.depth,
      y: height * 0.47 - point.y * focalLength / point.depth,
      depth: point.depth,
    }));
  }

  function cameraView() {
    const forwardX = Math.sin(camera.yaw);
    const forwardZ = -Math.cos(camera.yaw);
    return {
      x: player.x - forwardX * 11,
      y: 7.3,
      z: player.z - forwardZ * 11,
      yaw: camera.yaw,
      pitch: camera.pitch,
    };
  }

  function drawWorld(time) {
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#9eb49c');
    sky.addColorStop(0.47, '#ded9ae');
    sky.addColorStop(1, '#a4a986');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);
    const view = cameraView();

    const sun = project({ x: 15, y: 18, z: -34 }, view);
    if (sun) {
      const glow = ctx.createRadialGradient(sun.x, sun.y, 3, sun.x, sun.y, 76);
      glow.addColorStop(0, 'rgb(255 246 203 / 40%)');
      glow.addColorStop(1, 'rgb(255 246 203 / 0%)');
      ctx.fillStyle = glow;
      ctx.fillRect(sun.x - 78, sun.y - 78, 156, 156);
      ctx.beginPath();
      ctx.arc(sun.x, sun.y, 14, 0, Math.PI * 2);
      ctx.fillStyle = 'rgb(255 243 197 / 68%)';
      ctx.fill();
    }

    const moving = keys.has('w') || keys.has('s') || keys.has('a') || keys.has('d');
    const walk = moving ? Math.sin(time * 0.015) * 0.045 : 0;
    const frameFaces = [];
    cast.forEach((person) => {
      circleFace(person.x, 0.025, person.z, 0.48, 'rgb(42, 48, 35)', 12, frameFaces);
      drawCharacter(person.x, 0, person.z, person.color, person.hair, person.accent, person.heading, false, frameFaces);
    });
    circleFace(player.x, 0.025, player.z, 0.52, 'rgb(42, 48, 35)', 12, frameFaces);
    drawCharacter(player.x, 0.01 + walk, player.z, '#688d88', '#39332d', '#d2e489', player.heading, true, frameFaces);

    const renderFaces = [];
    [...faces, ...frameFaces].forEach((face) => {
      const points = projectPolygon(face.points, view);
      if (points.length >= 3) {
        const totalDepth = points.reduce((total, point) => total + point.depth, 0);
        renderFaces.push({ ...face, points, depth: totalDepth / points.length });
      }
    });
    renderFaces.sort((first, second) => second.depth - first.depth);
    renderFaces.forEach((face) => {
      ctx.beginPath();
      ctx.moveTo(face.points[0].x, face.points[0].y);
      face.points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
      ctx.closePath();
      ctx.fillStyle = face.color;
      ctx.fill();
      if (face.outline) {
        ctx.strokeStyle = face.outline;
        ctx.lineWidth = 0.7;
        ctx.stroke();
      }
    });

    buildings.forEach((building) => {
      const label = project(building.sign, view);
      if (!label || label.depth > 45 || label.x < -160 || label.x > width + 160) return;
      const fontSize = Math.max(7, Math.min(12, label.scale * 0.17));
      ctx.font = `500 ${fontSize}px "DM Mono", monospace`;
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgb(242 232 206 / 85%)';
      ctx.fillText(building.name, label.x, label.y);
    });

    const gateSign = project(props.gateSign, view);
    if (gateSign && gateSign.depth < 45 && gateSign.x > -80 && gateSign.x < width + 80) {
      ctx.font = `700 ${Math.max(9, Math.min(15, gateSign.scale * 0.2))}px "SFMono-Regular", monospace`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#4d4838';
      ctx.fillText('SIT  ·  TUMKUR', gateSign.x, gateSign.y);
    }

    ctx.textAlign = 'center';
    ctx.font = '500 9px "SFMono-Regular", monospace';
    ctx.fillStyle = 'rgb(235 223 194 / 80%)';
    const fieldSign = project({ x: 18.5, y: 0.2, z: -4 }, view);
    if (fieldSign && fieldSign.depth < 45 && fieldSign.x > -80 && fieldSign.x < width + 80) {
      ctx.fillText('SPORTS GROUND', fieldSign.x, fieldSign.y);
    }

    const boardSign = project({ x: props.noticeboard.x, y: 3.2, z: props.noticeboard.z }, view);
    if (boardSign && boardSign.depth < 45 && boardSign.x > -80 && boardSign.x < width + 80) {
      ctx.font = `500 ${Math.max(7, Math.min(11, boardSign.scale * 0.17))}px "DM Mono", monospace`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f1e4c4';
      ctx.fillText('NOTICE BOARD', boardSign.x, boardSign.y);
    }

    drawPeople(time, view);
    drawObjectiveBeacon(time, view);
  }

  function drawCharacter(x, y, z, bodyColor, hairColor, accentColor, heading, isPlayer, targetFaces) {
    const bodyWidth = isPlayer ? 0.77 : 0.66;
    const yaw = heading;
    boxFaces(x, y + 0.12, z, bodyWidth, 0.38, 0.39, '#4b4c3b', yaw, null, targetFaces);
    boxFaces(x, y + 0.48, z, bodyWidth * 0.7, 0.88, 0.5, bodyColor, yaw, null, targetFaces);
    boxFaces(x, y + 1.34, z, 0.38, 0.39, 0.38, '#c99570', yaw, null, targetFaces);
    boxFaces(x, y + 1.68, z, 0.4, 0.16, 0.42, hairColor, yaw, null, targetFaces);
    boxFaces(x, y + 0.65, z + 0.29, bodyWidth * 0.73, 0.17, 0.075, accentColor, yaw, null, targetFaces);
    if (isPlayer) boxFaces(x - 0.34, y + 0.69, z, 0.18, 0.57, 0.46, '#77926d', yaw, null, targetFaces);
  }

  function drawPeople(time, view) {
    cast.forEach((person) => {
      const label = project({ x: person.x, y: 2.27, z: person.z }, view);
      if (!label || label.depth > 25) return;
      const ready = canTalkTo(person);
      const fontSize = Math.max(8, Math.min(12, label.scale * 0.2));
      ctx.textAlign = 'center';
      ctx.font = `500 ${fontSize}px "DM Mono", monospace`;
      ctx.fillStyle = ready ? '#f0f3d9' : 'rgb(237 232 213 / 85%)';
      ctx.fillText(person.name.toUpperCase(), label.x, label.y);
      if (ready) {
        const pulse = 0.62 + Math.sin(time / 300) * 0.13;
        ctx.beginPath();
        ctx.arc(label.x, label.y - 13, 2.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgb(211 235 129 / ${pulse})`;
        ctx.fill();
      }
    });
  }

  function drawObjectiveBeacon(time, view) {
    const target = getTarget();
    if (!target || Math.hypot(player.x - target.x, player.z - target.z) < 2.2) return;
    const base = project({ x: target.x, y: 0.14, z: target.z }, view);
    const top = project({ x: target.x, y: 2.25 + Math.sin(time / 430) * 0.13, z: target.z }, view);
    if (!base || !top || base.depth > 65) return;
    const radius = Math.max(3, Math.min(15, base.scale * 0.29));
    const pulse = 0.52 + Math.sin(time / 230) * 0.2;
    ctx.beginPath();
    ctx.ellipse(base.x, base.y, radius, radius * 0.37, 0, 0, Math.PI * 2);
    ctx.strokeStyle = `rgb(244 179 110 / ${pulse})`;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(base.x, base.y);
    ctx.lineTo(top.x, top.y);
    ctx.strokeStyle = `rgb(244 179 110 / ${pulse * 0.56})`;
    ctx.lineWidth = Math.max(1, radius * 0.12);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(top.x, top.y, Math.max(2.5, radius * 0.2), 0, Math.PI * 2);
    ctx.fillStyle = `rgb(255 217 152 / ${Math.min(1, pulse + 0.2)})`;
    ctx.fill();
  }

  function drawMap() {
    const mapWidth = mapCanvas.clientWidth;
    const mapHeight = mapCanvas.clientHeight;
    const padding = 8;
    const range = world.max - world.min;
    const scale = (Math.min(mapWidth, mapHeight) - padding * 2) / range;
    const mapX = (x) => padding + (x - world.min) * scale;
    const mapY = (z) => padding + (z - world.min) * scale;
    mapCtx.clearRect(0, 0, mapWidth, mapHeight);
    mapCtx.fillStyle = '#53644a';
    mapCtx.fillRect(0, 0, mapWidth, mapHeight);
    mapCtx.fillStyle = 'rgb(160 166 121 / 47%)';
    mapCtx.fillRect(mapX(-8.2), mapY(-8.2), 16.4 * scale, 16.4 * scale);
    mapCtx.strokeStyle = '#b2a581';
    mapCtx.lineCap = 'butt';
    mapCtx.lineWidth = 3;
    [
      [-3.2, 31, 3.2, -21],
      [-21, -3.3, 21, 0.05],
      [-13.1, 21, -10.2, -19],
      [10.1, 20, 13.1, -19],
    ].forEach(([x1, z1, x2, z2]) => {
      mapCtx.beginPath();
      mapCtx.moveTo(mapX(x1), mapY(z1));
      mapCtx.lineTo(mapX(x2), mapY(z2));
      mapCtx.stroke();
    });

    buildings.forEach((building) => {
      mapCtx.fillStyle = building.roof;
      mapCtx.fillRect(mapX(building.x - building.w / 2), mapY(building.z - building.d / 2), building.w * scale, building.d * scale);
    });
    mapCtx.fillStyle = '#81966a';
    mapCtx.beginPath();
    mapCtx.ellipse(mapX(18.5), mapY(-4), 6.7 * scale, 6.7 * scale, 0, 0, Math.PI * 2);
    mapCtx.fill();
    mapCtx.fillStyle = '#8fae99';
    mapCtx.beginPath();
    mapCtx.arc(mapX(0), mapY(-0.7), Math.max(2, 1.1 * scale), 0, Math.PI * 2);
    mapCtx.fill();

    const goal = getTarget();
    if (goal) {
      mapCtx.beginPath();
      mapCtx.arc(mapX(goal.x), mapY(goal.z), 3.1, 0, Math.PI * 2);
      mapCtx.fillStyle = '#f1aa6c';
      mapCtx.shadowColor = '#f1aa6c';
      mapCtx.shadowBlur = 7;
      mapCtx.fill();
      mapCtx.shadowBlur = 0;
    }

    const px = mapX(player.x);
    const py = mapY(player.z);
    const angle = player.heading;
    mapCtx.save();
    mapCtx.translate(px, py);
    mapCtx.rotate(angle);
    mapCtx.beginPath();
    mapCtx.moveTo(0, -5);
    mapCtx.lineTo(3.6, 4);
    mapCtx.lineTo(-3.6, 4);
    mapCtx.closePath();
    mapCtx.fillStyle = '#f0f3d8';
    mapCtx.shadowColor = '#d3eb81';
    mapCtx.shadowBlur = 8;
    mapCtx.fill();
    mapCtx.restore();
    mapCtx.shadowBlur = 0;
  }

  function getTarget() {
    const target = chapters[stage].target;
    return typeof target === 'function' ? target() : target;
  }

  function canTalkTo(person) {
    if (person.id === 'nila') return stage === 0 || stage === 3;
    if (person.id === 'dev') return stage === 2;
    return false;
  }

  function canReadBoard() {
    return stage === 1;
  }

  function distanceTo(target) {
    return Math.hypot(player.x - target.x, player.z - target.z);
  }

  function updateNearby() {
    let best = null;
    const candidates = cast.filter(canTalkTo).map((person) => ({ kind: 'person', item: person, distance: distanceTo(person) }));
    if (canReadBoard()) candidates.push({ kind: 'board', item: props.noticeboard, distance: distanceTo(props.noticeboard) });
    candidates.forEach((candidate) => {
      if (candidate.distance <= 3.7 && (!best || candidate.distance < best.distance)) best = candidate;
    });
    nearby = best;
    ui.interaction.hidden = !best || !started || Boolean(dialogueState) || journalOpen;
    if (best) {
      ui.interactionName.textContent = best.kind === 'board' ? 'Campus Notice Board' : best.item.name;
      ui.interaction.children[1].textContent = best.kind === 'board' ? 'Read' : 'Talk';
    }
  }

  function updateLocation() {
    let name = 'SIT CAMPUS GROUNDS';
    if (Math.abs(player.x) < 6.7 && Math.abs(player.z) < 6.5) name = 'SIT CENTRAL QUAD';
    else if (player.z > 13 && Math.abs(player.x) < 7) name = 'SIT MAIN GATE';
    else if (player.x < -11 && player.z < 0) name = 'CENTRAL LIBRARY';
    else if (player.x < -10 && player.z > 7) name = "BOYS' HOSTEL";
    else if (player.x > 10 && player.z < -7) name = 'STUDENT ACTIVITY CENTRE';
    else if (player.x > 10 && player.z > -5 && player.z < 9) name = 'SIT CANTEEN';
    else if (player.x > 14 && player.z > 10) name = "GIRLS' HOSTEL";
    else if (player.z < -19) name = 'SIT AUDITORIUM';
    ui.location.textContent = name;
  }

  function updateMission() {
    const chapter = chapters[stage];
    const titleWords = chapter.title.split(' ');
    const titleBreak = Math.ceil(titleWords.length / 2);
    ui.missionTitle.innerHTML = `${titleWords.slice(0, titleBreak).join(' ')}<br>${titleWords.slice(titleBreak).join(' ')}`;
    ui.missionDescription.textContent = chapter.description;
    ui.objective.textContent = chapter.objective;
    ui.chapterNumber.textContent = `CHAPTER ${String(Math.min(stage + 1, 4)).padStart(2, '0')}`;
    ui.progressCaption.textContent = chapter.caption;
    const progress = stage === 4 ? 100 : Math.round(stage / 4 * 100);
    ui.progressBar.style.width = `${progress}%`;
    ui.progressPercent.textContent = `${progress}%`;
    ui.courageScore.textContent = String(courage).padStart(2, '0');
    ui.connectionScore.textContent = String(connection).padStart(2, '0');
    drawJournalEntries();
    updateLocation();
  }

  function drawJournalEntries() {
    ui.journalEntries.replaceChildren();
    const notes = [
      ['00', 'A brand-new beginning', 'You walked through the main gate. The first step is always the bravest.'],
      ...entries,
    ];
    notes.forEach(([number, title, copy]) => {
      const row = document.createElement('div');
      row.className = 'journal-entry';
      const entryNumber = document.createElement('span');
      entryNumber.className = 'entry-number';
      entryNumber.textContent = number;
      const entryCopy = document.createElement('div');
      entryCopy.className = 'entry-copy';
      const heading = document.createElement('strong');
      heading.textContent = title;
      const description = document.createElement('span');
      description.textContent = copy;
      entryCopy.append(heading, description);
      row.append(entryNumber, entryCopy);
      ui.journalEntries.append(row);
    });
  }

  function addEntry(title, copy) {
    entries.push([String(entries.length + 1).padStart(2, '0'), title, copy]);
    updateMission();
  }

  function showToast(message) {
    window.clearTimeout(toastHideTimer);
    ui.toast.textContent = message;
    ui.toast.classList.add('visible');
    toastHideTimer = window.setTimeout(() => ui.toast.classList.remove('visible'), 2300);
  }

  function openDialogue(person, role, lines, finish, choices = null) {
    dialogueState = { person, role, lines, finish, choices, index: 0, isChoice: false };
    ui.speaker.textContent = person;
    ui.speakerLabel.textContent = role;
    ui.avatar.textContent = person.split(' ').map((part) => part[0]).join('').slice(0, 2);
    ui.chapter.textContent = chapters[Math.min(stage, 3)].title;
    ui.dialogue.hidden = false;
    ui.interaction.hidden = true;
    renderDialogue();
  }

  function renderDialogue() {
    if (!dialogueState) return;
    ui.choices.replaceChildren();
    ui.dialogueFooter.hidden = Boolean(dialogueState.choices && dialogueState.index >= dialogueState.lines.length - 1);
    ui.text.textContent = dialogueState.lines[dialogueState.index];
    if (dialogueState.choices && dialogueState.index === dialogueState.lines.length - 1) {
      dialogueState.isChoice = true;
      dialogueState.choices.forEach((choice, index) => {
        const button = document.createElement('button');
        button.className = 'choice-button';
        button.type = 'button';
        const shortcut = document.createElement('span');
        shortcut.className = 'choice-key';
        shortcut.textContent = `${index + 1}.`;
        button.append(shortcut, document.createTextNode(choice.label));
        button.addEventListener('click', () => selectChoice(index));
        ui.choices.append(button);
      });
      return;
    }
    dialogueState.isChoice = false;
  }

  function advanceDialogue() {
    if (!dialogueState || dialogueState.isChoice) return;
    if (dialogueState.index < dialogueState.lines.length - 1) {
      dialogueState.index += 1;
      renderDialogue();
      return;
    }
    const { finish } = dialogueState;
    dialogueState = null;
    ui.dialogue.hidden = true;
    if (finish) finish();
    updateNearby();
  }

  function closeDialogue() {
    if (!dialogueState) return;
    dialogueState = null;
    ui.dialogue.hidden = true;
    updateNearby();
  }

  function selectChoice(index) {
    if (!dialogueState || !dialogueState.choices) return;
    const callback = dialogueState.choices[index].select;
    dialogueState = null;
    ui.dialogue.hidden = true;
    if (callback) callback();
    updateNearby();
  }

  function startNilaStory() {
    openDialogue('Nila', 'FELLOW FRESHER', [
      'Hi! You look just about as lost as I felt five minutes ago. First day?',
      'I’m Nila. I thought I had the welcome-week poster ready for the Student Activity Centre, but I think I left it on the campus notice board. The club introductions are about to start, and I promised I’d bring it back.',
    ], null, [
      {
        label: '“Let’s go find it together.”',
        select: () => {
          connection += 2;
          stage = 1;
          addEntry('A friendly face', 'You met Nila at the SIT central quad — and decided to tackle the day together.');
          showToast('NILA TRUSTS YOU +2');
        },
      },
      {
        label: '“I’ll check the board for you.”',
        select: () => {
          courage += 2;
          stage = 1;
          addEntry('Taking the first step', 'You offered to look for Nila’s poster. Every new friendship begins with a little initiative.');
          showToast('FIRST IMPRESSION +2');
        },
      },
    ]);
  }

  function startBoardStory() {
    openDialogue('Campus Notice Board', 'SOMETHING CATCHES YOUR EYE', [
      'Among a dozen handwritten club notices, you spot Nila’s colourful “Welcome to SIT!” poster.',
      'A note tucked into the corner says: “The last copy is at the Student Activity Centre — ask Dev for it!”',
    ], () => {
      courage += 1;
      stage = 2;
      addEntry('A clue on the board', 'A handwritten note sent you to the Student Activity Centre to find Dev and the last copy.');
      showToast('NEW LEAD FOUND');
    });
  }

  function startDevStory() {
    openDialogue('Dev', 'STUDENT COUNCIL', [
      'Hey, Nila sent you? I saved the last poster. I was starting to think nobody was coming to the welcome circle.',
      'It’s funny, isn’t it? Everyone here is waiting for someone else to say hello first. You can have it — just save me a seat.',
    ], () => {
      connection += 1;
      stage = 3;
      addEntry('A seat saved for Dev', 'Dev handed over the last poster — and asked to join you at the welcome circle.');
      showToast('DEV HAS YOUR BACK +1');
    });
  }

  function startEnding() {
    openDialogue('Nila', 'YOUR FIRST DAY, YOUR CHOICE', [
      'You made it back! Look at us — we went from not knowing a soul to planning the first welcome circle together.',
      connection >= courage
        ? 'There’s room for one more person at the front. We could invite Dev to introduce the club with us, if you’re up for it.'
        : 'You’ve already done the hard part — showing up for someone you just met. How do you want to end your first day?',
    ], null, [
      {
        label: '“Let’s welcome everyone together.”',
        select: () => {
          connection += 2;
          finishStory('A circle of new friends', 'You and Nila invited Dev to welcome the new students. By the time the circle closed, nobody was a stranger anymore.');
        },
      },
      {
        label: '“I’ll say a few words.”',
        select: () => {
          courage += 2;
          finishStory('Finding your voice', 'You stepped up and shared the first hello with a crowd of freshers. It turns out the campus felt a lot smaller when everyone said hello back.');
        },
      },
    ]);
  }

  function finishStory(title, copy) {
    stage = 4;
    addEntry(title, copy);
    showToast('CHAPTER COMPLETE · FIRST DAY');
    updateMission();
    const ending = document.createElement('section');
    ending.className = 'ending-card glass';
    ending.setAttribute('role', 'dialog');
    ending.setAttribute('aria-modal', 'true');
    ending.setAttribute('aria-label', 'Story chapter complete');
    const kicker = document.createElement('span');
    kicker.className = 'eyebrow';
    kicker.textContent = 'CHAPTER 01 · COMPLETE';
    const heading = document.createElement('h2');
    heading.textContent = title;
    const description = document.createElement('p');
    description.textContent = copy;
    const actions = document.createElement('div');
    actions.className = 'ending-actions';
    const continueButton = document.createElement('button');
    continueButton.className = 'ending-continue';
    continueButton.type = 'button';
    continueButton.textContent = 'Keep exploring';
    continueButton.addEventListener('click', () => {
      ending.remove();
      showToast('THE CAMPUS IS YOURS');
    });
    const replayButton = document.createElement('button');
    replayButton.className = 'ending-replay';
    replayButton.type = 'button';
    replayButton.textContent = 'Play again ↺';
    replayButton.addEventListener('click', () => window.location.reload());
    actions.append(continueButton, replayButton);
    ending.append(kicker, heading, description, actions);
    document.getElementById('game').append(ending);
    continueButton.focus();
  }

  function interact() {
    if (dialogueState) {
      advanceDialogue();
      return;
    }
    if (!nearby) return;
    if (nearby.kind === 'board') startBoardStory();
    else if (nearby.item.id === 'nila' && stage === 0) startNilaStory();
    else if (nearby.item.id === 'dev' && stage === 2) startDevStory();
    else if (nearby.item.id === 'nila' && stage === 3) startEnding();
    else {
      openDialogue(nearby.item.name, nearby.item.role, ['Glad we bumped into each other. There’s a lot to discover around here.'], null);
    }
  }

  function toggleJournal(force = null) {
    if (!started || dialogueState) return;
    journalOpen = force === null ? !journalOpen : force;
    ui.journal.hidden = !journalOpen;
    ui.interaction.hidden = journalOpen || !nearby;
    if (journalOpen) drawJournalEntries();
  }

  function isBlocked(x, z) {
    if (x < world.min + 1 || x > world.max - 1 || z < world.min + 1 || z > world.max - 1) return true;
    return obstacles.some((obstacle) => Math.abs(x - obstacle.x) < obstacle.w / 2 && Math.abs(z - obstacle.z) < obstacle.d / 2);
  }

  function updateMovement(delta) {
    if (!started || dialogueState || journalOpen) return;
    const forward = Number(keys.has('w') || keys.has('arrowup')) - Number(keys.has('s') || keys.has('arrowdown'));
    const strafe = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft'));
    if (!forward && !strafe) return;
    const length = Math.hypot(forward, strafe) || 1;
    const speed = player.speed * (keys.has('shift') ? 1.65 : 1);
    const forwardX = Math.sin(camera.yaw);
    const forwardZ = -Math.cos(camera.yaw);
    const rightX = Math.cos(camera.yaw);
    const rightZ = Math.sin(camera.yaw);
    const dx = (forwardX * forward + rightX * strafe) / length * speed * delta;
    const dz = (forwardZ * forward + rightZ * strafe) / length * speed * delta;
    const nextX = player.x + dx;
    const nextZ = player.z + dz;
    if (!isBlocked(nextX, player.z)) player.x = nextX;
    if (!isBlocked(player.x, nextZ)) player.z = nextZ;
    player.heading = Math.atan2(dx, -dz);
  }

  function frame(timestamp) {
    const delta = Math.min((timestamp - (lastFrame || timestamp)) / 1000, 0.045);
    lastFrame = timestamp;
    updateMovement(delta);
    updateNearby();
    updateLocation();
    drawWorld(timestamp);
    drawMap();
    window.requestAnimationFrame(frame);
  }

  ui.start.addEventListener('click', () => {
    started = true;
    ui.intro.classList.add('dismissed');
    showToast('WELCOME TO CAMPUS · FIND NILA');
  });
  ui.journalButton.addEventListener('click', () => toggleJournal());
  ui.journalClose.addEventListener('click', () => toggleJournal(false));

  document.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'shift'].includes(key)) event.preventDefault();
    if (key === 'j' && !event.repeat) {
      toggleJournal();
      return;
    }
    if (key === 'escape') {
      if (dialogueState) closeDialogue();
      else if (journalOpen) toggleJournal(false);
      return;
    }
    if (dialogueState) {
      if ((key === 'e' || key === ' ' || key === 'enter') && !event.repeat) advanceDialogue();
      if ((key === '1' || key === '2') && dialogueState.isChoice && !event.repeat) selectChoice(Number(key) - 1);
      return;
    }
    if (key === 'e' && !event.repeat) {
      interact();
      return;
    }
    keys.add(key);
  });

  document.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));
  window.addEventListener('blur', () => keys.clear());
  window.addEventListener('resize', resize);
  canvas.addEventListener('pointerdown', (event) => {
    mouseX = event.clientX;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointerup', () => { mouseX = null; });
  canvas.addEventListener('pointermove', (event) => {
    if (mouseX === null || !started || dialogueState) return;
    camera.yaw += (mouseX - event.clientX) * 0.003;
    mouseX = event.clientX;
  });
  canvas.addEventListener('pointercancel', () => { mouseX = null; });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  document.querySelectorAll('.touch-pad [data-key]').forEach((button) => {
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      keys.add(button.dataset.key);
      button.setPointerCapture(event.pointerId);
    });
    const release = () => keys.delete(button.dataset.key);
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
  });
  document.querySelector('.touch-action').addEventListener('pointerdown', (event) => {
    event.preventDefault();
    interact();
  });

  buildWorld();
  resize();
  updateMission();
  window.requestAnimationFrame(frame);
})();
