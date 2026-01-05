import type { Extension } from "@codemirror/state";

/**
 * Get the appropriate CodeMirror language extension based on file extension
 * Uses dynamic imports to lazy-load language packages, reducing initial bundle size
 * @param filepath - The path of the file to detect language for
 * @returns Promise that resolves to CodeMirror Extension for syntax highlighting
 */
export const getLanguageExtension = async (
  filepath: string,
): Promise<Extension> => {
  const ext = filepath.toLowerCase();

  // Markdown
  if (ext.endsWith(".md") || ext.endsWith(".markdown")) {
    const { markdown } = await import("@codemirror/lang-markdown");
    return markdown();
  }

  // JavaScript
  if (ext.endsWith(".js") || ext.endsWith(".jsx")) {
    const { javascript } = await import("@codemirror/lang-javascript");
    return javascript();
  }

  // TypeScript
  if (ext.endsWith(".ts") || ext.endsWith(".tsx")) {
    const { javascript } = await import("@codemirror/lang-javascript");
    return javascript({ typescript: true });
  }

  // Python
  if (ext.endsWith(".py")) {
    const { python } = await import("@codemirror/lang-python");
    return python();
  }

  // Rust
  if (ext.endsWith(".rs")) {
    const { rust } = await import("@codemirror/lang-rust");
    return rust();
  }

  // HTML
  if (ext.endsWith(".html") || ext.endsWith(".htm")) {
    const { html } = await import("@codemirror/lang-html");
    return html();
  }

  // CSS
  if (ext.endsWith(".css")) {
    const { css } = await import("@codemirror/lang-css");
    return css();
  }

  // JSON
  if (ext.endsWith(".json")) {
    const { json } = await import("@codemirror/lang-json");
    return json();
  }

  // Plain text fallback
  return [];
};

/**
 * Get a human-readable language name from file extension
 * @param filepath - The path of the file
 * @returns Language name (e.g., "JavaScript", "Markdown")
 */
export const getLanguageName = (filepath: string): string => {
  const ext = filepath.toLowerCase();

  if (ext.endsWith(".md") || ext.endsWith(".markdown")) return "Markdown";
  if (ext.endsWith(".js") || ext.endsWith(".jsx")) return "JavaScript";
  if (ext.endsWith(".ts") || ext.endsWith(".tsx")) return "TypeScript";
  if (ext.endsWith(".py")) return "Python";
  if (ext.endsWith(".rs")) return "Rust";
  if (ext.endsWith(".html") || ext.endsWith(".htm")) return "HTML";
  if (ext.endsWith(".css")) return "CSS";
  if (ext.endsWith(".json")) return "JSON";

  return "Plain Text";
};
