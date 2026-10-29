// js/three-scene.js — Realistic automotive WebGL showroom powered by Three.js.
(() => {
  "use strict";
  const canvas = document.getElementById("car-canvas");
  const toggle = document.getElementById("showroom-toggle");
  if (!canvas || !toggle) return;

  const hero = canvas.closest(".hero");
  const tools = document.getElementById("showroom-tools");
  const hint = document.getElementById("showroom-hint");
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  let graphics = null;
  let active = false;
  let loading = null;
  canvas.setAttribute("aria-hidden", "true");

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = new URL(src, document.baseURI).href;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.append(script);
    });
  }

  async function loadThree() {
    if (window.THREE && window.THREE.GLTFLoader) return window.THREE;
    if (loading) return loading;
    loading = (async () => {
      if (!window.THREE) {
        await loadScript("assets/vendor/three.min.js");
      }
      if (window.THREE && !window.THREE.GLTFLoader) {
        try {
          await loadScript("assets/vendor/GLTFLoader.js");
        } catch (e) {
          console.warn("[Mario showroom] GLTFLoader could not be loaded, using procedural fallback.", e);
        }
      }
      if (!window.THREE) throw new Error("Three.js was not initialised.");
      return window.THREE;
    })();
    return loading;
  }

  function setMode(value) {
    active = value;
    hero.classList.toggle("is-3d", active);
    toggle.setAttribute("aria-pressed", String(active));
    toggle.querySelector("span").textContent = active
      ? "Return to studio view"
      : "Explore in 3D";
    tools.hidden = !active;
    hint.textContent = active
      ? "REALISTIC 3D SHOWROOM · DRAG TO ROTATE"
      : "A CLOSER LOOK. A DIFFERENT DIMENSION.";
    canvas.setAttribute("aria-hidden", String(!active));
    canvas.tabIndex = active ? 0 : -1;
    graphics?.setActive(active);
  }

  toggle.addEventListener("click", async () => {
    if (active) {
      setMode(false);
      return;
    }
    toggle.disabled = true;
    toggle.querySelector("span").textContent = "Preparing the showroom…";
    try {
      const THREE = await loadThree();
      if (!graphics) graphics = createShowroom(THREE);
      setMode(true);
    } catch (error) {
      console.warn("[Mario showroom]", error.message);
      setMode(false);
      loading = null;
      window.Mario?.toast?.(
        "Your browser could not start WebGL. The cinematic studio view is still available.",
      );
    } finally {
      toggle.disabled = false;
    }
  });

  function createShowroom(THREE) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x08080a);
    scene.fog = new THREE.FogExp2(0x08080a, 0.032);
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Procedural studio lighting environment
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffffff, 1.9);
    key.position.set(-5, 9, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -5;
    key.shadow.camera.right = 5;
    key.shadow.camera.top = 5;
    key.shadow.camera.bottom = -5;
    key.shadow.normalBias = 0.035;
    scene.add(key);

    const redRim = new THREE.DirectionalLight(0xe50914, 0.95);
    redRim.position.set(5, 2.8, -5);
    scene.add(redRim);

    const softFill = new THREE.DirectionalLight(0xd9e5ff, 0.65);
    softFill.position.set(3, 4, 6);
    scene.add(softFill);

    const redSpot = new THREE.SpotLight(0xff1424, 1.2, 28, Math.PI / 5, 0.6, 1);
    redSpot.position.set(4, 5, -4);
    redSpot.target.position.set(0, 0.6, 0);
    scene.add(redSpot, redSpot.target);

    const movingLight = new THREE.PointLight(0xeef4ff, 1.0, 16, 1.4);
    movingLight.position.set(-3, 2.8, 5);
    scene.add(movingLight);

    // Dark turntable floor
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x07080a,
      roughness: 0.85,
      metalness: 0.1,
    });
    const floor = new THREE.Mesh(new THREE.CircleGeometry(10, 64), floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.01;
    floor.receiveShadow = true;
    scene.add(floor);

    // Glowing accent stage ring
    const stageRing = new THREE.Mesh(
      new THREE.RingGeometry(3.95, 4.02, 128),
      new THREE.MeshBasicMaterial({
        color: 0xe50914,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
      }),
    );
    stageRing.rotation.x = -Math.PI / 2;
    stageRing.position.y = 0.002;
    scene.add(stageRing);

    // Soft radial contact shadow
    const shadowCanvas = document.createElement("canvas");
    shadowCanvas.width = 256;
    shadowCanvas.height = 128;
    const ctx = shadowCanvas.getContext("2d");
    const gradient = ctx.createRadialGradient(128, 64, 10, 128, 64, 118);
    gradient.addColorStop(0, "rgba(0,0,0,0.85)");
    gradient.addColorStop(0.5, "rgba(0,0,0,0.45)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 128);
    const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
    const contactShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(6.6, 3.5),
      new THREE.MeshBasicMaterial({
        map: shadowTexture,
        transparent: true,
        depthWrite: false,
      }),
    );
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.003;
    scene.add(contactShadow);

    const carGroup = new THREE.Group();
    carGroup.position.y = 0.02;
    scene.add(carGroup);

    const paintMaterials = [];
    let currentPaintColor = 0xb2b8c2; // Default silver

    function applyPaintColor(hexColor) {
      currentPaintColor = hexColor;
      paintMaterials.forEach((mat) => {
        if (mat.color) mat.color.setHex(hexColor);
      });
    }

    // Try to load the realistic GLB model
    let modelLoaded = false;
    if (THREE.GLTFLoader) {
      const loader = new THREE.GLTFLoader();
      loader.load(
        "assets/models/car-concept.glb",
        (gltf) => {
          const model = gltf.scene;
          model.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              const mat = child.material;
              if (mat) {
                // Realistic clearcoat automotive paint
                if (mat.name && (mat.name.includes("Paint 1") || mat.name.includes("Paint 2"))) {
                  mat.roughness = 0.12;
                  mat.metalness = 0.88;
                  if (mat.clearcoat !== undefined) mat.clearcoat = 1.0;
                  if (mat.clearcoatRoughness !== undefined) mat.clearcoatRoughness = 0.08;
                  paintMaterials.push(mat);
                }
                // Tinted automotive glass
                if (mat.name && mat.name.includes("Glass")) {
                  mat.color.setHex(0x0a1018);
                  mat.roughness = 0.05;
                  mat.metalness = 0.15;
                  mat.transparent = true;
                  mat.opacity = 0.85;
                }
                // Headlight / taillight brilliance
                if (mat.name && mat.name.includes("Headlight")) {
                  mat.emissive = new THREE.Color(0xd9ebff);
                  mat.emissiveIntensity = 2.0;
                }
                if (mat.name && mat.name.includes("Brakelight")) {
                  mat.emissive = new THREE.Color(0xe50914);
                  mat.emissiveIntensity = 2.5;
                }
              }
            }
          });

          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());
          model.position.sub(center);
          model.position.y += size.y * 0.49;
          carGroup.add(model);
          modelLoaded = true;
          applyPaintColor(currentPaintColor);
        },
        undefined,
        (err) => {
          console.warn("[Mario showroom] Could not load GLB, using fallback.", err);
          buildProceduralCar(THREE, carGroup, paintMaterials);
        },
      );
    } else {
      buildProceduralCar(THREE, carGroup, paintMaterials);
    }

    // Color swatches interaction
    const colorSwatches = document.querySelectorAll("[data-car-color]");
    colorSwatches.forEach((swatch) => {
      swatch.addEventListener("click", () => {
        colorSwatches.forEach((s) => s.setAttribute("aria-pressed", "false"));
        swatch.setAttribute("aria-pressed", "true");
        const hex = parseInt(swatch.dataset.carColor.replace("#", "0x"), 16);
        applyPaintColor(hex);
      });
    });

    let running = false;
    let visible = true;
    let frame = 0;
    let lastTime = 0;
    let targetYaw = -0.22;
    let hoverYaw = 0;
    let elevation = 2.1;
    let autoRotate = !reducedMotion;
    let drag = null;
    let disposed = false;
    carGroup.rotation.y = targetYaw;

    const autoButton = document.getElementById("car-autorotate");
    function syncRotationButton() {
      if (!autoButton) return;
      autoButton.setAttribute("aria-pressed", String(autoRotate));
      autoButton.setAttribute(
        "aria-label",
        autoRotate ? "Pause car rotation" : "Start car rotation",
      );
      autoButton
        .querySelector("use")
        ?.setAttribute("href", autoRotate ? "#i-pause" : "#i-play");
    }
    autoButton?.addEventListener("click", () => {
      autoRotate = !autoRotate;
      syncRotationButton();
    });
    syncRotationButton();

    const resetButton = document.getElementById("car-reset");
    function reset() {
      targetYaw = -0.22;
      hoverYaw = 0;
      elevation = 2.1;
      autoRotate = !reducedMotion;
      syncRotationButton();
    }
    resetButton?.addEventListener("click", reset);

    function resize() {
      if (disposed) return;
      const width = Math.max(1, canvas.clientWidth);
      const height = Math.max(1, canvas.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.clearViewOffset();
      if (window.innerWidth > 700) {
        camera.setViewOffset(width, height, -width * 0.16, 0, width, height);
      }
      camera.updateProjectionMatrix();
    }

    function render(time) {
      frame = 0;
      if (!running || !visible || document.hidden || disposed) return;
      const delta = Math.min((time - (lastTime || time)) / 1000, 0.05);
      lastTime = time;
      if (autoRotate && !drag) targetYaw += delta * 0.095;
      const damping = 1 - Math.exp(-delta * 8);
      carGroup.rotation.y = THREE.MathUtils.lerp(
        carGroup.rotation.y,
        targetYaw + hoverYaw,
        damping,
      );
      const mobile = window.innerWidth <= 700;
      camera.position.set(
        mobile ? -7.8 : -5.8,
        mobile ? elevation + 1.1 : elevation,
        mobile ? 9.2 : 6.8,
      );
      camera.lookAt(0, 0.58, 0);
      const orbit = time * 0.0003;
      movingLight.position.set(
        Math.cos(orbit) * 5,
        2.9 + Math.sin(orbit * 0.7) * 0.5,
        Math.sin(orbit) * 5,
      );
      renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    }

    function start() {
      if (running && visible && !document.hidden && !frame && !disposed) {
        lastTime = 0;
        frame = requestAnimationFrame(render);
      }
    }
    function pause() {
      cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
    }

    function onPointerDown(event) {
      if (!running || (event.pointerType === "mouse" && event.button !== 0))
        return;
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
      hoverYaw = 0;
      canvas.setPointerCapture(event.pointerId);
      canvas.focus({ preventScroll: true });
    }
    function onPointerMove(event) {
      if (!running) return;
      if (drag && event.pointerId === drag.id) {
        targetYaw += (event.clientX - drag.x) * 0.008;
        elevation = THREE.MathUtils.clamp(
          elevation + (event.clientY - drag.y) * 0.012,
          1.2,
          4.8,
        );
        drag.x = event.clientX;
        drag.y = event.clientY;
      } else if (event.pointerType === "mouse" && !reducedMotion) {
        const bounds = canvas.getBoundingClientRect();
        hoverYaw = ((event.clientX - bounds.left) / bounds.width - 0.5) * 0.1;
      }
    }
    function onPointerUp(event) {
      if (drag && event.pointerId === drag.id) {
        if (canvas.hasPointerCapture(event.pointerId))
          canvas.releasePointerCapture(event.pointerId);
        drag = null;
      }
    }
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("pointerleave", () => {
      if (!drag) hoverYaw = 0;
    });

    canvas.addEventListener("keydown", (event) => {
      const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", " "];
      if (!running || !keys.includes(event.key)) return;
      event.preventDefault();
      if (event.key === "ArrowLeft") targetYaw -= 0.18;
      if (event.key === "ArrowRight") targetYaw += 0.18;
      if (event.key === "ArrowUp") elevation = Math.max(1.2, elevation - 0.25);
      if (event.key === "ArrowDown") elevation = Math.min(4.8, elevation + 0.25);
      if (event.key === "Home") reset();
      if (event.key === " ") {
        autoRotate = !autoRotate;
        syncRotationButton();
      }
    });

    canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      pause();
      setMode(false);
      window.Mario?.toast?.(
        "The 3D context was interrupted. Studio view has been restored. Reload the page to restart WebGL.",
      );
    });
    canvas.addEventListener("webglcontextrestored", () => {
      resize();
    });

    const resizeObserver =
      "ResizeObserver" in window ? new ResizeObserver(resize) : null;
    resizeObserver?.observe(canvas);
    window.addEventListener("resize", resize);

    const visibilityObserver =
      "IntersectionObserver" in window
        ? new IntersectionObserver(
            (entries) => {
              visible = entries[0].isIntersecting;
              if (visible) start();
              else pause();
            },
            { threshold: 0.01 },
          )
        : null;
    visibilityObserver?.observe(hero);

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) pause();
      else start();
    });

    resize();
    return {
      setActive(value) {
        running = value;
        if (running) {
          resize();
          start();
        } else {
          pause();
          drag = null;
        }
      },
      dispose() {
        disposed = true;
        pause();
        resizeObserver?.disconnect();
        visibilityObserver?.disconnect();
        window.removeEventListener("resize", resize);
        const geometries = new Set();
        const materials = new Set();
        scene.traverse((object) => {
          if (object.geometry) geometries.add(object.geometry);
          if (object.material) materials.add(object.material);
        });
        geometries.forEach((geometry) => geometry.dispose());
        materials.forEach((material) => material.dispose());
        shadowTexture.dispose();
        renderer.dispose();
      },
    };
  }

  function buildProceduralCar(THREE, carGroup, paintMaterials) {
    // Graceful procedural sports car if GLB cannot be fetched
    const bodyMat = new THREE.MeshPhysicalMaterial({
      color: 0xb2b8c2,
      metalness: 0.9,
      roughness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
    });
    paintMaterials.push(bodyMat);
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x070b10,
      metalness: 0.4,
      roughness: 0.08,
      clearcoat: 1.0,
      transparent: true,
      opacity: 0.85,
    });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x111317, roughness: 0.3, metalness: 0.8 });
    const rubberMat = new THREE.MeshStandardMaterial({ color: 0x090a0c, roughness: 0.85 });
    
    // Sleek streamlined coupe body
    const bodyGeo = new THREE.BoxGeometry(4.4, 0.65, 1.95);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, 0.48, 0);
    body.castShadow = true;
    carGroup.add(body);

    const cabinGeo = new THREE.CylinderGeometry(0.85, 1.05, 0.6, 16);
    cabinGeo.scale(2.0, 1, 0.85);
    const cabin = new THREE.Mesh(cabinGeo, glassMat);
    cabin.position.set(-0.15, 0.95, 0);
    cabin.castShadow = true;
    carGroup.add(cabin);

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.24, 32);
    wheelGeo.rotateZ(Math.PI / 2);
    const positions = [
      [-1.38, 0.38, 0.96],
      [1.38, 0.38, 0.96],
      [-1.38, 0.38, -0.96],
      [1.38, 0.38, -0.96],
    ];
    positions.forEach((pos) => {
      const w = new THREE.Mesh(wheelGeo, rubberMat);
      w.position.set(...pos);
      w.castShadow = true;
      carGroup.add(w);
    });
  }

  window.addEventListener("pagehide", (event) => {
    if (event.persisted) graphics?.setActive(false);
    else graphics?.dispose();
  });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) graphics?.setActive(active);
  });
})();
