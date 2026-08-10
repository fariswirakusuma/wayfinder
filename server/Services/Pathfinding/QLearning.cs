using OHL_Wayfinder3D.Models;

namespace OHL_Wayfinder3D.Services.Pathfinding
{
    public class QLearningSolver
    {
        public enum Direction
        {
            Up,
            Down,
            Left,
            Right,
            FloorUp,
            FloorDown
        }

        public readonly struct QState : IEquatable<QState>
        {
            public string NodeId { get; }
            public int Floor { get; }
            public Direction Direction { get; }

            public QState(string nodeId, int floor, Direction direction)
            {
                NodeId = nodeId ?? string.Empty;
                Floor = floor;
                Direction = direction;
            }

            public bool Equals(QState other) =>
                NodeId == other.NodeId && Floor == other.Floor && Direction == other.Direction;

            public override bool Equals(object? obj) => obj is QState other && Equals(other);

            public override int GetHashCode() => HashCode.Combine(NodeId, Floor, Direction);

            public static bool operator ==(QState left, QState right) => left.Equals(right);

            public static bool operator !=(QState left, QState right) => !left.Equals(right);
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
            Episodes = episodes ?? 1000;
            MaxStepsPerEpisode = maxStepsPerEpisode ?? 200;
            LearningRate = learningRate ?? 0.1;
            DiscountFactor = discountFactor ?? 0.9;
            Epsilon = epsilon ?? 0.2;
        }

        public QLearningSolver(QLearningOptions? options)
            : this(
                options?.Episodes,
                options?.MaxStepsPerEpisode,
                options?.LearningRate,
                options?.DiscountFactor,
                options?.Epsilon)
        {
        }

        public (List<Node> Path, HashSet<string> VisitedNodeIds) Solve(List<Node> allNodes, Node startNode, Node targetNode)
        {
            ArgumentNullException.ThrowIfNull(allNodes);
            ArgumentNullException.ThrowIfNull(startNode);
            ArgumentNullException.ThrowIfNull(targetNode);

            var qTable = new Dictionary<(QState State, Direction Action), double>();
            var visitedNodeIds = new HashSet<string> { startNode.Id };
            for (int episode = 0; episode < Episodes; episode++)
            {
                Node currentNode = startNode;
                Direction currentDir = Direction.Up;

                for (int step = 0; step < MaxStepsPerEpisode; step++)
                {
                    if (currentNode.Id == targetNode.Id)
                        break;

                    QState currentState = new(currentNode.Id, currentNode.Floor, currentDir);
                    Direction chosenAction = ChooseAction(currentState, qTable);

                    (Node? nextNode, double edgeWeight) = GetNextNode(currentNode, chosenAction);

                    double reward;
                    QState nextState;

                    if (nextNode == null)
                    {
                        reward = -10.0;
                        nextState = currentState;
                    }
                    else if (nextNode.Id == targetNode.Id)
                    {
                        reward = 100.0;
                        nextState = new QState(nextNode.Id, nextNode.Floor, chosenAction);
                        visitedNodeIds.Add(nextNode.Id);
                    }
                    else
                    {
                        reward = -edgeWeight;
                        nextState = new QState(nextNode.Id, nextNode.Floor, chosenAction);
                        visitedNodeIds.Add(nextNode.Id);
                    }

                    double oldQ = GetQValue(qTable, currentState, chosenAction);
                    double maxNextQ = nextNode == null ? 0.0 : GetMaxQValue(qTable, nextState);

                    double newQ = oldQ + LearningRate * (reward + (DiscountFactor * maxNextQ) - oldQ);
                    qTable[(currentState, chosenAction)] = newQ;

                    if (nextNode != null)
                    {
                        currentNode = nextNode;
                        currentDir = chosenAction;
                    }
                }
            }

            // --- 2. Path Extraction Phase ---
            List<Node> path = new() { startNode };

            Node curr = startNode;
            Direction dir = Direction.Up;
            int maxExtractionSteps = allNodes.Count * 2;
            HashSet<string> pathNodeIds = new() { startNode.Id };

            while (curr.Id != targetNode.Id && maxExtractionSteps-- > 0)
            {
                QState state = new(curr.Id, curr.Floor, dir);
                Direction bestAction = GetBestAction(state, qTable);

                (Node? next, _) = GetNextNode(curr, bestAction);

                if (next == null || pathNodeIds.Contains(next.Id))
                {
                    next = GetUnvisitedNeighbor(curr, pathNodeIds);
                    if (next == null) break;
                }

                curr = next;
                dir = bestAction;
                path.Add(curr);
                pathNodeIds.Add(curr.Id);
                visitedNodeIds.Add(curr.Id);
            }

            return (path, visitedNodeIds);
        }

        private Direction ChooseAction(QState state, Dictionary<(QState, Direction), double> qTable)
        {
            if (_random.NextDouble() < Epsilon)
            {
                var directions = Enum.GetValues<Direction>();
                return directions[_random.Next(directions.Length)];
            }

            return GetBestAction(state, qTable);
        }

        private Direction GetBestAction(QState state, Dictionary<(QState, Direction), double> qTable)
        {
            Direction bestAction = Direction.Up;
            double maxQ = double.MinValue;

            foreach (Direction action in Enum.GetValues<Direction>())
            {
                double q = GetQValue(qTable, state, action);
                if (q > maxQ)
                {
                    maxQ = q;
                    bestAction = action;
                }
            }

            return bestAction;
        }

        private double GetQValue(Dictionary<(QState, Direction), double> qTable, QState state, Direction action)
        {
            return qTable.TryGetValue((state, action), out double value) ? value : 0.0;
        }

        private double GetMaxQValue(Dictionary<(QState, Direction), double> qTable, QState state)
        {
            double maxQ = double.MinValue;
            foreach (Direction action in Enum.GetValues<Direction>())
            {
                double q = GetQValue(qTable, state, action);
                if (q > maxQ) maxQ = q;
            }
            return maxQ == double.MinValue ? 0.0 : maxQ;
        }

        private (Node? Node, double Weight) GetNextNode(Node current, Direction action)
        {
            foreach (Edge edge in current.GetValidNeighbors())
            {
                Node neighbor = edge.TargetNode;
                if (IsDirectionMatch(current, neighbor, action))
                {
                    return (neighbor, edge.Weight);
                }
            }

            return (null, 0);
        }

        private bool IsDirectionMatch(Node from, Node to, Direction action)
        {
            if (to.Floor > from.Floor) return action == Direction.FloorUp;
            if (to.Floor < from.Floor) return action == Direction.FloorDown;

            double deltaX = to.Position.X - from.Position.X;
            double deltaY = to.Position.Y - from.Position.Y;

            return action switch
            {
                Direction.Up => deltaY > 0 && Math.Abs(deltaY) >= Math.Abs(deltaX),
                Direction.Down => deltaY < 0 && Math.Abs(deltaY) >= Math.Abs(deltaX),
                Direction.Right => deltaX > 0 && Math.Abs(deltaX) > Math.Abs(deltaY),
                Direction.Left => deltaX < 0 && Math.Abs(deltaX) > Math.Abs(deltaY),
                _ => false
            };
        }

        private Node? GetUnvisitedNeighbor(Node current, HashSet<string> visited)
        {
            foreach (Edge edge in current.GetValidNeighbors())
            {
                if (!visited.Contains(edge.TargetNode.Id))
                {
                    return edge.TargetNode;
                }
            }
            return null;
        }
    }
}