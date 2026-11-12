import { useEffect, useRef, useState } from "react";
import lottie from "lottie-web/build/player/lottie_light";
import { Icon } from "./Visuals";

const assets = import.meta.glob("../assets/animations/*.json", { import: "default" });

export function ExerciseAnimation({ id, decorative = false, label, stillFrame }) {
  const container = useRef(null);
  const player = useRef(null);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReduced(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);

  useEffect(() => {
    let canceled = false;
    let animation;
    setReady(false);
    setFailed(false);
    assets[`../assets/animations/${id}.json`]().then((data) => {
      if (canceled) return;
      // lottie-web mutates animationData: isolate each instance and remount.
      animation = lottie.loadAnimation({
        container: container.current,
        animationData: structuredClone(data),
        renderer: "svg", loop: true, autoplay: false,
        rendererSettings: { preserveAspectRatio: "xMidYMid meet", progressiveLoad: false },
      });
      player.current = animation;
      animation.addEventListener("DOMLoaded", () => {
        if (canceled) return;
        animation.goToAndStop(stillFrame ?? Math.round(animation.totalFrames * 0.2), true);
        setReady(true);
      });
      animation.addEventListener("data_failed", () => { if (!canceled) setFailed(true); });
    }).catch(() => { if (!canceled) setFailed(true); });
    return () => {
      canceled = true;
      animation?.destroy();
      player.current = null;
    };
  }, [id, stillFrame]);

  useEffect(() => {
    if (!ready) return;
    let visible = true;
    const sync = () => {
      const animation = player.current;
      if (!animation) return;
      if (stillFrame != null || reduced) animation.goToAndStop(stillFrame ?? Math.round(animation.totalFrames * 0.2), true);
      else if (paused || document.hidden || !visible) animation.pause();
      else animation.play();
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    observer.observe(container.current);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", sync); };
  }, [paused, reduced, ready, stillFrame]);

  return <div className={`exercise-animation ${decorative ? "hero-animation" : ""}`} aria-hidden={decorative || undefined}>
    <div ref={container} className="animation-stage" role={decorative ? undefined : "img"} aria-label={decorative ? undefined : `${label} demonstration`} />
    {failed && !decorative && <span className="animation-error">Animation unavailable</span>}
    {!decorative && stillFrame == null && ready && !reduced && <button className="animation-toggle" aria-label={paused ? "Play demonstration" : "Pause demonstration"} onClick={() => setPaused((value) => !value)}><Icon name={paused ? "play" : "pause"} size={16} /></button>}
  </div>;
}
