"use client"

import { useRef, useEffect, useState, type CSSProperties } from "react"
import { Renderer, Program, Triangle, Mesh } from "ogl"

type Origin = "top-right" | "top-left" | "bottom-right" | "bottom-left"

interface SideRaysProps {
  speed?: number
  rayColor1?: string
  rayColor2?: string
  intensity?: number
  spread?: number
  origin?: Origin
  tilt?: number
  saturation?: number
  blend?: number
  falloff?: number
  opacity?: number
  className?: string
  style?: CSSProperties
}

const hexToRgb = (hex: string): [number, number, number] => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return m ? [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255] : [1, 1, 1]
}

const originToFlip = (origin: Origin): [number, number] => {
  switch (origin) {
    case "top-left": return [1, 0]
    case "bottom-right": return [0, 1]
    case "bottom-left": return [1, 1]
    default: return [0, 0]
  }
}

/**
 * WebGL side-ray glow (React Bits). Renders a full-size animated ray fan on a
 * transparent canvas; only paints while on screen (IntersectionObserver) and
 * tears down its GL context on unmount.
 */
export function SideRays({
  speed = 2.5,
  rayColor1 = "#EAB308",
  rayColor2 = "#96c8ff",
  intensity = 2,
  spread = 2,
  origin = "top-right",
  tilt = 0,
  saturation = 1.5,
  blend = 0.75,
  falloff = 1.6,
  opacity = 1.0,
  className = "",
  style,
}: SideRaysProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const uniformsRef = useRef<any>(null)
  const rendererRef = useRef<Renderer | null>(null)
  const animationIdRef = useRef<number | null>(null)
  const meshRef = useRef<Mesh | null>(null)
  // Pause/resume the render loop from the visibility effect without touching the
  // GL context — tearing the context down on scroll is what flashed white.
  const startLoopRef = useRef<(() => void) | null>(null)
  const stopLoopRef = useRef<(() => void) | null>(null)
  const teardownRef = useRef<(() => void) | null>(null)
  const isVisibleRef = useRef(false)
  const [isVisible, setIsVisible] = useState(false)
  // Fade the canvas in only once the first frame has painted, so it eases in
  // instead of snapping to full brightness the moment WebGL is ready.
  const [ready, setReady] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    observerRef.current = new IntersectionObserver(
      (entries) => setIsVisible(entries[0].isIntersecting),
      { threshold: 0.1 },
    )
    observerRef.current.observe(containerRef.current)

    return () => {
      observerRef.current?.disconnect()
      observerRef.current = null
    }
  }, [])

  // Init the GL context once. The context lives for the component's lifetime and
  // is only destroyed on unmount; scrolling merely pauses the loop (effect below).
  useEffect(() => {
    if (!containerRef.current) return

    const initializeWebGL = async () => {
      if (!containerRef.current) return
      await new Promise((resolve) => setTimeout(resolve, 10))
      if (!containerRef.current) return

      const renderer = new Renderer({ dpr: Math.min(window.devicePixelRatio, 2), alpha: true })
      rendererRef.current = renderer

      const gl = renderer.gl
      // Clear to fully transparent so the canvas never flashes an opaque (white)
      // frame before the shader first paints or while the context re-inits.
      gl.clearColor(0, 0, 0, 0)
      gl.canvas.style.width = "100%"
      gl.canvas.style.height = "100%"
      gl.canvas.style.background = "transparent"

      while (containerRef.current.firstChild) {
        containerRef.current.removeChild(containerRef.current.firstChild)
      }
      containerRef.current.appendChild(gl.canvas)

      const vert = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}`

      const frag = `precision highp float;

uniform float iTime;
uniform vec2 iResolution;
uniform float iSpeed;
uniform vec3 iRayColor1;
uniform vec3 iRayColor2;
uniform float iIntensity;
uniform float iSpread;
uniform float iFlipX;
uniform float iFlipY;
uniform float iTilt;
uniform float iSaturation;
uniform float iBlend;
uniform float iFalloff;
uniform float iOpacity;

float rayStrength(vec2 raySource, vec2 rayRefDirection, vec2 coord, float seedA, float seedB, float speed) {
  vec2 sourceToCoord = coord - raySource;
  float cosAngle = dot(normalize(sourceToCoord), rayRefDirection);
  return clamp(
    (0.45 + 0.15 * sin(cosAngle * seedA + iTime * speed)) +
    (0.3 + 0.2 * cos(-cosAngle * seedB + iTime * speed)),
    0.0, 1.0) *
    clamp((iResolution.x - length(sourceToCoord)) / iResolution.x, 0.5, 1.0);
}

void main() {
  vec2 fragCoord = gl_FragCoord.xy;
  if (iFlipX > 0.5) fragCoord.x = iResolution.x - fragCoord.x;
  if (iFlipY > 0.5) fragCoord.y = iResolution.y - fragCoord.y;

  vec2 coord = vec2(fragCoord.x, iResolution.y - fragCoord.y);
  vec2 rayPos = vec2(iResolution.x * 1.1, -0.5 * iResolution.y);

  float tiltRad = iTilt * 3.14159265 / 180.0;
  float cs = cos(tiltRad);
  float sn = sin(tiltRad);
  vec2 rel = coord - rayPos;
  vec2 tiltedCoord = vec2(rel.x * cs - rel.y * sn, rel.x * sn + rel.y * cs) + rayPos;

  float halfSpread = iSpread * 0.275;
  vec2 rayRefDir1 = normalize(vec2(cos(0.785398 + halfSpread), sin(0.785398 + halfSpread)));
  vec2 rayRefDir2 = normalize(vec2(cos(0.785398 - halfSpread), sin(0.785398 - halfSpread)));

  vec4 rays1 = vec4(iRayColor1, 1.0) * rayStrength(rayPos, rayRefDir1, tiltedCoord, 36.2214, 21.11349, iSpeed);
  vec4 rays2 = vec4(iRayColor2, 1.0) * rayStrength(rayPos, rayRefDir2, tiltedCoord, 22.3991, 18.0234, iSpeed * 0.2);

  vec4 color = rays1 * (1.0 - iBlend) * 0.9 + rays2 * iBlend * 0.9;

  float distanceToLight = length(fragCoord.xy - vec2(rayPos.x, iResolution.y - rayPos.y)) / iResolution.y;
  float brightness = iIntensity * 0.4 / pow(max(distanceToLight, 0.001), iFalloff);
  color.rgb *= brightness;

  float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  color.rgb = mix(vec3(gray), color.rgb, iSaturation);

  color.a = max(color.r, max(color.g, color.b)) * iOpacity;
  gl_FragColor = color;
}`

      const [flipX, flipY] = originToFlip(origin)
      const uniforms = {
        iTime: { value: 0 },
        iResolution: { value: [1, 1] },
        iSpeed: { value: speed },
        iRayColor1: { value: hexToRgb(rayColor1) },
        iRayColor2: { value: hexToRgb(rayColor2) },
        iIntensity: { value: intensity },
        iSpread: { value: spread },
        iFlipX: { value: flipX },
        iFlipY: { value: flipY },
        iTilt: { value: tilt },
        iSaturation: { value: saturation },
        iBlend: { value: blend },
        iFalloff: { value: falloff },
        iOpacity: { value: opacity },
      }
      uniformsRef.current = uniforms

      const geometry = new Triangle(gl)
      const program = new Program(gl, { vertex: vert, fragment: frag, uniforms })
      const mesh = new Mesh(gl, { geometry, program })
      meshRef.current = mesh

      const updateSize = () => {
        if (!containerRef.current || !renderer) return
        renderer.dpr = Math.min(window.devicePixelRatio, 2)
        const { clientWidth: w, clientHeight: h } = containerRef.current
        renderer.setSize(w, h)
        uniforms.iResolution.value = [w * renderer.dpr, h * renderer.dpr]
      }

      let painted = false
      const loop = (t: number) => {
        if (!rendererRef.current || !uniformsRef.current || !meshRef.current) return
        uniforms.iTime.value = t * 0.001
        try {
          renderer.render({ scene: mesh })
          if (!painted) {
            painted = true
            setReady(true)
          }
          animationIdRef.current = requestAnimationFrame(loop)
        } catch {
          return
        }
      }

      startLoopRef.current = () => {
        if (animationIdRef.current == null) animationIdRef.current = requestAnimationFrame(loop)
      }
      stopLoopRef.current = () => {
        if (animationIdRef.current != null) {
          cancelAnimationFrame(animationIdRef.current)
          animationIdRef.current = null
        }
      }

      window.addEventListener("resize", updateSize)
      updateSize()
      // Only start painting if the section is already on screen.
      if (isVisibleRef.current) startLoopRef.current()

      teardownRef.current = () => {
        stopLoopRef.current?.()
        window.removeEventListener("resize", updateSize)
        try {
          const loseCtx = renderer.gl.getExtension("WEBGL_lose_context")
          loseCtx?.loseContext()
          const canvas = renderer.gl.canvas
          if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas)
        } catch {
          /* noop */
        }
        rendererRef.current = null
        uniformsRef.current = null
        meshRef.current = null
      }
    }

    initializeWebGL()

    return () => {
      setReady(false)
      teardownRef.current?.()
      teardownRef.current = null
      startLoopRef.current = null
      stopLoopRef.current = null
    }
  }, [])

  // Pause the loop when off screen, resume when back — context stays alive.
  useEffect(() => {
    isVisibleRef.current = isVisible
    if (isVisible) startLoopRef.current?.()
    else stopLoopRef.current?.()
  }, [isVisible])

  useEffect(() => {
    if (!uniformsRef.current) return
    const u = uniformsRef.current
    u.iSpeed.value = speed
    u.iRayColor1.value = hexToRgb(rayColor1)
    u.iRayColor2.value = hexToRgb(rayColor2)
    u.iIntensity.value = intensity
    u.iSpread.value = spread
    const [flipX, flipY] = originToFlip(origin)
    u.iFlipX.value = flipX
    u.iFlipY.value = flipY
    u.iTilt.value = tilt
    u.iSaturation.value = saturation
    u.iBlend.value = blend
    u.iFalloff.value = falloff
    u.iOpacity.value = opacity
  }, [speed, rayColor1, rayColor2, intensity, spread, origin, tilt, saturation, blend, falloff, opacity])

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: "100%", height: "100%", position: "relative", pointerEvents: "none", overflow: "hidden", opacity: ready ? 1 : 0, transition: "opacity 1000ms ease-out", ...style }}
    />
  )
}
