// Return null so Next.js streaming doesn't flash a logo on every dashboard navigation.
// The motion.main animation in layout.tsx handles the entrance instead.
export default function Loading() {
  return null
}
