<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Media;
use App\Models\MediaFolder;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Intervention\Image\ImageManager;

class MediaController extends Controller
{
    /** Limit a query to media the user may see: their websites' items + the shared library. */
    private function scopeToUser(Request $request, $query)
    {
        $user = $request->user();

        if ($user->hasRole('super_admin')) {
            return $query;
        }

        $ids = $user->accessibleWebsiteIds();

        return $query->where(fn ($q) => $q->whereIn('website_id', $ids)->orWhereNull('website_id'));
    }

    public function index(Request $request)
    {
        return $this->scopeToUser($request, Media::with('folder'))
            ->when($request->filled('website_id'), fn ($q) => $q->where('website_id', $request->integer('website_id')))
            ->when($request->filled('folder_id'), fn ($q) => $q->where('folder_id', $request->integer('folder_id')))
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->string('type')))
            ->when($request->filled('search'), fn ($q) => $q->where('file_name', 'like', '%'.$request->string('search').'%'))
            ->latest()
            ->paginate($request->integer('per_page', 40));
    }

    /** Handles single and bulk upload; images get an optimized web variant + thumbnail. */
    public function store(Request $request)
    {
        $request->validate([
            'files' => ['required', 'array'],
            'files.*' => ['file', 'max:51200'], // 50 MB
            'website_id' => ['nullable', 'exists:websites,id'],
            'folder_id' => ['nullable', 'exists:media_folders,id'],
        ]);

        abort_unless($request->user()->canManageWebsite($request->input('website_id')), 403);

        $uploaded = [];

        foreach ($request->file('files') as $file) {
            $mime = $file->getMimeType();
            $type = Media::typeFromMime($mime);
            $dir = 'media/'.date('Y/m');
            $name = Str::random(20).'.'.$file->getClientOriginalExtension();
            $path = $file->storeAs($dir, $name, 'public');

            $width = $height = null;
            $conversions = null;

            if ($type === 'image') {
                try {
                    $manager = ImageManager::gd();
                    $image = $manager->read($file->getPathname());
                    $width = $image->width();
                    $height = $image->height();

                    // Automatic compression + thumbnail generation.
                    $thumbPath = $dir.'/thumb_'.$name;
                    $image->scaleDown(width: 480)->save(storage_path('app/public/'.$thumbPath), quality: 75);
                    $conversions = ['thumbnail' => $thumbPath];
                } catch (\Throwable) {
                    // Non-fatal: keep original if the image can't be processed.
                }
            }

            $uploaded[] = Media::create([
                'website_id' => $request->input('website_id'),
                'folder_id' => $request->input('folder_id'),
                'disk' => 'public',
                'path' => $path,
                'file_name' => $file->getClientOriginalName(),
                'mime_type' => $mime,
                'type' => $type,
                'size' => $file->getSize(),
                'width' => $width,
                'height' => $height,
                'conversions' => $conversions,
                'uploaded_by' => $request->user()->id,
            ]);
        }

        return response()->json($uploaded, 201);
    }

    public function update(Request $request, Media $media)
    {
        abort_unless($request->user()->canManageWebsite($media->website_id), 403);

        $data = $request->validate([
            'alt' => ['nullable', 'string', 'max:255'],
            'tags' => ['nullable', 'array'],
            'folder_id' => ['nullable', 'exists:media_folders,id'],
        ]);

        $media->update($data);

        return $media;
    }

    public function destroy(Request $request, Media $media)
    {
        abort_unless($request->user()->canManageWebsite($media->website_id), 403);

        \Illuminate\Support\Facades\Storage::disk($media->disk)->delete(
            array_filter([$media->path, ...array_values($media->conversions ?? [])])
        );
        $media->delete();

        return response()->noContent();
    }

    // --- Folders ---

    public function folders(Request $request)
    {
        return $this->scopeToUser($request, MediaFolder::with('children'))
            ->whereNull('parent_id')
            ->when($request->filled('website_id'), fn ($q) => $q->where('website_id', $request->integer('website_id')))
            ->get();
    }

    public function storeFolder(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'website_id' => ['nullable', 'exists:websites,id'],
            'parent_id' => ['nullable', 'exists:media_folders,id'],
        ]);

        abort_unless($request->user()->canManageWebsite($data['website_id'] ?? null), 403);

        return response()->json(MediaFolder::create($data), 201);
    }

    public function destroyFolder(Request $request, MediaFolder $folder)
    {
        abort_unless($request->user()->canManageWebsite($folder->website_id), 403);

        $folder->delete();

        return response()->noContent();
    }
}
