import { Menu } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetTrigger
} from "../ui/sheet"
import { Button } from "../ui/button"
import { Link } from "react-router-dom"

export default function Header() {
  return (
    <header className="flex items-center h-14 px-4 border-b">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>

        <SheetContent side="left" className="w-64">
          <nav className="flex flex-col gap-4 mt-10 items-center">
            <Link to="/" className="w-full text-center border-b-2 py-2">Home</Link>
            <Link to="/customers" className="w-full text-center border-b-2 py-2">Customers</Link>
            <Link to="/reports" className="w-full text-center border-b-2 py-2">Reports</Link>
          </nav>
        </SheetContent>
      </Sheet>

      <span className="ml-4 font-semibold">DriverThru</span>
    </header>
  )
}
