import { redirect } from "next/navigation";

// /contacts redirects to /dashboard — kept for convenience.
export default function ContactsPage() {
  redirect("/dashboard");
}
