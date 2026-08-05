using OHL_Wayfinder3D.Models;

namespace OHL_Wayfinder3D.Services
{
    public interface IMapGeneratorService
    {
        MapData Generate(GenerateMapRequest req);
    }

    public class MapGeneratorService : IMapGeneratorService
    {
        private static readonly Random _random = new();

        public MapData Generate(GenerateMapRequest req)
        {
            int width = req.Width % 2 == 0 ? req.Width + 1 : req.Width;
            int height = req.Height % 2 == 0 ? req.Height + 1 : req.Height;
            int depth = req.Depth % 2 == 0 ? req.Depth + 1 : req.Depth;
            float spacing = req.Spacing > 0 ? req.Spacing : 1.0f;
            int[,,] grid = new int[width, height, depth];

            for (int x = 0; x < width; x++)
                for (int y = 0; y < height; y++)
                    for (int z = 0; z < depth; z++)
                        grid[x, y, z] = 1;

            if (req.MapType != null && req.MapType.ToLower().Contains("maze"))
            {
                if (height == 1)
                {
                    CarvePlanarMaze(1, 0, 1, grid, width, depth);
                }
                else
                {
                    CarveMazeIterative(1, 1, 1, grid, width, height, depth);
                }
            }
            else
            {
                // Random Obstacles / Grid Mode
                for (int x = 0; x < width; x++)
                {
                    for (int y = 0; y < height; y++)
                    {
                        for (int z = 0; z < depth; z++)
                        {
                            if (x == 1 && y == 1 && z == 1)
                                grid[x, y, z] = 0;
                            else
                                grid[x, y, z] = _random.NextDouble() < req.ObstacleDensity ? 1 : 0;
                        }
                    }
                }
            }

            var nodeMap = new Dictionary<string, Node>();
            var obstacles = new List<Obstacle>();

            float halfW = (float)Math.Floor(width / 2.0);
            float halfH = (float)Math.Floor(height / 2.0);
            float halfD = (float)Math.Floor(depth / 2.0);

            for (int x = 0; x < width; x++)
            {
                for (int y = 0; y < height; y++)
                {
                    for (int z = 0; z < depth; z++)
                    {
                        string id = $"node_{x}_{y}_{z}";
                        float posX = (x - halfW) * spacing;
                        float posY = (y - halfH) * spacing;
                        float posZ = (z - halfD) * spacing;
                        var pos = new Point3D(posX, posY, posZ);

                        if (grid[x, y, z] == 0)
                        {
                            var node = new Node(id, posX, posY, posZ, y + 1)
                            {
                                Neighbors = new List<Edge>()
                            };
                            nodeMap[id] = node;
                        }
                        else
                        {
                            obstacles.Add(new Obstacle
                            {
                                Id = $"obstacle_{x}_{y}_{z}",
                                NodeId = id,
                                Position = pos,
                                Width = spacing,
                                Height = spacing,
                                Depth = spacing
                            });
                        }
                    }
                }
            }

            (int x, int y, int z)[] dirs = new[]
            {
                (1, 0, 0), (-1, 0, 0),
                (0, 1, 0), (0, -1, 0),
                (0, 0, 1), (0, 0, -1)
            };

            foreach (var kvp in nodeMap)
            {
                var node = kvp.Value;
                var parts = node.Id.Split('_');
                int x = int.Parse(parts[1]);
                int y = int.Parse(parts[2]);
                int z = int.Parse(parts[3]);

                foreach (var d in dirs)
                {
                    string neighborId = $"node_{x + d.x}_{y + d.y}_{z + d.z}";
                    if (nodeMap.TryGetValue(neighborId, out var neighborNode))
                    {
                        double weight = node.Position.DistanceTo(neighborNode.Position);
                        var edge = new Edge(neighborNode, weight)
                        {
                            IsBlocked = false
                        };
                        node.Neighbors.Add(edge);
                    }
                }
            }

            return new MapData
            {
                Nodes = nodeMap.Values.ToList(),
                Obstacles = obstacles
            };
        }

        // A conventional DFS maze on the X/Z plane. This is the default
        // presentation: visible corridors and walls rather than a sealed 3D box.
        private void CarvePlanarMaze(int startX, int y, int startZ, int[,,] grid, int width, int depth)
        {
            var stack = new Stack<(int x, int z)>();
            grid[startX, y, startZ] = 0;
            stack.Push((startX, startZ));

            (int dx, int dz)[] directions = [(2, 0), (-2, 0), (0, 2), (0, -2)];
            while (stack.Count > 0)
            {
                var (currentX, currentZ) = stack.Peek();
                var candidates = new List<(int x, int z, int wallX, int wallZ)>();

                foreach (var (dx, dz) in directions)
                {
                    var nextX = currentX + dx;
                    var nextZ = currentZ + dz;
                    if (nextX > 0 && nextX < width - 1 && nextZ > 0 && nextZ < depth - 1 && grid[nextX, y, nextZ] == 1)
                    {
                        candidates.Add((nextX, nextZ, currentX + dx / 2, currentZ + dz / 2));
                    }
                }

                if (candidates.Count == 0)
                {
                    stack.Pop();
                    continue;
                }

                var next = candidates[_random.Next(candidates.Count)];
                grid[next.wallX, y, next.wallZ] = 0;
                grid[next.x, y, next.z] = 0;
                stack.Push((next.x, next.z));
            }
        }

        private void CarveMazeIterative(int startX, int startY, int startZ, int[,,] grid, int width, int height, int depth)
        {
            Stack<(int x, int y, int z)> stack = new();
            
            grid[startX, startY, startZ] = 0;
            stack.Push((startX, startY, startZ));

            (int dx, int dy, int dz)[] dirs = new[]
            {
                (2, 0, 0), (-2, 0, 0),
                (0, 2, 0), (0, -2, 0),
                (0, 0, 2), (0, 0, -2)
            };

            while (stack.Count > 0)
            {
                var (cx, cy, cz) = stack.Peek();

                var unvisitedNeighbors = new List<(int nx, int ny, int nz, int mx, int my, int mz)>();

                foreach (var d in dirs)
                {
                    int nx = cx + d.dx;
                    int ny = cy + d.dy;
                    int nz = cz + d.dz;

                    if (nx > 0 && nx < width - 1 &&
                        ny > 0 && ny < height - 1 &&
                        nz > 0 && nz < depth - 1)
                    {
                        if (grid[nx, ny, nz] == 1)
                        {
                            int mx = cx + d.dx / 2;
                            int my = cy + d.dy / 2;
                            int mz = cz + d.dz / 2;
                            unvisitedNeighbors.Add((nx, ny, nz, mx, my, mz));
                        }
                    }
                }

                if (unvisitedNeighbors.Count > 0)
                {
                    var chosen = unvisitedNeighbors[_random.Next(unvisitedNeighbors.Count)];
                    
                    grid[chosen.nx, chosen.ny, chosen.nz] = 0;
                    grid[chosen.mx, chosen.my, chosen.mz] = 0; 

                    stack.Push((chosen.nx, chosen.ny, chosen.nz));
                }
                else
                {
                    stack.Pop();
                }
            }
        }
    }
}
