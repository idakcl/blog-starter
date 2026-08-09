import type { Asset, SupportedLocale } from "@repo/core";
import { Button } from "@repo/ui/components/button";
import { Label } from "@repo/ui/components/label";
import { cn } from "@repo/ui/lib/utils";
import { createFileRoute } from "@tanstack/react-router";
import {
  CheckIcon,
  CopyIcon,
  DatabaseIcon,
  ExternalLinkIcon,
  FileIcon,
  FileTextIcon,
  LayoutGridIcon,
  ListIcon,
  RefreshCwIcon,
  SearchIcon,
  ShieldAlertIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEventHandler,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import {
  AdminPageHeader,
  AdminPanel,
  AdminTableFrame,
  adminInputClassName,
  adminPanelClassName,
  adminSelectClassName,
} from "#/components/admin/admin-ui";
import { getResponseErrorMessage } from "#/lib/admin-notifications";
import { getCurrentLocale } from "#/lib/i18n";
import { m } from "#/paraglide/messages.js";

export const Route = createFileRoute("/_auth/admin/assets")({
  component: AdminAssetsPage,
});

type AssetKindFilter = "all" | "image" | "document" | "archive" | "other";
type AssetSort = "newest" | "oldest" | "largest" | "smallest" | "name";
type AssetViewMode = "list" | "grid";
type CopyTarget = "markdown" | "url" | "key" | "selected-markdown" | "selected-url";

type R2StoragePayload = {
  status: "ready" | "degraded";
  buckets: Array<{
    binding: "CMS_STORAGE";
    purpose: "storage";
    prefix: string;
    status: "ready" | "unavailable";
    checkedAt: string;
    sampleCount: number;
    message?: string;
  }>;
};

type AssetListPayload = {
  data?: Asset[];
  storage?: R2StoragePayload;
};

function AdminAssetsPage() {
  const locale = getCurrentLocale();
  const copy = getAssetsCopy(locale);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "uploaded" | "error">(
    "idle",
  );
  const [rows, setRows] = useState<Asset[]>([]);
  const [storage, setStorage] = useState<R2StoragePayload | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<AssetKindFilter>("all");
  const [sortBy, setSortBy] = useState<AssetSort>("newest");
  const [viewMode, setViewMode] = useState<AssetViewMode>("list");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [statusMessage, setStatusMessage] = useState("");
  const [copiedAsset, setCopiedAsset] = useState<{
    id: string;
    type: CopyTarget;
  } | null>(null);

  const refreshAssets = useCallback(async () => {
    setLoadState("loading");
    const payload = await fetchAssetList();

    if (!payload) {
      setLoadState("error");
      return;
    }

    setRows(payload.data ?? []);
    setStorage(payload.storage ?? null);
    setLoadState("ready");
  }, []);

  useEffect(() => {
    let ignore = false;

    void fetchAssetList().then((payload) => {
      if (ignore) {
        return;
      }

      if (!payload) {
        setLoadState("error");
        return;
      }

      setRows(payload.data ?? []);
      setStorage(payload.storage ?? null);
      setLoadState("ready");
    });

    return () => {
      ignore = true;
    };
  }, []);

  const uploadFiles = async (files: File[]) => {
    const validFiles = files.filter(isUploadFile);

    if (!validFiles.length) {
      setStatusMessage(copy.emptySelection);
      setUploadState("error");
      resetFileInput(fileInputRef);
      toast.error(copy.emptySelection);
      return;
    }

    setUploadState("uploading");
    setStatusMessage(copy.uploading(validFiles.length));
    const uploadedAssets: Asset[] = [];

    for (const file of validFiles) {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/assets", {
        method: "POST",
        body: formData,
      }).catch(() => null);

      if (!response?.ok) {
        const payload = (await response?.json().catch(() => undefined)) as
          | (AssetListPayload & { error?: string })
          | undefined;

        if (payload?.storage) {
          setStorage(payload.storage);
        }

        setStatusMessage(payload?.error ?? copy.uploadError);
        setUploadState("error");
        resetFileInput(fileInputRef);
        toast.error(copy.uploadError, { description: payload?.error ?? copy.networkError });
        return;
      }

      const payload = (await response.json()) as { data: Asset };
      uploadedAssets.push(payload.data);
    }

    setRows((current) => [...uploadedAssets, ...current]);
    resetFileInput(fileInputRef);
    setStatusMessage(copy.uploaded(validFiles.length));
    setUploadState("uploaded");
    toast.success(copy.uploaded(validFiles.length));
  };

  const handleDragOver: DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDrop: DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    setIsDragging(false);

    void uploadFiles(Array.from(event.dataTransfer.files).filter(isUploadFile));
  };

  const copyAsset = async (asset: Asset, type: Extract<CopyTarget, "markdown" | "url" | "key">) => {
    const text =
      type === "markdown"
        ? `![${asset.filename}](${getAbsoluteAssetUrl(asset.url)})`
        : type === "key"
          ? asset.key
          : getAbsoluteAssetUrl(asset.url);

    const copied = await navigator.clipboard.writeText(text).then(
      () => true,
      () => false,
    );

    if (!copied) {
      toast.error(copy.copyError);
      return;
    }

    setCopiedAsset({ id: asset.id, type });
    toast.success(copy.copySuccess(type));
  };

  const copySelected = async (type: Extract<CopyTarget, "selected-markdown" | "selected-url">) => {
    const selectedRows = getSelectedRows(rows, selectedIds);
    const text = selectedRows
      .map((asset) =>
        type === "selected-markdown"
          ? `![${asset.filename}](${getAbsoluteAssetUrl(asset.url)})`
          : getAbsoluteAssetUrl(asset.url),
      )
      .join("\n");

    const copied = await navigator.clipboard.writeText(text).then(
      () => true,
      () => false,
    );

    if (!copied) {
      toast.error(copy.copyError);
      return;
    }

    setCopiedAsset({ id: "selected", type });
    toast.success(copy.copySuccess(type));
  };

  const deleteAsset = async (asset: Asset) => {
    const response = await fetch(`/api/assets/${asset.id}`, { method: "DELETE" }).catch(() => null);

    if (!response?.ok) {
      toast.error(copy.deleteError, {
        description: response
          ? await getResponseErrorMessage(response, copy.deleteError)
          : copy.networkError,
      });
      return;
    }

    setRows((current) => current.filter((row) => row.id !== asset.id));
    setSelectedIds((current) => {
      const next = new Set(current);
      next.delete(asset.id);
      return next;
    });
    toast.success(copy.deleteSuccess(asset.filename));
  };

  const deleteSelectedAssets = async () => {
    const selectedRows = getSelectedRows(rows, selectedIds);

    if (!selectedRows.length || !window.confirm(copy.deleteSelectedConfirm(selectedRows.length))) {
      return;
    }

    const deletedIds = new Set<string>();

    for (const asset of selectedRows) {
      const response = await fetch(`/api/assets/${asset.id}`, { method: "DELETE" }).catch(
        () => null,
      );

      if (response?.ok) {
        deletedIds.add(asset.id);
      }
    }

    setRows((current) => current.filter((asset) => !deletedIds.has(asset.id)));
    setSelectedIds(new Set());
    if (deletedIds.size === selectedRows.length) {
      toast.success(copy.deleteSelectedSuccess(deletedIds.size));
      return;
    }

    toast.error(copy.deleteSelectedPartial(deletedIds.size, selectedRows.length));
  };

  const toggleSelected = (assetId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (next.has(assetId)) {
        next.delete(assetId);
      } else {
        next.add(assetId);
      }

      return next;
    });
  };

  const stats = getAssetStats(rows);
  const visibleRows = getVisibleRows({ kindFilter, query, rows, sortBy });
  const selectedRows = getSelectedRows(rows, selectedIds);
  const storageBucket = storage?.buckets[0];
  const storageReady = storage?.status === "ready";
  const allVisibleSelected =
    visibleRows.length > 0 && visibleRows.every((asset) => selectedIds.has(asset.id));

  return (
    <section className="grid gap-5">
      <AdminPageHeader
        title={m.admin_assets_title()}
        description={m.admin_assets_description()}
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() => void refreshAssets()}
            disabled={loadState === "loading"}
          >
            <RefreshCwIcon className={cn(loadState === "loading" && "animate-spin")} />
            {copy.refresh}
          </Button>
        }
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`${adminPanelClassName} ${
          isDragging ? "border-link ring-3 ring-link/15" : "border-border/80"
        }`}
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {copy.libraryLabel}
            </p>
            <h2 className="mt-2 text-xl font-semibold">
              {copy.librarySummary(stats.total, stats.size)}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {storage
                ? storageReady
                  ? copy.storageReadyLine
                  : copy.storageNeedsAttentionLine
                : copy.storageCheckingLine}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            <StatusBadge ready={storageReady} unknown={!storage} copy={copy} />
            <Button
              type="button"
              disabled={uploadState === "uploading" || storageBucket?.status === "unavailable"}
              onClick={() => {
                setStatusMessage("");
                fileInputRef.current?.click();
              }}
            >
              <UploadIcon />
              {uploadState === "uploading" ? m.admin_assets_uploading() : copy.uploadFiles}
            </Button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          id="asset-file-upload"
          name="file"
          type="file"
          multiple
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) =>
            void uploadFiles(Array.from(event.currentTarget.files ?? []).filter(isUploadFile))
          }
          className="sr-only"
          suppressHydrationWarning
        />

        {uploadState === "uploaded" ? (
          <p className="mt-3 text-sm text-success">{statusMessage}</p>
        ) : null}
        {uploadState === "error" ? (
          <p className="mt-3 text-sm text-destructive">{statusMessage || m.admin_assets_error()}</p>
        ) : null}

        <StorageConfigDetails bucket={storageBucket} copy={copy} storage={storage} />
      </div>

      <AdminPanel>
        <div className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px_auto] md:items-end">
            <div className="grid gap-2">
              <Label htmlFor="asset-search">{m.admin_assets_search()}</Label>
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="asset-search"
                  value={query}
                  onChange={(event) => setQuery(event.currentTarget.value)}
                  placeholder={m.admin_assets_search_placeholder()}
                  className={cn(adminInputClassName, "pl-9")}
                  suppressHydrationWarning
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="asset-kind-filter">{copy.typeFilter}</Label>
              <select
                id="asset-kind-filter"
                value={kindFilter}
                onChange={(event) => setKindFilter(event.currentTarget.value as AssetKindFilter)}
                className={adminSelectClassName}
              >
                <option value="all">{copy.kindAll}</option>
                <option value="image">{copy.kindImage}</option>
                <option value="document">{copy.kindDocument}</option>
                <option value="archive">{copy.kindArchive}</option>
                <option value="other">{copy.kindOther}</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="asset-sort">{copy.sortBy}</Label>
              <select
                id="asset-sort"
                value={sortBy}
                onChange={(event) => setSortBy(event.currentTarget.value as AssetSort)}
                className={adminSelectClassName}
              >
                <option value="newest">{copy.sortNewest}</option>
                <option value="oldest">{copy.sortOldest}</option>
                <option value="largest">{copy.sortLargest}</option>
                <option value="smallest">{copy.sortSmallest}</option>
                <option value="name">{copy.sortName}</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label>{copy.viewMode}</Label>
              <div className="inline-flex h-9 w-fit overflow-hidden rounded-md border border-input bg-background shadow-xs">
                <button
                  type="button"
                  className={viewModeButtonClassName(viewMode === "list")}
                  aria-pressed={viewMode === "list"}
                  title={copy.viewList}
                  onClick={() => setViewMode("list")}
                >
                  <ListIcon className="size-4" />
                  <span>{copy.viewList}</span>
                </button>
                <button
                  type="button"
                  className={viewModeButtonClassName(viewMode === "grid")}
                  aria-pressed={viewMode === "grid"}
                  title={copy.viewGrid}
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGridIcon className="size-4" />
                  <span>{copy.viewGrid}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/80 pt-4">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={(event) => {
                    const next = new Set(selectedIds);

                    for (const asset of visibleRows) {
                      if (event.currentTarget.checked) {
                        next.add(asset.id);
                      } else {
                        next.delete(asset.id);
                      }
                    }

                    setSelectedIds(next);
                  }}
                  className="size-4 rounded border-border"
                />
                {copy.selectVisible}
              </label>
              <p className="text-sm text-muted-foreground">
                {copy.visibleSummary(visibleRows.length, rows.length, selectedRows.length)}
              </p>
            </div>

            <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full sm:w-auto"
                disabled={!selectedRows.length}
                onClick={() => void copySelected("selected-url")}
              >
                {copiedAsset?.id === "selected" && copiedAsset.type === "selected-url" ? (
                  <CheckIcon />
                ) : (
                  <CopyIcon />
                )}
                {copy.copySelectedUrls}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full sm:w-auto"
                disabled={!selectedRows.length}
                onClick={() => void copySelected("selected-markdown")}
              >
                {copiedAsset?.id === "selected" && copiedAsset.type === "selected-markdown" ? (
                  <CheckIcon />
                ) : (
                  <FileTextIcon />
                )}
                {copy.copySelectedMarkdown}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="w-full sm:w-auto"
                disabled={!selectedRows.length}
                onClick={() => void deleteSelectedAssets()}
              >
                <Trash2Icon />
                {copy.deleteSelected}
              </Button>
            </div>
          </div>
        </div>
      </AdminPanel>

      {loadState === "error" ? (
        <AdminPanel>
          <p className="text-sm text-destructive">{copy.loadError}</p>
        </AdminPanel>
      ) : null}

      {loadState === "loading" ? (
        <AdminPanel>
          <p className="text-sm text-muted-foreground">{copy.loading}</p>
        </AdminPanel>
      ) : null}

      {loadState !== "loading" && rows.length === 0 ? (
        <AdminPanel>
          <p className="text-sm text-muted-foreground">{m.admin_assets_empty()}</p>
        </AdminPanel>
      ) : null}

      {rows.length > 0 && visibleRows.length === 0 ? (
        <AdminPanel>
          <p className="text-sm text-muted-foreground">{m.admin_assets_no_matches()}</p>
        </AdminPanel>
      ) : null}

      {visibleRows.length > 0 && viewMode === "list" ? (
        <AssetTable
          assets={visibleRows}
          copiedAsset={copiedAsset}
          copy={copy}
          selectedIds={selectedIds}
          onCopy={copyAsset}
          onDelete={deleteAsset}
          onSelect={toggleSelected}
        />
      ) : null}

      {visibleRows.length > 0 && viewMode === "grid" ? (
        <AssetGrid
          assets={visibleRows}
          copiedAsset={copiedAsset}
          copy={copy}
          selectedIds={selectedIds}
          onCopy={copyAsset}
          onDelete={deleteAsset}
          onSelect={toggleSelected}
        />
      ) : null}
    </section>
  );
}

