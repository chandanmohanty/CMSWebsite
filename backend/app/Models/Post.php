<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Post extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'website_id', 'author_id', 'title', 'slug', 'excerpt', 'body', 'featured_media_id',
        'is_featured', 'status', 'published_at', 'scheduled_at', 'allow_comments',
    ];

    protected $casts = [
        'is_featured' => 'boolean',
        'allow_comments' => 'boolean',
        'published_at' => 'datetime',
        'scheduled_at' => 'datetime',
    ];

    public function website()
    {
        return $this->belongsTo(Website::class);
    }

    public function author()
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function categories()
    {
        return $this->belongsToMany(PostCategory::class, 'post_category_post');
    }

    public function tags()
    {
        return $this->belongsToMany(PostTag::class, 'post_post_tag');
    }

    public function comments()
    {
        return $this->hasMany(Comment::class);
    }

    public function seo()
    {
        return $this->morphOne(SeoMeta::class, 'metable');
    }

    public function featuredMedia()
    {
        return $this->belongsTo(Media::class, 'featured_media_id');
    }
}
