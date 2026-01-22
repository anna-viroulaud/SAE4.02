AFRAME.registerComponent('fishing-rod', {
  init: function () {
    const el = this.el;

	// Raycaster disabled to avoid collision removal (user requested no collision)
	// If you want aiming visuals later, re-enable with: objects: '.poisson', showLine: true

    // Harpoon is now grabbable - positioned in scene, not attached to controller initially
    this.modelChild = document.querySelector('#harpoon [gltf-model]');
    this.harpoonEntity = document.querySelector('#harpoon');
    this.isGrabbed = false;
    
    if (this.modelChild) {
      console.log('Harpoon found in scene, ready to grab');
    }
		// Grab harpoon with grip button
		el.addEventListener('gripdown', (evt) => {
			if (!this.isGrabbed && this.modelChild) {
				this.isGrabbed = true;
				console.log('Grabbed harpoon');
			}
		});

		el.addEventListener('gripup', (evt) => {
			if (this.isGrabbed) {
				this.isGrabbed = false;
				console.log('Released harpoon');
			}
		});

		el.addEventListener('triggerdown', (evt) => {
			if (!this.isGrabbed) return;
			// collision is intentionally disabled; provide simple haptic feedback instead
			try {
				const gp = evt && evt.detail && evt.detail.gamepad ? evt.detail.gamepad : navigator.getGamepads && navigator.getGamepads()[0];
				if (gp && gp.hapticActuators && gp.hapticActuators.length) {
					gp.hapticActuators[0].pulse(0.35, 80);
				}
			} catch (e) {
				// ignore haptic failures
			}
			console.log('Trigger pulled (collision disabled)');
		});
	},

	tick: function() {
		if (this.isGrabbed && this.harpoonEntity) {
			// Follow controller position when grabbed
			const controllerPos = new AFRAME.THREE.Vector3();
			this.el.object3D.getWorldPosition(controllerPos);
			// Offset in front of controller
			const forward = new AFRAME.THREE.Vector3(0, 0, -0.3);
			forward.applyQuaternion(this.el.object3D.quaternion);
			controllerPos.add(forward);
			this.harpoonEntity.object3D.position.copy(controllerPos);
			// Copy rotation
			this.harpoonEntity.object3D.quaternion.copy(this.el.object3D.quaternion);
		}
	}
});

