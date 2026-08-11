import type { MDXEditorMethods } from "@mdxeditor/editor";
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
  VideoIcon,
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
import { compressImageFile } from "#/lib/image-compress";
import { m } from "#/paraglide/messages.js";

const MdxEditorSurface = lazy(() =>
  import("#/components/mdx-editor-surface").then((m) => ({ default: m.MdxEditorSurface })),
);

type FormSubmitHandler = NonNullable<ComponentProps<"form">["onSubmit"]>;

type MediaItemStatus = "uploading" | "done" | "error";

type MediaItem = {
  id: string;
  file: File;
  name: string;
  size: number;
  kind: "image" | "video";
  status: MediaItemStatus;
  progress: number;
  url?: string;
  posterUrl?: string;
  error?: string;
  objectUrl?: string;
  thumbUrl?: string;
  controller?: AbortController;
  abort?: (() => void) | null;
};

// 把视频第一帧画到 canvas，返回 dataURL，用于在上传面板和文章里作为封面/背景。
function captureVideoPoster(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;

    let settled = false;
    const finish = (value: string | null) => {
      if (settled) {
        return;
      }
      settled = true;
      URL.revokeObjectURL(objectUrl);
      resolve(value);
    };

    video.onloadeddata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 1;
      video.currentTime = Math.min(0.1, duration / 2);
    };
    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 480;
        canvas.height = video.videoHeight || 270;
        const context = canvas.getContext("2d");
        context?.drawImage(video, 0, 0, canvas.width, canvas.height);
        finish(canvas.toDataURL("image/jpeg", 0.72));
      } catch {
        finish(null);
      }
    };
    video.onerror = () => finish(null);
    setTimeout(() => finish(null), 5000);
  });
}

// 把第一帧 dataURL 作为图片上传到图床，得到可外链的 poster URL。
async function uploadPosterImage(dataUrl: string): Promise<string | undefined> {
  const blob = await (await fetch(dataUrl)).blob();
  const formData = new FormData();
  formData.append("file", blob, "poster.jpg");

  const response = await fetch("/api/media-upload", { method: "POST", body: formData }).catch(
    () => null,
  );

  if (!response?.ok) {
    return undefined;
  }

  const payload = (await response.json().catch(() => undefined)) as
    | { data?: Array<{ url: string }> }
    | undefined;

  return payload?.data?.[0]?.url;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  return `${bytes} B`;
}

// encodeURIComponent 不会转义 ( )，但 markdown 图片语法以 ) 结束 URL，
// 所以这里把 ( ) 也转义，避免 poster 链接里带括号时把语法截断。
function encodePosterParam(value: string): string {
  return encodeURIComponent(value).replace(/\(/g, "%28").replace(/\)/g, "%29");
}

type UploadPanelCopy = ReturnType<typeof getPostFormCopy>;

