<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PageSection extends Model
{
    protected $fillable = ['page_id', 'block_type', 'position', 'content', 'settings', 'global_block_id', 'is_visible'];

    protected $casts = ['content' => 'array', 'settings' => 'array', 'is_visible' => 'boolean'];

    public function page()
    {
        return $this->belongsTo(Page::class);
    }

    public function globalBlock()
    {
        return $this->belongsTo(GlobalBlock::class);
    }

    /** Resolved content: a global-block reference falls through to the shared block's content. */
    public function resolvedContent(): ?array
    {
        return $this->global_block_id ? $this->globalBlock?->content : $this->content;
    }
}
