import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin/dashboard";

export default async function AdminPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/admin/login");
  }
  console.log("Session in admin page:", JSON.stringify(session));
  const allowedEmail = process.env.ADMIN_EMAIL;
  if (
    !session.user ||
    !session.user.email ||
    session.user.email.toLowerCase() !== allowedEmail?.toLowerCase()
  ) {
    redirect("/admin/error");
  }

  return <AdminDashboard user={session.user} />;
}
