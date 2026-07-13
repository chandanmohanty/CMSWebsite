<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Menu;
use App\Models\Website;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MenuController extends Controller
{
    public function index(Website $website)
    {
        return $website->menus()->with('items.children.children')->get();
    }

    public function store(Request $request, Website $website)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'location' => ['required', 'string', 'max:100'],
        ]);

        return response()->json($website->menus()->create($data), 201);
    }

    /**
     * Replace the full item tree - called by the drag-and-drop menu editor on save.
     * Items arrive nested: [{label, url, page_id, target, icon, mega_menu, children: [...]}]
     */
    public function syncItems(Request $request, Website $website, Menu $menu)
    {
        abort_unless($menu->website_id === $website->id, 404);

        $data = $request->validate([
            'items' => ['required', 'array'],
        ]);

        DB::transaction(function () use ($menu, $data) {
            $menu->allItems()->delete();
            $this->createItems($menu->id, $data['items'], null);
        });

        return $menu->load('items.children.children');
    }

    private function createItems(int $menuId, array $items, ?int $parentId): void
    {
        foreach ($items as $i => $item) {
            $created = \App\Models\MenuItem::create([
                'menu_id' => $menuId,
                'parent_id' => $parentId,
                'label' => $item['label'],
                'url' => $item['url'] ?? null,
                'page_id' => $item['page_id'] ?? null,
                'target' => $item['target'] ?? '_self',
                'icon' => $item['icon'] ?? null,
                'position' => $i,
                'mega_menu' => $item['mega_menu'] ?? null,
            ]);

            if (! empty($item['children'])) {
                $this->createItems($menuId, $item['children'], $created->id);
            }
        }
    }

    public function destroy(Website $website, Menu $menu)
    {
        abort_unless($menu->website_id === $website->id, 404);
        $menu->delete();

        return response()->noContent();
    }
}
