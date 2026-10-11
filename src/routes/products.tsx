import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { actions, fileToPhoto, inr, useStore, type Product } from "@/lib/store";

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [
      { title: "Menu — Goa Choice Cafe" },
      { name: "description", content: "Manage Goa Choice menu items, photos, prices and categories." },
      { property: "og:title", content: "Menu — Goa Choice Cafe" },
      { property: "og:description", content: "Manage Goa Choice menu items, photos, prices and categories." },
    ],
  }),
  component: Products,
});

type Draft = { [K in keyof Product]?: Product[K] | undefined };

function Products() {
  const products = useStore((s) => s.products);
  const [draft, setDraft] = useState<Draft | null>(null);
  const cats = [...new Set(products.map((p) => p.category))];

  return (
    <AppShell
      title="Menu"
      action={
        <button onClick={() => setDraft({ category: cats[0] ?? "" })} className="flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          <Plus className="h-4 w-4" /> Add
        </button>
      }
    >
      {cats.map((c) => (
        <section key={c} className="mb-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-secondary-foreground">{c}</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {products.filter((p) => p.category === c).map((p) => (
              <div key={p.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-card p-2">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                  {p.photo ? <img src={p.photo} alt={p.name} loading="lazy" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center font-display text-xl text-muted-foreground">{p.name[0]}</div>}
                </div>
                <div className="min-w-0">
                  <div className="truncate font-medium">{p.name}</div>
                  <div className="text-sm text-primary">{inr(p.price)}</div>
                </div>
                <div className="flex">
                  <button aria-label="Edit" onClick={() => setDraft(p)} className="rounded-full p-2 hover:bg-muted"><Pencil className="h-4 w-4" /></button>
                  <button aria-label="Delete" onClick={() => confirm(`Delete ${p.name}?`) && actions.deleteProduct(p.id)} className="rounded-full p-2 text-destructive hover:bg-muted"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
      {products.length === 0 && <p className="py-10 text-center text-muted-foreground">No items yet. Tap Add to create one.</p>}
      {draft && <Editor draft={draft} cats={cats} onClose={() => setDraft(null)} />}
    </AppShell>
  );
}

function Editor({ draft, cats, onClose }: { draft: Draft; cats: string[]; onClose: () => void }) {
  const [d, setD] = useState<Draft>(draft);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const valid = d.name?.trim() && d.category?.trim() && (d.price ?? -1) >= 0;
  const input = "w-full rounded-xl border border-input bg-background px-3 py-3 text-base";
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-foreground/40 sm:items-center" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          actions.saveProduct({ ...(d.id ? { id: d.id } : {}), name: d.name!.trim(), price: Number(d.price), category: d.category!.trim(), ...(d.photo ? { photo: d.photo } : {}) });
          onClose();
        }}
        className="max-h-[90vh] w-full space-y-3 overflow-y-auto rounded-t-3xl bg-card p-5 sm:max-w-md sm:rounded-3xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">{d.id ? "Edit item" : "New item"}</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-full p-2 hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>
        <label className="flex cursor-pointer items-center gap-3">
          <div className="h-20 w-20 overflow-hidden rounded-2xl bg-muted">
            {d.photo && <img src={d.photo} alt="" className="h-full w-full object-cover" />}
          </div>
          <span className="text-sm font-medium text-primary">{d.photo ? "Change photo" : "Add photo"}</span>
          <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { setPhotoError(null); if (f.size > 10 * 1024 * 1024) { setPhotoError("Image too large — pick one under 10 MB."); return; } setD({ ...d, photo: await fileToPhoto(f) }); } catch (err) { console.error(err); setPhotoError("Couldn't read that image. Try another file."); } e.target.value = ""; }} />
        </label>
        {photoError && <p role="alert" className="text-xs text-destructive">{photoError}</p>}
        {d.photo && <button type="button" onClick={() => setD({ ...d, photo: undefined })} className="text-xs text-destructive">Remove photo</button>}
        <input className={input} placeholder="Name" value={d.name ?? ""} onChange={(e) => setD({ ...d, name: e.target.value })} />
        <input className={input} placeholder="Price (₹)" type="number" inputMode="decimal" min={0} value={d.price ?? ""} onChange={(e) => setD({ ...d, price: e.target.value === "" ? undefined : Number(e.target.value) })} />
        <input className={input} placeholder="Category" list="cats" value={d.category ?? ""} onChange={(e) => setD({ ...d, category: e.target.value })} />
        <datalist id="cats">{cats.map((c) => <option key={c} value={c} />)}</datalist>
        <button disabled={!valid} className="w-full rounded-xl bg-primary p-3 font-semibold text-primary-foreground disabled:opacity-40">Save</button>
      </form>
    </div>
  );
}
