import { redirect } from "next/navigation"

// /manage has no dashboard of its own — it lands users straight in their Drive.
// The real sections are /manage/files, /manage/cdn and /manage/dumpster.
export default function ManagePage() {
  redirect("/manage/files")
}
