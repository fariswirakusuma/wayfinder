using OHL_Wayfinder3D.Models;

namespace OHL_Wayfinder3D.Services.Pathfinding
{
    public class QLearningSolver
    {
        public readonly struct QState : IEquatable<QState>
        {
            public string NodeId { get; }
            public int Floor { get; }

            public QState(string nodeId, int floor)
            {
                NodeId = nodeId ?? string.Empty;
                Floor = floor;
            }

            public bool Equals(QState other) => NodeId == other.NodeId && Floor == other.Floor;
            public override bool Equals(object? obj) => obj is QState other && Equals(other);
            public override int GetHashCode() => HashCode.Combine(NodeId, Floor);
        }

        public int Episodes { get; set; }
        public int MaxStepsPerEpisode { get; set; }
        public double LearningRate { get; set; }
        public double DiscountFactor { get; set; }
        public double Epsilon { get; set; }
        private readonly Random _random = new();

        public QLearningSolver(
            int? episodes = null,
            int? maxStepsPerEpisode = null,
            double? learningRate = null,
            double? discountFactor = null,
            double? epsilon = null)
        {
            Episodes = episodes ?? 2000;
            MaxStepsPerEpisode = maxStepsPerEpisode ?? 300;
            LearningRate = learningRate ?? 0.1;
            DiscountFactor = discountFactor ?? 0.9;
            Epsilon = epsilon ?? 0.2;
        }

        public (List<Node> Path, HashSet<string> VisitedNodeIds) Solve(List<Node> allNodes, Node startNode, Node targetNode)
        {
            ArgumentNullException.ThrowIfNull(allNodes);
            ArgumentNullException.ThrowIfNull(startNode);
            ArgumentNullException.ThrowIfNull(targetNode);
            var qTable = new Dictionary<(QState State, string TargetActionId), double>();
            var allVisitedDuringTraining = new HashSet<string> { startNode.Id };

            for (int episode = 0; episode < Episodes; episode++)
            {
                Node currentNode = startNode;

                for (int step = 0; step < MaxStepsPerEpisode; step++)
                {
                    if (currentNode.Id == targetNode.Id)
                        break;

                    QState currentState = new(currentNode.Id, currentNode.Floor);
                    var validNeighbors = currentNode.GetValidNeighbors().Select(e => e.TargetNode).ToList();

                    if (validNeighbors.Count == 0) break; 

                    Node selectedNextNode;
                    if (_random.NextDouble() < Epsilon)
                    {
                        selectedNextNode = validNeighbors[_random.Next(validNeighbors.Count)];
                    }
                    else
                    {
                        selectedNextNode = GetBestNeighbor(currentState, validNeighbors, qTable);
                    }

                    allVisitedDuringTraining.Add(selectedNextNode.Id);

                    double reward;
                    if (selectedNextNode.Id == targetNode.Id)
                    {
                        reward = 100.0;
                    }
                    else
                    {
                        reward = -1.0; 
                    }

                    QState nextState = new(selectedNextNode.Id, selectedNextNode.Floor);
                    var nextValidNeighbors = selectedNextNode.GetValidNeighbors().Select(e => e.TargetNode).ToList();

                    double oldQ = GetQValue(qTable, currentState, selectedNextNode.Id);
                    double maxNextQ = selectedNextNode.Id == targetNode.Id ? 0.0 : GetMaxQValue(qTable, nextState, nextValidNeighbors);

                    double newQ = oldQ + LearningRate * (reward + (DiscountFactor * maxNextQ) - oldQ);
                    qTable[(currentState, selectedNextNode.Id)] = newQ;

                    currentNode = selectedNextNode;
                }
            }

            List<Node> path = new() { startNode };
            HashSet<string> pathVisited = new() { startNode.Id };

            Node curr = startNode;
            int maxExtractionSteps = allNodes.Count * 2;

            while (curr.Id != targetNode.Id && maxExtractionSteps-- > 0)
            {
                QState state = new(curr.Id, curr.Floor);
                var validNeighbors = curr.GetValidNeighbors().Select(e => e.TargetNode).ToList();

                if (validNeighbors.Count == 0) break;
                Node? next = validNeighbors
                    .Where(n => !pathVisited.Contains(n.Id))
                    .OrderByDescending(n => GetQValue(qTable, state, n.Id))
                    .FirstOrDefault();

                if (next == null) break;

                curr = next;
                path.Add(curr);
                pathVisited.Add(curr.Id);
            }

            return (path, allVisitedDuringTraining);
        }

        private Node GetBestNeighbor(QState state, List<Node> neighbors, Dictionary<(QState, string), double> qTable)
        {
            Node best = neighbors[0];
            double maxQ = double.MinValue;

            foreach (var neighbor in neighbors)
            {
                double q = GetQValue(qTable, state, neighbor.Id);
                if (q > maxQ)
                {
                    maxQ = q;
                    best = neighbor;
                }
            }
            return best;
        }

        private double GetMaxQValue(Dictionary<(QState, string), double> qTable, QState state, List<Node> nextNeighbors)
        {
            if (nextNeighbors.Count == 0) return 0.0;
            double maxQ = double.MinValue;

            foreach (var neighbor in nextNeighbors)
            {
                double q = GetQValue(qTable, state, neighbor.Id);
                if (q > maxQ) maxQ = q;
            }
            return maxQ == double.MinValue ? 0.0 : maxQ;
        }

        private double GetQValue(Dictionary<(QState, string), double> qTable, QState state, string targetActionId)
        {
            return qTable.TryGetValue((state, targetActionId), out double value) ? value : 0.0;
        }
    }
}