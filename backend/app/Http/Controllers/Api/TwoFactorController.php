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
use PragmaRX\Google2FA\Google2FA;

class TwoFactorController extends Controller
{
    /** Step 1: generate a secret. 2FA is not active until the user confirms a code. */
    public function enable(Request $request)
    {
        $user = $request->user();

        if ($user->two_factor_confirmed_at) {
            throw ValidationException::withMessages(['code' => 'Two-factor authentication is already enabled.']);
        }

        $google2fa = new Google2FA();
        $secret = $google2fa->generateSecretKey();

        $user->forceFill([
            'two_factor_secret' => Crypt::encryptString($secret),
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
        ])->save();

        return response()->json([
            'secret' => $secret,
            'otpauth_url' => $google2fa->getQRCodeUrl(config('app.name'), $user->email, $secret),
        ]);
    }

    /** Step 2: verify a code from the authenticator app; activates 2FA and issues recovery codes (shown once). */
    public function confirm(Request $request)
    {
        $request->validate(['code' => ['required', 'string']]);

        $user = $request->user();

        if (! $user->two_factor_secret || $user->two_factor_confirmed_at) {
            throw ValidationException::withMessages(['code' => 'Start two-factor setup first.']);
        }

        $secret = Crypt::decryptString($user->two_factor_secret);

        if (! (new Google2FA())->verifyKey($secret, $request->string('code')->toString())) {
            throw ValidationException::withMessages(['code' => 'The code is invalid — check your authenticator app and try again.']);
        }

        $recoveryCodes = collect(range(1, 8))
            ->map(fn () => Str::upper(Str::random(4)).'-'.Str::upper(Str::random(4)))
            ->all();

        $user->forceFill([
            'two_factor_confirmed_at' => now(),
            'two_factor_recovery_codes' => Crypt::encryptString(json_encode($recoveryCodes)),
        ])->save();

        AuditLog::record('2fa_enabled', $user);

        return response()->json(['recovery_codes' => $recoveryCodes]);
    }

    /** Disable 2FA. Requires the account password so a hijacked session cannot silently remove it. */
    public function disable(Request $request)
    {
        $request->validate(['password' => ['required', 'string']]);

        $user = $request->user();

        if (! Hash::check($request->string('password')->toString(), $user->password)) {
            throw ValidationException::withMessages(['password' => 'The password is incorrect.']);
        }

        $user->forceFill([
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
        ])->save();

        AuditLog::record('2fa_disabled', $user);

        return response()->json(['message' => 'Two-factor authentication disabled.']);
    }

    /**
     * Second login step: exchange the short-lived challenge from /auth/login
     * plus a TOTP code (or a single-use recovery code) for a real API token.
     */
    public function challenge(Request $request)
    {
        $request->validate([
            'challenge' => ['required', 'string'],
            'code' => ['nullable', 'string'],
            'recovery_code' => ['nullable', 'string', 'required_without:code'],
        ]);

        try {
            $payload = json_decode(Crypt::decryptString($request->string('challenge')->toString()), true);
        } catch (\Throwable) {
            throw ValidationException::withMessages(['challenge' => 'The login challenge is invalid — sign in again.']);
        }

        if (! is_array($payload) || ($payload['expires_at'] ?? 0) < now()->timestamp) {
            throw ValidationException::withMessages(['challenge' => 'The login challenge expired — sign in again.']);
        }

        $user = User::findOrFail($payload['user_id']);

        if (! $user->two_factor_confirmed_at || ! $user->two_factor_secret) {
            throw ValidationException::withMessages(['challenge' => 'Two-factor authentication is not enabled for this account.']);
        }

        if ($request->filled('code')) {
            $secret = Crypt::decryptString($user->two_factor_secret);

            if (! (new Google2FA())->verifyKey($secret, $request->string('code')->toString())) {
                throw ValidationException::withMessages(['code' => 'The code is invalid.']);
            }
        } else {
            $this->consumeRecoveryCode($user, $request->string('recovery_code')->toString());
        }

        $token = $user->createToken('admin')->plainTextToken;

        AuditLog::record('logged_in', $user);

        return response()->json([
            'token' => $token,
            'user' => $user->load('roles'),
        ]);
    }

    /** Recovery codes are single-use: validate and burn. */
    private function consumeRecoveryCode(User $user, string $input): void
    {
        if (! $user->two_factor_recovery_codes) {
            throw ValidationException::withMessages(['recovery_code' => 'No recovery codes are available for this account.']);
        }

        $codes = json_decode(Crypt::decryptString($user->two_factor_recovery_codes), true) ?: [];

        $normalized = Str::upper(trim($input));
        $index = array_search($normalized, array_map('strtoupper', $codes), true);

        if ($index === false) {
            throw ValidationException::withMessages(['recovery_code' => 'The recovery code is invalid or already used.']);
        }

        unset($codes[$index]);

        $user->forceFill([
            'two_factor_recovery_codes' => Crypt::encryptString(json_encode(array_values($codes))),
        ])->save();
    }
}
