<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiGeneration extends Model
{
    protected $fillable = ['website_id', 'user_id', 'ai_provider_id', 'type', 'task', 'prompt', 'result', 'media_id', 'usage', 'status'];

    protected $casts = ['usage' => 'array'];

    public function provider()
    {
        return $this->belongsTo(AiProvider::class, 'ai_provider_id');
    }

    public function media()
    {
        return $this->belongsTo(Media::class);
    }
}
