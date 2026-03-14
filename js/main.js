/**
 * Scrollytelling: Olympic Soft Power
 */

(function () {
  "use strict";

  gsap.registerPlugin(ScrollTrigger);

  const gate              = document.getElementById("gate");
  const transitionTrigger = document.getElementById("transition-trigger");
  const mapBackground     = document.getElementById("map-background");
  const mapMount          = document.getElementById("map-svg-mount");
  const cityLabel         = document.getElementById("city-label");
  const cityLabelName     = document.getElementById("city-label-name");
  const cityLabelYear     = document.getElementById("city-label-year");

  if (!gate || !mapBackground || !mapMount || !cityLabel) {
    console.warn("Scrollytelling: core DOM elements missing.");
    return;
  }

  const EASE       = "power2.inOut";
  const DEFAULT_VB = { x: 0, y: 0, w: 2000, h: 857 };
  const HL_CLASS   = "country-highlight";

  const SCENES = [
    { id: "greece", label: "Grecia",           year: "776 a.C.", sectionId: "scene-greece", panelId: "panel-greece", bridgeId: "bridge-greece", selectors: ["path.Greece"],            focus: { fx: 0.43, fy: 0.75 }, zoom: 5.5, showMarker: false },
    { id: "berlin", label: "Berlín",           year: "1936",     sectionId: "scene-berlin", panelId: "panel-berlin", bridgeId: "bridge-berlin", selectors: ["#DE"],                     focus: { fx: 0.68, fy: 0.30 }, zoom: 5.0 },
    { id: "tokyo",  label: "Tokio",            year: "1964",     sectionId: "scene-tokyo",  panelId: "panel-tokyo",  bridgeId: "bridge-tokyo",  selectors: ["path.Japan"],              focus: { fx: 0.85, fy: 0.55 }, zoom: 5.5 },
    { id: "mexico", label: "Ciudad de México", year: "1968",     sectionId: "scene-mexico", panelId: "panel-mexico", bridgeId: "bridge-mexico", selectors: ["#MX"],                     focus: { fx: 0.60, fy: 0.79 }, zoom: 4.0 },
    { id: "moscow", label: "Moscú",            year: "1980",     sectionId: "scene-moscow", panelId: "panel-moscow", bridgeId: "bridge-moscow", selectors: ["path.Russian.Federation"], focus: { fx: 0.13, fy: 0.51 }, zoom: 3.5 },
    { id: "la",     label: "Los Ángeles",      year: "1984",     sectionId: "scene-la",     panelId: "panel-la",     bridgeId: "bridge-la",     selectors: ["path.United.States"],      focus: { fx: 0.05, fy: 0.63 }, zoom: 3.5 },
    { id: "seoul",  label: "Seúl",             year: "1988",     sectionId: "scene-seoul",  panelId: "panel-seoul",  bridgeId: "bridge-seoul",  selectors: ["#KR"],                     focus: { fx: 0.40, fy: 0.20 }, zoom: 7.0 },
    { id: "beijing",label: "Pekín",            year: "2008",     sectionId: "scene-beijing",panelId: "panel-beijing",bridgeId: "bridge-beijing",selectors: ["path.China"],              focus: { fx: 0.78, fy: 0.40 }, zoom: 4.5 },
    { id: "sochi",  label: "Sochi",            year: "2014",     sectionId: "scene-sochi",  panelId: "panel-sochi",  bridgeId: "bridge-sochi",  selectors: ["path.Russian.Federation"], focus: { fx: 0.13, fy: 0.92 }, zoom: 6.0 },
    { id: "paris",  label: "París",            year: "2024",     sectionId: "scene-paris",  panelId: "panel-paris",  bridgeId: null,            selectors: ["path.France"],             focus: { fx: 0.68, fy: 0.38 }, zoom: 6.0 },
  ];

  function vbStr(vb) { return `${vb.x} ${vb.y} ${vb.w} ${vb.h}`; }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  function viewBoxForPoint(pt, zoom) {
    const aspect = window.innerWidth / window.innerHeight;
    const w = DEFAULT_VB.w / zoom;
    const h = w / aspect;
    return {
      x: clamp(pt.x - w / 2, 0, DEFAULT_VB.w - w),
      y: clamp(pt.y - h / 2, 0, DEFAULT_VB.h - h),
      w, h,
    };
  }

  function clearHL(svg) {
    svg.querySelectorAll(`.${HL_CLASS}`).forEach((el) => el.classList.remove(HL_CLASS));
  }

  function largestBBox(nodes) {
    let best = null, bestArea = -1;
    for (const n of nodes) {
      const b = n.getBBox(), area = b.width * b.height;
      if (area > bestArea) { bestArea = area; best = b; }
    }
    return best;
  }

  function unionBBoxes(nodes) {
    let bbox = null;
    for (const n of nodes) {
      const b = n.getBBox();
      if (!bbox) { bbox = { x: b.x, y: b.y, width: b.width, height: b.height }; continue; }
      const x2 = Math.max(bbox.x + bbox.width,  b.x + b.width);
      const y2 = Math.max(bbox.y + bbox.height, b.y + b.height);
      bbox.x = Math.min(bbox.x, b.x);
      bbox.y = Math.min(bbox.y, b.y);
      bbox.width  = x2 - bbox.x;
      bbox.height = y2 - bbox.y;
    }
    return bbox;
  }

  // 1) GATE → MAP
  gsap.set(mapBackground, { opacity: 0 });
  gsap.to(gate,          { opacity: 0, scrollTrigger: { trigger: transitionTrigger, start: "top bottom", end: "top top", scrub: 1.2 } });
  gsap.to(mapBackground, { opacity: 1, scrollTrigger: { trigger: transitionTrigger, start: "top bottom", end: "top top", scrub: 1.2 } });

  // 2) Load SVG inline
  async function inlineWorldSvg() {
    const res     = await fetch("assets/map/world.svg");
    const svgText = await res.text();
    const parsed  = new DOMParser().parseFromString(svgText, "image/svg+xml");
    const svg     = parsed.querySelector("svg");
    if (!svg) throw new Error("SVG not found.");

    svg.setAttribute("viewBox", vbStr(DEFAULT_VB));
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.removeAttribute("width");
    svg.removeAttribute("height");
    clearHL(svg);

    const ns     = "http://www.w3.org/2000/svg";
    const marker = document.createElementNS(ns, "circle");
    marker.setAttribute("id",    "city-marker");
    marker.setAttribute("class", "city-marker");
    marker.setAttribute("r",     "4.2");
    marker.setAttribute("cx",    "0");
    marker.setAttribute("cy",    "0");
    svg.appendChild(marker);

    mapMount.innerHTML = "";
    mapMount.appendChild(svg);
    return { svg };
  }

  // 3) ZOOM-IN per scene
  function buildZoomIn(svg, scene) {
    const section = document.getElementById(scene.sectionId);
    if (!section) return;

    const nodes = [];
    scene.selectors.forEach((sel) => svg.querySelectorAll(sel).forEach((n) => nodes.push(n)));

    if (nodes.length === 0) console.warn(`Scrollytelling: no SVG nodes for "${scene.id}"`, scene.selectors);

    const bbox       = largestBBox(nodes) || unionBBoxes(nodes) || { x: 950, y: 350, width: 120, height: 120 };
    const focusPoint = {
      x: bbox.x + bbox.width  * (scene.focus?.fx ?? 0.5),
      y: bbox.y + bbox.height * (scene.focus?.fy ?? 0.5),
    };
    const targetVB   = viewBoxForPoint(focusPoint, scene.zoom ?? 3.5);
    const marker     = svg.querySelector("#city-marker");
    const showMarker = scene.showMarker !== false;

    scene._targetVB = targetVB;

    const applyHL = () => {
      clearHL(svg);
      if (scene.id === "greece") nodes.forEach((n) => n.classList.add(HL_CLASS));
    };

    if (marker) gsap.set(marker, { opacity: 0 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section, start: "top bottom", end: "bottom top", scrub: 2,
        onEnter: () => {
          cityLabelName.textContent = scene.label;
          cityLabelYear.textContent = scene.year;
          applyHL();
          if (marker && showMarker) {
            marker.setAttribute("cx", String(focusPoint.x));
            marker.setAttribute("cy", String(focusPoint.y));
          }
        },
        onEnterBack: () => {
          cityLabelName.textContent = scene.label;
          cityLabelYear.textContent = scene.year;
          applyHL();
          if (marker && showMarker) {
            marker.setAttribute("cx", String(focusPoint.x));
            marker.setAttribute("cy", String(focusPoint.y));
          }
        },
        onLeaveBack: () => {
          gsap.set(cityLabel, { opacity: 0 });
          if (marker) gsap.set(marker, { opacity: 0 });
          clearHL(svg);
          gsap.to(svg, { attr: { viewBox: vbStr(DEFAULT_VB) }, duration: 0.6, ease: EASE });
        },
      },
    });

    tl.to(svg, { attr: { viewBox: vbStr(targetVB) }, duration: 1, ease: EASE }, 0);
    tl.to(cityLabel, { opacity: 1, duration: 0.2, ease: "power2.out" }, 0.2);
    if (showMarker) tl.to(marker, { opacity: 1, duration: 0.18, ease: "power2.out" }, 0.22);
    tl.to(cityLabel, { opacity: 0, duration: 0.15, ease: "power2.in" }, 0.75);
    if (showMarker) tl.to(marker, { opacity: 0, duration: 0.12, ease: "power2.in" }, 0.76);

    return tl;
  }

  // 4) BRIDGE — scrubbed zoom-out
  function buildBridge(svg, scene) {
    if (!scene.bridgeId) return;
    const bridge = document.getElementById(scene.bridgeId);
    if (!bridge) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: bridge, start: "top bottom", end: "bottom top", scrub: 2.5,
        onEnter:     () => { clearHL(svg); gsap.set(mapBackground, { opacity: 1 }); },
        onEnterBack: () => { clearHL(svg); gsap.set(mapBackground, { opacity: 1 }); },
        onLeave:     () => { gsap.set(mapBackground, { opacity: 1 }); },
        onLeaveBack: () => { if (scene._targetVB) gsap.set(svg, { attr: { viewBox: vbStr(scene._targetVB) } }); },
      },
    });

    tl.to(svg, { attr: { viewBox: vbStr(DEFAULT_VB) }, duration: 1, ease: EASE }, 0);
    return tl;
  }

  // 5) PANELS
  function setupPanels(svg) {
    const marker = svg.querySelector("#city-marker");

    SCENES.forEach((scene) => {
      const panel = document.getElementById(scene.panelId);
      if (!panel) return;
      ScrollTrigger.create({
        trigger: panel, start: "top bottom", end: "bottom top",
        onEnter: () => {
          gsap.set(cityLabel, { opacity: 0 });
          if (marker) gsap.set(marker, { opacity: 0 });
          clearHL(svg);
        },
        onEnterBack: () => {
          gsap.set(cityLabel, { opacity: 0 });
          if (marker) gsap.set(marker, { opacity: 0 });
          clearHL(svg);
          if (scene._targetVB) gsap.set(svg, { attr: { viewBox: vbStr(scene._targetVB) } });
        },
        onLeaveBack: () => {
          gsap.set(cityLabel, { opacity: 0 });
          if (marker) gsap.set(marker, { opacity: 0 });
          clearHL(svg);
        },
      });
    });

    const conclusion = document.getElementById("panel-conclusion");
    if (conclusion) {
      ScrollTrigger.create({
        trigger: conclusion, start: "top bottom", end: "bottom top",
        onEnter:     () => { gsap.set(cityLabel, { opacity: 0 }); if (marker) gsap.set(marker, { opacity: 0 }); clearHL(svg); },
        onEnterBack: () => { gsap.set(cityLabel, { opacity: 0 }); if (marker) gsap.set(marker, { opacity: 0 }); },
      });
    }
  }

  // 6) BOOT
  inlineWorldSvg()
    .then(({ svg }) => {
      gsap.set(svg, { attr: { viewBox: vbStr(DEFAULT_VB) } });
      SCENES.forEach((scene) => { buildZoomIn(svg, scene); buildBridge(svg, scene); });
      setupPanels(svg);
      setupGreecePanel();
      setupRevealBlocks();  // activa .gr-reveal en todos los paneles
      window.addEventListener("resize", () => ScrollTrigger.refresh());
      ScrollTrigger.refresh();
    })
    .catch((err) => console.error("Scrollytelling: SVG load failed.", err));

  // ---------------------------------------------------------------------------
  // 7) GREECE PANEL
  //
  //  El panel (imagen + contenido) es un solo componente.
  //  Crossfade al final del scene: mapa opacity 0 → panel opacity 1.
  //  Una vez visible, scroll 100% normal. Sin capas extra.
  // ---------------------------------------------------------------------------
  function setupGreecePanel() {
    const panel   = document.getElementById("panel-greece");
    const scene   = document.getElementById("scene-greece");
    if (!panel || !scene) return;

    gsap.set(panel, { opacity: 0 });

    // Crossfade mapa → panel al final del scene (zoom ya terminó)
    gsap.timeline({
      scrollTrigger: {
        trigger: scene,
        start:   "bottom 80%",
        end:     "bottom top",
        scrub:   1.4,
        onLeaveBack: () => {
          gsap.set(panel,         { opacity: 0 });
          gsap.set(mapBackground, { opacity: 1 });
        },
      },
    })
    .to(mapBackground, { opacity: 0, ease: "power1.inOut" }, 0)
    .to(panel,         { opacity: 1, ease: "power1.inOut" }, 0);

    // Restaurar mapa cuando el panel termina (para bridges siguientes)
    ScrollTrigger.create({
      trigger:  panel,
      start:    "bottom top",
      onLeave:  () => gsap.set(mapBackground, { opacity: 1 }),
      onEnterBack: () => gsap.set(mapBackground, { opacity: 0 }),
    });

    // Reveal de bloques
    const blocks = panel.querySelectorAll(".gr-reveal");
    blocks.forEach((block, i) => {
      ScrollTrigger.create({
        trigger:  block,
        start:    "top 88%",
        onEnter:  () => {
          setTimeout(() => block.classList.add("is-visible"), i % 2 === 0 ? 0 : 80);
        },
        once: true,
      });
    });
  }
  // ---------------------------------------------------------------------------
  // 8) REVEAL GLOBAL — activa .gr-reveal en cualquier panel que lo use
  //    Berlín, Tokio, etc. heredan la misma lógica sin código extra.
  // ---------------------------------------------------------------------------
  function setupRevealBlocks() {
    document.querySelectorAll(".gr-reveal").forEach((block, i) => {
      // Evitar duplicar triggers en bloques de Grecia (ya los maneja setupGreecePanel)
      if (block.closest("#panel-greece")) return;
      ScrollTrigger.create({
        trigger:  block,
        start:    "top 88%",
        onEnter:  () => {
          setTimeout(() => block.classList.add("is-visible"), i % 2 === 0 ? 0 : 80);
        },
        once: true,
      });
    });
  }

})();