function StatusBadge({
  copy,
  ready,
  unknown,
}: {
  readonly copy: ReturnType<typeof getAssetsCopy>;
  readonly ready: boolean;
  readonly unknown: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium",
        ready && "border-success/30 bg-success/10 text-success",
        !ready && !unknown && "border-warning/30 bg-warning/10 text-warning",
        unknown && "border-border bg-background text-muted-foreground",
      )}
    >
      {ready ? <CheckIcon className="size-4" /> : <ShieldAlertIcon className="size-4" />}
      {unknown ? copy.checking : ready ? copy.ready : copy.needsAttention}
    </span>
  );
}

function StorageConfigDetails({
  bucket,
  copy,
  storage,
}: {
  readonly bucket: R2StoragePayload["buckets"][number] | undefined;
  readonly copy: ReturnType<typeof getAssetsCopy>;
  readonly storage: R2StoragePayload | null;
}) {
  return (
    <details className="mt-4 border-t border-border/80 pt-4">
      <summary className="flex min-h-9 w-fit cursor-pointer list-none items-center gap-2 rounded-md px-1 text-sm font-medium text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/20 [&::-webkit-details-marker]:hidden">
        <DatabaseIcon className="size-4" />
        {copy.storageTitle}
      </summary>
      <div className="mt-3 rounded-md border border-border/80 p-3">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <p className="text-sm font-medium">{bucket?.binding ?? "CMS_STORAGE"}</p>
            <p className="mt-1 text-sm text-muted-foreground">{copy.storageDescription}</p>
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              {copy.prefix}: {bucket?.prefix ?? "uploads/ · imports/ · exports/"}
            </p>
          </div>
          <StatusBadge copy={copy} ready={storage?.status === "ready"} unknown={!storage} />
        </div>
        {bucket?.message ? (
          <p className="mt-3 text-sm leading-6 text-warning">{bucket.message}</p>
        ) : null}
        {storage?.status === "degraded" ? (
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{copy.storageSetupHint}</p>
        ) : null}
      </div>
    </details>
  );
}

