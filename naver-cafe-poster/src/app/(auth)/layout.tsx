export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-5 relative overflow-hidden bg-[#070A12]"
      style={{
        backgroundImage: `linear-gradient(rgba(16, 185, 129, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 185, 129, 0.04) 1px, transparent 1px)`,
        backgroundSize: "32px 32px",
      }}
    >
      {children}
    </div>
  );
}
