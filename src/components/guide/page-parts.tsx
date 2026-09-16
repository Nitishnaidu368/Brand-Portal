import Link from "next/link";
import type { Page, Portal } from "@/lib/db/schema";
import { fileUrl } from "@/lib/formats";
import { cn } from "@/lib/utils";
import { FitText } from "./fit-text";
import { Txt } from "./txt";

/** Dark 380px hero with the page number and title, then the intro and optional download button. */
export function PageHero({
  page,
  number,
  edit,
  buttonHref,
}: {
  page: Page;
  number: string;
  edit: boolean;
  buttonHref: string | null;
}) {
  const target = edit ? ({ kind: "page", id: page.id } as const) : null;
  const showIntro = edit || Boolean(page.intro.trim());
  const showButton = Boolean(page.buttonLabel.trim()) && (edit || Boolean(buttonHref));
  const buttonClass =
    "flex min-h-[35px] w-[153px] items-center justify-center bg-[var(--accent)] px-3 py-2 text-center text-[12px] leading-[14px] text-[var(--accent-foreground)]";

  return (
    <header id="top" className="scroll-mt-20">
      <div className="flex h-[220px] items-end bg-[var(--accent)] px-5 pb-4 text-[var(--accent-foreground)] sm:h-[300px] sm:px-[35px] lg:h-[380px] lg:pb-5">
        <div className="grid w-full grid-cols-2 gap-x-5 text-[40px] leading-none tracking-[-0.02em] sm:text-[52px] lg:text-[62px]">
          <span aria-hidden>{number}</span>
          <Txt as="h1" edit={target} field="title" value={page.title} placeholder="Page title" className="min-w-0" />
        </div>
      </div>

      {(showIntro || showButton) && (
        <div className={cn("px-5 pt-10 sm:px-[35px] lg:pt-[58px]", showButton ? "pb-[70px]" : "pb-16")}>
          {showIntro && (
            <Txt
              as="p"
              edit={target}
              field="intro"
              value={page.intro}
              placeholder="Write a short introduction to this page…"
              multiline
              className="max-w-[1000px] text-[24px] leading-[1.2] tracking-[-0.01em] sm:text-[30px] lg:text-[34px]"
            />
          )}
          {showButton &&
            (edit ? (
              <div className={cn(buttonClass, showIntro && "mt-12 lg:mt-[82px]")}>
                <Txt as="span" edit={target} field="buttonLabel" value={page.buttonLabel} placeholder="Button label" />
              </div>
            ) : (
              <a
                href={buttonHref!}
                download
                className={cn(buttonClass, "transition-opacity hover:opacity-85", showIntro && "mt-12 lg:mt-[82px]")}
              >
                {page.buttonLabel}
              </a>
            ))}
        </div>
      )}
    </header>
  );
}

/** Grey band linking to the following page. */
export function NextBand({ href, title }: { href: string; title: string }) {
  return (
    <Link href={href} className="block bg-guide-band px-5 pt-[11px] pb-10 transition-colors hover:bg-[#EBEBEB] sm:px-[35px]">
      <span className="block text-[12px] leading-[18px]">Next</span>
      <span className="mt-8 block text-[26px] leading-[1.2] tracking-[-0.01em] sm:mt-[42px] sm:text-[34px]">{title}</span>
    </Link>
  );
}

type FooterPortal = Pick<Portal, "clientName" | "footerLabel" | "versionLabel" | "wordmarkFileId">;

/** Navy footer: four columns of small print, then the wordmark filling the full width. */
export function GuideFooter({ portal }: { portal: FooterPortal }) {
  return (
    <footer className="overflow-hidden bg-[var(--accent)] text-[var(--accent-foreground)]">
      <div className="grid grid-cols-2 gap-x-5 gap-y-2 px-5 pt-5 text-[13px] leading-[18px] sm:grid-cols-4 sm:px-[35px]">
        <span>{portal.footerLabel}</span>
        <span className="opacity-60">{portal.versionLabel}</span>
        <a href="#top" className="hover:underline">
          Back to top
        </a>
        <span>
          © {new Date().getFullYear()} {portal.clientName}
        </span>
      </div>
      <div className="mt-10 px-5 sm:mt-[52px] sm:px-[35px]">
        {portal.wordmarkFileId ? (
          <img src={fileUrl(portal.wordmarkFileId)} alt={portal.clientName} className="block h-auto w-full" />
        ) : (
          <FitText text={portal.clientName} />
        )}
      </div>
    </footer>
  );
}
