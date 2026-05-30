"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { motion, useMotionValue, useSpring, AnimatePresence, useTransform } from "motion/react"
import { MIcon } from "@/components/ui/material-icon"
import { useAuth } from "@/hooks/useAuth"
import { Walkthrough } from "@/components/ui/walkthrough"

const getGlassyVariant = (text: string) => {
  let hash = 0
  for (let i = 0; i < text.length; i++) hash = text.charCodeAt(i) + ((hash << 5) - hash)
  return ["glassy-border", "glassy-border-bright", "glassy-border-tl"][Math.abs(hash) % 3]
}

type Port = { id: string; side: "left" | "right" | "top" | "bottom"; index: number }
type CNode = {
  id: string; x: number; y: number
  title: string; desc: string
  kind: string
  imageUrl?: string
  kvPairs?: { key: string; val: string }[]
  customW?: number; customH?: number
  leftPorts: Port[]; rightPorts: Port[]; topPorts: Port[]; bottomPorts: Port[]
}
type CEdge = {
  id: string
  sourceNode: string; sourcePort: string
  targetNode: string; targetPort: string
  speed: number
  color: string
}

const NODE_W = 280
const PLANE = 12000
const HALF = PLANE / 2
const PORT_GAP = 26
const STORE = "hypastack-canvas-v3"

// Card body height for port centering (drag handle is now on the left)
const HANDLE_H = 0

const nodeDims = (kind?: string, cw?: number, ch?: number): { w: number; h: number } => {
  const base = ({ service:{w:280,h:152}, database:{w:240,h:185}, gateway:{w:360,h:90},
     firewall:{w:240,h:140}, worker:{w:180,h:130}, cdn:{w:340,h:80},
     image:{w:200,h:200}, options:{w:260,h:200}, note:{w:240,h:170}
  } as Record<string,{w:number,h:number}>)[kind ?? "service"] ?? {w:280,h:152}
  return { w: cw ?? base.w, h: ch ?? base.h }
}

const portAbs = (n: CNode, p: Port): [number, number] => {
  const { w, h } = nodeDims(n.kind, n.customW, n.customH)
  if (p.side === "left" || p.side === "right") {
    const count = p.side === "left" ? n.leftPorts.length : n.rightPorts.length
    const totalH = (count - 1) * PORT_GAP
    const startY = h / 2 - totalH / 2 + HANDLE_H
    return [
      HALF + n.x + (p.side === "left" ? 0 : w),
      HALF + n.y + startY + p.index * PORT_GAP,
    ]
  } else {
    const count = p.side === "top" ? (n.topPorts?.length || 0) : (n.bottomPorts?.length || 0)
    const totalW = (count - 1) * PORT_GAP
    const startX = w / 2 - totalW / 2
    return [
      HALF + n.x + startX + p.index * PORT_GAP,
      HALF + n.y + HANDLE_H + (p.side === "top" ? 0 : h),
    ]
  }
}

const NODE_PRESETS = [
  { key: "service",  label: "Service",  icon: "Server",            title: "New Service",     desc: "HTTP / gRPC endpoint" },
  { key: "database", label: "Database", icon: "Database",          title: "Database",        desc: "PostgreSQL / MySQL" },
  { key: "gateway",  label: "Gateway",  icon: "Globe",             title: "API Gateway",     desc: "Ingress / routing" },
  { key: "firewall", label: "Firewall", icon: "Shield",            title: "Firewall",        desc: "Rules & filtering" },
  { key: "worker",   label: "Worker",   icon: "Cpu",               title: "Worker",          desc: "Background job" },
  { key: "cdn",      label: "CDN",      icon: "Layers",            title: "CDN",             desc: "Edge cache layer" },
  { key: "image",    label: "Image",    icon: "Image",             title: "Container Image", desc: "Docker / OCI image" },
  { key: "options",  label: "Options",  icon: "SlidersHorizontal", title: "Config",          desc: "Env & options" },
  { key: "note",     label: "Note",     icon: "FileText",          title: "Note",            desc: "📝 Click to edit" },
] as const

type PresetKey = typeof NODE_PRESETS[number]["key"]

