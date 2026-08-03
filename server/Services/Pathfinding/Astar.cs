using System.Reflection.Metadata;
using OHL_Wayfinder3D.Models;

namespace OHL_Wayfinder3D.Services.Pathfinding
{

        public class AstarNode : IPathfindingNode
        {
                public Node GraphNode { get; }
                public IPathfindingNode? Parent { get; set; }
                public double GCost { get; set; } = double.PositiveInfinity;
                
                public double HCost { get; set; } = 0;
                public double FCost => GCost + HCost;

                public double Distance => GCost;

                public AstarNode(Node graphNode)
                {
                        GraphNode = graphNode;
                }

                public void CalculateHeuristic(Node targetNode)
                {
                        var p1 = GraphNode.Position;
                        var p2 = targetNode.Position;

                        double dx = p1.X - p2.X;
                        double dy = p1.Y - p2.Y;
                        double dz = p1.Z - p2.Z;

                        HCost = Math.Sqrt(dx * dx + dy * dy + dz * dz);
                }
        }
        public class AstarSolver
        {
                public List<Node> Solve(Node startNode, Node targetNode)
                {
                        var nodeMap = new Dictionary<Node, AstarNode>();
                        AstarNode GetState(Node n) => nodeMap.TryGetValue(n, out var s) ? s : (nodeMap[n] = new AstarNode(n));

                        var openSet = new PriorityQueue<AstarNode, double>();
                        var closedSet = new HashSet<Node>();

                        var startState = GetState(startNode);
                        startState.GCost = 0;
                        startState.CalculateHeuristic(targetNode);
                        openSet.Enqueue(startState, startState.FCost);

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
                                                neighborState.CalculateHeuristic(targetNode);
                                                openSet.Enqueue(neighborState, neighborState.FCost);
                                        }
                                }
                        }

                        return new List<Node>(); 
                }
        }
}