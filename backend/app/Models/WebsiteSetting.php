<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WebsiteSetting extends Model
{
    protected $fillable = ['website_id', 'group', 'value'];

    protected $casts = ['value' => 'array'];

    public function website()
    {
        return $this->belongsTo(Website::class);
    }
}
