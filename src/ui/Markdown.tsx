import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// Research text comes from an external LLM: render it safely (research R6).
// No raw HTML, no images (they would load third-party resources, FR-039),
// links open in a new tab without referrer.

const components: Components = {
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
};

export function Markdown({ text }: { text: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        disallowedElements={["img"]}
        unwrapDisallowed
        components={components}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