function viewModeButtonClassName(active: boolean) {
  return cn(
    "inline-flex min-w-18 items-center justify-center gap-1.5 px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/20",
    active
      ? "bg-foreground text-background"
      : "text-muted-foreground hover:bg-muted hover:text-foreground",
  );
}

function AssetTable({
  assets,
  copiedAsset,
  copy,
  onCopy,
  onDelete,
  onSelect,
  selectedIds,
}: {
  readonly assets: Asset[];
  readonly copiedAsset: { id: string; type: CopyTarget } | null;
  readonly copy: ReturnType<typeof getAssetsCopy>;
  readonly onCopy: (asset: Asset, type: Extract<CopyTarget, "markdown" | "url" | "key">) => void;
  readonly onDelete: (asset: Asset) => void;
  readonly onSelect: (assetId: string) => void;
  readonly selectedIds: Set<string>;
}) {
  return (
    <AdminTableFrame>
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead className="bg-muted/55 text-xs text-muted-foreground uppercase">
          <tr>
            <th className="px-3 py-2.5">{copy.select}</th>
            <th className="px-3 py-2.5">{copy.asset}</th>
            <th className="px-3 py-2.5">{copy.key}</th>
            <th className="px-3 py-2.5">{copy.size}</th>
            <th className="px-3 py-2.5">{copy.created}</th>
            <th className="px-3 py-2.5">{copy.actions}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/80">
          {assets.map((asset) => {
            return (
              <tr key={asset.id} className={cn(selectedIds.has(asset.id) && "bg-muted/35")}>
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(asset.id)}
                    onChange={() => onSelect(asset.id)}
                    aria-label={copy.selectAsset(asset.filename)}
                    className="size-4 rounded border-input"
                  />
                </td>
                <td className="px-3 py-3">
                  <div className="grid grid-cols-[56px_minmax(0,1fr)] items-center gap-3">
                    <AssetPreview asset={asset} className="h-10 w-14" iconClassName="size-4" />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{asset.filename}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {asset.contentType}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="max-w-[320px] px-3 py-3">
                  <p className="truncate font-mono text-xs text-muted-foreground">{asset.key}</p>
                </td>
                <td className="px-3 py-3 text-muted-foreground">{formatBytes(asset.sizeBytes)}</td>
                <td className="px-3 py-3 text-muted-foreground">
                  {formatDateTime(asset.createdAt)}
                </td>
                <td className="px-3 py-3">
                  <AssetActions
                    asset={asset}
                    copiedAsset={copiedAsset}
                    copy={copy}
                    onCopy={onCopy}
                    onDelete={onDelete}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </AdminTableFrame>
  );
}

function AssetGrid({
  assets,
  copiedAsset,
  copy,
  onCopy,
  onDelete,
  onSelect,
  selectedIds,
}: {
  readonly assets: Asset[];
  readonly copiedAsset: { id: string; type: CopyTarget } | null;
  readonly copy: ReturnType<typeof getAssetsCopy>;
  readonly onCopy: (asset: Asset, type: Extract<CopyTarget, "markdown" | "url" | "key">) => void;
  readonly onDelete: (asset: Asset) => void;
  readonly onSelect: (assetId: string) => void;
  readonly selectedIds: Set<string>;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-4">
      {assets.map((asset) => {
        const selected = selectedIds.has(asset.id);

        return (
          <article
            key={asset.id}
            className={cn(
              "rounded-md border border-border/80 bg-card p-3 shadow-xs transition-colors",
              selected && "border-link/45 bg-muted/35",
            )}
          >
            <div className="relative">
              <AssetPreview asset={asset} className="aspect-square w-full" iconClassName="size-8" />
              <label className="absolute top-2 left-2 flex size-8 items-center justify-center rounded-md border border-border bg-background/95 shadow-xs">
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => onSelect(asset.id)}
                  aria-label={copy.selectAsset(asset.filename)}
                  className="size-4 rounded border-input"
                />
              </label>
            </div>
            <div className="mt-3 min-w-0">
              <p className="truncate text-sm font-semibold">{asset.filename}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">{asset.contentType}</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <p>{formatBytes(asset.sizeBytes)}</p>
                <p className="text-right">{formatDateTime(asset.createdAt)}</p>
              </div>
              <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{asset.key}</p>
              <AssetActions
                asset={asset}
                className="mt-3"
                copiedAsset={copiedAsset}
                copy={copy}
                onCopy={onCopy}
                onDelete={onDelete}
              />
            </div>
          </article>
        );
      })}
    </div>
  );
}

function AssetPreview({
  asset,
  className,
  iconClassName,
}: {
  readonly asset: Asset;
  readonly className: string;
  readonly iconClassName: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden rounded-md border border-border bg-muted",
        className,
      )}
    >
      {isPreviewableImage(asset) ? (
        <img src={asset.url} alt="" loading="lazy" className="size-full object-cover" />
      ) : (
        <FileIcon className={cn("text-muted-foreground", iconClassName)} />
      )}
    </div>
  );
}

