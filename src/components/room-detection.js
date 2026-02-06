// ============================================
// COMPOSANT ROOM-DETECTION : Détection complète de l'environnement
// Code complet du professeur BenoitCrespin
// https://github.com/BenoitCrespin/SAE4.DWeb-DI.02-XR/
// ============================================
AFRAME.registerComponent('room-detection', {
  schema: {
    debug: { type: 'boolean', default: true },
    scanDuration: { type: 'number', default: 15000 },
    showPlanes: { type: 'boolean', default: true },
    continuousDetection: { type: 'boolean', default: true },
    // Si true, autorise l'émission automatique de données de test (development only)
    enableTest: { type: 'boolean', default: false }
  },


  init: function () {
    // Bounds de la pièce
    this.roomBounds = {
      minX: Infinity, maxX: -Infinity,
      minY: Infinity, maxY: -Infinity,
      minZ: Infinity, maxZ: -Infinity
    };

    // Stockage des plans détectés par catégorie (approche du professeur)
    this.detectedPlanes = new Map();
    this.floorPlanes = [];      // Sols (horizontal bas)
    this.ceilingPlanes = [];    // Plafonds (horizontal haut)
    this.horizontalPlanes = []; // Tous les plans horizontaux (candidats sol/plafond)
    this.wallPlanes = [];       // Murs (vertical)
    this.obstaclePlanes = [];   // Obstacles (tables, meubles - horizontal milieu)

    // Hit-test (style du professeur)
    this.hitTestSource = null;              // Hit-test depuis la vue (viewer)
    this.controllerHitTestSource = null;    // Hit-test depuis le contrôleur droit
    this.hitTestSourceRequested = false;
    this.controllerHitTestRequested = false;
    this.hitSurfaces = new Map();           // Surfaces détectées
    this.cursorEl = null;                   // Curseur visuel de détection

    // Visualisations
    this.planeMeshes = [];

    // État du scan
    this.isScanning = false;
    this.scanComplete = false;
    this.scanStartTime = 0;
    this.floorY = 0;

    // Sessions XR
    this.xrSession = null;
    this.xrRefSpace = null;
    this.xrSessionRequested = false;

    // Créer l'interface de scan
    this.createScanUI();

    // Écouter les événements XR
    this.el.sceneEl.addEventListener('enter-vr', this.onEnterXR.bind(this));
    this.el.sceneEl.addEventListener('exit-vr', this.onExitXR.bind(this));

    console.log('🏠 Room detection initialisé - Approche du professeur Benoit Crespin');

    // MODE TEST: Si pas en VR après 8 secondes, émettre des données de test
    setTimeout(async () => {
      // TEST MODE: n'émettre des données de test QUE si explicitement autorisé
      // via l'attribut `enableTest` du composant ou le paramètre d'URL `allowTest=1`.
      try {
        const urlParams = (typeof window !== 'undefined' && window.location && window.location.search)
          ? new URLSearchParams(window.location.search)
          : null;
        const allowParam = urlParams ? (urlParams.get('allowTest') === '1' || urlParams.get('allowTest') === 'true') : false;
        // Détecter l'absence de WebXR : si navigator est défini mais ne contient pas 'xr'
        const noXR = !(typeof navigator !== 'undefined' && 'xr' in navigator);
        // Autoriser le mode test si explicitement demandé, via param URL, ou si WebXR est absent (dev PC)
        const allowTest = this.data.enableTest || allowParam || noXR;

        if (!allowTest) return; // pas d'émission automatique de test

        // N'émettre des données de test uniquement si WebXR est réellement absent
        if (!noXR) return;
      } catch (e) {
        // ignore
        return;
      }

      if (!this.xrSession && !this.xrSessionRequested && !this.scanComplete && !this.isScanning) {
        console.warn('⚠️ WebXR non présent — émission de données de test pour le développement PC');
        this.emitTestRoomData();
      }
    }, 8000);
  },

  emitTestRoomData: function () {
    console.log('🧪 MODE TEST: Émission de room-scanned avec données simulées');
    
    this.scanComplete = true;
    
    // Données de test pour le développement sur PC
    const testData = {
      bounds: {
        minX: -3, maxX: 3,
        minY: 0, maxY: 2.5,
        minZ: -4, maxZ: 0
      },
      width: 6,
      depth: 4,
      height: 2.5,
      centerX: 0,
      centerZ: -2,
      floorY: 0,
      floorPlanes: [],
      wallPlanes: [],
      obstaclePlanes: [],
      ceilingPlanes: [],
      allPlanes: new Map()
    };
    
    console.log('📐 Dimensions de test:');
    console.log(`   - Largeur: ${testData.width}m`);
    console.log(`   - Profondeur: ${testData.depth}m`);
    console.log(`   - Hauteur: ${testData.height}m`);
    console.log(`   - Centre: (${testData.centerX}, ${testData.centerZ})`);
    
    // Créer une boîte de visualisation pour le mode test
    this.createTestBoundingBox(testData);
    
    // Créer au moins une entrée floorPlanes pour alimenter l'UI de scan
    try {
      const fakeFloor = {
        plane: null,
        data: {
          bounds: testData.bounds,
          polygon: [
            { x: testData.bounds.minX, y: testData.floorY, z: testData.bounds.minZ },
            { x: testData.bounds.maxX, y: testData.floorY, z: testData.bounds.minZ },
            { x: testData.bounds.maxX, y: testData.floorY, z: testData.bounds.maxZ },
            { x: testData.bounds.minX, y: testData.floorY, z: testData.bounds.maxZ }
          ],
          pose: { transform: { matrix: [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1] } },
          dimensions: { width: testData.width, depth: testData.depth, area: testData.width * testData.depth }
        }
      };
      this.floorPlanes = [fakeFloor];
      this.floorY = testData.floorY;
      // Ajouter quelques points de hit pour donner l'impression d'un scan actif
      this.hitSurfaces.set('test_0', { position: { x: testData.centerX, y: testData.floorY, z: testData.centerZ } });
    } catch (e) {
      // ignore
    }

    // Mettre à jour l'UI pour afficher immédiatement les surfaces détectées en mode test
    try { this.updateScanUI(); } catch (e) { /* ignore */ }

    this.el.sceneEl.emit('room-scanned', testData);
  },

  createTestBoundingBox: function(data) {
    // Créer une boîte fil-de-fer pour visualiser la zone de spawn
    this.createSpawnZoneBoundingBox(data);
  },

  createSpawnZoneBoundingBox: function(data) {
    // Supprimer uniquement l'ancienne boîte de spawn si elle existe (ne PAS nettoyer les plane visuals)
    // Remove old spawn visuals if present (box or contour)
    const oldBox = document.querySelector('#spawn-zone-bounds');
    if (oldBox) oldBox.parentNode.removeChild(oldBox);
    const oldContour = document.querySelector('#spawn-zone-contour');
    if (oldContour) oldContour.parentNode.removeChild(oldContour);

    // Si on a le polygone du sol, calculer les VRAIS bounds à partir des vertices transformés
    if (data.floorPolygon && data.floorPolygon.length >= 3 && data.floorPose) {
      // calculer la box orientée et afficher une visualisation discrète + contour exact
      this.createBoxFromPolygon(data);
      // dessiner le contour exact du polygone (fil-de-fer discret)
      this.createFloorPolygonVisualization(data);
    } else {
      // Sinon, utiliser une box standard (mode test)
      this.createStandardBox(data);
    }
  },
  
  createBoxFromPolygon: function(data) {
    const polygon = data.floorPolygon;
    const pose = data.floorPose;
    const height = data.spawnHeight || data.height;
    
    // Transformer tous les vertices avec la matrice du sol
    const matrix = new THREE.Matrix4();
    matrix.fromArray(pose.transform.matrix);
    
    // Extraire la position et rotation de la matrice
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    matrix.decompose(position, quaternion, scale);
    
    // Convertir quaternion en angles Euler (ordre XYZ)
    const euler = new THREE.Euler();
    euler.setFromQuaternion(quaternion, 'XYZ');
    const rotationX = THREE.MathUtils.radToDeg(euler.x);
    const rotationY = THREE.MathUtils.radToDeg(euler.y);
    const rotationZ = THREE.MathUtils.radToDeg(euler.z);
    
    // Calculer les bounds dans l'espace LOCAL du plan (avant transformation)
    let localMinX = Infinity, localMaxX = -Infinity;
    let localMinZ = Infinity, localMaxZ = -Infinity;
    
    polygon.forEach(v => {
      localMinX = Math.min(localMinX, v.x);
      localMaxX = Math.max(localMaxX, v.x);
      localMinZ = Math.min(localMinZ, v.z);
      localMaxZ = Math.max(localMaxZ, v.z);
    });
    
    // Dimensions dans l'espace local
    const width = localMaxX - localMinX;
    const depth = localMaxZ - localMinZ;
    const localCenterX = (localMinX + localMaxX) / 2;
    const localCenterZ = (localMinZ + localMaxZ) / 2;
    
    // Transformer le centre local en monde
    const centerLocal = new THREE.Vector3(localCenterX, 0, localCenterZ);
    centerLocal.applyMatrix4(matrix);
    
    // Calculer le Y réel du sol en prenant le Y moyen des vertices transformés
    let sumY = 0;
    polygon.forEach(v => {
      const vec = new THREE.Vector3(v.x, v.y, v.z);
      vec.applyMatrix4(matrix);
      sumY += vec.y;
    });
    const realFloorY = sumY / polygon.length;
    
    // Calculer les bounds RÉELS en monde (pour les collisions)
    let realMinX = Infinity, realMaxX = -Infinity;
    let realMinZ = Infinity, realMaxZ = -Infinity;
    
    polygon.forEach(v => {
      const vec = new THREE.Vector3(v.x, v.y, v.z);
      vec.applyMatrix4(matrix);
      
      realMinX = Math.min(realMinX, vec.x);
      realMaxX = Math.max(realMaxX, vec.x);
      realMinZ = Math.min(realMinZ, vec.z);
      realMaxZ = Math.max(realMaxZ, vec.z);
    });
    
    // Mettre à jour les bounds ET infos de la box orientée pour les poissons
    data.bounds = {
      minX: realMinX,
      maxX: realMaxX,
      minZ: realMinZ,
      maxZ: realMaxZ
    };
    
    // Infos de la box orientée pour collisions précises
    data.orientedBox = {
      centerX: centerLocal.x,
      centerZ: centerLocal.z,
      width: width,
      depth: depth,
      rotationY: rotationY * Math.PI / 180, // En radians
      halfWidth: width / 2,
      halfDepth: depth / 2
    };

    // Stocker la matrice de transformation du plan (local -> world) et son inverse
    data.orientedBox.matrix = matrix.clone();
    data.orientedBox.inverseMatrix = new THREE.Matrix4().copy(matrix).invert();
    // Inclure la hauteur/position réelle du sol pour que d'autres composants puissent s'aligner
    data.floorY = realFloorY;
    data.orientedBox.centerY = realFloorY + height / 2;
    
    // Créer la box rouge ORIENTÉE comme le sol réel
    const box = document.createElement('a-box');
    box.setAttribute('id', 'spawn-zone-bounds');
    // Utiliser realFloorY (moyenne des Y des vertices transformés) pour positionner correctement
    // La base sera à realFloorY, le centre à realFloorY + height/2
    box.setAttribute('position', `${centerLocal.x} ${realFloorY + height/2} ${centerLocal.z}`);
    // CORRECTION: Utiliser les 3 axes de rotation pour un alignement parfait avec le sol
    box.setAttribute('rotation', `${rotationX} ${rotationY} ${rotationZ}`);
    box.setAttribute('width', width);
    box.setAttribute('height', height);
    box.setAttribute('depth', depth);
    // rendre la box discrète : couleur violette faible en opacité, filaire
    box.setAttribute('material', 'color: #8a2be2; opacity: 0.06; transparent: true; wireframe: true; side: double');
    box.setAttribute('geometry', 'primitive: box');
    
    console.log('📦 ZONE (violet) créée avec rotation du sol :');
    console.log(`   Position centre: (${centerLocal.x.toFixed(2)}, ${(realFloorY + height/2).toFixed(2)}, ${centerLocal.z.toFixed(2)})`);
    console.log(`   Rotation X: ${rotationX.toFixed(1)}° | Y: ${rotationY.toFixed(1)}° | Z: ${rotationZ.toFixed(1)}°`);
    console.log(`   Dimensions: ${width.toFixed(2)}m (L) x ${height.toFixed(2)}m (H) x ${depth.toFixed(2)}m (P)`);
    console.log(`   Sol Y calculé: ${realFloorY.toFixed(2)}m | Plafond Y: ${(realFloorY + height).toFixed(2)}m`);
    console.log(`   Bounds monde X: ${realMinX.toFixed(2)} à ${realMaxX.toFixed(2)}`);
    console.log(`   Bounds monde Z: ${realMinZ.toFixed(2)} à ${realMaxZ.toFixed(2)}`);
    console.log('   ✅ Boîte orientée sur les 3 axes pour coller au sol');
    
    this.el.sceneEl.appendChild(box);
  },

  createFloorPolygonVisualization: function(data) {
    const polygon = data.floorPolygon;
    const pose = data.floorPose;
    const height = data.spawnHeight || data.height;
    
    console.log('📦 Création visualisation EXACTE basée sur polygone du sol (', polygon.length, 'vertices)');
    
    // Créer une entité pour contenir la visualisation (contour)
    const container = document.createElement('a-entity');
    container.setAttribute('id', 'spawn-zone-contour');
    
    // Matrice de transformation du sol
    const matrix = new THREE.Matrix4();
    matrix.fromArray(pose.transform.matrix);
    
    // 1. Créer le contour du sol (en bas)
    const bottomPoints = [];
    polygon.forEach(v => {
      const vec = new THREE.Vector3(v.x, v.y, v.z);
      vec.applyMatrix4(matrix);
      bottomPoints.push(vec);
    });
    
    // 2. Créer le contour du plafond (même polygone mais +height en Y)
    const topPoints = bottomPoints.map(p => 
      new THREE.Vector3(p.x, p.y + height, p.z)
    );
    
    // 3. Dessiner les contours horizontaux (sol et plafond) en couleur discrète
    this.drawPolygonLoop(bottomPoints, container, '#8a2be2', 0.8);
    this.drawPolygonLoop(topPoints, container, '#8a2be2', 0.6);
    
    // 4. Dessiner les arêtes verticales (coins) EN ROUGE
    for (let i = 0; i < bottomPoints.length; i++) {
      const lineGeom = new THREE.BufferGeometry().setFromPoints([
        bottomPoints[i],
        topPoints[i]
      ]);
      const lineMat = new THREE.LineBasicMaterial({ 
        color: 0x8a2be2, 
        transparent: true, 
        opacity: 0.9,
        linewidth: 1
      });
      const line = new THREE.Line(lineGeom, lineMat);
      this.el.sceneEl.object3D.add(line);
      this.planeMeshes.push(line);
    }
    
    // 5. Créer une surface semi-transparente pour le sol
    const shape = new THREE.Shape();
    shape.moveTo(polygon[0].x, polygon[0].z);
    for (let i = 1; i < polygon.length; i++) {
      shape.lineTo(polygon[i].x, polygon[i].z);
    }
    shape.closePath();
    
    const shapeGeom = new THREE.ShapeGeometry(shape);
    shapeGeom.rotateX(-Math.PI / 2);
    
    const shapeMat = new THREE.MeshBasicMaterial({
      color: 0x8a2be2,
      transparent: true,
      opacity: 0.06,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    
    const shapeMesh = new THREE.Mesh(shapeGeom, shapeMat);
    shapeMesh.matrixAutoUpdate = false;
    shapeMesh.matrix.copy(matrix);
    
    this.el.sceneEl.object3D.add(shapeMesh);
    this.planeMeshes.push(shapeMesh);
    
    console.log('✅ Visualisation polygonale créée - suit EXACTEMENT le sol détecté');
    
    this.el.sceneEl.appendChild(container);
  },

  drawPolygonLoop: function(points, container, color, opacity) {
    const closedPoints = [...points, points[0]];
    const lineGeom = new THREE.BufferGeometry().setFromPoints(closedPoints);
    const lineMat = new THREE.LineBasicMaterial({ 
      color: color || '#ffaa00', 
      transparent: true, 
      opacity: (typeof opacity === 'number') ? opacity : 0.6,
      linewidth: 1
    });
    const line = new THREE.Line(lineGeom, lineMat);
    this.el.sceneEl.object3D.add(line);
    this.planeMeshes.push(line);
  },

  createStandardBox: function(data) {
    // Box rectangulaire (MÊME ZONE que pour les collisions des poissons)
    const bounds = data.bounds || {};
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerZ = (bounds.minZ + bounds.maxZ) / 2;
    const width = bounds.maxX - bounds.minX;
    const depth = bounds.maxZ - bounds.minZ;
    
    const box = document.createElement('a-box');
    box.setAttribute('id', 'spawn-zone-bounds');
    box.setAttribute('position', `${centerX} ${data.floorY + data.height/2} ${centerZ}`);
    box.setAttribute('width', width);
    box.setAttribute('height', data.height);
    box.setAttribute('depth', depth);
    // rendre la box discrète (contour jaune-orangée faible)
    box.setAttribute('material', 'color: #ffaa00; opacity: 0.06; transparent: true; wireframe: true; side: double');
    box.setAttribute('geometry', 'primitive: box');
    
    console.log('📦 ZONE ROUGE créée (bounds du sol) :');
    console.log(`   Position: (${centerX.toFixed(2)}, ${(data.floorY + data.height/2).toFixed(2)}, ${centerZ.toFixed(2)})`);
    console.log(`   Taille: ${width.toFixed(2)}m x ${data.height.toFixed(2)}m x ${depth.toFixed(2)}m`);
    console.log(`   Bounds X: ${bounds.minX.toFixed(2)} à ${bounds.maxX.toFixed(2)}`);
    console.log(`   Bounds Z: ${bounds.minZ.toFixed(2)} à ${bounds.maxZ.toFixed(2)}`);
    
    this.el.sceneEl.appendChild(box);
  },

  createScanUI: function () {
    // Panneau d'information de scan visible en VR
    this.scanPanel = document.createElement('a-entity');
    this.scanPanel.setAttribute('id', 'scan-panel');
    this.scanPanel.setAttribute('position', '0 1.5 -1.5');
    this.scanPanel.setAttribute('visible', 'false');

    // Fond du panneau
    const background = document.createElement('a-plane');
    background.setAttribute('width', '1.4');
    background.setAttribute('height', '0.7');
    background.setAttribute('color', '#000');
    background.setAttribute('opacity', '0.85');
    background.setAttribute('shader', 'flat');
    this.scanPanel.appendChild(background);

    // Titre
    this.scanTitle = document.createElement('a-text');
    this.scanTitle.setAttribute('value', '🔍 SCAN DE LA PIECE');
    this.scanTitle.setAttribute('align', 'center');
    this.scanTitle.setAttribute('color', '#00ff00');
    this.scanTitle.setAttribute('width', '2.2');
    this.scanTitle.setAttribute('position', '0 0.22 0.01');
    this.scanPanel.appendChild(this.scanTitle);

    // Texte d'instructions
    this.scanText = document.createElement('a-text');
    this.scanText.setAttribute('value', 'Regardez les surfaces\nPointez les tables avec la manette');
    this.scanText.setAttribute('align', 'center');
    this.scanText.setAttribute('color', '#ffffff');
    this.scanText.setAttribute('width', '1.8');
    this.scanText.setAttribute('position', '0 0.06 0.01');
    this.scanPanel.appendChild(this.scanText);

    // Compteur de surfaces
    this.surfaceCount = document.createElement('a-text');
    this.surfaceCount.setAttribute('value', 'Surfaces: 0');
    this.surfaceCount.setAttribute('align', 'center');
    this.surfaceCount.setAttribute('color', '#00ffff');
    this.surfaceCount.setAttribute('width', '1.5');
    this.surfaceCount.setAttribute('position', '0 -0.08 0.01');
    this.scanPanel.appendChild(this.surfaceCount);

    // Fond barre de progression
    const progressBg = document.createElement('a-plane');
    progressBg.setAttribute('width', '1.1');
    progressBg.setAttribute('height', '0.05');
    progressBg.setAttribute('color', '#333');
    progressBg.setAttribute('position', '0 -0.26 0.01');
    this.scanPanel.appendChild(progressBg);

    // Barre de progression
    this.progressBar = document.createElement('a-plane');
    this.progressBar.setAttribute('width', '0.01');
    this.progressBar.setAttribute('height', '0.05');
    this.progressBar.setAttribute('color', '#00ff00');
    this.progressBar.setAttribute('position', '-0.545 -0.26 0.02');
    this.scanPanel.appendChild(this.progressBar);

    this.el.sceneEl.appendChild(this.scanPanel);
  },

  onEnterXR: function () {
    console.log('🥽 Entrée en mode XR - Démarrage du scan');
    
    // Marquer qu'on a une session XR pour éviter le mode test
    this.xrSessionRequested = true;

    // Réinitialiser l'état de scan et les données globales partagées
    try {
      if (window && window.FISH_ZONE) {
        window.FISH_ZONE.roomBounds = null;
        window.FISH_ZONE.orientedBox = null;
        window.FISH_ZONE.floorY = 0;
        window.FISH_ZONE.ceilingY = 2.5;
        window.FISH_ZONE.obstacles = [];
        window.FISH_ZONE.wallPlanes = [];
        window.FISH_ZONE.scanned = false;
      }
    } catch (e) {
      // ignore
    }

    // Réinitialiser l'état interne du composant pour forcer un nouveau scan propre
    this.detectedPlanes = new Map();
    this.floorPlanes = [];
    this.ceilingPlanes = [];
    this.wallPlanes = [];
    this.obstaclePlanes = [];
    this.hitSurfaces = new Map();
    this.clearPlaneVisuals();
    this.isScanning = false;
    this.scanComplete = false;
    this.scanStartTime = 0;
    this.floorY = 0;

    // Émettre un événement pour informer les autres composants (ex: fish-spawner) de réinitialisation
    try {
      this.el.sceneEl.emit('room-reset');
      if (this.data.debug) console.log('🔁 room-reset émis pour réinitialiser les composants dépendants');
    } catch (e) {
      // ignore
    }

    // Attendre que la session soit prête
    setTimeout(() => {
      this.initializeXRSession();
    }, 1000);
  },

  initializeXRSession: async function () {
    const renderer = this.el.sceneEl.renderer;
    if (!renderer?.xr) {
      console.warn('❌ Renderer XR non disponible');
      return;
    }

    this.xrSession = renderer.xr.getSession();
    this.xrRefSpace = renderer.xr.getReferenceSpace();

    if (!this.xrSession) {
      console.warn('❌ Session XR non disponible');
      return;
    }

    // Vérifier les features
    if (this.xrSession.enabledFeatures) {
      const features = Array.from(this.xrSession.enabledFeatures);
      console.log('✅ Features XR activées:', features);

      if (features.includes('plane-detection')) {
        console.log('✅ Plane detection disponible !');
      }
      if (features.includes('mesh-detection')) {
        console.log('✅ Mesh detection disponible !');
      }
      if (features.includes('hit-test')) {
        console.log('✅ Hit-test disponible !');
      }
    }

    // Initialiser le hit-test source (comme le professeur)
    // On utilise le viewer space pour scanner ce qu'on regarde
    try {
      const viewerSpace = await this.xrSession.requestReferenceSpace('viewer');
      this.hitTestSource = await this.xrSession.requestHitTestSource({
        space: viewerSpace
      });
      console.log('✅ Hit-test source créé (viewer space)');
    } catch (error) {
      console.warn('⚠️ Hit-test viewer non disponible:', error.message);
    }

    // Créer un curseur visuel pour montrer où on pointe
    this.createScanCursor();

    // Démarrer le scan
    this.startScan();
  },

  // Créer un curseur visuel pour indiquer les surfaces détectées
  createScanCursor: function () {
    this.cursorEl = document.createElement('a-entity');
    this.cursorEl.setAttribute('id', 'scan-cursor');

    // Anneau externe
    const ring1 = document.createElement('a-ring');
    ring1.setAttribute('radius-inner', '0.04');
    ring1.setAttribute('radius-outer', '0.06');
    ring1.setAttribute('color', '#00ff00');
    ring1.setAttribute('opacity', '0.8');
    ring1.setAttribute('rotation', '-90 0 0');
    this.cursorEl.appendChild(ring1);

    // Anneau interne
    const ring2 = document.createElement('a-ring');
    ring2.setAttribute('radius-inner', '0.01');
    ring2.setAttribute('radius-outer', '0.02');
    ring2.setAttribute('color', '#ffffff');
    ring2.setAttribute('opacity', '0.9');
    ring2.setAttribute('rotation', '-90 0 0');
    this.cursorEl.appendChild(ring2);

    this.cursorEl.object3D.visible = false;
    this.el.sceneEl.appendChild(this.cursorEl);
  },

  startScan: function () {
    if (this.scanComplete) return;

    this.isScanning = true;
    this.scanStartTime = Date.now();
    this.scanPanel.setAttribute('visible', 'true');

    console.log('🔍 Démarrage du scan de l\'environnement...');
    console.log('💡 Regardez les tables et surfaces pour les détecter !');

    // Programmer la fin du scan
    setTimeout(() => {
      if (this.isScanning) {
        this.finishScan();
      }
    }, this.data.scanDuration);
  },

  onExitXR: function () {
    console.log('🚪 Sortie du mode XR');
    this.isScanning = false;
    this.scanPanel.setAttribute('visible', 'false');
    this.clearPlaneVisuals();

    // Nettoyer les hit-test sources
    if (this.hitTestSource) {
      this.hitTestSource.cancel();
      this.hitTestSource = null;
    }
    if (this.controllerHitTestSource) {
      this.controllerHitTestSource.cancel();
      this.controllerHitTestSource = null;
    }
    this.hitTestSourceRequested = false;
    this.controllerHitTestRequested = false;

    // Cacher le curseur
    if (this.cursorEl) {
      this.cursorEl.object3D.visible = false;
    }
  },

  tick: function (time, deltaTime) {
    // Continuer même après le scan si continuousDetection est activé
    const shouldDetect = this.isScanning ||
      (this.data.continuousDetection && this.scanComplete);

    if (!shouldDetect || !this.xrSession || !this.xrRefSpace) return;

    // Mettre à jour la barre de progression pendant le scan
    if (this.isScanning) {
      const elapsed = Date.now() - this.scanStartTime;
      const progress = Math.min(elapsed / this.data.scanDuration, 1);
      const width = 1.1 * progress;
      this.progressBar.setAttribute('width', Math.max(0.01, width));
      this.progressBar.setAttribute('position', `${-0.55 + width / 2} -0.26 0.02`);
    }

    // Détecter les plans et utiliser hit-test
    this.detectPlanes();
    this.performHitTest();
  },

  // Hit-test pour détecter précisément ce qu'on regarde (comme le professeur)
  performHitTest: function () {
    const renderer = this.el.sceneEl.renderer;
    if (!renderer?.xr) return;

    const frame = renderer.xr.getFrame();
    if (!frame) return;

    // Essayer aussi de créer un hit-test source pour le contrôleur droit
    // (comme le professeur fait dans son code)
    if (!this.controllerHitTestSource && this.xrSession) {
      this.trySetupControllerHitTest(frame);
    }

    // Hit-test depuis la vue (regarder les surfaces)
    this.processHitTestSource(frame, this.hitTestSource, 'viewer');

    // Hit-test depuis le contrôleur (pointer les surfaces)
    this.processHitTestSource(frame, this.controllerHitTestSource, 'controller');
  },

  trySetupControllerHitTest: function (frame) {
    // Approche du professeur : chercher le contrôleur droit dynamiquement
    if (this.controllerHitTestRequested || !this.xrSession) return;

    try {
      const inputSources = this.xrSession.inputSources;

      // Chercher la manette droite (comme le professeur le fait)
      for (let inputSource of inputSources) {
        if (inputSource.handedness === 'right' && inputSource.targetRaySpace) {
          this.controllerHitTestRequested = true;
          this.xrSession.requestHitTestSource({ space: inputSource.targetRaySpace })
            .then((source) => {
              this.controllerHitTestSource = source;
              if (this.data.debug) {
                console.log('✅ Hit-test contrôleur droit créé - Pointez les tables !');
              }
            })
            .catch((error) => {
              if (this.data.debug) {
                console.warn('⚠️ Hit-test contrôleur non disponible:', error.message);
              }
            });
          break;
        }
      }
    } catch (error) {
      // Silently ignore errors
    }
  },

  processHitTestSource: function (frame, hitTestSource, sourceType) {
    // Approche du professeur : traiter les résultats du hit-test avec filtrage intelligent
    if (!hitTestSource) return;

    try {
      const hitTestResults = frame.getHitTestResults(hitTestSource);

      if (hitTestResults.length > 0) {
        const hit = hitTestResults[0];  // Prendre le premier résultat (plus proche)
        const hitPose = hit.getPose(this.xrRefSpace);

        if (hitPose) {
          const pos = hitPose.transform.position;
          const orient = hitPose.transform.orientation;

          // Mettre à jour le curseur visuel pour le viewer (style professeur)
          if (sourceType === 'viewer' && this.cursorEl && this.isScanning) {
            this.cursorEl.object3D.visible = true;
            this.cursorEl.object3D.position.set(pos.x, pos.y, pos.z);
            this.cursorEl.object3D.quaternion.set(orient.x, orient.y, orient.z, orient.w);

            // Couleur selon la hauteur (comme le professeur)
            const rings = this.cursorEl.querySelectorAll('a-ring');
            if (pos.y > 0.55 && pos.y <= 1.0) {
              rings.forEach(r => r.setAttribute('color', '#ff8800')); // Table probable
            } else if (pos.y < 0.25) {
              rings.forEach(r => r.setAttribute('color', '#00ff00')); // Sol
            } else {
              rings.forEach(r => r.setAttribute('color', '#00ffff')); // Autre
            }
          }

          // Pour le contrôleur, appliquer le filtrage du professeur
          if (sourceType === 'controller' && this.xrSession) {
            // Vérifier la distance comme le professeur le fait (éviter la main)
            const inputSources = this.xrSession.inputSources;
            let rightController = null;

            for (let inputSource of inputSources) {
              if (inputSource.handedness === 'right') {
                rightController = inputSource;
                break;
              }
            }

            if (rightController && rightController.targetRaySpace) {
              const controllerPose = frame.getPose(rightController.targetRaySpace, this.xrRefSpace);
              if (controllerPose) {
                const dx = pos.x - controllerPose.transform.position.x;
                const dy = pos.y - controllerPose.transform.position.y;
                const dz = pos.z - controllerPose.transform.position.z;
                const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

                // N'accepter que si distance > 0.5m (méthode du professeur)
                if (distance <= 0.5) {
                  if (this.cursorEl) this.cursorEl.object3D.visible = false;
                  return;
                }
              }
            }
          }

          // Grille pour éviter les doublons
          const gridSize = sourceType === 'controller' ? 20 : 10;
          const key = `${sourceType}_${Math.round(pos.x * gridSize)}_${Math.round(pos.y * gridSize)}_${Math.round(pos.z * gridSize)}`;

          // Enregistrer la surface si nouvelle
          if (!this.hitSurfaces.has(key)) {
            this.hitSurfaces.set(key, {
              position: { x: pos.x, y: pos.y, z: pos.z },
              orientation: { x: orient.x, y: orient.y, z: orient.z, w: orient.w },
              sourceType: sourceType,
              timestamp: Date.now()
            });

            // Mettre à jour les bounds
            this.roomBounds.minX = Math.min(this.roomBounds.minX, pos.x);
            this.roomBounds.maxX = Math.max(this.roomBounds.maxX, pos.x);
            this.roomBounds.minY = Math.min(this.roomBounds.minY, pos.y);
            this.roomBounds.maxY = Math.max(this.roomBounds.maxY, pos.y);
            this.roomBounds.minZ = Math.min(this.roomBounds.minZ, pos.z);
            this.roomBounds.maxZ = Math.max(this.roomBounds.maxZ, pos.z);

            if (this.data.debug && this.isScanning && sourceType === 'controller') {
              const dx = pos.x - (rightController ? frame.getPose(rightController.targetRaySpace, this.xrRefSpace).transform.position.x : 0);
              const dy = pos.y - (rightController ? frame.getPose(rightController.targetRaySpace, this.xrRefSpace).transform.position.y : 0);
              const dz = pos.z - (rightController ? frame.getPose(rightController.targetRaySpace, this.xrRefSpace).transform.position.z : 0);
              const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
              console.log(`🎯 Surface détectée à y=${pos.y.toFixed(2)}m (distance: ${dist.toFixed(2)}m)`);
            }
          }
        }
      } else if (sourceType === 'viewer' && this.cursorEl) {
        this.cursorEl.object3D.visible = false;
      }
    } catch (error) {
      // Silently ignore errors
    }
  },

  detectPlanes: function () {
    const renderer = this.el.sceneEl.renderer;
    if (!renderer?.xr) return;

    const frame = renderer.xr.getFrame();
    if (!frame) return;

    // Vérifier si la détection de plans est disponible
    if (!frame.detectedPlanes) return;

    const detectedPlanes = frame.detectedPlanes;
    let newPlanesCount = 0;

    detectedPlanes.forEach((plane) => {
      // Ignorer les plans déjà traités
      if (this.detectedPlanes.has(plane)) return;

      const planePose = frame.getPose(plane.planeSpace, this.xrRefSpace);
      if (!planePose) return;

      const position = planePose.transform.position;
      const orientation = planePose.transform.orientation;
      const polygon = plane.polygon;

      if (!polygon || polygon.length < 3) return;

      newPlanesCount++;

      // Stocker le plan
      const planeData = {
        position: { x: position.x, y: position.y, z: position.z },
        orientation: { x: orientation.x, y: orientation.y, z: orientation.z, w: orientation.w },
        polygon: polygon,
        type: plane.orientation,
        pose: planePose
      };
      // Flag pour éviter de recréer plusieurs fois la même visualisation
      planeData._visualCreated = false;
      this.detectedPlanes.set(plane, planeData);

      // Classifier le plan selon son orientation et sa hauteur
      this.classifyPlane(plane, planeData);

      // Mettre à jour les bounds avec la pose complète
      this.updateBoundsFromPolygon(planePose, polygon);

      // Créer la visualisation
      if (this.data.showPlanes) {
        this.createPlaneVisual(plane, planeData);
      }

      if (this.data.debug) {
        console.log(`📋 ${plane.orientation} détecté: y=${position.y.toFixed(2)}m, vertices=${polygon.length}`);
      }
    });

    // Mettre à jour l'UI
    if (newPlanesCount > 0) {
      this.updateScanUI();
    }
  },

  classifyPlane: function (plane, planeData) {
    // Approche du professeur : classification robuste basée sur la pose réelle
    const pose = planeData.pose;
    const matrix = new THREE.Matrix4();
    matrix.fromArray(pose.transform.matrix);

    // Transformer tous les vertices pour avoir les vraies coordonnées
    const polygon = planeData.polygon;
    let avgY = planeData.position.y;
    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    let transformedPoints = [];
    if (polygon && polygon.length > 0) {
      let sumY = 0;
      polygon.forEach(v => {
        const vec = new THREE.Vector3(v.x, v.y, v.z);
        vec.applyMatrix4(matrix);
        transformedPoints.push({ x: vec.x, y: vec.y, z: vec.z });
        sumY += vec.y;
        minX = Math.min(minX, vec.x);
        maxX = Math.max(maxX, vec.x);
        minY = Math.min(minY, vec.y);
        maxY = Math.max(maxY, vec.y);
        minZ = Math.min(minZ, vec.z);
        maxZ = Math.max(maxZ, vec.z);
      });
      avgY = sumY / polygon.length;
    }

    // Calculer taille et aire (méthode du professeur)
    const planeWidth = maxX - minX;
    const planeDepth = maxZ - minZ;
    const planeArea = planeWidth * planeDepth;
    const heightVariance = maxY - minY;  // Vérifier si c'est vraiment plat

    // Stocker les infos
    planeData.worldY = avgY;
    planeData.dimensions = { width: planeWidth, depth: planeDepth, area: planeArea };
    planeData.bounds = { minX, maxX, minY, maxY, minZ, maxZ };

    // Handle horizontal planes: detect tables/obstacles, otherwise record as horizontal candidate
    if (plane.orientation === 'horizontal') {
      const isFlat = heightVariance < 0.15;
      const isTableSize = planeArea >= 0.12;
      // Base de référence pour la hauteur (si des hit-tests ont mis à jour roomBounds)
      const baseY = (this.roomBounds && isFinite(this.roomBounds.minY)) ? this.roomBounds.minY : 0;
      const relY = avgY - baseY;

      // Table: hauteur relative entre ~0.35 et 1.4m (tolérance élargie) + taille suffisante + plat
      const isTableHeight = relY >= 0.35 && relY <= 1.4;

      if (isTableHeight && isTableSize && isFlat) {
        planeData.obstacleType = 'table';
        this.obstaclePlanes.push({ plane, data: planeData });
        if (this.data.debug) {
          console.log(`🟡 TABLE DÉTECTÉE: relY=${relY.toFixed(2)}m, area=${planeArea.toFixed(2)}m²`);
          console.log('    vertices Y (world):', transformedPoints.map(p => p.y.toFixed(2)).join(', '));
        }
      } else {
        // Possible floor: si très grand et proche du minY (ou très proche du sol)
        if ((planeArea >= 0.6 && relY < 0.6) || relY < 0.25) {
          planeData.guessType = 'floor_candidate';
          this.floorPlanes.push({ plane, data: planeData });
          this.floorY = Math.max(this.floorY, avgY);
          if (this.data.debug) {
            console.log(`🟢 SOL candidate: relY=${relY.toFixed(2)}m, area=${planeArea.toFixed(2)}m²`);
            console.log('    vertices Y (world):', transformedPoints.map(p => p.y.toFixed(2)).join(', '));
          }
        } else {
          // Keep as horizontal candidate (could be floor or ceiling)
          this.horizontalPlanes.push({ plane, data: planeData });
          if (this.data.debug) {
            console.log(`⬜ HORIZONTAL candidate: relY=${relY.toFixed(2)}m, area=${planeArea.toFixed(2)}m²`);
            console.log('    vertices Y (world):', transformedPoints.map(p => p.y.toFixed(2)).join(', '));
          }
        }
      }
    } else if (plane.orientation === 'vertical') {
      // MUR
      this.wallPlanes.push({ plane, data: planeData });
      if (this.data.debug) {
        console.log(`🔷 MUR: pos=(${planeData.position.x.toFixed(2)}, ${planeData.position.z.toFixed(2)})`);
      }
    }
  },

  updateBoundsFromPolygon: function (pose, polygon) {
    // Utiliser la matrice de transformation pour convertir en coordonnées monde
    const matrix = new THREE.Matrix4();
    matrix.fromArray(pose.transform.matrix);

    polygon.forEach(vertex => {
      // Transformer le vertex local en coordonnées monde
      const worldPos = new THREE.Vector3(vertex.x, vertex.y, vertex.z);
      worldPos.applyMatrix4(matrix);

      this.roomBounds.minX = Math.min(this.roomBounds.minX, worldPos.x);
      this.roomBounds.maxX = Math.max(this.roomBounds.maxX, worldPos.x);
      this.roomBounds.minY = Math.min(this.roomBounds.minY, worldPos.y);
      this.roomBounds.maxY = Math.max(this.roomBounds.maxY, worldPos.y);
      this.roomBounds.minZ = Math.min(this.roomBounds.minZ, worldPos.z);
      this.roomBounds.maxZ = Math.max(this.roomBounds.maxZ, worldPos.z);
    });
  },

  createPlaneVisual: function (plane, planeData) {
    const polygon = planeData.polygon;
    const pose = planeData.pose;

    if (!polygon || polygon.length < 3) return;

    // Éviter de créer plusieurs fois la visualisation pour le même plane
    if (planeData._visualCreated) return;

    // Calculer la hauteur Y moyenne pour la classification
    const matrix = new THREE.Matrix4();
    matrix.fromArray(pose.transform.matrix);
    const centerWorld = new THREE.Vector3(0, 0, 0).applyMatrix4(matrix);

    // Vérifier si c'est une table (amélioré)
    const isTable = plane.orientation === 'horizontal' &&
      planeData.obstacleType === 'table';

    if (isTable) {
      // Pour les tables, créer une visualisation TRÈS VISIBLE
      this.createTableVisual(polygon, matrix, planeData);
    } else {
      // Pour les autres plans, utiliser la géométrie classique
      this.createStandardPlaneVisual(polygon, matrix, planeData, plane, centerWorld);
    }
  },

  // Créer une visualisation très visible pour les tables
  createTableVisual: function (polygon, matrix, planeData) {
    // Créer les points du contour de la table
    const points = [];
    polygon.forEach(vertex => {
      points.push(new THREE.Vector3(vertex.x, vertex.y, vertex.z));
    });

    // Créer le contour avec une line très épaisse et très colorée
    const lineGeometry = new THREE.BufferGeometry();

    // Ajouter tous les points + fermer la boucle
    const closedPoints = [...points, points[0]];
    lineGeometry.setFromPoints(closedPoints);

    // Matériau pour le contour (JAUNE BRILLANT pour les tables)
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xffdd00,  // Jaune vif
      transparent: true,
      opacity: 1.0,
      linewidth: 5,
      fog: false
    });

    const lineSegments = new THREE.Line(lineGeometry, lineMaterial);
    lineSegments.matrixAutoUpdate = false;
    lineSegments.matrix.copy(matrix);

    this.el.sceneEl.object3D.add(lineSegments);
    this.planeMeshes.push(lineSegments);

    // Créer aussi une version transparente remplie JAUNE pour bien voir la surface
    const shape = new THREE.Shape();
    shape.moveTo(polygon[0].x, polygon[0].z);
    for (let i = 1; i < polygon.length; i++) {
      shape.lineTo(polygon[i].x, polygon[i].z);
    }
    shape.closePath();

    const geometry = new THREE.ShapeGeometry(shape);
    geometry.rotateX(-Math.PI / 2);

    const material = new THREE.MeshBasicMaterial({
      color: 0xffdd00,  // Jaune
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.matrixAutoUpdate = false;
    mesh.matrix.copy(matrix);

    this.el.sceneEl.object3D.add(mesh);
    this.planeMeshes.push(mesh);
    // Marquer la visualisation comme créée pour ce plane
    planeData._visualCreated = true;
  },

  // Créer une visualisation standard pour les autres plans
  createStandardPlaneVisual: function (polygon, matrix, planeData, plane, centerWorld) {
    // Créer un shape 2D à partir du polygone (coordonnées locales du plan)
    const shape = new THREE.Shape();
    shape.moveTo(polygon[0].x, polygon[0].z);
    for (let i = 1; i < polygon.length; i++) {
      shape.lineTo(polygon[i].x, polygon[i].z);
    }
    shape.closePath();

    const geometry = new THREE.ShapeGeometry(shape);
    geometry.rotateX(-Math.PI / 2);

    // Couleur selon le type de plan (utiliser hauteur relative au sol si possible)
    let color, opacity;
    if (plane.orientation === 'horizontal') {
      const worldY = (planeData.worldY !== undefined) ? planeData.worldY : centerWorld.y;
      const baseY = (this.floorY !== undefined && this.floorY !== 0) ? this.floorY : ((this.roomBounds && isFinite(this.roomBounds.minY)) ? this.roomBounds.minY : 0);
      const relY = worldY - baseY;
      if (relY < 0.3) {
        color = 0x00ff00; // Sol = vert vif
        opacity = 0.35;
      } else if (relY > 2.0) {
        color = 0x00ffff; // Plafond = cyan
        opacity = 0.2;
      } else {
        // Autre obstacle
        const obstacleType = planeData.obstacleType || 'unknown';
        if (obstacleType.includes('tabouret') || obstacleType.includes('bas')) {
          color = 0xffff00; // Jaune pour meubles bas
          opacity = 0.4;
        } else if (obstacleType.includes('comptoir') || obstacleType.includes('étagère')) {
          color = 0xff00ff; // Magenta pour comptoirs/étagères
          opacity = 0.4;
        } else if (obstacleType.includes('petit')) {
          color = 0xff4444; // Rouge pour petits objets
          opacity = 0.6;
        } else {
          color = 0xff8800; // Orange par défaut
          opacity = 0.4;
        }
      }
    } else {
      color = 0x0088ff; // Mur = bleu
      opacity = 0.25;
    }

    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: opacity,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    const mesh = new THREE.Mesh(geometry, material);

    // Appliquer directement la matrice de transformation de la pose
    // Cela positionne et oriente correctement le mesh dans l'espace monde
    mesh.matrixAutoUpdate = false;
    mesh.matrix.copy(matrix);

    // Ajouter un contour plus épais pour mieux voir
    const edges = new THREE.EdgesGeometry(geometry);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff, // Contour blanc pour meilleure visibilité
      transparent: true,
      opacity: 0.9,
      linewidth: 2
    });
    const wireframe = new THREE.LineSegments(edges, lineMaterial);
    wireframe.matrixAutoUpdate = false;
    wireframe.matrix.copy(matrix);

    this.el.sceneEl.object3D.add(mesh);
    this.el.sceneEl.object3D.add(wireframe);
    this.planeMeshes.push(mesh, wireframe);
    // Marquer la visualisation comme créée pour ce plane
    planeData._visualCreated = true;
  },

  updateScanUI: function () {
    const floorCount = this.floorPlanes.length;
    const wallCount = this.wallPlanes.length;
    const obstacleCount = this.obstaclePlanes.length;
    const hitSurfaceCount = this.hitSurfaces.size;
    const total = floorCount + wallCount + obstacleCount + this.ceilingPlanes.length;

    // Compter les types d'obstacles
    const obstacleTypes = {};
    this.obstaclePlanes.forEach(({ data }) => {
      const type = data.obstacleType || 'autre';
      obstacleTypes[type] = (obstacleTypes[type] || 0) + 1;
    });

    this.surfaceCount.setAttribute('value',
      `Sol: ${floorCount} | Murs: ${wallCount} | Objets: ${obstacleCount}`);

    // Afficher plus de détails sur les obstacles
    let details = `${total} surfaces + ${hitSurfaceCount} points`;
    if (obstacleCount > 0) {
      const typesList = Object.entries(obstacleTypes)
        .map(([type, count]) => `${count} ${type.split('/')[0]}`)
        .slice(0, 2)
        .join(', ');
      details += `\n${typesList}`;
    } else {
      details += `\nContinuez à scanner...`;
    }

    this.scanText.setAttribute('value', details);
  },

  showStartButton: function () {
    console.log('🎮 Affichage du bouton de démarrage');
    
    // Masquer le panneau de scan
    if (this.scanPanel) {
      this.scanPanel.setAttribute('visible', 'false');
    }
    
    // Afficher le bouton 3D en VR
    const startButton3D = document.querySelector('#start-button-3d');
    if (startButton3D) {
      startButton3D.setAttribute('visible', 'true');
    }
    
    // Afficher le bouton HTML pour PC
    const startButtonHTML = document.getElementById('start-game-button');
    if (startButtonHTML) {
      startButtonHTML.style.display = 'block';
    }
  },

  clearPlaneVisuals: function () {
    this.planeMeshes.forEach(mesh => {
      this.el.sceneEl.object3D.remove(mesh);
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) mesh.material.dispose();
    });
    this.planeMeshes = [];
  },

  finishScan: function () {
    this.isScanning = false;
    this.scanComplete = true;

    const totalPlanes = this.detectedPlanes.size;

    // Logs détaillés comme le professeur
    console.log(`\n✅ SCAN TERMINÉ - ${totalPlanes} surfaces analysées`);
    console.log(`   🟢 Sols: ${this.floorPlanes.length}`);
    console.log(`   🔷 Murs: ${this.wallPlanes.length}`);
    console.log(`   🟠 Obstacles (tables, meubles): ${this.obstaclePlanes.length}`);
    console.log(`   🔵 Plafonds: ${this.ceilingPlanes.length}`);
    console.log(`   Total surfaces détectées par hit-test: ${this.hitSurfaces.size}\n`);

    // Détail des obstacles
    if (this.obstaclePlanes.length > 0) {
      const typeCount = {};
      this.obstaclePlanes.forEach(({ data }) => {
        const type = data.obstacleType || 'autre';
        typeCount[type] = (typeCount[type] || 0) + 1;
      });
      console.log('   Détail des obstacles détectés:');
      Object.entries(typeCount).forEach(([type, count]) => {
        console.log(`     - ${count} ${type}(s)`);
      });
    }

    // Mettre à jour l'UI
    this.scanTitle.setAttribute('value', '✅ SCAN TERMINÉ');
    this.scanTitle.setAttribute('color', '#00ff00');
    this.scanText.setAttribute('value', `${totalPlanes} surfaces\nAdaptation eau...`);
    this.progressBar.setAttribute('color', '#00ff00');

    // AFFICHER LE BOUTON DE DÉMARRAGE APRÈS LE SCAN
    setTimeout(() => {
      this.showStartButton();
    }, 1500);

    // CALCUL AMÉLIORÉ : Utiliser le sol le plus grand pour définir la zone
    let roomData = null;
    // Debug: log horizontal candidates (if any)
    if (this.horizontalPlanes && this.horizontalPlanes.length > 0) {
      const sortedCandidates = this.horizontalPlanes.slice().sort((a,b) => (b.data.dimensions?.area||0) - (a.data.dimensions?.area||0));
      this.logHorizontalCandidates(sortedCandidates);
    }
    
    if (this.floorPlanes.length > 0) {
      // Trouver le plus grand sol
      let largestFloor = this.floorPlanes[0];
      let maxArea = 0;
      
      this.floorPlanes.forEach(({ data }) => {
        const area = data.dimensions?.area || 0;
        if (area > maxArea) {
          maxArea = area;
          largestFloor = { data };
        }
      });
      
      const floorData = largestFloor.data;
      const floorBounds = floorData.bounds;
      
      // Utiliser les dimensions réelles du sol principal
      const width = floorBounds.maxX - floorBounds.minX;
      const depth = floorBounds.maxZ - floorBounds.minZ;
      const centerX = (floorBounds.minX + floorBounds.maxX) / 2;
      const centerZ = (floorBounds.minZ + floorBounds.maxZ) / 2;
      
      // Hauteur réelle de la pièce basée sur plafond détecté ou bounds globaux
      let realHeight = this.roomBounds.maxY - this.floorY;
      if (!isFinite(realHeight) || realHeight < 1.5) realHeight = 2.5;
      realHeight = Math.min(realHeight, 4.0);

      // Hauteur utilisée pour la zone de spawn des poissons (valeur pratique)
      let spawnHeight = Math.min(1.6, Math.max(1.2, realHeight - 0.6));
      if (spawnHeight > realHeight) spawnHeight = Math.max(1.0, realHeight - 0.2);
      
      console.log('📐 Dimensions basées sur le sol principal:');
      console.log(`   - Aire du sol: ${maxArea.toFixed(2)}m²`);
      console.log(`   - Largeur: ${width.toFixed(2)}m`);
      console.log(`   - Profondeur: ${depth.toFixed(2)}m`);
      console.log(`   - Hauteur: ${height.toFixed(2)}m`);
      console.log(`   - Centre: (${centerX.toFixed(2)}, ${centerZ.toFixed(2)})`);
      console.log(`   - Sol Y: ${this.floorY.toFixed(2)}m\n`);
      
      roomData = {
        width: width,
        depth: depth,
        height: realHeight,
        spawnHeight: spawnHeight,
        centerX: centerX,
        centerZ: centerZ,
        floorY: this.floorY,
        bounds: floorBounds,
        floorPolygon: floorData.polygon,
        floorPose: floorData.pose,
        orientedBox: null // Sera rempli par createBoxFromPolygon
      };
    } else {
      // Fallback : utiliser les bounds globaux
      const bounds = this.roomBounds;
      let width = bounds.maxX - bounds.minX;
      let depth = bounds.maxZ - bounds.minZ;
      let height = bounds.maxY - bounds.minY;

      if (!isFinite(width) || width < 1) width = 6;
      if (!isFinite(depth) || depth < 1) depth = 6;
      if (!isFinite(height) || height < 1) height = 2.5;

      width = Math.min(Math.max(width, 2), 20);
      depth = Math.min(Math.max(depth, 2), 20);
      height = Math.min(Math.max(height, 1.5), 5);

      const centerX = isFinite(bounds.minX) && isFinite(bounds.maxX)
        ? (bounds.minX + bounds.maxX) / 2 : 0;
      const centerZ = isFinite(bounds.minZ) && isFinite(bounds.maxZ)
        ? (bounds.minZ + bounds.maxZ) / 2 : -2;

      console.log('📐 Dimensions (fallback - bounds globaux):');
      console.log(`   - Largeur: ${width.toFixed(2)}m`);
      console.log(`   - Profondeur: ${depth.toFixed(2)}m`);
      console.log(`   - Hauteur: ${height.toFixed(2)}m`);
      console.log(`   - Centre: (${centerX.toFixed(2)}, ${centerZ.toFixed(2)})\n`);
      
      roomData = {
        width: width,
        depth: depth,
        height: height,
        centerX: centerX,
        centerZ: centerZ,
        floorY: this.floorY,
        bounds: bounds
      };
    }

    // Créer une boîte de visualisation pour la zone de spawn
    // IMPORTANT: createBoxFromPolygon modifie data.bounds et data.orientedBox
    this.createSpawnZoneBoundingBox(roomData);
    
    console.log('📤 Émission room-scanned avec orientedBox:', roomData.orientedBox ? 'OUI ✅' : 'NON ❌');

    // Mettre à jour la variable globale pour que d'autres composants y accèdent immédiatement
    if (window && window.FISH_ZONE) {
      window.FISH_ZONE.roomBounds = roomData.bounds;
      window.FISH_ZONE.orientedBox = roomData.orientedBox || null;
      window.FISH_ZONE.floorY = roomData.floorY;
      // Use spawnHeight for fish ceiling so fish stay within the intended play volume
      window.FISH_ZONE.ceilingY = roomData.floorY + (roomData.spawnHeight || roomData.height);
      window.FISH_ZONE.scanned = true;
    }

    // Émettre l'événement avec les données (INCLURE orientedBox!)
    this.el.sceneEl.emit('room-scanned', {
      bounds: roomData.bounds,
      width: roomData.width,
      depth: roomData.depth,
      height: roomData.height,
      spawnHeight: roomData.spawnHeight,
      centerX: roomData.centerX,
      centerZ: roomData.centerZ,
      floorY: roomData.floorY,
      orientedBox: roomData.orientedBox || null,
      floorPlanes: this.floorPlanes,
      wallPlanes: this.wallPlanes,
      obstaclePlanes: this.obstaclePlanes,
      ceilingPlanes: this.ceilingPlanes,
      allPlanes: this.detectedPlanes
    });

    // Cacher l'UI après 3s; ne pas effacer les visualisations si debug=true
    setTimeout(() => {
      this.scanPanel.setAttribute('visible', 'false');

      if (!this.data.debug) {
        // En mode non-debug, on laisse l'effet se dissiper après 2s
        setTimeout(() => {
          this.fadeOutPlaneVisuals();
        }, 2000);
      } else {
        // En debug mode, garder les visuals visibles pour inspection
        console.log('🔍 Debug mode actif — conservation des visualisations de scan');
      }
    }, 3000);
  },

  fadeOutPlaneVisuals: function () {
    const fadeTime = 1500;
    const startTime = Date.now();

    const fade = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / fadeTime, 1);
      const opacity = 1 - progress;

      this.planeMeshes.forEach(mesh => {
        if (mesh.material) {
          mesh.material.opacity = mesh.material.opacity * opacity;
        }
      });

      if (progress < 1) {
        requestAnimationFrame(fade);
      } else {
        this.clearPlaneVisuals();
      }
    };

    fade();
  },

  // Debug helper: log horizontal candidates with their worldY and area
  logHorizontalCandidates: function(sortedCandidates) {
    if (!this.data.debug) return;
    console.log('🔎 Horizontal candidates (worldY / area):');
    sortedCandidates.forEach((c, i) => {
      const y = (c.data.worldY || 0).toFixed(2);
      const area = ((c.data.dimensions && c.data.dimensions.area) || 0).toFixed(2);
      console.log(`   ${i}: y=${y}m | area=${area}m²`);
    });
  },

  // Debug helper: create a short pulsing highlight on the detected floor polygon
  highlightDetectedFloor: function(floorData) {
    if (!floorData || !floorData.polygon || !floorData.pose) return;
    // Create shape geometry from polygon local coords
    const polygon = floorData.polygon;
    const matrix = new THREE.Matrix4();
    matrix.fromArray(floorData.pose.transform.matrix);

    const shape = new THREE.Shape();
    shape.moveTo(polygon[0].x, polygon[0].z);
    for (let i = 1; i < polygon.length; i++) shape.lineTo(polygon[i].x, polygon[i].z);
    shape.closePath();

    const geom = new THREE.ShapeGeometry(shape);
    geom.rotateX(-Math.PI / 2);

    const mat = new THREE.MeshBasicMaterial({ color: 0x8a2be2, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.matrixAutoUpdate = false;
    mesh.matrix.copy(matrix);
    mesh.name = 'debug-floor-highlight';

    this.el.sceneEl.object3D.add(mesh);
    this.planeMeshes.push(mesh);

    // Pulse opacity a few times then remove
    let pulses = 0;
    const maxPulses = 4;
    const pulseInterval = 350;
    const intervalId = setInterval(() => {
      mesh.material.opacity = mesh.material.opacity === 0.25 ? 0.65 : 0.25;
      pulses++;
      if (pulses >= maxPulses) {
        clearInterval(intervalId);
        try {
          this.el.sceneEl.object3D.remove(mesh);
          const idx = this.planeMeshes.indexOf(mesh);
          if (idx >= 0) this.planeMeshes.splice(idx, 1);
          if (mesh.geometry) mesh.geometry.dispose();
          if (mesh.material) mesh.material.dispose();
        } catch (e) { /* ignore */ }
      }
    }, pulseInterval);
  },

  remove: function () {
    this.isScanning = false;
    this.clearPlaneVisuals();
  }
});
