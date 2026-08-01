
namespace OHL_Wayfinder3D.Models
{
    public class Node
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        
        public double X { get; set; }
        public double Y { get; set; }
        public double Z { get; set; }
        public int Floor { get; set; }
        public double GVal { get; set; } = double.PositiveInfinity; 
        public double Heuristic { get; set; } = 0;                 
        public double FVal => GVal + Heuristic;
        public Node? Parent { get; set; } = null;
        public List<Edge> Neighbors { get; set; } = new();

        public Node(string id, double x, double y, double z, int floor = 1)
        {
            Id = id;
            X = x;
            Y = y;
            Z = z;
            Floor = floor;
        }

        public double CalculateHeuristic(Node target)
        {
            double dx = X - target.X;
            double dy = Y - target.Y;
            double dz = Z - target.Z;
            return Math.Sqrt(dx * dx + dy * dy + dz * dz);
        }

        public void Reset()
        {
            GVal = double.PositiveInfinity;
            Heuristic = 0;
            Parent = null;
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