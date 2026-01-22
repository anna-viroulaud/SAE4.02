
AFRAME.registerComponent('fish-spawner', {
  schema: {
    count: { type: 'int', default: 6 },
    radius: { type: 'number', default: 3 }
  },

  init: function () {
    this.fishes = [];
    // En XR, attendre que l'utilisateur place la zone de jeu si possible
    // Mais spawn immédiatement as a fallback so headset users see fish
    this.el.addEventListener('start-spawning', () => {
      this.spawnFish();
    });
    // Fallback: spawn immediately (useful for desktop / if AR start not used)
    setTimeout(() => {
      if (this.fishes.length === 0) this.spawnFish();
    }, 300);
  },

  spawnFish: function() {
    const scene = this.el.sceneEl;
    const count = this.data.count;
    // Récupérer la position monde du spawner (utile si l'entité est parentée)
    const spawnerPos = new AFRAME.THREE.Vector3();
    this.el.object3D.getWorldPosition(spawnerPos);

    for (let i = 0; i < count; i++) {
      const fish = document.createElement('a-entity');
      fish.setAttribute('class', 'poisson');

      // Position relative au spawner (ancre AR)
      const angle = (i / count) * Math.PI * 2;
      const radius = (this.data.radius || 3) * (0.6 + Math.random() * 0.8);
      const jitter = 0.35; // petite variation pour éviter la superposition
      const x = spawnerPos.x + Math.cos(angle) * radius + (Math.random() - 0.5) * jitter;
      const z = spawnerPos.z + Math.sin(angle) * radius + (Math.random() - 0.5) * jitter;
      const y = spawnerPos.y + 0.3 + (Math.random() - 0.5) * 0.4; // Légèrement au-dessus de la surface AR
      fish.setAttribute('position', `${x} ${y} ${z}`);

      // fallback visible box
      const box = document.createElement('a-box');
      box.setAttribute('width', '0.6');
      box.setAttribute('height', '0.25');
      box.setAttribute('depth', '0.25');
      const colors = ['#ff3333', '#33ff33', '#3333ff', '#ffff33', '#ff33ff', '#33ffff'];
      box.setAttribute('material', `color: ${colors[i % colors.length]}; emissive: ${colors[i % colors.length]}; emissiveIntensity: 2.0; metalness: 0; opacity: 0.65; transparent: true`);
      box.setAttribute('visible', 'true');
      fish.appendChild(box);

      // small marker (larger for visibility)
      const marker = document.createElement('a-sphere');
      marker.setAttribute('radius', '0.12');
      marker.setAttribute('position', `0 0.12 0`);
      marker.setAttribute('material', `color: ${colors[i % colors.length]}; emissive: ${colors[i % colors.length]}; emissiveIntensity: 2.2;`);
      fish.appendChild(marker);

      // model
      const modelEl = document.createElement('a-entity');
      modelEl.setAttribute('gltf-model', '#koiModel');
      modelEl.setAttribute('scale', '0.5 0.5 0.5');
      modelEl.setAttribute('position', '0 0 0');
      modelEl.setAttribute('rotation', '0 180 0');
      modelEl.addEventListener('model-loaded', () => {
        // auto-scale and hide fallback
        try {
          const obj = modelEl.getObject3D('mesh') || modelEl.object3D;
          const bbox = new AFRAME.THREE.Box3().setFromObject(obj);
          const size = new AFRAME.THREE.Vector3();
          bbox.getSize(size);
          const maxDim = Math.max(size.x, size.y, size.z);
          if (maxDim > 0) {
            const target = 0.6;
            const s = Math.min(4, Math.max(0.2, target / maxDim));
            modelEl.setAttribute('scale', `${s} ${s} ${s}`);
          }
        } catch (e) {
          console.warn('Could not auto-scale fish model', e);
        }
        box.setAttribute('visible', 'false');
      });
      setTimeout(() => { try { box.setAttribute('visible', 'false'); } catch (e) { } }, 1500);
      fish.appendChild(modelEl);

      console.log('Fish spawned at:', x, y, z, 'distanceFromSpawner:', spawnerPos.distanceTo(new AFRAME.THREE.Vector3(x,y,z)));

      const swimDistance = 0.4 + Math.random() * 1.0;
      const dur = 3000 + Math.floor(Math.random() * 3000);
      const toX = x + (Math.random() < 0.5 ? swimDistance : -swimDistance);
      fish.setAttribute('animation__swim', `property: position; dir: alternate; dur: ${dur}; loop: true; to: ${toX} ${y} ${z}; easing: linear`);

      fish._swim = { baseY: y, speed: 0.003 + Math.random() * 0.004, amplitude: 0.06 + Math.random() * 0.06, offset: Math.random() * 1000 };

      scene.appendChild(fish);
      this.fishes.push(fish);
    }
  },

  tick: function (time) {
    for (let i = 0; i < this.fishes.length; i++) {
      const f = this.fishes[i];
      if (!f.parentNode) continue;
      const s = f._swim;
      const bob = Math.sin((time + s.offset) * s.speed) * s.amplitude;
      const pos = f.getAttribute('position');
      f.setAttribute('position', { x: pos.x, y: s.baseY + bob, z: pos.z });
      f.object3D.rotation.y = 0.2 * Math.sin((time + s.offset) * s.speed);
    }
  }
});
