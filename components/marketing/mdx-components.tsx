import type { MDXComponents } from 'mdx/types';

export const mdxComponents: MDXComponents = {
  h1: (props) => (
    <h1
      className="mb-6 mt-10 text-3xl font-bold text-slate-900 first:mt-0"
      {...props}
    />
  ),
  h2: (props) => (
    <h2
      className="mb-4 mt-8 text-2xl font-bold text-slate-900"
      {...props}
    />
  ),
  h3: (props) => (
    <h3
      className="mb-3 mt-6 text-xl font-semibold text-slate-900"
      {...props}
    />
  ),
  p: (props) => (
    <p className="mb-4 leading-relaxed text-slate-700" {...props} />
  ),
  a: (props) => (
    <a
      className="font-medium text-primary underline underline-offset-2 hover:text-primary-dark"
      {...props}
    />
  ),
  ul: (props) => (
    <ul className="mb-4 list-disc space-y-1 pl-6 text-slate-700" {...props} />
  ),
  ol: (props) => (
    <ol
      className="mb-4 list-decimal space-y-1 pl-6 text-slate-700"
      {...props}
    />
  ),
  li: (props) => <li className="leading-relaxed" {...props} />,
  blockquote: (props) => (
    <blockquote
      className="mb-4 border-l-4 border-primary/30 pl-4 italic text-slate-600"
      {...props}
    />
  ),
  code: (props) => (
    <code
      className="rounded bg-slate-100 px-1.5 py-0.5 text-sm text-slate-800"
      {...props}
    />
  ),
  pre: (props) => (
    <pre
      className="mb-4 overflow-x-auto rounded-card bg-slate-900 p-4 text-sm text-slate-100"
      {...props}
    />
  ),
  img: (props) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="my-6 w-full rounded-card" alt="" {...props} />
  ),
  hr: () => <hr className="my-8 border-slate-200" />,
};
