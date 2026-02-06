// Game manager system: handles UI buttons and AR session entry
(function () {
  // Wait until DOM ready
  function initARButton() {
    const arButton = document.getElementById('ar-button');
    const startGameButton = document.getElementById('start-game-button');
    const restartButton = document.getElementById('btn-restart');
    const quitButton = document.getElementById('btn-quit');
    const scene = document.querySelector('a-scene');
    
    if (!arButton || !scene) return;

    // --- Gestion des boutons 3D en VR ---
    scene.addEventListener('loaded', () => {
      // Bouton Lancer la partie 3D
      const startButton3D = document.querySelector('#start-button-3d');
      if (startButton3D) {
        startButton3D.addEventListener('click', function () {
          console.log('▶️ Bouton Lancer la partie 3D cliqué');
          if (window.gameTimer) {
            window.gameTimer.startGame();
            
            // Masquer le bouton de démarrage 3D
            startButton3D.setAttribute('visible', 'false');
            
            // Désactiver aussi le bouton HTML si visible
            if (startGameButton) {
              startGameButton.style.opacity = '0.5';
              startGameButton.disabled = true;
            }
          }
        });
      }
      
      // Bouton Rejouer 3D
      const btnRestart3D = document.querySelector('#btn-restart-3d');
      if (btnRestart3D) {
        btnRestart3D.addEventListener('click', function () {
          console.log('🔄 Bouton Rejouer 3D cliqué');
          if (window.gameTimer) {
            window.gameTimer.resetGame();
            // Redémarrer le jeu directement
            setTimeout(() => {
              window.gameTimer.startGame();
            }, 100);
            
            // Masquer le bouton de démarrage 3D
            if (startButton3D) {
              startButton3D.setAttribute('visible', 'false');
            }
            
            // Désactiver le bouton HTML
            if (startGameButton) {
              startGameButton.style.opacity = '0.5';
              startGameButton.disabled = true;
            }
          }
        });
      }
      
      // Bouton Quitter 3D (retour au menu)
      const btnQuit3D = document.querySelector('#btn-quit-3d');
      if (btnQuit3D) {
        btnQuit3D.addEventListener('click', function () {
          console.log('❌ Bouton Quitter 3D cliqué - retour au menu');
          if (window.gameTimer) {
            window.gameTimer.resetGame();
            
            // Réafficher le bouton de démarrage 3D (retour au menu)
            if (startButton3D) {
              startButton3D.setAttribute('visible', 'true');
            }
            
            // Réactiver le bouton HTML
            if (startGameButton) {
              startGameButton.style.opacity = '1';
              startGameButton.disabled = false;
            }
          }
        });
      }
    });

    // --- Bouton AR ---
    arButton.addEventListener('click', async function () {
      if (!navigator.xr) {
        alert('WebXR non supporté sur ce navigateur');
        return;
      }

      const isArSupported = await navigator.xr.isSessionSupported('immersive-ar');
      if (!isArSupported) {
        alert('Mode AR non supporté. Utilisez un Quest 3 ou un appareil compatible.');
        return;
      }

      try {
        scene.enterAR();
        
        // Masquer les éléments de l'overlay HTML
        arButton.style.display = 'none';
        if (startGameButton) startGameButton.style.display = 'none';
        
        // Masquer tout l'overlay AR pour éviter la duplication
        const arOverlay = document.getElementById('ar-overlay');
        if (arOverlay) arOverlay.style.display = 'none';

        scene.addEventListener('exit-vr', function onExitAR() {
          arButton.style.display = 'block';
          if (startGameButton) startGameButton.style.display = 'block';
          if (arOverlay) arOverlay.style.display = 'flex';
          scene.removeEventListener('exit-vr', onExitAR);
        });

        console.log('Mode AR activé - passthrough actif !');
      } catch (err) {
        console.error('Erreur lors du lancement AR:', err);
        alert('Erreur: ' + err.message);
      }
    });

    // --- Bouton Lancer la partie ---
    if (startGameButton) {
      startGameButton.addEventListener('click', function () {
        if (window.gameTimer) {
          window.gameTimer.startGame();
          startGameButton.style.opacity = '0.5';
          startGameButton.disabled = true;
          
          // Masquer aussi le bouton 3D en VR
          const startButton3D = document.querySelector('#start-button-3d');
          if (startButton3D) {
            startButton3D.setAttribute('visible', 'false');
          }
        }
      });
    }

    // --- Bouton Rejouer (HTML) ---
    if (restartButton) {
      restartButton.addEventListener('click', function () {
        if (window.gameTimer) {
          window.gameTimer.resetGame();
          // Redémarrer le jeu directement
          setTimeout(() => {
            window.gameTimer.startGame();
          }, 100);
          
          // Désactiver le bouton "Lancer la partie"
          if (startGameButton) {
            startGameButton.style.opacity = '0.5';
            startGameButton.disabled = true;
          }
        }
      });
    }

    // --- Bouton Quitter (HTML) - retour au menu ---
    if (quitButton) {
      quitButton.addEventListener('click', function () {
        if (window.gameTimer) {
          window.gameTimer.resetGame();
          
          // Réactiver le bouton "Lancer la partie" (retour au menu)
          if (startGameButton) {
            startGameButton.style.opacity = '1';
            startGameButton.disabled = false;
          }
        }
      });
    }

    // Hide or disable button if AR not supported
    scene.addEventListener('loaded', async function () {
      if (navigator.xr) {
        const isArSupported = await navigator.xr.isSessionSupported('immersive-ar');
        if (!isArSupported) {
          arButton.textContent = 'AR non disponible';
          arButton.disabled = true;
        }
      } else {
        arButton.textContent = 'WebXR non supporté';
        arButton.disabled = true;
      }
    });
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(initARButton, 0);
  } else {
    document.addEventListener('DOMContentLoaded', initARButton);
  }
})();
