import type { MDXComponents } from "mdx/types"

// Just return defaults — styling is handled via the .blog-prose CSS class
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return { ...components }
}
