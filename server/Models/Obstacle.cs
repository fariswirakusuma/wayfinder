using System;

namespace OHL_Wayfinder3D.Models
{
    public class Obstacle
    {
        public string Id { get; set; } = string.Empty;
        public Point3D Position { get; set; } = new Point3D();
        public double Width { get; set; }
        public double Height { get; set; }
        public double Depth { get; set; }

        public Obstacle() { }

        public Obstacle(string id, double x, double y, double z, double width, double height, double depth)
        {
            Id = id;
            Position = new Point3D(x, y, z);
            Width = width;
            Height = height;
            Depth = depth;
        }

        public bool IntersectsEdge(Node start, Node end)
        {
            if (start == null || end == null) return false;

            double minX = Position.X - Width / 2.0;
            double maxX = Position.X + Width / 2.0;
            double minY = Position.Y - Height / 2.0;
            double maxY = Position.Y + Height / 2.0;
            double minZ = Position.Z - Depth / 2.0;
            double maxZ = Position.Z + Depth / 2.0;

            return LineIntersectsBox(start.Position, end.Position, minX, maxX, minY, maxY, minZ, maxZ);
        }

        private bool LineIntersectsBox(
            Point3D p1, Point3D p2, 
            double minX, double maxX, 
            double minY, double maxY, 
            double minZ, double maxZ)
        {
            double tMin = 0.0;
            double tMax = 1.0;

            // Check X axis slab
            if (!ClipAxis(p2.X - p1.X, p1.X - minX, maxX - p1.X, ref tMin, ref tMax))
                return false;

            // Check Y axis slab
            if (!ClipAxis(p2.Y - p1.Y, p1.Y - minY, maxY - p1.Y, ref tMin, ref tMax))
                return false;

            // Check Z axis slab
            if (!ClipAxis(p2.Z - p1.Z, p1.Z - minZ, maxZ - p1.Z, ref tMin, ref tMax))
                return false;

            return true;
        }

        private static bool ClipAxis(double denom, double numMin, double numMax, ref double tMin, ref double tMax)
        {
            if (Math.Abs(denom) < 1e-9)
            {
                return numMin >= 0 && numMax >= 0;
            }

            double t1 = numMin / denom;
            double t2 = numMax / denom;

            if (t1 > t2)
            {
                double temp = t1;
                t1 = t2;
                t2 = temp;
            }

            tMin = Math.Max(tMin, t1);
            tMax = Math.Min(tMax, t2);
            return tMin <= tMax;
        }
    }
}