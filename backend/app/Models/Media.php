<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class Media extends Model
{
    protected $fillable = [
        'website_id', 'folder_id', 'disk', 'path', 'file_name', 'mime_type', 'type',
        'size', 'width', 'height', 'alt', 'tags', 'conversions', 'source', 'ai_meta', 'uploaded_by',
    ];

    protected $casts = ['tags' => 'array', 'conversions' => 'array', 'ai_meta' => 'array'];

    protected $appends = ['url'];

    public function folder()
    {
        return $this->belongsTo(MediaFolder::class, 'folder_id');
    }

    public function getUrlAttribute(): string
    {
        return Storage::disk($this->disk)->url($this->path);
    }

    public static function typeFromMime(string $mime): string
    {
        return match (true) {
            $mime === 'image/svg+xml' => 'svg',
            str_starts_with($mime, 'image/') => 'image',
            str_starts_with($mime, 'video/') => 'video',
            str_starts_with($mime, 'audio/') => 'audio',
            $mime === 'application/pdf' => 'pdf',
            default => 'document',
        };
    }
}
