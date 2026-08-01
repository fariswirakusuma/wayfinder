using OHL_Wayfinder3D.Models;

namespace OHL_Wayfinder3D.Services.Pathfinding
{
        public class Djikstra
        {
                public Node GraphNode { get; }
                public double HCost { get; set; } = 0;
                public double FCost => HCost;
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
                
        }
}