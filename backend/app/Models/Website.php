<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Website extends Model
{
    protected $fillable = ['name', 'slug', 'domain', 'industry', 'template_id', 'default_locale', 'locales', 'status'];

    protected $casts = ['locales' => 'array'];

    public function template()
    {
        return $this->belongsTo(Template::class);
    }

    public function pages()
    {
        return $this->hasMany(Page::class);
    }

    public function menus()
    {
        return $this->hasMany(Menu::class);
    }

    public function settings()
    {
        return $this->hasMany(WebsiteSetting::class);
    }

    public function users()
    {
        return $this->belongsToMany(User::class)->withTimestamps();
    }

    public function setting(string $group): ?array
    {
        return $this->settings->firstWhere('group', $group)?->value;
    }
}
