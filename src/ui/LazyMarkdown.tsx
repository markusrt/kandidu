import { lazy, Suspense } from "react";
import { useMessages } from "./i18n";

// The Markdown stack is only needed for previews; load it on demand.
const Markdown = lazy(() =>
  import("./Markdown").then((module) => ({ default: module.Markdown })),
);

export function LazyMarkdown({ text }: { text: string }) {
  const m = useMessages();
  return (
    <Suspense fallback={<p>{m.common.working}</p>}>
      <Markdown text={text} />
    </Suspense>
  );
}
