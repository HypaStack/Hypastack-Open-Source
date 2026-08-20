import { redirect } from "next/navigation"

// /me has no dashboard of its own, it lands users straight in their Drive.
// The real sections are /me/storage, /me/hosting and /me/paste.
export default function ManagePage() {
  redirect("/me/storage")
}
