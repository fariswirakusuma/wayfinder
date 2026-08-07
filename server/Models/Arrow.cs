namespace OHL_Wayfinder3D.Models
{
    public class SearchArrow
    {
        
        public string FromNodeId { get; set; } = string.Empty;
        public string ToNodeId { get; set; } = string.Empty;

        public Point3D Position { get; set; } = new Point3D();
        public Point3D Direction { get; set; } = new Point3D(); 

        public int Floor { get; set; } = 1;

        public string Status { get; set; } = "Searching"; 

        public SearchArrow() { }

        public SearchArrow(string fromNodeId, string toNodeId, Point3D fromPos, Point3D toPos, int floor)
        {
            FromNodeId = fromNodeId;
            ToNodeId = toNodeId;
            Position = fromPos;
            Floor = floor;

            Direction = new Point3D(
                toPos.X - fromPos.X,
                toPos.Y - fromPos.Y,
                toPos.Z - fromPos.Z
            );
        }
    }
}