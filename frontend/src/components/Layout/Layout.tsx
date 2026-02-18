import Header from "./Header"
import Footer from "./Footer"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 pt-6 pb-8">{children}</div>
      </main>

      <Footer />
    </div>
  )
}
