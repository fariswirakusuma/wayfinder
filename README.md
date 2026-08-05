# OHL Wayfinder 3D

OHL Wayfinder 3D adalah aplikasi web untuk membuat peta berbasis grid, memilih titik awal dan titik tujuan, lalu memvisualisasikan rute terpendek dalam lingkungan 3D. Aplikasi ini memadukan antarmuka interaktif Svelte/Three.js dengan API ASP.NET Core yang membangkitkan peta dan menjalankan algoritma pathfinding.

## Fitur

- Membuat peta **maze** berbasis DFS atau peta dengan **rintangan acak**.
- Mengatur ukuran area, tinggi visual dinding, dan kepadatan rintangan.
- Memilih node awal dan node tujuan dari panel kontrol.
- Penanda node yang jelas: awal berwarna hijau, tujuan/finish berwarna merah, dan node biasa berwarna biru.
- Menampilkan rute hasil pencarian di dalam scene 3D.
- Mendukung tiga algoritma pencarian jalur: **A\***, **Dijkstra**, dan **Bellman-Ford**.
- Menyediakan statistik waktu eksekusi dan jumlah node yang dikunjungi.
- Dokumentasi API interaktif tersedia melalui Scalar.

## Teknologi

| Bagian | Teknologi |
| --- | --- |
| Frontend | Svelte 5, SvelteKit, TypeScript, Vite, Three.js |
| Backend | ASP.NET Core / .NET 10 |
| Container | Docker dan Docker Compose |

## Requirements

Pilih salah satu cara menjalankan aplikasi berikut.

### Menjalankan secara lokal

- Node.js **20+** dan npm.
- .NET SDK **10.0** (sesuai `TargetFramework` backend).
- Browser modern yang mendukung WebGL.

### Menjalankan dengan Docker

- Docker Engine dan Docker Compose v2.

## Build dan Menjalankan

### Opsi 1: Docker Compose

Dari direktori root proyek, jalankan:

```bash
docker compose up --build
```

Setelah container siap, buka:

- Aplikasi: `http://localhost:5173`
- Dokumentasi API: `http://localhost:5000/scalar/v1`

Untuk menghentikan container, tekan `Ctrl+C`, lalu jalankan:

```bash
docker compose down
```

### Opsi 2: Lokal (development)

1. Jalankan backend pada port `5000`.

   ```bash
   cd server
   dotnet restore
   dotnet run --urls http://localhost:5000
   ```

2. Pada terminal lain, pasang dependensi dan jalankan frontend.

   ```bash
   cd client
   npm ci
   npm run dev
   ```

3. Buka alamat yang ditampilkan Vite—secara default `http://localhost:5173`.

Frontend meneruskan request `/api` ke `http://localhost:5000`. Untuk memakai backend pada alamat lain, tetapkan variabel lingkungan `BACKEND_URL` sebelum menjalankan Vite, misalnya:

```bash
BACKEND_URL=http://localhost:5001 npm run dev
```

### Build produksi

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

## Cara Menggunakan

1. Buka aplikasi; peta awal dibuat otomatis.
2. Pilih **Generator Type**: `3D Maze (DFS)` untuk labirin atau `Random Obstacles` untuk rintangan acak.
3. Atur ukuran peta. Pada mode rintangan acak, atur juga **Obstacle Density**.
4. Klik **Randomize Map** untuk menghasilkan peta baru.
5. Pilih **Start Node** dan **Target Node**. Node awal ditampilkan hijau dan node tujuan merah pada scene 3D.
6. Pilih algoritma: A\*, Dijkstra, atau Bellman-Ford.
7. Klik **Find Path**. Rute yang ditemukan akan digambar pada peta dan statistik proses tampil di panel kontrol.

Jika rute tidak tersedia, ubah titik awal/tujuan atau buat peta baru dengan rintangan yang lebih sedikit.

## API Ringkas

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| `POST` | `/api/map/generate_map` | Membuat node dan rintangan peta. |
| `POST` | `/api/pathfinding/a-star` | Mencari rute dengan A\*. |
| `POST` | `/api/pathfinding/dijkstra` | Mencari rute dengan Dijkstra. |
| `POST` | `/api/pathfinding/bellman-ford` | Mencari rute dengan Bellman-Ford. |

Saat backend berjalan, skema request dan respons lengkap dapat dilihat di `http://localhost:5000/scalar/v1`.

## Struktur Proyek

```text
.
├── client/                  # SvelteKit + Three.js
│   └── src/lib/three/       # Renderer 3D dan generator peta frontend
├── server/                  # ASP.NET Core Web API
│   ├── Controller/          # Endpoint peta dan pathfinding
│   └── Services/            # Generator serta algoritma pathfinding
└── docker-compose.yml       # Konfigurasi frontend dan backend
```
