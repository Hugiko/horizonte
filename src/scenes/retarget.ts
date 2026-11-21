import * as THREE from 'three'

/**
 * Adapta clips de un esqueleto Mixamo a otro con distinta orientación de reposo de la cadera.
 * Solo se usan rotaciones; la de la cadera se corrige con Δ = reposoDestino · reposoOrigen⁻¹.
 */
export function retargetClips(clips: THREE.AnimationClip[], source: THREE.Object3D, target: THREE.Object3D): THREE.AnimationClip[] {
  const hipsOf = (o: THREE.Object3D) => {
    let h: THREE.Object3D | undefined
    o.traverse((c) => { if (!h && /Hips$/.test(c.name)) h = c })
    return h
  }
  const hs = hipsOf(source), ht = hipsOf(target)
  const delta = hs && ht ? ht.quaternion.clone().multiply(hs.quaternion.clone().invert()) : new THREE.Quaternion()
  return clips.map((clip) => {
    const c = clip.clone()
    c.tracks = c.tracks.filter((t) => t.name.endsWith('.quaternion')).map((t) => {
      if (!/Hips\.quaternion$/.test(t.name) || !hs || !ht) return t
      const v = t.values.slice()
      const q = new THREE.Quaternion()
      for (let i = 0; i < v.length; i += 4) {
        q.fromArray(v, i).premultiply(delta)
        q.toArray(v, i)
      }
      return new THREE.QuaternionKeyframeTrack(t.name, Array.from(t.times), Array.from(v))
    })
    return c
  })
}
