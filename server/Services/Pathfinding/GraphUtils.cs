using OHL_Wayfinder3D.Models;

namespace OHL_Wayfinder3D.Services.Pathfinding
{
    public static class GraphUtils
    {
        public static void ApplyObstacles(List<Node> nodes, List<Obstacle> obstacles)
        {
            if (nodes == null || obstacles == null || obstacles.Count == 0) return;

            foreach (var node in nodes)
            {
                foreach (var edge in node.Neighbors)
                {
                    if (edge.IsBlocked) continue;
                    if (obstacles.Any(obs => obs.IntersectsEdge(node, edge.TargetNode)))
                    {
                        edge.IsBlocked = true;
                    }
                }
            }
        }
    }
}