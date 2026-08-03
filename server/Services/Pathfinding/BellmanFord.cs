using OHL_Wayfinder3D.Models;


namespace OHL_Wayfinder3D.Services.Pathfinding
{
    public class BellmanFordNode : IPathfindingNode
    {
        public Node GraphNode { get; }
        public IPathfindingNode? Parent { get; set; }
        public double Distance { get; set; } = double.PositiveInfinity;

        public BellmanFordNode(Node graphNode)
        {
            GraphNode = graphNode;
        }
    }

    public class BellmanFordSolver
    {
        public List<Node> Solve(List<Node> allNodes, List<Edge> allEdges,Node targetNode)
        {

            var nodeMap = allNodes.ToDictionary(
                n => n, 
                n => new BellmanFordNode(n)
            );
            
           

            for (int i = 0; i < allNodes.Count - 1; i++)
            {
                foreach (var node in allNodes)
                {
                    var currentState = nodeMap[node];
                    if (currentState.Distance == double.PositiveInfinity) continue;

                    foreach (var edge in node.GetValidNeighbors())
                    {
                        var neighborState = nodeMap[edge.TargetNode];
                        double newDistance = currentState.Distance + edge.Weight;

                        if (newDistance < neighborState.Distance)
                        {
                            neighborState.Parent = currentState;
                            neighborState.Distance = newDistance;
                        }
                    }
                }
            }

            foreach (var node in allNodes)
            {
                var currentState = nodeMap[node];
                if (currentState.Distance == double.PositiveInfinity) continue;

                foreach (var edge in node.GetValidNeighbors())
                {
                    var neighborState = nodeMap[edge.TargetNode];
                    if (currentState.Distance + edge.Weight < neighborState.Distance)
                    {
                        throw new InvalidOperationException("Graph contains a negative weight cycle.");
                    }
                }
            }
            BellmanFordNode targetState = nodeMap[targetNode];
            

            return PathUtils.ReconstructPath(targetState);
        }
    }
}