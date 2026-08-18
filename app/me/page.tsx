import { redirect } from "next/navigation"

// /me has no dashboard of its own, it lands users straight in their Drive.
// The real sections are /me/files, /me/cdn and /me/bin.
export default function ManagePage() {
  redirect("/me/files")
}
