<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        $user = User::where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages(['email' => 'Invalid credentials.']);
        }

        // Accounts with confirmed 2FA get a short-lived challenge instead of a token;
        // the client completes login via POST /auth/2fa/challenge.
        if ($user->two_factor_confirmed_at) {
            $challenge = Crypt::encryptString(json_encode([
                'user_id' => $user->id,
                'expires_at' => now()->addMinutes(5)->timestamp,
                'nonce' => Str::random(16),
            ]));

            return response()->json(['two_factor' => true, 'challenge' => $challenge]);
        }

        $token = $user->createToken('admin')->plainTextToken;

        AuditLog::record('logged_in', $user);

        return response()->json([
            'token' => $token,
            'user' => $user->load('roles'),
        ]);
    }

    public function me(Request $request)
    {
        return $request->user()->load('roles', 'websites');
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out.']);
    }
}
