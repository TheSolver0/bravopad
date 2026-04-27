<?php

namespace Database\Seeders;

use App\Models\Department;
use Illuminate\Database\Seeder;

class DepartmentSeeder extends Seeder
{
    public function run(): void
    {
        $departments = [
            ['id' => 1, 'name' => 'Développement',   'description' => 'Équipe ingénierie logicielle'],
            ['id' => 2, 'name' => 'Design',           'description' => 'Équipe UX/UI et création visuelle'],
            ['id' => 3, 'name' => 'Data & Analyse',   'description' => 'Équipe data science et analytics'],
            ['id' => 4, 'name' => 'Administration',   'description' => 'Support administratif et organisation'],
        ];

        foreach ($departments as $data) {
            Department::firstOrCreate(['id' => $data['id']], $data);
        }
    }
}
