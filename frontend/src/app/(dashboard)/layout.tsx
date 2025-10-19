import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Sidebar from "@/components/dashboard/Sidebar";
import Header from "@/components/dashboard/Header";
import { ToastProvider } from "@/components/notifications/ToastProvider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-gray-100">
        <div className="flex h-screen">
          <Sidebar user={session.user} />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header user={session.user} />
            <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
              {children}
            </main>
          </div>
        </div>
      </div>
    </ToastProvider>
  );
}
