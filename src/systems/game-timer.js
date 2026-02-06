// Système de chronomètre et gestion de la fin de jeu
(function () {
  let gameActive = false;
  let timeRemaining = 60; // 60 secondes
  let caughtFishes = []; // Historique des poissons attrapés
  let totalScore = 0;

  window.gameTimer = {
    startGame: function () {
      gameActive = true;
      timeRemaining = 60;
      caughtFishes = [];
      totalScore = 0;
      
      // Afficher tous les éléments de jeu
      // Chronomètre HTML
      const timerDisplay = document.getElementById('timer-display');
      if (timerDisplay) {
        timerDisplay.style.display = 'block';
      }
      
      // Afficher le chronomètre 3D en VR
      const timer3D = document.querySelector('#timer-3d');
      if (timer3D) {
        timer3D.setAttribute('visible', 'true');
      }
      
      // Afficher le panneau du poisson à pêcher
      const bonusFish = document.querySelector('#bonus-fish');
      if (bonusFish) {
        bonusFish.setAttribute('visible', 'true');
      }
      
      // Afficher le compteur de score
      const scoreDisplay = document.querySelector('#score-display');
      if (scoreDisplay) {
        scoreDisplay.setAttribute('visible', 'true');
      }
      
      // Afficher et démarrer l'animation de l'eau
      const waterSurface = document.querySelector('#water-surface');
      if (waterSurface) {
        waterSurface.setAttribute('visible', 'true');
        // Démarrer l'animation de montée d'eau
        const animation = waterSurface.components.animation;
        if (animation) {
          animation.beginAnimation();
        }
      }
      
      // Afficher les bulles
      const bubbles = document.querySelector('#bubble-spawner');
      if (bubbles) {
        bubbles.setAttribute('visible', 'true');
      }
      
      // Afficher la lance
      const spear = document.querySelector('#spear');
      if (spear) {
        spear.setAttribute('visible', 'true');
      }
      
      // Afficher tous les poissons fish-target
      const fishTargets = document.querySelectorAll('.fish-target');
      fishTargets.forEach(fish => {
        fish.setAttribute('visible', 'true');
      });
      
      // Activer le spawning des poissons
      const fishSpawner = document.querySelector('[fish-spawner]');
      if (fishSpawner && fishSpawner.components['fish-spawner']) {
        const spawner = fishSpawner.components['fish-spawner'];
        if (spawner.fishes) {
          spawner.fishes.forEach(fish => {
            fish.setAttribute('visible', 'true');
          });
        }
      }
      
      // Mettre à jour l'affichage du temps
      this.updateTimerDisplay();

      // Choisir un poisson bonus aléatoire et le marquer
      try {
        const available = Array.from(document.querySelectorAll('.fish-target'));
        if (available && available.length > 0) {
          // clear previous bonuses
          available.forEach(f => { delete f.dataset.bonus; f.classList.remove && f.classList.remove('fish-bonus'); });
          const idx = Math.floor(Math.random() * available.length);
          const bonusFishEl = available[idx];
          if (bonusFishEl) {
            bonusFishEl.dataset.bonus = 'true';
            bonusFishEl.classList.add && bonusFishEl.classList.add('fish-bonus');
            // Update the 3D bonus panel text to show type
            const bonusPanelText = document.querySelector('#bonus-fish a-text');
            const fishType = bonusFishEl.classList.contains('fish-piranha') ? 'PIRANHA' : 'POISSON';
            const icon = bonusFishEl.classList.contains('fish-piranha') ? '🐠' : '🐟';
            if (bonusPanelText) {
              bonusPanelText.setAttribute('value', `${icon} BONUS\n${fishType}`);
            }
          }
        }
      } catch (e) { console.warn('Erreur lors du choix du poisson bonus', e); }
      
      // Boucle du chronomètre
      this.timerInterval = setInterval(() => {
        timeRemaining--;
        this.updateTimerDisplay();
        
        if (timeRemaining <= 0) {
          this.endGame();
        }
      }, 1000);
      
      console.log('🎮 Jeu lancé! Durée: 60 secondes');
    },
    
    updateTimerDisplay: function () {
      const minutes = Math.floor(timeRemaining / 60);
      const seconds = timeRemaining % 60;
      const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      
      // Mise à jour HTML (pour PC)
      const timerDisplay = document.getElementById('timer-display');
      if (timerDisplay) {
        timerDisplay.textContent = timeString;
        
        // Changer de couleur si moins de 10 secondes
        if (timeRemaining <= 10) {
          timerDisplay.style.color = '#e74c3c';
        } else {
          timerDisplay.style.color = '#FFD700';
        }
      }
      
      // Mise à jour 3D (pour VR/AR)
      const timerText3D = document.querySelector('#timer-text');
      if (timerText3D) {
        timerText3D.setAttribute('value', timeString);
        
        // Changer de couleur en VR aussi
        if (timeRemaining <= 10) {
          timerText3D.setAttribute('color', '#e74c3c');
        } else {
          timerText3D.setAttribute('color', '#FFD700');
        }
      }
    },
    
    addCaughtFish: function (fishType, isBonus, points) {
      caughtFishes.push({
        type: fishType,
        isBonus: isBonus,
        points: points,
        timestamp: new Date().toLocaleTimeString('fr-FR', { 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit' 
        })
      });
      
      totalScore += points;
      console.log(`🐟 Poisson ajouté: ${fishType} (${isBonus ? 'BONUS' : 'NORMAL'}) +${points}pts - Total: ${totalScore}`);

      // Mettre à jour l'affichage du score (3D)
      const scoreDisplay = document.querySelector('#score-display');
      if (scoreDisplay) {
        // Prefer updating the child a-text if present
        const textChild = scoreDisplay.querySelector && scoreDisplay.querySelector('a-text');
        const value = `Poissons: ${caughtFishes.length} | Score: ${totalScore}`;
        if (textChild) {
          textChild.setAttribute('value', value);
        } else {
          // fallback: set attribute on container (legacy)
          scoreDisplay.setAttribute('value', value);
        }
      }

      // Mettre à jour aussi l'affichage HTML (au cas où)
      const htmlScore = document.getElementById('timer-display');
      if (htmlScore) {
        // keep timer-display for time; also show a small console-style update nearby if desired
      }
    },
    
    endGame: function () {
      gameActive = false;
      clearInterval(this.timerInterval);
      console.log('🏁 Fin du jeu!');
      
      // Afficher le tableau récapitulatif
      this.showEndGameScreen();
    },
    
    showEndGameScreen: function () {
      // Masquer le chronomètre
      const timer3D = document.querySelector('#timer-3d');
      if (timer3D) {
        timer3D.setAttribute('visible', 'false');
      }
      
      // Masquer le panneau bonus
      const bonusFish = document.querySelector('#bonus-fish');
      if (bonusFish) {
        bonusFish.setAttribute('visible', 'false');
      }
      
      // Masquer le texte de score/poissons attrapés
      const scoreDisplay = document.querySelector('#score-display');
      if (scoreDisplay) {
        scoreDisplay.setAttribute('visible', 'false');
      }
      
      // Afficher l'écran de fin 3D (VR)
      const endScreen3D = document.querySelector('#end-screen-3d');
      if (endScreen3D) {
        endScreen3D.setAttribute('visible', 'true');
        this.populateScoreTable3D();
      }
      
      // Afficher l'écran HTML (PC)
      const endGameScreen = document.getElementById('end-game-screen');
      if (endGameScreen) {
        this.populateScoreTable();
        endGameScreen.style.display = 'flex';
      }
      
      console.log('📊 Affichage de l\'écran de fin');
    },
    
    populateScoreTable: function () {
      const tableBody = document.getElementById('score-table-body');
      
      if (!tableBody) return;
      
      tableBody.innerHTML = '';
      
      // Si aucun poisson attrapé
      if (caughtFishes.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `
          <td colspan="3" style="text-align: center; color: #999;">
            😢 Aucun poisson attrapé...
          </td>
        `;
        tableBody.appendChild(emptyRow);
        return;
      }
      
      // Regrouper les poissons par type et statut (bonus/normal)
      const fishGroups = {};
      
      caughtFishes.forEach(fish => {
        const key = `${fish.type}_${fish.isBonus ? 'bonus' : 'normal'}`;
        if (!fishGroups[key]) {
          const fishName = fish.type === 'piranha' ? '🐠 Piranha' : '🐟 Poisson';
          const status = fish.isBonus ? ' ⭐' : '';
          fishGroups[key] = { 
            count: 0, 
            points: 0, 
            name: fishName + status,
            isBonus: fish.isBonus
          };
        }
        fishGroups[key].count++;
        fishGroups[key].points += fish.points;
      });
      
      // Créer les lignes du tableau
      Object.values(fishGroups).forEach(group => {
        const row = document.createElement('tr');
        row.className = group.isBonus ? 'bonus-row' : 'normal-row';
        row.innerHTML = `
          <td>${group.name}</td>
          <td>x ${group.count}</td>
          <td style="color: #00ff00">+${group.points} pts</td>
        `;
        tableBody.appendChild(row);
      });
      
      // Ajouter ligne totale
      const totalRow = document.createElement('tr');
      totalRow.className = 'total-row';
      totalRow.innerHTML = `
        <td><strong>TOTAL</strong></td>
        <td></td>
        <td style="color: #FFD700"><strong>+${totalScore} pts</strong></td>
      `;
      tableBody.appendChild(totalRow);
    },
    
    populateScoreTable3D: function () {
      // Supprimer l'ancien texte simple et créer un vrai tableau 3D structuré
      const endScreen3D = document.querySelector('#end-screen-3d');
      if (!endScreen3D) return;
      
      // Supprimer l'ancien score-list-3d s'il existe
      const oldScoreList = document.querySelector('#score-list-3d');
      if (oldScoreList) {
        oldScoreList.parentNode.removeChild(oldScoreList);
      }
      
      // Supprimer l'ancien tableau dynamique s'il existe
      const oldTable = document.querySelector('#dynamic-score-table-3d');
      if (oldTable) {
        oldTable.parentNode.removeChild(oldTable);
      }
      
      if (caughtFishes.length === 0) {
        const emptyText = document.createElement('a-text');
        emptyText.setAttribute('id', 'score-list-3d');
        emptyText.setAttribute('value', 'Aucun poisson attrapé...');
        emptyText.setAttribute('align', 'center');
        emptyText.setAttribute('color', '#999999');
        emptyText.setAttribute('width', '1.8');
        emptyText.setAttribute('position', '0 0 0');
        endScreen3D.appendChild(emptyText);
        return;
      }
      
      // Créer un conteneur pour le tableau
      const tableContainer = document.createElement('a-entity');
      tableContainer.setAttribute('id', 'dynamic-score-table-3d');
      tableContainer.setAttribute('position', '0 0.3 0.01');
      
      // Regrouper les poissons par type et statut
      const fishGroups = {};
      
      caughtFishes.forEach(fish => {
        const key = `${fish.type}_${fish.isBonus ? 'bonus' : 'normal'}`;
        if (!fishGroups[key]) {
          const fishIcon = fish.type === 'piranha' ? '🐠' : '🐟';
          const fishName = fish.type === 'piranha' ? 'Piranha' : 'Poisson';
          const status = fish.isBonus ? ' ⭐' : '';
          fishGroups[key] = { 
            count: 0, 
            points: 0, 
            name: fishIcon + ' ' + fishName + status,
            isBonus: fish.isBonus
          };
        }
        fishGroups[key].count++;
        fishGroups[key].points += fish.points;
      });
      
      // En-têtes du tableau
      const headerBg = document.createElement('a-plane');
      headerBg.setAttribute('color', '#FFD700');
      headerBg.setAttribute('opacity', '0.2');
      headerBg.setAttribute('width', '1.1');
      headerBg.setAttribute('height', '0.08');
      headerBg.setAttribute('position', '0 0 -0.01');
      tableContainer.appendChild(headerBg);
      
      const header1 = document.createElement('a-text');
      header1.setAttribute('value', 'Type de poisson');
      header1.setAttribute('align', 'left');
      header1.setAttribute('color', '#FFD700');
      header1.setAttribute('width', '1');
      header1.setAttribute('position', '-0.52 0 0');
      tableContainer.appendChild(header1);
      
      const header2 = document.createElement('a-text');
      header2.setAttribute('value', 'Quantité');
      header2.setAttribute('align', 'center');
      header2.setAttribute('color', '#FFD700');
      header2.setAttribute('width', '1');
      header2.setAttribute('position', '0 0 0');
      tableContainer.appendChild(header2);
      
      const header3 = document.createElement('a-text');
      header3.setAttribute('value', 'Points');
      header3.setAttribute('align', 'right');
      header3.setAttribute('color', '#FFD700');
      header3.setAttribute('width', '1');
      header3.setAttribute('position', '0.52 0 0');
      tableContainer.appendChild(header3);
      
      // Lignes du tableau
      let yPosition = -0.12;
      const groups = Object.values(fishGroups);
      
      groups.forEach((group, index) => {
        // Fond de ligne avec couleur selon bonus/normal
        const rowBg = document.createElement('a-plane');
        rowBg.setAttribute('color', group.isBonus ? '#FFD700' : '#ffffff');
        rowBg.setAttribute('opacity', '0.1');
        rowBg.setAttribute('width', '1.1');
        rowBg.setAttribute('height', '0.08');
        rowBg.setAttribute('position', `0 ${yPosition} -0.01`);
        tableContainer.appendChild(rowBg);
        
        // Colonne 1: Type de poisson
        const col1 = document.createElement('a-text');
        col1.setAttribute('value', group.name);
        col1.setAttribute('align', 'left');
        col1.setAttribute('color', '#ffffff');
        col1.setAttribute('width', '0.9');
        col1.setAttribute('position', `-0.52 ${yPosition} 0`);
        tableContainer.appendChild(col1);
        
        // Colonne 2: Quantité
        const col2 = document.createElement('a-text');
        col2.setAttribute('value', `x ${group.count}`);
        col2.setAttribute('align', 'center');
        col2.setAttribute('color', '#ffffff');
        col2.setAttribute('width', '1');
        col2.setAttribute('position', `0 ${yPosition} 0`);
        tableContainer.appendChild(col2);
        
        // Colonne 3: Points
        const col3 = document.createElement('a-text');
        col3.setAttribute('value', `+${group.points} pts`);
        col3.setAttribute('align', 'right');
        col3.setAttribute('color', '#00ff00');
        col3.setAttribute('width', '1');
        col3.setAttribute('position', `0.52 ${yPosition} 0`);
        tableContainer.appendChild(col3);
        
        yPosition -= 0.10;
      });
      
      // Ligne TOTAL
      yPosition -= 0.02;
      const totalBg = document.createElement('a-plane');
      totalBg.setAttribute('color', '#FFD700');
      totalBg.setAttribute('opacity', '0.25');
      totalBg.setAttribute('width', '1.1');
      totalBg.setAttribute('height', '0.09');
      totalBg.setAttribute('position', `0 ${yPosition} -0.01`);
      tableContainer.appendChild(totalBg);
      
      // Séparateur au-dessus du TOTAL
      const separator = document.createElement('a-box');
      separator.setAttribute('color', '#FFD700');
      separator.setAttribute('width', '1.1');
      separator.setAttribute('height', '0.005');
      separator.setAttribute('depth', '0.001');
      separator.setAttribute('position', `0 ${yPosition + 0.05} 0.005`);
      tableContainer.appendChild(separator);
      
      const totalLabel = document.createElement('a-text');
      totalLabel.setAttribute('value', 'TOTAL');
      totalLabel.setAttribute('align', 'left');
      totalLabel.setAttribute('color', '#FFD700');
      totalLabel.setAttribute('width', '1');
      totalLabel.setAttribute('position', `-0.52 ${yPosition} 0`);
      tableContainer.appendChild(totalLabel);
      
      const totalValue = document.createElement('a-text');
      totalValue.setAttribute('value', `+${totalScore} pts`);
      totalValue.setAttribute('align', 'right');
      totalValue.setAttribute('color', '#FFD700');
      totalValue.setAttribute('width', '1');
      totalValue.setAttribute('position', `0.52 ${yPosition} 0`);
      tableContainer.appendChild(totalValue);
      
      endScreen3D.appendChild(tableContainer);
    },
    
    resetGame: function () {
      gameActive = false;
      clearInterval(this.timerInterval);
      timeRemaining = 60;
      caughtFishes = [];
      totalScore = 0;
      
      // Masquer l'écran de fin HTML (PC)
      const endGameScreen = document.getElementById('end-game-screen');
      if (endGameScreen) {
        endGameScreen.style.display = 'none';
      }
      
      // Masquer l'écran de fin 3D (VR)
      const endScreen3D = document.querySelector('#end-screen-3d');
      if (endScreen3D) {
        endScreen3D.setAttribute('visible', 'false');
      }
      
      // Masquer le chronomètre 3D
      const timer3D = document.querySelector('#timer-3d');
      if (timer3D) {
        timer3D.setAttribute('visible', 'false');
      }
      
      // Masquer le chronomètre HTML
      const timerDisplay = document.getElementById('timer-display');
      if (timerDisplay) {
        timerDisplay.style.display = 'none';
      }
      
      // Masquer le panneau bonus
      const bonusFish = document.querySelector('#bonus-fish');
      if (bonusFish) {
        bonusFish.setAttribute('visible', 'false');
      }
      
      // Masquer le texte de score/poissons attrapés
      const scoreDisplay = document.querySelector('#score-display');
      if (scoreDisplay) {
        scoreDisplay.setAttribute('visible', 'false');
      }
      
      // Masquer et réinitialiser l'eau
      const waterSurface = document.querySelector('#water-surface');
      if (waterSurface) {
        waterSurface.setAttribute('visible', 'false');
        waterSurface.setAttribute('position', '0 0 -2');
      }
      
      // Masquer les bulles
      const bubbles = document.querySelector('#bubble-spawner');
      if (bubbles) {
        bubbles.setAttribute('visible', 'false');
      }
      
      // Masquer la lance
      const spear = document.querySelector('#spear');
      if (spear) {
        spear.setAttribute('visible', 'false');
      }
      
      // Masquer tous les poissons
      const fishSpawner = document.querySelector('[fish-spawner]');
      if (fishSpawner && fishSpawner.components['fish-spawner']) {
        const spawner = fishSpawner.components['fish-spawner'];
        if (spawner.fishes) {
          spawner.fishes.forEach(fish => {
            fish.setAttribute('visible', 'false');
          });
        }
      }
      
      // Réinitialiser l'affichage HTML
      if (timerDisplay) {
        timerDisplay.textContent = '1:00';
        timerDisplay.style.color = '#FFD700';
      }
      
      // Réinitialiser l'affichage 3D
      const timerText3D = document.querySelector('#timer-text');
      if (timerText3D) {
        timerText3D.setAttribute('value', '1:00');
        timerText3D.setAttribute('color', '#FFD700');
      }
      
      // Réinitialiser le score display
      const scoreDisplayReset = document.querySelector('#score-display');
      if (scoreDisplayReset) {
        scoreDisplayReset.setAttribute('value', 'Poissons: 0 | Score: 0');
      }
      
      // Réinitialiser le compteur du grab-manager
      const grabManager = document.querySelector('[grab-manager]');
      if (grabManager && grabManager.components['grab-manager']) {
        grabManager.components['grab-manager'].fishCaught = 0;
      }
      
      // Retirer le drapeau "caught" de tous les poissons et les masquer
      const fishTargets = document.querySelectorAll('.fish-target');
      fishTargets.forEach(fish => {
        delete fish.dataset.caught;
        // Also remove bonus flag when resetting
        delete fish.dataset.bonus;
        if (fish.classList && fish.classList.contains('fish-bonus')) fish.classList.remove('fish-bonus');
        fish.setAttribute('visible', 'false');
      });
      
      console.log('🔄 Jeu réinitialisé');
    },
    
    isGameActive: function () {
      return gameActive;
    },
    
    getCaughtFishes: function () {
      return caughtFishes;
    },
    
    getTotalScore: function () {
      return totalScore;
    }
  };
  
  console.log('✅ Système de chronomètre chargé');
})();
