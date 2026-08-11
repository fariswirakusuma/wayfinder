namespace OHL_Wayfinder3D.Models
{
    public class SimulatedAnnealingOptions
    {
        public int NumWaypoints { get; set; } = 5;
        public double InitialTemperature { get; set; } = 1000.0;
        public double CoolingRate { get; set; } = 0.95;
        public double MinTemperature { get; set; } = 0.01;
    }
}
