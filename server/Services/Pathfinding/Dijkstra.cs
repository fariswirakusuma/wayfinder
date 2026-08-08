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
                public (List<Node> Path, HashSet<string> VisitedNodeIds) Solve(Node startNode, Node targetNode)
                {
                        var nodeMap = new Dictionary<Node, DijkstraNode>();
                        DijkstraNode GetState(Node n) => nodeMap.TryGetValue(n, out var s) ? s : (nodeMap[n] = new DijkstraNode(n));

                        var openSet = new PriorityQueue<DijkstraNode, double>();
                        var closedSet = new HashSet<string>();
                        var visitedNodeIds = new HashSet<string>();
                        var startState = GetState(startNode);
                        startState.GCost = 0;
                        openSet.Enqueue(startState, startState.GCost);

                        while (openSet.Count > 0)
                        {
                                var current = openSet.Dequeue();
                                if (current.GraphNode == targetNode) return (PathUtils.ReconstructPath(current), closedSet);

                                closedSet.Add(current.GraphNode.Id);

                                foreach (Edge edge in current.GraphNode.GetValidNeighbors())
                                {
                                        if (closedSet.Contains(edge.TargetNode.Id)) continue;

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

                        return (new List<Node>(), closedSet);
                }
                public Dictionary<string, List<Node>> GetGraphData(List<Node> allNodes)
                {
                        var graphData = new Dictionary<string, List<Node>>();
                        foreach (var node in allNodes)
                        {
                                graphData[node.Id] = node.GetValidNeighbors().Select(edge => edge.TargetNode).ToList();
                        }
                        return graphData;
                }
        }
}