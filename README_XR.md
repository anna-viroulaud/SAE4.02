# 🎣 Jeu de Pêche en XR (Réalité Mixte) - Quest 3

## 🎯 Qu'est-ce que la XR ?

**XR = Réalité Étendue** (Extended Reality)
- **VR** : Monde 100% virtuel
- **AR** : Superposition d'éléments virtuels dans le monde réel via les caméras
- **XR/MR** : Les deux combinés - objets virtuels ancrés dans l'espace réel

## 🆕 Changements VR → XR

### Ce qui a été RETIRÉ (car on voit le monde réel)
- ❌ `<a-sky>` : Le ciel virtuel
- ❌ `<a-fog>` : Le brouillard
- ❌ `<a-plane>` : Le plan d'eau virtuel
- ❌ `water-visual` : L'effet de rayons lumineux

### Ce qui a été AJOUTÉ pour l'AR
- ✅ `webxr="requiredFeatures: hit-test,local-floor"` : Active le mode AR
- ✅ `ar-hit-test.js` : Permet de placer la zone de jeu en tapant sur une surface réelle
- ✅ Réticule vert : Montre où vous allez placer la zone de jeu

### Ce qui a été ADAPTÉ
- ✅ `fish-spawner.js` : Les poissons apparaissent autour du point que vous placez (pas autour de votre tête)
- ✅ Lumières : Augmentées pour mieux voir les poissons dans l'espace réel

## 🎮 Comment jouer

1. **Lancer en mode AR sur le Quest 3**
   - Ouvrir le navigateur du Quest 3
   - Aller sur l'URL HTTPS de l'application
   - Appuyer sur le bouton "Enter AR" (pas "Enter VR")

2. **Placer la zone de jeu**
   - Tu verras un **réticule vert** (anneau)
   - Pointer vers une **surface plane** (table, sol, mur)
   - Le réticule s'affiche quand une surface est détectée
   - **Taper sur le trigger** pour placer la zone de jeu

3. **Les poissons apparaissent**
   - 8 poissons koi volent autour du point placé
   - Ils sont ancrés dans ton espace réel
   - Bouge autour d'eux pour les voir sous différents angles

4. **Utiliser le harpon**
   - Même fonctionnement qu'en VR
   - **Grip** pour attraper/lâcher le harpon
   - **Trigger** pour vibration haptique

## 🔧 Fichiers modifiés

### Nouveaux fichiers
- `src/components/ar-hit-test.js` : Gestion du placement AR avec hit-test

### Fichiers modifiés
- `index.html` :
  - Ajout de `webxr` sur `<a-scene>`
  - Retrait du sky, fog, water plane
  - Ajout du composant `ar-hit-test`
- `src/components/fish-spawner.js` :
  - Attente de l'événement `start-spawning`
  - Spawn relatif à la position du spawner (ancre AR)
- `src/main.js` :
  - Import de `ar-hit-test.js` au lieu de `water-visual.js`

## 🧪 Tester

```bash
npm run dev:https
```

Puis sur le Quest 3 :
1. Activer le mode développeur
2. Autoriser les sources inconnues
3. Naviguer vers l'URL HTTPS
4. Cliquer sur "Enter AR" (pas VR !)

## 💡 Différences techniques VR vs XR

| Aspect | VR (ancien) | XR/AR (nouveau) |
|--------|------------|-----------------|
| **Environnement** | Monde virtuel complet | Monde réel avec éléments virtuels |
| **Caméra** | Passthrough désactivé | Passthrough activé (caméras) |
| **Placement** | Objets en coordonnées fixes | Placement via hit-test sur surfaces |
| **Ancrage** | Aucun | Objets ancrés dans l'espace réel |
| **Spawn** | Autour de la tête (y=1.6) | Autour d'un point placé par l'utilisateur |
| **Lumières** | Ambiante faible | Ambiante forte (éclairage réel) |

## 🎨 Améliorations possibles

- Ajouter un tableau de bord 2D (DOM overlay) pour le score
- Permettre de replacer la zone de jeu (double-tap)
- Ajouter des ombres portées sur les surfaces réelles
- Occlusion : cacher les poissons derrière les objets réels
- Multiples zones de jeu (plusieurs ancres)

## 📚 Ressources

- [WebXR Hit-Test](https://immersive-web.github.io/hit-test/)
- [A-Frame AR Mode](https://aframe.io/docs/1.5.0/introduction/webxr.html)
- [Meta Quest 3 AR Capabilities](https://developer.oculus.com/documentation/web/webxr-ar/)

---

**Note** : Le mode AR nécessite que le Quest 3 soit en mode développeur et que les caméras passthrough soient autorisées.
