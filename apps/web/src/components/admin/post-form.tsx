import { type Asset, type Post, type Series, renderMarkdownToHtml } from "@repo/core";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { cn } from "@repo/ui/lib/utils";
import {
  CalendarClockIcon,
  Code2Icon,
  EyeIcon,
  ImageIcon,
  ImagePlusIcon,
  Loader2Icon,
  PencilLineIcon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentProps,
  type DragEventHandler,
  type ReactNode,
  type RefObject,
} from "react";
import { toast } from "sonner";

import {
  adminPanelClassName,
  adminSelectClassName,
  adminTextareaClassName,
} from "#/components/admin/admin-ui";
import { getCurrentLocale } from "#/lib/i18n";
import { m } from "#/paraglide/messages.js";

const MdxEditorSurface = lazy(() =>
  import("#/components/mdx-editor-surface").then((m) => ({ default: m.MdxEditorSurface })),
);

type FormSubmitHandler = NonNullable<ComponentProps<"form">["onSubmit"]>;

interface PostFormProps {
  editingPost: Post | null;
  editorMode: "editor" | "source" | "preview";
  editorState: "idle" | "saving" | "saved" | "error";
  markdown: string;
  fallbackPublishedAtIso: string;
  onEditorModeChange: (mode: "editor" | "source" | "preview") => void;
  onMarkdownChange: (markdown: string) => void;
  onSubmit: FormSubmitHandler;
}

