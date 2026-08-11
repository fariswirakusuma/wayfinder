using System;
using System.Collections.Generic;
using System.Linq;
using OHL_Wayfinder3D.Models;

namespace OHL_Wayfinder3D.Services.Pathfinding
{
    public class SimulatedAnnealingSolver
    {
        private readonly Random _random = new Random();
        private Dictionary<string, Node> _nodeMap = new();

        public double CalculateCost(List<Node> path)
        {
            if (path == null || path.Count < 2) return 0.0;

            double totalDistance = 0.0;
            for (int i = 0; i < path.Count - 1; i++)
            {
                var current = path[i];
                var next = path[i + 1];
                var edge = current.Neighbors.FirstOrDefault(n => n.TargetNode.Id == next.Id);
                totalDistance += edge?.Weight ?? current.Position.DistanceTo(next.Position);
            }
            return totalDistance;
        }

        private List<Node> MutatePath(List<Node> currentPath, Node targetNode)
        {
            if (currentPath.Count <= 2) return new List<Node>(currentPath);

            int mutationPoint = _random.Next(1, currentPath.Count - 1);
            var prefix = currentPath.Take(mutationPoint).ToList();
            var prefixEnd = prefix.Last();

            var neighbors = prefixEnd.GetValidNeighbors()
                .Select(e => e.TargetNode)
                .Where(n => prefix.All(p => p.Id != n.Id))
                .ToList();

            if (neighbors.Count == 0) return new List<Node>(currentPath);

            var nextNode = neighbors[_random.Next(neighbors.Count)];
            var suffix = FindShortestPath(nextNode, targetNode);
            if (suffix.Count == 0) return new List<Node>(currentPath);

            var newPath = new List<Node>(prefix);
            newPath.AddRange(suffix);
            return newPath;
        }

        public (List<Node> Path, HashSet<string> VisitedNodeIds) Solve(List<Node> allNodes, Node startNode, Node targetNode, SimulatedAnnealingOptions? param)
        {
            param ??= new SimulatedAnnealingOptions();

            _nodeMap = allNodes.ToDictionary(n => n.Id);
            var visitedNodeIds = new HashSet<string> { startNode.Id, targetNode.Id };
            var currentPath = GenerateInitialPath(startNode, targetNode, visitedNodeIds);
            double currentCost = CalculateCost(currentPath);

            var bestPath = new List<Node>(currentPath);
            var bestCost = currentCost;
            double temp = param.InitialTemperature;
            int iteration = 0;

            while (temp > param.MinTemperature && iteration < CalculateMaxIterations(param))
            {
                var neighborPath = MutatePath(currentPath, targetNode);
                double neighborCost = CalculateCost(neighborPath);
                double deltaE = neighborCost - currentCost;

                if (deltaE < 0 || _random.NextDouble() < Math.Exp(-deltaE / temp))
                {
                    currentPath = neighborPath;
                    currentCost = neighborCost;
                    visitedNodeIds.UnionWith(currentPath.Select(n => n.Id));

                    if (currentCost < bestCost)
                    {
                        bestPath = new List<Node>(currentPath);
                        bestCost = currentCost;
                    }
                }

                temp *= param.CoolingRate;
                iteration++;
            }

            return (bestPath, visitedNodeIds);
        }

        private int CalculateMaxIterations(SimulatedAnnealingOptions param)
        {
            return (int)Math.Ceiling(Math.Log(param.MinTemperature / param.InitialTemperature) / Math.Log(param.CoolingRate));
        }

        private List<Node> GenerateInitialPath(Node start, Node target, HashSet<string> visited)
        {
            var initialPath = FindShortestPath(start, target);
            if (initialPath.Count > 0)
            {
                foreach (var node in initialPath)
                {
                    visited.Add(node.Id);
                }
                return initialPath;
            }

            return new List<Node> { start, target };
        }

        private List<Node> FindShortestPath(Node start, Node target)
        {
            var distances = _nodeMap.Keys.ToDictionary(id => id, id => double.PositiveInfinity);
            var previous = new Dictionary<string, string>();
            var queue = new SortedSet<(double Distance, string NodeId)>(Comparer<(double, string)>.Create((a, b) =>
            {
                var compare = a.Item1.CompareTo(b.Item1);
                return compare != 0 ? compare : string.CompareOrdinal(a.Item2, b.Item2);
            }));

            distances[start.Id] = 0;
            queue.Add((0, start.Id));

            while (queue.Count > 0)
            {
                var currentPair = queue.Min;
                queue.Remove(currentPair);
                var currentId = currentPair.NodeId;

                if (currentId == target.Id) break;

                var currentNode = _nodeMap[currentId];
                foreach (var edge in currentNode.GetValidNeighbors())
                {
                    var neighbor = edge.TargetNode;
                    var alt = distances[currentId] + edge.Weight;
                    if (alt < distances[neighbor.Id])
                    {
                        queue.Remove((distances[neighbor.Id], neighbor.Id));
                        distances[neighbor.Id] = alt;
                        previous[neighbor.Id] = currentId;
                        queue.Add((alt, neighbor.Id));
                    }
                }
            }

            var path = new List<Node>();
            if (double.IsPositiveInfinity(distances[target.Id]))
            {
                return path;
            }

            var curr = target.Id;
            while (previous.ContainsKey(curr))
            {
                path.Insert(0, _nodeMap[curr]);
                curr = previous[curr];
            }
            path.Insert(0, start);

            return path;
        }
    }
}