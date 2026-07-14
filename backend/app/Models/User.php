<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, HasRoles, Notifiable;

    protected $fillable = ['name', 'email', 'password'];

    protected $hidden = ['password', 'remember_token', 'two_factor_secret', 'two_factor_recovery_codes'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function websites()
    {
        return $this->belongsToMany(Website::class)->withTimestamps();
    }

    /** null = shared/global scope (e.g. the shared media library), open to all authenticated users. */
    public function canManageWebsite(?int $websiteId): bool
    {
        if ($this->hasRole('super_admin') || $websiteId === null) {
            return true;
        }

        return $this->websites()->whereKey($websiteId)->exists();
    }

    /** @return int[] */
    public function accessibleWebsiteIds(): array
    {
        return $this->websites()->pluck('websites.id')->all();
    }
}
