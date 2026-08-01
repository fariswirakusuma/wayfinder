
namespace OHL_Wayfinder3D.Models
{
    public class Node
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        
        public Point3D Position { get; set; } = new Point3D();
        public int Floor { get; set; }
        public Node? Parent { get; set; } = null;
        public List<Edge> Neighbors { get; set; } = new();

        public Node(string id, double x, double y, double z, int floor = 1)
        {
            Id = id;
            Position = new Point3D(x, y, z);
            Floor = floor;
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
    }
}