function ActionTooltip({
  children,
  label,
}: {
  readonly children: ReactNode;
  readonly label: string;
}) {
  return (
    <span className="group/action relative inline-flex">
      {children}
      <span className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-20 -translate-x-1/2 rounded-md border border-border bg-popover px-2 py-1 text-xs font-medium whitespace-nowrap text-popover-foreground opacity-0 shadow-md transition-opacity group-focus-within/action:opacity-100 group-hover/action:opacity-100">
        {label}
      </span>
    </span>
  );
}

function AssetActions({
  asset,
  className,
  copiedAsset,
  copy,
  onCopy,
  onDelete,
}: {
  readonly asset: Asset;
  readonly className?: string;
  readonly copiedAsset: { id: string; type: CopyTarget } | null;
  readonly copy: ReturnType<typeof getAssetsCopy>;
  readonly onCopy: (asset: Asset, type: Extract<CopyTarget, "markdown" | "url" | "key">) => void;
  readonly onDelete: (asset: Asset) => void;
}) {
  const UrlCopyIcon =
    copiedAsset?.id === asset.id && copiedAsset.type === "url" ? CheckIcon : CopyIcon;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <ActionTooltip label={copy.copyUrl}>
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          title={copy.copyUrl}
          aria-label={copy.copyUrl}
          onClick={() => onCopy(asset, "url")}
        >
          <UrlCopyIcon />
        </Button>
      </ActionTooltip>
      <ActionTooltip label={copy.copyMarkdown}>
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          title={copy.copyMarkdown}
          aria-label={copy.copyMarkdown}
          onClick={() => onCopy(asset, "markdown")}
        >
          {copiedAsset?.id === asset.id && copiedAsset.type === "markdown" ? (
            <CheckIcon />
          ) : (
            <FileTextIcon />
          )}
        </Button>
      </ActionTooltip>
      <ActionTooltip label={copy.copyKey}>
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          title={copy.copyKey}
          aria-label={copy.copyKey}
          onClick={() => onCopy(asset, "key")}
        >
          {copiedAsset?.id === asset.id && copiedAsset.type === "key" ? (
            <CheckIcon />
          ) : (
            <DatabaseIcon />
          )}
        </Button>
      </ActionTooltip>
      <ActionTooltip label={copy.openAsset}>
        <Button
          size="icon-sm"
          variant="outline"
          title={copy.openAsset}
          nativeButton={false}
          render={
            <a
              href={asset.url}
              target="_blank"
              rel="noreferrer"
              aria-label={copy.openAsset}
              title={copy.openAsset}
            />
          }
        >
          <ExternalLinkIcon />
        </Button>
      </ActionTooltip>
      <ActionTooltip label={copy.deleteAsset}>
        <Button
          type="button"
          size="icon-sm"
          variant="destructive"
          title={copy.deleteAsset}
          aria-label={copy.deleteAsset}
          onClick={() => onDelete(asset)}
        >
          <Trash2Icon />
        </Button>
      </ActionTooltip>
    </div>
  );
}

