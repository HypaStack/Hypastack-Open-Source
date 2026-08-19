import { Dropdown, cn } from "@heroui/react";
import { buttonVariants } from "@heroui/styles";
import { FOOTER_COLUMNS as columns } from "@/constants/footer";

export function Footer() {
  return (
    <footer className="w-full max-w-[1200px] p-2 mx-auto flex items-center justify-between gap-2 sm:gap-3">
      <a
        href="https://usekiko.com"
        target="_blank"
        rel="noopener noreferrer"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "inline-flex items-center gap-1.5")}
      >
        <img
          src="https://r2.hypastack.com/cdn/jxvmdjwe4dnu/hellbound.png"
          alt=""
          className="inline-block rounded-full object-cover select-none pointer-events-none"
          style={{ width: "1em", height: "1em" }}
          draggable={false}
        />
        Kiko&rsquo;s portfolio
      </a>
      <div className="flex items-center gap-2 sm:gap-3">
      {columns.map((col) => (
        <Dropdown key={col.title}>
          <Dropdown.Trigger className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "inline-flex items-center gap-1.5")}>
            {col.title}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </Dropdown.Trigger>
          <Dropdown.Popover placement="top">
            <Dropdown.Menu aria-label={col.title}>
              {col.links.map((link) => (
                <Dropdown.Item
                  key={link.href}
                  id={link.href}
                  href={link.href}
                  target={link.href.startsWith("http") ? "_blank" : undefined}
                  rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                >
                  {link.label}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      ))}
      </div>
    </footer>
  );
}
