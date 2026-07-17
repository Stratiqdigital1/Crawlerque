import type { ReactNode } from "react";

type BlogRichTextProps = {
  text: string;
};

const LINK_PATTERN =
  /\[([^\]]+)\]\(([^)\s]+)\)/g;

function getSafeHref(value: string) {
  const href = value.trim();

  if (
    /^(https?:\/\/|mailto:|tel:)/i.test(href)
  ) {
    return href;
  }

  if (
    href.startsWith("/") &&
    !href.startsWith("//")
  ) {
    return href;
  }

  if (href.startsWith("#")) {
    return href;
  }

  return null;
}

function renderPlainText(
  value: string,
  keyPrefix: string
): ReactNode[] {
  const lines = value.split("\n");
  const nodes: ReactNode[] = [];

  lines.forEach((line, index) => {
    if (index > 0) {
      nodes.push(
        <br key={`${keyPrefix}-br-${index}`} />
      );
    }

    if (line) {
      nodes.push(line);
    }
  });

  return nodes;
}

export function BlogRichText({
  text,
}: BlogRichTextProps) {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let partIndex = 0;

  LINK_PATTERN.lastIndex = 0;

  while (
    (match = LINK_PATTERN.exec(text)) !== null
  ) {
    const precedingText = text.slice(
      lastIndex,
      match.index
    );

    nodes.push(
      ...renderPlainText(
        precedingText,
        `text-${partIndex}`
      )
    );

    const linkText = match[1];
    const originalHref = match[2];
    const safeHref = getSafeHref(originalHref);

    if (safeHref) {
      const isExternal =
        /^https?:\/\//i.test(safeHref);

      nodes.push(
        <a
          key={`link-${partIndex}`}
          href={safeHref}
          target={
            isExternal ? "_blank" : undefined
          }
          rel={
            isExternal
              ? "noopener noreferrer"
              : undefined
          }
          className="font-semibold text-[var(--cq-signal)] underline decoration-[var(--cq-signal)]/40 underline-offset-4 transition hover:text-white hover:decoration-white"
        >
          {linkText}
        </a>
      );
    } else {
      nodes.push(match[0]);
    }

    lastIndex =
      match.index + match[0].length;

    partIndex += 1;
  }

  nodes.push(
    ...renderPlainText(
      text.slice(lastIndex),
      `text-${partIndex}`
    )
  );

  return <>{nodes}</>;
}