async function fetchAssetList() {
  const response = await fetch("/api/assets");

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as AssetListPayload;
}

function getVisibleRows({
  kindFilter,
  query,
  rows,
  sortBy,
}: {
  kindFilter: AssetKindFilter;
  query: string;
  rows: Asset[];
  sortBy: AssetSort;
}) {
  const normalizedQuery = query.trim().toLowerCase();

  return [...rows]
    .filter((asset) => kindFilter === "all" || getAssetKind(asset) === kindFilter)
    .filter((asset) =>
      normalizedQuery
        ? [asset.filename, asset.contentType, asset.key, asset.url].some((value) =>
            value.toLowerCase().includes(normalizedQuery),
          )
        : true,
    )
    .sort((left, right) => {
      if (sortBy === "oldest") {
        return Date.parse(left.createdAt) - Date.parse(right.createdAt);
      }

      if (sortBy === "largest") {
        return right.sizeBytes - left.sizeBytes;
      }

      if (sortBy === "smallest") {
        return left.sizeBytes - right.sizeBytes;
      }

      if (sortBy === "name") {
        return left.filename.localeCompare(right.filename);
      }

      return Date.parse(right.createdAt) - Date.parse(left.createdAt);
    });
}

function getAssetStats(rows: Asset[]) {
  return {
    size: rows.reduce((total, asset) => total + asset.sizeBytes, 0),
    total: rows.length,
  };
}