const bez = (x1: number, y1: number, x2: number, y2: number, s1: string, s2?: string) => {
  const d = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), 1)
  const t = Math.max(d * 0.45, 50)
  let cx1 = x1, cy1 = y1
  if (s1 === "left") cx1 -= t; else if (s1 === "right") cx1 += t
  else if (s1 === "top") cy1 -= t; else if (s1 === "bottom") cy1 += t
  
  let cx2 = x2, cy2 = y2
  if (s2) {
    if (s2 === "left") cx2 -= t; else if (s2 === "right") cx2 += t
    else if (s2 === "top") cy2 -= t; else if (s2 === "bottom") cy2 += t
  } else {
    if (s1 === "left" || s1 === "right") cx2 = (x2 < x1 ? x2 + t : x2 - t)
    else cy2 = (y2 < y1 ? y2 + t : y2 - t)
  }
  return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`
}

export default function CanvasPage() {
  const { user } = useAuth()
  const isFree = !user?.premium
  const maxNodes = isFree ? 5 : 999
  const maxPorts = isFree ? 4 : 20
  const maxEdges = isFree ? 3 : 999

  const containerRef = useRef<HTMLDivElement>(null)
  type CtxAction = { t: "canvas" } | { t: "edge"; id: string } | { t: "port"; nid: string; pid: string } | { t: "node"; id: string }
  const [ctxMenu, setCtxMenu] = useState<{cx:number;cy:number; action: CtxAction}|null>(null)

  const panX = useMotionValue(0)
  const panY = useMotionValue(0)
  const scaleVal = useMotionValue(1)
  const inverseScale = useTransform(scaleVal, s => 1 / s)
  const lastZoomTime = useRef(0)

  const [nodes, setNodes] = useState<CNode[]>([])
  const [edges, setEdges] = useState<CEdge[]>([])
  const [dismissedWarnings, setDismissedWarnings] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<{ id: number, msg: string } | null>(null)

  // Walkthrough onboarding step
  const [wtStep, setWtStep] = useState(0)

  // DB persistence state
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [dbLoaded, setDbLoaded] = useState(false)
  // Stores the last saved snapshot for Cancel
  const savedStateRef = useRef<{ nodes: CNode[]; edges: CEdge[] } | null>(null)
  // Prevents marking dirty during initial load
  const isInitialLoad = useRef(true)

  const showToast = useCallback((msg: string) => {
    const id = Date.now()
    setToast({ id, msg })
    setTimeout(() => setToast(c => c?.id === id ? null : c), 4000)
  }, [])

  // Interaction mode ref (no re-renders during drag)
  const mode = useRef<
    | { t: "idle" }
    | { t: "pan"; lx: number; ly: number }
    | { t: "node"; id: string; lx: number; ly: number }
    | { t: "edge"; sn: string; sp: string; ss: "left"|"right"|"top"|"bottom"; sx: number; sy: number }
    | { t: "resize"; id: string; lx: number; ly: number; edge: "right"|"bottom"|"corner" }
  >({ t: "idle" })

  const [edgeMouse, setEdgeMouse] = useState<{mx:number;my:number}|null>(null)
  const [cursor, setCursor] = useState("grab")

  // Persistence
  const [isLoaded, setIsLoaded] = useState(false)
  
  // To trigger saves when camera moves (without forcing re-renders)
  const saveStorage = useCallback(() => {
    localStorage.setItem(STORE, JSON.stringify({
      nodes, edges,
      camera: { x: panX.get(), y: panY.get(), z: scaleVal.get() }
    }))
  }, [nodes, edges, panX, panY, scaleVal])

  // Normalize a row from storage/API
  const normalizeNodes = (arr: CNode[]) => arr.map((n: CNode) => ({ ...n, kind: n.kind ?? "service", kvPairs: n.kvPairs ?? [], imageUrl: n.imageUrl ?? "", topPorts: n.topPorts ?? [], bottomPorts: n.bottomPorts ?? [] }))
  const normalizeEdges = (arr: CEdge[]) => arr.map((e: CEdge) => ({ ...e, speed: e.speed ?? 1, color: e.color ?? "#ffffff" }))

  useEffect(() => {
    // 1. Load local storage first for instant paint
    let localNodes: CNode[] = []
    let localEdges: CEdge[] = []
    try {
      const d = JSON.parse(localStorage.getItem(STORE) || "{}")
      if (Array.isArray(d.nodes) && d.nodes.length) localNodes = normalizeNodes(d.nodes)
      if (Array.isArray(d.edges) && d.edges.length) localEdges = normalizeEdges(d.edges)
      if (d.camera) {
        panX.set(d.camera.x || 0)
        panY.set(d.camera.y || 0)
        scaleVal.set(d.camera.z || 1)
      }
    } catch {}

    if (localNodes.length) setNodes(localNodes)
    if (localEdges.length) setEdges(localEdges)
    setIsLoaded(true)

    // 2. Then try to load from DB (overrides localStorage for nodes/edges)
    fetch("/api/v2/canvas")
      .then(r => r.ok ? r.json() : null)
      .then((res) => {
        if (!res?.data) return
        const d = res.data
        const dbNodes = Array.isArray(d.nodes) ? normalizeNodes(d.nodes) : []
        const dbEdges = Array.isArray(d.edges) ? normalizeEdges(d.edges) : []
        // Prefer DB data; keep camera from localStorage (viewport preference)
        isInitialLoad.current = true
        if (dbNodes.length || dbEdges.length) {
          setNodes(dbNodes)
          setEdges(dbEdges)
          savedStateRef.current = { nodes: dbNodes, edges: dbEdges }
        } else {
          savedStateRef.current = { nodes: localNodes, edges: localEdges }
        }
        // camera from DB if present
        if (d.camera) {
          panX.set(d.camera.x || 0)
          panY.set(d.camera.y || 0)
          scaleVal.set(d.camera.z || 1)
        }
      })
      .catch(() => {
        savedStateRef.current = { nodes: localNodes, edges: localEdges }
      })
      .finally(() => {
        setDbLoaded(true)
        // Allow dirty tracking after a brief tick
        setTimeout(() => { isInitialLoad.current = false }, 100)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (isLoaded) saveStorage()
  }, [nodes, edges, isLoaded, saveStorage])

  // Mark dirty on any node/edge change (but not during initial load)
  useEffect(() => {
    if (isInitialLoad.current || !dbLoaded) return
    setIsDirty(true)
  }, [nodes, edges, dbLoaded])

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      const res = await fetch("/api/v2/canvas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodes, edges,
          camera: { x: panX.get(), y: panY.get(), z: scaleVal.get() }
        })
      })
      if (res.ok) {
        savedStateRef.current = { nodes, edges }
        setIsDirty(false)
        setWtStep(s => s === 4 ? 5 : s)
        showToast("Canvas saved.")
      } else {
        showToast("Failed to save canvas. Please try again.")
      }
    } catch {
      showToast("Network error. Canvas not saved.")
    } finally {
      setIsSaving(false)
    }
  }, [nodes, edges, panX, panY, scaleVal, showToast])

  const handleCancel = useCallback(() => {
    if (!savedStateRef.current) return
    isInitialLoad.current = true
    setNodes(savedStateRef.current.nodes)
    setEdges(savedStateRef.current.edges)
    setIsDirty(false)
    setTimeout(() => { isInitialLoad.current = false }, 100)
  }, [])

  // Track camera changes for saving
  useEffect(() => {
    if (!isLoaded) return
    const u1 = panX.on("change", saveStorage)
    const u2 = panY.on("change", saveStorage)
    const u3 = scaleVal.on("change", saveStorage)
    return () => { u1(); u2(); u3() }
  }, [isLoaded, panX, panY, scaleVal, saveStorage])

  // Strict camera clamp to prevent seeing the void
  const clampPan = useCallback((px: number, py: number, s: number) => {
    if (!containerRef.current) return { x: px, y: py }
    const r = containerRef.current.getBoundingClientRect()
    // The max pan distance where the edge of the scaled plane touches the edge of the viewport
    const maxPanX = Math.max(0, HALF * s - r.width / 2)
    const maxPanY = Math.max(0, HALF * s - r.height / 2)
    return {
      x: Math.max(-maxPanX, Math.min(maxPanX, px)),
      y: Math.max(-maxPanY, Math.min(maxPanY, py))
    }
  }, [])

  // Screen → plane coordinate conversion
  const s2p = useCallback((sx: number, sy: number): [number, number] => {
    const r = containerRef.current!.getBoundingClientRect()
    const s = scaleVal.get()
    return [
      (sx - r.left - r.width/2 - panX.get()) / s + HALF,
      (sy - r.top - r.height/2 - panY.get()) / s + HALF,
    ]
  }, [scaleVal, panX, panY])

  // Zoom — towards cursor, 6% steps
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const h = (e: WheelEvent) => {
      e.preventDefault(); e.stopPropagation()
      
      // Zooming
      const now = Date.now()
      if (now - lastZoomTime.current < 40) return
      lastZoomTime.current = now
      const dir = Math.sign(-e.deltaY)
      if (!dir) return

      const oldScale = scaleVal.get()
      let newScale = oldScale + dir * 0.10
      newScale = Math.round(newScale * 20) / 20
      newScale = Math.min(Math.max(newScale, 0.4), 5)
      if (newScale === oldScale) return

      const rect = el.getBoundingClientRect()
      const mx = e.clientX - rect.left - rect.width / 2
      const my = e.clientY - rect.top - rect.height / 2
      const ratio = newScale / oldScale
      
      const nextX = mx - (mx - panX.get()) * ratio
      const nextY = my - (my - panY.get()) * ratio
      const { x: cx, y: cy } = clampPan(nextX, nextY, newScale)
      panX.set(cx)
      panY.set(cy)
      scaleVal.set(newScale)
      setWtStep(s => s === 12 ? 13 : s)
    }
    el.addEventListener("wheel", h, { passive: false })
    return () => el.removeEventListener("wheel", h)
  }, [scaleVal])

  // Close context menu
  useEffect(() => {
    const h = () => setCtxMenu(null)
    window.addEventListener("click", h)
    return () => window.removeEventListener("click", h)
  }, [])

  // Unified pointer move/up on window
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const m = mode.current
      if (m.t === "pan") {
        const nextX = panX.get() + e.clientX - m.lx
        const nextY = panY.get() + e.clientY - m.ly
        const { x: cx, y: cy } = clampPan(nextX, nextY, scaleVal.get())
        panX.set(cx)
        panY.set(cy)
        m.lx = e.clientX; m.ly = e.clientY
      } else if (m.t === "node") {
        const s = scaleVal.get()
        const dx = (e.clientX - m.lx) / s
        const dy = (e.clientY - m.ly) / s
        m.lx = e.clientX; m.ly = e.clientY
        
        setNodes(p => {
          const current = p.find(n => n.id === m.id)
          if (!current) return p
          let nx = current.x + dx
          let ny = current.y + dy
          const { w, h } = nodeDims(current.kind, current.customW, current.customH)
          
          // Clamp node to dotted canvas boundaries
          nx = Math.max(-HALF + 20, Math.min(HALF - w - 20, nx))
          ny = Math.max(-HALF + 20, Math.min(HALF - h - 20, ny))

          const pad = 28
          const hT = h + HANDLE_H
          for (const o of p) {
            if (o.id === m.id) continue
            const { w: ow, h: oh } = nodeDims(o.kind, o.customW, o.customH)
            const oht = oh + HANDLE_H
            if (nx < o.x+ow+pad && nx+w+pad > o.x && ny < o.y+oht+pad && ny+hT+pad > o.y) {
              const oL=(nx+w+pad)-o.x, oR=(o.x+ow+pad)-nx, oT=(ny+hT+pad)-o.y, oB=(o.y+oht+pad)-ny
              const mn=Math.min(oL,oR,oT,oB)
              if(mn===oL) nx=o.x-(w+pad)
              else if(mn===oR) nx=o.x+(ow+pad)
              else if(mn===oT) ny=o.y-(hT+pad)
              else ny=o.y+(oht+pad)
            }
          }
          return p.map(n => n.id === m.id ? {...n, x:nx, y:ny} : n)
        })
      } else if (m.t === "resize") {
        const s = scaleVal.get()
        const dx = (e.clientX - m.lx) / s
        const dy = (e.clientY - m.ly) / s
        m.lx = e.clientX; m.ly = e.clientY
        setNodes(p => p.map(n => {
          if (n.id !== m.id) return n
          const { w, h } = nodeDims(n.kind, n.customW, n.customH)
          let nw = m.edge !== "bottom" ? Math.max(120, w + dx) : w
          let nh = m.edge !== "right" ? Math.max(80, h + dy) : h
          nw = Math.min(nw, HALF - n.x - 20)
          nh = Math.min(nh, HALF - n.y - 20)
          return { ...n, customW: Math.round(nw), customH: Math.round(nh) }
        }))
      } else if (m.t === "edge") {
        const [mx, my] = s2p(e.clientX, e.clientY)
        setEdgeMouse({ mx, my })
      }
    }
    const onUp = () => {
      const wasEdge = mode.current.t === "edge"
      const wasResize = mode.current.t === "resize"
      mode.current = { t: "idle" }
      setCursor("grab")
      if (wasEdge) setEdgeMouse(null)
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp) }
  }, [panX, panY, scaleVal, s2p])

  // Pan start (fires on container background)
  const startPan = (e: React.PointerEvent) => {
    mode.current = { t: "pan", lx: e.clientX, ly: e.clientY }
    setCursor("grabbing")
  }

  // Context menu on empty canvas
  const onCtx = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!containerRef.current) return
    const [cx, cy] = s2p(e.clientX, e.clientY)
    setCtxMenu({ cx, cy, action: { t: "canvas" } })
    setWtStep(s => (s === 0 || s === 7) ? s + 1 : s)
  }

  const onNodeCtx = (e: React.MouseEvent, id: string) => {
    e.preventDefault(); e.stopPropagation()
    if (!containerRef.current) return
    const [cx, cy] = s2p(e.clientX, e.clientY)
    setCtxMenu({ cx, cy, action: { t: "node", id } })
    setWtStep(s => s === 5 ? 6 : s)
  }

  const onEdgeCtx = (e: React.MouseEvent, id: string) => {
    e.preventDefault(); e.stopPropagation()
    if (!containerRef.current) return
    const [cx, cy] = s2p(e.clientX, e.clientY)
    setCtxMenu({ cx, cy, action: { t: "edge", id } })
    setWtStep(s => s === 11 ? 12 : s)
  }

  const onPortCtx = (e: React.MouseEvent, nid: string, pid: string) => {
    e.preventDefault(); e.stopPropagation()
    if (!containerRef.current) return
    const [cx, cy] = s2p(e.clientX, e.clientY)
    setCtxMenu({ cx, cy, action: { t: "port", nid, pid } })
  }

  const addComponent = (preset: PresetKey = "service") => {
    if (nodes.length >= maxNodes) {
      showToast(isFree ? "Free tier is limited to 5 components per canvas. Upgrade to Essential for unlimited." : "Max components reached.")
      return
    }
    if (!ctxMenu || !containerRef.current) return
    const r = containerRef.current.getBoundingClientRect()
    const s = scaleVal.get()
    const p = NODE_PRESETS.find(p => p.key === preset) ?? NODE_PRESETS[0]
    setNodes(prev => [...prev, {
      id: `n-${Date.now()}`, kind: preset,
      x: ctxMenu.cx - HALF,
      y: ctxMenu.cy - HALF,
      title: p.title, desc: p.desc,
      imageUrl: "",
      kvPairs: preset === "options" ? [{ key: "ENV", val: "production" }, { key: "PORT", val: "3000" }] : [],
      leftPorts: [], rightPorts: [], topPorts: [], bottomPorts: []
    }])
    setCtxMenu(null)
    setWtStep(s => (s === 1 || s === 8) ? s + 1 : s)
  }

  // Node drag — only from the drag handle
  const onNodeDown = (id: string, e: React.PointerEvent) => {
    e.stopPropagation(); e.preventDefault()
    mode.current = { t: "node", id, lx: e.clientX, ly: e.clientY }
    setCursor("grabbing")
    setWtStep(s => s === 3 ? 4 : s)
  }

  const onResizeDown = (id: string, edge: "right"|"bottom"|"corner", e: React.PointerEvent) => {
    e.stopPropagation(); e.preventDefault()
    mode.current = { t: "resize", id, lx: e.clientX, ly: e.clientY, edge }
    setCursor(edge === "right" ? "ew-resize" : edge === "bottom" ? "ns-resize" : "nwse-resize")
  }

  // Port / edge
  const onPortDown = (node: CNode, port: Port, e: React.PointerEvent) => {
    if (e.button === 2) return // Let right click pass through to onContextMenu
    e.stopPropagation(); e.preventDefault()
    const [sx, sy] = portAbs(node, port)
    mode.current = { t: "edge", sn: node.id, sp: port.id, ss: port.side, sx, sy }
    setEdgeMouse({ mx: sx, my: sy })
    setCursor("crosshair")
  }

  const onPortUp = (node: CNode, port: Port, e: React.PointerEvent) => {
    e.stopPropagation(); e.preventDefault()
    const m = mode.current
    if (m.t !== "edge" || m.sn === node.id) { mode.current = { t: "idle" }; setEdgeMouse(null); setCursor("grab"); return }
    
    // Check edge limits per component
    const sourceEdges = edges.filter(ed => ed.sourceNode === m.sn || ed.targetNode === m.sn).length
    const targetEdges = edges.filter(ed => ed.sourceNode === node.id || ed.targetNode === node.id).length
    if (sourceEdges >= maxEdges || targetEdges >= maxEdges) {
      showToast(isFree ? "Free tier is limited to 3 connection lines per component. Upgrade to Essential to connect all ports." : "Max connections reached.")
      mode.current = { t: "idle" }; setEdgeMouse(null); setCursor("grab"); return
    }

    const dup = edges.some(ed => ed.sourceNode === m.sn && ed.sourcePort === m.sp && ed.targetNode === node.id && ed.targetPort === port.id)
    if (!dup) {
      setEdges(p => [...p, { id: `e-${Date.now()}`, sourceNode: m.sn, sourcePort: m.sp, targetNode: node.id, targetPort: port.id, speed: 1, color: "#ffffff" }])
      setWtStep(s => s === 10 ? 11 : s)
    }
    mode.current = { t: "idle" }; setEdgeMouse(null); setCursor("grab")
  }

  const addPort = (nid: string, side: "left"|"right"|"top"|"bottom") => {
    setNodes(p => p.map(n => {
      if (n.id !== nid) return n
      const totalPorts = n.leftPorts.length + n.rightPorts.length + (n.topPorts?.length||0) + (n.bottomPorts?.length||0)
      if (totalPorts >= maxPorts) {
        alert(isFree ? "Free tier is limited to 4 connection points total per component." : "Max ports reached.")
        return n
      }
      const arr = side === "left" ? n.leftPorts : side === "right" ? n.rightPorts : side === "top" ? (n.topPorts||[]) : (n.bottomPorts||[])
      const np: Port = { id: `p-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, side, index: arr.length }
      if (side === "left") return { ...n, leftPorts: [...n.leftPorts, np] }
      if (side === "right") return { ...n, rightPorts: [...n.rightPorts, np] }
      if (side === "top") return { ...n, topPorts: [...(n.topPorts||[]), np] }
      return { ...n, bottomPorts: [...(n.bottomPorts||[]), np] }
    }))
    setWtStep(s => (s === 6 || s === 9) ? s + 1 : s)
  }

  const deleteNode = (id: string) => { 
    setNodes(ns => ns.filter(n => n.id !== id))
    setEdges(es => es.filter(e => e.sourceNode !== id && e.targetNode !== id))
    setCtxMenu(null)
  }

  const deletePort = (nid: string, pid: string) => {
    setNodes(p => p.map(n => {
      if (n.id !== nid) return n
      return { 
        ...n, 
        leftPorts: n.leftPorts.filter(x => x.id !== pid).map((x, i) => ({ ...x, index: i })), 
        rightPorts: n.rightPorts.filter(x => x.id !== pid).map((x, i) => ({ ...x, index: i })),
        topPorts: (n.topPorts||[]).filter(x => x.id !== pid).map((x, i) => ({ ...x, index: i })),
        bottomPorts: (n.bottomPorts||[]).filter(x => x.id !== pid).map((x, i) => ({ ...x, index: i }))
      }
    }))
    setEdges(es => es.filter(e => !(e.sourceNode === nid && e.sourcePort === pid) && !(e.targetNode === nid && e.targetPort === pid)))
    setCtxMenu(null)
  }

  const deleteEdge = (id: string) => {
    setEdges(es => es.filter(e => e.id !== id))
    setCtxMenu(null)
  }

  const changeEdgeSpeed = (id: string, delta: number) => {
    setEdges(es => es.map(e => e.id !== id ? e : {
      ...e,
      speed: Math.round(Math.min(10, Math.max(0.1, (e.speed ?? 1) + delta)) * 10) / 10
    }))
  }

  const setEdgeColor = (id: string, color: string) => {
    setEdges(es => es.map(e => e.id !== id ? e : { ...e, color }))
  }

  const fp = (nid: string, pid: string) => { const n = nodes.find(x => x.id === nid); if (!n) return null; const p = [...n.leftPorts, ...n.rightPorts, ...(n.topPorts||[]), ...(n.bottomPorts||[])].find(x => x.id === pid); return p ? { n, p } : null }

  const isDrawing = mode.current.t === "edge"

  return (
    <>
      {/* Mobile unsupported message */}
      <div className="flex flex-col items-center justify-center h-full text-center px-6 sm:hidden mt-20">
        <MIcon name="layers" size={48} className="text-[#444] mb-4" />
        <h2 className="text-[16px] font-medium text-[#e3e3e3] mb-2">Canvas Not Supported</h2>
        <p className="text-[14px] text-[#888] max-w-[280px]">
          Canvas is only supported for PC, switch devices for it to work
        </p>
      </div>
      
      {/* Desktop Canvas */}
      <div className="hidden sm:flex flex-1 flex-col h-full min-h-0 relative -mx-4 sm:-mx-6 lg:-mx-8 -mt-7 -mb-12 p-4 sm:p-5 lg:p-6">
        <div
          ref={containerRef}
        onPointerDown={startPan}
        onContextMenu={onCtx}
        className="flex-1 relative w-full h-full bg-[#111111] overflow-hidden select-none"
        style={{ cursor }}
      >
        {/* Plane - NO framer motion drag, fully custom pan */}
        <motion.div
          className="absolute left-1/2 top-1/2 origin-center"
          style={{ x: panX, y: panY, scale: scaleVal, width: PLANE, height: PLANE, marginLeft: -HALF, marginTop: -HALF }}
        >
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }} />

          {/* SVG edges */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
            <defs>
              <style>{`
                @keyframes flow {
                  0% { stroke-dashoffset: 16; }
                  100% { stroke-dashoffset: 0; }
                }
              `}</style>
            </defs>
            {edges.map(edge => {
              const s = fp(edge.sourceNode, edge.sourcePort), t = fp(edge.targetNode, edge.targetPort)
              if (!s || !t) return null
              const [x1, y1] = portAbs(s.n, s.p), [x2, y2] = portAbs(t.n, t.p)
              const d = bez(x1, y1, x2, y2, s.p.side, t.p.side)
              return (<g key={edge.id}>
                {/* Wire track */}
                <path d={d} stroke={edge.color || "#fff"} strokeWidth={1} fill="none" opacity={0.12} />
                {/* Flowing packets - speed controls animation duration */}
                <path d={d} stroke={edge.color || "#fff"} strokeWidth={1.5} fill="none" opacity={0.55}
                  strokeDasharray="2 14" strokeLinecap="round"
                  style={{ animation: `flow ${(0.2 / (edge.speed || 1)).toFixed(3)}s linear infinite` }}
                />
                {/* Hit area */}
                <path d={d} stroke="transparent" strokeWidth={20} fill="none"
                  className="pointer-events-auto cursor-context-menu"
                  onContextMenu={(e) => onEdgeCtx(e, edge.id)}
                />
              </g>)
            })}
            {mode.current.t === "edge" && edgeMouse && (() => {
              const m = mode.current as { t:"edge"; sx:number; sy:number; ss:"left"|"right"|"top"|"bottom" }
              const d = bez(m.sx, m.sy, edgeMouse.mx, edgeMouse.my, m.ss)
              return (<path d={d} stroke="#fff" strokeWidth={1.5} fill="none" opacity={0.5} strokeDasharray="6 4" />)
            })()}
          </svg>

          {/* Nodes */}
          <div className="absolute inset-0 z-20 pointer-events-none">
            {nodes.map(node => {
              const { w: nw, h: nh } = nodeDims(node.kind, node.customW, node.customH)
              return (
              <div key={node.id}
                className="absolute pointer-events-auto group"
                style={{ left: HALF + node.x, top: HALF + node.y, width: nw }}
              >
                {/* Drag handle bar — sits left of the card */}
                <div
                  data-drag-handle
                  onPointerDown={(e) => onNodeDown(node.id, e)}
                  className="absolute -left-[14px] top-0 bottom-0 w-[14px] flex flex-col items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ height: nh }}
                >
                  <div className="h-10 w-[3px] rounded-full bg-[#555]" />
                </div>

                {/* Card body — kind-specific layout wrapped in card-in-card */}
                <div 
                  onContextMenu={(e) => onNodeCtx(e, node.id)}
                  style={{ width: nw, height: nh, borderRadius: 20, backgroundColor: '#1f1f1f', padding: 3, boxShadow: '0 0 0 1px rgba(255,255,255,0.04)' }}
                  className="flex flex-col cursor-context-menu"
                >
                  <div className="w-full h-full bg-[#111111] flex flex-col overflow-hidden" style={{ borderRadius: 17 }}>
                    {(() => {
                      const k = node.kind ?? "service"
                      const updTitle = (e: React.FocusEvent<HTMLDivElement>) => { const t = e.currentTarget?.textContent || "Untitled"; setNodes(ns => ns.map(n => n.id === node.id ? { ...n, title: t } : n)); setWtStep(s => s === 2 ? 3 : s) }
                      const updDesc  = (e: React.FocusEvent<HTMLDivElement>) => { const t = e.currentTarget?.textContent || ""; setNodes(ns => ns.map(n => n.id === node.id ? { ...n, desc: t } : n)); setWtStep(s => s === 2 ? 3 : s) }

                      // ── SERVICE ──
                      if (k === "service") return (
                        <div className="flex-1 flex flex-col w-full h-full">
                          <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-0">
                            <MIcon name="dns" size={15} className="shrink-0" style={{ color: '#a1a1aa' }} />
                            <div contentEditable suppressContentEditableWarning spellCheck={false} onBlur={updTitle} className="outline-none cursor-text flex-1 leading-snug focus:bg-white/5 rounded px-1" style={{ fontSize: 14, fontWeight: 500, color: '#e3e3e3' }}>{node.title}</div>
                          </div>
                          <div className="px-4 pt-2 pb-3 flex-1">
                            <div contentEditable suppressContentEditableWarning spellCheck={false} onBlur={updDesc} className="outline-none cursor-text min-h-[16px] focus:bg-white/5 rounded px-1" style={{ fontSize: 13, color: '#a1a1aa' }}>{node.desc}</div>
                          </div>
                        </div>)

                      // ── DATABASE ──
                      if (k === "database") return (
                        <div className="flex-1 flex flex-col w-full h-full">
                          <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-0">
                            <MIcon name="database" size={15} className="shrink-0" style={{ color: '#a1a1aa' }} />
                            <div contentEditable suppressContentEditableWarning spellCheck={false} onBlur={updTitle} className="outline-none cursor-text flex-1 leading-snug focus:bg-white/5 rounded px-1" style={{ fontSize: 14, fontWeight: 500, color: '#e3e3e3' }}>{node.title}</div>
                          </div>
                          <div className="px-4 pt-2 flex-1 flex flex-col">
                            <div contentEditable suppressContentEditableWarning spellCheck={false} onBlur={updDesc} className="outline-none cursor-text min-h-[16px] focus:bg-white/5 rounded px-1" style={{ fontSize: 13, color: '#a1a1aa' }}>{node.desc}</div>
                            <div className="mt-auto pb-3 flex gap-1.5">
                              {["SQL", "ACID", "REPLICA"].map(t => <span key={t} style={{ fontSize: 10, fontFamily: 'monospace', backgroundColor: '#1f1f1f', color: '#a1a1aa', paddingLeft: 8, paddingRight: 8, paddingTop: 2, paddingBottom: 2, borderRadius: 8 }}>{t}</span>)}
                            </div>
                          </div>
                        </div>)

                      // ── GATEWAY ──
                      if (k === "gateway") return (
                        <div className="flex-1 flex items-center gap-3 px-5 w-full h-full">
                          <MIcon name="public" size={20} className="shrink-0" style={{ color: '#a1a1aa' }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <div contentEditable suppressContentEditableWarning spellCheck={false} onBlur={updTitle} className="outline-none cursor-text leading-snug focus:bg-white/5 rounded px-1" style={{ fontSize: 14, fontWeight: 500, color: '#e3e3e3' }}>{node.title}</div>
                              <span style={{ fontSize: 10, fontFamily: 'monospace', backgroundColor: '#1f1f1f', color: '#a1a1aa', paddingLeft: 6, paddingRight: 6, paddingTop: 2, paddingBottom: 2, borderRadius: 8 }}>L7</span>
                            </div>
                            <div contentEditable suppressContentEditableWarning spellCheck={false} onBlur={updDesc} className="outline-none cursor-text min-h-[14px] focus:bg-white/5 rounded px-1 mt-0.5" style={{ fontSize: 13, color: '#a1a1aa' }}>{node.desc}</div>
                          </div>
                        </div>)

                      // ── FIREWALL ──
                      if (k === "firewall") return (
                        <div className="flex-1 flex flex-col px-4 pt-3.5 pb-3 w-full h-full">
                          <div className="flex items-center gap-2.5 mb-2">
                            <MIcon name="shield" size={15} className="shrink-0" style={{ color: '#a1a1aa' }} />
                            <div contentEditable suppressContentEditableWarning spellCheck={false} onBlur={updTitle} className="outline-none cursor-text leading-snug focus:bg-white/5 rounded px-1" style={{ fontSize: 14, fontWeight: 500, color: '#e3e3e3' }}>{node.title}</div>
                          </div>
                          <div contentEditable suppressContentEditableWarning spellCheck={false} onBlur={updDesc} className="outline-none cursor-text min-h-[16px] focus:bg-white/5 rounded px-1" style={{ fontSize: 13, color: '#a1a1aa' }}>{node.desc}</div>
                          <div className="mt-auto flex items-center gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /><span style={{ fontSize: 10, fontFamily: 'monospace', color: '#a1a1aa' }}>ACTIVE</span></div>
                        </div>)

                      // ── WORKER ──
                      if (k === "worker") return (
                        <div className="flex-1 flex flex-col items-center justify-center gap-2 p-4 w-full h-full">
                          <MIcon name="memory" size={28} style={{ color: '#a1a1aa' }} />
                          <div contentEditable suppressContentEditableWarning spellCheck={false} onBlur={updTitle} className="outline-none cursor-text text-center focus:bg-white/5 rounded px-1 w-full" style={{ fontSize: 14, fontWeight: 500, color: '#e3e3e3' }}>{node.title}</div>
                          <div contentEditable suppressContentEditableWarning spellCheck={false} onBlur={updDesc} className="outline-none cursor-text text-center focus:bg-white/5 rounded px-1 w-full" style={{ fontSize: 12, color: '#a1a1aa' }}>{node.desc}</div>
                        </div>)

                      // ── CDN ──
                      if (k === "cdn") return (
                        <div className="flex-1 flex items-center gap-3 px-5 w-full h-full">
                          <MIcon name="layers" size={15} className="shrink-0" style={{ color: '#a1a1aa' }} />
                          <div contentEditable suppressContentEditableWarning spellCheck={false} onBlur={updTitle} className="outline-none cursor-text leading-snug focus:bg-white/5 rounded px-1 flex-1" style={{ fontSize: 14, fontWeight: 500, color: '#e3e3e3' }}>{node.title}</div>
                          <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#a1a1aa', backgroundColor: '#1f1f1f', paddingLeft: 8, paddingRight: 8, paddingTop: 2, paddingBottom: 2, borderRadius: 8 }}>EDGE</span>
                        </div>)

                      // ── IMAGE ──
                      if (k === "image") return (
                        <div className="flex-1 flex flex-col w-full h-full">
                          <div className="flex-1 relative bg-[#111] flex items-center justify-center overflow-hidden" style={{ borderRadius: '14px 14px 0 0' }}>
                            {node.imageUrl ? (
                              <img src={node.imageUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <MIcon name="image" size={32} style={{ color: '#333' }} />
                            )}
                          </div>
                          <div className="px-3.5 py-2.5 flex flex-col gap-1.5">
                            <div contentEditable suppressContentEditableWarning spellCheck={false} onBlur={updTitle} className="outline-none cursor-text focus:bg-white/5 rounded px-1" style={{ fontSize: 13, fontWeight: 500, color: '#e3e3e3' }}>{node.title}</div>
                            <input
                              type="text" placeholder="Paste image URL..."
                              defaultValue={node.imageUrl || ""}
                              onBlur={(e) => setNodes(ns => ns.map(n => n.id === node.id ? { ...n, imageUrl: e.target.value } : n))}
                              onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur() }}
                              className="outline-none focus:text-white transition-colors w-full"
                              style={{ fontSize: 11, color: '#a1a1aa', backgroundColor: '#1f1f1f', borderRadius: 8, paddingLeft: 8, paddingRight: 8, paddingTop: 4, paddingBottom: 4 }}
                            />
                          </div>
                        </div>)

                      // ── OPTIONS ──
                      if (k === "options") return (
                        <div className="flex-1 flex flex-col w-full h-full">
                          <div className="flex items-center gap-2.5 px-4 pt-3 pb-0">
                            <MIcon name="tune" size={14} className="shrink-0" style={{ color: '#a1a1aa' }} />
                            <div contentEditable suppressContentEditableWarning spellCheck={false} onBlur={updTitle} className="outline-none cursor-text focus:bg-white/5 rounded px-1 flex-1" style={{ fontSize: 14, fontWeight: 500, color: '#e3e3e3' }}>{node.title}</div>
                          </div>
                          <div className="flex-1 px-3.5 py-2 flex flex-col gap-1 overflow-y-auto custom-scroll">
                            {(node.kvPairs || []).map((kv, i) => (
                              <div key={i} className="flex items-center gap-1.5 group/kv">
                                <input defaultValue={kv.key} placeholder="key"
                                  onBlur={(e) => setNodes(ns => ns.map(n => n.id !== node.id ? n : { ...n, kvPairs: (n.kvPairs || []).map((p, j) => j === i ? { ...p, key: e.target.value } : p) }))}
                                  className="font-mono bg-transparent outline-none w-[70px] px-1 py-0.5 rounded focus:bg-white/5 focus:text-white" style={{ fontSize: 11, color: '#a1a1aa' }} />
                                <span style={{ fontSize: 11, color: '#333' }}>=</span>
                                <input defaultValue={kv.val} placeholder="value"
                                  onBlur={(e) => setNodes(ns => ns.map(n => n.id !== node.id ? n : { ...n, kvPairs: (n.kvPairs || []).map((p, j) => j === i ? { ...p, val: e.target.value } : p) }))}
                                  className="font-mono bg-transparent outline-none flex-1 px-1 py-0.5 rounded focus:bg-white/5 focus:text-white" style={{ fontSize: 11, color: '#e3e3e3' }} />
                                <button onClick={() => setNodes(ns => ns.map(n => n.id !== node.id ? n : { ...n, kvPairs: (n.kvPairs || []).filter((_, j) => j !== i) }))}
                                  className="opacity-0 group-hover/kv:opacity-100 text-[#555] hover:text-[#f87171] transition-all"><MIcon name="close" size={10} /></button>
                              </div>
                            ))}
                            <button onClick={() => setNodes(ns => ns.map(n => n.id !== node.id ? n : { ...n, kvPairs: [...(n.kvPairs || []), { key: "", val: "" }] }))}
                              className="flex items-center gap-1 hover:text-white transition-colors mt-0.5 px-1" style={{ fontSize: 11, color: '#a1a1aa' }}><MIcon name="add" size={10} />Add pair</button>
                          </div>
                        </div>)

                      // ── NOTE ──
                      if (k === "note") return (
                        <div className="flex-1 flex flex-col p-4 w-full h-full">
                          <MIcon name="article" size={15} className="mb-2.5 shrink-0" style={{ color: '#a1a1aa' }} />
                          <div contentEditable suppressContentEditableWarning spellCheck={false}
                            onBlur={(e) => { const t = e.currentTarget?.innerText || ""; setNodes(ns => ns.map(n => n.id === node.id ? { ...n, title: t } : n)) }}
                            className="outline-none cursor-text leading-relaxed flex-1 overflow-y-auto focus:bg-white/5 rounded px-1"
                            style={{ fontSize: 13, fontWeight: 400, color: '#e3e3e3' }}
                          >{node.title}</div>
                        </div>)

                      // ── FALLBACK (service) ──
                      return (
                        <div className="flex-1 flex flex-col px-4 pt-4 pb-3 w-full h-full">
                          <div contentEditable suppressContentEditableWarning spellCheck={false} onBlur={updTitle} className="outline-none cursor-text leading-snug focus:bg-white/5 rounded px-1" style={{ fontSize: 14, fontWeight: 500, color: '#e3e3e3' }}>{node.title}</div>
                          <div contentEditable suppressContentEditableWarning spellCheck={false} onBlur={updDesc} className="mt-2 outline-none cursor-text min-h-[18px] focus:bg-white/5 rounded px-1" style={{ fontSize: 13, color: '#a1a1aa' }}>{node.desc}</div>
                        </div>)
                    })()}
                  </div>
                </div>

                {/* Port buttons moved to context menu */}

                {/* Port circles — positions use per-kind height */}
                {(["left","right","top","bottom"] as const).map(side => (node[`${side}Ports`] as Port[] || []).map(p => {
                  const { w, h } = nodeDims(node.kind, node.customW, node.customH)
                  const arr = node[`${side}Ports`] as Port[] || []
                  if (side === "left" || side === "right") {
                    const totalH = (arr.length-1)*PORT_GAP
                    const startY = h/2 - totalH/2 + HANDLE_H
                    return (
                      <div key={p.id} data-port
                        onPointerDown={e=>onPortDown(node,p,e)} onPointerUp={e=>onPortUp(node,p,e)} onContextMenu={e=>onPortCtx(e,node.id,p.id)}
                        className={`absolute h-4 w-4 ${side==="left"?"-left-2":"-right-2"} rounded-full border-2 transition-all duration-150 cursor-crosshair z-30 flex items-center justify-center bg-[#1f1f1f] before:absolute before:-inset-3 before:z-40 ${isDrawing?"border-white/60 scale-125":"border-[#444] hover:border-white hover:scale-125"}`}
                        style={{top: startY+p.index*PORT_GAP-8}}
                      ><div className={`h-1.5 w-1.5 rounded-full ${isDrawing?"bg-white/60":"bg-[#555]"}`}/></div>
                    )
                  } else {
                    const totalW = (arr.length-1)*PORT_GAP
                    const startX = w/2 - totalW/2
                    return (
                      <div key={p.id} data-port
                        onPointerDown={e=>onPortDown(node,p,e)} onPointerUp={e=>onPortUp(node,p,e)} onContextMenu={e=>onPortCtx(e,node.id,p.id)}
                        className={`absolute h-4 w-4 ${side==="top"?"-top-2":"-bottom-2"} rounded-full border-2 transition-all duration-150 cursor-crosshair z-30 flex items-center justify-center bg-[#1f1f1f] before:absolute before:-inset-3 before:z-40 ${isDrawing?"border-white/60 scale-125":"border-[#444] hover:border-white hover:scale-125"}`}
                        style={{left: startX+p.index*PORT_GAP-8}}
                      ><div className={`h-1.5 w-1.5 rounded-full ${isDrawing?"bg-white/60":"bg-[#555]"}`}/></div>
                    )
                  }
                }))}

                {/* Resize handles */}
                <div onPointerDown={(e) => onResizeDown(node.id, "right", e)}
                  className={`absolute top-[15px] -right-[3px] w-[6px] rounded-full cursor-ew-resize z-30 opacity-0 group-hover:opacity-100 hover:!opacity-100 transition-opacity ${isDrawing ? "pointer-events-none" : ""}`}
                  style={{ height: nh }} />
                <div onPointerDown={(e) => onResizeDown(node.id, "bottom", e)}
                  className={`absolute -bottom-[3px] left-0 h-[6px] rounded-full cursor-ns-resize z-30 opacity-0 group-hover:opacity-100 hover:!opacity-100 transition-opacity ${isDrawing ? "pointer-events-none" : ""}`}
                  style={{ width: nw }} />
                <div onPointerDown={(e) => onResizeDown(node.id, "corner", e)}
                  className={`absolute -bottom-[3px] -right-[3px] w-3 h-3 cursor-nwse-resize z-30 opacity-0 group-hover:opacity-100 hover:!opacity-100 transition-opacity flex items-center justify-center ${isDrawing ? "pointer-events-none" : ""}`}>
                  <div className="w-1.5 h-1.5 rounded-sm bg-[#444]" />
                </div>
              </div>
            )})
          }</div>

          {/* Context menu attached to canvas coordinates */}
          <AnimatePresence>
            {ctxMenu && (
              <motion.div
                className="absolute z-50 pointer-events-none"
                initial={{ left: ctxMenu.cx, top: ctxMenu.cy }}
                animate={{ left: ctxMenu.cx, top: ctxMenu.cy }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                style={{ scale: inverseScale, transformOrigin: 'top left' }}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="overflow-hidden min-w-[210px] pointer-events-auto p-[3px]"
                  style={{ transformOrigin: "top left", borderRadius: 20, backgroundColor: '#1f1f1f', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 0 0 1px rgba(255,255,255,0.04)' }}
                >
              {ctxMenu.action.t === "canvas" && (() => {
                const iconMap: Record<string, React.ReactNode> = {
                  Server: <MIcon name="dns" size={14} />,
                  Database: <MIcon name="database" size={14} />,
                  Globe: <MIcon name="public" size={14} />,
                  Shield: <MIcon name="shield" size={14} />,
                  Cpu: <MIcon name="memory" size={14} />,
                  Layers: <MIcon name="layers" size={14} />,
                  Image: <MIcon name="image" size={14} />,
                  SlidersHorizontal: <MIcon name="tune" size={14} />,
                  FileText: <MIcon name="article" size={14} />,
                }
                return (
                  <div style={{ backgroundColor: '#111111', borderRadius: 17, overflow: 'hidden' }}>
                    <p className="px-3 pt-2 pb-1.5 text-[10px] font-semibold text-[#555] uppercase tracking-wider">Add Component</p>
                    {NODE_PRESETS.map(p => (
                      <button key={p.key} onClick={() => addComponent(p.key)}
                        className="flex items-center gap-2.5 w-full text-left hover:bg-[#1a1a1a] active:scale-[0.97] transition-all duration-75"
                        style={{ height: 34, paddingLeft: 12, paddingRight: 12, borderRadius: 16, fontSize: 14, fontWeight: 400, color: '#e3e3e3' }}
                      >
                        <span style={{ color: '#a1a1aa' }}>{iconMap[p.icon]}</span>
                        {p.label}
                      </button>
                    ))}
                  </div>
                )
              })()}
              {ctxMenu.action.t === "node" && (() => {
                const nid = (ctxMenu.action as {id: string}).id
                const node = nodes.find(n => n.id === nid)
                const totalPorts = node ? (node.leftPorts.length + node.rightPorts.length + (node.topPorts?.length||0) + (node.bottomPorts?.length||0)) : 0
                return (
                  <div style={{ backgroundColor: '#111111', borderRadius: 17, overflow: 'hidden', padding: 2 }}>
                    <p className="px-3 pt-2 pb-1.5 text-[10px] font-semibold text-[#555] uppercase tracking-wider">Ports</p>
                    {totalPorts < maxPorts ? (
                      <div className="grid grid-cols-2 gap-1 px-1 mb-1">
                        <button onClick={() => { addPort(nid, "left"); setCtxMenu(null) }} className="flex items-center justify-center gap-1.5 hover:bg-[#1a1a1a] active:scale-[0.97] transition-all duration-75" style={{ height: 32, borderRadius: 12, fontSize: 13, fontWeight: 400, color: '#e3e3e3' }}><MIcon name="add" size={12} style={{ color: '#a1a1aa' }} />Left</button>
                        <button onClick={() => { addPort(nid, "right"); setCtxMenu(null) }} className="flex items-center justify-center gap-1.5 hover:bg-[#1a1a1a] active:scale-[0.97] transition-all duration-75" style={{ height: 32, borderRadius: 12, fontSize: 13, fontWeight: 400, color: '#e3e3e3' }}><MIcon name="add" size={12} style={{ color: '#a1a1aa' }} />Right</button>
                        <button onClick={() => { addPort(nid, "top"); setCtxMenu(null) }} className="flex items-center justify-center gap-1.5 hover:bg-[#1a1a1a] active:scale-[0.97] transition-all duration-75" style={{ height: 32, borderRadius: 12, fontSize: 13, fontWeight: 400, color: '#e3e3e3' }}><MIcon name="add" size={12} style={{ color: '#a1a1aa' }} />Top</button>
                        <button onClick={() => { addPort(nid, "bottom"); setCtxMenu(null) }} className="flex items-center justify-center gap-1.5 hover:bg-[#1a1a1a] active:scale-[0.97] transition-all duration-75" style={{ height: 32, borderRadius: 12, fontSize: 13, fontWeight: 400, color: '#e3e3e3' }}><MIcon name="add" size={12} style={{ color: '#a1a1aa' }} />Bottom</button>
                      </div>
                    ) : (
                      <div className="px-3 py-1.5 text-[10px] text-[#f59e0b] mb-1">Max ports reached.</div>
                    )}
                    <button onClick={() => deleteNode(nid)}
                      className="flex items-center gap-2 w-full text-left hover:bg-[#2a1414] active:scale-[0.97] transition-all duration-75"
                      style={{ height: 34, paddingLeft: 12, paddingRight: 12, borderRadius: 16, fontSize: 13, fontWeight: 500, color: '#fca5a5' }}
                    >Remove component</button>
                  </div>
                )
              })()}
              {ctxMenu.action.t === "edge" && (() => {
                const edgeId = (ctxMenu.action as {id: string}).id
                const edge = edges.find(e => e.id === edgeId)
                const edgeSpeed = edge?.speed ?? 1
                const edgeColor = edge?.color ?? "#ffffff"
                const swatches = ["#ffffff","#60a5fa","#34d399","#f87171","#fbbf24","#a78bfa","#f472b6","#fb923c"]
                return (
                  <div style={{ backgroundColor: '#111111', borderRadius: 17, overflow: 'hidden' }}>
                    {/* Color row */}
                    <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                      <span style={{ fontSize: 12, fontWeight: 500, color: '#a1a1aa' }}>Color</span>
                      <div className="flex items-center gap-1">
                        {swatches.map(sw => (
                          <button
                            key={sw}
                            onClick={(e) => { e.stopPropagation(); setEdgeColor(edgeId, sw) }}
                            title={sw}
                            className="h-4 w-4 rounded-full border transition-all"
                            style={{
                              background: sw,
                              borderColor: edgeColor === sw ? "#fff" : "transparent",
                              boxShadow: edgeColor === sw ? `0 0 0 1px ${sw}` : "none",
                              transform: edgeColor === sw ? "scale(1.2)" : "scale(1)"
                            }}
                          />
                        ))}
                      </div>
                    </div>
                    <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)' }} />
                    {/* Speed control row */}
                    <div className="flex items-center justify-between px-3 py-2.5">
                      <span style={{ fontSize: 12, fontWeight: 500, color: '#a1a1aa' }}>Speed</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); changeEdgeSpeed(edgeId, -0.1) }}
                          className="flex items-center justify-center hover:bg-[#1a1a1a] active:scale-[0.95] transition-all duration-75"
                          style={{ height: 22, width: 22, borderRadius: 6, fontSize: 12, fontWeight: 700, color: '#a1a1aa' }}
                        >−</button>
                        <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#e3e3e3', width: 36, textAlign: 'center' }}>{edgeSpeed.toFixed(2)}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); changeEdgeSpeed(edgeId, 0.1) }}
                          className="flex items-center justify-center hover:bg-[#1a1a1a] active:scale-[0.95] transition-all duration-75"
                          style={{ height: 22, width: 22, borderRadius: 6, fontSize: 12, fontWeight: 700, color: '#a1a1aa' }}
                        >+</button>
                      </div>
                    </div>
                    <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)' }} />
                    {/* Disconnect */}
                    <button onClick={() => deleteEdge(edgeId)}
                      className="flex items-center gap-2 w-full text-left hover:bg-[#2a1414] active:scale-[0.97] transition-all duration-75"
                      style={{ height: 34, paddingLeft: 12, paddingRight: 12, borderRadius: 16, fontSize: 13, fontWeight: 500, color: '#fca5a5', marginTop: 4, marginBottom: 4 }}
                    >Disconnect</button>
                  </div>
                )
              })()}
              {ctxMenu.action.t === "port" && (() => {
                const a = ctxMenu.action as { t: "port"; nid: string; pid: string }
                return (
                  <div style={{ backgroundColor: '#111111', borderRadius: 17, overflow: 'hidden' }}>
                    <button onClick={() => deletePort(a.nid, a.pid)}
                      className="flex items-center gap-2 w-full text-left hover:bg-[#2a1414] active:scale-[0.97] transition-all duration-75"
                      style={{ height: 34, paddingLeft: 12, paddingRight: 12, borderRadius: 16, fontSize: 13, fontWeight: 500, color: '#fca5a5' }}
                    >Remove connection</button>
                  </div>
                )
              })()}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Unsaved changes banner */}
        <AnimatePresence>
          {isDirty && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="absolute top-3 right-3 z-[90] flex items-center gap-2"
              style={{ borderRadius: 14, backgroundColor: 'rgba(23,23,23,0.95)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.06)', padding: '8px 10px', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}
            >
              <span style={{ fontSize: 12, color: '#888', fontWeight: 500, whiteSpace: 'nowrap' }}>You have unsaved changes</span>
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="hover:bg-[#222] active:scale-[0.96] transition-all duration-75 disabled:opacity-50"
                style={{ height: 26, paddingLeft: 10, paddingRight: 10, borderRadius: 8, fontSize: 12, fontWeight: 500, color: '#888', backgroundColor: 'transparent' }}
              >Cancel</button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="hover:opacity-90 active:scale-[0.96] transition-all duration-75 disabled:opacity-50 flex items-center gap-1.5"
                style={{ height: 26, paddingLeft: 12, paddingRight: 12, borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#0a0a0a', backgroundColor: '#ffffff' }}
              >
                {isSaving ? "Saving…" : "Save"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 backdrop-blur-2xl border border-[#f59e0b]/20 px-4 py-3 shadow-2xl max-w-sm w-full"
              style={{ borderRadius: 16, backgroundColor: 'rgba(23,23,23,0.9)' }}
            >
              <div className="flex-shrink-0 flex items-center justify-center pt-0.5">
                <MIcon name="error" size={20} className="text-[#f59e0b]" />
              </div>
              <p className="text-[12px] font-medium text-[#e5e5e5] leading-relaxed pr-2">
                {toast.msg}
              </p>
              <button onClick={() => setToast(null)}
                className="absolute top-2 right-2 p-1 text-[#555] hover:text-[#f59e0b] transition-colors"
              ><MIcon name="close" size={12} /></button>
            </motion.div>
          )}
        </AnimatePresence>

        <Walkthrough
          id="canvas_onboarding"
          currentStep={wtStep}
          steps={[
            { text: "Right click anywhere on the canvas to open the component menu.", icon: "mouse" },
            { text: "Pick any component from the menu to place it on your canvas.", icon: "widgets" },
            { text: "Nice! Click on the title or description to make it yours.", icon: "edit" },
            { text: "See the bar on the left? Grab it to drag your component around.", icon: "drag_indicator" },
            { text: "Now hit Save in the top-right to keep your work safe.", icon: "save" },
            { text: "Right click on your component to explore more options.", icon: "more_vert" },
            { text: "Add a connection point from any side — you'll need it to wire things up.", icon: "radio_button_unchecked" },
            { text: "Time for a second component! Right click on an empty spot.", icon: "add_circle" },
            { text: "Place another component to connect with your first one.", icon: "widgets" },
            { text: "Add a connection point to this one too.", icon: "radio_button_unchecked" },
            { text: "Now drag from one connection point to another to wire them together.", icon: "link" },
            { text: "Your first connection! Right click the line to adjust speed and color.", icon: "tune" },
            { text: "Try scrolling to zoom in and out of your canvas.", icon: "zoom_in" },
            { text: "You've mastered Canvas! Go build something incredible.", icon: "celebration" },
          ]}
        />
      </div>
    </div>
    </>
  )
}
