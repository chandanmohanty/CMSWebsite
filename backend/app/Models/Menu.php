<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Menu extends Model
{
    protected $fillable = ['website_id', 'name', 'location'];

    public function website()
    {
        return $this->belongsTo(Website::class);
    }

    public function items()
    {
        return $this->hasMany(MenuItem::class)->whereNull('parent_id')->orderBy('position');
    }

    public function allItems()
    {
        return $this->hasMany(MenuItem::class)->orderBy('position');
    }
}
