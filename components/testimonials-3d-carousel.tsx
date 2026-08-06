"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  Quote,
  Sparkles,
} from "lucide-react";

type TestimonialCard = {
  id: string;
  quote: string;
  name: string;
  role: string;
  company?: string;
};

type Testimonials3DCarouselProps = {
  testimonials: TestimonialCard[];
};

const CARD_ACCENTS = [
  "#18e3d0",
  "#3b82f6",
  "#8b5cf6",
  "#06b6d4",
  "#14b8a6",
  "#60a5fa",
  "#22d3ee",
];

const THICKNESS_LAYERS = [
  -6,
  -4,
  -2,
  0,
  2,
  4,
  6,
];

function smoothstep(value: number) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

export function Testimonials3DCarousel({
  testimonials,
}: Testimonials3DCarouselProps) {
  const cardsRefs = useRef<
    Array<HTMLDivElement | null>
  >([]);

  const frameId = useRef<number>(0);
  const progress = useRef<number>(0);
  const paused = useRef<boolean>(false);
  const activeIndexRef = useRef<number>(0);

  const pointer = useRef({
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
  });

  const [activeIndex, setActiveIndex] =
    useState(0);

  const [reducedMotion, setReducedMotion] =
    useState(false);

  const [metrics, setMetrics] = useState({
    cardW: 500,
    cardH: 330,
  });

  const cardCount = testimonials.length;

  useEffect(() => {
    const mediaQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    const updatePreference = () => {
      setReducedMotion(mediaQuery.matches);
    };

    updatePreference();

    mediaQuery.addEventListener(
      "change",
      updatePreference
    );

    return () => {
      mediaQuery.removeEventListener(
        "change",
        updatePreference
      );
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const viewportWidth = window.innerWidth;

      const cardW = Math.min(
        500,
        Math.max(
          280,
          viewportWidth * 0.76
        )
      );

      const cardH =
        viewportWidth < 640 ? 390 : 330;

      setMetrics({
        cardW: Math.round(cardW),
        cardH,
      });
    };

    handleResize();

    window.addEventListener(
      "resize",
      handleResize
    );

    return () => {
      window.removeEventListener(
        "resize",
        handleResize
      );
    };
  }, []);

  useEffect(() => {
    const handleMouseMove = (
      event: MouseEvent
    ) => {
      const x =
        (event.clientX -
          window.innerWidth / 2) /
        (window.innerWidth / 2);

      const y =
        (event.clientY -
          window.innerHeight / 2) /
        (window.innerHeight / 2);

      pointer.current.targetX = Math.max(
        -1,
        Math.min(1, x)
      );

      pointer.current.targetY = Math.max(
        -1,
        Math.min(1, y)
      );
    };

    const resetPointer = () => {
      pointer.current.targetX = 0;
      pointer.current.targetY = 0;
    };

    window.addEventListener(
      "mousemove",
      handleMouseMove
    );

    document.addEventListener(
      "mouseleave",
      resetPointer
    );

    return () => {
      window.removeEventListener(
        "mousemove",
        handleMouseMove
      );

      document.removeEventListener(
        "mouseleave",
        resetPointer
      );
    };
  }, []);

  useEffect(() => {
    if (cardCount === 0) return;

    const renderCards = () => {
      if (
        !paused.current &&
        !reducedMotion
      ) {
        progress.current += 0.00125;
      }

      pointer.current.x +=
        (pointer.current.targetX -
          pointer.current.x) *
        0.075;

      pointer.current.y +=
        (pointer.current.targetY -
          pointer.current.y) *
        0.075;

      const roundedIndex = Math.round(
        progress.current
      );

      const difference =
        progress.current - roundedIndex;

      const easedDifference =
        Math.sign(difference) *
        Math.pow(
          Math.abs(difference) * 2,
          4.2
        ) /
        2;

      const virtualIndex =
        roundedIndex + easedDifference;

      const nextActiveIndex =
        ((roundedIndex % cardCount) +
          cardCount) %
        cardCount;

      if (
        nextActiveIndex !==
        activeIndexRef.current
      ) {
        activeIndexRef.current =
          nextActiveIndex;

        setActiveIndex(nextActiveIndex);
      }

      cardsRefs.current.forEach(
        (card, index) => {
          if (!card) return;

          let offset =
            index - virtualIndex;

          const halfCount =
            cardCount / 2;

          while (offset > halfCount) {
            offset -= cardCount;
          }

          while (offset < -halfCount) {
            offset += cardCount;
          }

          const absoluteOffset =
            Math.abs(offset);

          const direction =
            Math.sign(offset);

          if (absoluteOffset > 3.1) {
            card.style.visibility =
              "hidden";

            return;
          }

          card.style.visibility =
            "visible";

          let x = 0;
          let z = 0;
          let rotationY = 0;
          let opacity = 1;

          if (absoluteOffset <= 1) {
            const eased =
              smoothstep(
                absoluteOffset
              );

            x =
              direction *
              eased *
              metrics.cardW *
              0.78;

            z =
              360 +
              eased * (70 - 360);

            rotationY =
              -direction *
              eased *
              58;
          } else if (
            absoluteOffset <= 2
          ) {
            const eased =
              smoothstep(
                absoluteOffset - 1
              );

            const startX =
              metrics.cardW * 0.78;

            const endX =
              metrics.cardW * 1.48;

            x =
              direction *
              (startX +
                eased *
                  (endX - startX));

            z =
              70 +
              eased * (-180 - 70);

            rotationY =
              -direction *
              (58 +
                eased * (82 - 58));

            opacity =
              1 - eased * 0.48;
          } else {
            const eased =
              smoothstep(
                Math.min(
                  absoluteOffset - 2,
                  1
                )
              );

            const startX =
              metrics.cardW * 1.48;

            const endX =
              metrics.cardW * 2.2;

            x =
              direction *
              (startX +
                eased *
                  (endX - startX));

            z =
              -180 +
              eased *
                (-420 + 180);

            rotationY =
              -direction *
              (82 +
                eased *
                  (104 - 82));

            opacity =
              0.52 -
              eased * 0.52;
          }

          const centerFactor =
            Math.max(
              0,
              1 - absoluteOffset
            );

          const pointerTiltX =
            -pointer.current.y *
            8 *
            centerFactor;

          const pointerTiltY =
            pointer.current.x *
            11 *
            centerFactor;

          const pointerTiltZ =
            pointer.current.x *
            0.7 *
            centerFactor;

          card.style.zIndex = String(
            Math.round(
              1000 -
                absoluteOffset * 100
            )
          );

          card.style.opacity = String(
            Math.max(0, opacity)
          );

          card.style.pointerEvents =
            absoluteOffset < 0.6
              ? "auto"
              : "none";

          card.style.filter = `
            saturate(${
              1 -
              Math.min(
                absoluteOffset * 0.12,
                0.3
              )
            })
            brightness(${
              1 -
              Math.min(
                absoluteOffset * 0.08,
                0.18
              )
            })
          `;

          card.style.transform = `
            translate3d(
              ${x.toFixed(2)}px,
              0px,
              ${z.toFixed(2)}px
            )
            rotateX(
              ${pointerTiltX.toFixed(
                2
              )}deg
            )
            rotateY(
              ${(
                rotationY +
                pointerTiltY
              ).toFixed(2)}deg
            )
            rotateZ(
              ${pointerTiltZ.toFixed(
                2
              )}deg
            )
          `;
        }
      );
    };

    const tick = () => {
      renderCards();

      frameId.current =
        requestAnimationFrame(tick);
    };

    frameId.current =
      requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(
        frameId.current
      );
    };
  }, [
    cardCount,
    metrics.cardH,
    metrics.cardW,
    reducedMotion,
  ]);

  const showPrevious = () => {
    progress.current =
      Math.round(progress.current) - 1;
  };

  const showNext = () => {
    progress.current =
      Math.round(progress.current) + 1;
  };

  const showTestimonial = (
    index: number
  ) => {
    const roundedIndex =
      Math.round(progress.current);

    const currentIndex =
      ((roundedIndex % cardCount) +
        cardCount) %
      cardCount;

    let difference =
      index - currentIndex;

    if (difference > cardCount / 2) {
      difference -= cardCount;
    }

    if (
      difference <
      -cardCount / 2
    ) {
      difference += cardCount;
    }

    progress.current =
      roundedIndex + difference;
  };

  if (cardCount === 0) {
    return (
      <div className="cq-card mx-auto max-w-2xl p-8 text-center">
        <p className="text-sm text-[var(--cq-text-2)]">
          Customer testimonials will
          appear here.
        </p>
      </div>
    );
  }

  return (
    <div
      className="relative overflow-hidden"
      onMouseEnter={() => {
        paused.current = true;
      }}
      onMouseLeave={() => {
        paused.current = false;
      }}
    >
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[390px] w-[780px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/8 blur-[115px]" />

      <div
        className="relative mx-auto h-[560px] max-w-7xl overflow-hidden sm:h-[580px]"
        style={{
          perspective: "1350px",
        }}
      >
        <div
          className="absolute left-1/2 top-1/2"
          style={{
            width: `${metrics.cardW}px`,
            height: `${metrics.cardH}px`,
            marginLeft: `${
              -metrics.cardW / 2
            }px`,
            marginTop: `${
              -metrics.cardH / 2
            }px`,
            transformStyle:
              "preserve-3d",
          }}
        >
          {testimonials.map(
            (testimonial, index) => {
              const accent =
                CARD_ACCENTS[
                  index %
                    CARD_ACCENTS.length
                ];

              return (
                <div
                  key={testimonial.id}
                  ref={(element) => {
                    cardsRefs.current[
                      index
                    ] = element;
                  }}
                  className="absolute inset-0 will-change-transform"
                  style={{
                    width: `${metrics.cardW}px`,
                    height: `${metrics.cardH}px`,
                    transformStyle:
                      "preserve-3d",
                    backfaceVisibility:
                      "visible",
                  }}
                >
                  {THICKNESS_LAYERS.map(
                    (depth) => (
                      <div
                        key={depth}
                        aria-hidden="true"
                        className="absolute inset-0 rounded-[26px] border border-cyan-300/10"
                        style={{
                          transform: `translateZ(${depth}px)`,
                          background:
                            "linear-gradient(145deg, #123d58, #071625)",
                          boxShadow:
                            "inset 0 1px 0 rgba(255,255,255,.05)",
                        }}
                      />
                    )
                  )}

                  <article
                    className="absolute inset-0 overflow-hidden rounded-[26px] p-6 sm:p-8"
                    style={{
                      transform:
                        "translateZ(7px)",
                      backfaceVisibility:
                        "hidden",
                      border: `1px solid ${accent}66`,
                      background: `
                        radial-gradient(
                          circle at 88% 8%,
                          ${accent}2b,
                          transparent 34%
                        ),
                        radial-gradient(
                          circle at 5% 100%,
                          rgba(59,130,246,.14),
                          transparent 38%
                        ),
                        linear-gradient(
                          145deg,
                          rgba(14,45,70,.98),
                          rgba(5,20,34,.99)
                        )
                      `,
                      boxShadow: `
                        0 35px 85px rgba(0,0,0,.55),
                        0 0 40px ${accent}22,
                        inset 0 1px 0 rgba(255,255,255,.09)
                      `,
                    }}
                  >
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent_15%,rgba(255,255,255,.055)_45%,transparent_72%)]" />

                    <div className="relative flex h-full flex-col">
                      <div className="flex items-center justify-between gap-4">
                        <div
                          className="flex h-11 w-11 items-center justify-center rounded-xl border"
                          style={{
                            color: accent,
                            borderColor: `${accent}55`,
                            background: `${accent}16`,
                            boxShadow: `0 0 24px ${accent}22`,
                          }}
                        >
                          <Quote className="h-5 w-5" />
                        </div>

                        <span
                          className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.08em]"
                          style={{
                            color: accent,
                            borderColor: `${accent}44`,
                            background: `${accent}12`,
                          }}
                        >
                          <Sparkles className="h-3 w-3" />
                          Customer story
                        </span>
                      </div>

                      <blockquote className="mt-6 flex-1 text-[13px] font-medium leading-6 text-slate-100 sm:text-[15px] sm:leading-7">
                        “
                        {testimonial.quote}
                        ”
                      </blockquote>

                      <figcaption className="mt-5 border-t border-white/10 pt-4">
                        <p className="text-[15px] font-extrabold text-white">
                          {testimonial.name}
                        </p>

                        <p
                          className="mt-1 text-[12px] font-semibold"
                          style={{
                            color: accent,
                          }}
                        >
                          {[
                            testimonial.role,
                            testimonial.company,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      </figcaption>
                    </div>
                  </article>

                  <article
                    aria-hidden="true"
                    className="absolute inset-0 overflow-hidden rounded-[26px] p-8"
                    style={{
                      transform:
                        "translateZ(-7px) rotateY(180deg)",
                      backfaceVisibility:
                        "hidden",
                      border: `1px solid ${accent}55`,
                      background: `
                        radial-gradient(
                          circle at 50% 20%,
                          ${accent}25,
                          transparent 45%
                        ),
                        linear-gradient(
                          145deg,
                          rgba(12,42,65,.99),
                          rgba(4,17,30,.99)
                        )
                      `,
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,.08)",
                    }}
                  >
                    <div className="flex h-full flex-col items-center justify-center text-center">
                      <img
                        src="/logo-icon.png"
                        alt=""
                        className="h-14 w-14 object-contain"
                      />

                      <p
                        className="mt-5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em]"
                        style={{
                          color: accent,
                        }}
                      >
                        Crawler Que Customer
                      </p>

                      <p className="mt-3 text-xl font-extrabold text-white">
                        {testimonial.name}
                      </p>

                      <p className="mt-2 max-w-xs text-sm leading-6 text-slate-400">
                        {[
                          testimonial.role,
                          testimonial.company,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </div>
                  </article>
                </div>
              );
            }
          )}
        </div>
      </div>

      <div className="relative z-20 -mt-5 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={showPrevious}
          aria-label="Show previous testimonial"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--cq-line)] bg-[var(--cq-surface)] text-[var(--cq-text-2)] transition hover:border-[var(--cq-signal)] hover:text-[var(--cq-signal)]"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2">
          {testimonials.map(
            (testimonial, index) => (
              <button
                key={testimonial.id}
                type="button"
                onClick={() =>
                  showTestimonial(index)
                }
                aria-label={`Show testimonial from ${testimonial.name}`}
                className={`h-2 rounded-full transition-all duration-300 ${
                  activeIndex === index
                    ? "w-8 bg-[var(--cq-signal)]"
                    : "w-2 bg-[var(--cq-text-3)]/35 hover:bg-[var(--cq-text-2)]"
                }`}
              />
            )
          )}
        </div>

        <button
          type="button"
          onClick={showNext}
          aria-label="Show next testimonial"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--cq-line)] bg-[var(--cq-surface)] text-[var(--cq-text-2)] transition hover:border-[var(--cq-signal)] hover:text-[var(--cq-signal)]"
        >
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <p className="relative z-20 mt-5 text-center font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--cq-text-3)]">
        Move your cursor to explore
        the 3D customer stories
      </p>
    </div>
  );
}