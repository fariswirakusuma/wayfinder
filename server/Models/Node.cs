
using System.Text.Json.Serialization;

namespace OHL_Wayfinder3D.Models
{
    public class Node
    {
        public string Id { get; set; } = string.Empty;
        public Point3D Position { get; set; } = new Point3D();
        public int Floor { get; set; }
        public Node? Parent { get; set; } = null;
        // Neighbors contain back-references to other nodes. The backend
        // reconstructs them from node positions for pathfinding requests, so
        // keeping them out of the HTTP payload prevents circular JSON.
        [JsonIgnore]
        public List<Edge> Neighbors { get; set; } = new();

        public Node() { }

        public Node(string id, double x, double y, double z, int floor = 1)
        {
            Id = id;
            Position = new Point3D(x, y, z);
            Floor = floor;
        }

        public IEnumerable<Edge> GetValidNeighbors()
        {
            foreach (Edge edge in Neighbors)
            {
                if (!edge.IsBlocked)
                {
                    yield return edge;
                }
            }
        }
        private static bool IsObstructed(Node start, Node end, List<Obstacle> obstacles)
        {
            foreach (var obstacle in obstacles)
            {
                if (obstacle.IntersectsEdge(start, end)) return true;
            }
            return false;
        }

        
        
    }



    public class Edge
    {
        public Node TargetNode { get; set; }
        public double Weight { get; set; }

        public Edge(Node targetNode, double weight)
        {
            TargetNode = targetNode;
            Weight = weight;
        }

        public bool IsBlocked { get; set; } = false;

    }
}
