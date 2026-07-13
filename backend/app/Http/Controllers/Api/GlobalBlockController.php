<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GlobalBlock;
use App\Models\Website;
use Illuminate\Http\Request;

class GlobalBlockController extends Controller
{
    public function index(Website $website)
    {
        return $website->hasMany(GlobalBlock::class)->getQuery()->orderBy('name')->get();
    }

    public function store(Request $request, Website $website)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'block_type' => ['required', 'string', 'max:100'],
            'content' => ['required', 'array'],
            'settings' => ['nullable', 'array'],
        ]);

        $data['website_id'] = $website->id;

        return response()->json(GlobalBlock::create($data), 201);
    }

    public function update(Request $request, Website $website, GlobalBlock $globalBlock)
    {
        abort_unless($globalBlock->website_id === $website->id, 404);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'content' => ['sometimes', 'array'],
            'settings' => ['nullable', 'array'],
        ]);

        $globalBlock->update($data);

        return $globalBlock;
    }

    public function destroy(Website $website, GlobalBlock $globalBlock)
    {
        abort_unless($globalBlock->website_id === $website->id, 404);
        $globalBlock->delete();

        return response()->noContent();
    }
}
