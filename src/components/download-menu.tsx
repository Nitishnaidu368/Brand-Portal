"use client";

import { ChevronDown, Download } from "lucide-react";
import type { PublicFile } from "@/lib/files";
import { exportOptionsFor, fileUrl } from "@/lib/formats";
import { Dropdown, DropdownLink } from "./dropdown";
import { buttonClasses, type ButtonSize, type ButtonVariant } from "./ui/button";

export function DownloadMenu({
  file,
  label = "Download",
  variant = "secondary",
  size = "sm",
  align = "right",
}: {
  file: Pick<PublicFile, "id" | "mimeType" | "originalName">;
  label?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  align?: "left" | "right";
}) {
  const options = exportOptionsFor(file.mimeType, file.originalName);

  if (options.length === 1) {
    return (
      <a href={fileUrl(file.id, { download: true })} download className={buttonClasses(variant, size)}>
        <Download />
        {label}
      </a>
    );
  }

  return (
    <Dropdown
      align={align}
      buttonClassName={buttonClasses(variant, size)}
      label={
        <>
          <Download />
          {label}
          <ChevronDown className="-mr-1 opacity-60" />
        </>
      }
    >
      {options.map((option) => (
        <DropdownLink key={option.key} href={fileUrl(file.id, { variant: option.key, download: true })}>
          {option.label}
        </DropdownLink>
      ))}
    </Dropdown>
  );
}
