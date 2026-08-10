namespace OHL_Wayfinder3D.Models
{
    public class PathfindingRequest
    {
        public string StartNodeId { get; set; } = string.Empty;
        public string TargetNodeId { get; set; } = string.Empty;

        public List<Node> Nodes { get; set; } = new();
        public List<Edge> Edges { get; set; } = new();
        public List<Obstacle> Obstacles { get; set; } = new();
        public bool StepByStep { get; set; } = false;
        public HashSet<string> VisitedNodeIds { get; set; } = new();
        public int VisitedNodes => VisitedNodeIds.Count;
        public QLearningOptions? QLearningOptions { get; set; }
    }

    public class PathfindingResponse
    {
        public bool Found { get; set; }
        public List<Node> Path { get; set; } = new();
        public Dictionary<string, List<string>>? Graph { get; set; }
        public List<SearchArrow>? Arrows { get; set; }
        public HashSet<string> VisitedNodeIds { get; set; } = new();
        public int VisitedNodes => VisitedNodeIds.Count;

    }
}