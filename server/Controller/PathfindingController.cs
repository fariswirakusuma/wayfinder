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

            try
            {
                var startNode = request.Nodes.Find(n => n.Id == request.StartNodeId);
                var targetNode = request.Nodes.Find(n => n.Id == request.TargetNodeId);

                if (startNode == null || targetNode == null)
                {
                    return NotFound(new { message = "Start or Target node not found in the provided graph." });
                }

                GraphUtils.ApplyObstacles(request.Nodes, request.Obstacles);

                var solver = new BellmanFordSolver();
                List<Node> path = solver.Solve(request.Nodes, request.Edges, targetNode);

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

            try
            {
                var startNode = request.Nodes.Find(n => n.Id == request.StartNodeId);
                var targetNode = request.Nodes.Find(n => n.Id == request.TargetNodeId);

                if (startNode == null || targetNode == null)
                {
                    return NotFound(new { message = "Start or Target node not found in the provided graph." });
                }

                GraphUtils.ApplyObstacles(request.Nodes, request.Obstacles);

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

            try
            {
                var startNode = request.Nodes.Find(n => n.Id == request.StartNodeId);
                var targetNode = request.Nodes.Find(n => n.Id == request.TargetNodeId);

                if (startNode == null || targetNode == null)
                {
                    return NotFound(new { message = "Start or Target node not found in the provided graph." });
                }
                GraphUtils.ApplyObstacles(request.Nodes, request.Obstacles);
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
    }
}