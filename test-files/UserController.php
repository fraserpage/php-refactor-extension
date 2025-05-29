<?php

namespace App\Controllers;

use App\Services\UserService;

class UserController
{
    private UserService $userService;

    public function __construct(UserService $userService)
    {
        $this->userService = $userService;
    }

    public function store(array $request): array
    {
        $user = $this->userService->createUser($request);
        return ['user' => $user];
    }

    public function show(int $id): array
    {
        $user = $this->userService->findUser($id);
        return ['user' => $user];
    }

    public function validateEmail(string $email): bool
    {
        return UserService::validateEmail($email);
    }

    public function createService($userRepository): UserService
    {
        return new UserService($userRepository);
    }
} 