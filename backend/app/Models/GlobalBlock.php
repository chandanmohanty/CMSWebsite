<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GlobalBlock extends Model
{
    protected $fillable = ['website_id', 'name', 'block_type', 'content', 'settings'];

    protected $casts = ['content' => 'array', 'settings' => 'array'];

    public function website()
    {
        return $this->belongsTo(Website::class);
    }
}
