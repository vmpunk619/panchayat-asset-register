// Ambient "live wallpaper": large soft colour blobs that drift slowly behind
// the UI. Pure CSS animation (transform only), pointer-events off, and fully
// disabled for users who prefer reduced motion.
export default function Wallpaper() {
  return (
    <div className="wallpaper" aria-hidden="true">
      <span className="blob b1" />
      <span className="blob b2" />
      <span className="blob b3" />
      <span className="blob b4" />
    </div>
  )
}
