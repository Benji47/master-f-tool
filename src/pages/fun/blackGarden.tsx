export function BlackGardenPage() {
  const totalFlowers = 28;
  const poemLines = [
    "Přejeme ženám dnes krásný den,",
    "Energie, radost a úsměv jen.",
    "Květiny voní, svět je hned krásnější,",
    "Nálada je dnes o hodně jasnější.",
    "Yoga i smích ať sílu vám dá,",
    "Dnešní den ať radost rozdává.",
    "Energie, štěstí a úsměv v tváři,",
    "Nechť se vám dnes i zítra daří. 🌸",
  ];
  const poemInitialColor = "#ffd76a";

  const palettes = [
    { petal: "#ff3535", petalAlt: "#ff6a33", center: "#ffd33d", stem: "#2d2d2d", leaf: "#ff4545" },
    { petal: "#f03f7a", petalAlt: "#ff8b66", center: "#ffd84c", stem: "#2a2a2a", leaf: "#ff7d6f" },
    { petal: "#ff5d2f", petalAlt: "#ff3165", center: "#ffe05f", stem: "#1f1f1f", leaf: "#ff8f2f" },
    { petal: "#ff2b56", petalAlt: "#ff7f3f", center: "#f8d93f", stem: "#292929", leaf: "#ff5668" },
  ];

  // Deterministic PRNG so server render stays stable and predictable.
  const makeRng = (seed: number) => {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  const rng = makeRng(473991);
  const points: Array<{ x: number; y: number }> = [];

  while (points.length < totalFlowers) {
    let bestCandidate: { x: number; y: number; score: number } | null = null;

    for (let i = 0; i < 20; i++) {
      const x = 8 + rng() * 84;
      const y = 10 + rng() * 78;

      // Keep center free for poem text block.
      if (x > 27 && x < 73 && y > 22 && y < 78) {
        continue;
      }

      let minDistance = 999;
      for (const point of points) {
        const dx = point.x - x;
        const dy = point.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        minDistance = Math.min(minDistance, dist);
      }

      const score = points.length === 0 ? 999 : minDistance;
      if (!bestCandidate || score > bestCandidate.score) {
        bestCandidate = { x, y, score };
      }
    }

    if (!bestCandidate) break;
    points.push({ x: bestCandidate.x, y: bestCandidate.y });
  }

  const flowers = points.map((point, index) => {
    const palette = palettes[index % palettes.length];
    return {
      index,
      left: point.x,
      top: point.y,
      size: (78 + Math.round(rng() * 46)) * 1.4,
      scale: 0.88 + rng() * 0.42,
      rotation: -20 + rng() * 40,
      idleDelay: Number((rng() * 2.8).toFixed(2)),
      idleDuration: Number((3.6 + rng() * 2.2).toFixed(2)),
      palette,
    };
  });

  return (
    <div className="black-garden-page min-h-screen">
      <style>{`
        .black-garden-page {
          position: relative;
          overflow: hidden;
          width: 100vw;
          min-height: 100vh;
          background:
            radial-gradient(circle at 20% 20%, rgba(60, 10, 10, 0.25), transparent 38%),
            radial-gradient(circle at 80% 75%, rgba(85, 35, 0, 0.24), transparent 40%),
            radial-gradient(circle at 50% 50%, rgba(255, 0, 0, 0.06), transparent 65%),
            #000;
        }

        .black-garden-field {
          position: relative;
          width: 100vw;
          min-height: 100vh;
        }

        .black-garden-poem {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          width: min(36vw, 320px);
          padding: clamp(12px, 1.5vmin, 18px) clamp(14px, 2vmin, 22px);
          border-radius: 14px;
          border: 1px solid transparent;
          background:
            linear-gradient(rgba(8, 8, 8, 0.82), rgba(8, 8, 8, 0.82)) padding-box,
            linear-gradient(130deg, rgba(255, 217, 122, 0.65), rgba(255, 112, 112, 0.35), rgba(143, 220, 255, 0.35)) border-box;
          backdrop-filter: blur(4px);
          box-shadow: 0 14px 36px rgba(0, 0, 0, 0.55), inset 0 0 0 1px rgba(255, 255, 255, 0.04);
          color: #f8f4ea;
          text-align: left;
          font-family: Georgia, "Times New Roman", serif;
          line-height: 1.52;
          letter-spacing: 0.01em;
          z-index: 4;
          pointer-events: none;
        }

        .black-garden-poem-line {
          margin: 0;
          font-size: clamp(15px, 1.58vmin, 20px);
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.86);
        }

        .black-garden-poem-initial {
          font-weight: 700;
          font-size: 1.14em;
          color: #ffd76a;
          margin-right: 1px;
          text-shadow: 0 0 10px rgba(255, 215, 106, 0.28);
        }

        .black-garden-flower {
          --fly-x: 0px;
          --fly-y: 0px;
          position: absolute;
          left: var(--left);
          top: var(--top);
          width: var(--size);
          min-width: 82px;
          transform: translate(-50%, -50%) rotate(var(--base-rotation)) scale(var(--base-scale));
          transform-origin: 50% 64%;
          border: 0;
          background: transparent;
          cursor: pointer;
          transition: filter 180ms ease;
          will-change: transform, opacity;
          padding: 0;
          touch-action: manipulation;
        }

        .black-garden-flower:hover {
          filter: drop-shadow(0 0 8px rgba(255, 95, 95, 0.45));
        }

        .black-garden-flower:focus-visible {
          outline: 2px solid #f5e742;
          outline-offset: 5px;
        }

        .black-garden-art {
          width: 100%;
          display: block;
          transform-origin: 50% 68%;
          will-change: transform;
          animation: blackGardenIdle var(--idle-duration) ease-in-out infinite;
          animation-delay: var(--idle-delay);
        }

        .black-garden-flower[data-state=launched] {
          pointer-events: none;
        }

        .black-garden-flower[data-state=returning] {
          pointer-events: none;
        }

        .black-garden-flower[data-state=launched] .black-garden-art,
        .black-garden-flower[data-state=returning] .black-garden-art {
          animation: none;
        }

        @keyframes blackGardenIdle {
          0% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-5px) rotate(4deg);
          }
          100% {
            transform: translateY(0px) rotate(0deg);
          }
        }

        @media (max-width: 720px) {
          .black-garden-flower {
            width: var(--mobile-size);
          }

          .black-garden-poem {
            width: min(60vw, 300px);
            padding: 12px 12px;
            border-radius: 12px;
          }

          .black-garden-poem-line {
            font-size: clamp(13px, 3.1vw, 16px);
            line-height: 1.42;
          }
        }
      `}</style>

      <div className="black-garden-field" aria-label="animated flower field">
        {flowers.map((flower) => (
          <button
            type="button"
            className="black-garden-flower"
            key={flower.index}
            aria-label={`Flower ${flower.index + 1}`}
            style={`--left:${flower.left}%;--top:${flower.top}%;--size:${flower.size}px;--mobile-size:${Math.round(
              flower.size * 0.82,
            )}px;--base-rotation:${flower.rotation}deg;--base-scale:${flower.scale};--idle-delay:${flower.idleDelay}s;--idle-duration:${flower.idleDuration}s;--petal:${
              flower.palette.petal
            };--petal-alt:${flower.palette.petalAlt};--center:${flower.palette.center};--stem:${flower.palette.stem};--leaf:${flower.palette.leaf};`}
            data-state="idle"
            data-seed={String(flower.index)}
            data-rotation={String(flower.rotation)}
            data-scale={String(flower.scale)}
          >
            <svg className="black-garden-art" viewBox="0 0 160 220" width="100%" role="img" aria-hidden="true">
              <g strokeLinecap="round" strokeLinejoin="round">
                <ellipse cx="80" cy="66" rx="20" ry="36" fill="var(--petal)" stroke="#2a0d0d" strokeWidth="2.5" />
                <ellipse cx="80" cy="66" rx="20" ry="36" fill="var(--petal-alt)" stroke="#2a0d0d" strokeWidth="2.5" transform="rotate(45 80 66)" />
                <ellipse cx="80" cy="66" rx="20" ry="36" fill="var(--petal)" stroke="#2a0d0d" strokeWidth="2.5" transform="rotate(90 80 66)" />
                <ellipse cx="80" cy="66" rx="20" ry="36" fill="var(--petal-alt)" stroke="#2a0d0d" strokeWidth="2.5" transform="rotate(135 80 66)" />

                <circle cx="80" cy="68" r="16" fill="var(--center)" stroke="#493b0c" strokeWidth="3" />

                <path d="M80 88 L80 182" stroke="var(--stem)" strokeWidth="6" />
                <path d="M80 116 C 58 108, 48 128, 68 137" fill="none" stroke="var(--leaf)" strokeWidth="4" />
                <path d="M80 132 C 103 124, 112 146, 92 151" fill="none" stroke="var(--leaf)" strokeWidth="4" />

                <path d="M74 156 L58 166" stroke="var(--leaf)" strokeWidth="4.2" />
                <path d="M88 166 L104 175" stroke="var(--leaf)" strokeWidth="4.2" />
                <path d="M79 176 L65 190" stroke="var(--leaf)" strokeWidth="4.2" />
              </g>
            </svg>
          </button>
        ))}

        <div className="black-garden-poem" aria-label="poem">
          {poemLines.map((line, index) => {
            const first = line.charAt(0);
            const rest = line.slice(1);
            return (
              <p className="black-garden-poem-line" key={index}>
                <span
                  className="black-garden-poem-initial"
                  style={`color:${poemInitialColor};`}
                >
                  {first}
                </span>
                {rest}
              </p>
            );
          })}
        </div>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              var flowers = Array.prototype.slice.call(document.querySelectorAll('.black-garden-flower'));
              if (!flowers.length) return;

              function computeFlight(element) {
                var rect = element.getBoundingClientRect();
                var cx = rect.left + rect.width / 2;
                var cy = rect.top + rect.height / 2;

                return {
                  flyX: Math.round(window.innerWidth - cx + 140),
                  flyY: Math.round(window.innerHeight - cy + 180)
                };
              }

              function easeInOutCubic(t) {
                return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
              }

              function easeOutCubic(t) {
                return 1 - Math.pow(1 - t, 3);
              }

              function lerp(a, b, t) {
                return a + (b - a) * t;
              }

              function cubicBezierPoint(p0, p1, p2, p3, t) {
                var mt = 1 - t;
                return (
                  mt * mt * mt * p0 +
                  3 * mt * mt * t * p1 +
                  3 * mt * t * t * p2 +
                  t * t * t * p3
                );
              }

              function setTransform(flower, x, y, rotation, scale) {
                flower.style.transform =
                  'translate3d(calc(-50% + ' + x.toFixed(2) + 'px), calc(-50% + ' + y.toFixed(2) + 'px), 0) rotate(' +
                  rotation.toFixed(2) + 'deg) scale(' + scale.toFixed(4) + ')';
              }

              function runAnimation(duration, onTick, onDone) {
                var start = performance.now();

                function frame(now) {
                  var raw = (now - start) / duration;
                  var t = raw > 1 ? 1 : raw;
                  onTick(t);
                  if (t < 1) {
                    requestAnimationFrame(frame);
                    return;
                  }
                  onDone();
                }

                requestAnimationFrame(frame);
              }

              function sampleLoopPath(t, targetX, targetY) {
                // 1) smooth bend to top-left
                if (t < 0.44) {
                  var u1 = easeInOutCubic(t / 0.44);
                  return {
                    x: cubicBezierPoint(0, -80, -180, -220, u1),
                    y: cubicBezierPoint(0, -18, -120, -190, u1)
                  };
                }

                // 2) one simple loop
                if (t < 0.78) {
                  var u2 = (t - 0.44) / 0.34;
                  var angle = -2.2 + 5.2 * u2;
                  return {
                    x: -150 + 70 * Math.cos(angle),
                    y: -130 + 70 * Math.sin(angle)
                  };
                }

                // 3) exit to bottom-right outside screen
                var u3 = easeInOutCubic((t - 0.78) / 0.22);
                return {
                  x: cubicBezierPoint(-219, -30, targetX * 0.44, targetX, u3),
                  y: cubicBezierPoint(-120, 18, targetY * 0.58, targetY, u3)
                };
              }

              function animateLaunch(flower, flight, done) {
                var baseRotation = Number(flower.getAttribute('data-rotation') || '0');
                var baseScale = Number(flower.getAttribute('data-scale') || '1');

                runAnimation(1500, function(t) {
                  var p = sampleLoopPath(t, flight.flyX, flight.flyY);
                  var rot = baseRotation + 340 * easeInOutCubic(t);
                  var scale = baseScale * lerp(1, 0.06, Math.pow(t, 1.15));
                  var opacity = t < 0.72 ? 1 : lerp(1, 0, easeOutCubic((t - 0.72) / 0.28));

                  setTransform(flower, p.x, p.y, rot, scale);
                  flower.style.opacity = String(Math.max(0, Math.min(1, opacity)));
                }, done);
              }

              function animateReturn(flower, flight, done) {
                var baseRotation = Number(flower.getAttribute('data-rotation') || '0');
                var baseScale = Number(flower.getAttribute('data-scale') || '1');

                runAnimation(700, function(t) {
                  var u = easeOutCubic(t);
                  var x = lerp(flight.flyX, 0, u);
                  var y = lerp(flight.flyY, 0, u);
                  var rot = lerp(baseRotation + 340, baseRotation, u);
                  var scale = lerp(baseScale * 0.06, baseScale, u);

                  setTransform(flower, x, y, rot, scale);
                  flower.style.opacity = String(u);
                }, done);
              }

              function launchFlower(flower) {
                if (flower.getAttribute('data-state') !== 'idle') return;

                var flight = computeFlight(flower);
                flower.setAttribute('data-state', 'launched');

                animateLaunch(flower, flight, function() {
                  window.setTimeout(function() {
                    flower.setAttribute('data-state', 'returning');
                    animateReturn(flower, flight, function() {
                      flower.style.transform = '';
                      flower.style.opacity = '';
                      flower.setAttribute('data-state', 'idle');
                    });
                  }, 260);
                });
              }

              window.blackGardenLaunch = launchFlower;

              flowers.forEach(function(flower) {
                flower.addEventListener('pointerenter', function() {
                  launchFlower(flower);
                });
                flower.addEventListener('mouseenter', function() {
                  launchFlower(flower);
                });
              });
            })();
          `,
        }}
      />
    </div>
  );
}
