using Microsoft.AspNetCore.Mvc;
using OHL_Wayfinder3D.Models;
using OHL_Wayfinder3D.Services;
using OHL_Wayfinder3D.Services.Generator;

namespace OHL_Wayfinder3D.Controllers;

[ApiController]
[Route("api/map")]
public class MapController : ControllerBase
{
    private readonly IMapGeneratorService _mapGenerator;

    public MapController(IMapGeneratorService mapGenerator)
    {
        _mapGenerator = mapGenerator;
    }

    [HttpPost("generate_map")]
    public ActionResult<MapData> GenerateMap([FromBody] GenerateMapRequest request)
    {
        if (request.Width < 5 || request.Depth < 5 || request.Height < 1)
        {
            return BadRequest(new { message = "Map width and depth must be at least 5, and height must be at least 1." });
        }

        if (request.ObstacleDensity is < 0 or > 1)
        {
            return BadRequest(new { message = "Obstacle density must be between 0 and 1." });
        }

        if (request.Spacing <= 0)
        {
            return BadRequest(new { message = "Spacing must be greater than 0." });
        }

        return Ok(_mapGenerator.Generate(request));
    }
}