export function PostForm({
  editingPost,
  editorMode,
  editorState,
  markdown,
  fallbackPublishedAtIso,
  onEditorModeChange,
  onMarkdownChange,
  onSubmit,
}: PostFormProps) {
  const locale = getCurrentLocale();
  const copy = getPostFormCopy(locale);
  const coverFileInputRef = useRef<HTMLInputElement | null>(null);
  const [assetRows, setAssetRows] = useState<Asset[]>([]);
  const [seriesRows, setSeriesRows] = useState<Series[]>([]);
  const [coverImage, setCoverImage] = useState(editingPost?.coverImage ?? "");
  const [coverUploadState, setCoverUploadState] = useState<"idle" | "uploading" | "error">("idle");
  const [isCoverDragging, setIsCoverDragging] = useState(false);
  const mounted = useClientMounted();
  const saving = editorState === "saving";
  const mediaFileInputRef = useRef<HTMLInputElement | null>(null);
  const sourceTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const markdownRef = useRef(markdown);
  markdownRef.current = markdown;
  const [mediaUploadState, setMediaUploadState] = useState<"idle" | "uploading" | "error">("idle");
  const previewResult = useMemo(
    () => (editorMode === "preview" ? renderPreviewMarkdown(markdown) : null),
    [editorMode, markdown],
  );
  const imageAssets = useMemo(
    () => assetRows.filter((asset) => asset.contentType.startsWith("image/")),
    [assetRows],
  );
  const trimmedCoverImage = coverImage.trim();

  useEffect(() => {
    let ignore = false;

    void Promise.all([
      fetch("/api/assets").then((response) => (response.ok ? response.json() : undefined)),
      fetch("/api/series").then((response) => (response.ok ? response.json() : undefined)),
    ])
      .then(([assetPayload, seriesPayload]) => {
        const assets = (assetPayload as { data?: Asset[] } | undefined)?.data;
        const series = (seriesPayload as { data?: Series[] } | undefined)?.data;

        if (!ignore && assets) {
          setAssetRows(assets);
        }

        if (!ignore && series) {
          setSeriesRows(series);
        }
      })
      .catch(() => undefined);

    return () => {
      ignore = true;
    };
  }, []);

  const uploadCoverFile = async (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) {
      setCoverUploadState("error");
      toast.error(copy.coverInvalid);
      return;
    }

    setCoverUploadState("uploading");

    const formData = new FormData();
    formData.append("file", file);

    if (editingPost?.id) {
      formData.append("attachedPostId", editingPost.id);
    }

    const response = await fetch("/api/assets", {
      method: "POST",
      body: formData,
    }).catch(() => null);

    if (!response?.ok) {
      setCoverUploadState("error");
      toast.error(m.admin_assets_error());
      return;
    }

    const payload = (await response.json().catch(() => undefined)) as { data?: Asset } | undefined;

    if (!payload?.data?.url) {
      setCoverUploadState("error");
      toast.error(m.admin_assets_error());
      return;
    }

    const uploadedAsset = payload.data;
    setCoverImage(uploadedAsset.url);
    setAssetRows((current) => [
      uploadedAsset,
      ...current.filter((asset) => asset.id !== uploadedAsset.id),
    ]);
    if (coverFileInputRef.current) {
      coverFileInputRef.current.value = "";
    }
    setCoverUploadState("idle");
    toast.success(copy.coverUploaded);
  };

  const handleCoverDragOver: DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    setIsCoverDragging(true);
  };

  const handleCoverDrop: DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    setIsCoverDragging(false);

    void uploadCoverFile(
      Array.from(event.dataTransfer.files).find((file) => file.type.startsWith("image/")),
    );
  };

  const insertMediaSnippet = (snippet: string) => {
    const textarea = sourceTextareaRef.current;

    if (textarea) {
      const domValue = textarea.value;
      const start = textarea.selectionStart ?? domValue.length;
      const end = textarea.selectionEnd ?? domValue.length;
      const next = `${domValue.slice(0, start)}${snippet}${domValue.slice(end)}`;

      onMarkdownChange(next);

      requestAnimationFrame(() => {
        textarea.focus();
        const position = start + snippet.length;
        textarea.setSelectionRange(position, position);
      });

      return;
    }

    const current = markdownRef.current;
    const next = current.trim().length > 0 ? `${current}\n\n${snippet}\n` : snippet;

    onMarkdownChange(next);
  };

  const handleMediaUpload = async (fileList: FileList | null) => {
    const files = Array.from(fileList ?? []).filter(
      (file) => file.type.startsWith("image/") || file.type.startsWith("video/"),
    );

    if (mediaFileInputRef.current) {
      mediaFileInputRef.current.value = "";
    }

    if (files.length === 0) {
      toast.error(copy.mediaInvalid);
      return;
    }

    setMediaUploadState("uploading");

    const snippets: string[] = [];
    let failed = false;

    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/media-upload", {
        method: "POST",
        body: formData,
      }).catch(() => null);

      if (!response?.ok) {
        failed = true;
        continue;
      }

      const payload = (await response.json().catch(() => undefined)) as
        | { data?: Array<{ name: string; contentType: string; url: string }> }
        | undefined;
      const item = payload?.data?.[0];

      if (!item?.url) {
        failed = true;
        continue;
      }

      snippets.push(`![${item.name}](${item.url})`);
    }

    if (snippets.length > 0) {
      insertMediaSnippet(snippets.join("\n\n"));
      toast.success(copy.mediaUploaded);
    }

    if (failed) {
      toast.error(m.admin_assets_error());
    }

    setMediaUploadState("idle");
  };

  return (
    <form
      key={editingPost?.id ?? "new-post"}
      id="post-editor"
      onSubmit={onSubmit}
      className={`${adminPanelClassName} grid gap-6 lg:p-6`}
    >
      <div className="grid gap-4 border-b border-border/80 pb-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
        <div className="grid min-w-0 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="editor-title">{m.admin_posts_column_title()}</Label>
            <Input
              id="editor-title"
              name="title"
              required
              defaultValue={editingPost?.title ?? m.admin_editor_default_title()}
              className="h-12 text-lg font-semibold md:text-lg"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="editor-excerpt">{m.admin_editor_excerpt()}</Label>
            <Input
              id="editor-excerpt"
              name="excerpt"
              defaultValue={editingPost?.excerpt ?? m.admin_editor_default_excerpt()}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 xl:justify-end">
          <Button type="submit" name="status" value="draft" variant="outline" disabled={saving}>
            {m.admin_save_draft()}
          </Button>
          <Button type="submit" name="status" value="scheduled" variant="outline" disabled={saving}>
            <CalendarClockIcon />
            {m.admin_schedule_post()}
          </Button>
          <Button type="submit" name="status" value="published" disabled={saving}>
            {m.admin_publish_post()}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 border-b border-border/80 pb-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="editor-cover-file">{m.admin_editor_cover_image()}</Label>
            {trimmedCoverImage ? (
              <Button type="button" size="sm" variant="outline" onClick={() => setCoverImage("")}>
                <XIcon />
                {copy.clearCover}
              </Button>
            ) : null}
          </div>
          <input type="hidden" name="coverImage" value={coverImage} />
          <input
            ref={coverFileInputRef}
            id="editor-cover-file"
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => void uploadCoverFile(event.currentTarget.files?.[0])}
            suppressHydrationWarning
          />
          <div
            onDragOver={handleCoverDragOver}
            onDragLeave={() => setIsCoverDragging(false)}
            onDrop={handleCoverDrop}
            className={cn(
              "relative flex aspect-[16/9] min-h-56 overflow-hidden rounded-md border border-border bg-muted transition",
              isCoverDragging && "border-link ring-3 ring-link/15",
            )}
          >
            {trimmedCoverImage ? (
              <img src={trimmedCoverImage} alt="" className="size-full object-cover" />
            ) : (
              <div className="flex size-full flex-col items-center justify-center gap-3 px-6 text-center text-muted-foreground">
                <ImageIcon className="size-10" />
                <p className="text-sm leading-6">{copy.emptyCover}</p>
              </div>
            )}
            {coverUploadState === "uploading" ? (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 text-sm font-medium">
                <Loader2Icon className="mr-2 size-4 animate-spin" />
                {m.admin_assets_uploading()}
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => coverFileInputRef.current?.click()}
              disabled={coverUploadState === "uploading"}
            >
              <UploadIcon />
              {copy.uploadCover}
            </Button>
            {imageAssets.length ? (
              <select
                aria-label={m.admin_editor_cover_asset()}
                value=""
                onChange={(event) => {
                  const nextCoverImage = event.currentTarget.value;

                  if (nextCoverImage) {
                    setCoverImage(nextCoverImage);
                  }
                }}
                className={cn(adminSelectClassName, "min-w-52")}
              >
                <option value="">{m.admin_editor_cover_asset_placeholder()}</option>
                {imageAssets.map((asset) => (
                  <option key={asset.id} value={asset.url}>
                    {asset.filename}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
          {coverUploadState === "error" ? (
            <p className="text-sm text-destructive">{m.admin_assets_error()}</p>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="editor-series">{m.admin_editor_series()}</Label>
            <select
              id="editor-series"
              name="seriesId"
              defaultValue={editingPost?.series?.id ?? ""}
              className={adminSelectClassName}
            >
              <option value="">{m.admin_editor_series_none()}</option>
              {seriesRows.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="editor-tags">{m.admin_editor_tags()}</Label>
            <Input
              id="editor-tags"
              name="tags"
              defaultValue={editingPost?.tags.map((tag) => tag.name).join(", ")}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="editor-published-at">{m.admin_editor_publish_at()}</Label>
            <Input
              id="editor-published-at"
              name="publishedAt"
              type="datetime-local"
              defaultValue={toDatetimeLocal(editingPost?.publishedAt ?? fallbackPublishedAtIso)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 md:col-span-2">
            <label className="flex min-h-9 items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="commentsEnabled"
                defaultChecked={editingPost?.commentsEnabled ?? true}
                className="size-4 rounded border-input"
              />
              {m.admin_editor_comments_enabled()}
            </label>
            <label className="flex min-h-9 items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="pinned"
                defaultChecked={editingPost?.pinned ?? false}
                className="size-4 rounded border-input"
              />
              {m.admin_editor_pinned()}
            </label>
            <label className="flex min-h-9 items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="featured"
                defaultChecked={editingPost?.featured ?? false}
                className="size-4 rounded border-input"
              />
              {m.admin_editor_featured()}
            </label>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={editorMode === "editor" ? "default" : "outline"}
              onClick={() => onEditorModeChange("editor")}
            >
              <PencilLineIcon />
              {m.admin_editor_rich_mode()}
            </Button>
            <Button
              type="button"
              variant={editorMode === "source" ? "default" : "outline"}
              onClick={() => onEditorModeChange("source")}
            >
              <Code2Icon />
              {m.admin_editor_source_mode()}
            </Button>
            <Button
              type="button"
              variant={editorMode === "preview" ? "default" : "outline"}
              onClick={() => onEditorModeChange("preview")}
            >
              <EyeIcon />
              {m.admin_editor_preview_mode()}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => mediaFileInputRef.current?.click()}
              disabled={mediaUploadState === "uploading"}
              title={copy.insertMedia}
            >
              {mediaUploadState === "uploading" ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <ImagePlusIcon className="size-4" />
              )}
              {copy.insertMedia}
            </Button>
            <input
              ref={mediaFileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="sr-only"
              onChange={(event) => void handleMediaUpload(event.currentTarget.files)}
              suppressHydrationWarning
            />
          </div>
          <div className="min-h-5 text-sm">
            {editorState === "saving" ? (
              <p className="inline-flex items-center gap-2 text-muted-foreground">
                <Loader2Icon className="size-4 animate-spin" />
                {copy.saving}
              </p>
            ) : null}
            {editorState === "error" ? (
              <p className="text-destructive">{m.admin_editor_error()}</p>
            ) : null}
          </div>
        </div>

        <p className="border-l-2 border-border px-3 text-sm leading-6 text-muted-foreground">
          {m.admin_editor_description()}
        </p>

        {editorMode === "editor" && !mounted ? (
          <div className="min-h-[560px] animate-pulse rounded-md border border-border bg-muted/55" />
        ) : null}

        {editorMode === "editor" && mounted ? (
          <Suspense fallback={<div className="min-h-[560px] animate-pulse rounded bg-muted" />}>
            <EditorRuntimeBoundary
              key={editingPost?.id ?? "new-post"}
              fallback={
                <RichEditorFallback
                  copy={copy}
                  markdown={markdown}
                  onMarkdownChange={onMarkdownChange}
                />
              }
            >
              <MdxEditorSurface
                value={markdown}
                onChange={onMarkdownChange}
                className="min-h-[560px]"
                editorClassName="min-h-[560px]"
                contentEditableClassName="min-h-[500px] px-5 py-5 text-base leading-8"
              />
            </EditorRuntimeBoundary>
          </Suspense>
        ) : null}

        {editorMode === "source" ? (
          <SourceMarkdownEditor
            value={markdown}
            label={copy.sourceEditorLabel}
            onMarkdownChange={onMarkdownChange}
            textareaRef={sourceTextareaRef}
          />
        ) : null}

        {editorMode === "preview" ? (
          previewResult?.error ? (
            <div className="min-h-[560px] rounded-md border border-border bg-muted/45 p-5 text-sm text-muted-foreground">
              {copy.previewUnavailable}
            </div>
          ) : (
            <div
              className="prose prose-neutral prose-a:text-link dark:prose-invert min-h-[560px] max-w-none rounded-md border border-border bg-muted/45 p-5"
              dangerouslySetInnerHTML={{ __html: previewResult?.html ?? "" }}
            />
          )
        ) : null}
      </div>
    </form>
  );
}

class EditorRuntimeBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

function RichEditorFallback({
  copy,
  markdown,
  onMarkdownChange,
}: {
  copy: ReturnType<typeof getPostFormCopy>;
  markdown: string;
  onMarkdownChange: (markdown: string) => void;
}) {
  return (
    <div className="grid gap-3 rounded-md border border-border bg-muted/35 p-4">
      <p className="text-sm text-muted-foreground">{copy.richEditorUnavailable}</p>
      <SourceMarkdownEditor
        value={markdown}
        label={copy.sourceEditorLabel}
        onMarkdownChange={onMarkdownChange}
      />
    </div>
  );
}

function SourceMarkdownEditor({
  label,
  value,
  onMarkdownChange,
  textareaRef,
}: {
  label: string;
  value: string;
  onMarkdownChange: (markdown: string) => void;
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
}) {
  return (
    <textarea
      ref={textareaRef}
      aria-label={label}
      value={value}
      onChange={(event) => onMarkdownChange(event.target.value)}
      className={`${adminTextareaClassName} min-h-[560px] resize-y font-mono leading-6 focus-visible:ring-[3px] focus-visible:ring-ring/50`}
    />
  );
}

function renderPreviewMarkdown(markdown: string) {
  try {
    return { error: false as const, html: renderMarkdownToHtml(markdown) };
  } catch {
    return { error: true as const, html: "" };
  }
}

function toDatetimeLocal(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function useClientMounted() {
  return useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
}

function getPostFormCopy(locale: "en" | "zh") {
  if (locale === "zh") {
    return {
      clearCover: "清空封面",
      coverInvalid: "请选择图片文件。",
      coverUploaded: "封面已上传",
      emptyCover: "拖入一张图片，或从本机选择图片作为封面。",
      insertMedia: "插入图片/视频",
      mediaInvalid: "请选择图片或视频文件。",
      mediaUploaded: "媒体链接已插入",
      previewUnavailable: "预览暂时无法打开这段 Markdown。请切回源码继续编辑。",
      richEditorUnavailable: "富文本编辑器无法打开这段 Markdown，可以先在源码模式继续编辑。",
      saving: "正在保存...",
      sourceEditorLabel: "Markdown 源码",
      uploadCover: "上传封面",
    };
  }

  return {
    clearCover: "Clear cover",
    coverInvalid: "Choose an image file.",
    coverUploaded: "Cover uploaded",
    emptyCover: "Drop an image here, or choose one from your device.",
    insertMedia: "Insert image/video",
    mediaInvalid: "Choose an image or video file.",
    mediaUploaded: "Media link inserted",
    previewUnavailable:
      "Preview could not open this Markdown. Switch back to source to keep editing.",
    richEditorUnavailable:
      "The rich editor could not open this Markdown. Continue editing in source.",
    saving: "Saving...",
    sourceEditorLabel: "Markdown source",
    uploadCover: "Upload cover",
  };
}
