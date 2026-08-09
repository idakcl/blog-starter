import { type Series } from "@repo/core";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { createFileRoute } from "@tanstack/react-router";
import { PencilIcon, PlusIcon, SaveIcon, Trash2Icon, XIcon } from "lucide-react";
import { useEffect, useMemo, useState, type ComponentProps } from "react";
import { toast } from "sonner";

import {
  AdminPageHeader,
  AdminPanel,
  AdminTableFrame,
  adminTextareaClassName,
} from "#/components/admin/admin-ui";
import { getResponseErrorMessage } from "#/lib/admin-notifications";
import { getCurrentLocale } from "#/lib/i18n";
import { m } from "#/paraglide/messages.js";

export const Route = createFileRoute("/_auth/admin/series")({
  component: AdminSeriesPage,
});

type FormSubmitHandler = NonNullable<ComponentProps<"form">["onSubmit"]>;

function AdminSeriesPage() {
  const locale = getCurrentLocale();
  const copy = getSeriesActionCopy(locale);
  const [rows, setRows] = useState<Series[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const editingSeries = useMemo(
    () => rows.find((series) => series.id === editingId) ?? null,
    [editingId, rows],
  );

  useEffect(() => {
    let ignore = false;

    void fetch(`/api/series?lang=${locale}`)
      .then((response) => (response.ok ? response.json() : undefined))
      .then((payload) => {
        const data = (payload as { data?: Series[] } | undefined)?.data;

        if (!ignore && data) {
          setRows(data);
        }
      });

    return () => {
      ignore = true;
    };
  }, [locale]);

  const saveSeries: FormSubmitHandler = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const sortOrderValue = Number(formData.get("sortOrder"));
    const response = await fetch(
      editingSeries
        ? `/api/series/${editingSeries.id}?lang=${locale}`
        : `/api/series?lang=${locale}`,
      {
        method: editingSeries ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          slug: formData.get("slug"),
          description: formData.get("description"),
          sortOrder: Number.isFinite(sortOrderValue) ? sortOrderValue : 0,
          locale,
        }),
      },
    ).catch(() => null);

    if (!response?.ok) {
      setStatus("error");
      toast.error(copy.saveError, {
        description: response
          ? await getResponseErrorMessage(response, copy.saveError)
          : copy.networkError,
      });
      return;
    }

    const payload = (await response.json()) as { data: Series };

    setRows((current) => {
      if (current.some((item) => item.id === payload.data.id)) {
        return current
          .map((item) => (item.id === payload.data.id ? payload.data : item))
          .sort(sortSeries);
      }

      return [payload.data, ...current].sort(sortSeries);
    });
    setEditingId(payload.data.id);
    setStatus("saved");
    toast.success(copy.saveSuccess(payload.data.name));
  };

  const deleteSeries = async (series: Series) => {
    const response = await fetch(`/api/series/${series.id}?lang=${locale}`, {
      method: "DELETE",
    }).catch(() => null);

    if (!response?.ok) {
      setStatus("error");
      toast.error(copy.deleteError, {
        description: response
          ? await getResponseErrorMessage(response, copy.deleteError)
          : copy.networkError,
      });
      return;
    }

    setRows((current) => current.filter((item) => item.id !== series.id));
    setEditingId((current) => (current === series.id ? null : current));
    setStatus("saved");
    toast.success(copy.deleteSuccess(series.name));
  };

  return (
    <section className="grid gap-5">
      <AdminPageHeader
        title={m.admin_series_title()}
        description={m.admin_series_description()}
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setEditingId(null);
              setStatus("idle");
            }}
          >
            <PlusIcon />
            {m.admin_series_new()}
          </Button>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
        <AdminPanel>
          <form
            key={editingSeries?.id ?? "new-series"}
            onSubmit={saveSeries}
            className="grid gap-4"
          >
            <div className="grid gap-2">
              <Label htmlFor="series-name">{m.admin_series_name()}</Label>
              <Input
                id="series-name"
                name="name"
                defaultValue={editingSeries?.name ?? ""}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="series-slug">{m.admin_series_slug()}</Label>
              <Input id="series-slug" name="slug" defaultValue={editingSeries?.slug ?? ""} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="series-description">{m.admin_series_summary()}</Label>
              <textarea
                id="series-description"
                name="description"
                defaultValue={editingSeries?.description ?? ""}
                rows={4}
                className={adminTextareaClassName}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="series-sort-order">{m.admin_series_sort_order()}</Label>
              <Input
                id="series-sort-order"
                name="sortOrder"
                type="number"
                defaultValue={editingSeries?.sortOrder ?? 0}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit">
                <SaveIcon />
                {m.admin_series_save()}
              </Button>
              {editingSeries ? (
                <Button type="button" variant="outline" onClick={() => setEditingId(null)}>
                  <XIcon />
                  {m.admin_series_cancel()}
                </Button>
              ) : null}
            </div>
            {status === "saved" ? (
              <p className="text-sm text-success">{m.admin_series_saved()}</p>
            ) : null}
            {status === "error" ? (
              <p className="text-sm text-destructive">{m.admin_series_error()}</p>
            ) : null}
          </form>
        </AdminPanel>

        <AdminPanel>
          <AdminTableFrame>
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-muted/55 text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="px-3 py-2.5">{m.admin_series_name()}</th>
                  <th className="px-3 py-2.5">{m.admin_series_slug()}</th>
                  <th className="px-3 py-2.5">{m.admin_series_sort_order()}</th>
                  <th className="px-3 py-2.5">{m.admin_posts_actions()}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/80">
                {rows.map((series) => (
                  <tr key={series.id}>
                    <td className="px-3 py-3">
                      <div className="grid gap-1">
                        <span className="font-medium">{series.name}</span>
                        <span className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                          {series.description}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">{series.slug}</td>
                    <td className="px-3 py-3 text-muted-foreground">{series.sortOrder}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingId(series.id)}
                        >
                          <PencilIcon />
                          {m.admin_posts_edit()}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => void deleteSeries(series)}
                        >
                          <Trash2Icon />
                          {m.admin_posts_delete()}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminTableFrame>
        </AdminPanel>
      </div>
    </section>
  );
}

function sortSeries(a: Series, b: Series) {
  return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);
}

function getSeriesActionCopy(locale: "en" | "zh") {
  if (locale === "zh") {
    return {
      deleteError: "专栏删除失败",
      deleteSuccess: (name: string) => `“${name}”已删除`,
      networkError: "网络异常，请稍后再试。",
      saveError: "专栏保存失败",
      saveSuccess: (name: string) => `“${name}”已保存`,
    };
  }

  return {
    deleteError: "Series could not be deleted",
    deleteSuccess: (name: string) => `"${name}" deleted`,
    networkError: "Network error. Try again in a moment.",
    saveError: "Series could not be saved",
    saveSuccess: (name: string) => `"${name}" saved`,
  };
}