function getSelectedRows(rows: Asset[], selectedIds: Set<string>) {
  return rows.filter((asset) => selectedIds.has(asset.id));
}

function getAssetKind(asset: Asset): Exclude<AssetKindFilter, "all"> {
  if (isPreviewableImage(asset)) {
    return "image";
  }

  if (
    /zip|gzip|tar|compressed|archive/i.test(asset.contentType) ||
    /\.(zip|gz|tgz|tar)$/i.test(asset.filename)
  ) {
    return "archive";
  }

  if (
    /pdf|text|markdown|json|csv|xml|document/i.test(asset.contentType) ||
    /\.(pdf|txt|md|json|csv|xml|doc|docx)$/i.test(asset.filename)
  ) {
    return "document";
  }

  return "other";
}

function isPreviewableImage(asset: Asset) {
  return asset.contentType.startsWith("image/");
}

function isUploadFile(value: FormDataEntryValue | File): value is File {
  return value instanceof File && value.size > 0;
}

function getAbsoluteAssetUrl(url: string) {
  return new URL(url, window.location.origin).toString();
}

function resetFileInput(ref: { current: HTMLInputElement | null }) {
  if (ref.current) {
    ref.current.value = "";
  }
}

function formatBytes(value: number) {
  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  if (value < 1024 * 1024 * 1024) {
    return `${(value / 1024 / 1024).toFixed(1)} MB`;
  }

  return `${(value / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getAssetsCopy(locale: SupportedLocale) {
  if (locale === "zh") {
    return {
      actions: "操作",
      asset: "资源",
      checking: "检查中",
      copyKey: "复制对象 Key",
      copyMarkdown: "复制 Markdown",
      copyError: "复制失败",
      copySelectedMarkdown: "复制所选 Markdown",
      copySelectedUrls: "复制所选 URL",
      copySuccess: (type: CopyTarget) =>
        type === "markdown" || type === "selected-markdown"
          ? "Markdown 已复制"
          : type === "key"
            ? "对象 Key 已复制"
            : "URL 已复制",
      copyUrl: "复制 URL",
      created: "创建时间",
      deleteError: "资源删除失败",
      deleteAsset: "删除资源",
      deleteSelectedPartial: (deleted: number, total: number) =>
        `${deleted}/${total} 个资源删除成功。`,
      deleteSelectedSuccess: (count: number) => `${count} 个资源已删除。`,
      deleteSelected: "删除所选",
      deleteSelectedConfirm: (count: number) => `确定删除 ${count} 个资源吗？`,
      deleteSuccess: (filename: string) => `“${filename}”已删除`,
      emptySelection: "请选择至少一个文件。",
      key: "对象 Key",
      kindAll: "全部类型",
      kindArchive: "压缩包",
      kindDocument: "文档",
      kindImage: "图片",
      kindOther: "其他",
      libraryLabel: "资源库",
      librarySummary: (count: number, size: number) => `${count} 个资源，${formatBytes(size)}`,
      loadError: "资源列表加载失败。",
      loading: "正在加载资源...",
      needsAttention: "需要处理",
      networkError: "网络异常，请稍后再试。",
      openAsset: "打开资源",
      prefix: "对象前缀",
      ready: "正常",
      refresh: "刷新",
      select: "选择",
      selectAsset: (filename: string) => `选择 ${filename}`,
      selectVisible: "选择当前列表",
      size: "大小",
      sortBy: "排序",
      sortLargest: "体积最大",
      sortName: "文件名",
      sortNewest: "最新上传",
      sortOldest: "最早上传",
      sortSmallest: "体积最小",
      storageCheckingLine: "正在检查 R2 存储桶是否可用。",
      storageDescription:
        "默认只需要一个 R2 存储桶。公开上传、导入包、导出包和备份用不同前缀隔离。",
      storageNeedsAttentionLine: "R2 存储桶不可用时，上传、导入、导出和备份都会受影响。",
      storageReadyLine: "R2 存储桶可用；上传、导入、导出和备份共享同一个存储桶。",
      storageSetupHint:
        "如果这里异常，先确认 Cloudflare 账号已开通 R2 subscription 并配置付款方式，然后创建 wrangler.jsonc 中声明的存储桶。",
      storageTitle: "存储配置",
      typeFilter: "类型",
      unavailable: "不可用",
      uploadError: "资源上传失败。",
      uploadFiles: "上传文件",
      uploaded: (count: number) => `${count} 个资源已上传。`,
      uploading: (count: number) => `正在上传 ${count} 个文件...`,
      viewGrid: "方块",
      viewList: "列表",
      viewMode: "视图",
      visibleSummary: (visible: number, total: number, selected: number) =>
        `当前 ${visible} / 共 ${total} 个资源，已选 ${selected} 个。`,
    };
  }

  return {
    actions: "Actions",
    asset: "Asset",
    checking: "Checking",
    copyKey: "Copy object key",
    copyMarkdown: "Copy Markdown",
    copyError: "Copy failed",
    copySelectedMarkdown: "Copy selected Markdown",
    copySelectedUrls: "Copy selected URLs",
    copySuccess: (type: CopyTarget) =>
      type === "markdown" || type === "selected-markdown"
        ? "Markdown copied"
        : type === "key"
          ? "Object key copied"
          : "URL copied",
    copyUrl: "Copy URL",
    created: "Created",
    deleteError: "Asset could not be deleted",
    deleteAsset: "Delete asset",
    deleteSelectedPartial: (deleted: number, total: number) =>
      `${deleted}/${total} assets deleted.`,
    deleteSelectedSuccess: (count: number) => `${count} assets deleted.`,
    deleteSelected: "Delete selected",
    deleteSelectedConfirm: (count: number) => `Delete ${count} selected assets?`,
    deleteSuccess: (filename: string) => `"${filename}" deleted`,
    emptySelection: "Select at least one file.",
    key: "Object key",
    kindAll: "All types",
    kindArchive: "Archives",
    kindDocument: "Documents",
    kindImage: "Images",
    kindOther: "Other",
    libraryLabel: "Asset library",
    librarySummary: (count: number, size: number) => `${count} assets, ${formatBytes(size)}`,
    loadError: "Assets could not be loaded.",
    loading: "Loading assets...",
    needsAttention: "Needs attention",
    networkError: "Network error. Try again in a moment.",
    openAsset: "Open asset",
    prefix: "Object prefixes",
    ready: "Ready",
    refresh: "Refresh",
    select: "Select",
    selectAsset: (filename: string) => `Select ${filename}`,
    selectVisible: "Select visible",
    size: "Size",
    sortBy: "Sort",
    sortLargest: "Largest",
    sortName: "Filename",
    sortNewest: "Newest",
    sortOldest: "Oldest",
    sortSmallest: "Smallest",
    storageCheckingLine: "Checking whether the R2 bucket is available.",
    storageDescription:
      "The default setup uses one R2 bucket. Uploads, imports, exports, and backups are separated by prefixes.",
    storageNeedsAttentionLine:
      "Uploads, imports, exports, and backups are affected while R2 is unavailable.",
    storageReadyLine: "R2 is ready; uploads, imports, exports, and backups share one bucket.",
    storageSetupHint:
      "If this is unavailable, make sure the Cloudflare account has an R2 subscription and payment method, then create the bucket declared in wrangler.jsonc.",
    storageTitle: "Storage configuration",
    typeFilter: "Type",
    unavailable: "Unavailable",
    uploadError: "Asset upload failed.",
    uploadFiles: "Upload files",
    uploaded: (count: number) => `${count} assets uploaded.`,
    uploading: (count: number) => `Uploading ${count} files...`,
    viewGrid: "Grid",
    viewList: "List",
    viewMode: "View",
    visibleSummary: (visible: number, total: number, selected: number) =>
      `${visible} of ${total} assets visible, ${selected} selected.`,
  };
}