function MediaUploadPanel({
  activeCount,
  collapsed,
  copy,
  items,
  minimized,
  onCancel,
  onClose,
  onMinimize,
  onRetry,
  onRetryAll,
  onToggleSection,
  open,
}: {
  activeCount: number;
  collapsed: { uploading: boolean; done: boolean; error: boolean };
  copy: UploadPanelCopy;
  items: MediaItem[];
  minimized: boolean;
  onCancel: (id: string) => void;
  onClose: () => void;
  onMinimize: () => void;
  onRetry: (id: string) => void;
  onRetryAll: () => void;
  onToggleSection: (key: "uploading" | "done" | "error") => void;
  open: boolean;
}) {
  if (!open) {
    return activeCount > 0 ? (
      <button
        type="button"
        onClick={onMinimize}
        className="fixed right-4 bottom-4 z-50 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium shadow-2xl"
      >
        <UploadIcon className="size-4" />
        {copy.uploadPanelTitle}
        <span className="rounded-full bg-link/15 px-1.5 text-xs font-semibold text-link">
          {activeCount}
        </span>
      </button>
    ) : null;
  }

  const uploading = items.filter((item) => item.status === "uploading" && !item.url);
  const done = items.filter((item) => item.status === "done");
  const error = items.filter((item) => item.status === "error");

  return (
    <div className="fixed right-4 bottom-4 z-50 w-[372px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <UploadIcon className="size-4" />
          {copy.uploadPanelTitle}
          {activeCount > 0 ? (
            <span className="text-xs font-normal text-muted-foreground">
              · {activeCount} {copy.uploadingLabel}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onMinimize}
            title={copy.minimize}
            className="grid size-7 place-items-center rounded-md border border-border text-muted-foreground hover:bg-muted"
          >
            {minimized ? "▢" : "－"}
          </button>
          <button
            type="button"
            onClick={onClose}
            title={copy.close}
            className="grid size-7 place-items-center rounded-md border border-border text-muted-foreground hover:bg-muted"
          >
            ×
          </button>
        </div>
      </div>

      {!minimized ? (
        <div className="max-h-[60vh] space-y-2 overflow-auto p-2">
          <UploadSection
            collapsed={collapsed.uploading}
            count={uploading.length}
            label={copy.uploadingLabel}
            onToggle={() => onToggleSection("uploading")}
          >
            {uploading.length === 0 ? (
              <p className="px-1 py-2 text-xs text-muted-foreground">{copy.noneUploading}</p>
            ) : (
              uploading.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 rounded-lg border border-border p-2"
                >
                  <MediaThumb item={item} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(item.size)} · {item.progress}%
                    </p>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-link transition-all"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onCancel(item.id)}
                    title={copy.cancel}
                    className="grid size-7 shrink-0 place-items-center rounded-md border border-border text-muted-foreground hover:bg-muted"
                  >
                    <XIcon className="size-3.5" />
                  </button>
                </div>
              ))
            )}
          </UploadSection>

          <UploadSection
            collapsed={collapsed.done}
            count={done.length}
            label={copy.doneLabel}
            onToggle={() => onToggleSection("done")}
          >
            {done.length === 0 ? (
              <p className="px-1 py-2 text-xs text-muted-foreground">{copy.noneDone}</p>
            ) : (
              done.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 rounded-lg border border-border p-2"
                >
                  <MediaThumb item={item} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{formatBytes(item.size)}</p>
                  </div>
                </div>
              ))
            )}
          </UploadSection>

          <UploadSection
            action={
              error.length > 0 ? (
                <button
                  type="button"
                  onClick={onRetryAll}
                  className="rounded-md bg-destructive px-2 py-1 text-xs font-medium text-white hover:opacity-90"
                >
                  {copy.retryAll}
                </button>
              ) : undefined
            }
            collapsed={collapsed.error}
            count={error.length}
            label={copy.errorLabel}
            onToggle={() => onToggleSection("error")}
          >
            {error.length === 0 ? (
              <p className="px-1 py-2 text-xs text-muted-foreground">{copy.noneError}</p>
            ) : (
              error.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 rounded-lg border border-destructive/40 p-2"
                >
                  <MediaThumb item={item} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{item.name}</p>
                    <p className="text-xs text-destructive">
                      {item.error ?? copy.mediaUploadFailed}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRetry(item.id)}
                    className="shrink-0 rounded-md border border-destructive px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10"
                  >
                    {copy.retry}
                  </button>
                </div>
              ))
            )}
          </UploadSection>
        </div>
      ) : null}
    </div>
  );
}

function UploadSection({
  action,
  children,
  collapsed,
  count,
  label,
  onToggle,
}: {
  action?: ReactNode;
  children: ReactNode;
  collapsed: boolean;
  count: number;
  label: string;
  onToggle: () => void;
}) {
  return (
    <section>
      <div className="flex items-center justify-between px-1 py-1">
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-1.5 text-sm font-semibold"
        >
          <span className="text-muted-foreground">{collapsed ? "▸" : "▾"}</span>
          {label}
          <span className="rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground">
            {count}
          </span>
        </button>
        {action}
      </div>
      {!collapsed ? <div className="space-y-1.5">{children}</div> : null}
    </section>
  );
}

