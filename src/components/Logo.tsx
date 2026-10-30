import Link from "next/link";

// The brand from the portfolio navbar (johePorto BrandLink): the name written as the start of a shell
// prompt. Same classes there, so the colours follow the shared palette tokens.
const USER = "johevin-blesstowi";
const HOST = "portfolio";

export default function Logo({ className = "text-sm" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`min-w-0 truncate font-mono font-semibold tracking-tight transition-colors hover:text-accent ${className}`}
    >
      <span aria-hidden>
        {USER}
        <span className="font-normal text-muted max-[379px]:hidden">@{HOST}</span>
      </span>
      <span className="sr-only">Johevin Blesstowi</span>
    </Link>
  );
}
