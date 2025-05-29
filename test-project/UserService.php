<?php

namespace App\Services;

use App\Models\User;

class UserService
{
    public function createUser(array $data): User
    {
        return new User($data);
    }

    public static function validateEmail(string $email): bool
    {
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }

    public function findUser(int $id): ?User
    {
        // Simulate finding a user
        return new User(['id' => $id, 'name' => 'Test User']);
    }
} 