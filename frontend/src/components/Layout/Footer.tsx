
export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-10 border-t border-sky-100 bg-white/80 backdrop-blur">
      <div className="border-t border-sky-100 py-2 text-center text-xs text-slate-500">
        © {year} DriverThru
      </div>
    </footer>
  );
}
