<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TemplateLayout extends Model
{
    protected $fillable = ['template_id', 'page_type', 'name', 'structure'];

    protected $casts = ['structure' => 'array'];

    public function template()
    {
        return $this->belongsTo(Template::class);
    }
}
