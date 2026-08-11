# OHL Wayfinder 3D

OHL Wayfinder 3D adalah aplikasi web yang memvisualisasikan pencarian jalur pada peta 3D berbasis grid. Frontend Svelte/Three.js menampilkan peta dan animasi, sedangkan backend ASP.NET Core menyediakan API untuk pembangkitan peta dan algoritma pathfinding.

## Cara Menjalankan Program

### Opsi 1: Docker Compose

Dari direktori root proyek:

```bash
docker compose up --build
```

Buka browser ke:

- Aplikasi: `http://localhost:5173`
- Dokumentasi API: `http://localhost:5000/scalar/v1`

Untuk menghentikan layanan:

```bash
docker compose down
```

### Opsi 2: Jalankan Lokal

1. Backend:

   ```bash
   cd server
   dotnet restore
   dotnet run --urls http://localhost:5000
   ```

2. Frontend:

   ```bash
   cd client
   npm ci
   npm run dev
   ```

3. Buka `http://localhost:5173`.

> Jika backend berjalan di alamat lain, set `BACKEND_URL` sebelum `npm run dev`.

### Build Produksi

Frontend:

```bash
cd client
npm ci
npm run check
npm run build
```

Backend:

```bash
cd server
dotnet restore
dotnet publish -c Release -o ./publish
```

## Ringkasan Singkat

Aplikasi ini:

- Menghasilkan peta grid dengan labirin DFS atau rintangan acak
- Menampilkan node awal dan tujuan di scene 3D
- Menjalankan algoritma pathfinding pada backend
- Menggambar jalur hasil pencarian di frontend

Algoritma yang didukung meliputi A\*, Dijkstra, dan Bellman-Ford.

## Referensi

- [Three.js loading 3D models](https://threejs.org/manual/#en/loading-3d-models)
- [Q-Learning in Python](https://www.geeksforgeeks.org/machine-learning/q-learning-in-python/)
- [Simulated annealing](https://cp-algorithms.com/num_methods/simulated_annealing.html)
- [Svelte overview](https://svelte.dev/docs/svelte/overview)
- [.NET 10 libraries](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-10/libraries)
- [A* search algorithm](https://www.geeksforgeeks.org/dsa/a-search-algorithm/)
- [Bellman-Ford algorithm](https://cp-algorithms.com/graph/bellman_ford.html)
- [Bellman-Ford algorithm explanation](https://www.geeksforgeeks.org/dsa/bellman-ford-algorithm-dp-23/)
- [Greedy algorithms](https://www.geeksforgeeks.org/dsa/greedy-algorithms/)

## Struktur Proyek

```text
.
├── client/                  # Frontend SvelteKit + Three.js
├── server/                  # ASP.NET Core Web API
└── docker-compose.yml       # Konfigurasi container
```
