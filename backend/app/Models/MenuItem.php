<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MenuItem extends Model
{
    protected $fillable = ['menu_id', 'parent_id', 'label', 'url', 'page_id', 'target', 'icon', 'position', 'mega_menu'];

    protected $casts = ['mega_menu' => 'array'];

    public function menu()
    {
        return $this->belongsTo(Menu::class);
    }

    public function children()
    {
        return $this->hasMany(MenuItem::class, 'parent_id')->orderBy('position');
    }

    public function page()
    {
        return $this->belongsTo(Page::class);
    }

    /** Final href: internal page link wins over raw URL. */
    public function resolvedUrl(): string
    {
        return $this->page ? '/'.ltrim($this->page->slug, '/') : ($this->url ?? '#');
    }
}
