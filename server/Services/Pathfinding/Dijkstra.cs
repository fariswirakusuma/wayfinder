using OHL_Wayfinder3D.Models;

namespace OHL_Wayfinder3D.Services.Pathfinding
{
        public class DijkstraNode : IPathfindingNode
        {
                public Node GraphNode { get; }
                public IPathfindingNode? Parent { get; set; }
                public double GCost { get; set; } = double.PositiveInfinity;
                public double Distance => GCost;

                public DijkstraNode(Node graphNode)
                {
                        GraphNode = graphNode;
                }
        }
        public class DijkstraSolver
        {
                public List<Node> Solve(Node startNode, Node targetNode)
                {
                        var nodeMap = new Dictionary<Node, DijkstraNode>();
                        DijkstraNode GetState(Node n) => nodeMap.TryGetValue(n, out var s) ? s : (nodeMap[n] = new DijkstraNode(n));

                        var openSet = new PriorityQueue<DijkstraNode, double>();
                        var closedSet = new HashSet<Node>();

                        var startState = GetState(startNode);
                        startState.GCost = 0;
                        openSet.Enqueue(startState, startState.GCost);

                        while (openSet.Count > 0)
                        {
                                var current = openSet.Dequeue();
                                if (current.GraphNode == targetNode) return PathUtils.ReconstructPath(current);

                                closedSet.Add(current.GraphNode);

                                foreach (Edge edge in current.GraphNode.GetValidNeighbors())
                                {
                                        if (closedSet.Contains(edge.TargetNode)) continue;

                                        var neighborState = GetState(edge.TargetNode);
                                        double newGCost = current.GCost + edge.Weight;

                                        if (newGCost < neighborState.GCost)
                                        {
                                                neighborState.Parent = current;
                                                neighborState.GCost = newGCost;
                                                openSet.Enqueue(neighborState, neighborState.GCost);
                                        }
                                }
                        }

                        return new List<Node>(); 
                }
        }
}