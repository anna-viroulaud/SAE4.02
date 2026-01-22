// Safe AR hit-test component (guarded, avoids assuming renderer/session exist)
if (!AFRAME.components['ar-hit-test']) {
  AFRAME.registerComponent('ar-hit-test', {
    init: function() {
      this.hitTestSource = null;
      this.viewerSpace = null;
      this.placed = false;
      this.lastHitPosition = null;

      // Reticle
      this.reticle = document.createElement('a-ring');
      this.reticle.setAttribute('color', '#00ff00');
      this.reticle.setAttribute('radius-inner', '0.08');
      this.reticle.setAttribute('radius-outer', '0.12');
      this.reticle.setAttribute('rotation', '-90 0 0');
      this.reticle.setAttribute('material', 'opacity: 0.8; side: double');
      this.reticle.setAttribute('visible', 'false');
      this.el.sceneEl.appendChild(this.reticle);

      this.onSessionStarted = this.onSessionStarted.bind(this);
      this.onSelect = this.onSelect.bind(this);

      this.el.sceneEl.addEventListener('enter-vr', this.onSessionStarted);
      this.el.sceneEl.addEventListener('click', this.onSelect);

      console.log('ar-hit-test component initialized (safe)');
    },

    onSessionStarted: function() {
      const sceneEl = this.el.sceneEl;
      // Try to get XR session safely
      const renderer = sceneEl && sceneEl.renderer;
      if (!renderer || !renderer.xr || !renderer.xr.getSession) return;
      const session = renderer.xr.getSession();
      if (!session) return;

      // Request viewer reference and hit test source if available
      if (session.requestReferenceSpace && session.requestHitTestSource) {
        session.requestReferenceSpace('viewer').then((viewerSpace) => {
          this.viewerSpace = viewerSpace;
          return session.requestHitTestSource({ space: this.viewerSpace });
        }).then((source) => {
          this.hitTestSource = source;
          console.log('Hit test source created');
        }).catch((err) => {
          console.warn('Hit test source not available:', err);
        });
      }
    },

    tick: function(time, delta) {
      const sceneEl = this.el.sceneEl;
      const frame = sceneEl && sceneEl.frame;

      if (this.placed) {
        if (this.reticle) this.reticle.setAttribute('visible', 'false');
        return;
      }

      if (!frame || !this.hitTestSource) return;

      try {
        const results = frame.getHitTestResults(this.hitTestSource);
        if (results && results.length > 0) {
          const pose = results[0].getPose(sceneEl.renderer.xr.getReferenceSpace());
          if (pose) {
            this.reticle.setAttribute('visible', 'true');
            this.reticle.object3D.position.set(
              pose.transform.position.x,
              pose.transform.position.y,
              pose.transform.position.z
            );
            // orient to camera
            this.reticle.object3D.quaternion.set(
              pose.transform.orientation.x,
              pose.transform.orientation.y,
              pose.transform.orientation.z,
              pose.transform.orientation.w
            );
            this.lastHitPosition = pose.transform.position;
          }
        } else {
          this.reticle.setAttribute('visible', 'false');
        }
      } catch (e) {
        // Some browsers / sessions may throw if reference space not ready
      }
    },

    onSelect: function() {
      if (this.placed) return;
      if (!this.lastHitPosition) return;
      this.placed = true;
      if (this.reticle) this.reticle.setAttribute('visible', 'false');

      const spawner = document.getElementById('fishSpawner');
      if (spawner) {
        spawner.setAttribute('position', `${this.lastHitPosition.x} ${this.lastHitPosition.y} ${this.lastHitPosition.z}`);
        spawner.emit('start-spawning');
      }
      console.log('Zone de jeu placée à:', this.lastHitPosition);
    },

    remove: function() {
      this.el.sceneEl.removeEventListener('enter-vr', this.onSessionStarted);
      this.el.sceneEl.removeEventListener('click', this.onSelect);
      if (this.reticle && this.reticle.parentNode) this.reticle.parentNode.removeChild(this.reticle);
      if (this.hitTestSource) {
        try { this.hitTestSource.cancel(); } catch (e) {}
        this.hitTestSource = null;
      }
    }
  });
}
