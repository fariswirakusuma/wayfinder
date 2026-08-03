using OHL_Wayfinder3D.Models;

namespace OHL_Wayfinder3D.Services.Pathfinding
{
    public static class PathUtils
    {
        public static List<Node> ReconstructPath(IPathfindingNode endNode)
        {
            List<Node> path = new List<Node>();
            IPathfindingNode? currentNode = endNode;

            while (currentNode != null)
            {
                path.Add(currentNode.GraphNode);
                currentNode = currentNode.Parent;
            }

            path.Reverse();
            return path;
        }
    }
}