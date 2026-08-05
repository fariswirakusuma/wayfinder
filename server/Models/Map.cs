

namespace OHL_Wayfinder3D.Models
{
    public class MapData
    {
        public List<Node> Nodes { get; set; } = new();
        public List<Obstacle> Obstacles { get; set; } = new();
    }

    public class GenerateMapRequest
    {
        public int Width { get; set; } = 11;
        public int Height { get; set; } = 1;
        public int Depth { get; set; } = 11;
        public string MapType { get; set; } = "maze";
        public float ObstacleDensity { get; set; } = 0.3f;
        public float Spacing { get; set; } = 2.0f;
    }
}
