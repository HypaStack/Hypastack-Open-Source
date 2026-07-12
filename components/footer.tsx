import Link from "next/link";
import { FOOTER_COLUMNS } from "@/constants/footer";

// Brand column sits first; only the link columns the design keeps are rendered.
const columns = FOOTER_COLUMNS.filter((c) => c.title !== "Company");

const linkClass =
  "text-white/55 hover:text-white text-[13px] font-light transition-colors duration-200 hover:bg-[#1c1c1c] rounded-lg px-2 py-1.5 w-fit relative right-2";

const legalClass =
  "text-white/70 hover:text-white border-b border-white/20 hover:border-white/50 transition-colors duration-200";

export function Footer() {
  return (
    <footer className="w-full max-w-[1200px] p-2 mx-auto">
      <div className="rounded-2xl bg-[rgba(15,15,15,0.65)] border border-[rgba(38,38,38,0.6)] px-5 py-6 sm:px-7 sm:py-7 lg:px-9 lg:py-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-10">
          {/* Brand */}
          <div className="flex flex-col items-start gap-3 max-w-[300px]">
            <img loading="lazy" decoding="async"
              src="https://r2.hypastack.com/cdn/lvko6iovrtq7/footer.webp"
              alt="Hypastack"
              className="h-8 w-auto object-contain select-none pointer-events-none"
              draggable={false}
            />
            <p className="text-white/50 text-[13px] font-light leading-relaxed max-w-[240px]">
              Private file sharing and a free global CDN. Encrypted in your browser.
            </p>

            <div className="flex items-center gap-3 pt-0.5">
              <a
                href="https://t.me/hypastack"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/80 hover:text-white transition-colors"
                title="Telegram"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.888-.662 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                </svg>
              </a>
              <a
                href="https://github.com/hypastack"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/80 hover:text-white transition-colors"
                title="GitHub"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </a>
            </div>

            <a
              href="https://saasbrowser.com/en/saas/1508544/hypastack"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block hover:opacity-80 transition-opacity my-2"
            >
              <img
                src="https://r2.hypastack.com/cdn/62c8tkg1mw51/saas-browser-badge.svg"
                alt="Hypastack - software database"
                width={140}
                className="select-none pointer-events-none"
                draggable={false}
              />
            </a>

            <div className="text-white/40 text-[11px] font-light leading-relaxed">
              © 2025-2026 Hypastack. AGPL-3.0.{" "}
              <Link href="/terms" className={legalClass} title="Terms of Service">
                Terms
              </Link>{" "}
              ·{" "}
              <Link href="/privacy" className={legalClass} title="Privacy Policy">
                Privacy
              </Link>
            </div>
          </div>

          {/* Link columns — grouped on the right, close together */}
          <div className="flex gap-12 sm:gap-16">
            {columns.map((col) => (
              <div key={col.title} className="flex flex-col">
                <h3 className="text-[13px] font-medium text-white/90 mb-3">{col.title}</h3>
                {col.links.map((link) =>
                  link.href.startsWith("http") ? (
                    <a
                      key={link.label}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={linkClass}
                      title={link.label}
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link key={link.label} href={link.href} className={linkClass} title={link.label}>
                      {link.label}
                    </Link>
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
