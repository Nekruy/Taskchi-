import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminSidebar } from "./AdminSidebar";

export const metadata = {
  title: {
    default: "Adminка | Taskchi",
    template: "%s | Admin Taskchi",
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.isAdmin) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar
        userName={session.user.name ?? "Администратор"}
        userEmail={session.user.email ?? ""}
      />
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
