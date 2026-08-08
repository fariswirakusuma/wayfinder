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

        public (List<Node> Path, HashSet<string> VisitedNodeIds) Solve(List<Node> allNodes, Node startNode, Node targetNode)
        {
            var nodeMap = allNodes.ToDictionary(
                n => n, 
                n => new BellmanFordNode(n)
            );
            nodeMap[startNode].Distance = 0;

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

            var visitedNodeIds = nodeMap.Values
                .Where(n => n.Distance < double.PositiveInfinity)
                .Select(n => n.GraphNode.Id)
                .ToHashSet();

            BellmanFordNode targetState = nodeMap[targetNode];
            return (PathUtils.ReconstructPath(targetState), visitedNodeIds);
        }
    

        public Dictionary<string, List<Node>> GetGraphData(List<Node> allNodes)
        {
            var graphMap = new Dictionary<string, List<Node>>();

            foreach (var node in allNodes)
            {
                if (node.Neighbors != null)
                {
                    graphMap[node.Id] = node.Neighbors
                        .Where(edge => edge.TargetNode != null)
                        .Select(edge => edge.TargetNode)
                        .ToList();
                }
                else
                {
                    graphMap[node.Id] = new List<Node>();
                }
            }

            return graphMap;
        }
    }
}
