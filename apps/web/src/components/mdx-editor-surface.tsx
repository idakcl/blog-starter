import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CodeToggle,
  CreateLink,
  DiffSourceToggleWrapper,
  InsertImage,
  InsertTable,
  InsertThematicBreak,
  ListsToggle,
  MDXEditor,
  Separator,
  UndoRedo,
  codeBlockPlugin,
  codeMirrorPlugin,
  diffSourcePlugin,
  headingsPlugin,
  imagePlugin,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  quotePlugin,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
} from "@mdxeditor/editor";

import "@mdxeditor/editor/style.css";
import { cn } from "@repo/ui/lib/utils";
import { useMemo, useSyncExternalStore, type Ref } from "react";

import { compressImageFile } from "#/lib/image-compress";

type MdxEditorSurfaceProps = {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly className?: string;
  readonly editorClassName?: string;
  readonly contentEditableClassName?: string;
  readonly editorRef?: Ref<MDXEditorMethods>;
};

export function MdxEditorSurface({
  value,
  onChange,
  className,
  editorClassName,
  contentEditableClassName,
  editorRef,
}: MdxEditorSurfaceProps) {
  const mounted = useClientMounted();
  const plugins = useMemo(
    () => [
      headingsPlugin(),
      listsPlugin(),
      quotePlugin(),
      linkPlugin(),
      linkDialogPlugin(),
      imagePlugin({
        imageUploadHandler: async (file) => {
          const compressed = await compressImageFile(file).catch(() => file);
          const formData = new FormData();
          formData.append("file", compressed);

          const response = await fetch("/api/media-upload", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            throw new Error("Image upload failed");
          }

          const payload = (await response.json()) as {
            data?: Array<{ url?: string }>;
          };

          const url = payload.data?.[0]?.url;

          if (!url) {
            throw new Error("Image upload returned no URL");
          }

          return url;
        },
      }),
      tablePlugin(),
      thematicBreakPlugin(),
      codeBlockPlugin({ defaultCodeBlockLanguage: "ts" }),
      codeMirrorPlugin({
        codeBlockLanguages: {
          css: "CSS",
          js: "JavaScript",
          jsx: "JSX",
          markdown: "Markdown",
          ts: "TypeScript",
          tsx: "TSX",
        },
      }),
      diffSourcePlugin({ viewMode: "rich-text", readOnlyDiff: false }),
      markdownShortcutPlugin(),
      toolbarPlugin({
        toolbarContents: () => (
          <DiffSourceToggleWrapper>
            <UndoRedo />
            <Separator />
            <BlockTypeSelect />
            <BoldItalicUnderlineToggles />
            <CodeToggle />
            <ListsToggle />
            <Separator />
            <CreateLink />
            <InsertImage />
            <InsertTable />
            <InsertThematicBreak />
          </DiffSourceToggleWrapper>
        ),
      }),
    ],
    [],
  );

  if (!mounted) {
    return <div className="h-96 animate-pulse rounded-md border border-border bg-muted/55" />;
  }

  return (
    <div
      className={cn(
        "max-h-[70vh] overflow-x-hidden overflow-y-auto rounded-md border border-border bg-background shadow-xs",
        className,
      )}
    >
      <MDXEditor
        ref={editorRef}
        markdown={value}
        onChange={(nextValue) => onChange(nextValue)}
        plugins={plugins}
        className={cn("min-h-[360px]", editorClassName)}
        contentEditableClassName={cn(
          "prose prose-neutral prose-a:text-link dark:prose-invert min-h-[280px] max-w-none px-4 py-3 leading-7",
          contentEditableClassName,
        )}
      />
    </div>
  );
}

function useClientMounted() {
  return useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
}
