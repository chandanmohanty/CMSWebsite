<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    protected $fillable = ['user_id', 'website_id', 'action', 'subject_type', 'subject_id', 'changes', 'ip_address'];

    protected $casts = ['changes' => 'array'];

    public static function record(string $action, ?Model $subject = null, ?array $changes = null, ?int $websiteId = null): self
    {
        return static::create([
            'user_id' => auth()->id(),
            'website_id' => $websiteId,
            'action' => $action,
            'subject_type' => $subject?->getMorphClass(),
            'subject_id' => $subject?->getKey(),
            'changes' => $changes,
            'ip_address' => request()->ip(),
        ]);
    }
}
