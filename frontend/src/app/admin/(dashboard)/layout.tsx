import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { AdminNavbar } from "@/components/admin/navbar";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/admin/login");
  }

  const allowedEmail = process.env.ADMIN_EMAIL;
  if (
    !session.user ||
    !session.user.email ||
    session.user.email.toLowerCase() !== allowedEmail?.toLowerCase()
  ) {
    redirect("/admin/error");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AdminNavbar user={session.user} />
      <main className="p-6 max-w-7xl mx-auto flex flex-col gap-6">
        {children}
      </main>
    </div>
  );
}
