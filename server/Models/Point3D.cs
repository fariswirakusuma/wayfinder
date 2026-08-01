namespace OHL_Wayfinder3D.Models
{
    public class Point3D
    {
        public double X { get; set; }
        public double Y { get; set; }
        public double Z { get; set; }

        public Point3D(double x = 0, double y = 0, double z = 0)
        {
            X = x;
            Y = y;
            Z = z;
        }

        public double DistanceTo(Point3D other) => Math.Sqrt(DistanceSquaredTo(other));

        public double DistanceSquaredTo(Point3D other)
        {
            double dx = X - other.X;
            double dy = Y - other.Y;
            double dz = Z - other.Z;
            return (dx * dx) + (dy * dy) + (dz * dz);
        }
        public static Point3D operator +(Point3D a, Point3D b) 
            => new(a.X + b.X, a.Y + b.Y, a.Z + b.Z);

        public static Point3D operator -(Point3D a, Point3D b) 
            => new(a.X - b.X, a.Y - b.Y, a.Z - b.Z);

        public static Point3D operator *(Point3D a, double scalar) 
            => new(a.X * scalar, a.Y * scalar, a.Z * scalar);

        public static Point3D operator /(Point3D a, double scalar) 
            => new(a.X / scalar, a.Y / scalar, a.Z / scalar);
    }
}