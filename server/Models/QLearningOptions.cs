namespace OHL_Wayfinder3D.Models
{
    public class QLearningOptions
    {
        public int Episodes { get; set; } = 1000;
        public int MaxStepsPerEpisode { get; set; } = 200;
        public double LearningRate { get; set; } = 0.1;
        public double DiscountFactor { get; set; } = 0.9;
        public double Epsilon { get; set; } = 0.2;
    }
    
}