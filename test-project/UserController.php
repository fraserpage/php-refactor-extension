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

    public function store(array $request)
    {
        if (!UserService::validateEmail($request['email'])) {
            return ['error' => 'Invalid email'];
        }

        $user = $this->userService->createUser($request);
        return ['user' => $user];
    }

    public function show(int $id)
    {
        $user = $this->userService->findUser($id);
        return ['user' => $user];
    }

    public function createNewService(): UserService
    {
        return new UserService();
    }
} 