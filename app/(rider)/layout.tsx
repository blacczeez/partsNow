export default function RiderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-40 flex h-14 items-center border-b border-slate-200 bg-white px-4">
        <span className="text-lg font-bold text-primary">PartsNow</span>
        <span className="ml-2 rounded-pill bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
          Rider
        </span>
      </header>
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
