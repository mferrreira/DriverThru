type DocumentFileFieldProps = {
  title: string;
  recordLabel: string;
  recordId: number | null;
  canUpload?: boolean;
  noUploadHint?: string;
  fileObjectKey: string | null;
  fileUrl: string | null;
  uploading: boolean;
  deleting: boolean;
  error: string | null;
  onUpload: (file: File) => void;
  onDelete: () => void;
};

function getExtension(path: string | null | undefined): string {
  if (!path) return "";
  const noQuery = path.split("?")[0] ?? path;
  const parts = noQuery.split(".");
  return (parts[parts.length - 1] ?? "").toLowerCase();
}

export default function DocumentFileField({
  title,
  recordLabel,
  recordId,
  canUpload: canUploadOverride,
  noUploadHint,
  fileObjectKey,
  fileUrl,
  uploading,
  deleting,
  error,
  onUpload,
  onDelete,
}: DocumentFileFieldProps) {
  const hasFile = Boolean(fileObjectKey);
  const ext = getExtension(fileObjectKey);
  const isPdf = ext === "pdf";
  const previewableImage = hasFile && !!fileUrl && !isPdf && !["heic", "heif"].includes(ext);
  const canUpload = canUploadOverride ?? recordId !== null;
  const canDelete = canUpload && hasFile && !uploading && !deleting;

  return (
    <fieldset className="rounded-lg border border-zinc-200 p-3 sm:col-span-2">
      <legend className="px-1 text-sm font-semibold text-zinc-700">{title}</legend>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="h-28 w-28 shrink-0 overflow-hidden rounded-lg border border-zinc-300 bg-zinc-50">
          {previewableImage ? (
            <img src={fileUrl!} alt={recordLabel} className="h-full w-full object-cover" />
          ) : hasFile ? (
            <div className="grid h-full w-full place-items-center px-2 text-center text-[11px] text-zinc-500">
              {isPdf ? "PDF uploaded" : "Preview not supported"}
            </div>
          ) : (
            <div className="grid h-full w-full place-items-center text-xs text-zinc-500">No file</div>
          )}
        </div>

        <div className="flex-1 space-y-2">
          <p className="text-xs text-zinc-600">JPG, PNG, WEBP, HEIC/HEIF or PDF. Max size: 20MB.</p>
          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,.heic,.heif,application/pdf,.pdf"
            disabled={!canUpload || uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              onUpload(file);
              event.currentTarget.value = "";
            }}
            className="w-full text-sm file:mr-3 file:rounded-md file:border file:border-slate-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-slate-50 disabled:opacity-50"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onDelete}
              disabled={!canDelete}
              className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deleting ? "Deleting file..." : "Delete file"}
            </button>
            {hasFile && fileUrl ? (
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Open file
              </a>
            ) : null}
          </div>
          {!canUpload ? <p className="text-xs text-amber-700">{noUploadHint ?? `Save or select an existing ${recordLabel} first.`}</p> : null}
          {uploading ? <p className="text-xs text-slate-600">Uploading file...</p> : null}
          {deleting ? <p className="text-xs text-slate-600">Deleting file...</p> : null}
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
        </div>
      </div>
    </fieldset>
  );
}
