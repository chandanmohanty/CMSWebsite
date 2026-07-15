<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Translation extends Model
{
    protected $fillable = ['website_id', 'translatable_type', 'translatable_id', 'locale', 'data'];

    protected $casts = ['data' => 'array'];

    public function translatable()
    {
        return $this->morphTo();
    }
}
