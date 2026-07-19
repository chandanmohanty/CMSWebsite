<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // --- RBAC roles ---
        $permissions = [
            'manage_templates', 'manage_websites', 'manage_pages', 'publish_pages',
            'manage_menus', 'manage_media', 'manage_posts', 'manage_forms',
            'manage_settings', 'use_ai', 'manage_ai_providers', 'view_audit_logs', 'manage_users',
        ];

        foreach ($permissions as $permission) {
            Permission::findOrCreate($permission, 'web');
        }

        Role::findOrCreate('super_admin', 'web')->givePermissionTo(Permission::all());

        Role::findOrCreate('admin', 'web')->givePermissionTo([
            'manage_websites', 'manage_pages', 'publish_pages', 'manage_menus',
            'manage_media', 'manage_posts', 'manage_forms', 'manage_settings', 'use_ai',
        ]);

        Role::findOrCreate('editor', 'web')->givePermissionTo([
            'manage_pages', 'manage_media', 'manage_posts', 'use_ai',
        ]);

        Role::findOrCreate('author', 'web')->givePermissionTo(['manage_posts', 'use_ai']);

        // --- Super admin account (change the password immediately in production) ---
        $admin = User::firstOrCreate(
            ['email' => 'admin@example.com'],
            ['name' => 'Super Admin', 'password' => 'ChangeMe123!']
        );
        $admin->assignRole('super_admin');

        $this->call(LegalTemplateSeeder::class);
        $this->call(ModernTemplateSeeder::class);
    }
}
