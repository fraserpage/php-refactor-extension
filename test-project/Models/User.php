<?php

namespace App\Models;

class User
{
    private array $data;

    public function __construct(array $data = [])
    {
        $this->data = $data;
    }

    public function getId(): ?int
    {
        return $this->data['id'] ?? null;
    }

    public function getName(): ?string
    {
        return $this->data['name'] ?? null;
    }

    public function getEmail(): ?string
    {
        return $this->data['email'] ?? null;
    }

    public function toArray(): array
    {
        return $this->data;
    }
} 