function MediaThumb({ item }: { item: MediaItem }) {
  if (item.kind === "video") {
    return (
      <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-md bg-destructive/10 text-destructive">
        {item.thumbUrl ? (
          <img src={item.thumbUrl} alt="" className="size-full object-cover" />
        ) : (
          <VideoIcon className="size-5" />
        )}
      </div>
    );
  }

  return (
    <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-md bg-link/10 text-link">
      {item.thumbUrl ? (
        <img src={item.thumbUrl} alt="" className="size-full object-cover" />
      ) : (
        <ImageIcon className="size-5" />
      )}
    </div>
  );
}

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
  const mdxEditorRef = useRef<MDXEditorMethods | null>(null);
  const markdownRef = useRef(markdown);
  useEffect(() => {
    markdownRef.current = markdown;
  }, [markdown]);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelMinimized, setPanelMinimized] = useState(false);
  const [collapsed, setCollapsed] = useState<{ uploading: boolean; done: boolean; error: boolean }>(
    { uploading: false, done: true, error: false },
  );
  const queueRef = useRef<string[]>([]);
  const inflightRef = useRef(0);
  const CONCURRENCY = 10;
  const mediaItemsRef = useRef<MediaItem[]>([]);
  useEffect(() => {
    mediaItemsRef.current = mediaItems;
  }, [mediaItems]);
  const activeUploadCount = mediaItems.filter(
    (item) => item.status === "uploading" && !item.url,
  ).length;
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
    // 富文本模式：MDXEditor 只在挂载时读取 value，之后不会随 prop 重新同步，
    // 因此必须用其命令式 API 把片段写进编辑器，否则视觉上“没写入编辑框”。
    const editor = mdxEditorRef.current;

    if (editor) {
      // 在光标当前位置插入（而非追加到末尾），符合「插到我点的地方」的意图。
      // MDXEditor 的 insertMarkdown 仅在编辑器“有选区”时生效，且失焦状态下首次
      // 插入后会清空选区（$setSelection(null)），导致后续图片全部插不进去、
      // 最终只显示第一张。因此先 focus()，待选区就绪的回调里再插入。
      editor.focus(() => {
        editor.insertMarkdown(snippet);
        onMarkdownChange(editor.getMarkdown() ?? "");
      });

      return;
    }

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

  const startMediaUpload = (fileList: FileList | null) => {
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

    const items: MediaItem[] = files.map((file, index) => {
      const isVideo = file.type.startsWith("video/");
      const objectUrl = isVideo ? undefined : URL.createObjectURL(file);
      return {
        id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        name: file.name,
        size: file.size,
        kind: isVideo ? "video" : "image",
        status: "uploading" as const,
        progress: 0,
        objectUrl,
        thumbUrl: objectUrl,
      };
    });

    setMediaItems((current) => [...current, ...items]);
    queueRef.current.push(...items.map((item) => item.id));
    setPanelOpen(true);
    setPanelMinimized(false);
    pumpQueue();
  };

  const pumpQueue = () => {
    while (inflightRef.current < CONCURRENCY && queueRef.current.length > 0) {
      const id = queueRef.current.shift() as string;
      const item = mediaItemsRef.current.find((candidate) => candidate.id === id);

      if (!item) {
        // mediaItemsRef 可能尚未同步（初始批次或重试时）。把 id 塞回队列，
        // 等 useEffect([mediaItems]) 触发 pumpQueue 时 ref 已同步再处理。
        queueRef.current.unshift(id);
        break;
      }

      inflightRef.current += 1;
      void uploadOne(item);
    }
  };

  const uploadOne = async (item: MediaItem) => {
    try {
      let thumbUrl = item.thumbUrl;

      if (item.kind === "video") {
        const frame = await captureVideoPoster(item.file).catch(() => null);

        if (frame) {
          thumbUrl = frame;
          setMediaItems((current) =>
            current.map((candidate) =>
              candidate.id === item.id ? { ...candidate, thumbUrl: frame } : candidate,
            ),
          );
        }
      }

      const fileForUpload =
        item.kind === "image"
          ? await compressImageFile(item.file).catch(() => item.file)
          : item.file;

      // 面板里显示压缩后的实际大小，而不是原始文件大小。
      if (fileForUpload.size !== item.size) {
        setMediaItems((current) =>
          current.map((candidate) =>
            candidate.id === item.id ? { ...candidate, size: fileForUpload.size } : candidate,
          ),
        );
      }

      const controller = new AbortController();
      const xhr = new XMLHttpRequest();

      setMediaItems((current) =>
        current.map((candidate) =>
          candidate.id === item.id
            ? {
                ...candidate,
                controller,
                abort: () => xhr.abort(),
                progress: 0,
              }
            : candidate,
        ),
      );

      const formData = new FormData();
      formData.append("file", fileForUpload);

      // 用 XHR 上传以拿到真实上传进度（fetch 不支持上传进度事件）。
      const result = await new Promise<
        | {
            ok: true;
            payload: { data?: Array<{ name: string; contentType: string; url: string }> };
          }
        | { ok: false }
      >((resolve, reject) => {
        let settled = false;
        const finish = (action: () => void) => {
          if (settled) {
            return;
          }
          settled = true;
          action();
        };

        xhr.open("POST", "/api/media-upload");
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setMediaItems((current) =>
              current.map((candidate) =>
                candidate.id === item.id ? { ...candidate, progress: percent } : candidate,
              ),
            );
          }
        };
        xhr.onload = () => {
          let payload:
            | { data?: Array<{ name: string; contentType: string; url: string }> }
            | undefined;
          try {
            payload = JSON.parse(xhr.responseText);
          } catch {
            payload = undefined;
          }
          finish(() =>
            resolve({
              ok: xhr.status >= 200 && xhr.status < 300,
              payload: payload ?? { data: [] },
            }),
          );
        };
        xhr.onerror = () => finish(() => resolve({ ok: false }));
        xhr.onabort = () => finish(() => reject(new DOMException("Aborted", "AbortError")));
        xhr.send(formData);
      });

      if (!result.ok) {
        throw new Error("upload failed");
      }

      const uploaded = result.payload.data?.[0];

      if (!uploaded?.url) {
        throw new Error("no url");
      }

      // 视频：把第一帧作为 poster 一并上传，嵌入 markdown 让文章里显示首帧背景。
      let posterUrl: string | undefined;

      if (item.kind === "video" && thumbUrl?.startsWith("data:")) {
        posterUrl = await uploadPosterImage(thumbUrl).catch(() => undefined);
      }

      setMediaItems((current) =>
        current.map((candidate) =>
          candidate.id === item.id
            ? {
                ...candidate,
                status: "done",
                url: uploaded.url,
                posterUrl,
                progress: 100,
                thumbUrl: thumbUrl ?? candidate.thumbUrl,
              }
            : candidate,
        ),
      );

      const snippet =
        item.kind === "video" && posterUrl
          ? `![${uploaded.name}](${uploaded.url}#poster=${encodePosterParam(posterUrl)})\n`
          : `![${uploaded.name}](${uploaded.url})\n`;
      insertMediaSnippet(snippet);
    } catch (error) {
      const canceled = error instanceof DOMException && error.name === "AbortError";

      setMediaItems((current) =>
        current.map((candidate) =>
          candidate.id === item.id
            ? {
                ...candidate,
                status: "error",
                error: canceled ? copy.uploadCanceled : copy.mediaUploadFailed,
                progress: 0,
              }
            : candidate,
        ),
      );

      if (!canceled) {
        toast.error(copy.mediaUploadFailed);
      }
    } finally {
      inflightRef.current -= 1;
      pumpQueue();
    }
  };

  const cancelUpload = (id: string) => {
    const item = mediaItemsRef.current.find((candidate) => candidate.id === id);

    if (item?.abort) {
      item.abort();
    } else if (item?.controller) {
      item.controller.abort();
    }

    queueRef.current = queueRef.current.filter((queuedId) => queuedId !== id);
  };

  const retryUpload = (id: string) => {
    const item = mediaItemsRef.current.find((candidate) => candidate.id === id);

    if (!item) {
      return;
    }

    setMediaItems((current) =>
      current.map((candidate) =>
        candidate.id === id
          ? { ...candidate, status: "uploading", error: undefined, progress: 0 }
          : candidate,
      ),
    );
    queueRef.current.push(id);
    setPanelOpen(true);
    pumpQueue();
  };

  const retryAllFailed = () => {
    const failedIds = mediaItemsRef.current
      .filter((item) => item.status === "error")
      .map((item) => item.id);

    if (failedIds.length === 0) {
      return;
    }

    setMediaItems((current) =>
      current.map((item) =>
        item.status === "error"
          ? { ...item, status: "uploading", error: undefined, progress: 0 }
          : item,
      ),
    );
    queueRef.current.push(...failedIds);
    setPanelOpen(true);
    pumpQueue();
  };

  // mediaItemsRef 在渲染后通过 effect 同步，因此初始批次的 pumpQueue 必须在
  // mediaItems 变更（ref 已同步）之后再触发，否则会找不到刚入队的条目。
  // 用 ref 持有最新的 pumpQueue，避免把每次渲染都变化的闭包写进依赖数组。
  const pumpQueueRef = useRef<() => void>(() => {});
  useEffect(() => {
    pumpQueueRef.current = pumpQueue;
  });
  useEffect(() => {
    pumpQueueRef.current();
  }, [mediaItems]);

  // 全部上传完成且没有失败项时，3 秒后自动收起上传面板（有失败项则保留以便重试）。
  const uploadsAllDone =
    mediaItems.length > 0 &&
    activeUploadCount === 0 &&
    !mediaItems.some((item) => item.status === "error");
  useEffect(() => {
    if (!uploadsAllDone) {
      return;
    }

    const timer = setTimeout(() => {
      setPanelOpen(false);
      setMediaItems([]);
    }, 3000);

    return () => clearTimeout(timer);
  }, [uploadsAllDone]);

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
          <div className="grid gap-2">
            <Label htmlFor="editor-slug">{copy.slugLabel}</Label>
            <Input
              id="editor-slug"
              name="slug"
              placeholder={copy.slugPlaceholder}
              defaultValue={editingPost?.slug ?? ""}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">{copy.slugHint}</p>
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
            <label className="flex min-h-9 items-center gap-2 text-sm" title={copy.listedHint}>
              <input
                type="checkbox"
                name="listed"
                defaultChecked={editingPost?.listed ?? true}
                className="size-4 rounded border-input"
              />
              {copy.listedLabel}
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
              title={copy.insertMedia}
            >
              <ImagePlusIcon className="size-4" />
              {copy.insertMedia}
              {activeUploadCount > 0 ? (
                <span className="ml-1 rounded-full bg-link/15 px-1.5 text-xs font-semibold text-link">
                  {activeUploadCount}
                </span>
              ) : null}
            </Button>
            <input
              ref={mediaFileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="sr-only"
              onChange={(event) => startMediaUpload(event.currentTarget.files)}
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
                editorRef={mdxEditorRef}
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

      <MediaUploadPanel
        activeCount={activeUploadCount}
        collapsed={collapsed}
        copy={copy}
        items={mediaItems}
        minimized={panelMinimized}
        open={panelOpen}
        onCancel={cancelUpload}
        onClose={() => setPanelOpen(false)}
        onMinimize={() => setPanelMinimized((value) => !value)}
        onRetry={retryUpload}
        onRetryAll={retryAllFailed}
        onToggleSection={(key) => setCollapsed((current) => ({ ...current, [key]: !current[key] }))}
      />
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
      cancel: "取消",
      clearCover: "清空封面",
      close: "关闭",
      coverInvalid: "请选择图片文件。",
      coverUploaded: "封面已上传",
      doneLabel: "已完成",
      emptyCover: "拖入一张图片，或从本机选择图片作为封面。",
      errorLabel: "失败",
      insertMedia: "插入图片/视频",
      listedHint: "取消勾选后文章不出现在博客列表，仅管理员可见。",
      listedLabel: "显示在博客列表",
      mediaInvalid: "请选择图片或视频文件。",
      mediaUploadFailed: "上传失败",
      mediaUploaded: "媒体链接已插入",
      minimize: "最小化",
      noneDone: "暂无已完成的项目",
      noneError: "暂无失败的项目",
      noneUploading: "暂无上传中的项目",
      previewUnavailable: "预览暂时无法打开这段 Markdown。请切回源码继续编辑。",
      retry: "重新上传",
      retryAll: "失败的全部重新上传",
      richEditorUnavailable: "富文本编辑器无法打开这段 Markdown，可以先在源码模式继续编辑。",
      saving: "正在保存...",
      slugHint: "留空则自动生成 16 位随机链接（文章名是汉字，不塞进 URL）。",
      slugLabel: "别名 / 链接",
      slugPlaceholder: "留空自动生成 16 位随机链接",
      sourceEditorLabel: "Markdown 源码",
      uploadCanceled: "已取消",
      uploadPanelTitle: "媒体上传",
      uploadingLabel: "上传中",
      uploadCover: "上传封面",
    };
  }

  return {
    cancel: "Cancel",
    clearCover: "Clear cover",
    close: "Close",
    coverInvalid: "Choose an image file.",
    coverUploaded: "Cover uploaded",
    doneLabel: "Completed",
    emptyCover: "Drop an image here, or choose one from your device.",
    errorLabel: "Failed",
    insertMedia: "Insert image/video",
    listedHint: "Uncheck to hide this post from the blog list. Visible to admins only.",
    listedLabel: "Show in blog list",
    mediaInvalid: "Choose an image or video file.",
    mediaUploadFailed: "Upload failed",
    mediaUploaded: "Media link inserted",
    minimize: "Minimize",
    noneDone: "No completed items",
    noneError: "No failed items",
    noneUploading: "No uploads in progress",
    previewUnavailable:
      "Preview could not open this Markdown. Switch back to source to keep editing.",
    retry: "Retry",
    retryAll: "Retry all failed",
    richEditorUnavailable:
      "The rich editor could not open this Markdown. Continue editing in source.",
    saving: "Saving...",
    slugHint:
      "Leave empty to auto-generate a 16-character random slug (Chinese titles are not used in the URL).",
    slugLabel: "Alias / slug",
    slugPlaceholder: "Empty = auto 16-char random slug",
    sourceEditorLabel: "Markdown source",
    uploadCanceled: "Canceled",
    uploadPanelTitle: "Media upload",
    uploadingLabel: "Uploading",
    uploadCover: "Upload cover",
  };
}
