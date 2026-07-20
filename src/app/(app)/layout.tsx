import Sidebar from "@/components/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <main className="flex-1 px-4 py-6 pt-20 lg:px-8 lg:py-8 lg:pt-8 max-w-6xl mx-auto w-full">{children}</main>
    </div>
  );
}
