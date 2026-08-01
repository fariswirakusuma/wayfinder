using System.Reflection.Metadata;
using OHL_Wayfinder3D.Models;

namespace OHL_Wayfinder3D.Services.Pathfinding
{
        public class Astar
        {
                public Node GraphNode { get; }
                public double GCost { get; set; } = double.PositiveInfinity;
                public double HCost { get; set; } = 0;
                public double FCost => GCost + HCost;
                public Node? Parent { get; set; } = null;


                public static bool operator <(Node left, Node right)
                {
                        if (ReferenceEquals(left, null)) return false;
                        if (ReferenceEquals(right, null)) return true;
                        
                        if (left.F_cost == right.F_cost){
                                return left.H_cost < right.H_cost;
                        }
                        
                        return left.F_cost < right.F_cost;
                }

                private double count_heuristic(List<Node> nodes, string targetId){
                        Node? targetNode = nodes.Find(n => n.Id == targetId);
                        if (targetNode == null){
                                throw new ArgumentException($"Target node with ID '{targetId}' not found in the list.");
                        }
                        return Math.Sqrt(Math.Pow(GraphNode.X - targetNode.X, 2) + Math.Pow(GraphNode.Y - targetNode.Y, 2) + Math.Pow(GraphNode.Z - targetNode.Z, 2));
                }

                private double count_gcost(Node neighbor){
                        return GCost + GraphNode.Neighbors.Find(e => e.TargetNode == neighbor)?.Weight ?? double.PositiveInfinity;
                }


                public void start_solve(in Node node,string startId,string targetId){
                       HCost = count_heuristic(node.Neighbors, targetId);
                       GCost = count_gcost(node);
                       

                }
        }
}