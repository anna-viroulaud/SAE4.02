# 🎣 Guide - Système de Score et Fin de Partie

## ✅ Intégration terminée !

Le système de score et de chronomètre a été intégré dans ton projet. Voici comment ça fonctionne :

---

## 🎮 Comment ça marche ?

### 1. **Scanner la pièce**
- Lance le mode AR avec le bouton "Entrer en AR 🥽"
- Regarde autour de toi et pointe les surfaces avec la manette
- Le système détecte automatiquement le sol, les murs et les obstacles
- Un panneau affiche la progression du scan

### 2. **Bouton de démarrage**
- Une fois le scan terminé (après ~15 secondes), un **bouton vert "LANCER LA PARTIE ▶️"** apparaît
- **Sur PC** : Le bouton apparaît au centre de l'écran
- **En VR** : Le bouton apparaît en 3D devant toi
- Clique dessus pour démarrer la partie !

### 3. **Jouer la partie**
- Le chronomètre démarre : **60 secondes pour attraper des poissons !**
- Tous les éléments deviennent visibles :
  - ⏱️ Chronomètre (en haut à droite sur PC, flottant en VR)
  - 🐠 Poisson bonus à attraper (panneau jaune)
  - 📊 Score en temps réel
  - 🌊 L'eau monte progressivement
  - 🔱 La lance (harpon) pour attraper les poissons
  - 🐟 Les poissons apparaissent dans ta zone

### 4. **Attraper des poissons**
- Utilise la lance pour toucher les poissons
- **Poisson normal** 🐟 : +1 point
- **Poisson bonus** 🐠 (Piranha) : +10 points ⭐
- Les poissons attrapés disparaissent et sont enregistrés

### 5. **Fin de la partie**
- Quand le chronomètre atteint **0:00**, l'écran de fin s'affiche automatiquement
- Un **tableau récapitulatif** apparaît avec :
  - Type de poisson (🐠 Piranha ou 🐟 Poisson)
  - Quantité attrapée
  - Points gagnés
  - **Statut bonus** (⭐ si c'était le poisson à attraper)
  - **Score total** en bas du tableau

### 6. **Actions après la partie**
- **🔄 Rejouer** : Recommence une nouvelle partie (réinitialise tout)
- **❌ Quitter** : Ferme l'écran de fin

---

## 📁 Fichiers modifiés/créés

### ✅ Fichiers créés
- **`src/systems/game-timer.js`** - Système de chronomètre et gestion de fin de partie

### ✅ Fichiers modifiés
- **`src/components/grab-manager.js`** - Détection des poissons attrapés + enregistrement dans le score
- **`src/components/room-detection.js`** - Affichage du bouton de démarrage après le scan
- **`index.html`** - Ajout des éléments UI (chronomètre, boutons, écran de fin)
- **`src/styles/style.css`** - Styles pour tous les nouveaux éléments

---

## 🎯 Logique du jeu

### Points actuels
- **Poisson normal** : +1 point
- **Poisson bonus** : +10 points (actuellement désactivé, à implémenter)

### TODO : Système de poisson bonus
Pour activer le système de bonus, il faut :
1. Choisir aléatoirement un type de poisson comme "bonus" au début de chaque partie
2. Afficher ce poisson dans le panneau jaune "POISSON BONUS"
3. Dans `grab-manager.js`, détecter si le poisson attrapé correspond au bonus

**Exemple de modification dans `grab-manager.js` (lignes ~500) :**
```javascript
// Au lieu de :
const isBonus = false;

// Faire :
const isBonus = (fishType === window.gameTimer.getCurrentBonusFish());
```

Et ajouter dans `game-timer.js` :
```javascript
currentBonusFish: 'piranha', // ou 'poisson'

getCurrentBonusFish: function() {
  return this.currentBonusFish;
},

// Dans startGame(), choisir un bonus aléatoire
this.currentBonusFish = Math.random() > 0.5 ? 'piranha' : 'poisson';
```

---

## 🔧 Personnalisation

### Changer la durée de la partie
Dans **`src/systems/game-timer.js`**, ligne ~7 :
```javascript
let timeRemaining = 60; // Changer pour 30, 120, etc.
```

### Changer les points
Dans **`src/components/grab-manager.js`**, chercher :
```javascript
const pointsEarned = isBonus ? 10 : 1;
```
Modifier `10` (points bonus) et `1` (points normal)

### Masquer/afficher différents éléments
Dans **`src/systems/game-timer.js`**, fonction `startGame()` :
- Commenter les lignes pour masquer certains éléments
- Ajouter d'autres éléments à afficher

---

## 🐛 Débogage

Ouvre la **console du navigateur** (F12) pour voir les logs :

```
✅ Système de chronomètre chargé
🎮 Affichage du bouton de démarrage
▶️ Lancement de la partie
🎮 Jeu lancé! Durée: 60 secondes
🎯 Poisson attrapé!
🐟 Poisson ajouté: poisson (NORMAL) +1pts - Total: 1
🏁 Fin du jeu!
📊 Affichage de l'écran de fin
```

### Messages d'erreur possibles
- `⚠️ Partie non démarrée - poisson ignoré` : Tu as attrapé un poisson avant de lancer la partie
- `window.gameTimer is not defined` : Le fichier `game-timer.js` n'est pas chargé

---

## 🎨 Interface

### Sur PC
- ⏱️ **Chronomètre** : En haut à droite (jaune doré)
- 🎮 **Bouton start** : Au centre de l'écran (vert)
- 📊 **Écran de fin** : Overlay plein écran avec tableau

### En VR/AR
- ⏱️ **Chronomètre** : Panneau 3D flottant en haut à droite
- 🐠 **Poisson bonus** : Panneau 3D flottant en haut à gauche
- 📊 **Score** : Panneau 3D flottant au centre
- 🎮 **Bouton start** : Panneau 3D cliquable devant toi
- 🏁 **Écran de fin** : Panneau 3D avec tableau structuré

---

## 🚀 Améliorations futures possibles

1. **Système de poisson bonus dynamique** - Changer le poisson cible toutes les X captures
2. **Combos** - Multiplier les points si plusieurs captures rapides
3. **Niveaux de difficulté** - Vitesse des poissons, durée, points
4. **Power-ups** - Ralentir le temps, attraper plusieurs poissons à la fois
5. **Leaderboard** - Sauvegarder les meilleurs scores (localStorage ou backend)
6. **Sons** - Effets sonores pour les captures, chronomètre, fin de partie
7. **Vibrations haptiques** - Retour tactile sur le contrôleur lors des captures

---

## 📊 Variables globales disponibles

```javascript
// Vérifier si le jeu est en cours
window.gameTimer.isGameActive()  // true ou false

// Récupérer le score total
window.gameTimer.getTotalScore()  // nombre

// Récupérer la liste des poissons attrapés
window.gameTimer.getCaughtFishes()  // array

// Lancer une partie
window.gameTimer.startGame()

// Terminer une partie
window.gameTimer.endGame()

// Réinitialiser le jeu
window.gameTimer.resetGame()
```

---

## ✨ Bon jeu !

Tout est prêt ! Lance le serveur, entre en AR, scanne ta pièce, clique sur le bouton de démarrage et attrape un maximum de poissons en 60 secondes ! 🎣🐟🐠
