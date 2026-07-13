<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SeoMeta extends Model
{
    protected $table = 'seo_meta';

    protected $fillable = [
        'meta_title', 'meta_description', 'keywords', 'canonical_url',
        'open_graph', 'twitter_card', 'schema_markup', 'robots',
    ];

    protected $casts = ['open_graph' => 'array', 'twitter_card' => 'array', 'schema_markup' => 'array'];

    public function metable()
    {
        return $this->morphTo();
    }
}
