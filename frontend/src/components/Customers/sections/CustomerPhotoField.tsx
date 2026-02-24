type CustomerPhotoFieldProps = {
  selectedCustomerId: number | null;
  hasPhoto: boolean;
  photoUrl: string | null;
  uploadingPhoto: boolean;
  deletingPhoto: boolean;
  photoError: string | null;
  onUpload: (file: File) => void;
  onDelete: () => void;
};

export default function CustomerPhotoField({
  selectedCustomerId,
  hasPhoto,
  photoUrl,
  uploadingPhoto,
  deletingPhoto,
  photoError,
  onUpload,
  onDelete,
}: CustomerPhotoFieldProps) {
  const canUpload = selectedCustomerId !== null;
  const canDelete = canUpload && hasPhoto && !uploadingPhoto && !deletingPhoto;
  const previewable = hasPhoto && photoUrl && !/\.hei[cf](\?|$)/i.test(photoUrl);

  return (
    <fieldset className="rounded-lg border border-zinc-200 p-3">
      <legend className="px-1 text-sm font-semibold text-zinc-700">Customer photo</legend>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="h-28 w-28 shrink-0 overflow-hidden rounded-lg border border-zinc-300 bg-zinc-50">
          {previewable ? (
            <img src={photoUrl} alt="Customer" className="h-full w-full object-cover" />
          ) : hasPhoto ? (
            <div className="grid h-full w-full place-items-center px-2 text-center text-[11px] text-zinc-500">
              Preview not supported here
            </div>
          ) : (
            <div className="grid h-full w-full place-items-center text-xs text-zinc-500">No photo</div>
          )}
        </div>

        <div className="flex-1 space-y-2">
          <p className="text-xs text-zinc-600">JPG, PNG, WEBP, HEIC or HEIF. Max size: 50MB.</p>
          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
            disabled={!canUpload || uploadingPhoto}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) {
                return;
              }
              onUpload(file);
              event.currentTarget.value = "";
            }}
            className="w-full text-sm file:mr-3 file:rounded-md file:border file:border-slate-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-slate-50 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={onDelete}
            disabled={!canDelete}
            className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deletingPhoto ? "Deleting photo..." : "Delete photo"}
          </button>
          {!canUpload ? <p className="text-xs text-amber-700">Create the customer first, then upload photo.</p> : null}
          {uploadingPhoto ? <p className="text-xs text-slate-600">Uploading photo...</p> : null}
          {deletingPhoto ? <p className="text-xs text-slate-600">Deleting photo...</p> : null}
          {photoError ? <p className="text-xs text-red-600">{photoError}</p> : null}
        </div>
      </div>
    </fieldset>
  );
}
