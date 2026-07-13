<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Post;
use App\Models\Website;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PostController extends Controller
{
    public function index(Request $request, Website $website)
    {
        return $website->hasMany(Post::class)->getQuery()
            ->with('author:id,name', 'categories', 'tags', 'featuredMedia')
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->filled('search'), fn ($q) => $q->where('title', 'like', '%'.$request->string('search').'%'))
            ->latest('published_at')->latest('id')
            ->paginate($request->integer('per_page', 25));
    }

    public function store(Request $request, Website $website)
    {
        $data = $this->validated($request);
        $data['website_id'] = $website->id;
        $data['author_id'] = $request->user()->id;
        $data['slug'] = Str::slug($data['slug'] ?? $data['title']);

        $post = Post::create(collect($data)->except(['categories', 'tags', 'seo'])->all());
        $this->syncRelations($post, $data);

        return response()->json($post->load('categories', 'tags', 'seo'), 201);
    }

    public function show(Website $website, Post $post)
    {
        abort_unless($post->website_id === $website->id, 404);

        return $post->load('author:id,name', 'categories', 'tags', 'seo', 'featuredMedia');
    }

    public function update(Request $request, Website $website, Post $post)
    {
        abort_unless($post->website_id === $website->id, 404);

        $data = $this->validated($request, updating: true);

        if (isset($data['slug'])) {
            $data['slug'] = Str::slug($data['slug']);
        }

        $post->update(collect($data)->except(['categories', 'tags', 'seo'])->all());
        $this->syncRelations($post, $data);

        return $post->load('categories', 'tags', 'seo');
    }

    public function publish(Website $website, Post $post)
    {
        abort_unless($post->website_id === $website->id, 404);
        $post->update(['status' => 'published', 'published_at' => $post->published_at ?? now()]);

        return $post;
    }

    public function destroy(Website $website, Post $post)
    {
        abort_unless($post->website_id === $website->id, 404);
        $post->delete();

        return response()->noContent();
    }

    private function validated(Request $request, bool $updating = false): array
    {
        return $request->validate([
            'title' => [$updating ? 'sometimes' : 'required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255'],
            'excerpt' => ['nullable', 'string'],
            'body' => ['nullable', 'string'],
            'featured_media_id' => ['nullable', 'exists:media,id'],
            'is_featured' => ['sometimes', 'boolean'],
            'scheduled_at' => ['nullable', 'date'],
            'allow_comments' => ['sometimes', 'boolean'],
            'categories' => ['sometimes', 'array'],
            'categories.*' => ['exists:post_categories,id'],
            'tags' => ['sometimes', 'array'],
            'tags.*' => ['exists:post_tags,id'],
            'seo' => ['sometimes', 'array'],
        ]);
    }

    private function syncRelations(Post $post, array $data): void
    {
        if (isset($data['categories'])) {
            $post->categories()->sync($data['categories']);
        }
        if (isset($data['tags'])) {
            $post->tags()->sync($data['tags']);
        }
        if (isset($data['seo'])) {
            $post->seo()->updateOrCreate([], collect($data['seo'])->only([
                'meta_title', 'meta_description', 'keywords', 'canonical_url',
                'open_graph', 'twitter_card', 'schema_markup', 'robots',
            ])->all());
        }
    }
}
