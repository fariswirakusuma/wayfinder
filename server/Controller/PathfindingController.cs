using System;
using System.Collections.Generic;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using OHL_Wayfinder3D.Models;
using OHL_Wayfinder3D.Services.Pathfinding;

namespace OHL_Wayfinder3D.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PathfindingController : ControllerBase
    {
        private readonly ILogger<PathfindingController> _logger;

        public PathfindingController(ILogger<PathfindingController> logger)
        {
            _logger = logger;
        }

        [HttpPost("bellman-ford")]
        public IActionResult SolveBellmanFord([FromBody] PathfindingRequest request)
        {
            var validationResult = ValidateRequest(request);
            if (validationResult != null) return validationResult;
            BuildGraph(request.Nodes, request.Obstacles);

            try
            {
                var startNode = request.Nodes.Find(n => n.Id == request.StartNodeId);
                var targetNode = request.Nodes.Find(n => n.Id == request.TargetNodeId);

                if (startNode == null || targetNode == null)
                {
                    return NotFound(new { message = "Start or Target node not found in the provided graph." });
                }

                var solver = new BellmanFordSolver();
                List<Node> path = solver.Solve(request.Nodes, startNode, targetNode);

                return Ok(new PathfindingResponse
                {
                    Path = path,
                    Found = path.Count > 0
                });
            }
                catch (InvalidOperationException ex)
                {
                    _logger.LogWarning(ex, "Bellman-Ford failed due to invalid graph state.");
                    return BadRequest(new { message = ex.Message });
                }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred during Bellman-Ford pathfinding execution.");
                return StatusCode(500, new { message = "An internal error occurred while processing the path request." });
            }
        }

        [HttpPost("dijkstra")]
        public IActionResult SolveDijkstra([FromBody] PathfindingRequest request)
        {
            var validationResult = ValidateRequest(request);
            if (validationResult != null) return validationResult;
            BuildGraph(request.Nodes, request.Obstacles);

            try
            {
                var startNode = request.Nodes.Find(n => n.Id == request.StartNodeId);
                var targetNode = request.Nodes.Find(n => n.Id == request.TargetNodeId);

                if (startNode == null || targetNode == null)
                {
                    return NotFound(new { message = "Start or Target node not found in the provided graph." });
                }

                var solver = new DijkstraSolver();
                List<Node> path = solver.Solve(startNode, targetNode);

                return Ok(new PathfindingResponse
                {
                    Path = path,
                    Found = path.Count > 0
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred during Dijkstra pathfinding execution.");
                return StatusCode(500, new { message = "An internal error occurred while processing the path request." });
            }
        }

        [HttpPost("a-star")]
        public IActionResult SolveAStar([FromBody] PathfindingRequest request)
        {
            var validationResult = ValidateRequest(request);
            if (validationResult != null) return validationResult;
            BuildGraph(request.Nodes, request.Obstacles);

            try
            {
                var startNode = request.Nodes.Find(n => n.Id == request.StartNodeId);
                var targetNode = request.Nodes.Find(n => n.Id == request.TargetNodeId);

                if (startNode == null || targetNode == null)
                {
                    return NotFound(new { message = "Start or Target node not found in the provided graph." });
                }
                var solver = new AstarSolver();
                List<Node> path = solver.Solve(startNode, targetNode);

                

                return Ok(new PathfindingResponse
                {
                    Path = path,
                    Found = path.Count > 0
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred during A* pathfinding execution.");
                return StatusCode(500, new { message = "An internal error occurred while processing the path request." });
            }
            
        }

        // Shared validation helper
        private IActionResult? ValidateRequest(PathfindingRequest request)
        {
            if (request == null)
            {
                return BadRequest(new { message = "Request body cannot be null." });
            }

            if (request.Nodes == null || request.Nodes.Count < 2)
            {
                return BadRequest(new { message = "At least two nodes are required for pathfinding." });
            }

            if (string.IsNullOrWhiteSpace(request.StartNodeId) || string.IsNullOrWhiteSpace(request.TargetNodeId))
            {
                return BadRequest(new { message = "Both StartNodeId and TargetNodeId must be specified." });
            }

            return null;
        }

        private static void BuildGraph(List<Node> nodes, List<Obstacle> obstacles)
        {
            foreach (var node in nodes)
            {
                node.Neighbors.Clear();
            }

            const double tolerance = 0.0001;
            var gridSpacing = obstacles.FirstOrDefault()?.Width ?? FindMinimumNodeDistance(nodes);
            for (var i = 0; i < nodes.Count; i++)
            {
                for (var j = i + 1; j < nodes.Count; j++)
                {
                    var first = nodes[i];
                    var second = nodes[j];
                    var dx = Math.Abs(first.Position.X - second.Position.X);
                    var dy = Math.Abs(first.Position.Y - second.Position.Y);
                    var dz = Math.Abs(first.Position.Z - second.Position.Z);
                    var changedAxes = (dx > tolerance ? 1 : 0) + (dy > tolerance ? 1 : 0) + (dz > tolerance ? 1 : 0);

                    if (changedAxes != 1) continue;

                    var distance = dx + dy + dz;
                    if (Math.Abs(distance - gridSpacing) > tolerance) continue;

                    first.Neighbors.Add(new Edge(second, distance));
                    second.Neighbors.Add(new Edge(first, distance));
                }
            }
        }

        private static double FindMinimumNodeDistance(List<Node> nodes)
        {
            return nodes
                .SelectMany((node, index) => nodes.Skip(index + 1).Select(other => node.Position.DistanceTo(other.Position)))
                .Where(distance => distance > 0)
                .DefaultIfEmpty(0)
                .Min();
        }
    }
}
