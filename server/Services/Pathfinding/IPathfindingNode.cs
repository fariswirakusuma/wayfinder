using OHL_Wayfinder3D.Models;

namespace OHL_Wayfinder3D.Services.Pathfinding
{
    public interface IPathfindingNode
    {
        Node GraphNode { get; }
        IPathfindingNode? Parent { get; set; }
        double Distance { get; } 
    }
}