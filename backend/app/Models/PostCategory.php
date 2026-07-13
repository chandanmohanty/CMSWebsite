<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PostCategory extends Model
{
    protected $fillable = ['website_id', 'name', 'slug'];

    public function posts()
    {
        return $this->belongsToMany(Post::class, 'post_category_post');
    }
}
