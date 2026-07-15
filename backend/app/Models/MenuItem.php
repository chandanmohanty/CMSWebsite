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

    /** Final href: internal page link wins over raw URL. The home page lives at the site root. */
    public function resolvedUrl(): string
    {
        if ($this->page) {
            return $this->page->page_type === 'home' || $this->page->slug === ''
                ? '/'
                : '/'.ltrim($this->page->slug, '/');
        }

        return $this->url ?? '#';
    }
}
