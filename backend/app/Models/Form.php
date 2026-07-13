<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Form extends Model
{
    protected $fillable = ['website_id', 'name', 'slug', 'type', 'schema', 'notifications', 'integrations', 'spam_protection', 'is_active'];

    protected $casts = [
        'schema' => 'array',
        'notifications' => 'array',
        'integrations' => 'array',
        'spam_protection' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function website()
    {
        return $this->belongsTo(Website::class);
    }

    public function submissions()
    {
        return $this->hasMany(FormSubmission::class);
    }
}
