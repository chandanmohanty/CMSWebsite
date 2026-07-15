<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Template extends Model
{
    protected $fillable = ['name', 'slug', 'industry', 'description', 'thumbnail_url', 'version', 'design_tokens', 'default_settings', 'is_active'];

    protected $casts = ['design_tokens' => 'array', 'default_settings' => 'array', 'is_active' => 'boolean'];

    public function layouts()
    {
        return $this->hasMany(TemplateLayout::class);
    }

    public function websites()
    {
        return $this->hasMany(Website::class);
    }
}
