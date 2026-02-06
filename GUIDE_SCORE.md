## 🎣 Guide - Système de Score et Fin de Partie

### Comment ça fonctionne ?

#### 1. **Lancer une partie**
- Cliquez sur le bouton **"Lancer la partie ▶️"** pour démarrer le chronomètre
- Le jeu dure **60 secondes** (1 minute)
- Un chronomètre s'affiche en haut à droite et compte à rebours

#### 2. **Attraper des poissons**
- Pendant la partie, attrapez des poissons avec votre canne
- **+1 point** pour un poisson normal
- **+10 points** pour le poisson bonus (celui affiché dans le tableau)
- Chaque poisson attrapé s'enregistre automatiquement

#### 3. **Fin de la partie**
- Quand le chronomètre atteint **0:00**, l'écran de fin s'affiche automatiquement
- Un **tableau récapitulatif** apparaît avec :
  - Numéro du poisson
  - Type (Piranha 🐠 ou Poisson 🐟)
  - Statut (BONUS ⭐ ou Normal)
  - Points gagnés
  - Heure de la capture
  - **Total final** en bas du tableau

#### 4. **Actions après la partie**
- **🔄 Rejouer** : Réinitialise le jeu et peut recommencer une partie
- **❌ Quitter** : Ferme l'écran de fin

### Architecture du système

**Fichiers importants :**

1. **`src/systems/game-timer.js`** - Gestion du chronomètre et de l'écran de fin
   - `startGame()` : Lance le chronomètre
   - `addCaughtFish()` : Enregistre les poissons attrapés
   - `endGame()` : Arrête le jeu et affiche le tableau

2. **`src/components/grab-manager.js`** - Appelle le timer quand un poisson est attrapé

3. **`src/systems/game-manager.js`** - Gère les boutons de contrôle

4. **`src/styles/style.css`** - Styles du tableau et du chronomètre

### Variables globales

```javascript
window.gameTimer.getTotalScore()  // Récupère le score total
window.gameTimer.getCaughtFishes()  // Récupère la liste des poissons attrapés
window.gameTimer.isGameActive()  // Vérifie si le jeu est en cours
```

### Personnalisation

**Changer la durée de la partie :**
- Dans `game-timer.js`, ligne ~7 :
```javascript
let timeRemaining = 60; // Changez 60 par le nombre de secondes désiré
```

**Changer les points :**
- Dans `grab-manager.js`, ligne qui dit `const pointsEarned = isBonus ? 10 : 1;`
- Modifiez `10` (bonus) et `1` (normal)

**Ajouter plus d'infos au tableau :**
- Modifiez la fonction `populateScoreTable()` dans `game-timer.js`

### 🐛 Débogage

Ouvrez la console du navigateur (F12) pour voir :
- `🎮 Jeu lancé! Durée: 60 secondes`
- `🐟 Poisson ajouté: ...`
- `🏁 Fin du jeu!`
- `📊 Affichage de l'écran de fin`
