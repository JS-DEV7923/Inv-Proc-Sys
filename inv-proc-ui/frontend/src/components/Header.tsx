import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-secondary/60 backdrop-blur supports-[backdrop-filter]:bg-secondary/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-primary" />
          <Link to="/" className="text-sm font-extrabold tracking-tight text-amber-900">Invoice Processor</Link>
        </div>
        <nav className="hidden items-center gap-4 md:flex">
          <Link to="/" className="text-sm text-foreground/80 hover:text-foreground">Dashboard</Link>
          <Link to="/upload" className="text-sm text-foreground/80 hover:text-foreground">Upload</Link>
          <Link to="/history" className="text-sm text-foreground/80 hover:text-foreground">History</Link>
          <Link to="/settings" className="text-sm text-foreground/80 hover:text-foreground">Settings</Link>
          <Link to="/subscribe" className="text-sm text-foreground/80 hover:text-foreground">Subscribe</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="secondary">
            <Link to="/upload">Upload</Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link to="/login">Login</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/signup">Sign up</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
