// Composant pour faire tourner les modèles de poisson affichés dans le panneau BONUS
AFRAME.registerComponent('fish-rotator', {
  schema: {
    interval: { type: 'number', default: 60000 } // Intervalle en millisecondes (10 secondes par défaut)
  },

  init: function () {
    console.log('🎣 Fish rotator initialisé');
    
    // Tableau des modèles de poissons avec leurs transformations spécifiques
    this.fishModels = [
      {
        type: 'low_poly_fish',
        model: '#low_poly_fish',
        position: '0.05 0.02 0',
        rotation: '0 90 0',
        scale: '0.02 0.02 0.02'
      },
      {
        type: 'piranha',
        model: '#piranha',
        position: '0 -0.02 0',
        rotation: '0 90 0',
        scale: '0.02 0.02 0.02'
      }
    ];

    this.currentIndex = 0;
    
    // Attendre que la scène soit chargée avant de commencer la rotation
    if (this.el.sceneEl.hasLoaded) {
      this.startRotation();
    } else {
      this.el.sceneEl.addEventListener('loaded', () => {
        this.startRotation();
      });
    }
  },

  startRotation: function () {
    console.log('⏰ Démarrage de la rotation des poissons, intervalle:', this.data.interval, 'ms');
    
    // Changer de modèle toutes les X secondes
    this.interval = setInterval(() => {
      this.nextFish();
    }, this.data.interval);
  },

  getCurrentFish: function () {
    // Retourne le TYPE du poisson actuellement affiché
    return this.fishModels[this.currentIndex].type;
  },
  
  getCurrentFishModel: function () {
    // Retourne le modèle du poisson actuellement affiché
    return this.fishModels[this.currentIndex].model;
  },

  nextFish: function () {
    // Passer au poisson suivant dans le tableau
    this.currentIndex = (this.currentIndex + 1) % this.fishModels.length;
    const fishData = this.fishModels[this.currentIndex];

    // Retirer l'ancien modèle complètement avant d'ajouter le nouveau
    this.el.removeAttribute('gltf-model');
    
    // Attendre un peu avant de charger le nouveau modèle avec ses transformations
    setTimeout(() => {
      this.el.setAttribute('gltf-model', fishData.model);
      this.el.setAttribute('position', fishData.position);
      this.el.setAttribute('rotation', fishData.rotation);
      this.el.setAttribute('scale', fishData.scale);
      console.log('🐟 Nouveau poisson BONUS:', fishData.type, '(', fishData.model, ')');
    }, 100);
  },

  remove: function () {
    // Nettoyer l'intervalle quand le composant est supprimé
    if (this.interval) {
      clearInterval(this.interval);
    }
  }
});
