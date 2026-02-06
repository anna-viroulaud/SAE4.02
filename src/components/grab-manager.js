// Simple grab system: spear follows hand position without reparenting
AFRAME.registerComponent('grab-manager', {
  init: function () {
    this.grabRadius = 0.4; // meters
    this.grabbedSpear = null;
    this.grabbingHand = null;
    this.offset = new AFRAME.THREE.Vector3(0, 0, -0.2);
    this.collisionRadius = 0.18; // Distance for spear-fish collision (smaller hitbox)
    this.fishCaught = 0; // Compteur de poissons attrapés
    this.points = 0; // Compteur de points
    
    const scene = this.el.sceneEl;
    
    // Wait for scene load
    scene.addEventListener('loaded', () => {
      // Support both hand-controls and platform-specific controller components
      const hands = scene.querySelectorAll('a-entity[hand-controls], a-entity[oculus-touch-controls]');
      console.log('✅ Grab manager found hands:', hands.length);
      
      hands.forEach((hand) => {
        hand.addEventListener('triggerdown', () => {
          this.tryGrab(hand);
        });
        
        hand.addEventListener('triggerup', () => {
          this.tryRelease(hand);
        });
      });
    });
  },

  tryGrab: function (hand) {
    if (this.grabbedSpear) return; // Already holding something
    
    const THREE = AFRAME.THREE;
    const handPos = new THREE.Vector3();
    hand.object3D.getWorldPosition(handPos);
    
    // Find nearest fish
    const scene = this.el.sceneEl;
    const fishes = Array.from(scene.querySelectorAll('.fish'));
    
    let nearest = null;
    let minDist = Infinity;
    
    fishes.forEach((fish) => {
      const fishPos = new THREE.Vector3();
      fish.object3D.getWorldPosition(fishPos);
      const dist = handPos.distanceTo(fishPos);
      
      if (dist < minDist) {
        minDist = dist;
        nearest = fish;
      }
    });
    
    if (nearest && minDist < this.grabRadius) {
      this.grabbedSpear = nearest;
      this.grabbingHand = hand;
      console.log('🎣 Grabbed spear with hand:', hand.id, 'distance:', minDist.toFixed(2));
    } else {
      console.log('❌ No spear in range. Distance:', minDist.toFixed(2));
    }
  },

  tryRelease: function (hand) {
    if (this.grabbingHand === hand && this.grabbedSpear) {
      console.log('📤 Released spear');
      this.grabbedSpear = null;
      this.grabbingHand = null;
    }
  },

  tick: function () {
    if (!this.grabbedSpear || !this.grabbingHand) return;
    
    const THREE = AFRAME.THREE;
    
    // Get hand world position and rotation
    const handPos = new THREE.Vector3();
    const handQuat = new THREE.Quaternion();
    this.grabbingHand.object3D.getWorldPosition(handPos);
    this.grabbingHand.object3D.getWorldQuaternion(handQuat);
    
    // Apply offset in hand's local space
    const offsetWorld = this.offset.clone().applyQuaternion(handQuat);
    const targetPos = handPos.clone().add(offsetWorld);
    
    // Move spear to follow hand
    this.grabbedSpear.object3D.position.copy(targetPos);
    
    // Rotate spear 180 degrees on Y axis to flip it
    const flipRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
    this.grabbedSpear.object3D.quaternion.copy(handQuat).multiply(flipRotation);
    
    // Check collision with fish targets
    this.checkFishCollision();
  },
  
  checkFishCollision: function () {
    if (!this.grabbedSpear) return;
    
    const THREE = AFRAME.THREE;
    const spearPos = new THREE.Vector3();
    this.grabbedSpear.object3D.getWorldPosition(spearPos);
    
    // Obtenir la position de la pointe du harpon (en avant du centre du harpon)
    const spearQuat = new THREE.Quaternion();
    this.grabbedSpear.object3D.getWorldQuaternion(spearQuat);
    const forward = new THREE.Vector3(0, 0, 0.2).applyQuaternion(spearQuat);
    const tipPos = spearPos.clone().add(forward);
    
    // Vérifier tous les poissons cibles
    const scene = this.el.sceneEl;
    const fishTargets = Array.from(scene.querySelectorAll('.fish-target'));
    
    fishTargets.forEach((fish) => {
      // Vérifier si le poisson a déjà été attrapé
      if (fish.dataset.caught) return;
      
      const fishPos = new THREE.Vector3();
      fish.object3D.getWorldPosition(fishPos);
      const distance = tipPos.distanceTo(fishPos);
      
      if (distance < this.collisionRadius) {
        // Marquer le poisson comme attrapé pour éviter de compter plusieurs fois
        fish.dataset.caught = 'true';
        
        // Récupérer le TYPE de poisson attrapé
        const caughtFishType = fish.getAttribute('data-fish-type');
        
        // Récupérer le poisson bonus actuel
        const bonusFishEntity = scene.querySelector('#fish-3d');
        let bonusFishType = null;
        
        if (bonusFishEntity) {
          const bonusFishRotator = bonusFishEntity.components['fish-rotator'];
          
          if (bonusFishRotator) {
            bonusFishType = bonusFishRotator.getCurrentFish();
          } else {
            console.log('⚠️ Composant fish-rotator pas encore initialisé');
            // Fallback: déterminer le type à partir du modèle
            const model = bonusFishEntity.getAttribute('gltf-model');
            bonusFishType = model === '#piranha' ? 'piranha' : 'low_poly_fish';
          }
        }
        
        console.log('🔍 Vérification bonus:');
        console.log('   - Type de poisson attrapé:', caughtFishType);
        console.log('   - Type de poisson bonus:', bonusFishType);
        
        // Vérifier si c'est le bon poisson (celui à pêcher)
        const isCorrect = (caughtFishType === bonusFishType);
        const pointsEarned = isCorrect ? 10 : -5;
        
        this.fishCaught++;
        this.points += pointsEarned;
        
        // Enregistrer le poisson dans le système de chronomètre
        if (window.gameTimer && window.gameTimer.isGameActive()) {
          window.gameTimer.addCaughtFish(caughtFishType, isCorrect, pointsEarned);
        }
        
        if (isCorrect) {
          console.log('✅ BON POISSON! +10 points');
          // Changer immédiatement le poisson cible
          if (bonusFishEntity) {
            const bonusFishRotator = bonusFishEntity.components['fish-rotator'];
            if (bonusFishRotator) {
              bonusFishRotator.nextFish();
            }
          }
        } else {
          console.log('❌ MAUVAIS POISSON! -5 points');
        }
        
        console.log('Total:', this.fishCaught, 'poissons |', this.points, 'points');
        
        // Mettre à jour l'affichage du score
        const scoreDisplay = this.el.sceneEl.querySelector('#score-display');
        if (scoreDisplay) {
          scoreDisplay.setAttribute('value', `Poissons: ${this.fishCaught} | Points: ${this.points}`);
        }
        
        // Faire disparaître le poisson (mais ne pas le supprimer du DOM)
        fish.setAttribute('visible', 'false');
      }
    });
  }
});
