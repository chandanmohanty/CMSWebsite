<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Page extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'website_id', 'parent_id', 'title', 'slug', 'page_type', 'template_layout_id',
        'status', 'visibility', 'password', 'published_at', 'scheduled_at',
        'banner_media_id', 'featured_media_id', 'custom_css', 'custom_js', 'sort_order', 'created_by',
    ];

    protected $casts = [
        'published_at' => 'datetime',
        'scheduled_at' => 'datetime',
    ];

    public function website()
    {
        return $this->belongsTo(Website::class);
    }

    public function parent()
    {
        return $this->belongsTo(Page::class, 'parent_id');
    }

    public function children()
    {
        return $this->hasMany(Page::class, 'parent_id');
    }

    public function sections()
    {
        return $this->hasMany(PageSection::class)->orderBy('position');
    }

    public function revisions()
    {
        return $this->hasMany(PageRevision::class)->latest();
    }

    public function seo()
    {
        return $this->morphOne(SeoMeta::class, 'metable');
    }

    public function bannerMedia()
    {
        return $this->belongsTo(Media::class, 'banner_media_id');
    }

    public function featuredMedia()
    {
        return $this->belongsTo(Media::class, 'featured_media_id');
    }

    /** Snapshot current state into a revision (used on publish and manual save points). */
    public function snapshot(?int $userId = null, ?string $label = null): PageRevision
    {
        return $this->revisions()->create([
            'user_id' => $userId,
            'label' => $label,
            'snapshot' => [
                'page' => $this->only(['title', 'slug', 'page_type', 'status', 'custom_css', 'custom_js']),
                'sections' => $this->sections()->get(['block_type', 'position', 'content', 'settings', 'global_block_id', 'is_visible'])->toArray(),
            ],
        ]);
    }
}
