export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4 py-12"
      style={{
        backgroundColor: "#f8fafc",
        backgroundImage:
          "linear-gradient(to right, rgba(239, 68, 68, 0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(239, 68, 68, 0.035) 1px, transparent 1px), radial-gradient(circle at 50% 50%, transparent 20%, #f1f5f9 95%)",
        backgroundSize: "24px 24px, 24px 24px, 100% 100%",
      }}
    >
      <div className="w-full max-w-[440px]">
        {children}
      </div>
    </div>
  );
}
